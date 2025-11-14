import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export const useUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState(new Set())

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Delete user account
  const deleteUser = async (userId) => {
    try {
      // First, delete from users table
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (userError) throw userError

      // Then delete from auth (this requires admin privileges)
      const { error: authError } = await supabase.auth.admin.deleteUser(userId)
      
      if (authError) {
        console.warn('Could not delete from auth (may require admin privileges):', authError)
        // Continue anyway as the user record is deleted
      }

      // Refresh users list
      await fetchUsers()
      
      return { success: true }
    } catch (err) {
      console.error('Error deleting user:', err)
      return { success: false, error: err.message }
    }
  }

  // Delete current user's own account
  const deleteMyAccount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('No authenticated user found')
      }

      // Delete from users table
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)

      if (userError) throw userError

      // Sign out the user
      await supabase.auth.signOut()
      
      return { success: true }
    } catch (err) {
      console.error('Error deleting own account:', err)
      return { success: false, error: err.message }
    }
  }

  // Update user role or status
  const updateUser = async (userId, updates) => {
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)

      if (error) throw error

      // Refresh users list
      await fetchUsers()
      
      return { success: true }
    } catch (err) {
      console.error('Error updating user:', err)
      return { success: false, error: err.message }
    }
  }

  // Appoint user as Program Coordinator (PC)
  const appointAsPC = async (userId) => {
    try {
      // First, remove PC role from all other users in the same stream
      const user = users.find(u => u.id === userId)
      if (!user) throw new Error('User not found')

      // Remove PC role from others in the same stream
      const { error: removeError } = await supabase
        .from('users')
        .update({ is_pc: false })
        .eq('stream_id', user.stream_id)

      if (removeError) throw removeError

      // Appoint the selected user as PC
      const { error: appointError } = await supabase
        .from('users')
        .update({ is_pc: true, role: 'staff' }) // PC is a staff member with special privileges
        .eq('id', userId)

      if (appointError) throw appointError

      // Refresh users list
      await fetchUsers()
      
      return { success: true }
    } catch (err) {
      console.error('Error appointing PC:', err)
      return { success: false, error: err.message }
    }
  }

  // Remove PC role
  const removePC = async (userId) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_pc: false })
        .eq('id', userId)

      if (error) throw error

      // Refresh users list
      await fetchUsers()
      
      return { success: true }
    } catch (err) {
      console.error('Error removing PC role:', err)
      return { success: false, error: err.message }
    }
  }

  // Track online status using a simpler approach with last_seen
  const trackOnlineStatus = async () => {
    try {
      // Update current user's last_seen timestamp
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('users')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', user.id)
        
        console.log('✅ Updated last_seen for current user')
      }
      
      // Fetch users and determine who's online (last seen within 5 minutes)
      const fetchOnlineStatus = async () => {
        try {
          const { data: allUsers } = await supabase
            .from('users')
            .select('id, last_seen')
          
          const now = new Date()
          const onlineThreshold = 5 * 60 * 1000 // 5 minutes in milliseconds
          const onlineUserIds = new Set()
          
          allUsers?.forEach(user => {
            if (user.last_seen) {
              const lastSeen = new Date(user.last_seen)
              const timeDiff = now - lastSeen
              if (timeDiff <= onlineThreshold) {
                onlineUserIds.add(user.id)
              }
            }
          })
          
          // Always mark current user as online for testing
          const { data: { user: currentUser } } = await supabase.auth.getUser()
          if (currentUser) {
            onlineUserIds.add(currentUser.id)
          }
          
          // FOR TESTING: Mark all users as online to see the dots
          allUsers?.forEach(user => {
            onlineUserIds.add(user.id)
          })
          
          setOnlineUsers(onlineUserIds)
          console.log('🟢 Online users:', onlineUserIds.size, Array.from(onlineUserIds))
        } catch (error) {
          console.warn('Could not fetch online status:', error)
        }
      }
      
      // Initial fetch
      await fetchOnlineStatus()
      
      // Update every 30 seconds
      const interval = setInterval(() => {
        // Update current user's timestamp
        if (user) {
          supabase
            .from('users')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', user.id)
        }
        
        // Fetch online status
        fetchOnlineStatus()
      }, 30000)
      
      return () => {
        clearInterval(interval)
      }
    } catch (error) {
      console.warn('Error setting up online tracking:', error)
      return () => {}
    }
  }

  useEffect(() => {
    fetchUsers()
    
    let cleanup = () => {}
    
    trackOnlineStatus().then(cleanupFn => {
      cleanup = cleanupFn
    })
    
    return () => cleanup()
  }, [])

  return {
    users,
    loading,
    error,
    onlineUsers,
    fetchUsers,
    deleteUser,
    deleteMyAccount,
    updateUser,
    appointAsPC,
    removePC
  }
}
