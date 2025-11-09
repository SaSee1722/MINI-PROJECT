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
      
      console.log('User Profile:', profile) // DEBUG
      console.log('Department ID:', profile?.department_id) // DEBUG
      
      // Fetch ALL departments first
      const { data: allDepts, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true })

      if (deptError) throw deptError

      console.log('All Departments:', allDepts) // DEBUG

      // Filter departments based on user's department_id
      let filteredDepts = allDepts
      
      if (profile?.department_id) {
        // Filter to show only user's department
        filteredDepts = allDepts.filter(dept => dept.id === profile.department_id)
        console.log('Filtered to user department:', filteredDepts) // DEBUG
      } else {
        console.warn('No department_id found for user! Showing all departments.') // DEBUG
        // If no department assigned, show empty array (don't show all departments)
        filteredDepts = []
      }

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
      const departmentsWithCounts = filteredDepts.map(dept => ({
        ...dept,
        student_count: counts[dept.id] || 0
      }))

      console.log('Final Departments:', departmentsWithCounts) // DEBUG
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
