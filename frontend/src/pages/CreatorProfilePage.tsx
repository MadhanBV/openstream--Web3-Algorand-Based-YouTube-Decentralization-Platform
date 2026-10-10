import React, { useState } from 'react'
import {
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Film
} from 'lucide-react'
import type { Creator, Video } from '../types'
import { VideoCard } from '../components/video/VideoCard'

interface CreatorProfilePageProps {
  creator: Creator
  videos: Video[]
  onSelectVideo: (video: Video) => void
  onToast?: (title: string, message?: string, type?: 'success' | 'info' | 'error') => void
}

export const CreatorProfilePage: React.FC<CreatorProfilePageProps> = ({
  creator,
  videos,
  onSelectVideo,
  onToast
}) => {
  const [activeTab, setActiveTab] = useState<'videos' | 'about'>('videos')
  const [copiedAddr, setCopiedAddr] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscribersCount, setSubscribersCount] = useState(creator.subscribersCount)

  const creatorVideos = videos.filter(
    (v) => v.creator.id === creator.id || v.creator.handle === creator.handle
  )
  const creatorTotalViews = creatorVideos.reduce((acc, v) => acc + (v.views || 0), 0)
  const creatorTotalEarned = creatorVideos.reduce((acc, v) => acc + (v.earnedAlgo || 0), 0)

  const handleCopy = () => {
    navigator.clipboard.writeText(creator.walletAddress)
    setCopiedAddr(true)
    if (onToast) onToast('Creator Address Copied', creator.walletAddress, 'info')
    setTimeout(() => setCopiedAddr(false), 2000)
  }

  const handleToggleSubscribe = () => {
    if (isSubscribed) {
      setIsSubscribed(false)
      setSubscribersCount(prev => prev - 1)
      if (onToast) onToast('Unsubscribed', `Unsubscribed from @${creator.handle}`, 'info')
    } else {
      setIsSubscribed(true)
      setSubscribersCount(prev => prev + 1)
      if (onToast) onToast('Subscribed!', `You are now following ${creator.name}`, 'success')
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0D14]">
      {/* Channel Banner */}
      <div className="relative h-44 sm:h-60 lg:h-72 w-full overflow-hidden bg-[#131926]">
        <img
          src={creator.banner}
          alt={creator.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0D14] via-black/20 to-black/30" />
      </div>

      {/* Profile Header Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 sm:-mt-20 relative z-10 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-6 border-b border-[#1E293B]">
          {/* Avatar + Name Details */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-5">
            <img
              src={creator.avatar}
              alt={creator.name}
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover ring-4 ring-[#0A0D14] bg-[#131926] shadow-2xl shrink-0"
            />

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                  {creator.name}
                </h1>
                {creator.verified && (
                  <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#94A3B8] font-mono mt-1">
                <span>@{creator.handle}</span>
                <span>•</span>
                <span>{subscribersCount.toLocaleString()} subscribers</span>
                <span>•</span>
                <span>{creatorVideos.length} videos</span>
              </div>

              {/* Wallet Address Chip */}
              <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#131926] border border-[#1E293B] text-xs font-mono text-emerald-400 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[180px] sm:max-w-xs">{creator.walletAddress}</span>
                <button
                  onClick={handleCopy}
                  className="hover:text-white transition-colors p-0.5"
                  title="Copy Wallet Address"
                >
                  {copiedAddr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#94A3B8]" />}
                </button>
              </div>
            </div>
          </div>

          {/* Action: Subscribe */}
          <div className="self-start sm:self-end">
            <button
              onClick={handleToggleSubscribe}
              className={`px-6 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95 ${
                isSubscribed
                  ? 'bg-[#1B2234] border border-[#1E293B] text-[#94A3B8] hover:text-white'
                  : 'bg-white text-black hover:bg-neutral-200'
              }`}
            >
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-6 mt-6 border-b border-[#1E293B] pb-3 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('videos')}
            className={`pb-1 border-b-2 transition-all ${
              activeTab === 'videos'
                ? 'border-indigo-500 text-white font-bold'
                : 'border-transparent text-[#94A3B8] hover:text-white'
            }`}
          >
            Videos ({creatorVideos.length})
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`pb-1 border-b-2 transition-all ${
              activeTab === 'about'
                ? 'border-indigo-500 text-white font-bold'
                : 'border-transparent text-[#94A3B8] hover:text-white'
            }`}
          >
            About & Cryptographic Proof
          </button>
        </div>

        {/* Tab Content */}
        <div className="pt-6">
          {activeTab === 'videos' ? (
            creatorVideos.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#131926] border border-[#1E293B]">
                <Film className="w-10 h-10 text-[#475569] mx-auto mb-3" />
                <p className="text-sm text-[#94A3B8]">No videos published by this creator yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {creatorVideos.map(vid => (
                  <VideoCard
                    key={vid.id}
                    video={vid}
                    onSelectVideo={onSelectVideo}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="max-w-3xl space-y-6">
              <div className="p-6 rounded-2xl bg-[#131926] border border-[#1E293B] space-y-3 shadow-sm">
                <h3 className="font-display font-bold text-base text-white">
                  Creator Biography
                </h3>
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  {creator.bio}
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#131926] border border-[#1E293B] space-y-3 font-mono text-xs shadow-sm">
                <h3 className="font-display font-bold text-base text-white font-sans mb-1">
                  On-Chain Channel Verification
                </h3>
                <div className="flex justify-between py-2.5 border-b border-[#1E293B]">
                  <span className="text-[#475569]">Settlement Protocol</span>
                  <span className="text-emerald-400 font-semibold">Algorand Testnet (Atomic Transfers)</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-[#1E293B]">
                  <span className="text-[#475569]">Total Views Monitored</span>
                  <span className="text-white">{creatorTotalViews.toLocaleString()} views</span>
                </div>
                <div className="flex justify-between py-2.5 border-b border-[#1E293B]">
                  <span className="text-[#475569]">Cumulative Settled Rewards</span>
                  <span className="text-indigo-400 font-bold">{creatorTotalEarned.toFixed(2)} ALGO</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="text-[#475569]">Cryptographic Identity</span>
                  <span className="text-white flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Pera Wallet ed25519 Verified
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
