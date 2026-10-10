import React from 'react'
import {
  Home,
  LayoutDashboard,
  Upload,
  Film,
  Coins,
  Database,
  Sparkles,
  X
} from 'lucide-react'
import type { ActivePage } from '../../types'

interface SidebarProps {
  activePage: ActivePage
  setActivePage: (page: ActivePage) => void
  isOpen: boolean
  isMobileDrawerOpen?: boolean
  onCloseMobile?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  isOpen,
  isMobileDrawerOpen = false,
  onCloseMobile
}) => {
  const mainNavItems = [
    { id: 'landing' as ActivePage, label: 'Landing Overview', icon: Sparkles },
    { id: 'home' as ActivePage, label: 'Explore Feed', icon: Home },
    { id: 'transparency' as ActivePage, label: 'Protocol Architecture', icon: Database }
  ]

  const studioNavItems = [
    { id: 'studio-dashboard' as ActivePage, label: 'Creator Studio', icon: LayoutDashboard },
    { id: 'studio-upload' as ActivePage, label: 'Upload Video', icon: Upload },
    { id: 'studio-videos' as ActivePage, label: 'Content Manager', icon: Film },
    { id: 'studio-wallet' as ActivePage, label: 'Rewards & Wallet', icon: Coins }
  ]

  const handleNavClick = (id: ActivePage) => {
    setActivePage(id)
    if (onCloseMobile) onCloseMobile()
  }

  return (
    <>
      {/* =========================================
          MOBILE DRAWER OVERLAY (screens < md)
         ========================================= */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] h-full bg-[#0A0D14] border-r border-[#1E293B] p-5 flex flex-col justify-between overflow-y-auto z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="space-y-6">
              {/* Header with Title and Close Button */}
              <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                    OS
                  </div>
                  <span className="font-display font-bold text-base text-white">
                    OpenStream
                  </span>
                </div>
                <button
                  onClick={onCloseMobile}
                  className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#131926] transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Discovery Section */}
              <div>
                <p className="px-3 text-[11px] font-semibold text-[#475569] uppercase tracking-wider mb-2 font-mono">
                  Platform Discovery
                </p>
                <div className="space-y-1">
                  {mainNavItems.map(item => {
                    const Icon = item.icon
                    const isActive = activePage === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                            : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#131926]'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-[#94A3B8]'}`} />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Creator Studio Section */}
              <div>
                <p className="px-3 text-[11px] font-semibold text-[#475569] uppercase tracking-wider mb-2 font-mono">
                  Creator Studio
                </p>
                <div className="space-y-1">
                  {studioNavItems.map(item => {
                    const Icon = item.icon
                    const isActive = activePage === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                            : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#131926]'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-[#94A3B8]'}`} />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Network Status in Mobile Drawer */}
            <div className="pt-4 border-t border-[#1E293B]">
              <div className="p-3 rounded-xl bg-[#131926] border border-[#1E293B] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-medium text-[#94A3B8] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Algorand Testnet
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-semibold">
                    Live
                  </span>
                </div>
                <div className="text-[11px] font-mono text-[#475569] flex justify-between">
                  <span>IPFS Storage</span>
                  <span className="text-emerald-400">Pinata Synced</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          DESKTOP SIDEBAR (screens >= md)
         ========================================= */}
      {/* Compact Rail View (when !isOpen on desktop) */}
      {!isOpen && (
        <aside className="hidden md:flex w-16 border-r border-[#1E293B] bg-[#0A0D14] flex-col items-center py-4 gap-6 shrink-0 transition-all z-30 select-none">
          <div className="flex flex-col gap-2">
            {mainNavItems.map(item => {
              const Icon = item.icon
              const isActive = activePage === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  title={item.label}
                  className={`p-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#131926]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              )
            })}
          </div>

          <div className="w-8 h-px bg-[#1E293B]" />

          <div className="flex flex-col gap-2">
            {studioNavItems.map(item => {
              const Icon = item.icon
              const isActive = activePage === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  title={item.label}
                  className={`p-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#131926]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </button>
              )
            })}
          </div>
        </aside>
      )}

      {/* Expanded View (when isOpen on desktop) */}
      {isOpen && (
        <aside className="hidden md:flex w-64 border-r border-[#1E293B] bg-[#0A0D14] flex-col justify-between p-4 shrink-0 overflow-y-auto transition-all z-30 select-none">
          <div className="space-y-6">
            {/* Main Section */}
            <div>
              <p className="px-3 text-[11px] font-semibold text-[#475569] uppercase tracking-wider mb-2 font-mono">
                Platform Discovery
              </p>
              <div className="space-y-1">
                {mainNavItems.map(item => {
                  const Icon = item.icon
                  const isActive = activePage === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActivePage(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                          : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#131926]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-[#94A3B8]'}`} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Creator Studio Section */}
            <div>
              <p className="px-3 text-[11px] font-semibold text-[#475569] uppercase tracking-wider mb-2 font-mono">
                Creator Studio
              </p>
              <div className="space-y-1">
                {studioNavItems.map(item => {
                  const Icon = item.icon
                  const isActive = activePage === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActivePage(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 font-semibold'
                          : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#131926]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-[#94A3B8]'}`} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Network Telemetry Card */}
          <div className="pt-4 border-t border-[#1E293B]">
            <div className="p-3 rounded-xl bg-[#131926] border border-[#1E293B] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-medium text-[#94A3B8] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Algorand Testnet
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-semibold">
                  Live
                </span>
              </div>

              <div className="space-y-1 font-mono text-[11px] text-[#475569]">
                <div className="flex justify-between">
                  <span>Block Height</span>
                  <span className="text-[#94A3B8]">#38,419,204</span>
                </div>
                <div className="flex justify-between">
                  <span>IPFS Gateway</span>
                  <span className="text-emerald-400">Pinata (Synced)</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}
    </>
  )
}
