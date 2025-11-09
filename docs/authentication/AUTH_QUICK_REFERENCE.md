# Authentication Quick Reference

## 🚀 Quick Start

### Import
```javascript
import { signUpUser, signInUser, signOutUser } from './src/utils/authFunctions'
```

### Signup
```javascript
const { data, error } = await signUpUser(email, password, name, role)
```

### Login
```javascript
const { data, error, userProfile } = await signInUser(email, password)
```

### Logout
```javascript
const { error } = await signOutUser()
```

---

## 📋 All Available Functions

| Function | Purpose | Parameters | Returns |
|----------|---------|------------|---------|
| `signUpUser()` | Register new user | email, password, name, role | {data, error} |
| `signInUser()` | Login user | email, password | {data, error, userProfile} |
| `signOutUser()` | Logout user | none | {error} |
| `getCurrentUser()` | Get current user | none | {user, error} |
| `getUserProfile()` | Get user profile | none | {profile, error} |
| `updateUserProfile()` | Update profile | userId, updates | {data, error} |
| `resetPassword()` | Send reset email | email | {data, error} |
| `updatePassword()` | Change password | newPassword | {data, error} |
| `isAuthenticated()` | Check if logged in | none | boolean |
| `hasRole()` | Check user role | requiredRole | boolean |
| `getSession()` | Get current session | none | {session, error} |

---

## 🎯 Common Use Cases

### 1. User Registration
```javascript
const { data, error } = await signUpUser(
  'user@example.com',
  'password123',
  'John Doe',
  'staff' // or 'admin'
)
```

### 2. User Login
```javascript
const { data, error, userProfile } = await signInUser(
  'user@example.com',
  'password123'
)

if (!error) {
  console.log('Welcome', userProfile.name)
  // Redirect based on role
  if (userProfile.role === 'admin') {
    navigate('/admin')
  } else {
    navigate('/staff')
  }
}
```

### 3. User Logout
```javascript
await signOutUser()
navigate('/login')
```

### 4. Check Authentication
```javascript
const authenticated = await isAuthenticated()
if (!authenticated) {
  navigate('/login')
}
```

### 5. Check User Role
```javascript
const isAdmin = await hasRole('admin')
if (!isAdmin) {
  alert('Admin access required')
}
```

### 6. Get Current User Info
```javascript
const { profile } = await getUserProfile()
console.log(profile.name, profile.email, profile.role)
```

### 7. Update Profile
```javascript
const { data, error } = await updateUserProfile(userId, {
  name: 'New Name'
})
```

### 8. Password Reset
```javascript
// Send reset email
await resetPassword('user@example.com')

// Update password (after reset link)
await updatePassword('newPassword123')
```

---

## ⚠️ Error Handling

```javascript
const { data, error } = await signInUser(email, password)

if (error) {
  console.error('Login failed:', error.message)
  // Show error to user
  alert(error.message)
  return
}

// Success - use data
console.log('Logged in:', data.user)
```

---

## 🔐 Validation Rules

- **Email**: Must be valid email format
- **Password**: Minimum 6 characters
- **Name**: Required for signup
- **Role**: Must be 'admin' or 'staff'

---

## 📁 File Locations

- **Auth Functions**: `/src/utils/authFunctions.js`
- **Auth Context**: `/src/context/AuthContext.jsx`
- **Login Page**: `/src/pages/Login.jsx`
- **Signup Page**: `/src/pages/Signup.jsx`
- **Supabase Config**: `/src/services/supabase.js`

---

## 🌐 Routes

- `/login` - Login page
- `/signup` - Signup page
- `/admin` - Admin dashboard
- `/staff` - Staff dashboard

---

## 🔑 Environment Variables

Create `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## 💡 Tips

1. Always check for errors before using data
2. Use `async/await` for cleaner code
3. Store user session in context for app-wide access
4. Implement loading states for better UX
5. Validate inputs before calling auth functions
6. Handle specific error messages for better user feedback

---

## 🎨 Using with React Context

```javascript
import { useAuth } from '../context/AuthContext'

function MyComponent() {
  const { user, userProfile, signIn, signOut } = useAuth()
  
  return (
    <div>
      {user ? (
        <div>
          <p>Welcome {userProfile?.name}</p>
          <button onClick={signOut}>Logout</button>
        </div>
      ) : (
        <button onClick={() => signIn(email, password)}>Login</button>
      )}
    </div>
  )
}
```

---

## 📞 Support

For issues or questions:
1. Check Supabase dashboard for auth logs
2. Verify RLS policies are correct
3. Check browser console for errors
4. Ensure environment variables are set
