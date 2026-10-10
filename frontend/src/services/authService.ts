import { request, setAuthToken, removeAuthToken } from './api'
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
  WalletChallengeResponse,
  WalletVerifyPayload,
} from '../types'

export const authService = {
  /**
   * Register a new user account on the backend.
   */
  async register(payload: RegisterPayload): Promise<User> {
    const rawUser = await request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    return {
      id: rawUser.id,
      username: rawUser.username,
      displayName: rawUser.display_name,
      email: rawUser.email,
      bio: rawUser.bio,
      avatarUrl: rawUser.avatar_url,
      bannerUrl: rawUser.banner_url,
      walletAddress: rawUser.wallet_address,
      isCreator: rawUser.is_creator,
      isActive: rawUser.is_active,
      createdAt: rawUser.created_at,
      updatedAt: rawUser.updated_at,
    }
  },

  /**
   * Log in with username or email and password.
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (response.access_token) {
      setAuthToken(response.access_token)
    }

    return response
  },

  /**
   * Fetch current authenticated user's profile.
   */
  async getCurrentUser(): Promise<User> {
    const rawUser = await request<any>('/auth/me', {
      method: 'GET',
    })

    return {
      id: rawUser.id,
      username: rawUser.username,
      displayName: rawUser.display_name,
      email: rawUser.email,
      bio: rawUser.bio,
      avatarUrl: rawUser.avatar_url,
      bannerUrl: rawUser.banner_url,
      walletAddress: rawUser.wallet_address,
      isCreator: rawUser.is_creator,
      isActive: rawUser.is_active,
      createdAt: rawUser.created_at,
      updatedAt: rawUser.updated_at,
    }
  },

  /**
   * Log out user session.
   */
  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' })
    } catch {
      // Ignore network errors on logout
    } finally {
      removeAuthToken()
    }
  },

  /**
   * Generates a short-lived SIWA cryptographic challenge for the Algorand wallet address.
   */
  async getWalletChallenge(walletAddress: string): Promise<WalletChallengeResponse> {
    return await request<WalletChallengeResponse>('/auth/wallet/challenge', {
      method: 'POST',
      body: JSON.stringify({ wallet_address: walletAddress }),
    })
  },

  /**
   * Submits cryptographic proof (signed transaction or signature) to establish an authenticated session.
   */
  async verifyWalletProof(payload: WalletVerifyPayload): Promise<AuthResponse> {
    const response = await request<AuthResponse>('/auth/wallet/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (response.access_token) {
      setAuthToken(response.access_token)
    }

    return response
  },

  /**
   * Associates an Algorand wallet address with the authenticated profile.
   */
  async associateWallet(walletAddress: string): Promise<User> {
    const rawUser = await request<any>('/auth/me/wallet', {
      method: 'PUT',
      body: JSON.stringify({ wallet_address: walletAddress }),
    })

    return {
      id: rawUser.id,
      username: rawUser.username,
      displayName: rawUser.display_name,
      email: rawUser.email,
      bio: rawUser.bio,
      avatarUrl: rawUser.avatar_url,
      bannerUrl: rawUser.banner_url,
      walletAddress: rawUser.wallet_address,
      isCreator: rawUser.is_creator,
      isActive: rawUser.is_active,
      createdAt: rawUser.created_at,
      updatedAt: rawUser.updated_at,
    }
  },

  /**
   * Disconnects the Algorand wallet address from the authenticated profile.
   */
  async disconnectWallet(): Promise<User> {
    const rawUser = await request<any>('/auth/me/wallet', {
      method: 'DELETE',
    })

    return {
      id: rawUser.id,
      username: rawUser.username,
      displayName: rawUser.display_name,
      email: rawUser.email,
      bio: rawUser.bio,
      avatarUrl: rawUser.avatar_url,
      bannerUrl: rawUser.banner_url,
      walletAddress: rawUser.wallet_address,
      isCreator: rawUser.is_creator,
      isActive: rawUser.is_active,
      createdAt: rawUser.created_at,
      updatedAt: rawUser.updated_at,
    }
  },
}


