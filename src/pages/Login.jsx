import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'
import { LogoPremium } from '../components/Logo'
import { Shield, Lock, User, ArrowRight, Activity, Globe, Eye, EyeOff } from 'lucide-react'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { signIn, user, userProfile } = useAuth()
  const { toasts, removeToast, showError, showInfo } = useToast()

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
      const maxAttempts = 20 // 10 seconds total
      
      const checkProfile = setInterval(() => {
        attempts++
        if (userProfile) {
          clearInterval(checkProfile)
          setLoading(false)
        } else if (attempts >= maxAttempts) {
          clearInterval(checkProfile)
          showError('Login successful but profile not loaded.')
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
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Left Side: Visual & Marketing */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-tr from-[#0a0a0a] to-[#0f0f0f] p-12 flex-col justify-between relative overflow-hidden border-r border-white/5">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute inset-0 opacity-[0.02]" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px'}}></div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-4 group mb-20 inline-flex">
            <LogoPremium size="large" className="group-hover:rotate-12 transition-transform duration-500" />
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter text-white">SMART</span>
              <span className="text-xl font-bold tracking-tight text-emerald-400 -mt-1 uppercase">Presence</span>
            </div>
          </Link>

          <h2 className="text-5xl lg:text-7xl font-black text-white leading-tight mb-8">
            Manage your <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent italic">presence</span> with precision.
          </h2>

          <div className="space-y-8 max-w-md">
            {[
              { icon: <Activity className="text-blue-400" />, title: "Live Insights", desc: "Access comprehensive data and reports in a heartbeat." },
              { icon: <Lock className="text-emerald-400" />, title: "Enterprise Security", desc: "Multi-layer protection for all institutional data." },
              { icon: <Globe className="text-cyan-400" />, title: "Anywhere Access", desc: "Manage and monitor from any device, anywhere in the world." }
            ].map((item, i) => (
              <div key={i} className="flex gap-6 items-start animate-smoothFadeIn" style={{ animationDelay: `${i * 150}ms` }}>
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-1 tracking-tight">{item.title}</h4>
                  <p className="text-gray-400 leading-relaxed text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
        <div className="absolute inset-0 md:hidden opacity-[0.05]">
          <div className="absolute top-0 left-0 w-full h-full" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
        </div>

        <div className="max-w-md w-full animate-smoothFadeIn">
          <div className="mb-12 text-center md:text-left">
            <div className="md:hidden flex justify-center mb-8">
              <LogoPremium size="large" />
            </div>
            <h3 className="text-4xl font-black text-white mb-3 tracking-tighter">Welcome Back</h3>
            <p className="text-gray-400 text-lg">Enter your credentials to access your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] pl-1">Email Address</label>
              <div className="relative group">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 text-white rounded-[20px] focus:border-blue-500/50 focus:bg-blue-500/5 outline-none transition-all duration-300 placeholder-gray-600"
                  placeholder="name@university.edu"
                />
                <User className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-blue-400 transition-colors" size={20} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Password</label>
              </div>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 text-white rounded-[20px] focus:border-blue-500/50 focus:bg-blue-500/5 outline-none transition-all duration-300 placeholder-gray-600 pr-14"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-600 hover:text-blue-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full group mt-8 relative flex items-center justify-center px-8 py-5 font-black text-[15px] tracking-widest text-black transition-all duration-500 bg-white rounded-[20px] hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <span className="relative z-10 flex items-center gap-3">
                {loading ? 'AUTHENTICATING...' : 'ACCESS DASHBOARD'}
                {!loading && <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform duration-500" />}
              </span>
            </button>
          </form>

          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm font-medium">
              New to the platform?{' '}
              <Link to="/signup" className="text-white font-black hover:text-emerald-400 hover:underline underline-offset-4 transition-all duration-300">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

export default Login
