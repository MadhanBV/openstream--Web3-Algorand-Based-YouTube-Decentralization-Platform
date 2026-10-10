"""Alter video thumbnail_cid to text

Revision ID: 0008_thumbnail_text
Revises: 0007_advertising
Create Date: 2026-10-10 08:52:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0008_thumbnail_text'
down_revision: Union[str, None] = '0007_advertising'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('videos', 'thumbnail_cid',
               existing_type=sa.String(length=128),
               type_=sa.Text(),
               existing_nullable=True)


def downgrade() -> None:
    op.alter_column('videos', 'thumbnail_cid',
               existing_type=sa.Text(),
               type_=sa.String(length=128),
               existing_nullable=True)
