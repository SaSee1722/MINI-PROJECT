import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      // Get the production URL or fallback to current origin
      const redirectUrl = window.location.origin + '/login'
      
      // Create auth user with metadata
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: formData.name,
            role: formData.role
          }
        }
      })
      
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Failed to create account. Please try again.')
        setLoading(false)
        return
      }

      // Wait for trigger to create user profile
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Try to update the role using service role (admin access)
      // This will work if the trigger created the user
      try {
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            role: formData.role,
            name: formData.name 
          })
          .eq('email', formData.email)

        if (updateError) {
          console.log('Update error (may be normal):', updateError)
        }
      } catch (updateErr) {
        console.log('Update attempt failed (may be normal):', updateErr)
      }

      alert('Account created successfully! You can now login.')
      navigate('/login')
    } catch (err) {
      console.error('Signup error:', err)
      setError('Failed to create account. Please check your internet connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
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
            <h1 className="text-5xl font-bold text-white tracking-tight mb-2">SMART ATTENDANCE</h1>
            <div className="h-1 w-32 bg-white mx-auto"></div>
          </div>
          <p className="text-gray-400 text-lg">Create your account to get started</p>
        </div>

        {/* Signup Form */}
        <div className="bg-gray-900 border-2 border-white/20 p-8 rounded-2xl hover:border-white/40 transition-all duration-300 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-white/10 border-2 border-white text-white px-4 py-3 rounded-xl animate-scaleIn shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="font-bold">ERROR:</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-5 py-4 bg-black border-2 border-white/30 text-white rounded-xl focus:border-white outline-none transition-all duration-300 placeholder-gray-500"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-5 py-4 bg-black border-2 border-white/30 text-white rounded-xl focus:border-white outline-none transition-all duration-300 placeholder-gray-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-5 py-4 bg-black border-2 border-white/30 text-white rounded-xl focus:border-white outline-none transition-all duration-300"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-5 py-4 bg-black border-2 border-white/30 text-white rounded-xl focus:border-white outline-none transition-all duration-300 placeholder-gray-500"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-5 py-4 bg-black border-2 border-white/30 text-white rounded-xl focus:border-white outline-none transition-all duration-300 placeholder-gray-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-xl font-bold text-lg hover:bg-gray-200 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              {loading ? 'CREATING ACCOUNT...' : 'SIGN UP'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-white font-bold hover:underline transition">
                Sign In
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
    </div>
  )
}

export default Signup
