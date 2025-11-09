import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export const useSessions = () => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSessions = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      // Get user profile to check role and department
      const { data: profile } = await supabase
        .from('users')
        .select('role, department_id')
        .eq('id', user?.id)
        .single()
      
      let query = supabase
        .from('sessions')
        .select('*')
      
      // Sessions are global (not department-specific)
      // But filter by created_by for admin
      if (profile?.role === 'admin') {
        query = query.or(`created_by.eq.${user?.id},created_by.is.null`)
      }
      // Staff sees all sessions (sessions are time periods, not department-specific)
      
      const { data, error } = await query.order('start_time', { ascending: true })

      if (error) throw error
      setSessions(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const addSession = async (name, startTime, endTime) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase
        .from('sessions')
        .insert([{ 
          name, 
          start_time: startTime, 
          end_time: endTime,
          created_by: user?.id
        }])
        .select()

      if (error) throw error
      await fetchSessions()
      return { success: true, data }
    } catch (err) {
      console.error('Error adding session:', err)
      return { success: false, error: err.message }
    }
  }

  const updateSession = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await fetchSessions()
      return { success: true }
    } catch (err) {
      console.error('Error updating session:', err)
      return { success: false, error: err.message }
    }
  }

  const deleteSession = async (id) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchSessions()
      return { success: true }
    } catch (err) {
      console.error('Error deleting session:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    sessions,
    loading,
    error,
    addSession,
    updateSession,
    deleteSession,
    refetch: fetchSessions
  }
}
