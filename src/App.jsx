import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LogoPremium } from './components/Logo'

// Lazy load components to reduce initial bundle size
const LandingPage = lazy(() => import('./pages/LandingPage'))
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const ModernAdminDashboard = lazy(() => import('./pages/ModernAdminDashboard'))
const AdminDashboardNew = lazy(() => import('./pages/AdminDashboardNew'))
const StaffDashboardNew = lazy(() => import('./pages/StaffDashboardNew'))

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="min-h-screen bg-[#050505] flex items-center justify-center relative overflow-hidden">
    <div className="absolute inset-0 opacity-[0.03]">
      <div className="absolute top-0 left-0 w-full h-full" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
    </div>
    
    {/* Animated Background Orbs */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse"></div>
    
    <div className="relative z-10 text-center">
      <div className="mb-8 flex flex-col items-center">
        <div className="relative mb-6">
          <LogoPremium size="huge" className="animate-bounce" />
          <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full -z-10 animate-pulse"></div>
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter mb-1">SMART PRESENCE</h1>
        <div className="h-1 w-24 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
      </div>
      <div className="flex items-center justify-center gap-3">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
      </div>
    </div>
  </div>
)

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user || !userProfile) {
    return <Navigate to="/login" />
  }

  if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/login" />
  }

  return children
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboardNew />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/modern"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ModernAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffDashboardNew />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  )
}

export default App
