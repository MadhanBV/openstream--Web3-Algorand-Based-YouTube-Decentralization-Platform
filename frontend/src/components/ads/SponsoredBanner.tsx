import React, { useEffect, useState, useRef } from 'react'
import { ExternalLink, Megaphone } from 'lucide-react'
import { adService, type AdServeResponse } from '../../services/adService'

interface SponsoredBannerProps {
  placement?: string
  videoId?: number
  className?: string
}

export const SponsoredBanner: React.FC<SponsoredBannerProps> = ({
  placement = 'banner_overlay',
  videoId,
  className = '',
}) => {
  const [ad, setAd] = useState<AdServeResponse | null>(null)
  const [hasImpressed, setHasImpressed] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    let isMounted = true
    adService.serveAd(placement, videoId).then((res) => {
      if (isMounted && res) {
        setAd(res)
      }
    })
    return () => {
      isMounted = false
    }
  }, [placement, videoId])

  useEffect(() => {
    if (!ad || hasImpressed) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          // Viewport threshold: visible for 1 second continuously
          timerRef.current = window.setTimeout(() => {
            adService.recordImpression(ad.event_token).catch(() => {})
            setHasImpressed(true)
          }, 1000)
        } else if (timerRef.current) {
          window.clearTimeout(timerRef.current)
          timerRef.current = null
        }
      },
      { threshold: 0.6 }
    )

    if (bannerRef.current) {
      observer.observe(bannerRef.current)
    }

    return () => {
      observer.disconnect()
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [ad, hasImpressed])

  if (!ad) return null

  const handleClick = async () => {
    try {
      const res = await adService.recordClick(ad.event_token)
      if (res && res.destination_url) {
        window.open(res.destination_url, '_blank', 'noopener,noreferrer')
      }
    } catch {
      window.open(ad.destination_url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      ref={bannerRef}
      onClick={handleClick}
      className={`group relative overflow-hidden rounded-2xl bg-[#0B0F19] border border-[#1E293B] hover:border-indigo-500/40 p-4 transition-all duration-300 cursor-pointer shadow-lg ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-amber-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
            <Megaphone className="w-5 h-5 text-indigo-400" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                Sponsored
              </span>
              <span className="text-[10px] font-mono text-[#64748B]">
                {ad.sponsored_label}
              </span>
            </div>
            <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
              {ad.headline}
            </h4>
            <p className="text-[11px] sm:text-xs text-[#94A3B8] line-clamp-2 mt-0.5 leading-relaxed">
              {ad.body_text}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <span>Learn More</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
