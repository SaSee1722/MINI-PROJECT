import { useState } from 'react'
import { supabase } from '../services/supabase'

export const useAdminTools = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const getStreamClassIds = async (streamId) => {
    const { data } = await supabase.from('classes').select('id').eq('stream_id', streamId)
    return (data || []).map(c => c.id)
  }

  const getUsersByStream = async (streamId) => {
    const { data } = await supabase.from('users').select('id').eq('stream_id', streamId)
    return (data || []).map(u => u.id)
  }

  const deleteByIds = async (table, column, ids) => {
    if (!ids || ids.length === 0) return { success: true }
    const { error } = await supabase.from(table).delete().in(column, ids)
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  const resetStreamData = async (streamId) => {
    try {
      setLoading(true)
      setError(null)
      const classIds = await getStreamClassIds(streamId)
      const userIds = await getUsersByStream(streamId)

      const { data: periodHeaders } = await supabase
        .from('period_attendance')
        .select('id')
        .in('class_id', classIds)
      const periodIds = (periodHeaders || []).map(r => r.id)

      const r1 = await deleteByIds('period_student_attendance', 'period_attendance_id', periodIds)
      if (!r1.success) throw new Error(r1.error)
      const r2 = await deleteByIds('period_attendance', 'id', periodIds)
      if (!r2.success) throw new Error(r2.error)
      const r3 = await deleteByIds('staff_attendance', 'user_id', userIds)
      if (!r3.success) throw new Error(r3.error)
      const r4 = await deleteByIds('timetable', 'class_id', classIds)
      if (!r4.success) throw new Error(r4.error)
      const r5 = await deleteByIds('students', 'class_id', classIds)
      if (!r5.success) throw new Error(r5.error)
      const r6 = await deleteByIds('classes', 'id', classIds)
      if (!r6.success) throw new Error(r6.error)
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  const resetAllData = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data: allPeriod } = await supabase.from('period_attendance').select('id')
      const periodIds = (allPeriod || []).map(r => r.id)
      const { data: allClasses } = await supabase.from('classes').select('id')
      const classIds = (allClasses || []).map(c => c.id)
      const { data: allUsers } = await supabase.from('users').select('id')
      const userIds = (allUsers || []).map(u => u.id)

      const r1 = await deleteByIds('period_student_attendance', 'period_attendance_id', periodIds)
      if (!r1.success) throw new Error(r1.error)
      const r2 = await deleteByIds('period_attendance', 'id', periodIds)
      if (!r2.success) throw new Error(r2.error)
      const r3 = await deleteByIds('staff_attendance', 'user_id', userIds)
      if (!r3.success) throw new Error(r3.error)
      const r4 = await deleteByIds('timetable', 'class_id', classIds)
      if (!r4.success) throw new Error(r4.error)
      const r5 = await deleteByIds('students', 'class_id', classIds)
      if (!r5.success) throw new Error(r5.error)
      const r6 = await deleteByIds('classes', 'id', classIds)
      if (!r6.success) throw new Error(r6.error)
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, resetStreamData, resetAllData }
}