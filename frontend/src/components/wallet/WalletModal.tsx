import React, { useState } from 'react'
import {
  X,
  Wallet,
  ShieldCheck,
  QrCode,
  Smartphone,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  KeyRound,
  Sparkles,
} from 'lucide-react'
import { peraWalletService } from '../../services/peraWalletService'
import { useAuth } from '../../context/AuthContext'

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (address: string) => void
  currentAddress?: string | null
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  currentAddress,
}) => {
  const { user, isAuthenticated, loginWithWallet } = useAuth()
  const [activeTab, setActiveTab] = useState<'mobile' | 'web'>('mobile')
  const [isConnecting, setIsConnecting] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authStepMessage, setAuthStepMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [connectedAddress, setConnectedAddress] = useState<string | null>(currentAddress || null)

  if (!isOpen) return null

  const handleConnectPera = async () => {
    setIsConnecting(true)
    setErrorMessage(null)

    try {
      const address = await peraWalletService.connectWallet()
      setConnectedAddress(address)
      setIsConnecting(false)
      onConnect(address)
    } catch (err: any) {
      setIsConnecting(false)
      const msg = err.message || 'Failed to connect Pera Wallet.'
      if (!msg.includes('cancelled')) {
        setErrorMessage(msg)
      }
    }
  }

  const handleCryptographicSignIn = async () => {
    const targetAddr = connectedAddress || currentAddress
    if (!targetAddr) return

    setIsAuthenticating(true)
    setErrorMessage(null)
    setAuthStepMessage('Requesting SIWA cryptographic challenge...')

    try {
      setAuthStepMessage('Please approve signature in your Pera Wallet...')
      await loginWithWallet(targetAddr)
      setAuthStepMessage('Cryptographic proof verified! Authenticated.')

      setTimeout(() => {
        setIsAuthenticating(false)
        onClose()
      }, 1200)
    } catch (err: any) {
      setIsAuthenticating(false)
      setAuthStepMessage('')
      const msg = err.message || 'Cryptographic signature verification failed.'
      setErrorMessage(msg)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#131926] border border-[#1E293B] p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={() => {
            if (!isConnecting && !isAuthenticating) onClose()
          }}
          disabled={isConnecting || isAuthenticating}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1B2234] transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-[#F8FAFC]">
              {connectedAddress ? 'Pera Wallet Hub' : 'Connect Pera Wallet'}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Algorand TestNet (416002)
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Authentication Error</p>
              <p className="text-[11px] text-rose-300/80 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {isAuthenticating ? (
          <div className="py-8 flex flex-col items-center text-center animate-in fade-in">
            <div className="relative mb-4">
              <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
              <KeyRound className="w-5 h-5 text-indigo-400 absolute inset-0 m-auto" />
            </div>
            <h3 className="font-semibold text-sm text-[#F8FAFC]">
              Cryptographic Wallet Verification
            </h3>
            <p className="text-xs text-amber-400/90 font-mono mt-2 animate-pulse max-w-xs">
              {authStepMessage}
            </p>
            <p className="text-[11px] text-[#94A3B8] mt-3">
              Zero transaction cost • Offline 0-ALGO proof signature
            </p>
          </div>
        ) : isConnecting ? (
          <div className="py-10 flex flex-col items-center text-center animate-in fade-in">
            <Loader2 className="w-12 h-12 text-amber-400 animate-spin mb-4" />
            <h3 className="font-semibold text-sm text-[#F8FAFC]">
              Awaiting Pera Wallet Approval...
            </h3>
            <p className="text-xs text-[#94A3B8] mt-2 max-w-xs leading-relaxed">
              Please approve the connection request on your Pera mobile app or Pera Web prompt.
            </p>
            <div className="mt-4 px-3 py-1.5 rounded-lg bg-[#0A0D14] border border-[#1E293B] text-[11px] font-mono text-amber-400/90">
              Handshake: Algorand TestNet (Chain 416002)
            </div>
          </div>
        ) : connectedAddress ? (
          <div className="space-y-4">
            {/* Connected Card */}
            <div className="p-4 rounded-xl bg-[#0A0D14] border border-[#1E293B]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-white">Algorand Account</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {isAuthenticated ? 'Authenticated & Bound' : 'Wallet Connected'}
                </span>
              </div>
              <div className="font-mono text-xs text-indigo-300 break-all bg-[#131926] p-2.5 rounded-lg border border-[#1E293B]">
                {connectedAddress}
              </div>
            </div>

            {/* Authenticated State vs Cryptographic Sign-in Action */}
            {isAuthenticated ? (
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Cryptographically Authenticated</span>
                </div>
                <p className="text-[11px] text-[#94A3B8]">
                  Signed in as <span className="text-white font-medium">@{user?.username}</span> with verified Ed25519 wallet ownership.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/40 to-purple-950/40 border border-indigo-500/20 text-center space-y-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-white">Sign In with Cryptographic Proof</h4>
                  <p className="text-[11px] text-[#94A3B8] mt-1">
                    Sign a one-time SIWA challenge to log in securely without passwords.
                  </p>
                </div>
                <button
                  onClick={handleCryptographicSignIn}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Sign In with Algorand Proof</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Tabs: Mobile App vs Web Browser */}
            <div className="flex p-1 rounded-xl bg-[#0A0D14] border border-[#1E293B] mb-5">
              <button
                onClick={() => setActiveTab('mobile')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'mobile'
                    ? 'bg-[#1B2234] text-white shadow-sm border border-[#1E293B]'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>Pera Mobile App</span>
              </button>
              <button
                onClick={() => setActiveTab('web')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'web'
                    ? 'bg-[#1B2234] text-white shadow-sm border border-[#1E293B]'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4 text-indigo-400" />
                <span>Pera Web / Extension</span>
              </button>
            </div>

            {activeTab === 'mobile' ? (
              <div className="p-5 rounded-xl bg-[#0A0D14] border border-[#1E293B] mb-5 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-sm text-[#F8FAFC] mb-1">
                  Connect via Pera Mobile App
                </h3>
                <p className="text-xs text-[#94A3B8] mb-3 leading-relaxed">
                  Open official Pera Wallet Connect modal with QR code & mobile deep-link on TestNet.
                </p>
                <div className="text-[11px] font-mono text-[#64748B] flex items-center justify-center gap-1.5">
                  <span>Pera iOS & Android</span>
                  <span>•</span>
                  <span>Zero-Trust Protocol</span>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-[#0A0D14] border border-[#1E293B] mb-5 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-sm text-[#F8FAFC] mb-1">
                  Connect via Pera Web / Extension
                </h3>
                <p className="text-xs text-[#94A3B8] mb-3 leading-relaxed">
                  Connect instantly via Pera browser extension or Pera Web on Algorand TestNet.
                </p>
                <a
                  href="https://perawallet.app/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <span>Learn more about Pera Wallet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Launch Real Pera Connect Flow */}
            <button
              onClick={handleConnectPera}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-amber-500/25 active:scale-[0.99] transition-all cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              <span>Launch Pera Connect</span>
            </button>
          </div>
        )}

        {/* Security Assurance Disclaimer */}
        <div className="mt-5 pt-4 border-t border-[#1E293B] flex items-start gap-2.5 text-[11px] text-[#475569]">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            OpenStream never accesses or stores your private keys. Cryptographic authentication uses standard Ed25519 signatures.
          </span>
        </div>
      </div>
    </div>
  )
}
