from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class SettlementCreatorPreview(BaseModel):
    creator_id: int
    username: str
    wallet_address: str
    is_valid_address: bool
    pending_rewards_count: int
    amount_algo: Decimal
    amount_microalgos: int


class SettlementBatchPreviewResponse(BaseModel):
    total_creators: int
    total_amount_algo: Decimal
    total_amount_microalgos: int
    creators: list[SettlementCreatorPreview]


class SettlementExecuteRequest(BaseModel):
    creator_id: Optional[int] = Field(None, description="Optional target creator ID; if omitted, processes all eligible creators")
    idempotency_key: Optional[str] = Field(None, description="Unique client idempotency key to prevent double-charging on network retries")
    note: Optional[str] = Field(None, description="Optional transaction note recorded in Algorand block memo")


class SettlementRecordResponse(BaseModel):
    id: int
    creator_id: int
    wallet_address: str
    amount: Decimal
    network: str
    transaction_id: Optional[str] = None
    status: str
    confirmed_round: Optional[int] = None
    tx_fee_microalgos: int
    error_message: Optional[str] = None
    idempotency_key: Optional[str] = None
    created_at: datetime
    confirmed_at: Optional[datetime] = None
    explorer_url: Optional[str] = None
    reward_ids: list[int] = Field(default_factory=list)


class SettlementExecuteResponse(BaseModel):
    settlements_created: int
    total_amount_algo: Decimal
    settlements: list[SettlementRecordResponse]
    message: str


class SettlementReconcileResponse(BaseModel):
    settlement_id: int
    transaction_id: Optional[str] = None
    old_status: str
    new_status: str
    confirmed_round: Optional[int] = None
    message: str
