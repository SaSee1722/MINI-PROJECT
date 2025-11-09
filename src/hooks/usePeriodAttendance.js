import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'

export const usePeriodAttendance = (classId = null, date = null) => {
  const { user } = useAuth()
  const [periodAttendance, setPeriodAttendance] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchPeriodAttendance = async (selectedClassId = classId, selectedDate = date) => {
    try {
      if (!selectedClassId || !selectedDate) return

      setLoading(true)
      const { data, error } = await supabase
        .from('period_attendance')
        .select(`
          *,
          timetable (
            subject_code,
            subject_name,
            faculty_name,
            period_number,
            day_of_week
          )
        `)
        .eq('class_id', selectedClassId)
        .eq('date', selectedDate)

      if (error) throw error
      setPeriodAttendance(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching period attendance:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (classId && date) {
      fetchPeriodAttendance(classId, date)
    }
  }, [classId, date])

  const markPeriodAttendance = async (timetableId, classId, date, dayOfWeek, periodNumber, studentAttendance, alternativeStaffData = null) => {
    try {
      // Calculate counts
      const totalStudents = studentAttendance.length
      const presentCount = studentAttendance.filter(s => s.status === 'present').length
      const absentCount = studentAttendance.filter(s => s.status === 'absent').length
      const onDutyCount = studentAttendance.filter(s => s.status === 'on_duty').length

      // Check if period attendance already exists
      const { data: existing } = await supabase
        .from('period_attendance')
        .select('id')
        .eq('timetable_id', timetableId)
        .eq('date', date)
        .single()

      let periodAttendanceId

      // Prepare attendance data with alternative staff info
      const attendanceData = {
        is_marked: true,
        total_students: totalStudents,
        present_count: presentCount,
        absent_count: absentCount,
        on_duty_count: onDutyCount,
        marked_by: user?.id,
        marked_at: new Date().toISOString(),
        is_alternative_staff: alternativeStaffData?.isAlternative || false,
        alternative_staff_id: alternativeStaffData?.isAlternative ? alternativeStaffData.staffId : null,
        alternative_staff_name: alternativeStaffData?.isAlternative ? alternativeStaffData.staffName : null
      }

      if (existing) {
        // Update existing period attendance
        const { data, error } = await supabase
          .from('period_attendance')
          .update(attendanceData)
          .eq('id', existing.id)
          .select()

        if (error) throw error
        periodAttendanceId = existing.id
      } else {
        // Insert new period attendance
        const { data, error } = await supabase
          .from('period_attendance')
          .insert([{
            timetable_id: timetableId,
            class_id: classId,
            date: date,
            day_of_week: dayOfWeek,
            period_number: periodNumber,
            ...attendanceData
          }])
          .select()

        if (error) throw error
        periodAttendanceId = data[0].id
      }

      // Delete existing student attendance for this period
      await supabase
        .from('period_student_attendance')
        .delete()
        .eq('period_attendance_id', periodAttendanceId)

      // Insert student attendance
      const studentAttendanceData = studentAttendance.map(s => ({
        period_attendance_id: periodAttendanceId,
        student_id: s.student_id,
        status: s.status,
        approval_status: s.approval_status || null
      }))

      const { error: studentError } = await supabase
        .from('period_student_attendance')
        .insert(studentAttendanceData)

      if (studentError) throw studentError

      await fetchPeriodAttendance(classId, date)
      return { success: true }
    } catch (err) {
      console.error('Error marking period attendance:', err)
      return { success: false, error: err.message }
    }
  }

  const getPeriodStudentAttendance = async (periodAttendanceId) => {
    try {
      const { data, error } = await supabase
        .from('period_student_attendance')
        .select(`
          *,
          students (
            id,
            roll_number,
            name
          )
        `)
        .eq('period_attendance_id', periodAttendanceId)

      if (error) throw error
      return { success: true, data: data || [] }
    } catch (err) {
      console.error('Error fetching period student attendance:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    periodAttendance,
    loading,
    error,
    markPeriodAttendance,
    getPeriodStudentAttendance,
    refetch: fetchPeriodAttendance
  }
}
