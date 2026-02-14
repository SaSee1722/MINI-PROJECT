import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'

export const useDailyAttendance = (classId, date) => {
  const [dailyAttendance, setDailyAttendance] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { user } = useAuth()

  const fetchDailyAttendance = async () => {
    if (!classId || !date) return
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('daily_student_attendance')
        .select('*')
        .eq('class_id', classId)
        .eq('date', date)

      if (error) throw error
      
      const attendanceMap = {}
      data.forEach(record => {
        attendanceMap[record.student_id] = {
          status: record.status,
          approval_status: record.approval_status || 'approved'
        }
      })
      setDailyAttendance(attendanceMap)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching daily attendance:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDailyAttendance()
  }, [classId, date])

  const markDailyAttendance = async (studentId, status, approvalStatus = 'approved') => {
    try {
      const { data: existing } = await supabase
        .from('daily_student_attendance')
        .select('id')
        .eq('student_id', studentId)
        .eq('date', date)
        .single()

      const payload = {
        student_id: studentId,
        class_id: classId,
        date,
        status,
        approval_status: approvalStatus,
        marked_by: user?.id,
        updated_at: new Date().toISOString()
      }

      if (existing) {
        const { error } = await supabase
          .from('daily_student_attendance')
          .update(payload)
          .eq('id', existing.id)
        
        // If approval_status column doesn't exist, retry without it
        if (error && error.message.includes('approval_status')) {
          delete payload.approval_status
          const { error: retryError } = await supabase
            .from('daily_student_attendance')
            .update(payload)
            .eq('id', existing.id)
          if (retryError) throw retryError
        } else if (error) throw error
      } else {
        const { error } = await supabase
          .from('daily_student_attendance')
          .insert([payload])
        
        // If approval_status column doesn't exist, retry without it
        if (error && error.message.includes('approval_status')) {
          delete payload.approval_status
          const { error: retryError } = await supabase
            .from('daily_student_attendance')
            .insert([payload])
          if (retryError) throw retryError
        } else if (error) throw error
      }
      
      setDailyAttendance(prev => ({ 
        ...prev, 
        [studentId]: { status, approval_status: approvalStatus } 
      }))
      return { success: true }
    } catch (err) {
      console.error('Error marking daily attendance:', err)
      return { success: false, error: err.message }
    }
  }

  const bulkMarkDailyAttendance = async (records) => {
    try {
      const { error } = await supabase
        .from('daily_student_attendance')
        .upsert(records, { onConflict: 'student_id,date' })

      if (error) {
        // If approval_status column doesn't exist, retry without it
        if (error.message.includes('approval_status')) {
          const cleanedRecords = records.map(({ approval_status, ...rest }) => rest)
          const { error: retryError } = await supabase
            .from('daily_student_attendance')
            .upsert(cleanedRecords, { onConflict: 'student_id,date' })
          if (retryError) throw retryError
        } else throw error
      }
      
      await fetchDailyAttendance()
      return { success: true }
    } catch (err) {
      console.error('Error bulk marking daily attendance:', err)
      return { success: false, error: err.message }
    }
  }

  const fetchRecentHistory = async (limit = 10) => {
    if (!classId) return []
    try {
      const { data, error } = await supabase
        .from('daily_student_attendance')
        .select(`
          status,
          date,
          student_id,
          students (name, roll_number)
        `)
        .eq('class_id', classId)
        .order('date', { ascending: false })
      
      if (error) throw error

      // Group by date
      const grouped = (data || []).reduce((acc, record) => {
        const d = record.date
        if (!acc[d]) acc[d] = []
        acc[d].push(record)
        return acc
      }, {})

      return Object.entries(grouped)
        .sort(([a], [b]) => new Date(b) - new Date(a))
        .map(([date, records]) => ({ 
          date, 
          allRecords: records,
          exceptions: records.filter(r => r.status !== 'present')
        }))
        .slice(0, limit)
    } catch (err) {
      console.error('Error fetching recent history:', err)
      return []
    }
  }

  return {
    dailyAttendance,
    loading,
    error,
    markDailyAttendance,
    bulkMarkDailyAttendance,
    fetchRecentHistory,
    refetch: fetchDailyAttendance
  }
}
