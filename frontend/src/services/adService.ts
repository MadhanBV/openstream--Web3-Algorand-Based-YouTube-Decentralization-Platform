import { request } from './api'

export interface AdCreativeCreate {
  title: string
  headline: string
  body_text: string
  media_url?: string
  destination_url: string
  placement_type?: string
}

export interface AdCreativeResponse {
  id: number
  campaign_id: number
  title: string
  headline: string
  body_text: string
  media_url?: string | null
  destination_url: string
  placement_type: string
  is_active: boolean
  created_at: string
}

export interface AdCampaignCreate {
  title: string
  budget_algo?: number | string
  creatives?: AdCreativeCreate[]
}

export interface AdCampaignResponse {
  id: number
  advertiser_id: number
  title: string
  status: string
  budget_algo: string | number
  spent_algo: string | number
  start_date: string
  end_date?: string | null
  created_at: string
  creatives: AdCreativeResponse[]
}

export interface AdServeResponse {
  creative_id: number
  campaign_id: number
  title: string
  headline: string
  body_text: string
  media_url?: string | null
  destination_url: string
  placement_type: string
  event_token: string
  sponsored_label: string
}

export interface AdCampaignReportResponse {
  campaign_id: number
  campaign_title: string
  status: string
  budget_algo: string | number
  spent_algo: string | number
  serves_count: number
  valid_impressions_count: number
  valid_clicks_count: number
  ctr_percent: number
}

export const adService = {
  /**
   * Serves an eligible active ad creative and issues a signed event token.
   */
  async serveAd(placement = 'banner_overlay', videoId?: number): Promise<AdServeResponse | null> {
    const params = new URLSearchParams({ placement })
    if (videoId) params.set('video_id', String(videoId))
    try {
      return await request<AdServeResponse | null>(`/ads/serve?${params.toString()}`, {
        method: 'GET',
      })
    } catch {
      return null
    }
  },

  /**
   * Records a verified ad impression when viewport conditions are met.
   */
  async recordImpression(
    eventToken: string,
    viewportDurationMs = 1000
  ): Promise<{ recorded: boolean; duplicate: boolean }> {
    return request<{ recorded: boolean; duplicate: boolean }>('/ads/impression', {
      method: 'POST',
      body: JSON.stringify({
        event_token: eventToken,
        viewport_duration_ms: viewportDurationMs,
      }),
    })
  },

  /**
   * Records an ad click and retrieves destination URL.
   */
  async recordClick(eventToken: string): Promise<{ destination_url: string; recorded: boolean }> {
    return request<{ destination_url: string; recorded: boolean }>('/ads/click', {
      method: 'POST',
      body: JSON.stringify({
        event_token: eventToken,
      }),
    })
  },

  /**
   * Lists campaigns with creatives for authenticated advertiser.
   */
  async getCampaigns(): Promise<AdCampaignResponse[]> {
    return request<AdCampaignResponse[]>('/ads/campaigns', {
      method: 'GET',
    })
  },

  /**
   * Creates prototype advertising campaign.
   */
  async createCampaign(payload: AdCampaignCreate): Promise<AdCampaignResponse> {
    return request<AdCampaignResponse>('/ads/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Fetches transparent performance report with CTR and spend metrics.
   */
  async getCampaignReport(campaignId: number): Promise<AdCampaignReportResponse> {
    return request<AdCampaignReportResponse>(`/ads/campaigns/${campaignId}/report`, {
      method: 'GET',
    })
  },
}
