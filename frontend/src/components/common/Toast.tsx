import React from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export interface ToastMessage {
  id: string
  type?: 'success' | 'info' | 'error'
  title: string
  message?: string
}

interface ToastProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success' || !toast.type
        const isError = toast.type === 'error'

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl bg-[#131926]/95 backdrop-blur-md border shadow-2xl transition-all animate-in slide-in-from-bottom-3 duration-200 ${
              isSuccess
                ? 'border-emerald-500/30 shadow-emerald-950/20'
                : isError
                ? 'border-rose-500/30 shadow-rose-950/20'
                : 'border-indigo-500/30 shadow-indigo-950/20'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {isError && <AlertCircle className="w-4 h-4 text-rose-400" />}
              {!isSuccess && !isError && <Info className="w-4 h-4 text-indigo-400" />}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="text-xs font-semibold text-[#F8FAFC]">
                {toast.title}
              </div>
              {toast.message && (
                <div className="text-[11px] text-[#94A3B8] font-mono mt-0.5 leading-snug">
                  {toast.message}
                </div>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 p-1 text-[#94A3B8] hover:text-white rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
