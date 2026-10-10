import React from 'react'
import {
  Play,
  Database,
  Coins,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react'
import type { Video } from '../types'
import { VideoCard } from '../components/video/VideoCard'

interface LandingPageProps {
  onExplore: () => void
  onStartCreating: () => void
  featuredVideos: Video[]
  onSelectVideo: (video: Video) => void
  onSelectCreator: (creatorId: string) => void
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onExplore,
  onStartCreating,
  featuredVideos,
  onSelectVideo,
  onSelectCreator
}) => {
  return (
    <div className="min-h-screen bg-[#0A0D14] text-[#F8FAFC]">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[#1E293B]">
        {/* Subtle Ambient Background Gradient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-indigo-900/10 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-6xl mx-auto relative z-10 text-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131926] border border-[#1E293B] text-xs font-mono text-indigo-400 mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span>Decentralized Media Storage + Algorand On-Chain Settlement</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-display font-extrabold text-4xl sm:text-6xl lg:text-7xl tracking-tight text-[#F8FAFC] max-w-4xl mx-auto leading-[1.1] mb-6">
            The Video Platform Owned by{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-300 to-indigo-500">
              Creators
            </span>{' '}
            and Built for Viewers.
          </h1>

          {/* Subtitle */}
          <p className="font-sans text-base sm:text-xl text-[#94A3B8] max-w-2xl mx-auto leading-relaxed mb-10">
            OpenStream combines high-speed video streaming with content-addressed IPFS preservation and transparent micro-reward settlements on Algorand.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={onExplore}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Explore OpenStream</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onStartCreating}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#131926] hover:bg-[#1B2234] border border-[#1E293B] hover:border-[#334155] text-[#F8FAFC] font-semibold text-sm transition-all"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Creator Studio</span>
            </button>
          </div>

          {/* Interactive Hero Preview Card */}
          <div className="relative max-w-4xl mx-auto rounded-2xl bg-[#131926] border border-[#1E293B] p-2 sm:p-3 shadow-2xl overflow-hidden group">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
              <img
                src={featuredVideos[0]?.thumbnail || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80'}
                alt="OpenStream Platform Showcase"
                className="w-full h-full object-cover opacity-90 group-hover:scale-102 transition-transform duration-500"
              />

              {/* Play Badge */}
              <div
                onClick={() => {
                  if (featuredVideos[0]) {
                    onSelectVideo(featuredVideos[0])
                  } else {
                    onExplore()
                  }
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer group-hover:bg-black/20 transition-all"
              >
                <div className="w-20 h-20 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-600/50 group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 fill-white ml-1" />
                </div>
              </div>

              {/* Bottom HUD bar on hero card */}
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                {featuredVideos[0] ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        IPFS Verified
                      </span>
                      <span className="text-[#94A3B8] hidden sm:inline">
                        CID: {featuredVideos[0].ipfsCid ? featuredVideos[0].ipfsCid.slice(0, 12) + '...' : 'Pinned'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[#94A3B8]">
                        Views: <strong className="text-white">{featuredVideos[0].views.toLocaleString()}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                        @{featuredVideos[0].creator.handle}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                        OpenStream Protocol
                      </span>
                      <span className="text-[#94A3B8] hidden sm:inline">
                        Decentralized Streaming Ready
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-semibold">Algorand TestNet Connected</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Architecture Pillars */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[#1E293B] bg-[#0A0D14]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#F8FAFC] tracking-tight mb-3">
              Why OpenStream is Architecturally Different
            </h2>
            <p className="text-sm sm:text-base text-[#94A3B8]">
              We deliberately separate concerns: fast Web2 services for discovery, decentralized IPFS for media, and Algorand for transparent settlements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-[#131926] border border-[#1E293B] hover:border-[#334155] transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-5">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-lg text-[#F8FAFC] mb-2">
                  Censorship-Resistant Storage
                </h3>
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  Video files are content-addressed and pinned to IPFS nodes worldwide. Videos cannot be deleted or modified arbitrarily without changing their cryptographic CID.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#1E293B] flex items-center justify-between text-[11px] font-mono text-[#475569]">
                <span>Technology</span>
                <span className="text-indigo-400 font-semibold">IPFS / Pinata</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-[#131926] border border-[#1E293B] hover:border-[#334155] transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5">
                  <Coins className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-lg text-[#F8FAFC] mb-2">
                  Transparent On-Chain Rewards
                </h3>
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  No hidden 45% platform cuts. View-based earnings are calculated transparently and settled in ALGO directly to creator wallets with on-chain verification.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#1E293B] flex items-center justify-between text-[11px] font-mono text-[#475569]">
                <span>Settlement Network</span>
                <span className="text-emerald-400 font-semibold">Algorand Testnet</span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-[#131926] border border-[#1E293B] hover:border-[#334155] transition-all flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-5">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-lg text-[#F8FAFC] mb-2">
                  True Creator Sovereignty
                </h3>
                <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                  Creators log in via cryptographic signature challenges from Pera Wallet. No corporate custody of accounts or revenue. You own your channel identity.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[#1E293B] flex items-center justify-between text-[11px] font-mono text-[#475569]">
                <span>Authentication</span>
                <span className="text-amber-400 font-semibold">Pera Wallet / ed25519</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Telemetry Bar */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-b border-[#1E293B] bg-[#0E131F]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div>
            <div className="font-display font-bold text-2xl sm:text-3xl text-[#F8FAFC] mb-1">
              3.3s
            </div>
            <div className="text-xs font-mono text-[#94A3B8]">Block Finality</div>
          </div>
          <div>
            <div className="font-display font-bold text-2xl sm:text-3xl text-emerald-400 mb-1">
              100%
            </div>
            <div className="text-xs font-mono text-[#94A3B8]">Decentralized Media</div>
          </div>
          <div>
            <div className="font-display font-bold text-2xl sm:text-3xl text-indigo-400 mb-1">
              18,420+
            </div>
            <div className="text-xs font-mono text-[#94A3B8]">ALGO Settled</div>
          </div>
          <div>
            <div className="font-display font-bold text-2xl sm:text-3xl text-amber-400 mb-1">
              0%
            </div>
            <div className="text-xs font-mono text-[#94A3B8]">Hidden Platform Cuts</div>
          </div>
        </div>
      </section>

      {/* Featured Videos Spotlight */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-[#1E293B]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display font-bold text-2xl text-[#F8FAFC] tracking-tight">
                Featured Creator Spotlights
              </h2>
              <p className="text-xs text-[#94A3B8] mt-1">
                Explore popular videos streaming directly from decentralized storage nodes.
              </p>
            </div>
            <button
              onClick={onExplore}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {featuredVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredVideos.slice(0, 3).map(video => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onSelectVideo={onSelectVideo}
                  onSelectCreator={onSelectCreator}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 px-6 text-center rounded-2xl bg-[#131926] border border-[#1E293B]">
              <p className="text-xs text-[#94A3B8]">
                No public videos published yet. Connect and be the first to publish on OpenStream!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Call to Action Footer Banner */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#131926] to-[#0A0D14] border border-[#1E293B] shadow-2xl relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-6 h-6" />
          </div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-[#F8FAFC] mb-4">
            Ready to Own Your Audience & Media?
          </h2>
          <p className="text-sm text-[#94A3B8] max-w-lg mx-auto mb-8">
            Connect your Pera Wallet in seconds. Upload your videos, get content-addressed IPFS CIDs, and start accumulating transparent rewards.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onStartCreating}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all"
            >
              Start Creating Now
            </button>
            <button
              onClick={onExplore}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#1B2234] hover:bg-[#232B42] border border-[#1E293B] text-white font-semibold text-sm transition-all"
            >
              Explore Feed
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
