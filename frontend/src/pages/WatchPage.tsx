import React, { useState, useEffect } from 'react'
import {
  ThumbsUp,
  Share2,
  Coins,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  Copy,
  Check,
  Eye,
  Clock
} from 'lucide-react'
import type { Video, Comment } from '../types'
import { VideoPlayer } from '../components/video/VideoPlayer'
import { IPFSBadge } from '../components/video/IPFSBadge'
import { TippingModal } from '../components/video/TippingModal'
import { viewService, type ViewStatsResponse } from '../services/viewService'
import { SponsoredBanner } from '../components/ads/SponsoredBanner'

interface WatchPageProps {
  video: Video | null
  relatedVideos: Video[]
  onSelectVideo: (video: Video) => void
  onSelectCreator: (creatorId: string) => void
  walletConnected: boolean
  onOpenConnectWallet: () => void
  onToast?: (title: string, message?: string, type?: 'success' | 'info' | 'error') => void
}

export const WatchPage: React.FC<WatchPageProps> = ({
  video,
  relatedVideos,
  onSelectVideo,
  onSelectCreator,
  walletConnected,
  onOpenConnectWallet,
  onToast
}) => {
  if (!video) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center py-24 space-y-4">
        <h2 className="font-display font-bold text-xl text-white">No Video Selected</h2>
        <p className="text-xs text-[#94A3B8]">
          There are currently no videos to display. Please upload a new video to start streaming.
        </p>
      </div>
    )
  }

  const [likes, setLikes] = useState(video.likes)
  const [hasLiked, setHasLiked] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscribersCount, setSubscribersCount] = useState(video.creator.subscribersCount)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [isTippingModalOpen, setIsTippingModalOpen] = useState(false)
  const [isTheatre, setIsTheatre] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newCommentText, setNewCommentText] = useState('')
  const [copiedAddr, setCopiedAddr] = useState(false)
  const [viewStats, setViewStats] = useState<ViewStatsResponse | null>(null)

  const backendVideoId = video.backendId || (
    video.id.startsWith('v-')
      ? parseInt(video.id.replace('v-', ''), 10)
      : (!isNaN(Number(video.id)) ? Number(video.id) : undefined)
  )

  useEffect(() => {
    if (backendVideoId) {
      viewService.getVideoStats(backendVideoId)
        .then((stats) => setViewStats(stats))
        .catch(() => {})
    } else {
      setViewStats(null)
    }
  }, [backendVideoId])

  const handleViewQualified = () => {
    if (backendVideoId) {
      viewService.getVideoStats(backendVideoId)
        .then((stats) => setViewStats(stats))
        .catch(() => {})
    }
    if (onToast) {
      onToast('Watch Threshold Reached', '30s watch verified by anti-abuse engine. +0.05 ALGO creator reward earned.', 'success')
    }
  }

  const handleLike = () => {
    if (hasLiked) {
      setLikes(likes - 1)
      setHasLiked(false)
    } else {
      setLikes(likes + 1)
      setHasLiked(true)
      if (onToast) onToast('Liked Video', 'Your interaction was recorded.')
    }
  }

  const handleToggleSubscribe = () => {
    if (isSubscribed) {
      setIsSubscribed(false)
      setSubscribersCount(prev => prev - 1)
      if (onToast) onToast('Unsubscribed', `Unsubscribed from @${video.creator.handle}`, 'info')
    } else {
      setIsSubscribed(true)
      setSubscribersCount(prev => prev + 1)
      if (onToast) onToast('Subscribed!', `You are now following ${video.creator.name}`, 'success')
    }
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    if (onToast) {
      onToast('Share Link Copied', 'Video stream URL copied to clipboard.', 'success')
    }
  }

  const handleCopyAddr = () => {
    navigator.clipboard.writeText(video.creator.walletAddress)
    setCopiedAddr(true)
    if (onToast) onToast('Algorand Address Copied', video.creator.walletAddress, 'info')
    setTimeout(() => setCopiedAddr(false), 2000)
  }

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCommentText.trim()) return

    const newComment: Comment = {
      id: 'cm-' + Date.now(),
      author: walletConnected ? 'You (Verified Wallet)' : 'Guest Viewer',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      text: newCommentText.trim(),
      timestamp: 'Just now',
      likes: 0
    }

    setComments([newComment, ...comments])
    setNewCommentText('')
    if (onToast) onToast('Comment Posted', 'Your message is now visible.', 'success')
  }

  return (
    <div className="p-3 sm:p-6 max-w-[1600px] mx-auto">
      {/* Theatre Mode vs Normal Grid */}
      <div className={`grid gap-6 ${isTheatre ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
        {/* Left Column: Player + Details */}
        <div className={isTheatre ? 'w-full' : 'lg:col-span-8'}>
          {/* Custom Video Player */}
          <VideoPlayer
            streamUrl={video.streamUrl}
            poster={video.thumbnail}
            ipfsCid={video.ipfsCid}
            title={video.title}
            isTheatre={isTheatre}
            onToggleTheatre={() => setIsTheatre(!isTheatre)}
            videoId={backendVideoId}
            onViewQualified={handleViewQualified}
          />

          {/* Video Title */}
          <h1 className="font-display font-bold text-lg sm:text-2xl text-[#F8FAFC] mt-4 leading-snug">
            {video.title}
          </h1>

          {/* Creator & Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 py-4 border-b border-[#1E293B]">
            {/* Creator Identity */}
            <div className="flex items-center gap-3">
              <img
                src={video.creator.avatar}
                alt={video.creator.name}
                onClick={() => onSelectCreator(video.creator.id)}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-[#1E293B] cursor-pointer hover:ring-indigo-500 transition-all"
              />
              <div>
                <div
                  onClick={() => onSelectCreator(video.creator.id)}
                  className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-[#F8FAFC] hover:text-indigo-400 cursor-pointer transition-colors"
                >
                  <span>{video.creator.name}</span>
                  {video.creator.verified && (
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
                  )}
                </div>
                <div className="text-[11px] sm:text-xs text-[#94A3B8] font-mono">
                  {subscribersCount.toLocaleString()} subscribers
                </div>
              </div>

              {/* Follow / Subscribe Button */}
              <button
                onClick={handleToggleSubscribe}
                className={`ml-1 sm:ml-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                  isSubscribed
                    ? 'bg-[#1B2234] border border-[#1E293B] text-[#94A3B8] hover:text-white hover:border-rose-500/30'
                    : 'bg-white text-black hover:bg-neutral-200 active:scale-95'
                }`}
              >
                {isSubscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>

            {/* Actions: Tip, Like, Share */}
            <div className="flex items-center gap-2">
              {/* Algorand Micro-Tip Button */}
              <button
                onClick={() => setIsTippingModalOpen(true)}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all shadow-sm active:scale-95"
              >
                <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span>Tip <span className="hidden sm:inline">Creator</span> (ALGO)</span>
              </button>

              {/* Like Button */}
              <button
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  hasLiked
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-[#131926] border-[#1E293B] hover:bg-[#1B2234] text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? 'fill-indigo-400 text-indigo-400' : ''}`} />
                <span>{likes.toLocaleString()}</span>
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                className="p-2 rounded-xl bg-[#131926] border border-[#1E293B] hover:bg-[#1B2234] text-[#94A3B8] hover:text-[#F8FAFC] transition-all"
                title="Share Video Link"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Description & Web3 Transparency Details */}
          <div className="mt-4 p-4 rounded-2xl bg-[#131926] border border-[#1E293B] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#94A3B8] font-mono">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="font-semibold text-white flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-[#94A3B8]" />
                  {(viewStats ? viewStats.total_views : video.views).toLocaleString()} views
                </span>
                {viewStats && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {viewStats.qualified_views} verified qualified
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#94A3B8]" />
                  {video.createdAt}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                  {viewStats
                    ? `${(viewStats.qualified_views * 0.05).toFixed(2)} ALGO Accrued`
                    : `${video.earnedAlgo.toFixed(2)} ALGO Accrued`}
                </span>
                <span>•</span>
                <span className="text-[#94A3B8]">{video.resolution}</span>
              </div>
            </div>

            <p className={`text-xs sm:text-sm text-[#94A3B8] leading-relaxed whitespace-pre-line ${
              isDescriptionExpanded ? '' : 'line-clamp-2'
            }`}>
              {video.description}
            </p>

            {/* Expand / Collapse toggle */}
            <button
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <span>{isDescriptionExpanded ? 'Show less' : 'Show more'}</span>
              {isDescriptionExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {/* IPFS & Algorand Verification Spec Pods */}
            <div className="pt-3 border-t border-[#1E293B] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              {/* CID Pod */}
              <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1E293B] flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-[#475569] uppercase block font-semibold mb-0.5">
                    Decentralized Storage CID
                  </span>
                  <span className="text-[#94A3B8] text-[11px] truncate block font-mono">
                    {video.ipfsCid}
                  </span>
                </div>
                <IPFSBadge cid={video.ipfsCid} showCopy={true} />
              </div>

              {/* Creator Wallet Pod */}
              <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1E293B] flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-[#475569] uppercase block font-semibold mb-0.5">
                    Algorand Creator Wallet
                  </span>
                  <span className="text-indigo-300 text-[11px] truncate block font-mono">
                    {video.creator.walletAddress}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleCopyAddr}
                    className="p-1 hover:text-white text-[#94A3B8] transition-colors"
                    title="Copy Address"
                  >
                    {copiedAddr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                    Verified
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Phase 13: Sponsored Web3 Advertising Placement */}
          <SponsoredBanner placement="banner_overlay" videoId={backendVideoId} className="mt-4" />

          {/* Comments Section */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <h2 className="font-display font-bold text-base text-[#F8FAFC]">
                Discussion ({comments.length})
              </h2>
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleAddComment} className="flex gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-500/30">
                You
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Share your thoughts on this decentralized stream..."
                  value={newCommentText}
                  onChange={e => setNewCommentText(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#131926] border border-[#1E293B] text-xs text-white placeholder-[#475569] focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Post</span>
                </button>
              </div>
            </form>

            {/* Comment List */}
            <div className="space-y-3">
              {comments.map(cm => (
                <div key={cm.id} className="flex gap-3 p-3.5 rounded-xl bg-[#131926] border border-[#1E293B]">
                  <img
                    src={cm.avatar}
                    alt={cm.author}
                    className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-[#1E293B]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#F8FAFC]">
                        {cm.author}
                      </span>
                      {cm.isCreator && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-mono font-semibold">
                          Creator
                        </span>
                      )}
                      <span className="text-[11px] text-[#475569] font-mono">
                        {cm.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      {cm.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Related Videos */}
        <div className={isTheatre ? 'w-full mt-6' : 'lg:col-span-4'}>
          <h3 className="font-display font-semibold text-sm text-[#F8FAFC] mb-4">
            Related Media on OpenStream
          </h3>

          <div className="space-y-3">
            {relatedVideos
              .filter(v => v.id !== video.id && (video.backendId ? v.backendId !== video.backendId : true))
              .map(relVideo => (
                <div
                  key={relVideo.id}
                  onClick={() => onSelectVideo(relVideo)}
                  className="flex gap-3 p-2.5 rounded-xl bg-[#131926] border border-[#1E293B] hover:border-[#334155] cursor-pointer group transition-all hover:-translate-y-0.5 shadow-sm"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video w-32 rounded-lg overflow-hidden bg-[#0A0D14] shrink-0">
                    {relVideo.thumbnail ? (
                      <img
                        src={relVideo.thumbnail}
                        alt={relVideo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1E293B] to-[#0A0D14] flex items-center justify-center">
                        <Clock className="w-4 h-4 text-[#475569]" />
                      </div>
                    )}
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-mono text-white">
                      {relVideo.duration}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h4 className="font-sans font-semibold text-xs text-[#F8FAFC] line-clamp-2 leading-snug group-hover:text-indigo-400 transition-colors">
                        {relVideo.title}
                      </h4>
                      <p className="text-[11px] text-[#94A3B8] mt-1 truncate">
                        {relVideo.creator.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#475569] mt-1">
                      <span>{relVideo.views.toLocaleString()} views</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-semibold">IPFS</span>
                    </div>
                  </div>
                </div>
              ))}

            {relatedVideos.filter(v => v.id !== video.id && (video.backendId ? v.backendId !== video.backendId : true)).length === 0 && (
              <div className="p-4 rounded-xl bg-[#131926]/40 border border-[#1E293B] text-center text-xs text-[#64748B]">
                No other media found on the network.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tipping Modal */}
      <TippingModal
        isOpen={isTippingModalOpen}
        onClose={() => setIsTippingModalOpen(false)}
        creator={video.creator}
        walletConnected={walletConnected}
        onOpenConnectWallet={onOpenConnectWallet}
      />
    </div>
  )
}
