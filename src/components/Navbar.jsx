import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoPremium } from './Logo'
import { LogOut, LayoutDashboard, Settings, User as UserIcon } from 'lucide-react'

const Navbar = () => {
  const navigate = useNavigate()
  const { userProfile, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-[100] w-full bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-8 py-4">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        {/* Left: Brand */}
        <div 
          className="flex items-center gap-4 cursor-pointer group transition-all duration-500"
          onClick={() => navigate('/')}
        >
          <div className="relative">
            <LogoPremium size="default" className="group-hover:scale-110 group-hover:rotate-[10deg] transition-all duration-500" />
            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xl font-black tracking-tighter text-white">SMART</span>
            <span className="text-sm font-bold tracking-[0.2em] text-emerald-400 uppercase">Presence</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* User Profile Summary */}
          <div className="hidden md:flex items-center gap-3 bg-white/[0.03] border border-white/10 px-4 py-2 rounded-2xl hover:bg-white/[0.05] transition-all cursor-default">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center border border-emerald-500/30">
              <UserIcon className="text-emerald-400" size={18} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-white leading-none mb-1">{userProfile?.name}</span>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{userProfile?.role}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {userProfile?.role === 'admin' && window.location.pathname !== '/admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="p-2.5 sm:px-5 sm:py-2.5 bg-white text-black rounded-xl hover:bg-emerald-400 transition-all duration-300 font-bold text-xs sm:text-sm flex items-center gap-2"
              >
                <LayoutDashboard size={18} className="sm:hidden md:block" />
                <span className="hidden sm:inline uppercase tracking-wider">Admin</span>
              </button>
            )}
            {userProfile?.role === 'staff' && (
              <button
                onClick={() => navigate('/staff')}
                className="p-2.5 sm:px-5 sm:py-2.5 bg-white text-black rounded-xl hover:bg-emerald-400 transition-all duration-300 font-bold text-xs sm:text-sm flex items-center gap-2"
              >
                <LayoutDashboard size={18} className="sm:hidden md:block" />
                <span className="hidden sm:inline uppercase tracking-wider">Dashboard</span>
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="p-2.5 sm:px-4 sm:py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 font-bold text-xs sm:text-sm flex items-center gap-2"
              title="Sign Out"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline uppercase tracking-wider">Exit</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
