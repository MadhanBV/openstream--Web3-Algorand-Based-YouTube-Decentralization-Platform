from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_current_admin_user
from app.db.session import get_db
from app.models.reward import Settlement
from app.models.user import User
from app.schemas.settlement import (
    SettlementBatchPreviewResponse,
    SettlementExecuteRequest,
    SettlementExecuteResponse,
    SettlementReconcileResponse,
    SettlementRecordResponse,
)
from app.services.settlement_service import (
    execute_settlement_batch,
    get_settlement_history,
    preview_settlements,
    reconcile_settlement,
    serialize_settlement_record,
)

router = APIRouter(prefix="/settlements", tags=["Settlements"])


@router.get(
    "/preview",
    response_model=SettlementBatchPreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Preview pending settlements",
    description="Admin audit preview of pending creator rewards grouped by creator, verifying wallet addresses and microAlgo amounts.",
)
def preview_batch(
    creator_id: int | None = Query(None, description="Optional target creator ID"),
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> SettlementBatchPreviewResponse:
    """
    Returns an audit preview of pending settlements.
    """
    data = preview_settlements(db=db, creator_id=creator_id)
    return SettlementBatchPreviewResponse(**data)


@router.post(
    "/execute",
    response_model=SettlementExecuteResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute settlement batch on Algorand TestNet",
    description="Admin payout execution. Atomically broadcasts TestNet payments and records confirmation audit trail.",
)
def execute_batch(
    payload: SettlementExecuteRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> SettlementExecuteResponse:
    """
    Executes a creator settlement batch on Algorand TestNet with idempotency and row locking.
    """
    try:
        result = execute_settlement_batch(
            db=db,
            admin_user=admin_user,
            creator_id=payload.creator_id,
            idempotency_key=payload.idempotency_key,
            note=payload.note,
        )
        return SettlementExecuteResponse(**result)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Settlement execution error: {str(exc)}",
        )


@router.get(
    "",
    response_model=list[SettlementRecordResponse],
    status_code=status.HTTP_200_OK,
    summary="List settlement audit records",
    description="Returns settlement history. Admins can view all records; creators view only their own records.",
)
def list_settlements(
    creator_id: int | None = Query(None, description="Optional filter by creator ID"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> list[SettlementRecordResponse]:
    """
    Lists settlement history with status and Algorand TestNet explorer links.
    """
    # Scope: standard creators can only query their own settlements
    effective_creator_id = creator_id
    if not current_user.is_admin:
        effective_creator_id = current_user.id

    records = get_settlement_history(
        db=db,
        creator_id=effective_creator_id,
        limit=limit,
    )
    return [SettlementRecordResponse(**r) for r in records]


@router.get(
    "/{settlement_id}",
    response_model=SettlementRecordResponse,
    status_code=status.HTTP_200_OK,
    summary="Get settlement details",
    description="Returns detailed audit information for a specific settlement record.",
)
def get_settlement_detail(
    settlement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> SettlementRecordResponse:
    """
    Retrieves individual settlement record.
    """
    settlement = db.get(Settlement, settlement_id)
    if not settlement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Settlement #{settlement_id} not found",
        )

    if not current_user.is_admin and settlement.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden to other creators' settlement records",
        )

    return SettlementRecordResponse(**serialize_settlement_record(settlement))


@router.post(
    "/{settlement_id}/reconcile",
    response_model=SettlementReconcileResponse,
    status_code=status.HTTP_200_OK,
    summary="Reconcile settlement against Algorand TestNet",
    description="Admin reconciliation checking whether a pending or timed-out transaction has confirmed on Algorand TestNet nodes.",
)
def reconcile_record(
    settlement_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_admin_user),
) -> SettlementReconcileResponse:
    """
    Queries Algorand TestNet to verify on-chain status of a pending settlement.
    """
    try:
        result = reconcile_settlement(db=db, settlement_id=settlement_id)
        return SettlementReconcileResponse(**result)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Reconciliation error: {str(exc)}",
        )
