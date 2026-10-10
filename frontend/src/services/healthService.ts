import { request } from './api'
import type { BackendHealth } from '../types'

export const healthService = {
  /**
   * Check backend server status
   */
  async checkHealth(): Promise<BackendHealth> {
    return request<BackendHealth>('/health', { method: 'GET' })
  },
}
