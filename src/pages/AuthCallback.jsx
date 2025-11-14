import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabase'

const AuthCallback = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState('processing')
  const [message, setMessage] = useState('Confirming your email...')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Auth callback error:', error)
          setStatus('error')
          setMessage('Email confirmation failed. Please try again.')
          setTimeout(() => navigate('/login'), 3000)
          return
        }

        if (session) {
          setStatus('success')
          setMessage('Email confirmed successfully! Redirecting to login...')
          
          // Wait a moment then redirect
          setTimeout(() => {
            navigate('/login')
          }, 2000)
        } else {
          setStatus('error')
          setMessage('No session found. Redirecting to login...')
          setTimeout(() => navigate('/login'), 2000)
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setStatus('error')
        setMessage('An error occurred. Redirecting to login...')
        setTimeout(() => navigate('/login'), 2000)
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
      </div>
      
      <div className="max-w-md w-full relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <h1 className="text-5xl font-bold text-white tracking-tight mb-2">SMART PRESENCE</h1>
            <div className="h-1 w-32 bg-white mx-auto"></div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-gray-900 border-2 border-white/20 p-8 rounded-2xl shadow-2xl text-center">
          {status === 'processing' && (
            <div className="animate-pulse">
              <div className="w-16 h-16 bg-white rounded-full mx-auto mb-4 flex items-center justify-center">
                <div className="w-12 h-12 bg-black rounded-full animate-spin border-t-4 border-white"></div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Processing...</h2>
              <p className="text-gray-400">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="animate-scaleIn">
              <div className="w-16 h-16 bg-white rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
              <p className="text-gray-400">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="animate-scaleIn">
              <div className="w-16 h-16 bg-white rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
              <p className="text-gray-400">{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthCallback
