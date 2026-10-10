"""Enhance settlements and add admin user flag

Revision ID: 0006_settlements_admin
Revises: 0005_view_rewards
Create Date: 2026-10-10 01:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0006_settlements_admin'
down_revision: Union[str, None] = '0005_view_rewards'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add is_admin to users
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), server_default='false', nullable=False))

    # 2. Add audit and lifecycle columns to settlements
    op.add_column('settlements', sa.Column('confirmed_round', sa.BigInteger(), nullable=True))
    op.add_column('settlements', sa.Column('tx_fee_microalgos', sa.Integer(), server_default='1000', nullable=False))
    op.add_column('settlements', sa.Column('error_message', sa.Text(), nullable=True))
    op.add_column('settlements', sa.Column('idempotency_key', sa.String(length=64), nullable=True))
    op.add_column('settlements', sa.Column('retry_count', sa.Integer(), server_default='0', nullable=False))

    # 3. Create indexes
    op.create_index(op.f('ix_settlements_idempotency_key'), 'settlements', ['idempotency_key'], unique=True)
    op.create_index('ix_settlements_status_creator', 'settlements', ['status', 'creator_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_settlements_status_creator', table_name='settlements')
    op.drop_index(op.f('ix_settlements_idempotency_key'), table_name='settlements')

    op.drop_column('settlements', 'retry_count')
    op.drop_column('settlements', 'idempotency_key')
    op.drop_column('settlements', 'error_message')
    op.drop_column('settlements', 'tx_fee_microalgos')
    op.drop_column('settlements', 'confirmed_round')

    op.drop_column('users', 'is_admin')
