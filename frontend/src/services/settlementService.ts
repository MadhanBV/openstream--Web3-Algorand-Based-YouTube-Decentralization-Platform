import { request } from './api'

export interface SettlementCreatorPreview {
  creator_id: number
  username: string
  wallet_address: string
  is_valid_address: boolean
  pending_rewards_count: number
  amount_algo: string | number
  amount_microalgos: number
}

export interface SettlementBatchPreviewResponse {
  total_creators: number
  total_amount_algo: string | number
  total_amount_microalgos: number
  creators: SettlementCreatorPreview[]
}

export interface SettlementRecordResponse {
  id: number
  creator_id: number
  wallet_address: string
  amount: string | number
  network: string
  transaction_id: string | null
  status: string
  confirmed_round: number | null
  tx_fee_microalgos: number
  error_message: string | null
  idempotency_key: string | null
  created_at: string
  confirmed_at: string | null
  explorer_url: string | null
  reward_ids: number[]
}

export interface SettlementExecuteResponse {
  settlements_created: number
  total_amount_algo: string | number
  settlements: SettlementRecordResponse[]
  message: string
}

export interface SettlementReconcileResponse {
  settlement_id: number
  transaction_id: string | null
  old_status: string
  new_status: string
  confirmed_round: number | null
  message: string
}

export const settlementService = {
  /**
   * Admin preview of pending settlements grouped by creator with address verification.
   */
  async getPreview(creatorId?: number): Promise<SettlementBatchPreviewResponse> {
    const qs = creatorId ? `?creator_id=${creatorId}` : ''
    return request<SettlementBatchPreviewResponse>(`/settlements/preview${qs}`, {
      method: 'GET',
    })
  },

  /**
   * Executes atomic payout batch on Algorand TestNet with idempotency protection.
   */
  async executeBatch(payload: {
    creator_id?: number
    idempotency_key?: string
    note?: string
  }): Promise<SettlementExecuteResponse> {
    return request<SettlementExecuteResponse>('/settlements/execute', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Lists settlement records with explorer URLs.
   */
  async getSettlements(creatorId?: number, limit = 50): Promise<SettlementRecordResponse[]> {
    const params = new URLSearchParams()
    if (creatorId) params.set('creator_id', String(creatorId))
    params.set('limit', String(limit))
    return request<SettlementRecordResponse[]>(`/settlements?${params.toString()}`, {
      method: 'GET',
    })
  },

  /**
   * Fetches specific settlement audit record by ID.
   */
  async getSettlement(settlementId: number): Promise<SettlementRecordResponse> {
    return request<SettlementRecordResponse>(`/settlements/${settlementId}`, {
      method: 'GET',
    })
  },

  /**
   * Reconciles in-flight or timed-out settlement against Algorand TestNet consensus nodes.
   */
  async reconcile(settlementId: number): Promise<SettlementReconcileResponse> {
    return request<SettlementReconcileResponse>(`/settlements/${settlementId}/reconcile`, {
      method: 'POST',
    })
  },
}
