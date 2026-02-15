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


  // Appoint as HOD
  const appointAsHOD = async (userId, streamId = 'cse') => {
    try {
      // Check if HOD already exists for this stream
      const { data: existingHOD } = await supabase
        .from('users')
        .select('id, name')
        .eq('is_hod', true)
        .eq('stream_id', streamId)
        .maybeSingle()
      
      if (existingHOD && existingHOD.id !== userId) {
        return { 
          success: false, 
          error: `Stream ${streamId.toUpperCase()} already has an HOD (${existingHOD.name}). They must resign first.` 
        }
      }

      const { error } = await supabase
        .from('users')
        .update({ 
          is_hod: true, 
          is_class_advisor: false,
          advisor_class_id: null,
          role: 'staff',
          stream_id: streamId
        })
        .eq('id', userId)

      if (error) throw error
      
      // Also ensure the user is not an admin if they are becoming HOD
      // unless specifically allowing admin HODs
      await fetchUsers()
      return { success: true }
    } catch (err) {
      console.error('Error appointing HOD:', err)
      return { success: false, error: err.message }
    }
  }

  // Remove HOD role
  const removeHOD = async (userId) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_hod: false })
        .eq('id', userId)

      if (error) throw error
      await fetchUsers()
      return { success: true }
    } catch (err) {
      console.error('Error removing HOD role:', err)
      return { success: false, error: err.message }
    }
  }

  // Appoint as Class Advisor
  const appointAsClassAdvisor = async (userId, classId) => {
    try {
      // Fetch class details to get its stream_id
      const { data: targetClass, error: classError } = await supabase
        .from('classes')
        .select('id, name, stream_id')
        .eq('id', classId)
        .single()
      
      if (classError) throw classError

      // Check if class already has an advisor
      const { data: existingAdvisor } = await supabase
        .from('users')
        .select('id, name')
        .eq('is_class_advisor', true)
        .eq('advisor_class_id', classId)
        .maybeSingle()
      
      if (existingAdvisor && existingAdvisor.id !== userId) {
        return { 
          success: false, 
          error: `This class (${targetClass.name}) already has an advisor (${existingAdvisor.name}).` 
        }
      }

      console.log('Linking staff member to class:', targetClass.name, 'Stream:', targetClass.stream_id)

      const { error } = await supabase
        .from('users')
        .update({ 
          is_class_advisor: true, 
          advisor_class_id: classId,
          is_hod: false,
          role: 'staff',
          stream_id: targetClass.stream_id
        })
        .eq('id', userId)

      if (error) throw error
      await fetchUsers()
      return { success: true }
    } catch (err) {
      console.error('CRITICAL: Error appointing Class Advisor:', err)
      return { success: false, error: err.message || 'Operation failed' }
    }
  }

  // Remove Class Advisor role
  const removeClassAdvisor = async (userId) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_class_advisor: false, 
          advisor_class_id: null 
        })
        .eq('id', userId)

      if (error) throw error
      await fetchUsers()
      return { success: true }
    } catch (err) {
      console.error('Error removing Class Advisor:', err)
      return { success: false, error: err.message }
    }
  }

  // Track online status using a simpler approach with last_seen
  const trackOnlineStatus = async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      // Update current user's last_seen timestamp (if column exists)
      if (currentUser) {
        try {
          await supabase
            .from('users')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', currentUser.id)
          
          console.log('✅ Updated last_seen for current user')
        } catch (updateError) {
          // If last_seen column doesn't exist, that's okay - we'll use alternative method
          console.log('⚠️ Could not update last_seen (column may not exist):', updateError.message)
        }
      }
      
      // Fetch users and determine who's online
      const fetchOnlineStatus = async () => {
        try {
          // Try to fetch with last_seen, but handle if column doesn't exist
          let allUsers
          try {
            const { data, error } = await supabase
              .from('users')
              .select('id, last_seen')
            
            if (error && error.message.includes('column') && error.message.includes('last_seen')) {
              // Column doesn't exist, fetch without it
              const { data: usersData } = await supabase
                .from('users')
                .select('id')
              allUsers = usersData
            } else {
              allUsers = data
            }
          } catch (err) {
            // Fallback: fetch all users without last_seen
            const { data: usersData } = await supabase
              .from('users')
              .select('id')
            allUsers = usersData
          }
          
          const now = new Date()
          const onlineThreshold = 5 * 60 * 1000 // 5 minutes in milliseconds
          const onlineUserIds = new Set()
          
          // Use last_seen to determine online status
          // If last_seen column exists, check timestamps
          // If it doesn't exist, we'll only show current user as online
          allUsers?.forEach(user => {
            if (user.last_seen) {
              const lastSeen = new Date(user.last_seen)
              const timeDiff = now - lastSeen
              if (timeDiff <= onlineThreshold) {
                onlineUserIds.add(user.id)
              }
            }
            // If last_seen is null/undefined, user is considered offline
          })
          
          // Always mark current user as online (they're using the app right now)
          if (currentUser) {
            onlineUserIds.add(currentUser.id)
          }
          
          // Only mark other users as online if they have a recent last_seen timestamp
          // Don't mark all users as online - only those who are actually active
          
          setOnlineUsers(onlineUserIds)
          console.log('🟢 Online users:', onlineUserIds.size, Array.from(onlineUserIds))
        } catch (error) {
          console.warn('Could not fetch online status:', error)
          // Fallback: only mark current user as online if we can't determine status
          const onlineUserIds = new Set()
          if (currentUser) {
            onlineUserIds.add(currentUser.id)
          }
          setOnlineUsers(onlineUserIds)
        }
      }
      
      // Initial fetch
      await fetchOnlineStatus()
      
      // Track if page is visible
      let isPageVisible = true
      
      // Handle page visibility changes (tab switch, minimize, close)
      const handleVisibilityChange = () => {
        isPageVisible = !document.hidden
        if (!isPageVisible && currentUser) {
          // Page is hidden - don't update last_seen anymore
          console.log('📴 Page hidden - stopping online status updates')
        }
      }
      
      // Handle page unload (browser close)
      const handleBeforeUnload = () => {
        // When page is closing, we can't update last_seen
        // The user will appear offline after 5 minutes
        console.log('👋 Page unloading - user will appear offline soon')
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('beforeunload', handleBeforeUnload)
      
      // Update every 30 seconds (only when page is visible)
      const interval = setInterval(async () => {
        // Only update if page is visible
        if (isPageVisible && currentUser) {
          try {
            await supabase
              .from('users')
              .update({ last_seen: new Date().toISOString() })
              .eq('id', currentUser.id)
          } catch (err) {
            // Ignore errors if column doesn't exist
          }
        }
        
        // Always fetch online status to update the display
        await fetchOnlineStatus()
      }, 30000)
      
      return () => {
        clearInterval(interval)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    } catch (error) {
      console.warn('Error setting up online tracking:', error)
      // Fallback: only mark current user as online
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const onlineUserIds = new Set()
      if (currentUser) {
        onlineUserIds.add(currentUser.id)
      }
      setOnlineUsers(onlineUserIds)
      
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
    appointAsHOD,
    removeHOD,
    appointAsClassAdvisor,
    removeClassAdvisor
  }
}
