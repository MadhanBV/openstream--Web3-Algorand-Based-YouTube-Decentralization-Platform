import React from 'react'
import {
  Database,
  Coins,
  Server,
  Cpu
} from 'lucide-react'

export const TransparencyPage: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono text-indigo-400">
          <Cpu className="w-3.5 h-3.5" />
          <span>Semi-Decentralized Protocol Blueprint</span>
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-[#F8FAFC]">
          Pragmatic Web3 Video Architecture
        </h1>
        <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
          OpenStream does not force blockchain into every layer. We deliberately combine conventional high-speed infrastructure with decentralized content storage and on-chain settlements.
        </p>
      </div>

      {/* Architecture Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Layer 1: PostgreSQL & FastAPI */}
        <div className="p-6 rounded-2xl bg-[#131926] border border-[#1E293B] flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
              <Server className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">
              Application & Query Layer
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
              PostgreSQL stores relational metadata, user profiles, video titles, and analytics. FastAPI delivers sub-50ms REST API responses without slow blockchain read queries.
            </p>
          </div>
          <div className="pt-4 border-t border-[#1E293B] text-[11px] font-mono text-[#475569]">
            <span>Powered by: </span>
            <span className="text-blue-400 font-semibold">FastAPI + PostgreSQL</span>
          </div>
        </div>

        {/* Layer 2: IPFS & Pinata */}
        <div className="p-6 rounded-2xl bg-[#131926] border border-[#1E293B] flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">
              Decentralized Storage Layer
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
              Video files never touch a centralized S3 bucket or slow database. Video blobs are pinned to IPFS nodes through Pinata, addressed by immutable cryptographic CIDs.
            </p>
          </div>
          <div className="pt-4 border-t border-[#1E293B] text-[11px] font-mono text-[#475569]">
            <span>Powered by: </span>
            <span className="text-indigo-400 font-semibold">IPFS / Pinata Pinning</span>
          </div>
        </div>

        {/* Layer 3: Algorand & Pera Wallet */}
        <div className="p-6 rounded-2xl bg-[#131926] border border-[#1E293B] flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
              <Coins className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">
              Settlement & Identity Layer
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed mb-4">
              Creators verify identity using Pera Wallet cryptographic signatures. View rewards are batched and settled directly on Algorand Testnet with instant finality.
            </p>
          </div>
          <div className="pt-4 border-t border-[#1E293B] text-[11px] font-mono text-[#475569]">
            <span>Powered by: </span>
            <span className="text-emerald-400 font-semibold">Algorand + Pera Wallet</span>
          </div>
        </div>
      </div>

      {/* Live Algorand Node & IPFS Gateway Telemetry Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#131926] border border-[#1E293B] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-xl text-white">
              Live Network Metrics
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Current operational parameters across the OpenStream hybrid infrastructure.
            </p>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#0A0D14] border border-[#1E293B] text-xs font-mono text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>All Systems Operational</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-[#0A0D14] border border-[#1E293B]">
            <div className="text-[10px] text-[#475569] uppercase mb-1">Block Time</div>
            <div className="text-base font-bold text-white">3.3 Seconds</div>
            <div className="text-[11px] text-emerald-400 mt-1">Instant Finality</div>
          </div>

          <div className="p-4 rounded-xl bg-[#0A0D14] border border-[#1E293B]">
            <div className="text-[10px] text-[#475569] uppercase mb-1">Fee Predictability</div>
            <div className="text-base font-bold text-white">0.001 ALGO</div>
            <div className="text-[11px] text-emerald-400 mt-1">Negligible Overhead</div>
          </div>

          <div className="p-4 rounded-xl bg-[#0A0D14] border border-[#1E293B]">
            <div className="text-[10px] text-[#475569] uppercase mb-1">IPFS Availability</div>
            <div className="text-base font-bold text-white">100% Pinned</div>
            <div className="text-[11px] text-emerald-400 mt-1">3 Geographical Regions</div>
          </div>

          <div className="p-4 rounded-xl bg-[#0A0D14] border border-[#1E293B]">
            <div className="text-[10px] text-[#475569] uppercase mb-1">View Anti-Abuse</div>
            <div className="text-base font-bold text-white">&gt; 30s Heartbeat</div>
            <div className="text-[11px] text-emerald-400 mt-1">Bot Filtering Active</div>
          </div>
        </div>
      </div>
    </div>
  )
}
