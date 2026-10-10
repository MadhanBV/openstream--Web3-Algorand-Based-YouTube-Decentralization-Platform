export interface Creator {
  id: string
  name: string
  handle: string
  avatar: string
  banner: string
  bio: string
  subscribersCount: number
  walletAddress: string
  verified: boolean
  totalViews: number
  totalEarnedAlgo: number
}

export interface Video {
  id: string
  title: string
  description: string
  creator: Creator
  ipfsCid: string
  thumbnail: string
  duration: string
  views: number
  likes: number
  createdAt: string
  category: string
  tags: string[]
  streamUrl: string
  playbackUrl?: string
  backendId?: number
  resolution: string
  fileSize: string
  isPinnedToIpfs: boolean
  status: 'published' | 'processing' | 'draft' | 'failed'
  earnedAlgo: number
}

export interface Settlement {
  id: string
  amountAlgo: number
  creatorAddress: string
  transactionId: string
  status: 'settled' | 'pending' | 'processing'
  timestamp: string
  network: string
  blockNumber: number
}

export interface Comment {
  id: string
  author: string
  avatar: string
  text: string
  timestamp: string
  likes: number
  isCreator?: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  icon?: string
}

export interface WalletState {
  isConnected: boolean
  address: string | null
  balanceAlgo: number
  network: 'Testnet' | 'Mainnet'
  isConnecting: boolean
  sessionToken: string | null
}

export type ActivePage =
  | 'landing'
  | 'home'
  | 'watch'
  | 'studio-dashboard'
  | 'studio-upload'
  | 'studio-videos'
  | 'studio-wallet'
  | 'creator-profile'
  | 'transparency'

// Backend & Authentication Types
export interface User {
  id: number
  username: string
  displayName?: string | null
  email?: string | null
  bio?: string | null
  avatarUrl?: string | null
  bannerUrl?: string | null
  walletAddress?: string | null
  isCreator: boolean
  isAdmin?: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
  display_name?: string
  bio?: string
  is_creator?: boolean
}

export interface LoginPayload {
  username_or_email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: {
    id: number
    username: string
    display_name?: string | null
    email?: string | null
    bio?: string | null
    avatar_url?: string | null
    banner_url?: string | null
    wallet_address?: string | null
    is_creator: boolean
    is_admin?: boolean
    is_active: boolean
    created_at: string
    updated_at: string
  }
}

export interface BackendHealth {
  status: string
  service: string
}

export interface WalletChallengeResponse {
  challenge_id: string
  wallet_address: string
  nonce: string
  challenge_text: string
  chain_id: number
  expires_at: string
}

export interface WalletVerifyPayload {
  challenge_id: string
  wallet_address: string
  signed_txn?: string
  signature?: string
}

// Phase 14 Creator Studio Types
export interface DailyMetricPoint {
  date: string
  views: number
  qualified_views: number
  watch_seconds: number
  earned_algo: string | number
}

export interface TopVideoMetric {
  id: number
  title: string
  thumbnail_cid?: string | null
  views: number
  qualified_views: number
  watch_seconds: number
  earned_algo: string | number
  likes: number
}

export interface RevenueBreakdown {
  view_rewards_algo: string | number
  ad_revenue_algo: string | number
  tips_algo: string | number
  total_revenue_algo: string | number
}

export interface CreatorWalletStatus {
  connected: boolean
  address?: string | null
  minimum_threshold_algo: string | number
  progress_percent: number
}

export interface CreatorAnalyticsResponse {
  total_views: number
  total_qualified_views: number
  total_watch_seconds: number
  total_watch_hours: number
  average_view_duration_seconds: number
  total_likes: number
  total_videos: number
  total_earned_algo: string | number
  pending_rewards_algo: string | number
  settled_algo: string | number
  top_videos: TopVideoMetric[]
  daily_trends: DailyMetricPoint[]
  revenue_breakdown: RevenueBreakdown
  wallet_status: CreatorWalletStatus
}

export interface CreatorVideoItem {
  id: number
  title: string
  description?: string | null
  ipfs_cid?: string | null
  thumbnail_cid?: string | null
  duration_seconds: number
  views_count: number
  qualified_views: number
  likes_count: number
  visibility: 'public' | 'unlisted' | 'private'
  status: 'ready' | 'draft' | 'processing' | 'failed'
  earned_algo: string | number
  playback_url?: string | null
  created_at: string
  updated_at: string
}

