import React from 'react'
import { Home, LayoutDashboard, PlusCircle, Coins, Sparkles } from 'lucide-react'
import type { ActivePage } from '../../types'

interface MobileNavProps {
  activePage: ActivePage
  setActivePage: (page: ActivePage) => void
}

export const MobileNav: React.FC<MobileNavProps> = ({ activePage, setActivePage }) => {
  const items = [
    { id: 'home' as ActivePage, label: 'Feed', icon: Home },
    { id: 'studio-dashboard' as ActivePage, label: 'Studio', icon: LayoutDashboard },
    { id: 'studio-upload' as ActivePage, label: 'Upload', icon: PlusCircle, isPrimary: true },
    { id: 'studio-wallet' as ActivePage, label: 'Wallet', icon: Coins },
    { id: 'landing' as ActivePage, label: 'About', icon: Sparkles }
  ]

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0A0D14]/95 backdrop-blur-lg border-t border-[#1E293B] px-3 py-1.5 flex items-center justify-around select-none">
      {items.map(item => {
        const Icon = item.icon
        const isActive = activePage === item.id

        if (item.isPrimary) {
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className="flex flex-col items-center justify-center -mt-4 group focus:outline-none"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 group-active:scale-95 transition-transform border border-indigo-400/30">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-medium text-indigo-300 mt-1">
                {item.label}
              </span>
            </button>
          )
        }

        return (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors focus:outline-none ${
              isActive
                ? 'text-indigo-400'
                : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-[#94A3B8]'}`} />
            <span className="text-[10px] font-medium mt-0.5">
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
