import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authService } from '../services/authService'
import { peraWalletService } from '../services/peraWalletService'
import { healthService } from '../services/healthService'
import { getAuthToken, removeAuthToken } from '../services/api'
import type { User, LoginPayload, RegisterPayload } from '../types'

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  backendOnline: boolean
  login: (payload: LoginPayload) => Promise<void>
  loginWithWallet: (walletAddress: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<User>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  checkBackendStatus: () => Promise<boolean>
}


const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(getAuthToken())
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [backendOnline, setBackendOnline] = useState<boolean>(false)

  // Verify backend health
  const checkBackendStatus = useCallback(async (): Promise<boolean> => {
    try {
      const health = await healthService.checkHealth()
      const isOk = health.status === 'ok'
      setBackendOnline(isOk)
      return isOk
    } catch {
      setBackendOnline(false)
      return false
    }
  }, [])

  // Load user profile if token exists
  const refreshUser = useCallback(async () => {
    const existingToken = getAuthToken()
    if (!existingToken) {
      setUser(null)
      setToken(null)
      setIsLoading(false)
      return
    }

    try {
      const profile = await authService.getCurrentUser()
      setUser(profile)
      setToken(existingToken)
    } catch (err: any) {
      // If token expired or invalid, clear it
      if (err.status === 401) {
        removeAuthToken()
        setToken(null)
        setUser(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkBackendStatus()
    refreshUser()

    // Poll backend health occasionally
    const interval = setInterval(checkBackendStatus, 30000)
    return () => clearInterval(interval)
  }, [checkBackendStatus, refreshUser])

  const login = async (payload: LoginPayload) => {
    setIsLoading(true)
    try {
      const res = await authService.login(payload)
      setToken(res.access_token)
      await refreshUser()
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithWallet = async (walletAddress: string) => {
    setIsLoading(true)
    try {
      // 1. Request SIWA cryptographic challenge from server
      const challenge = await authService.getWalletChallenge(walletAddress)

      // 2. Request Pera Wallet cryptographic signature (offline 0-ALGO proof txn)
      const proof = await peraWalletService.signAuthChallenge(
        walletAddress,
        challenge.challenge_text
      )

      // 3. Verify signature on backend & establish JWT session
      const authRes = await authService.verifyWalletProof({
        challenge_id: challenge.challenge_id,
        wallet_address: walletAddress,
        signed_txn: proof.signedTxn,
        signature: proof.signature,
      })

      setToken(authRes.access_token)
      await refreshUser()
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (payload: RegisterPayload): Promise<User> => {
    setIsLoading(true)
    try {
      const newUser = await authService.register(payload)
      return newUser
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await authService.logout()
    } finally {
      setUser(null)
      setToken(null)
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        backendOnline,
        login,
        loginWithWallet,
        register,
        logout,
        refreshUser,
        checkBackendStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  )

}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
