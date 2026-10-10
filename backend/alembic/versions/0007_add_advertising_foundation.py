"""Add advertising foundation tables for campaigns, creatives, and events

Revision ID: 0007_advertising
Revises: 0006_settlements_admin
Create Date: 2026-10-10 01:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0007_advertising'
down_revision: Union[str, None] = '0006_settlements_admin'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. ad_campaigns table
    op.create_table(
        'ad_campaigns',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('advertiser_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('status', sa.String(length=20), server_default=sa.text("'active'"), nullable=False),
        sa.Column('budget_algo', sa.Numeric(precision=18, scale=6), server_default=sa.text('100.000000'), nullable=False),
        sa.Column('spent_algo', sa.Numeric(precision=18, scale=6), server_default=sa.text('0.000000'), nullable=False),
        sa.Column('start_date', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('draft', 'active', 'paused', 'completed')", name='chk_ad_campaign_status'),
        sa.CheckConstraint('budget_algo >= 0', name='chk_ad_campaign_budget_non_negative'),
        sa.CheckConstraint('spent_algo >= 0', name='chk_ad_campaign_spent_non_negative'),
        sa.ForeignKeyConstraint(['advertiser_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ad_campaigns_id'), 'ad_campaigns', ['id'], unique=False)
    op.create_index(op.f('ix_ad_campaigns_advertiser_id'), 'ad_campaigns', ['advertiser_id'], unique=False)
    op.create_index(op.f('ix_ad_campaigns_status'), 'ad_campaigns', ['status'], unique=False)

    # 2. ad_creatives table
    op.create_table(
        'ad_creatives',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('headline', sa.String(length=255), nullable=False),
        sa.Column('body_text', sa.Text(), nullable=False),
        sa.Column('media_url', sa.String(length=500), nullable=True),
        sa.Column('destination_url', sa.String(length=500), nullable=False),
        sa.Column('placement_type', sa.String(length=30), server_default=sa.text("'banner_overlay'"), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "placement_type IN ('banner_overlay', 'sidebar_card', 'feed_card', 'preroll_notice')",
            name='chk_ad_creative_placement_type',
        ),
        sa.ForeignKeyConstraint(['campaign_id'], ['ad_campaigns.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ad_creatives_id'), 'ad_creatives', ['id'], unique=False)
    op.create_index(op.f('ix_ad_creatives_campaign_id'), 'ad_creatives', ['campaign_id'], unique=False)
    op.create_index(op.f('ix_ad_creatives_placement_type'), 'ad_creatives', ['placement_type'], unique=False)

    # 3. ad_events table
    op.create_table(
        'ad_events',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('event_id', sa.String(length=64), nullable=False),
        sa.Column('creative_id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('video_id', sa.Integer(), nullable=True),
        sa.Column('event_type', sa.String(length=20), nullable=False),
        sa.Column('client_ip_hash', sa.String(length=64), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('is_valid', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("event_type IN ('serve', 'impression', 'click')", name='chk_ad_event_type'),
        sa.ForeignKeyConstraint(['campaign_id'], ['ad_campaigns.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['creative_id'], ['ad_creatives.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['video_id'], ['videos.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_id', 'event_type', name='uq_ad_events_event_id_type')
    )
    op.create_index(op.f('ix_ad_events_id'), 'ad_events', ['id'], unique=False)
    op.create_index(op.f('ix_ad_events_event_id'), 'ad_events', ['event_id'], unique=False)
    op.create_index(op.f('ix_ad_events_creative_id'), 'ad_events', ['creative_id'], unique=False)
    op.create_index(op.f('ix_ad_events_campaign_id'), 'ad_events', ['campaign_id'], unique=False)
    op.create_index(op.f('ix_ad_events_video_id'), 'ad_events', ['video_id'], unique=False)
    op.create_index(op.f('ix_ad_events_event_type'), 'ad_events', ['event_type'], unique=False)
    op.create_index(op.f('ix_ad_events_client_ip_hash'), 'ad_events', ['client_ip_hash'], unique=False)


def downgrade() -> None:
    op.drop_table('ad_events')
    op.drop_table('ad_creatives')
    op.drop_table('ad_campaigns')
