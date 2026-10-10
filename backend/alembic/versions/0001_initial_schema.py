"""Initial database schema for OpenStream MVP

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-10-09 08:21:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('display_name', sa.String(length=100), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('banner_url', sa.String(length=500), nullable=True),
        sa.Column('wallet_address', sa.String(length=58), nullable=True),
        sa.Column('is_creator', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_wallet_address'), 'users', ['wallet_address'], unique=True)

    # 2. videos table
    op.create_table(
        'videos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('creator_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('ipfs_cid', sa.String(length=128), nullable=False),
        sa.Column('thumbnail_cid', sa.String(length=128), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('views_count', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('likes_count', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('visibility', sa.String(length=20), server_default=sa.text("'public'"), nullable=False),
        sa.Column('status', sa.String(length=20), server_default=sa.text("'ready'"), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('duration_seconds >= 0', name='chk_video_duration_non_negative'),
        sa.CheckConstraint('views_count >= 0', name='chk_video_views_non_negative'),
        sa.CheckConstraint('likes_count >= 0', name='chk_video_likes_non_negative'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_videos_id'), 'videos', ['id'], unique=False)
    op.create_index(op.f('ix_videos_creator_id'), 'videos', ['creator_id'], unique=False)
    op.create_index(op.f('ix_videos_ipfs_cid'), 'videos', ['ipfs_cid'], unique=False)
    op.create_index('ix_videos_status_visibility', 'videos', ['status', 'visibility'], unique=False)

    # 3. video_views table
    op.create_table(
        'video_views',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('video_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('watch_duration_seconds', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('is_valid', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('session_id', sa.String(length=128), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint('watch_duration_seconds >= 0', name='chk_view_duration_non_negative'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['video_id'], ['videos.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_video_views_id'), 'video_views', ['id'], unique=False)
    op.create_index(op.f('ix_video_views_video_id'), 'video_views', ['video_id'], unique=False)
    op.create_index(op.f('ix_video_views_user_id'), 'video_views', ['user_id'], unique=False)
    op.create_index(op.f('ix_video_views_is_valid'), 'video_views', ['is_valid'], unique=False)
    op.create_index(op.f('ix_video_views_session_id'), 'video_views', ['session_id'], unique=False)
    op.create_index('ix_video_views_video_created', 'video_views', ['video_id', 'created_at'], unique=False)

    # 4. video_likes table
    op.create_table(
        'video_likes',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('video_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['video_id'], ['videos.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'video_id', name='uq_user_video_like')
    )
    op.create_index(op.f('ix_video_likes_id'), 'video_likes', ['id'], unique=False)
    op.create_index(op.f('ix_video_likes_user_id'), 'video_likes', ['user_id'], unique=False)
    op.create_index(op.f('ix_video_likes_video_id'), 'video_likes', ['video_id'], unique=False)

    # 5. comments table
    op.create_table(
        'comments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('video_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['video_id'], ['videos.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_comments_id'), 'comments', ['id'], unique=False)
    op.create_index(op.f('ix_comments_video_id'), 'comments', ['video_id'], unique=False)
    op.create_index(op.f('ix_comments_user_id'), 'comments', ['user_id'], unique=False)

    # 6. settlements table
    op.create_table(
        'settlements',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('creator_id', sa.Integer(), nullable=False),
        sa.Column('wallet_address', sa.String(length=58), nullable=False),
        sa.Column('amount', sa.Numeric(precision=18, scale=6), nullable=False),
        sa.Column('network', sa.String(length=30), server_default=sa.text("'testnet'"), nullable=False),
        sa.Column('transaction_id', sa.String(length=128), nullable=True),
        sa.Column('status', sa.String(length=20), server_default=sa.text("'pending'"), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint('amount > 0', name='chk_settlement_amount_positive'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_settlements_id'), 'settlements', ['id'], unique=False)
    op.create_index(op.f('ix_settlements_creator_id'), 'settlements', ['creator_id'], unique=False)
    op.create_index(op.f('ix_settlements_wallet_address'), 'settlements', ['wallet_address'], unique=False)
    op.create_index(op.f('ix_settlements_transaction_id'), 'settlements', ['transaction_id'], unique=True)
    op.create_index(op.f('ix_settlements_status'), 'settlements', ['status'], unique=False)

    # 7. rewards table
    op.create_table(
        'rewards',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('creator_id', sa.Integer(), nullable=False),
        sa.Column('video_id', sa.Integer(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=18, scale=6), server_default=sa.text('0.000000'), nullable=False),
        sa.Column('views_credited', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('status', sa.String(length=20), server_default=sa.text("'accrued'"), nullable=False),
        sa.Column('settlement_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('settled_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint('amount >= 0', name='chk_reward_amount_non_negative'),
        sa.CheckConstraint('views_credited >= 0', name='chk_reward_views_non_negative'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['settlement_id'], ['settlements.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['video_id'], ['videos.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rewards_id'), 'rewards', ['id'], unique=False)
    op.create_index(op.f('ix_rewards_creator_id'), 'rewards', ['creator_id'], unique=False)
    op.create_index(op.f('ix_rewards_video_id'), 'rewards', ['video_id'], unique=False)
    op.create_index(op.f('ix_rewards_status'), 'rewards', ['status'], unique=False)
    op.create_index(op.f('ix_rewards_settlement_id'), 'rewards', ['settlement_id'], unique=False)


def downgrade() -> None:
    op.drop_table('rewards')
    op.drop_table('settlements')
    op.drop_table('comments')
    op.drop_table('video_likes')
    op.drop_table('video_views')
    op.drop_table('videos')
    op.drop_table('users')
