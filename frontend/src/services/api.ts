/**
 * Core API Client for OpenStream Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export class ApiError extends Error {
  status: number
  data: any

  constructor(message: string, status: number, data?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

export const getAuthToken = (): string | null => {
  return localStorage.getItem('openstream_access_token')
}

export const setAuthToken = (token: string): void => {
  localStorage.setItem('openstream_access_token', token)
}

export const removeAuthToken = (): void => {
  localStorage.removeItem('openstream_access_token')
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config: RequestInit = {
    ...options,
    headers,
  }

  try {
    const response = await fetch(url, config)

    if (response.status === 204) {
      return {} as T
    }

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`

      if (typeof data?.detail === 'string') {
        errorMessage = data.detail
      } else if (Array.isArray(data?.detail)) {
        // Format FastAPI / Pydantic validation error objects into readable strings
        errorMessage = data.detail
          .map((err: any) => {
            const field = Array.isArray(err.loc) ? err.loc[err.loc.length - 1] : ''
            return field && field !== 'body' ? `${field}: ${err.msg}` : err.msg
          })
          .join('; ')
      } else if (typeof data?.message === 'string') {
        errorMessage = data.message
      }

      throw new ApiError(errorMessage, response.status, data)
    }

    return data as T
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err
    }
    throw new ApiError(
      err.message || 'Unable to communicate with OpenStream backend server.',
      0
    )
  }
}
