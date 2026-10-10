import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Database,
  Tv,
  Wifi,
  ChevronDown,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { mediaCache } from '../../utils/mediaCache'
import { viewService } from '../../services/viewService'

interface VideoPlayerProps {
  streamUrl: string
  poster: string
  ipfsCid: string
  title: string
  isTheatre?: boolean
  onToggleTheatre?: () => void
  videoId?: number
  onViewQualified?: () => void
}

interface GatewayOption {
  id: string
  name: string
  buildUrl: (cid: string) => string
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  streamUrl,
  poster,
  ipfsCid,
  isTheatre = false,
  onToggleTheatre,
  videoId,
  onViewQualified,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const sessionIdRef = useRef<string | null>(null)
  const heartbeatTimerRef = useRef<number | null>(null)
  const isStartingSessionRef = useRef<boolean>(false)
  const intervalSecRef = useRef<number>(10)
  const [isViewQualified, setIsViewQualified] = useState(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bufferedPercent, setBufferedPercent] = useState(0)
  const [volume, setVolume] = useState(0.85)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false)
  const [simulatedLatency, setSimulatedLatency] = useState(14)
  const [hasPlaybackError, setHasPlaybackError] = useState(false)

  // Gateway management & failover
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>('primary')
  const [isGatewayMenuOpen, setIsGatewayMenuOpen] = useState(false)

  // Helper to ensure URL has proper protocol and handles relative backend paths
  const normalizeUrl = (url: string) => {
    if (!url) return ''
    const trimmed = url.trim()
    // Local backend routes, blobs, and data URIs are valid as-is
    if (trimmed.startsWith('/') || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
      return trimmed
    }
    let res = trimmed
    if (!res.startsWith('http://') && !res.startsWith('https://')) {
      res = `https://${res}`
    }
    if (res.includes('mypinata.cloud') && !res.includes('/ipfs/')) {
      res = res.replace(/mypinata\.cloud\/?/, 'mypinata.cloud/ipfs/')
    }
    return res
  }

  const primaryName = useMemo(() => {
    if (streamUrl && streamUrl.includes('mypinata.cloud')) {
      return 'Pinata Dedicated Gateway'
    }
    return 'Pinata Dedicated Gateway'
  }, [streamUrl])

  const gatewaysList = useMemo<GatewayOption[]>(() => [
    {
      id: 'primary',
      name: primaryName,
      buildUrl: (cid: string) => {
        if (streamUrl && (streamUrl.includes(cid) || streamUrl.includes('/stream') || streamUrl.includes('mypinata.cloud'))) {
          return normalizeUrl(streamUrl)
        }
        return `https://black-occasional-lynx-687.mypinata.cloud/ipfs/${cid}`
      },
    },
    {
      id: 'proxy',
      name: 'OpenStream High-Speed Proxy',
      buildUrl: (cid: string) => `/api/v1/videos/cid/${cid}/stream`,
    },
    {
      id: 'pinata_cloud',
      name: 'Pinata Gateway (Edge)',
      buildUrl: (cid: string) => `https://gateway.pinata.cloud/ipfs/${cid}`,
    },
  ], [primaryName, streamUrl])

  // Check if this video has an in-memory local blob (instant 60fps zero-lag playback)
  const cachedLocalUrl = useMemo(() => {
    return mediaCache.get(ipfsCid) || (streamUrl.startsWith('blob:') ? streamUrl : null)
  }, [ipfsCid, streamUrl])

  // Resolve current active stream URL
  const activeStreamUrl = useMemo(() => {
    if (cachedLocalUrl) {
      return cachedLocalUrl
    }
    if (selectedGatewayId === 'primary' && streamUrl) {
      return normalizeUrl(streamUrl)
    }
    const gateway = gatewaysList.find((g) => g.id === selectedGatewayId)
    if (gateway && ipfsCid) {
      return gateway.buildUrl(ipfsCid)
    }
    return normalizeUrl(streamUrl) || (ipfsCid ? `https://gateway.pinata.cloud/ipfs/${ipfsCid}` : '')
  }, [cachedLocalUrl, selectedGatewayId, gatewaysList, ipfsCid, streamUrl])

  // Simulated latency jitter based on chosen source
  useEffect(() => {
    const isDedicated = streamUrl && streamUrl.includes('mypinata.cloud')
    const baseLatency = cachedLocalUrl ? 4 : isDedicated ? 14 : selectedGatewayId === 'cloudflare' ? 24 : 45
    setSimulatedLatency(baseLatency)
    const interval = setInterval(() => {
      setSimulatedLatency(baseLatency + Math.floor(Math.random() * 4))
    }, 4000)
    return () => clearInterval(interval)
  }, [cachedLocalUrl, selectedGatewayId, streamUrl])

  // Reset errors when stream URL changes
  useEffect(() => {
    setHasPlaybackError(false)
    setIsBuffering(false)
  }, [activeStreamUrl])

  // Buffer progress tracking
  const handleProgress = () => {
    if (!videoRef.current || !duration) return
    const buffered = videoRef.current.buffered
    if (buffered.length > 0) {
      const end = buffered.end(buffered.length - 1)
      setBufferedPercent(Math.min(100, (end / duration) * 100))
    }
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute()
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      } else if (e.key === 'ArrowRight') {
        skipTime(10)
      } else if (e.key === 'ArrowLeft') {
        skipTime(-10)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, isMuted, volume, duration])

  // --- Server-Validated View Tracking & Heartbeat ---
  const stopHeartbeat = () => {
    if (heartbeatTimerRef.current) {
      window.clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = null
    }
  }

  const startHeartbeat = (sessionId: string, intervalSec: number) => {
    stopHeartbeat()
    heartbeatTimerRef.current = window.setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        return
      }
      try {
        const res = await viewService.sendHeartbeat(sessionId, videoRef.current.currentTime)
        if (res.is_qualified) {
          setIsViewQualified(true)
          if (onViewQualified) onViewQualified()
        }
      } catch (err) {
        console.warn('View tracking heartbeat warning:', err)
      }
    }, Math.max(intervalSec, 5) * 1000)
  }

  const startTrackingSession = async () => {
    if (!videoId || sessionIdRef.current || isStartingSessionRef.current) return
    isStartingSessionRef.current = true
    try {
      const session = await viewService.startSession(videoId)
      sessionIdRef.current = session.session_id
      intervalSecRef.current = session.heartbeat_interval_seconds || 10
      startHeartbeat(session.session_id, intervalSecRef.current)
    } catch (err) {
      console.warn('Failed to start view session:', err)
    } finally {
      isStartingSessionRef.current = false
    }
  }

  // Teardown session on unmount or video change
  useEffect(() => {
    return () => {
      stopHeartbeat()
      if (sessionIdRef.current) {
        viewService.endSession(sessionIdRef.current, false)
        sessionIdRef.current = null
      }
    }
  }, [videoId])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
      stopHeartbeat()
    } else {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true)
          if (!sessionIdRef.current) {
            startTrackingSession()
          } else {
            startHeartbeat(sessionIdRef.current, intervalSecRef.current)
          }
        })
        .catch((err) => {
          console.warn('Playback error:', err)
          setIsPlaying(false)
        })
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
      handleProgress()
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
      videoRef.current.volume = volume
      setHasPlaybackError(false)
      setIsBuffering(false)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    if (videoRef.current) {
      videoRef.current.currentTime = time
    }
  }

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        Math.max(videoRef.current.currentTime + seconds, 0),
        duration || 100
      )
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value)
    setVolume(newVol)
    if (videoRef.current) {
      videoRef.current.volume = newVol
      setIsMuted(newVol === 0)
    }
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    if (isMuted) {
      videoRef.current.muted = false
      videoRef.current.volume = volume || 0.5
      setIsMuted(false)
    } else {
      videoRef.current.muted = true
      setIsMuted(true)
    }
  }

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  const changeSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
      setPlaybackSpeed(speed)
      setIsSpeedMenuOpen(false)
    }
  }

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00'
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  // Gateway failover helper
  const handleSwitchGateway = (gwId: string) => {
    setSelectedGatewayId(gwId)
    setIsGatewayMenuOpen(false)
    setHasPlaybackError(false)
    setIsBuffering(true)
    if (videoRef.current) {
      videoRef.current.load()
    }
  }

  // Automatic next gateway failover if stream fails
  const handleAutoFailover = () => {
    if (cachedLocalUrl) return
    const currentIdx = gatewaysList.findIndex((g) => g.id === selectedGatewayId)
    const nextIdx = (currentIdx + 1) % gatewaysList.length
    setSelectedGatewayId(gatewaysList[nextIdx].id)
    if (videoRef.current) {
      videoRef.current.load()
    }
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative aspect-video w-full bg-[#05070B] rounded-2xl overflow-hidden group shadow-2xl border border-[#1E293B] select-none"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={activeStreamUrl}
        poster={poster}
        onClick={togglePlay}
        onError={() => {
          setHasPlaybackError(true)
          setIsBuffering(false)
          handleAutoFailover()
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false)
          setHasPlaybackError(false)
          setIsPlaying(true)
          if (!sessionIdRef.current) {
            startTrackingSession()
          } else {
            startHeartbeat(sessionIdRef.current, intervalSecRef.current)
          }
        }}
        onPause={() => {
          setIsPlaying(false)
          stopHeartbeat()
        }}
        onCanPlay={() => setIsBuffering(false)}
        onProgress={handleProgress}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false)
          stopHeartbeat()
          if (sessionIdRef.current) {
            viewService.endSession(sessionIdRef.current, true)
            sessionIdRef.current = null
          }
        }}
        preload="auto"
        className="w-full h-full object-contain cursor-pointer"
        playsInline
      />

      {/* Qualified View Badge Overlay (Top Right) */}
      {isViewQualified && (
        <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/85 backdrop-blur-md border border-emerald-500/40 text-[11px] font-mono text-emerald-300 shadow-xl animate-in fade-in slide-in-from-top-2">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Qualified Watch Accrued (+0.05 ALGO)</span>
        </div>
      )}

      {/* Decentralized Streaming Telemetry Overlay (Top Left) */}
      <div className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 z-20 flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setIsGatewayMenuOpen(!isGatewayMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0A0D14]/90 backdrop-blur-md border border-[#1E293B] hover:border-indigo-500/50 text-[11px] font-mono text-[#F8FAFC] shadow-lg transition-all"
            title="Click to switch IPFS Gateway"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xs:inline">
              {cachedLocalUrl
                ? 'Local Edge Cache'
                : gatewaysList.find((g) => g.id === selectedGatewayId)?.name || 'Pinata Dedicated Gateway'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-semibold">{simulatedLatency}ms</span>
            <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
          </button>

          {/* Gateway Switcher Menu */}
          {isGatewayMenuOpen && (
            <div className="absolute top-full left-0 mt-2 py-2 px-1 bg-[#131926] border border-[#1E293B] rounded-xl shadow-2xl flex flex-col gap-1 min-w-[240px] z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-[#94A3B8] border-b border-[#1E293B] mb-1">
                Select Media Streaming Route
              </div>
              {gatewaysList.map((gw) => (
                <button
                  key={gw.id}
                  onClick={() => handleSwitchGateway(gw.id)}
                  className={`flex items-center justify-between px-3 py-1.5 text-xs font-mono rounded-lg transition-colors ${
                    selectedGatewayId === gw.id
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-[#94A3B8] hover:text-white hover:bg-[#1B2234]'
                  }`}
                >
                  <span>{gw.name}</span>
                  {selectedGatewayId === gw.id && <Check className="w-3.5 h-3.5 ml-2" />}
                </button>
              ))}
              <div className="px-3 py-1.5 mt-1 text-[10px] text-[#64748B] border-t border-[#1E293B] leading-tight font-sans">
                Ultra-smooth playback via dedicated gateway with HTTP 206 byte-range seeking.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Buffering Indicator Overlay */}
      {isBuffering && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px] z-15 pointer-events-none animate-in fade-in">
          <div className="w-14 h-14 rounded-full border-3 border-indigo-500/20 border-t-indigo-500 animate-spin mb-3" />
          <div className="px-3.5 py-1.5 rounded-xl bg-[#0A0D14]/90 border border-indigo-500/30 text-xs font-mono text-indigo-300 shadow-xl flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
            <span>Buffering Media Chunks...</span>
          </div>
        </div>
      )}

      {/* Stream Error Recovery Overlay */}
      {hasPlaybackError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md z-25 p-4 text-center">
          <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
          <h4 className="text-sm font-bold text-white mb-1">Media Stream Connecting</h4>
          <p className="text-xs text-[#94A3B8] max-w-sm mb-4">
            Loading video stream with instant byte-range playback. If you experience latency, switch route:
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSwitchGateway('primary')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Dedicated Gateway</span>
            </button>
            <button
              onClick={() => handleSwitchGateway('proxy')}
              className="px-3.5 py-2 rounded-xl bg-[#1B2234] hover:bg-[#232B42] text-xs font-medium text-indigo-300 hover:text-white transition-colors"
            >
              Use Stream Proxy
            </button>
          </div>
        </div>
      )}

      {/* Center Play Overlay (when paused and not buffering) */}
      {!isPlaying && !isBuffering && !hasPlaybackError && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer z-10 transition-opacity"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-600/90 hover:bg-indigo-500 text-white flex items-center justify-center shadow-2xl shadow-indigo-600/50 hover:scale-105 transition-all">
            <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-white ml-1" />
          </div>
        </div>
      )}

      {/* Controls Overlay (Bottom) */}
      <div
        className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 sm:p-4 transition-opacity duration-300 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber Progress Bar with Buffer Tracking */}
        <div className="relative mb-2 sm:mb-3 flex items-center group/scrubber h-3">
          {/* Background Track */}
          <div className="absolute inset-x-0 h-1.5 bg-white/15 rounded-lg overflow-hidden">
            {/* Loaded Buffer Bar (YouTube style light bar) */}
            <div
              className="h-full bg-white/30 transition-all duration-300"
              style={{ width: `${bufferedPercent}%` }}
            />
          </div>

          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="relative z-10 w-full h-1.5 bg-transparent rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-white text-sm">
          {/* Left Controls: Play, Skips, Volume, Time */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 hover:text-indigo-400 transition-colors"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            <button
              onClick={() => skipTime(-10)}
              className="p-1.5 text-[#94A3B8] hover:text-white transition-colors hidden sm:inline-block"
              title="Rewind 10s (Left Arrow)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => skipTime(10)}
              className="p-1.5 text-[#94A3B8] hover:text-white transition-colors hidden sm:inline-block"
              title="Forward 10s (Right Arrow)"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1 sm:gap-2 group/volume ml-1">
              <button
                onClick={toggleMute}
                className="p-1.5 hover:text-indigo-400 transition-colors"
                title="Mute (M)"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-12 sm:w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500 opacity-80 hover:opacity-100 transition-opacity hidden xs:inline-block"
              />
            </div>

            {/* Time Display */}
            <div className="font-mono text-[11px] sm:text-xs text-[#94A3B8] ml-1 sm:ml-2">
              <span className="text-white font-medium">{formatTime(currentTime)}</span>
              <span className="mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Speed, Theatre, Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2 relative">
            {/* Speed Selector */}
            <div className="relative">
              <button
                onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono font-medium transition-colors"
                title="Playback Speed"
              >
                {playbackSpeed}x
              </button>

              {isSpeedMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 py-1.5 px-1 bg-[#131926] border border-[#1E293B] rounded-xl shadow-xl flex flex-col gap-1 min-w-[75px] z-50 animate-in fade-in zoom-in-95 duration-100">
                  {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => changeSpeed(speed)}
                      className={`px-3 py-1 text-xs font-mono text-left rounded-lg transition-colors ${
                        playbackSpeed === speed
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-[#94A3B8] hover:text-white hover:bg-[#1B2234]'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theatre Mode Toggle */}
            {onToggleTheatre && (
              <button
                onClick={onToggleTheatre}
                className="p-1.5 text-[#94A3B8] hover:text-white transition-colors hidden md:inline-block"
                title={isTheatre ? 'Default View' : 'Theatre Mode'}
              >
                <Tv className="w-4 h-4" />
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-[#94A3B8] hover:text-white transition-colors"
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
