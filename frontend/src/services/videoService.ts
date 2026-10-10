import { getAuthToken, request, ApiError } from './api'

export interface CreateVideoPayload {
  title: string
  description?: string
  duration_seconds?: number
  visibility?: 'public' | 'unlisted' | 'private'
  thumbnail_cid?: string
}

export interface BackendVideoResponse {
  id: number
  creator_id: number
  title: string
  description?: string | null
  ipfs_cid?: string | null
  thumbnail_cid?: string | null
  duration_seconds: number
  views_count: number
  likes_count: number
  visibility: string
  status: string
  playback_url?: string | null
  created_at: string
  updated_at: string
  creator?: {
    id: number
    username: string
    display_name?: string | null
    avatar_url?: string | null
    wallet_address?: string | null
    is_creator: boolean
  } | null
}

export const videoService = {
  /**
   * Creates video metadata on the backend.
   */
  async createVideo(payload: CreateVideoPayload): Promise<BackendVideoResponse> {
    return request<BackendVideoResponse>('/videos', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Updates an existing video metadata record on backend.
   */
  async updateVideo(
    videoId: number | string,
    payload: Partial<CreateVideoPayload> & { thumbnail_cid?: string; status?: string }
  ): Promise<BackendVideoResponse> {
    return request<BackendVideoResponse>(`/videos/${videoId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },

  /**
   * Uploads binary video file to backend which securely pins it to Pinata IPFS.
   * Tracks real progress percentage using XMLHttpRequest.
   */
  uploadVideoFile(
    videoId: number,
    file: File | Blob,
    filename: string,
    onProgress?: (percent: number) => void
  ): Promise<BackendVideoResponse> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const token = getAuthToken()
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'
      const url = `${API_BASE_URL}/videos/${videoId}/upload`

      xhr.open('POST', url, true)

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100)
            onProgress(percent)
          }
        }
      }

      xhr.timeout = 300000 // 5 minutes timeout for large video uploads and Pinata processing

      xhr.onload = () => {
        try {
          const response = JSON.parse(xhr.responseText || '{}')
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(response as BackendVideoResponse)
          } else {
            const detail = response?.detail || response?.message || `Upload failed with HTTP ${xhr.status}`
            reject(new ApiError(detail, xhr.status, response))
          }
        } catch {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({} as BackendVideoResponse)
          } else {
            reject(new ApiError(`Upload failed with HTTP ${xhr.status}`, xhr.status))
          }
        }
      }

      xhr.ontimeout = () => {
        reject(new ApiError('Upload request timed out after 5 minutes.', 408))
      }

      xhr.onerror = () => {
        reject(new ApiError('Network failure during file upload to server.', 0))
      }

      const formData = new FormData()
      formData.append('file', file, filename)
      xhr.send(formData)
    })
  },

  /**
   * Retrieves single video details by ID.
   */
  async getVideo(videoId: number | string): Promise<BackendVideoResponse> {
    return request<BackendVideoResponse>(`/videos/${videoId}`, {
      method: 'GET',
    })
  },

  /**
   * Lists public ready videos with pagination.
   */
  async listVideos(params: { page?: number; page_size?: number; creator_id?: number } = {}) {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.page_size) query.set('page_size', String(params.page_size))
    if (params.creator_id) query.set('creator_id', String(params.creator_id))

    const qs = query.toString() ? `?${query.toString()}` : ''
    return request<{
      items: BackendVideoResponse[]
      total: number
      page: number
      page_size: number
      total_pages: number
    }>(`/videos${qs}`, {
      method: 'GET',
    })
  },

  /**
   * Deletes a video metadata record on backend.
   */
  async deleteVideo(videoId: number | string): Promise<void> {
    const id = typeof videoId === 'string' && videoId.startsWith('v-') ? videoId.replace('v-', '') : videoId
    return request<void>(`/videos/${id}`, {
      method: 'DELETE',
    })
  },
}
