import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export const useAttendance = () => {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAttendance = async () => {
    try {
      setLoading(true)
      
      // Get current user and their role
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setAttendance([])
        setLoading(false)
        return
      }

      // Get user profile to check role and stream
      const { data: profile } = await supabase
        .from('users')
        .select('role, stream_id')
        .eq('id', user.id)
        .single()

      let query = supabase
        .from('staff_attendance')
        .select(`
          *,
          users!inner (id, name, email, stream_id),
          sessions (id, name, start_time, end_time)
        `)
        .order('date', { ascending: false })

      // Filter by stream for admin users
      if (profile?.role === 'admin' && profile?.stream_id) {
        console.log('🔍 Admin filtering staff attendance by stream:', profile.stream_id)
        query = query.eq('users.stream_id', profile.stream_id)
      }

      const { data, error } = await query

      if (error) throw error
      console.log('✅ Staff attendance records fetched:', data?.length || 0)
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
