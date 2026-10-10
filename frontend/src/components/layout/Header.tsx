import React, { useState, useEffect, useRef } from 'react'
import {
  Play,
  Search,
  Upload,
  Wallet,
  ChevronDown,
  Layers,
  Sparkles,
  ExternalLink,
  Menu,
  X,
  LogOut,
  LogIn,
} from 'lucide-react'
import type { ActivePage, WalletState } from '../../types'
import { useAuth } from '../../context/AuthContext'

interface HeaderProps {
  activePage: ActivePage
  setActivePage: (page: ActivePage) => void
  wallet: WalletState
  onOpenWalletModal: () => void
  onOpenAuthModal: (mode?: 'login' | 'register') => void
  onDisconnectWallet: () => void
  onToggleSidebar: () => void
  isSidebarOpen: boolean
  onSearchClick: () => void
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  setActivePage,
  wallet,
  onOpenWalletModal,
  onOpenAuthModal,
  onDisconnectWallet,
  onToggleSidebar,
  isSidebarOpen,
  onSearchClick,
}) => {
  const { user, isAuthenticated, logout, backendOnline } = useAuth()
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isProfileMenuOpen])

  const formatAddress = (addr: string | null) => {
    if (!addr) return ''
    return `${addr.slice(0, 5)}...${addr.slice(-4)}`
  }

  return (
    <header className="sticky top-0 z-40 h-16 w-full border-b border-[#1E293B] bg-[#0A0D14]/95 backdrop-blur-md px-3 sm:px-5 lg:px-6 flex items-center justify-between transition-colors select-none">
      {/* Left: Hamburger + Brand Logo */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#131926] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          title="Toggle Navigation"
          aria-label="Toggle Navigation Sidebar"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div
          onClick={() => setActivePage('home')}
          className="flex items-center gap-2.5 cursor-pointer group"
          title="OpenStream Home"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-base sm:text-lg tracking-tight text-[#F8FAFC] flex items-center gap-1.5">
              OpenStream
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border font-medium flex items-center gap-1 ${
                  backendOnline
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                }`}
                title={backendOnline ? 'Backend API Live & Connected' : 'Connecting to API...'}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'}`} />
                API v1
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Global Search Input (Desktop) */}
      <div className="hidden md:flex flex-1 max-w-lg mx-6">
        <button
          onClick={onSearchClick}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#131926] border border-[#1E293B] hover:border-[#334155] text-left text-sm text-[#94A3B8] transition-all group shadow-inner focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-[#94A3B8] group-hover:text-indigo-400 transition-colors" />
            <span className="text-sm truncate">Search videos, creators, IPFS CIDs...</span>
          </div>
          <kbd className="hidden lg:inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[#1B2234] border border-[#1E293B] text-[#94A3B8]">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right: Actions, Upload, Auth, Wallet HUD */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Search Icon */}
        <button
          onClick={onSearchClick}
          className="md:hidden p-2 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#131926] transition-colors"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Upload Button */}
        <button
          onClick={() => setActivePage('studio-upload')}
          className={`hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
            activePage === 'studio-upload'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
              : 'bg-[#131926] border border-[#1E293B] hover:border-indigo-500/50 hover:bg-[#1B2234] text-[#F8FAFC]'
          }`}
        >
          <Upload className="w-4 h-4 text-indigo-400" />
          <span>Upload</span>
        </button>

        {/* User Account / Auth Section */}
        {isAuthenticated && user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#131926] border border-[#1E293B] hover:border-indigo-500/40 text-xs sm:text-sm text-[#F8FAFC] transition-all focus:outline-none"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold uppercase">
                {user.username.slice(0, 2)}
              </div>
              <span className="font-medium text-xs hidden sm:inline truncate max-w-[100px]">
                {user.displayName || user.username}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#131926] border border-[#1E293B] p-3.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* User Info Header */}
                <div className="pb-3 border-b border-[#1E293B]">
                  <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-1">
                    <span>Signed In Account</span>
                    {user.isCreator && (
                      <span className="flex items-center gap-1 text-indigo-400 font-medium text-[11px] bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        <Sparkles className="w-3 h-3" /> Creator
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-[#F8FAFC] truncate">
                    {user.displayName || user.username}
                  </div>
                  <div className="text-xs text-[#94A3B8] font-mono truncate">
                    @{user.username} {user.email && `• ${user.email}`}
                  </div>
                </div>

                {/* Wallet Info inside Profile if connected */}
                {wallet.isConnected && (
                  <div className="py-2.5 border-b border-[#1E293B] flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-[#94A3B8]">Connected Wallet</div>
                      <div className="font-mono text-xs text-indigo-300 font-semibold truncate max-w-[140px]">
                        {formatAddress(wallet.address)}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onDisconnectWallet()
                        setIsProfileMenuOpen(false)
                      }}
                      className="text-[11px] font-mono text-rose-400 hover:text-rose-300"
                    >
                      Disconnect
                    </button>
                  </div>
                )}

                {/* Navigation Links */}
                <div className="pt-2 space-y-1">
                  <button
                    onClick={() => {
                      setActivePage('studio-dashboard')
                      setIsProfileMenuOpen(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[#F8FAFC] hover:bg-[#1B2234] transition-colors"
                  >
                    <span className="flex items-center gap-2.5 font-medium">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      Creator Studio
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setActivePage('studio-wallet')
                      setIsProfileMenuOpen(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[#F8FAFC] hover:bg-[#1B2234] transition-colors"
                  >
                    <span className="flex items-center gap-2.5 font-medium">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      Rewards & Settlements
                    </span>
                    <ExternalLink className="w-3 h-3 text-[#94A3B8]" />
                  </button>

                  <button
                    onClick={async () => {
                      await logout()
                      setIsProfileMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2.5 text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors font-medium"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => onOpenAuthModal('login')}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-[#131926] border border-[#1E293B] hover:border-emerald-500/50 hover:bg-[#1B2234] text-[#F8FAFC] text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4 text-emerald-400" />
            <span>Sign In</span>
          </button>
        )}

        {/* Wallet Status HUD */}
        {wallet.isConnected ? (
          <button
            onClick={onOpenWalletModal}
            className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-[#131926] border border-[#1E293B] hover:border-emerald-500/40 text-xs sm:text-sm font-mono text-[#F8FAFC] transition-all shadow-sm focus:outline-none cursor-pointer"
            title={`Connected Wallet: ${wallet.address}`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-medium text-[#F8FAFC]">
              {formatAddress(wallet.address)}
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-[#0A0D14] text-[11px] font-mono text-emerald-400 border border-emerald-500/20">
              {wallet.balanceAlgo.toFixed(2)} ALGO
            </span>
          </button>
        ) : (
          <button
            onClick={onOpenWalletModal}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all"
          >
            <Wallet className="w-4 h-4" />
            <span className="hidden xs:inline">Connect Wallet</span>
            <span className="xs:hidden">Connect</span>
          </button>
        )}
      </div>
    </header>
  )
}
