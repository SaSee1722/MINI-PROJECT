import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export const useClasses = () => {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchClasses = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      // Get user profile to check role and stream
      const { data: profile } = await supabase
        .from('users')
        .select('role, stream_id')
        .eq('id', user?.id)
        .single()
      
      console.log('🚀 fetchClasses initiated. User ID:', user?.id)
      console.log('📊 Profile for filter:', profile)

      let query = supabase
        .from('classes')
        .select('id, name, stream_id, created_by, created_at')
      
      // Filter by role/stream
      if (profile?.role === 'admin') {
        console.log('🔍 Admin view: Fetching all institutional classes')
        // Admins see everything
      } else if (profile?.stream_id) {
        console.log('🔍 Filtering classes by stream_id:', profile.stream_id)
        query = query.eq('stream_id', profile.stream_id)
      }
      
      const { data, error } = await query.order('name', { ascending: true })

      if (error) {
        console.error('❌ Supabase fetch error in useClasses:', error)
        throw error
      }
      
      console.log('✅ fetchClasses Success. Count:', data?.length || 0)
      if (data && data.length > 0) {
        console.log('📋 Sample class:', data[0])
      }
      setClasses(data || [])
    } catch (err) {
      console.error('CRITICAL: useClasses hook failed:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClasses()
  }, [])

  const addClass = async (name, streamId) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error} = await supabase
        .from('classes')
        .insert([{ 
          name, 
          stream_id: streamId,
          created_by: user?.id
        }])
        .select()

      if (error) throw error
      
      // Immediately add the new class to the state for instant UI update
      if (data && data.length > 0) {
        const newClass = data[0]
        setClasses(prevClasses => [...prevClasses, newClass])
      }
      
      // Also refresh in background to ensure consistency
      setTimeout(async () => {
        await fetchClasses()
      }, 500)
      
      return { success: true, data }
    } catch (err) {
      console.error('Error adding class:', err)
      return { success: false, error: err.message }
    }
  }

  const updateClass = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('classes')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await fetchClasses()
      return { success: true }
    } catch (err) {
      console.error('Error updating class:', err)
      return { success: false, error: err.message }
    }
  }

  const deleteClass = async (id) => {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchClasses()
      return { success: true }
    } catch (err) {
      console.error('Error deleting class:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    classes,
    loading,
    error,
    addClass,
    updateClass,
    deleteClass,
    refetch: fetchClasses
  }
}
