import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export const useDepartments = () => {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDepartments = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      // Get user profile to check department
      const { data: profile } = await supabase
        .from('users')
        .select('role, department_id')
        .eq('id', user?.id)
        .single()
      
      let query = supabase
        .from('departments')
        .select('*')
      
      // Filter by department
      if (profile?.department_id) {
        // Admin and staff see only their department
        query = query.eq('id', profile.department_id)
      } else if (profile?.role === 'admin') {
        // Fallback: If no department assigned, filter by created_by
        query = query.or(`created_by.eq.${user?.id},created_by.is.null`)
      }
      
      const { data: depts, error: deptError } = await query.order('name', { ascending: true })

      if (deptError) throw deptError

      // Fetch student counts for each department
      const { data: studentCounts, error: countError } = await supabase
        .from('students')
        .select('department_id')

      if (countError) throw countError

      // Count students per department
      const counts = {}
      studentCounts.forEach(student => {
        counts[student.department_id] = (counts[student.department_id] || 0) + 1
      })

      // Add student count to each department
      const departmentsWithCounts = depts.map(dept => ({
        ...dept,
        student_count: counts[dept.id] || 0
      }))

      setDepartments(departmentsWithCounts || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching departments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDepartments()
  }, [])

  const addDepartment = async (name, code, description) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase
        .from('departments')
        .insert([{ 
          name, 
          code, 
          description,
          created_by: user?.id 
        }])
        .select()

      if (error) throw error
      await fetchDepartments()
      return { success: true, data }
    } catch (err) {
      console.error('Error adding department:', err)
      return { success: false, error: err.message }
    }
  }

  const updateDepartment = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('departments')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      await fetchDepartments()
      return { success: true }
    } catch (err) {
      console.error('Error updating department:', err)
      return { success: false, error: err.message }
    }
  }

  const deleteDepartment = async (id) => {
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchDepartments()
      return { success: true }
    } catch (err) {
      console.error('Error deleting department:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    departments,
    loading,
    error,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    refetch: fetchDepartments
  }
}
