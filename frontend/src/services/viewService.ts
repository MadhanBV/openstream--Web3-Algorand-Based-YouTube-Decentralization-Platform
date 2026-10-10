import { request } from './api'

export interface ViewSessionStartResponse {
  session_id: string
  video_id: number
  heartbeat_interval_seconds: number
  min_watch_seconds: number
}

export interface ViewHeartbeatResponse {
  session_id: string
  watch_duration_seconds: number
  is_qualified: boolean
  status: string
}


export interface ViewStatsResponse {
  video_id: number
  total_views: number
  qualified_views: number
  total_watch_duration_seconds: number
}

export const viewService = {
  /**
   * Initializes a server-validated watch tracking session.
   */
  async startSession(videoId: number): Promise<ViewSessionStartResponse> {
    return request<ViewSessionStartResponse>('/views/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ video_id: videoId }),
    })
  },

  /**
   * Sends an active playback progress heartbeat to the server.
   */
  async sendHeartbeat(
    sessionId: string,
    currentTimeSeconds: number
  ): Promise<ViewHeartbeatResponse> {
    return request<ViewHeartbeatResponse>('/views/sessions/heartbeat', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        current_time_seconds: currentTimeSeconds,
      }),
    })
  },

  /**
   * Gracefully terminates an active watch session upon video completion or navigation away.
   */
  async endSession(sessionId: string, completed = false): Promise<void> {
    try {
      await request('/views/sessions/end', {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId,
          completed,
        }),
      })
    } catch {
      // Ignore network teardown errors on player unmount
    }
  },

  /**
   * Fetches public view engagement statistics for a video.
   */
  async getVideoStats(videoId: number): Promise<ViewStatsResponse> {
    return request<ViewStatsResponse>(`/views/stats/${videoId}`, {
      method: 'GET',
    })
  },
}
