import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Sparkles,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  Video,
  KeyRound,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccessToast: (title: string, message?: string) => void
  initialMode?: 'login' | 'register'
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
  initialMode = 'login',
}) => {
  const { login, register, backendOnline } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegPassword, setShowRegPassword] = useState(false)

  // Remember me state
  const [rememberMe, setRememberMe] = useState(true)

  // Forgot password helper modal state
  const [showForgotHelper, setShowForgotHelper] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSubmitted, setForgotSubmitted] = useState(false)

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState(() => {
    return localStorage.getItem('openstream_saved_identifier') || ''
  })
  const [loginPassword, setLoginPassword] = useState('')

  // Register form state
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regDisplayName, setRegDisplayName] = useState('')
  const [regIsCreator, setRegIsCreator] = useState(true)

  // Synchronize initial mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      setErrorMessage(null)
      setShowForgotHelper(false)
      setForgotSubmitted(false)
    }
  }, [isOpen, initialMode])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Calculate password strength for empathetic feedback
  const passwordStrength = useMemo(() => {
    if (!regPassword) return { score: 0, text: '', color: 'bg-transparent' }
    let score = 0
    if (regPassword.length >= 8) score += 1
    if (/[A-Z]/.test(regPassword)) score += 1
    if (/[0-9]/.test(regPassword)) score += 1
    if (/[^A-Za-z0-9]/.test(regPassword)) score += 1

    if (score === 1) return { score: 25, text: 'Keep going (8+ chars)', color: 'bg-rose-500' }
    if (score === 2) return { score: 50, text: 'Getting stronger 🌿', color: 'bg-amber-400' }
    if (score === 3) return { score: 75, text: 'Great password! ✨', color: 'bg-emerald-400' }
    return { score: 100, text: 'Super secure & protected! 🛡️', color: 'bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.6)]' }
  }, [regPassword])

  if (!isOpen) return null

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setLoading(true)

    try {
      if (rememberMe) {
        localStorage.setItem('openstream_saved_identifier', loginIdentifier.trim())
      } else {
        localStorage.removeItem('openstream_saved_identifier')
      }

      await login({
        username_or_email: loginIdentifier.trim(),
        password: loginPassword,
      })
      onSuccessToast('Welcome Back!', 'You have successfully signed in to OpenStream.')
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect username/email or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setLoading(true)

    try {
      await register({
        username: regUsername.trim().toLowerCase(),
        email: regEmail.trim(),
        password: regPassword,
        display_name: regDisplayName.trim() || undefined,
        is_creator: regIsCreator,
      })

      // Auto login after registration
      await login({
        username_or_email: regUsername.trim().toLowerCase(),
        password: regPassword,
      })

      onSuccessToast(
        'Welcome to OpenStream!',
        regIsCreator
          ? 'Your Creator Account is ready! You can now publish to IPFS & earn ALGO.'
          : 'Your account is ready! Enjoy Web3 decentralized streaming.'
      )
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please check your credentials and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotEmail) return
    setForgotSubmitted(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/75 backdrop-blur-md transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      {/* Organic Background Ambient Glows */}
      <div className="fixed top-1/4 left-1/3 -translate-x-1/2 w-96 h-96 bg-emerald-700/20 rounded-full blur-[120px] pointer-events-none animate-pulse-subtle" />
      <div className="fixed bottom-1/4 right-1/3 translate-x-1/2 w-96 h-96 bg-teal-800/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Glass Container */}
      <div
        className="relative w-full max-w-[440px] glass-card-forest rounded-[28px] p-6 sm:p-8 pt-11 text-[#F8FAFC] shadow-2xl transition-all duration-300 animate-in zoom-in-95 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Specular Diagonal Sheen Reflection Layer */}
        <div className="glass-sheen-layer" />

        {/* Floating Top Avatar Node */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20">
          <div className="w-[74px] h-[74px] rounded-full glass-avatar-badge flex items-center justify-center border-2 border-white/30 transition-transform duration-300 hover:scale-105">
            {mode === 'login' ? (
              <div className="w-11 h-11 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-400/30 text-emerald-300 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25)]">
                <UserIcon className="w-5 h-5 stroke-[2.2]" />
              </div>
            ) : regIsCreator ? (
              <div className="w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-400/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.35)]">
                <Sparkles className="w-5 h-5 animate-pulse text-emerald-300 stroke-[2.2]" />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-400/30 text-emerald-300">
                <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          title="Close dialog"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Content */}
        {!showForgotHelper ? (
          <>
            {/* Header Greeting */}
            <div className="text-center mt-2 mb-6">
              <h2 className="text-xl font-bold font-display tracking-tight text-white/95">
                {mode === 'login' ? 'Welcome Back' : 'Join OpenStream'}
              </h2>
              <p className="text-xs text-white/65 mt-1 font-sans">
                {mode === 'login'
                  ? 'Access your channel, videos, and on-chain earnings'
                  : 'Decentralized video streaming with Algorand rewards'}
              </p>
            </div>

            {/* Mode Switcher Sliding Tabs */}
            <div className="flex rounded-xl bg-black/30 border border-white/10 p-1 mb-6 backdrop-blur-md">
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setErrorMessage(null)
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  mode === 'login'
                    ? 'bg-white/20 text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-white/25'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register')
                  setErrorMessage(null)
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  mode === 'register'
                    ? 'bg-white/20 text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-white/25'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Banner with Human Guidance */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
                <span className="font-semibold shrink-0 mt-0.5">⚠️</span>
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Mode: Sign In Form */}
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email / Username Field */}
                <div className="space-y-1.5">
                  <div className="flex items-stretch rounded-xl overflow-hidden glass-input-box transition-all">
                    <div className="w-12 bg-white/[0.08] border-r border-white/10 flex items-center justify-center text-white/70">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Email ID or Username"
                      className="flex-1 bg-transparent px-3.5 py-3 text-sm text-white placeholder-white/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-stretch rounded-xl overflow-hidden glass-input-box transition-all">
                    <div className="w-12 bg-white/[0.08] border-r border-white/10 flex items-center justify-center text-white/70">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Password"
                      className="flex-1 bg-transparent px-3.5 py-3 text-sm text-white placeholder-white/40 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      className="px-3 text-white/50 hover:text-white focus:outline-none transition-colors"
                      title={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-white/75 hover:text-white">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded bg-white/10 border-white/20 text-emerald-500 focus:ring-emerald-400/40 focus:ring-offset-0 transition-colors"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(loginIdentifier.includes('@') ? loginIdentifier : '')
                      setShowForgotHelper(true)
                    }}
                    className="text-white/60 hover:text-emerald-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Primary Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#1b3824] via-[#1f472d] to-[#1b3824] hover:from-[#234d31] hover:to-[#234d31] border border-white/25 text-white font-bold tracking-wider text-xs sm:text-sm uppercase shadow-lg shadow-black/40 hover:shadow-emerald-900/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                      <span>AUTHENTICATING...</span>
                    </>
                  ) : (
                    <>
                      <span>LOGIN</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Mode: Create Account Form */
              <form onSubmit={handleRegister} className="space-y-3.5 max-h-[62vh] overflow-y-auto pr-1">
                {/* Username Field */}
                <div className="space-y-1">
                  <div className="flex items-stretch rounded-xl overflow-hidden glass-input-box transition-all">
                    <div className="w-12 bg-white/[0.08] border-r border-white/10 flex items-center justify-center text-white/70">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={50}
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      placeholder="Username (e.g. alice_stream)"
                      className="flex-1 bg-transparent px-3.5 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-1">
                  <div className="flex items-stretch rounded-xl overflow-hidden glass-input-box transition-all">
                    <div className="w-12 bg-white/[0.08] border-r border-white/10 flex items-center justify-center text-white/70">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="Email ID (e.g. alice@domain.com)"
                      className="flex-1 bg-transparent px-3.5 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Display Name Field */}
                <div className="space-y-1">
                  <div className="flex items-stretch rounded-xl overflow-hidden glass-input-box transition-all">
                    <div className="w-12 bg-white/[0.08] border-r border-white/10 flex items-center justify-center text-white/70">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={regDisplayName}
                      onChange={(e) => setRegDisplayName(e.target.value)}
                      placeholder="Channel / Display Name (Optional)"
                      className="flex-1 bg-transparent px-3.5 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-stretch rounded-xl overflow-hidden glass-input-box transition-all">
                    <div className="w-12 bg-white/[0.08] border-r border-white/10 flex items-center justify-center text-white/70">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Create Password (min. 8 chars)"
                      className="flex-1 bg-transparent px-3.5 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword((prev) => !prev)}
                      className="px-3 text-white/50 hover:text-white focus:outline-none transition-colors"
                      title={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {regPassword && (
                    <div className="space-y-1 pt-1">
                      <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden border border-white/10">
                        <div
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${passwordStrength.score}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-white/60">
                        <span>Strength</span>
                        <span className="text-emerald-300 font-medium">{passwordStrength.text}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Creator Studio Account Selection Card */}
                <div
                  onClick={() => setRegIsCreator((prev) => !prev)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    regIsCreator
                      ? 'bg-emerald-950/40 border-emerald-500/40 shadow-sm'
                      : 'bg-black/20 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        regIsCreator ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/50'
                      }`}
                    >
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        Creator Channel Access
                        {regIsCreator && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Enabled
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-white/60">Upload to IPFS & earn Algorand rewards</div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      regIsCreator
                        ? 'bg-emerald-500 border-emerald-400 text-black'
                        : 'border-white/30 bg-white/5 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>

                {/* Primary Create Account Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#1b3824] via-[#1f472d] to-[#1b3824] hover:from-[#234d31] hover:to-[#234d31] border border-white/25 text-white font-bold tracking-wider text-xs sm:text-sm uppercase shadow-lg shadow-black/40 hover:shadow-emerald-900/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-300" />
                      <span>CREATING ACCOUNT...</span>
                    </>
                  ) : (
                    <>
                      <span>CREATE ACCOUNT</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Bottom Status & Security Seal */}
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50 font-sans">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bcrypt Encrypted & Secure</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${backendOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{backendOnline ? 'API Connected' : 'Offline Ready'}</span>
              </div>
            </div>
          </>
        ) : (
          /* Forgot Password Empathy Modal */
          <div className="mt-2 space-y-4 animate-in fade-in">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white font-display">Account Recovery</h3>
              <p className="text-xs text-white/65 mt-1">
                OpenStream accounts are secured cryptographically. Enter your registered email address to receive reset guidance.
              </p>
            </div>

            {!forgotSubmitted ? (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div className="flex items-stretch rounded-xl overflow-hidden glass-input-box transition-all">
                  <div className="w-12 bg-white/[0.08] border-r border-white/10 flex items-center justify-center text-white/70">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="flex-1 bg-transparent px-3.5 py-3 text-sm text-white placeholder-white/40 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowForgotHelper(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 font-semibold text-xs transition-colors"
                  >
                    Back to Login
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-bold text-xs shadow-lg transition-all"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto" />
                <div className="text-sm font-bold text-white">Reset Instructions Sent!</div>
                <div className="text-xs text-white/70 leading-relaxed">
                  If an account exists for <span className="font-mono text-emerald-200">{forgotEmail}</span>, you will receive a secure recovery email shortly.
                </div>
                <button
                  onClick={() => setShowForgotHelper(false)}
                  className="mt-3 w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
