import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'
import { LogoPremium } from '../components/Logo'
import { CheckCircle, Shield, Zap, Users, ArrowRight, Eye, EyeOff } from 'lucide-react'

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff',
    streamId: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const { toasts, removeToast, showSuccess, showError, showWarning } = useToast()

  const streams = [
    { id: 'cse', name: 'Computer Science and Engineering', code: 'CSE' },
    { id: 'ece', name: 'Electronics and Communication Engineering', code: 'ECE' },
    { id: 'eee', name: 'Electrical and Electronics Engineering', code: 'EEE' },
    { id: 'mech', name: 'Mechanical Engineering', code: 'MECH' },
    { id: 'civil', name: 'Civil Engineering', code: 'CIVIL' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      showError('Passwords do not match')
      return
    }
    if (formData.password.length < 6) {
      showError('Password must be at least 6 characters')
      return
    }
    if (!formData.streamId) {
      showWarning('Please select a stream')
      return
    }
    setLoading(true)
    try {
      const redirectUrl = window.location.origin + '/auth/callback'
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: formData.name,
            role: formData.role,
            stream_id: formData.streamId
          }
        }
      })
      if (signUpError) {
        showError(signUpError.message)
        setLoading(false)
        return
      }
      if (!authData.user) {
        showError('Failed to create account. Please try again.')
        setLoading(false)
        return
      }
      await new Promise(resolve => setTimeout(resolve, 2000))
      showSuccess('🎉 Account created successfully! Redirecting to login...', 3000)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      console.error('Signup error:', err)
      showError('Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Left Side: Branding & Features */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#0a0a0a] to-[#111] p-12 flex-col justify-between relative overflow-hidden border-r border-white/5">
        {/* Background Gradients */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px'}}></div>

        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 group mb-20 inline-flex">
            <LogoPremium size="large" className="group-hover:scale-110 transition-transform duration-500" />
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter text-white">SMART</span>
              <span className="text-xl font-bold tracking-tight text-emerald-400 -mt-1">PRESENCE</span>
            </div>
          </Link>

          <h2 className="text-5xl lg:text-6xl font-black text-white leading-tight mb-8">
            The next generation of <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">attendance.</span>
          </h2>
          
          <div className="space-y-8">
            {[
              { icon: <Zap className="text-emerald-400" />, title: "Real-time Tracking", desc: "Monitor classroom attendance instantly as it happens." },
              { icon: <Shield className="text-blue-400" />, title: "Secure & Verified", desc: "Encrypted data ensures privacy and prevents tampering." },
              { icon: <Users className="text-purple-400" />, title: "Stream Management", desc: "Organized by departments and specialized streams." }
            ].map((feature, i) => (
              <div key={i} className="flex gap-5 animate-smoothFadeIn" style={{ animationDelay: `${i * 200}ms` }}>
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10 group hover:border-emerald-500/50 transition-colors">
                  {feature.icon}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white mb-1">{feature.title}</h4>
                  <p className="text-gray-400 leading-relaxed text-sm max-w-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 pt-10 border-t border-white/10">
          <p className="text-gray-500 text-sm font-medium">© 2025 Smart Presence. Modernizing Education.</p>
        </div>
      </div>

      {/* Right Side: Signup Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
        <div className="absolute inset-0 md:hidden opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
        </div>
        
        <div className="max-w-md w-full animate-smoothFadeIn">
          <div className="mb-10 text-center md:text-left">
            <div className="md:hidden flex justify-center mb-6">
              <LogoPremium size="large" />
            </div>
            <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Get Started</h3>
            <p className="text-gray-400">Join our community and simplify your workflow today.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Full Name</label>
                <div className="relative group">
                  <input
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 text-white rounded-2xl focus:border-emerald-500/50 focus:bg-emerald-500/5 outline-none transition-all duration-300 placeholder-gray-600"
                    placeholder="John Doe"
                  />
                  <div className="absolute inset-0 rounded-2xl bg-emerald-500/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity"></div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Email Address</label>
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-5 py-4 bg-white/5 border border-white/10 text-white rounded-2xl focus:border-emerald-500/50 focus:bg-emerald-500/5 outline-none transition-all duration-300 placeholder-gray-600"
                  placeholder="name@university.edu"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-4 py-4 bg-white/5 border border-white/10 text-white rounded-2xl focus:border-emerald-500/50 outline-none transition-all duration-300 appearance-none cursor-pointer"
                  >
                    <option value="staff" className="bg-[#0a0a0a]">Staff</option>
                    <option value="admin" className="bg-[#0a0a0a]">Admin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Stream</label>
                  <select
                    name="streamId"
                    value={formData.streamId}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-4 bg-white/5 border border-white/10 text-white rounded-2xl focus:border-emerald-500/50 outline-none transition-all duration-300 appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#0a0a0a]">Select</option>
                    {streams.map(s => <option key={s.id} value={s.id} className="bg-[#0a0a0a]">{s.code}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Password</label>
                <div className="relative group">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 text-white rounded-2xl focus:border-emerald-500/50 focus:bg-emerald-500/5 outline-none transition-all duration-300 placeholder-gray-700 pr-14"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Confirm Password</label>
                <div className="relative group">
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full px-5 py-4 bg-white/5 border border-white/10 text-white rounded-2xl focus:border-emerald-500/50 focus:bg-emerald-500/5 outline-none transition-all duration-300 placeholder-gray-700 pr-14"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-400 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full group mt-4 relative flex items-center justify-center px-8 py-5 font-bold text-black transition-all duration-500 bg-white rounded-2xl hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <span className="relative z-10 flex items-center gap-2">
                {loading ? 'CREATING ACCOUNT...' : 'JOIN NOW'}
                {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
              </span>
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-400 font-bold hover:text-emerald-300 transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

export default Signup
