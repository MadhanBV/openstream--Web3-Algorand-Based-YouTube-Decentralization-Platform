import React, { useState } from 'react'
import { Database, Check, Copy } from 'lucide-react'

interface IPFSBadgeProps {
  cid: string
  showCopy?: boolean
  className?: string
}

export const IPFSBadge: React.FC<IPFSBadgeProps> = ({ cid, showCopy = true, className = '' }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(cid)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const truncatedCid = `${cid.slice(0, 6)}...${cid.slice(-4)}`

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0A0D14]/90 border border-[#1E293B] text-[11px] font-mono text-[#94A3B8] backdrop-blur-sm shadow-sm ${className}`}
      title={`IPFS Content ID: ${cid}`}
    >
      <Database className="w-3 h-3 text-indigo-400 shrink-0" />
      <span className="font-semibold text-emerald-400">IPFS</span>
      <span className="text-[#475569]">|</span>
      <span>{truncatedCid}</span>

      {showCopy && (
        <button
          onClick={handleCopy}
          className="ml-0.5 p-0.5 hover:text-white transition-colors"
          title="Copy IPFS CID"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-[#94A3B8]" />}
        </button>
      )}
    </div>
  )
}
