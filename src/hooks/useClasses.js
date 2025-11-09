import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export const useClasses = () => {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchClasses = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      // Get user profile to check role
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user?.id)
        .single()
      
      let query = supabase
        .from('classes')
        .select(`
          *,
          departments (id, name, code),
          users (id, name, email)
        `)
      
      // If admin, filter by created_by
      // If staff, show all classes (they can mark attendance for any class)
      if (profile?.role === 'admin') {
        query = query.or(`created_by.eq.${user?.id},created_by.is.null`)
      }
      // Staff sees all classes (no filter)
      
      const { data, error } = await query.order('name', { ascending: true })

      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching classes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClasses()
  }, [])

  const addClass = async (name, departmentId) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error} = await supabase
        .from('classes')
        .insert([{ 
          name, 
          department_id: departmentId,
          created_by: user?.id
        }])
        .select()

      if (error) throw error
      await fetchClasses()
      return { success: true, data }
    } catch (err) {
      console.error('Error adding class:', err)
      return { success: false, error: err.message }
    }
  }

  const updateClass = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('classes')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await fetchClasses()
      return { success: true }
    } catch (err) {
      console.error('Error updating class:', err)
      return { success: false, error: err.message }
    }
  }

  const deleteClass = async (id) => {
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchClasses()
      return { success: true }
    } catch (err) {
      console.error('Error deleting class:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    classes,
    loading,
    error,
    addClass,
    updateClass,
    deleteClass,
    refetch: fetchClasses
  }
}
