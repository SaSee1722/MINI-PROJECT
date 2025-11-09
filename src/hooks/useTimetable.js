import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export const useTimetable = (classId = null) => {
  const [timetable, setTimetable] = useState([])
  const [periodTimes, setPeriodTimes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPeriodTimes = async () => {
    try {
      const { data, error } = await supabase
        .from('period_times')
        .select('*')
        .order('period_number', { ascending: true })

      if (error) throw error
      setPeriodTimes(data || [])
    } catch (err) {
      console.error('Error fetching period times:', err)
    }
  }

  const fetchTimetable = async (selectedClassId = classId) => {
    try {
      setLoading(true)
      
      if (!selectedClassId) {
        setTimetable([])
        return
      }

      const { data, error } = await supabase
        .from('timetable')
        .select('*')
        .eq('class_id', selectedClassId)
        .order('day_of_week', { ascending: true })
        .order('period_number', { ascending: true })

      if (error) throw error
      setTimetable(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching timetable:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPeriodTimes()
  }, [])

  useEffect(() => {
    if (classId) {
      fetchTimetable(classId)
    }
  }, [classId])

  const addTimetableEntry = async (entry) => {
    try {
      const { data, error } = await supabase
        .from('timetable')
        .insert([entry])
        .select()

      if (error) throw error
      
      // Refresh the timetable data
      await fetchTimetable(entry.class_id)
      
      return { success: true, data }
    } catch (err) {
      console.error('Error adding timetable entry:', err)
      return { success: false, error: err.message }
    }
  }

  const updateTimetableEntry = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('timetable')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await fetchTimetable(classId)
      return { success: true }
    } catch (err) {
      console.error('Error updating timetable entry:', err)
      return { success: false, error: err.message }
    }
  }

  const deleteTimetableEntry = async (id) => {
    try {
      const { error } = await supabase
        .from('timetable')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchTimetable(classId)
      return { success: true }
    } catch (err) {
      console.error('Error deleting timetable entry:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    timetable,
    periodTimes,
    loading,
    error,
    addTimetableEntry,
    updateTimetableEntry,
    deleteTimetableEntry,
    refetch: fetchTimetable
  }
}
