import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Navbar = () => {
  const navigate = useNavigate()
  const { userProfile, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="bg-gray-900 border-b border-white/10 sticky top-0 z-50 backdrop-blur-lg bg-opacity-95">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer transition-all duration-300 hover:opacity-80" onClick={() => navigate('/')}>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">SMART PRESENCE</span>
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center space-x-6">
            <div className="hidden sm:block text-right bg-gray-800 border border-white/20 px-4 py-2.5 rounded-lg hover:border-white/40 transition-all duration-300">
              <div className="font-bold text-white text-base tracking-wide">
                {userProfile?.name}
              </div>
              <div className="text-xs text-gray-400 capitalize font-medium mt-0.5">
                {userProfile?.role}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {userProfile?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="px-5 py-2.5 bg-white text-black rounded-lg hover:bg-gray-200 hover:scale-105 transition-all duration-300 font-semibold uppercase tracking-wide"
                >
                  Admin
                </button>
              )}
              {userProfile?.role === 'staff' && (
                <button
                  onClick={() => navigate('/staff')}
                  className="px-5 py-2.5 bg-white text-black rounded-lg hover:bg-gray-200 hover:scale-105 transition-all duration-300 font-semibold uppercase tracking-wide"
                >
                  Dashboard
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="px-5 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 hover:scale-105 transition-all duration-300 font-semibold uppercase tracking-wide"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
