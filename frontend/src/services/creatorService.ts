import { request } from './api'
import type { CreatorAnalyticsResponse, CreatorVideoItem } from '../types'

export const creatorService = {
  /**
   * Fetches comprehensive analytics for the authenticated creator.
   * Includes view totals, retention, revenue sources, and daily trends.
   */
  async getAnalytics(days: number = 30): Promise<CreatorAnalyticsResponse> {
    return request<CreatorAnalyticsResponse>(`/creator/analytics?days=${days}`, {
      method: 'GET',
    })
  },

  /**
   * Lists all video assets owned by the creator (public, unlisted, private, draft).
   */
  async getCreatorVideos(params?: {
    status?: string
    visibility?: string
    search?: string
  }): Promise<CreatorVideoItem[]> {
    const qs = new URLSearchParams()
    if (params?.status && params.status !== 'all') qs.set('status', params.status)
    if (params?.visibility && params.visibility !== 'all') qs.set('visibility', params.visibility)
    if (params?.search) qs.set('search', params.search)

    const query = qs.toString() ? `?${qs.toString()}` : ''
    return request<CreatorVideoItem[]>(`/creator/videos${query}`, {
      method: 'GET',
    })
  },

  /**
   * Requests blockchain payout of accrued creator rewards.
   */
  async requestSettlement(): Promise<{ success: boolean; message: string; settlement: any }> {
    return request<{ success: boolean; message: string; settlement: any }>('/creator/request-settlement', {
      method: 'POST',
    })
  },

  /**
   * Updates metadata for an existing creator video.
   */
  async updateVideo(
    videoId: number,
    payload: {
      title?: string
      description?: string
      visibility?: 'public' | 'unlisted' | 'private'
      thumbnail_cid?: string
      status?: 'ready' | 'draft' | 'processing'
    }
  ): Promise<any> {
    return request<any>(`/videos/${videoId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Deletes a creator video asset.
   */
  async deleteVideo(videoId: number): Promise<void> {
    return request<void>(`/videos/${videoId}`, {
      method: 'DELETE',
    })
  },
}
