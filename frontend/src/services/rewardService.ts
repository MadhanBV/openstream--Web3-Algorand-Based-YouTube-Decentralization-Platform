import { request } from './api'

export interface RewardEntry {
  id: number
  creator_id: number
  video_id: number | null
  amount: string | number
  views_credited: number
  status: string
  settlement_id: number | null
  created_at: string
  settled_at: string | null
}

export interface CreatorRewardSummary {
  creator_id: number
  wallet_address?: string | null
  total_earned_algo: string | number
  pending_rewards_algo: string | number
  settled_rewards_algo: string | number
  total_qualified_views: number
  rewards: RewardEntry[]
}

export interface RewardCalculationResult {
  rewards_created: number
  total_amount: string | number
  total_views_credited: number
  message: string
}

export const rewardService = {
  /**
   * Fetches the authenticated creator's reward balances and recent ledger history.
   */
  async getMyRewards(): Promise<CreatorRewardSummary> {
    return request<CreatorRewardSummary>('/rewards/me', {
      method: 'GET',
    })
  },

  /**
   * Triggers an idempotent batch reward calculation for uncredited qualified views.
   */
  async calculateRewards(creatorId?: number): Promise<RewardCalculationResult> {
    const qs = creatorId ? `?creator_id=${creatorId}` : ''
    return request<RewardCalculationResult>(`/rewards/calculate${qs}`, {
      method: 'POST',
    })
  },

  /**
   * Fetches public reward metrics for a given creator ID.
   */
  async getCreatorRewards(creatorId: number): Promise<CreatorRewardSummary> {
    return request<CreatorRewardSummary>(`/rewards/creator/${creatorId}`, {
      method: 'GET',
    })
  },
}
