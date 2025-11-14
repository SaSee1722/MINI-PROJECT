import { useEffect, useState } from 'react'

const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 100)
    
    // Auto-close timer
    const timer = setTimeout(() => {
      handleClose()
    }, duration)
    
    return () => clearTimeout(timer)
  }, [duration])

  const handleClose = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const icons = {
    success: (
      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    ),
    error: (
      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    ),
    info: (
      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
    warning: (
      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
    )
  }

  const styles = {
    success: 'bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white shadow-green-500/25',
    error: 'bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 text-white shadow-red-500/25',
    info: 'bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 text-white shadow-blue-500/25',
    warning: 'bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500 text-white shadow-yellow-500/25'
  }

  const animationClass = isLeaving 
    ? 'animate-slideOutRight' 
    : isVisible 
    ? 'animate-slideInRight' 
    : 'translate-x-full opacity-0'

  return (
    <div className={`fixed top-6 right-6 z-50 transition-all duration-300 ease-out ${animationClass}`}>
      <div className={`${styles[type]} rounded-2xl shadow-2xl p-5 flex items-center gap-4 min-w-[350px] max-w-md border border-white/30 backdrop-blur-sm relative overflow-hidden`}>
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent animate-shimmer"></div>
        
        <div className="flex-shrink-0 relative z-10">
          {icons[type]}
        </div>
        
        <div className="flex-1 relative z-10">
          <p className="font-bold text-base leading-tight">{message}</p>
        </div>
        
        <button 
          onClick={handleClose}
          className="flex-shrink-0 hover:bg-white/20 rounded-full p-2 transition-all duration-200 hover:scale-110 relative z-10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 h-1 bg-white/30 animate-shrink" style={{animationDuration: `${duration}ms`}}></div>
      </div>
    </div>
  )
}

// Toast Container for multiple toasts
export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-6 right-6 z-50 space-y-3">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

export default Toast
