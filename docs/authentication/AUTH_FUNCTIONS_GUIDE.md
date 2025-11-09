# Authentication Functions Guide

## Overview
Your attendance app already has complete signup and login functionality implemented using React and Supabase.

## Existing Implementation

### 1. **Login Function** (`/src/pages/Login.jsx`)
- Email/password authentication
- Auto-redirects based on user role (admin/staff)
- Error handling and loading states
- Beautiful UI with animations

### 2. **Signup Function** (`/src/pages/Signup.jsx`)
- User registration with name, email, password
- Role selection (admin/staff)
- Password confirmation validation
- Creates user in Supabase Auth and users table
- Auto-navigates to login after successful signup

### 3. **Auth Context** (`/src/context/AuthContext.jsx`)
Provides these functions throughout your app:
- `signIn(email, password)` - Login user
- `signUp(email, password, name)` - Register new user
- `signOut()` - Logout user
- `user` - Current authenticated user
- `userProfile` - User profile data from database
- `loading` - Loading state

## How to Use

### In React Components:
```javascript
import { useAuth } from '../context/AuthContext'

function MyComponent() {
  const { signIn, signUp, signOut, user, userProfile } = useAuth()
  
  // Login
  const handleLogin = async () => {
    const { data, error } = await signIn('user@example.com', 'password123')
    if (error) console.error(error)
  }
  
  // Signup
  const handleSignup = async () => {
    const { data, error } = await signUp('user@example.com', 'password123', 'John Doe')
    if (error) console.error(error)
  }
  
  // Logout
  const handleLogout = async () => {
    await signOut()
  }
  
  return <div>{user ? `Welcome ${userProfile?.name}` : 'Please login'}</div>
}
```

### Direct Supabase Usage:
```javascript
import { supabase } from '../services/supabase'

// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// Signup
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      name: 'John Doe',
      role: 'staff'
    }
  }
})

// Logout
await supabase.auth.signOut()

// Get current user
const { data: { user } } = await supabase.auth.getUser()
```

## Routes
- `/login` - Login page
- `/signup` - Signup page
- `/admin` - Admin dashboard (requires admin role)
- `/staff` - Staff dashboard (requires staff role)

## Database Schema
The `users` table stores:
- `id` - UUID (matches auth.users.id)
- `email` - User email
- `name` - Full name
- `role` - 'admin' or 'staff'
- `created_at` - Timestamp

## Security Features
✅ Password validation (min 6 characters)
✅ Email confirmation
✅ Role-based access control
✅ Supabase RLS policies
✅ Secure password hashing (handled by Supabase)
✅ Session management

## Testing
1. Navigate to `http://localhost:5173/signup`
2. Create a new account
3. Check email for confirmation (if enabled)
4. Login at `http://localhost:5173/login`
5. You'll be redirected based on your role

## Environment Variables Required
Create a `.env` file with:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
