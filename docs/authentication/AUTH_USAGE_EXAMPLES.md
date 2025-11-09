# Authentication Functions - Usage Examples

## Import the Functions

```javascript
import { 
  signUpUser, 
  signInUser, 
  signOutUser,
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  resetPassword,
  updatePassword,
  isAuthenticated,
  hasRole
} from './src/utils/authFunctions'
```

## 1. User Signup

### Basic Signup (Staff)
```javascript
const handleSignup = async () => {
  const { data, error } = await signUpUser(
    'john@example.com',
    'password123',
    'John Doe'
  )
  
  if (error) {
    console.error('Signup failed:', error.message)
    return
  }
  
  console.log('User created:', data.user)
  alert('Account created! Please check your email to verify.')
}
```

### Signup with Admin Role
```javascript
const handleAdminSignup = async () => {
  const { data, error } = await signUpUser(
    'admin@example.com',
    'securepass123',
    'Admin User',
    'admin' // Specify admin role
  )
  
  if (error) {
    alert(`Signup failed: ${error.message}`)
    return
  }
  
  console.log('Admin user created:', data.user)
}
```

### Signup with Validation
```javascript
const handleSignupWithValidation = async (email, password, confirmPassword, name, role) => {
  // Client-side validation
  if (password !== confirmPassword) {
    alert('Passwords do not match')
    return
  }
  
  if (password.length < 6) {
    alert('Password must be at least 6 characters')
    return
  }
  
  const { data, error } = await signUpUser(email, password, name, role)
  
  if (error) {
    alert(`Signup failed: ${error.message}`)
    return
  }
  
  alert('Account created successfully!')
  // Redirect to login page
  window.location.href = '/login'
}
```

## 2. User Login

### Basic Login
```javascript
const handleLogin = async () => {
  const { data, error, userProfile } = await signInUser(
    'john@example.com',
    'password123'
  )
  
  if (error) {
    console.error('Login failed:', error.message)
    return
  }
  
  console.log('Logged in user:', data.user)
  console.log('User profile:', userProfile)
  
  // Redirect based on role
  if (userProfile.role === 'admin') {
    window.location.href = '/admin'
  } else {
    window.location.href = '/staff'
  }
}
```

### Login with Error Handling
```javascript
const handleLoginWithErrors = async (email, password) => {
  const { data, error, userProfile } = await signInUser(email, password)
  
  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      alert('Incorrect email or password')
    } else if (error.message.includes('Email not confirmed')) {
      alert('Please verify your email first')
    } else {
      alert(`Login failed: ${error.message}`)
    }
    return
  }
  
  console.log('Welcome back,', userProfile.name)
}
```

## 3. User Logout

### Simple Logout
```javascript
const handleLogout = async () => {
  const { error } = await signOutUser()
  
  if (error) {
    console.error('Logout failed:', error.message)
    return
  }
  
  console.log('Logged out successfully')
  window.location.href = '/login'
}
```

### Logout with Confirmation
```javascript
const handleLogoutWithConfirm = async () => {
  if (confirm('Are you sure you want to logout?')) {
    const { error } = await signOutUser()
    
    if (!error) {
      alert('You have been logged out')
      window.location.href = '/'
    }
  }
}
```

## 4. Get Current User

### Check if User is Logged In
```javascript
const checkAuth = async () => {
  const { user, error } = await getCurrentUser()
  
  if (error || !user) {
    console.log('User is not logged in')
    window.location.href = '/login'
    return
  }
  
  console.log('Current user:', user)
}
```

### Get User Profile
```javascript
const loadUserProfile = async () => {
  const { profile, error } = await getUserProfile()
  
  if (error) {
    console.error('Failed to load profile:', error.message)
    return
  }
  
  console.log('User profile:', profile)
  console.log('Name:', profile.name)
  console.log('Email:', profile.email)
  console.log('Role:', profile.role)
}
```

## 5. Update User Profile

### Update Name
```javascript
const updateName = async (userId, newName) => {
  const { data, error } = await updateUserProfile(userId, {
    name: newName
  })
  
  if (error) {
    alert('Failed to update name')
    return
  }
  
  alert('Name updated successfully!')
  console.log('Updated profile:', data)
}
```

### Update Multiple Fields
```javascript
const updateProfile = async (userId, updates) => {
  const { data, error } = await updateUserProfile(userId, {
    name: updates.name,
    email: updates.email,
    // Add other fields as needed
  })
  
  if (error) {
    console.error('Update failed:', error.message)
    return
  }
  
  console.log('Profile updated:', data)
}
```

## 6. Password Reset

### Request Password Reset
```javascript
const handleForgotPassword = async (email) => {
  const { data, error } = await resetPassword(email)
  
  if (error) {
    alert('Failed to send reset email')
    return
  }
  
  alert('Password reset email sent! Check your inbox.')
}
```

### Update Password
```javascript
const handlePasswordChange = async (newPassword, confirmPassword) => {
  if (newPassword !== confirmPassword) {
    alert('Passwords do not match')
    return
  }
  
  const { data, error } = await updatePassword(newPassword)
  
  if (error) {
    alert(`Password update failed: ${error.message}`)
    return
  }
  
  alert('Password updated successfully!')
}
```

## 7. Role-Based Access Control

### Check if User is Admin
```javascript
const checkAdminAccess = async () => {
  const isAdmin = await hasRole('admin')
  
  if (!isAdmin) {
    alert('Access denied. Admin privileges required.')
    window.location.href = '/staff'
    return
  }
  
  console.log('Admin access granted')
}
```

### Check Authentication Status
```javascript
const protectRoute = async () => {
  const authenticated = await isAuthenticated()
  
  if (!authenticated) {
    alert('Please login to continue')
    window.location.href = '/login'
    return
  }
  
  console.log('User is authenticated')
}
```

## 8. Complete Login Flow Example

```javascript
// LoginPage.jsx
import { useState } from 'react'
import { signInUser } from '../utils/authFunctions'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error, userProfile } = await signInUser(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Redirect based on role
    if (userProfile.role === 'admin') {
      window.location.href = '/admin'
    } else {
      window.location.href = '/staff'
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}
```

## 9. Complete Signup Flow Example

```javascript
// SignupPage.jsx
import { useState } from 'react'
import { signUpUser } from '../utils/authFunctions'

function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'staff'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { data, error } = await signUpUser(
      formData.email,
      formData.password,
      formData.name,
      formData.role
    )

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    alert('Account created successfully!')
    window.location.href = '/login'
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        placeholder="Full Name"
        required
      />
      
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        placeholder="Email"
        required
      />
      
      <select
        value={formData.role}
        onChange={(e) => setFormData({...formData, role: e.target.value})}
      >
        <option value="staff">Staff</option>
        <option value="admin">Admin</option>
      </select>
      
      <input
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({...formData, password: e.target.value})}
        placeholder="Password"
        required
      />
      
      <input
        type="password"
        value={formData.confirmPassword}
        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
        placeholder="Confirm Password"
        required
      />
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creating Account...' : 'Sign Up'}
      </button>
    </form>
  )
}
```

## 10. Protected Route Example

```javascript
// ProtectedRoute.jsx
import { useEffect, useState } from 'react'
import { isAuthenticated, hasRole } from '../utils/authFunctions'

function ProtectedRoute({ children, requiredRole }) {
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      const authenticated = await isAuthenticated()
      
      if (!authenticated) {
        window.location.href = '/login'
        return
      }

      if (requiredRole) {
        const hasRequiredRole = await hasRole(requiredRole)
        if (!hasRequiredRole) {
          alert('Access denied')
          window.location.href = '/'
          return
        }
      }

      setAuthorized(true)
      setLoading(false)
    }

    checkAccess()
  }, [requiredRole])

  if (loading) return <div>Loading...</div>
  if (!authorized) return null

  return children
}

// Usage:
// <ProtectedRoute requiredRole="admin">
//   <AdminDashboard />
// </ProtectedRoute>
```

## Error Handling Best Practices

```javascript
const handleAuthOperation = async () => {
  try {
    const { data, error } = await signInUser(email, password)
    
    if (error) {
      // Handle specific error cases
      switch (error.message) {
        case 'Invalid login credentials':
          alert('Incorrect email or password')
          break
        case 'Email not confirmed':
          alert('Please verify your email')
          break
        case 'User not found':
          alert('No account found with this email')
          break
        default:
          alert(`Error: ${error.message}`)
      }
      return
    }
    
    // Success handling
    console.log('Success:', data)
  } catch (err) {
    console.error('Unexpected error:', err)
    alert('An unexpected error occurred')
  }
}
```

## Notes

- All functions return promises and should be used with `async/await` or `.then()`
- Always check for errors before using the returned data
- The `signUpUser` function automatically creates a user profile in the database
- Password must be at least 6 characters
- Email confirmation may be required depending on Supabase settings
- Session is automatically managed by Supabase
