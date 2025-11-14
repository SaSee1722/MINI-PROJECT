import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'

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
  <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
    <div className="absolute inset-0 opacity-5">
      <div className="absolute top-0 left-0 w-full h-full" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
    </div>
    <div className="relative z-10 text-center">
      <div className="mb-6">
        <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center shadow-2xl mx-auto mb-4 animate-pulse">
          <div className="w-14 h-14 bg-black rounded"></div>
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">SMART PRESENCE</h1>
        <div className="h-1 w-32 bg-white mx-auto"></div>
      </div>
      <div className="text-white text-lg font-semibold uppercase tracking-wider animate-pulse">Loading...</div>
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
