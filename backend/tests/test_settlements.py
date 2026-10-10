from decimal import Decimal
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.reward import Reward, Settlement
from app.models.user import User

VALID_ALGO_ADDRESS_1 = "LWFQONLYX24LNYRK52NNVKRIRZBXIJCZ2M2PUCT4XLX7T2HEO4XTAWFMVQ"
VALID_ALGO_ADDRESS_2 = "2UB5KSL6PVFB3XGWWSDW7LIUSTN42H5G2ZZODAEHEAKQLT2V5M3GV52JQ4"
INVALID_ALGO_ADDRESS = "INVALID_NOT_A_VALID_ALGORAND_ADDRESS"


@pytest.fixture
def test_admin(db_session: Session) -> User:
    admin = User(
        username="admin_user",
        email="admin@openstream.io",
        is_creator=True,
        is_admin=True,
        wallet_address=VALID_ALGO_ADDRESS_2,
    )
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


@pytest.fixture
def test_creator(db_session: Session) -> User:
    creator = User(
        username="paid_creator",
        email="creator@openstream.io",
        is_creator=True,
        is_admin=False,
        wallet_address=VALID_ALGO_ADDRESS_1,
    )
    db_session.add(creator)
    db_session.commit()
    db_session.refresh(creator)
    return creator


@pytest.fixture
def admin_token(test_admin: User) -> str:
    return create_access_token(subject=test_admin.id)


@pytest.fixture
def creator_token(test_creator: User) -> str:
    return create_access_token(subject=test_creator.id)


def test_admin_authorization_enforced(
    client: TestClient,
    admin_token: str,
    creator_token: str,
):
    # 1. Unauthenticated gets 401
    res = client.get("/api/v1/settlements/preview")
    assert res.status_code == 401

    # 2. Non-admin creator gets 403 Forbidden
    res = client.get(
        "/api/v1/settlements/preview",
        headers={"Authorization": f"Bearer {creator_token}"},
    )
    assert res.status_code == 403
    assert "Administrative privileges required" in res.json()["detail"]

    # 3. Admin gets 200 OK
    res = client.get(
        "/api/v1/settlements/preview",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200


def test_preview_settlements_calculation(
    client: TestClient,
    db_session: Session,
    test_creator: User,
    admin_token: str,
):
    # Add pending rewards for creator
    r1 = Reward(
        creator_id=test_creator.id,
        amount=Decimal("0.100000"),
        views_credited=2,
        status="pending",
    )
    r2 = Reward(
        creator_id=test_creator.id,
        amount=Decimal("0.150000"),
        views_credited=3,
        status="pending",
    )
    db_session.add_all([r1, r2])
    db_session.commit()

    res = client.get(
        f"/api/v1/settlements/preview?creator_id={test_creator.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_creators"] == 1
    assert Decimal(str(data["total_amount_algo"])) == Decimal("0.250000")
    assert data["total_amount_microalgos"] == 250000
    assert len(data["creators"]) == 1
    creator_preview = data["creators"][0]
    assert creator_preview["wallet_address"] == VALID_ALGO_ADDRESS_1
    assert creator_preview["is_valid_address"] is True
    assert creator_preview["pending_rewards_count"] == 2


def test_execute_settlement_batch_simulated(
    client: TestClient,
    db_session: Session,
    test_creator: User,
    admin_token: str,
):
    # Create pending reward
    reward = Reward(
        creator_id=test_creator.id,
        amount=Decimal("0.500000"),
        views_credited=10,
        status="pending",
    )
    db_session.add(reward)
    db_session.commit()

    # Execute settlement in simulated dry-run mode
    with patch("app.services.settlement_service.get_settings") as mock_settings_fn:
        mock_settings = MagicMock()
        mock_settings.ALGORAND_NETWORK = "testnet"
        mock_settings.ALGORAND_TREASURY_MNEMONIC = None
        mock_settings_fn.return_value = mock_settings

        res = client.post(
            "/api/v1/settlements/execute",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "creator_id": test_creator.id,
                "idempotency_key": "sim-test-batch-001",
                "note": "OpenStream Automated Test",
            },
        )
    assert res.status_code == 200
    data = res.json()
    assert data["settlements_created"] == 1
    assert Decimal(str(data["total_amount_algo"])) == Decimal("0.500000")

    settlement_record = data["settlements"][0]
    assert settlement_record["status"] == "confirmed"
    assert settlement_record["wallet_address"] == VALID_ALGO_ADDRESS_1
    assert settlement_record["transaction_id"].startswith("SIMULATED_TESTNET_")
    assert reward.id in settlement_record["reward_ids"]

    # Verify database state
    db_session.refresh(reward)
    assert reward.status == "settled"
    assert reward.settlement_id == settlement_record["id"]
    assert reward.settled_at is not None


def test_execute_settlement_idempotency_prevents_duplicate_payouts(
    client: TestClient,
    db_session: Session,
    test_creator: User,
    admin_token: str,
):
    reward = Reward(
        creator_id=test_creator.id,
        amount=Decimal("0.300000"),
        views_credited=6,
        status="pending",
    )
    db_session.add(reward)
    db_session.commit()

    key = "unique-idempotency-key-abc"

    with patch("app.services.settlement_service.get_settings") as mock_settings_fn:
        mock_settings = MagicMock()
        mock_settings.ALGORAND_NETWORK = "testnet"
        mock_settings.ALGORAND_TREASURY_MNEMONIC = None
        mock_settings_fn.return_value = mock_settings

        # First execution
        res1 = client.post(
            "/api/v1/settlements/execute",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"creator_id": test_creator.id, "idempotency_key": key},
        )
        assert res1.status_code == 200
        first_data = res1.json()
        assert first_data["settlements_created"] == 1
        first_settlement_id = first_data["settlements"][0]["id"]

        # Second execution with same idempotency key
        res2 = client.post(
            "/api/v1/settlements/execute",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"creator_id": test_creator.id, "idempotency_key": key},
        )
        assert res2.status_code == 200
        second_data = res2.json()
        assert "Idempotency match" in second_data["message"]
        assert second_data["settlements"][0]["id"] == first_settlement_id

    # Verify no second settlement was created in DB
    total_settlements = db_session.query(Settlement).filter(Settlement.creator_id == test_creator.id).count()
    assert total_settlements == 1


def test_execute_settlement_with_mocked_algod_success(
    client: TestClient,
    db_session: Session,
    test_creator: User,
    admin_token: str,
):
    reward = Reward(
        creator_id=test_creator.id,
        amount=Decimal("1.000000"),
        views_credited=20,
        status="pending",
    )
    db_session.add(reward)
    db_session.commit()

    # Generate a throwaway TestNet account for mock treasury
    from algosdk import account, mnemonic
    treasury_sk, treasury_addr = account.generate_account()
    treasury_mnemonic = mnemonic.from_private_key(treasury_sk)

    mock_algod = MagicMock()
    mock_params = MagicMock()
    mock_params.flat_fee = False
    mock_params.fee = 1000
    mock_params.first = 1000
    mock_params.last = 2000
    mock_params.gh = b"0" * 32
    mock_params.gen = "testnet-v1.0"
    mock_algod.suggested_params.return_value = mock_params
    mock_algod.account_info.return_value = {"amount": 50_000_000}  # 50 ALGO balance
    mock_algod.send_transaction.return_value = "TESTNET_TXID_ABC123MOCK"

    mock_settings = MagicMock()
    mock_settings.ALGORAND_NETWORK = "testnet"
    mock_settings.ALGORAND_ALGOD_URL = "https://testnet-api.algonode.cloud"
    mock_settings.ALGORAND_ALGOD_TOKEN = ""
    mock_settings.ALGORAND_TREASURY_MNEMONIC = treasury_mnemonic

    with patch("app.services.settlement_service.get_settings", return_value=mock_settings), \
         patch("app.services.settlement_service.get_algod_client", return_value=mock_algod), \
         patch("app.services.settlement_service.transaction.wait_for_confirmation", return_value={"confirmed-round": 38400010}):

        res = client.post(
            "/api/v1/settlements/execute",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "creator_id": test_creator.id,
                "idempotency_key": "mocked-algod-test",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["settlements_created"] == 1
        rec = data["settlements"][0]
        assert rec["transaction_id"] == "TESTNET_TXID_ABC123MOCK"
        assert rec["status"] == "confirmed"
        assert rec["confirmed_round"] == 38400010
        assert "lora.algokit.io/testnet" in rec["explorer_url"]


def test_reconcile_settlement_endpoint(
    client: TestClient,
    db_session: Session,
    test_creator: User,
    admin_token: str,
):
    # Create a settlement stuck in submitted status
    settlement = Settlement(
        creator_id=test_creator.id,
        wallet_address=VALID_ALGO_ADDRESS_1,
        amount=Decimal("0.750000"),
        network="testnet",
        status="submitted",
        transaction_id="IN_FLIGHT_TXID_123456",
    )
    db_session.add(settlement)
    db_session.commit()

    reward = Reward(
        creator_id=test_creator.id,
        amount=Decimal("0.750000"),
        views_credited=15,
        status="processing",
        settlement_id=settlement.id,
    )
    db_session.add(reward)
    db_session.commit()

    mock_algod = MagicMock()
    mock_algod.pending_transaction_info.return_value = {"confirmed-round": 38499999}

    with patch("app.services.settlement_service.get_algod_client", return_value=mock_algod):
        res = client.post(
            f"/api/v1/settlements/{settlement.id}/reconcile",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["new_status"] == "confirmed"
        assert data["confirmed_round"] == 38499999

    db_session.refresh(settlement)
    assert settlement.status == "confirmed"
    assert settlement.confirmed_round == 38499999

    db_session.refresh(reward)
    assert reward.status == "settled"


def test_settlement_history_scoped_access(
    client: TestClient,
    db_session: Session,
    test_creator: User,
    test_admin: User,
    admin_token: str,
    creator_token: str,
):
    s1 = Settlement(
        creator_id=test_creator.id,
        wallet_address=VALID_ALGO_ADDRESS_1,
        amount=Decimal("1.500000"),
        status="confirmed",
        transaction_id="TX_SETTLEMENT_CREATOR_1",
    )
    s2 = Settlement(
        creator_id=test_admin.id,
        wallet_address=VALID_ALGO_ADDRESS_2,
        amount=Decimal("2.000000"),
        status="confirmed",
        transaction_id="TX_SETTLEMENT_ADMIN_1",
    )
    db_session.add_all([s1, s2])
    db_session.commit()

    # Creator only sees their own
    res_creator = client.get(
        "/api/v1/settlements",
        headers={"Authorization": f"Bearer {creator_token}"},
    )
    assert res_creator.status_code == 200
    creator_items = res_creator.json()
    assert len(creator_items) == 1
    assert creator_items[0]["creator_id"] == test_creator.id

    # Admin sees all settlements
    res_admin = client.get(
        "/api/v1/settlements",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_admin.status_code == 200
    admin_items = res_admin.json()
    assert len(admin_items) >= 2
