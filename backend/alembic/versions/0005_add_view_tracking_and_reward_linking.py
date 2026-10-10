"""Add view tracking and reward linking fields

Revision ID: 0005_view_rewards
Revises: 0004_add_auth_challenges_table
Create Date: 2026-10-10 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0005_view_rewards'
down_revision: Union[str, None] = '0004_add_auth_challenges_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new view tracking & qualification columns to video_views
    op.add_column('video_views', sa.Column('is_qualified', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('video_views', sa.Column('client_ip_hash', sa.String(length=64), nullable=True))
    op.add_column('video_views', sa.Column('last_heartbeat_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('video_views', sa.Column('reward_id', sa.Integer(), nullable=True))
    op.add_column('video_views', sa.Column('rewarded_at', sa.DateTime(timezone=True), nullable=True))

    # Add foreign key constraint for reward linking
    op.create_foreign_key(
        'fk_video_views_reward_id_rewards',
        'video_views',
        'rewards',
        ['reward_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # Add indices for high-performance anti-abuse checks and reward calculations
    op.create_index(op.f('ix_video_views_is_qualified'), 'video_views', ['is_qualified'], unique=False)
    op.create_index(op.f('ix_video_views_client_ip_hash'), 'video_views', ['client_ip_hash'], unique=False)
    op.create_index(op.f('ix_video_views_reward_id'), 'video_views', ['reward_id'], unique=False)
    op.create_index('ix_video_views_qualification', 'video_views', ['video_id', 'is_qualified', 'reward_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_video_views_qualification', table_name='video_views')
    op.drop_index(op.f('ix_video_views_reward_id'), table_name='video_views')
    op.drop_index(op.f('ix_video_views_client_ip_hash'), table_name='video_views')
    op.drop_index(op.f('ix_video_views_is_qualified'), table_name='video_views')
    op.drop_constraint('fk_video_views_reward_id_rewards', 'video_views', type_='foreignkey')
    op.drop_column('video_views', 'rewarded_at')
    op.drop_column('video_views', 'reward_id')
    op.drop_column('video_views', 'last_heartbeat_at')
    op.drop_column('video_views', 'client_ip_hash')
    op.drop_column('video_views', 'is_qualified')
