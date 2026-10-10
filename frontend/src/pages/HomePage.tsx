import React, { useState } from 'react'
import type { Video, Category } from '../types'
import { VideoCard } from '../components/video/VideoCard'
import { Play, Flame } from 'lucide-react'

interface HomePageProps {
  videos: Video[]
  categories: Category[]
  onSelectVideo: (video: Video) => void
  onSelectCreator: (creatorId: string) => void
}

export const HomePage: React.FC<HomePageProps> = ({
  videos,
  categories,
  onSelectVideo,
  onSelectCreator
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const filteredVideos =
    selectedCategory === 'all'
      ? videos
      : videos.filter(v => v.category === selectedCategory)

  const spotlightVideo = videos[0]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map(cat => {
          const isSelected = selectedCategory === cat.slug
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-[#131926] border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] hover:border-[#334155]'
              }`}
            >
              {cat.name}
            </button>
          )
        })}
      </div>

      {/* Hero Spotlight Video (Only on 'all' view) */}
      {selectedCategory === 'all' && spotlightVideo && (
        <div
          onClick={() => onSelectVideo(spotlightVideo)}
          className="relative rounded-3xl overflow-hidden border border-[#1E293B] bg-[#131926] cursor-pointer group shadow-2xl hover:border-[#334155] transition-all"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Visual Thumbnail */}
            <div className="lg:col-span-7 relative aspect-video overflow-hidden bg-[#0A0D14]">
              {spotlightVideo.thumbnail ? (
                <img
                  src={spotlightVideo.thumbnail}
                  alt={spotlightVideo.title}
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#1E293B] to-[#0A0D14] flex items-center justify-center">
                  <Play className="w-12 h-12 text-[#475569]" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-transparent to-[#131926]/90" />
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-indigo-600 text-white text-[11px] font-mono font-bold flex items-center gap-1 shadow">
                  <Flame className="w-3.5 h-3.5 fill-white" />
                  Featured Spotlight
                </span>
                <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/10 text-[11px] font-mono text-emerald-400">
                  IPFS Pinned
                </span>
              </div>
              <div className="absolute bottom-4 right-4 px-2 py-1 rounded bg-black/80 text-xs font-mono text-white">
                {spotlightVideo.duration}
              </div>
            </div>

            {/* Spotlight Info */}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <img
                    src={spotlightVideo.creator.avatar}
                    alt={spotlightVideo.creator.name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <span className="text-xs font-medium text-[#94A3B8]">
                    {spotlightVideo.creator.name}
                  </span>
                  <span className="text-xs text-[#475569] font-mono">• {spotlightVideo.createdAt}</span>
                </div>

                <h2 className="font-display font-bold text-xl sm:text-2xl text-[#F8FAFC] leading-snug group-hover:text-indigo-300 transition-colors mb-3">
                  {spotlightVideo.title}
                </h2>

                <p className="text-xs sm:text-sm text-[#94A3B8] line-clamp-3 leading-relaxed mb-4">
                  {spotlightVideo.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {spotlightVideo.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-[#0A0D14] border border-[#1E293B] text-[10px] font-mono text-[#94A3B8]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#1E293B]">
                <div className="text-xs font-mono text-[#94A3B8]">
                  <span>{spotlightVideo.views.toLocaleString()} views</span>
                  <span className="mx-2">•</span>
                  <span className="text-emerald-400 font-semibold">{spotlightVideo.earnedAlgo.toFixed(2)} ALGO settled</span>
                </div>

                <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 group-hover:bg-indigo-500 transition-colors">
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Watch Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Video Grid */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg sm:text-xl text-[#F8FAFC] tracking-tight">
            {selectedCategory === 'all'
              ? 'Trending & Recent Media'
              : categories.find(c => c.slug === selectedCategory)?.name || 'Videos'}
          </h2>
          <span className="text-xs font-mono text-[#94A3B8]">
            Showing {filteredVideos.length} decentralized videos
          </span>
        </div>

        {filteredVideos.length === 0 ? (
          <div className="py-20 px-6 text-center rounded-3xl bg-[#0D121F] border border-[#1E293B] max-w-lg mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <Play className="w-6 h-6 fill-indigo-400" />
            </div>
            <h3 className="font-display font-bold text-base text-white">No Public Videos Yet</h3>
            <p className="text-xs text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
              OpenStream is a fresh, real decentralized video platform. Log in and upload your first video to start streaming to the world!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredVideos.map(video => (
              <VideoCard
                key={video.id}
                video={video}
                onSelectVideo={onSelectVideo}
                onSelectCreator={onSelectCreator}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
