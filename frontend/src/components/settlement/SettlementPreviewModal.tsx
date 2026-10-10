import React, { useState, useEffect } from 'react'
import {
  X,
  ShieldCheck,
  Coins,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import {
  settlementService,
  type SettlementBatchPreviewResponse,
  type SettlementExecuteResponse,
} from '../../services/settlementService'

interface SettlementPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  onToast?: (title: string, message?: string, type?: 'success' | 'info' | 'error') => void
}

export const SettlementPreviewModal: React.FC<SettlementPreviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onToast,
}) => {
  const [preview, setPreview] = useState<SettlementBatchPreviewResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [note, setNote] = useState('OpenStream Creator Payout')
  const [result, setResult] = useState<SettlementExecuteResponse | null>(null)

  useEffect(() => {
    if (isOpen) {
      setResult(null)
      setIsLoading(true)
      settlementService
        .getPreview()
        .then((data) => setPreview(data))
        .catch((err) => {
          if (onToast) onToast('Preview Error', err.message || 'Could not load settlement preview', 'error')
        })
        .finally(() => setIsLoading(false))
    }
  }, [isOpen, onToast])

  if (!isOpen) return null

  const handleExecute = async () => {
    if (!preview || preview.total_creators === 0 || isExecuting) return
    setIsExecuting(true)

    const idempotencyKey = `payout-batch-${Date.now()}`
    try {
      const res = await settlementService.executeBatch({
        idempotency_key: idempotencyKey,
        note,
      })
      setResult(res)
      if (onToast) {
        onToast(
          'Settlement Broadcasted',
          `Processed ${res.settlements_created} payouts (${Number(res.total_amount_algo).toFixed(2)} ALGO)`,
          'success'
        )
      }
      onSuccess?.()
    } catch (err: any) {
      if (onToast) {
        onToast('Execution Failed', err.message || 'Could not broadcast settlement', 'error')
      }
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0D121F] border border-[#1E293B] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-white">
                Admin Settlement Review & Payout
              </h3>
              <p className="text-xs text-[#94A3B8] font-mono">
                Algorand TestNet • Two-Phase Row Locking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 font-mono text-xs">
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#94A3B8]">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <span>Auditing pending reward ledger...</span>
            </div>
          )}

          {!isLoading && result && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Settlement Confirmed on Algorand TestNet!</span>
                </div>
                <p className="text-xs text-emerald-200/90 leading-relaxed font-sans">
                  {result.message}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider block">
                  Broadcasted Transactions:
                </span>
                {result.settlements.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl bg-[#070A12] border border-[#1E293B] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-white font-semibold flex items-center gap-2">
                        <span>Creator #{s.creator_id}</span>
                        <span className="text-emerald-400 font-bold">
                          +{Number(s.amount).toFixed(2)} ALGO
                        </span>
                      </div>
                      <div className="text-[10px] text-[#64748B] truncate max-w-sm mt-0.5">
                        TxID: {s.transaction_id}
                      </div>
                    </div>

                    {s.explorer_url && (
                      <a
                        href={s.explorer_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-[#131926] hover:bg-[#1E293B] text-indigo-400 text-xs flex items-center gap-1 transition-colors"
                      >
                        <span>Explorer</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isLoading && !result && preview && (
            <div className="space-y-5">
              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#070A12] border border-[#1E293B]">
                  <span className="text-[10px] text-[#64748B] uppercase block">
                    Eligible Creators
                  </span>
                  <span className="text-lg font-bold text-white mt-0.5 block">
                    {preview.total_creators}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#070A12] border border-[#1E293B]">
                  <span className="text-[10px] text-[#64748B] uppercase block">
                    Payout Amount
                  </span>
                  <span className="text-lg font-bold text-emerald-400 mt-0.5 block">
                    {Number(preview.total_amount_algo).toFixed(2)} ALGO
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#070A12] border border-[#1E293B]">
                  <span className="text-[10px] text-[#64748B] uppercase block">
                    Integer Units
                  </span>
                  <span className="text-sm font-bold text-indigo-400 mt-1 block truncate">
                    {preview.total_amount_microalgos.toLocaleString()} µA
                  </span>
                </div>
              </div>

              {/* Creators Breakdown */}
              <div className="space-y-2">
                <span className="text-[11px] text-[#94A3B8] uppercase tracking-wider block">
                  Eligible Creator Payout Receivers:
                </span>
                {preview.creators.length > 0 ? (
                  <div className="divide-y divide-[#1E293B] rounded-2xl bg-[#070A12] border border-[#1E293B] overflow-hidden">
                    {preview.creators.map((c) => (
                      <div
                        key={c.creator_id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#0D121F] transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-semibold">@{c.username}</span>
                            {c.is_valid_address ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Address Validated
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Invalid Address
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#64748B] truncate font-mono mt-0.5">
                            {c.wallet_address || 'No wallet registered'}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-emerald-400 font-bold text-sm">
                            +{Number(c.amount_algo).toFixed(2)} ALGO
                          </div>
                          <div className="text-[10px] text-[#64748B]">
                            {c.pending_rewards_count} pending rewards
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-2xl bg-[#070A12] border border-[#1E293B] text-[#94A3B8]">
                    <Coins className="w-8 h-8 text-indigo-400 mx-auto mb-2 opacity-50" />
                    <span>No uncredited rewards pending settlement.</span>
                  </div>
                )}
              </div>

              {/* Transaction Note */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-[#64748B] block">
                  Algorand Transaction Note (On-Chain Memo)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#070A12] border border-[#1E293B] focus:border-indigo-500 text-white font-mono text-xs outline-none"
                  placeholder="Memo recorded on-chain..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 border-t border-[#1E293B] flex items-center justify-between gap-3 bg-[#0A0D17]">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#131926] hover:bg-[#1E293B] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
          >
            {result ? 'Close' : 'Cancel'}
          </button>

          {!result && (
            <button
              onClick={handleExecute}
              disabled={isExecuting || !preview || preview.total_creators === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting to Algorand TestNet...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Confirm & Broadcast Payout</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
