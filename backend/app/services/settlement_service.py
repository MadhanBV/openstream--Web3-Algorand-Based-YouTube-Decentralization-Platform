from datetime import datetime, timezone
from decimal import Decimal
import logging
import uuid
from typing import Any

import algosdk
from algosdk import account, encoding, mnemonic, transaction
from algosdk.v2client import algod
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.reward import Reward, Settlement
from app.models.user import User

logger = logging.getLogger(__name__)

TESTNET_EXPLORER_BASE = "https://lora.algokit.io/testnet/transaction"


def algo_to_microalgos(amount: Decimal) -> int:
    """
    Converts decimal ALGO amount to exact integer microAlgos (1 ALGO = 1,000,000 microAlgos).
    """
    return int(amount * Decimal("1000000"))


def microalgos_to_algo(microalgos: int) -> Decimal:
    """
    Converts integer microAlgos to Decimal ALGO representation.
    """
    return Decimal(microalgos) / Decimal("1000000")


def get_algod_client() -> algod.AlgodClient:
    """
    Instantiates an Algod client connected to the configured Algorand consensus node.
    Enforces strict TestNet safety.
    """
    settings = get_settings()
    if settings.ALGORAND_NETWORK != "testnet":
        raise RuntimeError("Safety lock: OpenStream strictly operates on 'testnet'. MainNet payouts prohibited.")

    return algod.AlgodClient(
        algod_token=settings.ALGORAND_ALGOD_TOKEN or "",
        algod_address=settings.ALGORAND_ALGOD_URL,
    )


def get_explorer_url(tx_id: str | None) -> str | None:
    if not tx_id:
        return None
    return f"{TESTNET_EXPLORER_BASE}/{tx_id}"


def preview_settlements(db: Session, creator_id: int | None = None) -> dict[str, Any]:
    """
    Computes an audit preview of pending creator rewards eligible for settlement.
    Validates creator Algorand addresses and computes exact ALGO and microAlgo totals.
    """
    query = (
        db.query(Reward)
        .filter(
            Reward.status == "pending",
            Reward.settlement_id == None,
        )
    )
    if creator_id is not None:
        query = query.filter(Reward.creator_id == creator_id)

    pending_rewards = query.all()

    # Group by creator_id
    grouped: dict[int, list[Reward]] = {}
    for r in pending_rewards:
        grouped.setdefault(r.creator_id, []).append(r)

    previews: list[dict[str, Any]] = []
    total_amount_algo = Decimal("0.000000")
    total_amount_microalgos = 0

    for c_id, rewards_list in grouped.items():
        creator = db.get(User, c_id)
        if not creator:
            continue

        raw_addr = creator.wallet_address or ""
        is_valid = bool(raw_addr and encoding.is_valid_address(raw_addr))
        creator_amount = sum((r.amount for r in rewards_list), Decimal("0.000000"))
        creator_microalgos = algo_to_microalgos(creator_amount)

        previews.append({
            "creator_id": c_id,
            "username": creator.username,
            "wallet_address": raw_addr,
            "is_valid_address": is_valid,
            "pending_rewards_count": len(rewards_list),
            "amount_algo": creator_amount,
            "amount_microalgos": creator_microalgos,
        })

        if is_valid:
            total_amount_algo += creator_amount
            total_amount_microalgos += creator_microalgos

    return {
        "total_creators": len(previews),
        "total_amount_algo": total_amount_algo,
        "total_amount_microalgos": total_amount_microalgos,
        "creators": previews,
    }


def execute_settlement_batch(
    db: Session,
    admin_user: User,
    creator_id: int | None = None,
    idempotency_key: str | None = None,
    note: str | None = None,
) -> dict[str, Any]:
    """
    Executes an atomic Algorand TestNet settlement payout batch for pending creator rewards.

    Guarantees:
    1. Idempotency: Duplicate calls with the same idempotency_key return previous settlements.
    2. Two-phase locking: Row-level lock (`with_for_update`) prevents concurrent double payouts.
    3. Receiver address validation: Invalid Algorand addresses fail before on-chain submission.
    4. Exact integer microAlgo calculation on server.
    5. Safe retry: Failed or timed-out transactions are tracked for reconciliation.
    """
    settings = get_settings()
    now = datetime.now(timezone.utc)

    # 1. Idempotency Check
    if idempotency_key:
        existing = (
            db.query(Settlement)
            .filter(Settlement.idempotency_key.like(f"{idempotency_key}%"))
            .all()
        )
        if existing:
            records = [serialize_settlement_record(s) for s in existing]
            total_amount = sum((s.amount for s in existing), Decimal("0.000000"))
            return {
                "settlements_created": len(records),
                "total_amount_algo": total_amount,
                "settlements": records,
                "message": f"Idempotency match: returned {len(records)} existing settlement records.",
            }

    # 2. Acquire row-level lock on eligible pending rewards
    query = (
        db.query(Reward)
        .filter(
            Reward.status == "pending",
            Reward.settlement_id == None,
        )
        .with_for_update()
    )
    if creator_id is not None:
        query = query.filter(Reward.creator_id == creator_id)

    pending_rewards = query.all()
    if not pending_rewards:
        return {
            "settlements_created": 0,
            "total_amount_algo": Decimal("0.000000"),
            "settlements": [],
            "message": "No pending rewards eligible for settlement.",
        }

    # Group by creator
    grouped: dict[int, list[Reward]] = {}
    for r in pending_rewards:
        grouped.setdefault(r.creator_id, []).append(r)

    created_settlements: list[Settlement] = []
    total_batch_amount = Decimal("0.000000")

    # 3. Process each eligible creator
    for c_id, rewards_list in grouped.items():
        creator = db.get(User, c_id)
        if not creator or not creator.wallet_address:
            logger.warning(f"Creator #{c_id} has no registered wallet address; skipping.")
            continue

        receiver_addr = creator.wallet_address.strip()
        if not encoding.is_valid_address(receiver_addr):
            logger.warning(f"Creator #{c_id} wallet address '{receiver_addr}' is invalid; skipping.")
            continue

        creator_amount = sum((r.amount for r in rewards_list), Decimal("0.000000"))
        if creator_amount <= Decimal("0.000000"):
            continue

        creator_microalgos = algo_to_microalgos(creator_amount)
        unique_key = f"{idempotency_key}-{c_id}" if idempotency_key else None

        settlement = Settlement(
            creator_id=c_id,
            wallet_address=receiver_addr,
            amount=creator_amount,
            network="testnet",
            status="processing",
            tx_fee_microalgos=1000,
            idempotency_key=unique_key,
            created_at=now,
        )
        db.add(settlement)
        db.flush()

        # Link rewards to this settlement and set status to processing
        for r in rewards_list:
            r.settlement_id = settlement.id
            r.status = "processing"

        db.commit()  # Lock database state

        # 4. Execute on-chain transaction or simulated dry-run
        raw_mnemonic = (settings.ALGORAND_TREASURY_MNEMONIC or "").strip()
        words = raw_mnemonic.split() if raw_mnemonic else []
        has_treasury = len(words) == 25
        if raw_mnemonic and not has_treasury:
            logger.warning(f"ALGORAND_TREASURY_MNEMONIC configured with {len(words)} words instead of 25; operating in dry-run mode.")

        if has_treasury:
            try:
                algod_client = get_algod_client()
                treasury_sk = mnemonic.to_private_key(raw_mnemonic)
                treasury_addr = account.address_from_private_key(treasury_sk)

                # Fetch suggested params
                sp = algod_client.suggested_params()
                sp.flat_fee = True
                sp.fee = 1000

                # Check treasury balance
                acct_info = algod_client.account_info(treasury_addr)
                treasury_balance = acct_info.get("amount", 0)
                if treasury_balance < (creator_microalgos + 1000):
                    raise ValueError(
                        f"Insufficient treasury TestNet balance: has {microalgos_to_algo(treasury_balance)} ALGO, "
                        f"requires {creator_amount + Decimal('0.001')} ALGO."
                    )

                memo = (note or f"OpenStream Payout Set-{settlement.id}").encode("utf-8")
                txn = transaction.PaymentTxn(
                    sender=treasury_addr,
                    sp=sp,
                    receiver=receiver_addr,
                    amt=creator_microalgos,
                    note=memo,
                )

                signed_txn = txn.sign(treasury_sk)
                tx_id = algod_client.send_transaction(signed_txn)

                settlement.transaction_id = tx_id
                settlement.status = "submitted"
                db.commit()

                # Poll confirmation (4 rounds ~ 16s)
                try:
                    conf = transaction.wait_for_confirmation(algod_client, tx_id, 4)
                    confirmed_round = conf.get("confirmed-round")
                    settlement.status = "confirmed"
                    settlement.confirmed_round = confirmed_round
                    settlement.confirmed_at = datetime.now(timezone.utc)

                    for r in rewards_list:
                        r.status = "settled"
                        r.settled_at = settlement.confirmed_at

                    db.commit()
                except Exception as conf_err:
                    logger.warning(f"Confirmation timeout on TxID {tx_id}: {conf_err}")
                    settlement.error_message = f"Pending confirmation: {conf_err}"
                    db.commit()

            except Exception as broadcast_err:
                logger.error(f"Failed to broadcast settlement #{settlement.id}: {broadcast_err}")
                settlement.status = "failed"
                settlement.error_message = str(broadcast_err)

                # Release rewards back to pending
                for r in rewards_list:
                    r.status = "pending"
                    r.settlement_id = None
                db.commit()

        else:
            # Simulated TestNet dry-run when treasury mnemonic is omitted
            simulated_tx = f"SIMULATED_TESTNET_{uuid.uuid4().hex[:16].upper()}"
            settlement.transaction_id = simulated_tx
            settlement.status = "confirmed"
            settlement.confirmed_round = 38450120
            settlement.confirmed_at = now

            for r in rewards_list:
                r.status = "settled"
                r.settled_at = now

            db.commit()

        created_settlements.append(settlement)
        total_batch_amount += creator_amount

    return {
        "settlements_created": len(created_settlements),
        "total_amount_algo": total_batch_amount,
        "settlements": [serialize_settlement_record(s) for s in created_settlements],
        "message": f"Successfully processed {len(created_settlements)} settlements totaling {total_batch_amount:.6f} ALGO.",
    }


def reconcile_settlement(db: Session, settlement_id: int) -> dict[str, Any]:
    """
    Reconciles a pending or submitted settlement transaction against Algorand TestNet consensus.
    """
    settlement = db.get(Settlement, settlement_id)
    if not settlement:
        raise ValueError(f"Settlement #{settlement_id} not found.")

    old_status = settlement.status
    if old_status == "confirmed":
        return {
            "settlement_id": settlement.id,
            "transaction_id": settlement.transaction_id,
            "old_status": old_status,
            "new_status": "confirmed",
            "confirmed_round": settlement.confirmed_round,
            "message": "Settlement is already confirmed.",
        }

    if not settlement.transaction_id or settlement.transaction_id.startswith("SIMULATED"):
        return {
            "settlement_id": settlement.id,
            "transaction_id": settlement.transaction_id,
            "old_status": old_status,
            "new_status": old_status,
            "confirmed_round": settlement.confirmed_round,
            "message": "No live on-chain transaction ID to reconcile.",
        }

    try:
        algod_client = get_algod_client()
        tx_info = algod_client.pending_transaction_info(settlement.transaction_id)
        confirmed_round = tx_info.get("confirmed-round", 0)

        if confirmed_round and confirmed_round > 0:
            settlement.status = "confirmed"
            settlement.confirmed_round = confirmed_round
            settlement.confirmed_at = datetime.now(timezone.utc)

            # Update linked rewards
            for r in settlement.rewards:
                r.status = "settled"
                r.settled_at = settlement.confirmed_at

            db.commit()
            return {
                "settlement_id": settlement.id,
                "transaction_id": settlement.transaction_id,
                "old_status": old_status,
                "new_status": "confirmed",
                "confirmed_round": confirmed_round,
                "message": f"Reconciliation successful: confirmed in round #{confirmed_round}.",
            }

        elif tx_info.get("pool-error"):
            settlement.status = "failed"
            settlement.error_message = tx_info.get("pool-error")

            # Release rewards
            for r in settlement.rewards:
                r.status = "pending"
                r.settlement_id = None

            db.commit()
            return {
                "settlement_id": settlement.id,
                "transaction_id": settlement.transaction_id,
                "old_status": old_status,
                "new_status": "failed",
                "confirmed_round": None,
                "message": f"Transaction rejected by network: {tx_info.get('pool-error')}",
            }

    except Exception as err:
        logger.error(f"Reconciliation error on settlement #{settlement_id}: {err}")
        settlement.retry_count += 1
        db.commit()

    return {
        "settlement_id": settlement.id,
        "transaction_id": settlement.transaction_id,
        "old_status": old_status,
        "new_status": settlement.status,
        "confirmed_round": settlement.confirmed_round,
        "message": "Transaction still pending confirmation on Algorand TestNet nodes.",
    }


def get_settlement_history(
    db: Session,
    creator_id: int | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """
    Returns settlement records with linked reward audit IDs.
    """
    query = db.query(Settlement).order_by(Settlement.created_at.desc())
    if creator_id is not None:
        query = query.filter(Settlement.creator_id == creator_id)

    settlements = query.limit(limit).all()
    return [serialize_settlement_record(s) for s in settlements]


def serialize_settlement_record(s: Settlement) -> dict[str, Any]:
    return {
        "id": s.id,
        "creator_id": s.creator_id,
        "wallet_address": s.wallet_address,
        "amount": s.amount,
        "network": s.network,
        "transaction_id": s.transaction_id,
        "status": s.status,
        "confirmed_round": s.confirmed_round,
        "tx_fee_microalgos": s.tx_fee_microalgos,
        "error_message": s.error_message,
        "idempotency_key": s.idempotency_key,
        "created_at": s.created_at,
        "confirmed_at": s.confirmed_at,
        "explorer_url": get_explorer_url(s.transaction_id),
        "reward_ids": [r.id for r in s.rewards] if s.rewards else [],
    }
