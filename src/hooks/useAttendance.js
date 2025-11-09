import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export const useAttendance = () => {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAttendance = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('staff_attendance')
        .select(`
          *,
          users (id, name, email),
          sessions (id, name, start_time, end_time)
        `)
        .order('date', { ascending: false })

      if (error) throw error
      setAttendance(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching attendance:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttendance()
  }, [])

  const markAttendance = async (userId, date, status, sessionId = null) => {
    try {
      // Check if attendance already exists for this user, date, and session
      const { data: existing } = await supabase
        .from('staff_attendance')
        .select('id')
        .eq('user_id', userId)
        .eq('date', date)
        .eq('session_id', sessionId)
        .single()

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('staff_attendance')
          .update({ status, session_id: sessionId })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        // Insert new record
        const { error } = await supabase
          .from('staff_attendance')
          .insert([{ user_id: userId, date, status, session_id: sessionId }])

        if (error) throw error
      }
      await fetchAttendance()
      return { success: true }
    } catch (err) {
      console.error('Error marking attendance:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    attendance,
    loading,
    error,
    markAttendance,
    refetch: fetchAttendance
  }
}
