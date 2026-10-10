import React from 'react'
import { Play, CheckCircle2, Eye } from 'lucide-react'
import type { Video } from '../../types'
import { IPFSBadge } from './IPFSBadge'

interface VideoCardProps {
  video: Video
  onSelectVideo: (video: Video) => void
  onSelectCreator?: (creatorId: string) => void
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onSelectVideo,
  onSelectCreator
}) => {
  return (
    <div
      onClick={() => onSelectVideo(video)}
      className="group flex flex-col rounded-2xl bg-[#131926] border border-[#1E293B] hover:border-[#334155] overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 shadow-md hover:shadow-xl hover:shadow-black/40"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#0A0D14]">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1E293B] to-[#0A0D14] flex items-center justify-center">
            <Play className="w-8 h-8 text-[#475569]" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm border border-white/10 text-[11px] font-mono font-medium text-white shadow">
          {video.duration}
        </div>

        {/* IPFS Pill */}
        <div className="absolute top-2.5 left-2.5">
          <IPFSBadge cid={video.ipfsCid} showCopy={false} />
        </div>

        {/* Resolution Badge */}
        <div className="absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-[#94A3B8] border border-white/10">
          {video.resolution}
        </div>
      </div>

      {/* Video Info Container */}
      <div className="p-4 flex gap-3 flex-1">
        {/* Creator Avatar */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            if (onSelectCreator) onSelectCreator(video.creator.id)
          }}
          className="shrink-0"
        >
          <img
            src={video.creator.avatar}
            alt={video.creator.name}
            className="w-9 h-9 rounded-full object-cover ring-1 ring-[#1E293B] hover:ring-indigo-500 transition-all"
          />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h3 className="font-sans font-semibold text-sm text-[#F8FAFC] line-clamp-2 leading-snug group-hover:text-indigo-300 transition-colors">
              {video.title}
            </h3>

            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#94A3B8]">
              <span className="hover:text-[#F8FAFC] transition-colors truncate">
                {video.creator.name}
              </span>
              {video.creator.verified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#475569] mt-3 pt-2.5 border-t border-[#1E293B]/60 font-mono">
            <span className="flex items-center gap-1 text-[#94A3B8]">
              <Eye className="w-3 h-3 text-[#475569]" />
              {video.views.toLocaleString()} views
            </span>
            <span>{video.createdAt}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
