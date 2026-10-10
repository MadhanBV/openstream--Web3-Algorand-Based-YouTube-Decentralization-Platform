import React, { useState, useRef } from 'react'
import { X, Save, Image as ImageIcon, Camera, Globe, Lock, EyeOff, Loader2 } from 'lucide-react'
import type { CreatorVideoItem } from '../../types'
import { creatorService } from '../../services/creatorService'

interface EditVideoModalProps {
  isOpen: boolean
  video: CreatorVideoItem | null
  onClose: () => void
  onSaved: (updatedVideo: CreatorVideoItem) => void
  onToast?: (title: string, message?: string, type?: 'success' | 'info' | 'error') => void
}

export const EditVideoModal: React.FC<EditVideoModalProps> = ({
  isOpen,
  video,
  onClose,
  onSaved,
  onToast,
}) => {
  if (!isOpen || !video) return null

  const [title, setTitle] = useState(video.title)
  const [description, setDescription] = useState(video.description || '')
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>(video.visibility)
  const [thumbnailUrl, setThumbnailUrl] = useState(video.thumbnail_cid || '')
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Synchronize modal state whenever video prop changes
  React.useEffect(() => {
    if (video) {
      setTitle(video.title)
      setDescription(video.description || '')
      setVisibility(video.visibility)
      setThumbnailUrl(video.thumbnail_cid || '')
    }
  }, [video])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setThumbnailUrl(reader.result)
          if (onToast) onToast('Custom Thumbnail Selected', file.name, 'info')
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      if (onToast) onToast('Title Required', 'Video title cannot be empty.', 'error')
      return
    }

    setIsSaving(true)
    try {
      const res = await creatorService.updateVideo(video.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        visibility,
        thumbnail_cid: thumbnailUrl || undefined,
      })

      const updated: CreatorVideoItem = {
        ...video,
        title: res.title || title.trim(),
        description: res.description !== undefined ? res.description : description.trim(),
        visibility: res.visibility || visibility,
        thumbnail_cid: res.thumbnail_cid !== undefined ? res.thumbnail_cid : thumbnailUrl,
        updated_at: res.updated_at || new Date().toISOString(),
      }

      onSaved(updated)
      if (onToast) onToast('Video Updated', `Changes to "${title.trim()}" saved to PostgreSQL.`, 'success')
      onClose()
    } catch (err: any) {
      if (onToast) onToast('Save Failed', err.message || 'Could not update video metadata.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#131926] border border-[#1E293B] shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 text-[#F8FAFC]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
          <div>
            <div className="text-[10px] font-mono uppercase text-indigo-400 font-semibold">Creator Studio</div>
            <h3 className="font-display font-bold text-lg text-white">Edit Video Details</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0A0D14] border border-[#1E293B] text-xs text-white placeholder-[#475569] focus:outline-none focus:border-indigo-500"
              placeholder="Enter video title..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#0A0D14] border border-[#1E293B] text-xs text-white placeholder-[#475569] focus:outline-none focus:border-indigo-500"
              placeholder="Explain the key topics covered in your video..."
            />
          </div>

          {/* Visibility Selector */}
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
              Visibility & Distribution
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`p-2.5 rounded-xl border text-xs flex flex-col items-center gap-1 transition-all ${
                  visibility === 'public'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                    : 'bg-[#0A0D14] border-[#1E293B] text-[#94A3B8] hover:border-[#334155]'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>Public</span>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('unlisted')}
                className={`p-2.5 rounded-xl border text-xs flex flex-col items-center gap-1 transition-all ${
                  visibility === 'unlisted'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                    : 'bg-[#0A0D14] border-[#1E293B] text-[#94A3B8] hover:border-[#334155]'
                }`}
              >
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Unlisted</span>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`p-2.5 rounded-xl border text-xs flex flex-col items-center gap-1 transition-all ${
                  visibility === 'private'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                    : 'bg-[#0A0D14] border-[#1E293B] text-[#94A3B8] hover:border-[#334155]'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Private</span>
              </button>
            </div>
          </div>

          {/* Thumbnail Cover Section */}
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">
              Thumbnail Cover
            </label>
            <div className="flex items-center gap-3">
              <div className="relative aspect-video w-28 rounded-lg overflow-hidden bg-black border border-[#1E293B] shrink-0">
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#475569]">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B2234] hover:bg-[#232B42] border border-[#1E293B] text-xs font-medium text-indigo-300 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <p className="text-[10px] text-[#64748B]">
                  JPEG, PNG, or WebP. Saved directly to decentralized media index.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-4 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all active:scale-95"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
