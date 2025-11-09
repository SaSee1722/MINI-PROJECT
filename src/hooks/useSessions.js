import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export const useSessions = () => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('start_time', { ascending: true })

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
      const { data, error } = await supabase
        .from('sessions')
        .insert([{ name, start_time: startTime, end_time: endTime }])
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
