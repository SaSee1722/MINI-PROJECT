import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'

export const useStudentAttendance = () => {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const fetchAttendance = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('student_attendance')
        .select(`
          *,
          students (
            id, 
            roll_number, 
            name,
            departments (id, name, code)
          ),
          classes (id, name),
          sessions (id, name, start_time, end_time)
        `)
        .order('date', { ascending: false })

      if (error) throw error
      setAttendance(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching student attendance:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttendance()
  }, [])

  const markAttendance = async (studentId, classId, sessionId, date, status, approvalStatus = null) => {
    try {
      // Check if attendance already exists
      const { data: existing } = await supabase
        .from('student_attendance')
        .select('id')
        .eq('student_id', studentId)
        .eq('date', date)
        .eq('session_id', sessionId)
        .single()

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('student_attendance')
          .update({ 
            status, 
            class_id: classId, 
            marked_by: user?.id,
            approval_status: approvalStatus 
          })
          .eq('id', existing.id)

        if (error) throw error
      } else {
        // Insert new record
        const { error } = await supabase
          .from('student_attendance')
          .insert([{
            student_id: studentId,
            class_id: classId,
            session_id: sessionId,
            date,
            status,
            approval_status: approvalStatus,
            marked_by: user?.id
          }])

        if (error) throw error
      }
      await fetchAttendance()
      return { success: true }
    } catch (err) {
      console.error('Error marking student attendance:', err)
      return { success: false, error: err.message }
    }
  }

  const bulkMarkAttendance = async (attendanceRecords) => {
    try {
      const { error } = await supabase
        .from('student_attendance')
        .upsert(attendanceRecords, {
          onConflict: 'student_id,date,session_id'
        })

      if (error) throw error
      await fetchAttendance()
      return { success: true }
    } catch (err) {
      console.error('Error bulk marking attendance:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    attendance,
    loading,
    error,
    markAttendance,
    bulkMarkAttendance,
    refetch: fetchAttendance
  }
}
