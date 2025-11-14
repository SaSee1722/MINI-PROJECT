import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { signIn, user, userProfile } = useAuth()
  const { toasts, removeToast, showSuccess, showError, showInfo } = useToast()

  // Redirect if already logged in
  useEffect(() => {
    if (user && userProfile) {
      if (userProfile.role === 'admin') {
        navigate('/admin')
      } else if (userProfile.role === 'staff') {
        navigate('/staff')
      }
    }
  }, [user, userProfile, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    showInfo('Signing you in...')

    try {
      const { data, error } = await signIn(email, password)
      
      if (error) {
        showError(error.message)
        setLoading(false)
        return
      }

      // Wait for profile to load with timeout
      let attempts = 0
      const maxAttempts = 20 // 10 seconds total (500ms * 20)
      
      const checkProfile = setInterval(() => {
        attempts++
        
        if (userProfile) {
          clearInterval(checkProfile)
          setLoading(false)
          // Navigation will happen via useEffect
        } else if (attempts >= maxAttempts) {
          clearInterval(checkProfile)
          showError('Login successful but your profile could not be loaded. Please contact support.')
          setLoading(false)
        }
      }, 500)
    } catch (err) {
      console.error('Login error:', err)
      showError('An unexpected error occurred')
      setLoading(false)
    }
  }

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
          <p className="text-gray-400 text-lg">Welcome back! Sign in to continue</p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-900 border-2 border-white/20 p-8 rounded-2xl hover:border-white/40 transition-all duration-300 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Toast notifications will appear in top-right corner */}

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-black border-2 border-white/30 text-white rounded-xl focus:border-white outline-none transition-all duration-300 placeholder-gray-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-black border-2 border-white/30 text-white rounded-xl focus:border-white outline-none transition-all duration-300 placeholder-gray-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-xl font-bold text-lg hover:bg-gray-200 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Don't have an account?{' '}
              <Link to="/signup" className="text-white font-bold hover:underline transition">
                Sign Up
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link to="/" className="text-sm text-gray-500 hover:text-white transition-all uppercase tracking-wide">
              Back to Home
            </Link>
          </div>
          
          {/* Decorative Elements */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex justify-center gap-6 text-xs text-gray-500 uppercase tracking-wider">
              <span>SECURE</span>
              <span>FAST</span>
              <span>MODERN</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

export default Login
