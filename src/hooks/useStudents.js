import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export const useStudents = () => {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStudents = async () => {
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
      
      let query = supabase
        .from('students')
        .select(`
          *,
          classes (id, name),
          departments (id, name, code)
        `)
      
      // Filter by stream
      if (profile?.stream_id) {
        // Both admin and staff see only their stream's students
        query = query.eq('stream_id', profile.stream_id)
      } else if (profile?.role === 'admin') {
        // Fallback: If no stream assigned, filter by created_by
        query = query.or(`created_by.eq.${user?.id},created_by.is.null`)
      }
      // If no stream and not admin, show all (backward compatibility)
      
      const { data, error } = await query.order('name', { ascending: true })

      if (error) throw error
      setStudents(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching students:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const addStudent = async (studentData) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase
        .from('students')
        .insert([{
          ...studentData,
          created_by: user?.id
        }])
        .select()

      if (error) throw error
      await fetchStudents()
      return { success: true, data }
    } catch (err) {
      console.error('Error adding student:', err)
      return { success: false, error: err.message }
    }
  }

  const updateStudent = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await fetchStudents()
      return { success: true }
    } catch (err) {
      console.error('Error updating student:', err)
      return { success: false, error: err.message }
    }
  }

  const deleteStudent = async (id) => {
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchStudents()
      return { success: true }
    } catch (err) {
      console.error('Error deleting student:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    students,
    loading,
    error,
    addStudent,
    updateStudent,
    deleteStudent,
    refetch: fetchStudents
  }
}
