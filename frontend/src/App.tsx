import React, { useState, useCallback, useEffect } from 'react'
import type { Video, Creator, ActivePage, WalletState } from './types'
import { mockCategories } from './data/mockData'
import { videoService } from './services/videoService'
import { peraWalletService } from './services/peraWalletService'
import { authService } from './services/authService'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { MobileNav } from './components/layout/MobileNav'
import { WalletModal } from './components/wallet/WalletModal'
import { AuthModal } from './components/auth/AuthModal'
import { SearchModal } from './components/common/SearchModal'
import { ToastContainer, type ToastMessage } from './components/common/Toast'
import { LandingPage } from './pages/LandingPage'
import { HomePage } from './pages/HomePage'
import { WatchPage } from './pages/WatchPage'
import { StudioDashboard } from './pages/StudioDashboard'
import { UploadPage } from './pages/UploadPage'
import { StudioVideosPage } from './pages/StudioVideosPage'
import { StudioWalletPage } from './pages/StudioWalletPage'
import { CreatorProfilePage } from './pages/CreatorProfilePage'
import { TransparencyPage } from './pages/TransparencyPage'

const AppContent: React.FC = () => {
  const { user } = useAuth()
  const [activePage, setActivePage] = useState<ActivePage>('landing')
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login')
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const handleOpenAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode)
    setIsAuthModalOpen(true)
  }

  // Toast dispatch helper
  const addToast = useCallback((title: string, message?: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6)
    setToasts(prev => [...prev, { id, title, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3800)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Page navigation helper with automatic mobile drawer close & scroll top
  const handleNavigate = (page: ActivePage) => {
    setActivePage(page)
    setIsMobileDrawerOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileDrawerOpen(prev => !prev)
    } else {
      setIsSidebarOpen(prev => !prev)
    }
  }

  // Wallet State — Real Algorand TestNet connection
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    balanceAlgo: 0,
    network: 'Testnet',
    isConnecting: false,
    sessionToken: null,
  })

  // Reconnect active Pera Wallet session and attach disconnect listener
  useEffect(() => {
    let isMounted = true

    const initWalletSession = async () => {
      try {
        const activeAddress = await peraWalletService.reconnectWallet()
        if (activeAddress && isMounted) {
          const balance = await peraWalletService.fetchAccountBalance(activeAddress)
          setWallet({
            isConnected: true,
            address: activeAddress,
            balanceAlgo: balance,
            network: 'Testnet',
            isConnecting: false,
            sessionToken: null,
          })

          // Sync wallet with logged-in user profile if needed
          if (user && !user.walletAddress) {
            authService.associateWallet(activeAddress).catch(() => {})
          }
        }
      } catch (err) {
        console.warn('Pera session restore error:', err)
      }
    }

    initWalletSession()

    const unsubscribe = peraWalletService.onDisconnect(() => {
      if (isMounted) {
        setWallet({
          isConnected: false,
          address: null,
          balanceAlgo: 0,
          network: 'Testnet',
          isConnecting: false,
          sessionToken: null,
        })
        addToast('Pera Wallet Disconnected', 'Session disconnected from wallet app.', 'info')
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [user, addToast])

  // Handlers
  const handleSelectVideo = (video: Video) => {
    setSelectedVideo(video)
    handleNavigate('watch')
  }

  const handleSelectCreator = (creatorId: string) => {
    setSelectedCreatorId(creatorId)
    handleNavigate('creator-profile')
  }

  const handleConnectWallet = async (address: string) => {
    setWallet((prev) => ({ ...prev, isConnecting: true }))
    try {
      const balance = await peraWalletService.fetchAccountBalance(address)
      setWallet({
        isConnected: true,
        address,
        balanceAlgo: balance,
        network: 'Testnet',
        isConnecting: false,
        sessionToken: null,
      })

      // Sync wallet with authenticated user profile
      if (user) {
        try {
          await authService.associateWallet(address)
        } catch (err: any) {
          console.warn('Could not bind wallet to user profile:', err)
        }
      }

      addToast(
        'Pera Wallet Connected',
        `Account: ${address.slice(0, 6)}...${address.slice(-4)} • Balance: ${balance.toFixed(3)} ALGO`,
        'success'
      )
    } catch (err: any) {
      setWallet((prev) => ({ ...prev, isConnecting: false }))
      addToast('Wallet Sync Error', err.message || 'Could not fetch TestNet balance.', 'error')
    }
  }

  const handleDisconnectWallet = async () => {
    await peraWalletService.disconnectWallet()
    if (user?.walletAddress) {
      try {
        await authService.disconnectWallet()
      } catch (err) {
        console.warn('Could not remove wallet from user profile:', err)
      }
    }
    setWallet({
      isConnected: false,
      address: null,
      balanceAlgo: 0,
      network: 'Testnet',
      isConnecting: false,
      sessionToken: null,
    })
    addToast('Wallet Disconnected', 'Viewing in guest mode.', 'info')
  }

  // Load videos from backend PostgreSQL and localStorage on mount and refresh
  const loadVideos = useCallback(async () => {
    try {
      const res = await videoService.listVideos({ page: 1, page_size: 50 })
      let backendVideos: Video[] = []
      if (res && res.items) {
        backendVideos = res.items
          .filter((item) => item.status === 'ready' || Boolean(item.ipfs_cid))
          .map((item) => {
            // High-speed Pinata Dedicated Gateway & Range-proxy stream
            const directStream = `/api/v1/videos/${item.id}/stream`
            let gatewayUrl =
              item.playback_url ||
              (item.ipfs_cid ? `https://black-occasional-lynx-687.mypinata.cloud/ipfs/${item.ipfs_cid}` : '')
            if (gatewayUrl && !gatewayUrl.startsWith('http://') && !gatewayUrl.startsWith('https://')) {
              gatewayUrl = `https://${gatewayUrl}`
            }
            if (gatewayUrl.includes('mypinata.cloud') && !gatewayUrl.includes('/ipfs/')) {
              gatewayUrl = gatewayUrl.replace(/mypinata\.cloud\/?/, 'mypinata.cloud/ipfs/')
            }

            return {
              id: `v-${item.id}`,
              backendId: item.id,
              title: item.title,
              description: item.description || '',
              thumbnail: item.thumbnail_cid || '',
              duration: item.duration_seconds
                ? `${Math.floor(item.duration_seconds / 60)}:${(item.duration_seconds % 60)
                    .toString()
                    .padStart(2, '0')}`
                : '0:00',
              views: item.views_count || 0,
              likes: item.likes_count || 0,
              createdAt: new Date(item.created_at).toLocaleDateString(),
              category: 'web3',
              tags: ['IPFS', 'Web3', 'Blockchain'],
              streamUrl: gatewayUrl || directStream,
              playbackUrl: gatewayUrl,
              resolution: '1080p 60fps',
              fileSize: '33.4 MB',
              ipfsCid: item.ipfs_cid || '',
              isPinnedToIpfs: Boolean(item.ipfs_cid),
              status: 'published',
              earnedAlgo: 0,
              creator: item.creator
                ? {
                    id: `creator-${item.creator.id}`,
                    name: item.creator.display_name || item.creator.username,
                    handle: item.creator.username,
                    avatar:
                      item.creator.avatar_url ||
                      `https://api.dicebear.com/7.x/identicon/svg?seed=${item.creator.username}`,
                    banner:
                      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
                    bio: 'Verified Web3 Creator',
                    subscribersCount: 0,
                    walletAddress: item.creator.wallet_address || '',
                    verified: Boolean(item.creator.wallet_address),
                    totalViews: item.views_count || 0,
                    totalEarnedAlgo: 0,
                  }
                : {
                    id: `creator-${item.creator_id}`,
                    name: 'Community Creator',
                    handle: 'creator',
                    avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=creator',
                    banner: '',
                    bio: '',
                    subscribersCount: 0,
                    walletAddress: '',
                    verified: false,
                    totalViews: item.views_count || 0,
                    totalEarnedAlgo: 0,
                  },
            }
          })
      }

      // Purge any stale mock/demo local data to start 100% fresh
      try {
        localStorage.removeItem('openstream_published_videos')
      } catch (e) {
        console.warn('LocalStorage clear:', e)
      }

      setVideos(backendVideos)
      if (backendVideos.length > 0) {
        setSelectedVideo((prev) => {
          if (!prev) return backendVideos[0]
          const matching = backendVideos.find(
            (v) => v.id === prev.id || (prev.backendId && v.backendId === prev.backendId)
          )
          return matching || prev
        })
      } else {
        setSelectedVideo(null)
      }
    } catch (err) {
      console.warn('Error loading backend videos:', err)
      setVideos([])
      setSelectedVideo(null)
    }
  }, [])

  useEffect(() => {
    loadVideos()
  }, [loadVideos])

  const handleVideoPublished = (newVideo: Video) => {
    setVideos((prev) => [newVideo, ...prev.filter((v) => v.id !== newVideo.id)])
    setSelectedVideo(newVideo)
    addToast(
      'Video Published Successfully!',
      `CID: ${newVideo.ipfsCid ? newVideo.ipfsCid.slice(0, 10) + '...' : 'Pinned'} to IPFS nodes. Publicly discoverable.`,
      'success'
    )
    loadVideos()
  }

  const handleDeleteVideo = async (videoId: string) => {
    try {
      const id = videoId.startsWith('v-') ? videoId.replace('v-', '') : videoId
      await videoService.deleteVideo(id)
      setVideos((prev) => prev.filter((v) => v.id !== videoId))
      addToast('Video Asset Removed', 'Metadata and listing unpinned from index.', 'info')
      loadVideos()
    } catch (err: any) {
      console.warn('Could not delete video on backend:', err)
      setVideos((prev) => prev.filter((v) => v.id !== videoId))
      addToast('Video Removed', 'Removed from local view.', 'info')
    }
  }

  const activeSelectedCreator = selectedCreatorId
    ? videos.find((v) => v.creator.id === selectedCreatorId)?.creator
    : null

  const currentCreator: Creator = user
    ? {
        id: `creator-${user.id}`,
        name: user.displayName || user.username,
        handle: user.username,
        avatar:
          user.avatarUrl ||
          `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`,
        banner:
          user.bannerUrl ||
          'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
        bio: user.bio || 'Verified Web3 Creator on OpenStream',
        subscribersCount: 0,
        walletAddress: user.walletAddress || wallet.address || '',
        verified: Boolean(user.walletAddress || wallet.address),
        totalViews: videos
          .filter((v) => v.creator.handle === user.username)
          .reduce((acc, v) => acc + (v.views || 0), 0),
        totalEarnedAlgo: videos
          .filter((v) => v.creator.handle === user.username)
          .reduce((acc, v) => acc + (v.earnedAlgo || 0), 0),
      }
    : (activeSelectedCreator || {
        id: 'creator-guest',
        name: 'Guest Viewer',
        handle: 'guest',
        avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=guest',
        banner: '',
        bio: 'Explore decentralized streams on OpenStream',
        subscribersCount: 0,
        walletAddress: wallet.address || '',
        verified: wallet.isConnected,
        totalViews: 0,
        totalEarnedAlgo: 0,
      })

  return (
    <div className="min-h-screen bg-[#0A0D14] text-[#F8FAFC] flex flex-col font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Application Header */}
      <Header
        activePage={activePage}
        setActivePage={handleNavigate}
        wallet={wallet}
        onOpenWalletModal={() => setIsWalletModalOpen(true)}
        onOpenAuthModal={handleOpenAuthModal}
        onDisconnectWallet={handleDisconnectWallet}
        onToggleSidebar={handleToggleSidebar}
        isSidebarOpen={isSidebarOpen}
        onSearchClick={() => setIsSearchModalOpen(true)}
      />

      {/* Main Body Shell: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar (Drawer on mobile, Collapsible Dock on desktop) */}
        <Sidebar
          activePage={activePage}
          setActivePage={handleNavigate}
          isOpen={isSidebarOpen}
          isMobileDrawerOpen={isMobileDrawerOpen}
          onCloseMobile={() => setIsMobileDrawerOpen(false)}
        />

        {/* Dynamic Page Container */}
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-4rem)] pb-20 md:pb-6">
          {activePage === 'landing' && (
            <LandingPage
              onExplore={() => handleNavigate('home')}
              onStartCreating={() => handleNavigate('studio-dashboard')}
              featuredVideos={videos}
              onSelectVideo={handleSelectVideo}
              onSelectCreator={handleSelectCreator}
            />
          )}

          {activePage === 'home' && (
            <HomePage
              videos={videos}
              categories={mockCategories}
              onSelectVideo={handleSelectVideo}
              onSelectCreator={handleSelectCreator}
            />
          )}

          {activePage === 'watch' && (
            <WatchPage
              video={selectedVideo}
              relatedVideos={videos}
              onSelectVideo={handleSelectVideo}
              onSelectCreator={handleSelectCreator}
              walletConnected={wallet.isConnected}
              onOpenConnectWallet={() => setIsWalletModalOpen(true)}
              onToast={addToast}
            />
          )}

          {activePage === 'studio-dashboard' && (
            <StudioDashboard
              creator={currentCreator}
              videos={videos}
              onNavigate={handleNavigate}
              onSelectVideo={handleSelectVideo}
              onToast={addToast}
            />
          )}

          {activePage === 'studio-upload' && (
            <UploadPage
              creator={currentCreator}
              onVideoPublished={handleVideoPublished}
              onNavigate={handleNavigate}
              onToast={addToast}
            />
          )}

          {activePage === 'studio-videos' && (
            <StudioVideosPage
              creator={currentCreator}
              videos={videos}
              onSelectVideo={handleSelectVideo}
              onNavigate={handleNavigate}
              onDeleteVideo={handleDeleteVideo}
              onToast={addToast}
            />
          )}

          {activePage === 'studio-wallet' && (
            <StudioWalletPage
              creator={currentCreator}
              wallet={wallet}
              onOpenConnectWallet={() => setIsWalletModalOpen(true)}
              onDisconnectWallet={handleDisconnectWallet}
              onToast={addToast}
            />
          )}

          {activePage === 'creator-profile' && (
            <CreatorProfilePage
              creator={currentCreator}
              videos={videos}
              onSelectVideo={handleSelectVideo}
              onToast={addToast}
            />
          )}

          {activePage === 'transparency' && <TransparencyPage />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        activePage={activePage}
        setActivePage={handleNavigate}
      />

      {/* Global Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onDismiss={removeToast}
      />

      {/* Pera Wallet Connection Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onConnect={handleConnectWallet}
        currentAddress={wallet.address}
      />


      {/* Backend Authentication Modal (Sign In / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccessToast={(title, msg) => addToast(title, msg, 'success')}
        initialMode={authModalMode}
      />

      {/* Global Spotlight Search Modal (Cmd + K) */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        videos={videos}
        creators={Array.from(new Map(videos.map((v) => [v.creator.id, v.creator])).values())}
        onSelectVideo={handleSelectVideo}
        onSelectCreator={handleSelectCreator}
      />
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
