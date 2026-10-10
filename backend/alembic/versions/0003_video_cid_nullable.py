"""Make video ipfs_cid nullable and default status to draft

Revision ID: 0003_video_cid_nullable
Revises: 0002_add_user_password_hash
Create Date: 2026-10-09 13:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0003_video_cid_nullable'
down_revision: Union[str, None] = '0002_add_user_password_hash'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make ipfs_cid nullable in videos table for draft/pending video records
    op.alter_column('videos', 'ipfs_cid', existing_type=sa.String(length=128), nullable=True)
    op.alter_column('videos', 'status', existing_type=sa.String(length=20), server_default=sa.text("'draft'"), nullable=False)


def downgrade() -> None:
    op.alter_column('videos', 'status', existing_type=sa.String(length=20), server_default=sa.text("'ready'"), nullable=False)
    op.alter_column('videos', 'ipfs_cid', existing_type=sa.String(length=128), nullable=False)
