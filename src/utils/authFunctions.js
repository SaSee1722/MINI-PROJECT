/**
 * Standalone Authentication Functions
 * These functions can be used anywhere in your app without React hooks
 */

import { supabase } from '../services/supabase'

/**
 * Sign up a new user
 * @param {string} email - User's email address
 * @param {string} password - User's password (min 6 characters)
 * @param {string} name - User's full name
 * @param {string} role - User role: 'admin' or 'staff' (default: 'staff')
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export const signUpUser = async (email, password, name, role = 'staff') => {
  try {
    // Validate inputs
    if (!email || !password || !name) {
      return { 
        data: null, 
        error: { message: 'Email, password, and name are required' } 
      }
    }

    if (password.length < 6) {
      return { 
        data: null, 
        error: { message: 'Password must be at least 6 characters' } 
      }
    }

    if (!['admin', 'staff'].includes(role)) {
      return { 
        data: null, 
        error: { message: 'Role must be either "admin" or "staff"' } 
      }
    }

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role
        }
      }
    })

    if (error) {
      return { data: null, error }
    }

    // Wait for database trigger to create user profile
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Try to update user profile with role and name
    if (data.user) {
      try {
        await supabase
          .from('users')
          .update({ role, name })
          .eq('email', email)
      } catch (updateError) {
        console.warn('Profile update failed:', updateError)
      }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Signup error:', error)
    return { data: null, error }
  }
}

/**
 * Sign in an existing user
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<{data: object|null, error: object|null, userProfile: object|null}>}
 */
export const signInUser = async (email, password) => {
  try {
    // Validate inputs
    if (!email || !password) {
      return { 
        data: null, 
        error: { message: 'Email and password are required' },
        userProfile: null
      }
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return { data: null, error, userProfile: null }
    }

    // Fetch user profile from database
    let userProfile = null
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (!profileError) {
        userProfile = profile
      }
    }

    return { data, error: null, userProfile }
  } catch (error) {
    console.error('Login error:', error)
    return { data: null, error, userProfile: null }
  }
}

/**
 * Sign out the current user
 * @returns {Promise<{error: object|null}>}
 */
export const signOutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    return { error }
  } catch (error) {
    console.error('Logout error:', error)
    return { error }
  }
}

/**
 * Get the current authenticated user
 * @returns {Promise<{user: object|null, error: object|null}>}
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  } catch (error) {
    console.error('Get user error:', error)
    return { user: null, error }
  }
}

/**
 * Get the current user's profile from database
 * @returns {Promise<{profile: object|null, error: object|null}>}
 */
export const getUserProfile = async () => {
  try {
    const { user, error: userError } = await getCurrentUser()
    
    if (userError || !user) {
      return { profile: null, error: userError }
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    return { profile, error }
  } catch (error) {
    console.error('Get profile error:', error)
    return { profile: null, error }
  }
}

/**
 * Update user profile
 * @param {string} userId - User's ID
 * @param {object} updates - Object with fields to update (name, role, etc.)
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    return { data, error }
  } catch (error) {
    console.error('Update profile error:', error)
    return { data: null, error }
  }
}

/**
 * Reset password for a user (sends reset email)
 * @param {string} email - User's email address
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export const resetPassword = async (email) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    return { data, error }
  } catch (error) {
    console.error('Reset password error:', error)
    return { data: null, error }
  }
}

/**
 * Update user password
 * @param {string} newPassword - New password (min 6 characters)
 * @returns {Promise<{data: object|null, error: object|null}>}
 */
export const updatePassword = async (newPassword) => {
  try {
    if (newPassword.length < 6) {
      return { 
        data: null, 
        error: { message: 'Password must be at least 6 characters' } 
      }
    }

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    })

    return { data, error }
  } catch (error) {
    console.error('Update password error:', error)
    return { data: null, error }
  }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
export const isAuthenticated = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  } catch (error) {
    console.error('Check auth error:', error)
    return false
  }
}

/**
 * Check if user has a specific role
 * @param {string} requiredRole - Required role ('admin' or 'staff')
 * @returns {Promise<boolean>}
 */
export const hasRole = async (requiredRole) => {
  try {
    const { profile } = await getUserProfile()
    return profile?.role === requiredRole
  } catch (error) {
    console.error('Check role error:', error)
    return false
  }
}

/**
 * Get current session
 * @returns {Promise<{session: object|null, error: object|null}>}
 */
export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  } catch (error) {
    console.error('Get session error:', error)
    return { session: null, error }
  }
}

// Export all functions as default object
export default {
  signUpUser,
  signInUser,
  signOutUser,
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  resetPassword,
  updatePassword,
  isAuthenticated,
  hasRole,
  getSession
}
