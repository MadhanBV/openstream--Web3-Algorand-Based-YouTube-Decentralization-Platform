import React, { useState, useEffect } from 'react'
import { Search, X, ArrowRight } from 'lucide-react'
import type { Video, Creator } from '../../types'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  videos: Video[]
  creators: Creator[]
  onSelectVideo: (video: Video) => void
  onSelectCreator: (creatorId: string) => void
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  videos,
  creators,
  onSelectVideo,
  onSelectCreator
}) => {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const quickTags = ['DeFi', 'Gaming', 'AI', 'Tutorials', 'Music', 'IPFS']

  const filteredVideos = query.trim()
    ? videos.filter(
        v =>
          v.title.toLowerCase().includes(query.toLowerCase()) ||
          v.tags.some(t => t.toLowerCase().includes(query.toLowerCase())) ||
          v.ipfsCid.toLowerCase().includes(query.toLowerCase())
      )
    : videos.slice(0, 4)

  const filteredCreators = query.trim()
    ? creators.filter(
        c =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.handle.toLowerCase().includes(query.toLowerCase())
      )
    : creators.slice(0, 2)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-[#131926] border border-[#1E293B] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Search Bar Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#1E293B] gap-3 bg-[#0A0D14]">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            type="text"
            placeholder="Search videos, creators, tags, or IPFS CIDs..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-[#F8FAFC] placeholder-[#475569] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-[#94A3B8] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 rounded bg-[#1B2234] border border-[#1E293B] text-[11px] font-mono text-[#94A3B8] hover:text-white"
          >
            ESC
          </button>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5">
          {/* Quick filter suggestions when no query */}
          {!query && (
            <div className="space-y-2">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#475569] px-1">
                Trending Topics
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="px-2.5 py-1 rounded-lg bg-[#0A0D14] hover:bg-[#1B2234] border border-[#1E293B] hover:border-indigo-500/40 text-xs font-mono text-[#94A3B8] hover:text-white transition-all"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Creators matching */}
          {filteredCreators.length > 0 && (
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#475569] px-2 mb-2">
                Creators
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredCreators.map(creator => (
                  <div
                    key={creator.id}
                    onClick={() => {
                      onSelectCreator(creator.id)
                      onClose()
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-[#0A0D14] border border-[#1E293B] hover:border-indigo-500/50 cursor-pointer transition-all group"
                  >
                    <img
                      src={creator.avatar}
                      alt={creator.name}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#F8FAFC] truncate group-hover:text-indigo-400">
                        {creator.name}
                      </div>
                      <div className="text-[11px] font-mono text-[#94A3B8]">
                        @{creator.handle}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos matching */}
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#475569] px-2 mb-2">
              Videos {query && `(${filteredVideos.length})`}
            </p>
            {filteredVideos.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#94A3B8]">
                No videos found matching "{query}"
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredVideos.map(video => (
                  <div
                    key={video.id}
                    onClick={() => {
                      onSelectVideo(video)
                      onClose()
                    }}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#1B2234] border border-transparent hover:border-[#1E293B] cursor-pointer transition-all group"
                  >
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-16 h-10 rounded-lg object-cover bg-black shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#F8FAFC] truncate group-hover:text-indigo-400">
                        {video.title}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#94A3B8] font-mono">
                        <span>{video.creator.name}</span>
                        <span>•</span>
                        <span>{video.duration}</span>
                        <span>•</span>
                        <span className="text-emerald-400">IPFS</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#475569] group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
