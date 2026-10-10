"""Add auth_challenges table for Web3 cryptographic authentication

Revision ID: 0004_add_auth_challenges_table
Revises: 0003_video_cid_nullable
Create Date: 2026-10-09 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0004_add_auth_challenges_table'
down_revision: Union[str, None] = '0003_video_cid_nullable'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'auth_challenges',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('wallet_address', sa.String(length=58), nullable=False),
        sa.Column('nonce', sa.String(length=64), nullable=False),
        sa.Column('challenge_text', sa.Text(), nullable=False),
        sa.Column('domain', sa.String(length=255), nullable=False),
        sa.Column('chain_id', sa.Integer(), nullable=False, server_default='416002'),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_auth_challenges_id'), 'auth_challenges', ['id'], unique=False)
    op.create_index(op.f('ix_auth_challenges_wallet_address'), 'auth_challenges', ['wallet_address'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_auth_challenges_wallet_address'), table_name='auth_challenges')
    op.drop_index(op.f('ix_auth_challenges_id'), table_name='auth_challenges')
    op.drop_table('auth_challenges')
