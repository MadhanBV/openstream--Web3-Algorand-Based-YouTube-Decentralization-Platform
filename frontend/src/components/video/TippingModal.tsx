import React, { useState } from 'react'
import { X, Coins, CheckCircle2, Loader2, ExternalLink } from 'lucide-react'
import type { Creator } from '../../types'

interface TippingModalProps {
  isOpen: boolean
  onClose: () => void
  creator: Creator
  walletConnected: boolean
  onOpenConnectWallet: () => void
}

export const TippingModal: React.FC<TippingModalProps> = ({
  isOpen,
  onClose,
  creator,
  walletConnected,
  onOpenConnectWallet
}) => {
  const [amount, setAmount] = useState<number>(5)
  const [customAmount, setCustomAmount] = useState('')
  const [status, setStatus] = useState<'idle' | 'broadcasting' | 'confirmed'>('idle')
  const [txId, setTxId] = useState('')

  if (!isOpen) return null

  const handleSendTip = () => {
    setStatus('broadcasting')
    setTimeout(() => {
      setStatus('confirmed')
      setTxId('ALGO_TIP_' + Math.random().toString(36).substring(2, 10).toUpperCase())
    }, 1500)
  }

  const tipAmount = customAmount ? parseFloat(customAmount) || 0 : amount

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#131926] border border-[#1E293B] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1B2234]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base text-[#F8FAFC]">
              Direct Creator Micro-Tip
            </h2>
            <div className="text-xs text-[#94A3B8]">
              Send on-chain ALGO directly to <span className="text-white font-medium">@{creator.handle}</span>
            </div>
          </div>
        </div>

        {status === 'idle' && (
          <div>
            {/* Creator Recipient Box */}
            <div className="p-3 rounded-xl bg-[#0A0D14] border border-[#1E293B] mb-4 flex items-center gap-3">
              <img
                src={creator.avatar}
                alt={creator.name}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-indigo-500/30"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{creator.name}</div>
                <div className="text-[11px] font-mono text-[#94A3B8] truncate">
                  {creator.walletAddress}
                </div>
              </div>
            </div>

            {/* Amount Selection */}
            <label className="block text-xs font-medium text-[#94A3B8] mb-2">
              Select Tip Amount (ALGO)
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[1, 5, 10, 25].map(val => (
                <button
                  key={val}
                  onClick={() => {
                    setAmount(val)
                    setCustomAmount('')
                  }}
                  className={`py-2 rounded-xl text-xs font-bold font-mono transition-all border ${
                    amount === val && !customAmount
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-[#0A0D14] border-[#1E293B] text-[#94A3B8] hover:text-white hover:border-[#334155]'
                  }`}
                >
                  {val} ALGO
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="relative mb-5">
              <input
                type="number"
                placeholder="Custom ALGO amount..."
                value={customAmount}
                onChange={e => {
                  setCustomAmount(e.target.value)
                  setAmount(0)
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0D14] border border-[#1E293B] text-xs font-mono text-white placeholder-[#475569] focus:outline-none focus:border-indigo-500"
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-mono text-[#94A3B8]">
                ALGO
              </span>
            </div>

            {walletConnected ? (
              <button
                onClick={handleSendTip}
                disabled={tipAmount <= 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 active:scale-[0.99] transition-all"
              >
                Send {tipAmount} ALGO Tip
              </button>
            ) : (
              <div className="text-center">
                <p className="text-xs text-[#94A3B8] mb-2.5">
                  You must connect your Pera Wallet to send on-chain tips.
                </p>
                <button
                  onClick={() => {
                    onClose()
                    onOpenConnectWallet()
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors"
                >
                  Connect Wallet First
                </button>
              </div>
            )}
          </div>
        )}

        {status === 'broadcasting' && (
          <div className="py-8 text-center flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-3" />
            <h3 className="font-semibold text-sm text-white">Broadcasting to Algorand Testnet...</h3>
            <p className="text-xs text-[#94A3B8] mt-1">
              Constructing atomic transfer to creator address
            </p>
          </div>
        )}

        {status === 'confirmed' && (
          <div className="py-6 text-center flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
            <h3 className="font-semibold text-base text-white">Tip Confirmed On-Chain!</h3>
            <p className="text-xs text-[#94A3B8] mt-1">
              Sent {tipAmount} ALGO to @{creator.handle}
            </p>
            <div className="my-4 px-3 py-2 rounded-lg bg-[#0A0D14] border border-[#1E293B] text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
              <span>TxID: {txId}</span>
              <ExternalLink className="w-3 h-3 text-[#94A3B8]" />
            </div>
            <button
              onClick={() => {
                setStatus('idle')
                onClose()
              }}
              className="px-6 py-2 rounded-xl bg-[#1B2234] hover:bg-[#232B42] text-xs font-semibold text-white transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
