import React, { useState, useEffect, useCallback } from 'react'
import {
  Wallet,
  Coins,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Loader2,
  RefreshCw,
  Calculator
} from 'lucide-react'
import type { Creator, WalletState } from '../types'
import { useAuth } from '../context/AuthContext'
import { rewardService, type CreatorRewardSummary, type RewardEntry } from '../services/rewardService'
import { settlementService, type SettlementRecordResponse } from '../services/settlementService'
import { SettlementPreviewModal } from '../components/settlement/SettlementPreviewModal'

interface StudioWalletPageProps {
  creator: Creator
  wallet: WalletState
  onOpenConnectWallet: () => void
  onDisconnectWallet: () => void
  onToast?: (title: string, message?: string, type?: 'success' | 'info' | 'error') => void
}

export const StudioWalletPage: React.FC<StudioWalletPageProps> = ({
  creator,
  wallet,
  onOpenConnectWallet,
  onDisconnectWallet,
  onToast
}) => {
  const { user, isAuthenticated } = useAuth()
  const [onChainSettlements, setOnChainSettlements] = useState<SettlementRecordResponse[]>([])
  const [isLoadingSettlements, setIsLoadingSettlements] = useState(false)
  const [reconcilingId, setReconcilingId] = useState<number | null>(null)
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false)
  const [unsettledBalance, setUnsettledBalance] = useState<number>(0.0)
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null)
  const [copiedAddr, setCopiedAddr] = useState(false)

  // Phase 11 Reward Engine state
  const [rewardSummary, setRewardSummary] = useState<CreatorRewardSummary | null>(null)
  const [isLoadingRewards, setIsLoadingRewards] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [activeLedgerTab, setActiveLedgerTab] = useState<'rewards' | 'settlements'>('rewards')

  const loadRewards = useCallback(async () => {
    setIsLoadingRewards(true)
    try {
      let data: CreatorRewardSummary | null = null
      if (isAuthenticated) {
        data = await rewardService.getMyRewards()
      } else {
        const creatorNumId = parseInt(creator.id, 10)
        if (!isNaN(creatorNumId)) {
          data = await rewardService.getCreatorRewards(creatorNumId)
        }
      }

      if (data) {
        setRewardSummary(data)
        setUnsettledBalance(Number(data.pending_rewards_algo))
      }
    } catch {
      // Fallback gracefully to mock data for demonstration
    } finally {
      setIsLoadingRewards(false)
    }
  }, [isAuthenticated, creator.id])

  const loadSettlements = useCallback(async () => {
    setIsLoadingSettlements(true)
    try {
      const data = await settlementService.getSettlements()
      setOnChainSettlements(data || [])
    } catch {
      setOnChainSettlements([])
    } finally {
      setIsLoadingSettlements(false)
    }
  }, [])

  useEffect(() => {
    loadRewards()
    loadSettlements()
  }, [loadRewards, loadSettlements])

  const handleCalculateRewards = async () => {
    setIsCalculating(true)
    try {
      const res = await rewardService.calculateRewards()
      if (onToast) {
        onToast(
          'Rewards Calculated',
          res.rewards_created > 0
            ? `Created ${res.rewards_created} reward records for ${res.total_views_credited} qualified views (+${res.total_amount} ALGO).`
            : res.message,
          res.rewards_created > 0 ? 'success' : 'info'
        )
      }
      await loadRewards()
    } catch (err: any) {
      if (onToast) {
        onToast('Calculation Note', err.message || 'Please log in as creator to calculate rewards.', 'error')
      }
    } finally {
      setIsCalculating(false)
    }
  }

  const handleReconcile = async (settlementId: number) => {
    setReconcilingId(settlementId)
    try {
      const res = await settlementService.reconcile(settlementId)
      if (onToast) {
        onToast('Reconciliation Result', res.message, 'info')
      }
      await loadSettlements()
      await loadRewards()
    } catch (err: any) {
      if (onToast) {
        onToast('Reconciliation Error', err.message || 'Failed to reconcile settlement', 'error')
      }
    } finally {
      setReconcilingId(null)
    }
  }

  const handleCopyAddr = () => {
    const addr = wallet.address || creator.walletAddress
    navigator.clipboard.writeText(addr)
    setCopiedAddr(true)
    if (onToast) onToast('Wallet Address Copied', addr, 'info')
    setTimeout(() => setCopiedAddr(false), 2000)
  }

  const handleCopyTx = (txId: string) => {
    navigator.clipboard.writeText(txId)
    setCopiedTxId(txId)
    if (onToast) onToast('Transaction ID Copied', txId, 'info')
    setTimeout(() => setCopiedTxId(null), 2000)
  }

  const handleRequestSettlement = () => {
    setIsSettlementModalOpen(true)
  }

  const effectivePendingAlgo = rewardSummary
    ? Number(rewardSummary.pending_rewards_algo)
    : unsettledBalance
  const effectiveTotalEarned = rewardSummary
    ? Number(rewardSummary.total_earned_algo)
    : creator.totalEarnedAlgo
  const effectiveQualifiedViews = rewardSummary
    ? rewardSummary.total_qualified_views
    : 0

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 mb-1">
            <span>Creator Studio</span>
            <span>•</span>
            <span className="text-emerald-400">Algorand Testnet Settlement</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#F8FAFC]">
            Wallet & Rewards Hub
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
            Track transparent on-chain video view rewards and manage cryptographic payout settlements.
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {user?.isAdmin && (
            <div className="px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-mono text-purple-300 flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Admin Privileges</span>
            </div>
          )}
          <div className="px-3 py-1.5 rounded-xl bg-[#131926] border border-[#1E293B] text-xs font-mono text-emerald-400 flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Network: Algorand Testnet</span>
          </div>
        </div>
      </div>

      {/* Grid: Connected Wallet Card + Settlement Action Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Connected Wallet Info (Left 6 cols) */}
        <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-[#131926] border border-[#1E293B] flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-sm text-white">
                    Pera Wallet State
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {wallet.isConnected ? 'Connected & Verified' : 'Not Connected'}
                  </span>
                </div>
              </div>

              {wallet.isConnected ? (
                <button
                  onClick={onDisconnectWallet}
                  className="px-2.5 py-1 rounded-lg bg-[#0A0D14] hover:bg-rose-500/10 text-rose-400 text-xs border border-[#1E293B] hover:border-rose-500/30 transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={onOpenConnectWallet}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors"
                >
                  Connect Wallet
                </button>
              )}
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1E293B]">
                <div className="text-[10px] text-[#475569] uppercase mb-1">
                  Algorand Public Address
                </div>
                <div className="flex items-center justify-between gap-2 text-white">
                  <span className="truncate">
                    {wallet.address || creator.walletAddress}
                  </span>
                  <button
                    onClick={handleCopyAddr}
                    className="p-1 hover:text-indigo-400 transition-colors shrink-0"
                    title="Copy Address"
                  >
                    {copiedAddr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#94A3B8]" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1E293B]">
                  <div className="text-[10px] text-[#475569] uppercase mb-1">
                    Wallet Balance
                  </div>
                  <div className="text-sm font-bold text-white">
                    {wallet.balanceAlgo.toFixed(2)} ALGO
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1E293B]">
                  <div className="text-[10px] text-[#475569] uppercase mb-1">
                    Signature Algorithm
                  </div>
                  <div className="text-xs text-indigo-400 font-semibold">
                    ed25519 standard
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-[#475569]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Private keys never leave your Pera device
            </span>
          </div>
        </div>

        {/* Settlement & Reward Action Card (Right 6 cols) */}
        <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-[#131926] border border-[#1E293B] flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-sm text-white">
                    Creator Reward Ledger
                  </h3>
                  <span className="text-[11px] font-mono text-[#94A3B8]">
                    Valid 30s+ View Accruals
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadRewards}
                  disabled={isLoadingRewards}
                  className="p-1.5 rounded-lg bg-[#0A0D14] border border-[#1E293B] text-[#94A3B8] hover:text-white hover:border-indigo-500/30 transition-colors"
                  title="Refresh Rewards"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRewards ? 'animate-spin text-indigo-400' : ''}`} />
                </button>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono font-semibold">
                  Rate: 0.05 ALGO / view
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-1">
                  <span>Pending Accrued Rewards</span>
                  <span className="text-emerald-400 font-semibold">
                    {effectivePendingAlgo > 0 ? 'Eligible for Settlement' : 'Settled'}
                  </span>
                </div>
                <div className="font-display font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                  {effectivePendingAlgo.toFixed(2)} <span className="text-indigo-400 text-2xl font-bold">ALGO</span>
                </div>
                <p className="text-[11px] text-[#475569] font-mono mt-1">
                  Calculated from server-validated 30s+ watch sessions in PostgreSQL
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-2">
                <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-[#1E293B]">
                  <div className="text-[10px] text-[#475569] uppercase font-mono">
                    Lifetime Earned
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                    {effectiveTotalEarned.toFixed(2)} ALGO
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-[#1E293B]">
                  <div className="text-[10px] text-[#475569] uppercase font-mono">
                    Qualified Views
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-indigo-400 mt-0.5">
                    {effectiveQualifiedViews.toLocaleString()}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#0A0D14] border border-[#1E293B]">
                  <div className="text-[10px] text-[#475569] uppercase font-mono">
                    Platform Cut
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-emerald-400 mt-0.5">
                    0% (100% Creator)
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#1E293B] space-y-2.5">
            {/* Calculation Button (Phase 11 Engine) */}
            <button
              onClick={handleCalculateRewards}
              disabled={isCalculating}
              className="w-full py-2.5 px-3 rounded-xl bg-[#1B2234] hover:bg-[#222B42] border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-300 text-xs font-semibold font-mono transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Calculating Eligible Views...</span>
                </>
              ) : (
                <>
                  <Calculator className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Calculate Pending Rewards (Phase 11 Engine)</span>
                </>
              )}
            </button>

            {/* Settlement Action Button */}
            <button
              onClick={handleRequestSettlement}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {effectivePendingAlgo > 0
                  ? `Review & Settle ${effectivePendingAlgo.toFixed(2)} ALGO On-Chain`
                  : 'Open Settlement Review & Audit'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Container with Tabs */}
      <div className="rounded-2xl bg-[#131926] border border-[#1E293B] p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#1E293B]">
          <div>
            <h2 className="font-display font-bold text-lg text-white">
              Creator Rewards & Payout Ledger
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Transparent view credit batches and Algorand Testnet settlement history.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-[#0A0D14] p-1 rounded-xl border border-[#1E293B] self-start sm:self-auto font-mono text-xs">
            <button
              onClick={() => setActiveLedgerTab('rewards')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeLedgerTab === 'rewards'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Calculated Rewards ({rewardSummary?.rewards?.length ?? 0})
            </button>
            <button
              onClick={() => setActiveLedgerTab('settlements')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeLedgerTab === 'settlements'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <span>On-Chain Settlements ({onChainSettlements.length})</span>
              {isLoadingSettlements && <Loader2 className="w-3 h-3 animate-spin text-indigo-300" />}
            </button>
          </div>
        </div>

        {/* Tab 1: Calculated Rewards Ledger (Phase 11) */}
        {activeLedgerTab === 'rewards' && (
          <div className="overflow-x-auto">
            {rewardSummary && rewardSummary.rewards && rewardSummary.rewards.length > 0 ? (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0A0D14] border-y border-[#1E293B] text-[#94A3B8] uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Batch ID</th>
                    <th className="py-3 px-4">Target Video</th>
                    <th className="py-3 px-4">Qualified Views</th>
                    <th className="py-3 px-4">Reward Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created At (UTC)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/60">
                  {rewardSummary.rewards.map((r: RewardEntry) => (
                    <tr key={r.id} className="hover:bg-[#1B2234]/50 transition-colors">
                      <td className="py-3.5 px-4 text-[#94A3B8]">
                        #REW-{r.id}
                      </td>
                      <td className="py-3.5 px-4 text-white">
                        {r.video_id ? `Video #${r.video_id}` : 'Platform Aggregate'}
                      </td>
                      <td className="py-3.5 px-4 text-indigo-400 font-semibold">
                        {r.views_credited} verified views
                      </td>
                      <td className="py-3.5 px-4 text-emerald-400 font-bold">
                        +{Number(r.amount).toFixed(6)} ALGO
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          r.status === 'settled'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${r.status === 'settled' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                          {r.status === 'settled' ? 'Settled' : 'Pending Settlement'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#94A3B8]">
                        {new Date(r.created_at).toISOString().replace('T', ' ').substring(0, 19)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center bg-[#0A0D14] rounded-xl border border-[#1E293B]">
                <Coins className="w-10 h-10 text-indigo-400 mx-auto mb-2 opacity-50" />
                <h4 className="text-sm font-semibold text-white mb-1">No Uncredited Views or Pending Batches</h4>
                <p className="text-xs text-[#94A3B8] max-w-md mx-auto mb-4">
                  Stream videos and watch for 30s+ to accrue qualified views with anti-abuse protection, then run the calculation engine.
                </p>
                <button
                  onClick={handleCalculateRewards}
                  disabled={isCalculating}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all"
                >
                  Run Calculation Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: On-Chain Settlement History (Phase 12 Real + Fallback) */}
        {activeLedgerTab === 'settlements' && (
          <div className="overflow-x-auto">
            {onChainSettlements.length > 0 ? (
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#0A0D14] border-y border-[#1E293B] text-[#94A3B8] uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Settlement ID</th>
                    <th className="py-3 px-4">Timestamp (UTC)</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Block Height</th>
                    <th className="py-3 px-4">Transaction ID (TxID)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/60">
                  {onChainSettlements.map((item) => (
                    <tr key={item.id} className="hover:bg-[#1B2234]/50 transition-colors">
                      <td className="py-3.5 px-4 text-[#94A3B8]">
                        #SET-{item.id}
                      </td>

                      <td className="py-3.5 px-4 text-[#94A3B8]">
                        {new Date(item.created_at).toISOString().replace('T', ' ').substring(0, 19)}
                      </td>

                      <td className="py-3.5 px-4 text-emerald-400 font-bold">
                        +{Number(item.amount).toFixed(2)} ALGO
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          item.status === 'confirmed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : item.status === 'submitted'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            : item.status === 'failed'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'confirmed' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                          <span className="capitalize">{item.status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-white">
                        {item.confirmed_round ? `#${item.confirmed_round.toLocaleString()}` : 'Pending Block'}
                      </td>

                      <td className="py-3.5 px-4 text-indigo-400">
                        {item.transaction_id ? (
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[120px] sm:max-w-none">{item.transaction_id}</span>
                            <button
                              onClick={() => handleCopyTx(item.transaction_id!)}
                              className="hover:text-white p-0.5"
                              title="Copy TxID"
                            >
                              {copiedTxId === item.transaction_id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-[#94A3B8]" />
                              )}
                            </button>
                            <a
                              href={item.explorer_url || `https://lora.algokit.io/testnet/transaction/${item.transaction_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-white p-0.5"
                              title="View in Algorand Explorer"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-[#94A3B8]" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-[#64748B] italic">Pending Broadcast</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {(item.status === 'submitted' || item.status === 'processing') && (
                          <button
                            onClick={() => handleReconcile(item.id)}
                            disabled={reconcilingId === item.id}
                            className="px-2.5 py-1 rounded-lg bg-[#1B2234] hover:bg-[#222B42] text-xs font-semibold text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1.5 ml-auto"
                          >
                            <RefreshCw className={`w-3 h-3 ${reconcilingId === item.id ? 'animate-spin' : ''}`} />
                            <span>Reconcile</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center bg-[#0A0D14] rounded-xl border border-[#1E293B]">
                <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-50" />
                <h4 className="text-sm font-semibold text-white mb-1">No On-Chain Settlements Yet</h4>
                <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                  When creator earnings are batch-settled via Algorand TestNet atomic transfers, confirmed blockchain transactions and block heights will appear here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Phase 12: Admin Settlement Review & Payout Modal */}
      <SettlementPreviewModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        onSuccess={() => {
          loadRewards()
          loadSettlements()
        }}
        onToast={onToast}
      />
    </div>
  )
}
