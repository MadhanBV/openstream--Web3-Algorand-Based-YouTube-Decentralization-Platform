import React, { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Upload,
  Copy,
  Check,
  Trash2,
  Edit,
  Eye,
  Globe,
  Lock,
  EyeOff,
  Filter,
  CheckCircle2,
  Clock,
  Play
} from 'lucide-react'
import type { Video, Creator, ActivePage, CreatorVideoItem } from '../types'
import { useAuth } from '../context/AuthContext'
import { creatorService } from '../services/creatorService'
import { EditVideoModal } from '../components/studio/EditVideoModal'

interface StudioVideosPageProps {
  creator: Creator
  videos: Video[]
  onSelectVideo: (video: Video) => void
  onNavigate: (page: ActivePage) => void
  onDeleteVideo: (videoId: string) => void
  onToast?: (title: string, message?: string, type?: 'success' | 'error' | 'info') => void
}

export const StudioVideosPage: React.FC<StudioVideosPageProps> = ({
  creator,
  videos,
  onSelectVideo,
  onNavigate,
  onDeleteVideo,
  onToast,
}) => {
  const { isAuthenticated } = useAuth()
  const [studioVideos, setStudioVideos] = useState<CreatorVideoItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVisibility, setSelectedVisibility] = useState<'all' | 'public' | 'unlisted' | 'private'>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'ready' | 'draft' | 'processing'>('all')
  const [copiedId, setCopiedId] = useState<number | string | null>(null)
  const [editingVideo, setEditingVideo] = useState<CreatorVideoItem | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const loadStudioVideos = useCallback(async () => {
    setIsLoading(true)
    try {
      if (isAuthenticated) {
        const data = await creatorService.getCreatorVideos({
          status: selectedStatus,
          visibility: selectedVisibility,
          search: searchQuery,
        })
        setStudioVideos(data)
      } else {
        // Fallback from props for demo / guest mode
        const mapped = videos
          .filter((v) => v.creator.id === creator.id || v.creator.handle === creator.handle)
          .map((v, i) => ({
            id: v.backendId || i + 1,
            title: v.title,
            description: v.description,
            ipfs_cid: v.ipfsCid,
            thumbnail_cid: v.thumbnail,
            duration_seconds: parseDurationToSeconds(v.duration),
            views_count: v.views,
            qualified_views: Math.round(v.views * 0.75),
            likes_count: v.likes,
            visibility: 'public' as const,
            status: 'ready' as const,
            earned_algo: v.earnedAlgo,
            playback_url: v.playbackUrl,
            created_at: v.createdAt,
            updated_at: v.createdAt,
          }))
        setStudioVideos(mapped)
      }
    } catch (err: any) {
      console.warn('Could not load creator studio videos:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, selectedStatus, selectedVisibility, searchQuery, videos, creator.id, creator.handle])

  useEffect(() => {
    loadStudioVideos()
  }, [loadStudioVideos])

  const handleCopy = (id: number | string, textToCopy: string, label: string) => {
    navigator.clipboard.writeText(textToCopy)
    setCopiedId(id)
    if (onToast) onToast('Copied to Clipboard', `${label}: ${textToCopy.slice(0, 16)}...`, 'info')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = async (videoId: number, title: string) => {
    if (!window.confirm(`Are you sure you want to remove "${title}"? This cannot be undone.`)) {
      return
    }

    setDeletingId(videoId)
    try {
      await creatorService.deleteVideo(videoId)
      onDeleteVideo(`v-${videoId}`)
      setStudioVideos((prev) => prev.filter((v) => v.id !== videoId))
      if (onToast) onToast('Video Asset Removed', `"${title}" has been deleted from PostgreSQL and platform index.`, 'success')
    } catch (err: any) {
      if (onToast) onToast('Delete Failed', err.message || 'Could not delete video record.', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleOpenEdit = (vid: CreatorVideoItem) => {
    setEditingVideo(vid)
    setIsEditModalOpen(true)
  }

  const handleVideoSaved = (updated: CreatorVideoItem) => {
    setStudioVideos((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
    loadStudioVideos()
  }

  const handlePlayCreatorVideo = (vid: CreatorVideoItem) => {
    const matching = videos.find((v) => v.backendId === vid.id || v.id === `v-${vid.id}`)
    if (matching) {
      onSelectVideo(matching)
    } else {
      onSelectVideo({
        id: `v-${vid.id}`,
        backendId: vid.id,
        title: vid.title,
        description: vid.description || '',
        duration: formatSeconds(vid.duration_seconds),
        views: vid.views_count,
        likes: vid.likes_count,
        dislikes: 0,
        createdAt: vid.created_at ? new Date(vid.created_at).toLocaleDateString() : 'Just now',
        thumbnail: vid.thumbnail_cid || '',
        streamUrl: vid.playback_url || '',
        ipfsCid: vid.ipfs_cid || '',
        category: 'Web3',
        tags: [],
        resolution: '1080p',
        visibility: vid.visibility,
        earnedAlgo: Number(vid.earned_algo || 0),
        creator: creator,
      })
    }
  }

  // Filter local items if guest mode or fast UI search
  const filteredVideos = studioVideos.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.ipfs_cid && v.ipfs_cid.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesVis = selectedVisibility === 'all' || v.visibility === selectedVisibility
    const matchesStatus = selectedStatus === 'all' || v.status === selectedStatus
    return matchesSearch && matchesVis && matchesStatus
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
            <span>Creator Studio</span>
            <span>•</span>
            <span>Content Manager</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#F8FAFC]">
            Media Inventory
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-0.5">
            Manage your {studioVideos.length} published and pinned video assets, edit metadata, and inspect rewards.
          </p>
        </div>

        <button
          onClick={() => onNavigate('studio-upload')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto active:scale-95"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Video</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-3 rounded-2xl bg-[#131926] border border-[#1E293B]">
        {/* Search Input */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#0A0D14] border border-[#1E293B] text-xs text-white flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#94A3B8] shrink-0" />
          <input
            type="text"
            placeholder="Search by video title or IPFS CID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent focus:outline-none placeholder-[#475569] text-xs text-white"
          />
        </div>

        {/* Visibility Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex rounded-xl bg-[#0A0D14] p-1 border border-[#1E293B] text-xs">
            {(['all', 'public', 'unlisted', 'private'] as const).map((vis) => (
              <button
                key={vis}
                onClick={() => setSelectedVisibility(vis)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                  selectedVisibility === vis
                    ? 'bg-indigo-600 text-white font-semibold shadow'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {vis}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-[#94A3B8] shrink-0 pl-2">
            {filteredVideos.length} {filteredVideos.length === 1 ? 'Video' : 'Videos'}
          </span>
        </div>
      </div>

      {/* Videos Data Table */}
      <div className="rounded-2xl bg-[#131926] border border-[#1E293B] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A0D14] border-b border-[#1E293B] font-mono text-[#94A3B8] uppercase text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Video Asset</th>
                <th className="py-3.5 px-4">Visibility</th>
                <th className="py-3.5 px-4">Storage (IPFS)</th>
                <th className="py-3.5 px-4">Views (Total / Qual)</th>
                <th className="py-3.5 px-4">Accrued Rewards</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60">
              {filteredVideos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-[#94A3B8]">
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-[#1B2234] border border-[#1E293B] flex items-center justify-center mx-auto text-[#64748B]">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="font-semibold text-white">No video assets found</div>
                      <p className="text-xs text-[#64748B]">
                        {searchQuery ? 'Try adjusting your search query or visibility filter.' : 'Upload your first video to pin it to IPFS and start earning decentralized rewards.'}
                      </p>
                      <button
                        onClick={() => onNavigate('studio-upload')}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Video</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVideos.map((vid) => {
                  const formatDur = formatSeconds(vid.duration_seconds)
                  return (
                    <tr key={vid.id} className="hover:bg-[#1B2234]/50 transition-colors group">
                      {/* Thumbnail + Title */}
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <div
                          onClick={() => handlePlayCreatorVideo(vid)}
                          className="relative w-20 h-12 rounded-lg overflow-hidden bg-black shrink-0 border border-[#1E293B] cursor-pointer group/thumb"
                          title="Watch video"
                        >
                          {vid.thumbnail_cid ? (
                            <img
                              src={vid.thumbnail_cid}
                              alt={vid.title}
                              className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#475569]">
                              <Play className="w-5 h-5" />
                            </div>
                          )}
                          <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-[8px] font-mono text-white">
                            {formatDur}
                          </span>
                        </div>
                        <div className="min-w-0 max-w-xs sm:max-w-sm">
                          <div
                            onClick={() => handlePlayCreatorVideo(vid)}
                            className="font-semibold text-white truncate cursor-pointer hover:text-indigo-400 transition-colors"
                          >
                            {vid.title}
                          </div>
                          <div className="text-[11px] font-mono text-[#475569] mt-0.5 flex items-center gap-2">
                            <span>{formatDur}</span>
                            <span>•</span>
                            <span className="text-[#64748B]">{vid.likes_count} likes</span>
                          </div>
                        </div>
                      </td>

                      {/* Visibility Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold capitalize border ${
                            vid.visibility === 'public'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : vid.visibility === 'unlisted'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {vid.visibility === 'public' ? (
                            <Globe className="w-3 h-3" />
                          ) : vid.visibility === 'unlisted' ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                          <span>{vid.visibility}</span>
                        </span>
                      </td>

                      {/* Storage / IPFS Status */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-indigo-400" />
                            <span>{vid.status === 'ready' ? 'IPFS Pinned' : vid.status}</span>
                          </span>
                          {vid.ipfs_cid && (
                            <div className="flex items-center gap-1 text-[10px] font-mono text-[#64748B]">
                              <span>{vid.ipfs_cid.slice(0, 8)}...{vid.ipfs_cid.slice(-4)}</span>
                              <button
                                onClick={() => handleCopy(vid.id, vid.ipfs_cid!, 'IPFS CID')}
                                className="hover:text-white transition-colors"
                                title="Copy CID"
                              >
                                {copiedId === vid.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Views (Total / Qualified) */}
                      <td className="py-3.5 px-4 font-mono text-white">
                        <div>
                          <span className="font-semibold">{vid.views_count.toLocaleString()}</span>
                          <span className="text-[#64748B] text-[11px] ml-1">
                            ({vid.qualified_views} qual)
                          </span>
                        </div>
                      </td>

                      {/* Accrued Rewards */}
                      <td className="py-3.5 px-4 font-mono text-amber-400 font-semibold">
                        {Number(vid.earned_algo).toFixed(2)} ALGO
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(vid)}
                            className="p-1.5 rounded-lg bg-[#0A0D14] hover:bg-indigo-600/20 border border-[#1E293B] hover:border-indigo-500/40 text-[#94A3B8] hover:text-indigo-300 transition-colors"
                            title="Edit metadata"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handlePlayCreatorVideo(vid)}
                            className="p-1.5 rounded-lg bg-[#0A0D14] hover:bg-[#1E293B] border border-[#1E293B] text-[#94A3B8] hover:text-white transition-colors"
                            title="Watch video"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(vid.id, vid.title)}
                            disabled={deletingId === vid.id}
                            className="p-1.5 rounded-lg bg-[#0A0D14] hover:bg-rose-500/20 border border-[#1E293B] hover:border-rose-500/40 text-[#94A3B8] hover:text-rose-400 transition-colors"
                            title="Delete video"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Video Modal */}
      <EditVideoModal
        isOpen={isEditModalOpen}
        video={editingVideo}
        onClose={() => setIsEditModalOpen(false)}
        onSaved={handleVideoSaved}
        onToast={onToast}
      />
    </div>
  )
}

function parseDurationToSeconds(durStr?: string): number {
  if (!durStr || durStr === '--:--') return 0
  const parts = durStr.split(':').map(Number)
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1]
  }
  return 0
}

function formatSeconds(secs: number): string {
  if (!secs || isNaN(secs) || secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}
