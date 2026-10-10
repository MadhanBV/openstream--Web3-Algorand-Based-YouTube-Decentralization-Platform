import React, { useState, useEffect, useCallback } from 'react'
import {
  Eye,
  Clock,
  Coins,
  Upload,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Film,
  Sparkles,
  BarChart3,
  Calendar,
  Wallet,
  ArrowUpRight,
  RefreshCw,
  Play
} from 'lucide-react'
import type { Video, Creator, ActivePage, CreatorAnalyticsResponse } from '../types'
import { useAuth } from '../context/AuthContext'
import { creatorService } from '../services/creatorService'

interface StudioDashboardProps {
  creator: Creator
  videos: Video[]
  onNavigate: (page: ActivePage) => void
  onSelectVideo: (video: Video) => void
  onToast?: (title: string, message?: string, type?: 'success' | 'info' | 'error') => void
}

export const StudioDashboard: React.FC<StudioDashboardProps> = ({
  creator,
  videos,
  onNavigate,
  onSelectVideo,
  onToast,
}) => {
  const { isAuthenticated } = useAuth()
  const [selectedTimeframe, setSelectedTimeframe] = useState<7 | 30 | 90>(30)
  const [analytics, setAnalytics] = useState<CreatorAnalyticsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRequestingSettlement, setIsRequestingSettlement] = useState(false)
  const [activeChartMetric, setActiveChartMetric] = useState<'views' | 'revenue'>('views')

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    try {
      if (isAuthenticated) {
        const data = await creatorService.getAnalytics(selectedTimeframe)
        setAnalytics(data)
      } else {
        // Fallback calculation from props for guest/demo view
        const creatorVideos = videos.filter(
          (v) => v.creator.id === creator.id || v.creator.handle === creator.handle
        )
        const totalViews = creatorVideos.reduce((acc, v) => acc + (v.views || 0), 0)
        const totalEarnedAlgo = creatorVideos.reduce((acc, v) => acc + (v.earnedAlgo || 0), 0)
        const totalSeconds = totalViews * 45

        setAnalytics({
          total_views: totalViews,
          total_qualified_views: Math.round(totalViews * 0.75),
          total_watch_seconds: totalSeconds,
          total_watch_hours: roundNumber(totalSeconds / 3600, 2),
          average_view_duration_seconds: totalViews > 0 ? 45.0 : 0.0,
          total_likes: creatorVideos.reduce((acc, v) => acc + (v.likes || 0), 0),
          total_videos: creatorVideos.length,
          total_earned_algo: totalEarnedAlgo.toFixed(6),
          pending_rewards_algo: totalEarnedAlgo.toFixed(6),
          settled_algo: '0.000000',
          top_videos: creatorVideos.slice(0, 5).map((v, i) => ({
            id: v.backendId || i + 1,
            title: v.title,
            thumbnail_cid: v.thumbnail,
            views: v.views,
            qualified_views: Math.round(v.views * 0.75),
            watch_seconds: v.views * 45,
            earned_algo: v.earnedAlgo,
            likes: v.likes,
          })),
          daily_trends: Array.from({ length: selectedTimeframe }).map((_, i) => {
            const d = new Date()
            d.setDate(d.getDate() - (selectedTimeframe - 1 - i))
            return {
              date: d.toISOString().split('T')[0],
              views: Math.floor(Math.random() * 4),
              qualified_views: Math.floor(Math.random() * 3),
              watch_seconds: Math.floor(Math.random() * 120),
              earned_algo: (Math.random() * 0.15).toFixed(6),
            }
          }),
          revenue_breakdown: {
            view_rewards_algo: totalEarnedAlgo.toFixed(6),
            ad_revenue_algo: (totalEarnedAlgo * 0.25).toFixed(6),
            tips_algo: '0.000000',
            total_revenue_algo: (totalEarnedAlgo * 1.25).toFixed(6),
          },
          wallet_status: {
            connected: Boolean(creator.walletAddress),
            address: creator.walletAddress || null,
            minimum_threshold_algo: '1.000000',
            progress_percent: Math.min(100, (totalEarnedAlgo / 1.0) * 100),
          },
        })
      }
    } catch (err: any) {
      console.warn('Analytics fetch error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, selectedTimeframe, creator.id, creator.walletAddress, creator.handle, videos])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const handleRequestSettlement = async () => {
    setIsRequestingSettlement(true)
    try {
      const res = await creatorService.requestSettlement()
      if (onToast) onToast('Settlement Initiated', res.message, 'success')
      fetchAnalytics()
    } catch (err: any) {
      if (onToast) onToast('Payout Request Failed', err.message || 'Could not request settlement.', 'error')
    } finally {
      setIsRequestingSettlement(false)
    }
  }

  // Visual SVG chart builder for daily trends
  const dailyTrends = analytics?.daily_trends || []
  const chartMaxVal = Math.max(
    ...dailyTrends.map((d) => (activeChartMetric === 'views' ? d.views : Number(d.earned_algo))),
    1
  )

  const creatorVideos = videos.filter(
    (v) =>
      v.creator.id === creator.id ||
      v.creator.handle === creator.handle ||
      (Boolean(creator.walletAddress) && v.creator.walletAddress === creator.walletAddress)
  )

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
            <span>Phase 14 Creator Studio</span>
            <span>•</span>
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              {analytics?.wallet_status.connected ? 'Algorand TestNet Linked' : 'Wallet Unlinked'}
            </span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#F8FAFC]">
            Welcome back, {creator.name}
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Monitor real view verification, audience retention, and decentralized Algorand micro-settlements.
          </p>
        </div>

        {/* Studio Controls */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Timeframe selector */}
          <div className="inline-flex rounded-xl bg-[#0A0D14] border border-[#1E293B] p-1 text-xs">
            {([7, 30, 90] as const).map((days) => (
              <button
                key={days}
                onClick={() => setSelectedTimeframe(days)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  selectedTimeframe === days
                    ? 'bg-indigo-600 text-white font-semibold shadow'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>

          <button
            onClick={() => onNavigate('studio-wallet')}
            className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-[#131926] hover:bg-[#1B2234] border border-[#1E293B] text-xs font-semibold text-white transition-all flex items-center gap-2 active:scale-95"
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Revenue Hub</span>
          </button>

          <button
            onClick={() => onNavigate('studio-upload')}
            className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Video</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Pods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric 1: Views */}
        <div className="p-5 rounded-2xl bg-[#131926] border border-[#1E293B] hover:border-[#334155] transition-all flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#94A3B8]">Total Platform Views</span>
            <div className="w-8 h-8 rounded-lg bg-[#0A0D14] border border-[#1E293B] flex items-center justify-center text-indigo-400">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-display font-bold text-2xl text-[#F8FAFC] tracking-tight">
              {analytics ? analytics.total_views.toLocaleString() : '0'}
            </div>
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#1E293B]/60 text-xs font-mono">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {analytics?.total_qualified_views || 0} qualified (≥30s)
              </span>
              <span className="text-[#64748B]">
                {analytics && analytics.total_views > 0
                  ? `${Math.round((analytics.total_qualified_views / analytics.total_views) * 100)}% qual`
                  : '100% qual'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Watch Duration */}
        <div className="p-5 rounded-2xl bg-[#131926] border border-[#1E293B] hover:border-[#334155] transition-all flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#94A3B8]">Watch Duration</span>
            <div className="w-8 h-8 rounded-lg bg-[#0A0D14] border border-[#1E293B] flex items-center justify-center text-teal-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-display font-bold text-2xl text-[#F8FAFC] tracking-tight">
              {analytics ? `${analytics.total_watch_hours} hrs` : '0.0 hrs'}
            </div>
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#1E293B]/60 text-xs font-mono">
              <span className="text-teal-400 font-semibold">
                Avg: {analytics ? `${analytics.average_view_duration_seconds}s` : '0s'}
              </span>
              <span className="text-[#64748B]">Anti-Abuse Verified</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Accrued ALGO Rewards */}
        <div className="p-5 rounded-2xl bg-[#131926] border border-[#1E293B] hover:border-[#334155] transition-all flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#94A3B8]">Accrued Rewards</span>
            <div className="w-8 h-8 rounded-lg bg-[#0A0D14] border border-[#1E293B] flex items-center justify-center text-amber-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-display font-bold text-2xl text-amber-300 tracking-tight">
              {analytics ? `${Number(analytics.total_earned_algo).toFixed(2)} ALGO` : '0.00 ALGO'}
            </div>
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#1E293B]/60 text-xs font-mono">
              <span className="text-amber-400 font-semibold">
                Pending: {analytics ? Number(analytics.pending_rewards_algo).toFixed(2) : '0.00'}
              </span>
              <span className="text-emerald-400 font-semibold">
                Settled: {analytics ? Number(analytics.settled_algo).toFixed(2) : '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Total Monetization Revenue */}
        <div className="p-5 rounded-2xl bg-[#131926] border border-[#1E293B] hover:border-[#334155] transition-all flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-[#94A3B8]">Total Platform Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-[#0A0D14] border border-[#1E293B] flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="font-display font-bold text-2xl text-[#F8FAFC] tracking-tight">
              {analytics ? `${Number(analytics.revenue_breakdown.total_revenue_algo).toFixed(2)} ALGO` : '0.00 ALGO'}
            </div>
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#1E293B]/60 text-xs font-mono">
              <span className="text-emerald-400 font-semibold">
                Ads: {analytics ? Number(analytics.revenue_breakdown.ad_revenue_algo).toFixed(2) : '0.00'}
              </span>
              <span className="text-[#94A3B8]">
                {creatorVideos.length} Assets
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Chart & Payout Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Interactive Trends Graph */}
        <div className="lg:col-span-8 rounded-2xl bg-[#131926] border border-[#1E293B] p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-display font-bold text-base text-white">Performance Velocity</h3>
                <span className="text-xs text-[#64748B] font-mono">Last {selectedTimeframe} Days</span>
              </div>

              {/* Metric toggle */}
              <div className="inline-flex rounded-lg bg-[#0A0D14] border border-[#1E293B] p-1 text-xs">
                <button
                  onClick={() => setActiveChartMetric('views')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeChartMetric === 'views'
                      ? 'bg-indigo-600 text-white font-semibold shadow'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Views
                </button>
                <button
                  onClick={() => setActiveChartMetric('revenue')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    activeChartMetric === 'revenue'
                      ? 'bg-amber-500 text-white font-semibold shadow'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Rewards (ALGO)
                </button>
              </div>
            </div>

            {/* Dynamic Interactive Chart */}
            <div className="pt-6 pb-2">
              <div className="h-48 flex items-end gap-1.5 sm:gap-2 px-2">
                {dailyTrends.map((d, i) => {
                  const val = activeChartMetric === 'views' ? d.views : Number(d.earned_algo)
                  const heightPercent = chartMaxVal > 0 ? Math.max(6, (val / chartMaxVal) * 100) : 6
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center group relative h-full justify-end"
                    >
                      {/* Tooltip */}
                      <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0A0D14] border border-[#1E293B] rounded-lg px-2.5 py-1 text-[10px] font-mono whitespace-nowrap z-20 pointer-events-none shadow-xl">
                        <div className="text-white font-bold">
                          {activeChartMetric === 'views' ? `${d.views} views (${d.qualified_views} qual)` : `${Number(d.earned_algo).toFixed(4)} ALGO`}
                        </div>
                        <div className="text-[#64748B]">{d.date}</div>
                      </div>

                      {/* Bar Fill */}
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-md transition-all duration-300 ${
                          activeChartMetric === 'views'
                            ? 'bg-gradient-to-t from-indigo-600/40 via-indigo-500/70 to-indigo-400 group-hover:from-indigo-500 group-hover:to-teal-400'
                            : 'bg-gradient-to-t from-amber-600/40 via-amber-500/70 to-amber-400 group-hover:from-amber-500 group-hover:to-emerald-400'
                        }`}
                      />
                    </div>
                  )
                })}
              </div>

              {/* X-Axis labels */}
              <div className="flex justify-between pt-3 text-[10px] font-mono text-[#64748B] border-t border-[#1E293B]/60 mt-2 px-2">
                <span>{dailyTrends[0]?.date || 'Start'}</span>
                <span>{dailyTrends[Math.floor(dailyTrends.length / 2)]?.date || 'Mid'}</span>
                <span>{dailyTrends[dailyTrends.length - 1]?.date || 'Today'}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1E293B] flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Views strictly credited through server-verified heartbeats.</span>
            <span className="font-mono text-indigo-400 font-semibold">1 qualified view = +0.05 ALGO</span>
          </div>
        </div>

        {/* Right Column (4 cols): Algorand Settlement Readiness Pod */}
        <div className="lg:col-span-4 rounded-2xl bg-[#131926] border border-[#1E293B] p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-400" />
                <h3 className="font-display font-bold text-base text-white">Payout Readiness</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-mono text-amber-400 font-semibold">
                TestNet
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0A0D14] border border-[#1E293B] space-y-2">
              <div className="text-[10px] uppercase font-mono text-[#64748B]">Linked Algorand Address</div>
              <div className="font-mono text-xs text-white truncate">
                {analytics?.wallet_status.address ? (
                  analytics.wallet_status.address
                ) : (
                  <span className="text-[#64748B]">No wallet linked yet</span>
                )}
              </div>
            </div>

            {/* Threshold progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#94A3B8]">Payout Threshold</span>
                <span className="text-white font-semibold">
                  {Number(analytics?.pending_rewards_algo || 0).toFixed(2)} / {analytics?.wallet_status.minimum_threshold_algo || '1.00'} ALGO
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0A0D14] overflow-hidden border border-[#1E293B]">
                <div
                  style={{ width: `${analytics?.wallet_status.progress_percent || 0}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                />
              </div>
              <div className="text-[11px] text-[#64748B] flex justify-between">
                <span>{analytics?.wallet_status.progress_percent || 0}% achieved</span>
                <span>Min: 1.0 ALGO</span>
              </div>
            </div>

            {/* Revenue streams pills */}
            <div className="space-y-1.5 pt-2">
              <div className="text-xs font-semibold text-[#94A3B8]">Revenue Stream Breakdown</div>
              <div className="space-y-1 text-xs font-mono">
                <div className="flex justify-between p-2 rounded-lg bg-[#0A0D14]/60">
                  <span className="text-[#94A3B8]">View Micro-Rewards:</span>
                  <span className="text-white font-semibold">{Number(analytics?.revenue_breakdown.view_rewards_algo || 0).toFixed(2)} ALGO</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-[#0A0D14]/60">
                  <span className="text-[#94A3B8]">Ad CPM Share (70%):</span>
                  <span className="text-emerald-400 font-semibold">+{Number(analytics?.revenue_breakdown.ad_revenue_algo || 0).toFixed(2)} ALGO</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#1E293B]">
            <button
              onClick={handleRequestSettlement}
              disabled={
                isRequestingSettlement ||
                !analytics?.wallet_status.connected ||
                Number(analytics?.pending_rewards_algo || 0) < 1.0
              }
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 disabled:opacity-40 text-black font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              {isRequestingSettlement ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUpRight className="w-4 h-4" />
              )}
              <span>Request TestNet Payout</span>
            </button>
            <p className="text-[10px] text-center text-[#64748B] mt-1.5">
              Settlements are executed on Algorand TestNet and recorded with immutable transaction hashes.
            </p>
          </div>
        </div>
      </div>

      {/* Content Management Preview & Top Performing Content */}
      <div className="rounded-2xl bg-[#131926] border border-[#1E293B] p-4 sm:p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#1E293B]">
          <div>
            <h2 className="font-display font-bold text-lg text-[#F8FAFC] flex items-center gap-2">
              <Film className="w-5 h-5 text-indigo-400" />
              Top Performing Content
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Ranked by total audience reach, anti-abuse qualified views, and accrued revenue.
            </p>
          </div>
          <button
            onClick={() => onNavigate('studio-videos')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors self-start sm:self-auto"
          >
            <span>Manage All {creatorVideos.length} Assets</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Video Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A0D14] border-y border-[#1E293B] font-mono text-[#94A3B8] uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Video Asset</th>
                <th className="py-3 px-4">Views (Total / Qualified)</th>
                <th className="py-3 px-4">Watch Duration</th>
                <th className="py-3 px-4">Likes</th>
                <th className="py-3 px-4">Accrued Rewards</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60">
              {((analytics?.top_videos && analytics.top_videos.length > 0)
                ? analytics.top_videos.map((topVid) => {
                    const matchingVideo = videos.find(
                      (v) => v.backendId === topVid.id || v.id === `v-${topVid.id}`
                    )
                    const videoToPlay: Video = matchingVideo || {
                      id: `v-${topVid.id}`,
                      backendId: topVid.id,
                      title: topVid.title,
                      description: '',
                      duration: '0:00',
                      views: topVid.views,
                      likes: topVid.likes,
                      dislikes: 0,
                      createdAt: 'Recent',
                      thumbnail: topVid.thumbnail_cid || '',
                      streamUrl: '',
                      ipfsCid: '',
                      category: 'Web3',
                      tags: [],
                      resolution: '1080p',
                      earnedAlgo: Number(topVid.earned_algo || 0),
                      creator: creator,
                    }
                    const watchMins = Math.round(topVid.watch_seconds / 60)
                    return (
                      <tr
                        key={topVid.id}
                        className="hover:bg-[#1B2234]/50 transition-colors cursor-pointer group"
                        onClick={() => onSelectVideo(videoToPlay)}
                      >
                        <td className="py-3.5 px-4 flex items-center gap-3">
                          <div className="relative w-16 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-[#1E293B]">
                            {topVid.thumbnail_cid ? (
                              <img
                                src={topVid.thumbnail_cid}
                                alt={topVid.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#475569]">
                                <Play className="w-4 h-4" />
                              </div>
                            )}
                            {matchingVideo?.duration && (
                              <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-[8px] font-mono text-white">
                                {matchingVideo.duration}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <div className="font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                              {topVid.title}
                            </div>
                            <div className="text-[11px] font-mono text-[#475569]">
                              ID: #{topVid.id}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-white">
                          <span>{topVid.views.toLocaleString()}</span>
                          <span className="text-[#64748B] ml-1">
                            ({topVid.qualified_views.toLocaleString()} qual)
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[#94A3B8]">
                          {watchMins} mins
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[#94A3B8]">
                          {topVid.likes.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-amber-400 font-semibold">
                          {Number(topVid.earned_algo).toFixed(2)} ALGO
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectVideo(videoToPlay)
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#0A0D14] hover:bg-[#1E293B] border border-[#1E293B] text-[11px] font-semibold text-white transition-colors"
                          >
                            Watch
                          </button>
                        </td>
                      </tr>
                    )
                  })
                : creatorVideos.length > 0
                ? creatorVideos.map((vid) => (
                    <tr
                      key={vid.id}
                      className="hover:bg-[#1B2234]/50 transition-colors cursor-pointer group"
                      onClick={() => onSelectVideo(vid)}
                    >
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <div className="relative w-16 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-[#1E293B]">
                          {vid.thumbnail ? (
                            <img
                              src={vid.thumbnail}
                              alt={vid.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#475569]">
                              <Play className="w-4 h-4" />
                            </div>
                          )}
                          <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-[8px] font-mono text-white">
                            {vid.duration}
                          </span>
                        </div>
                        <div className="min-w-0 max-w-xs">
                          <div className="font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                            {vid.title}
                          </div>
                          <div className="text-[11px] font-mono text-[#475569]">
                            CID: {vid.ipfsCid ? `${vid.ipfsCid.slice(0, 10)}...` : 'Pending'}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-white">
                        <span>{vid.views.toLocaleString()}</span>
                        <span className="text-[#64748B] ml-1">
                          ({Math.round(vid.views * 0.75)} qual)
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#94A3B8]">
                        {Math.round(vid.views * 0.05 * 60)} mins
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#94A3B8]">
                        {vid.likes.toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-amber-400 font-semibold">
                        {vid.earnedAlgo.toFixed(2)} ALGO
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectVideo(vid)
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#0A0D14] hover:bg-[#1E293B] border border-[#1E293B] text-[11px] font-semibold text-white transition-colors"
                        >
                          Watch
                        </button>
                      </td>
                    </tr>
                  ))
                : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#94A3B8]">
                      <div className="space-y-2">
                        <p className="font-medium text-white">No published videos found</p>
                        <p className="text-xs text-[#64748B]">
                          Upload a video to publish it to IPFS and track view rewards in real-time.
                        </p>
                        <button
                          onClick={() => onNavigate('studio-upload')}
                          className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors shadow-md"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Video</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function roundNumber(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(num * factor) / factor
}
