import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'

const DepartmentOverview = () => {
  const { userProfile } = useAuth()
  const [departments, setDepartments] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [overviewData, setOverviewData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchDepartments()
  }, [])

  useEffect(() => {
    if (selectedDepartment && selectedDate) {
      fetchOverviewData()
    }
  }, [selectedDepartment, selectedDate])

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setDepartments(data || [])
      if (data && data.length > 0) {
        setSelectedDepartment(data[0].id)
      }
    } catch (err) {
      console.error('Error fetching departments:', err)
    }
  }

  const fetchOverviewData = async () => {
    setLoading(true)
    try {
      // Fetch all classes for the selected department
      const { data: classes, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('department_id', selectedDepartment)
        .order('name', { ascending: true })

      if (classError) throw classError

      const overviewPromises = classes.map(async (cls) => {
        // Get total students in class
        const { data: students, error: studentError } = await supabase
          .from('students')
          .select('id, status')
          .eq('class_id', cls.id)

        if (studentError) throw studentError

        const totalStudents = students.length
        const suspendedCount = students.filter(s => s.status === 'suspended').length
        const internCount = students.filter(s => s.status === 'intern').length
        const activeStudents = students.filter(s => !s.status || s.status === 'active')

        // Get attendance for the selected date
        const { data: attendance, error: attendanceError } = await supabase
          .from('period_attendance')
          .select(`
            student_id,
            student_attendance (
              status,
              approval_status
            )
          `)
          .eq('class_id', cls.id)
          .eq('date', selectedDate)

        if (attendanceError) throw attendanceError

        // Count unique students who attended
        const uniqueStudents = new Set()
        let approvedCount = 0
        let unapprovedCount = 0
        let odCount = 0

        attendance.forEach(record => {
          if (record.student_attendance && record.student_attendance.length > 0) {
            record.student_attendance.forEach(att => {
              uniqueStudents.add(record.student_id)
              
              if (att.status === 'on_duty') {
                odCount++
              } else if (att.approval_status === 'approved') {
                approvedCount++
              } else if (att.approval_status === 'pending') {
                unapprovedCount++
              }
            })
          }
        })

        const presentCount = uniqueStudents.size

        return {
          className: cls.name,
          present: presentCount,
          total: totalStudents,
          active: activeStudents.length,
          approved: approvedCount,
          unapproved: unapprovedCount,
          od: odCount,
          suspended: suspendedCount,
          intern: internCount
        }
      })

      const results = await Promise.all(overviewPromises)
      setOverviewData(results)
    } catch (err) {
      console.error('Error fetching overview data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const selectedDeptData = departments.find(d => d.id === selectedDepartment)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900 border border-white/20 rounded-xl p-6 animate-fadeIn">
        <h2 className="text-3xl font-bold text-white mb-4">
          Department Overview
        </h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Select Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-4 py-3 bg-black border-2 border-white/30 text-white rounded-lg focus:border-white outline-none transition-all duration-300"
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 bg-black border-2 border-white/30 text-white rounded-lg focus:border-white outline-none transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* Overview Report */}
      {loading ? (
        <div className="bg-gray-900 border border-white/20 rounded-xl p-12 text-center">
          <div className="animate-spin text-6xl mb-4 text-white">⟳</div>
          <p className="text-gray-400">Loading overview data...</p>
        </div>
      ) : selectedDeptData ? (
        <div className="bg-gray-900 border border-white/20 rounded-xl p-8 animate-scaleIn">
          {/* Report Header */}
          <div className="mb-8 pb-6 border-b-2 border-white/10">
            <div className="flex items-center gap-2 text-xl font-bold text-white mb-2">
              <span>Department: {selectedDeptData.name}</span>
            </div>
            <div className="flex items-center gap-2 text-lg text-gray-400">
              <span>Date: {formatDate(selectedDate)}</span>
            </div>
          </div>

          {/* Class-wise Data */}
          <div className="space-y-6">
            {overviewData.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-xl mb-2 font-bold">NO DATA</p>
                <p>No classes found for this department</p>
              </div>
            ) : (
              overviewData.map((classData, index) => (
                <div
                  key={index}
                  className="bg-black rounded-xl p-6 border-2 border-white/30 hover:border-white/50 transition-all duration-300"
                >
                  {/* Class Header */}
                  <div className="flex items-center gap-2 text-xl font-bold text-white mb-4">
                    <span>{classData.className}</span>
                    <span className="ml-auto text-white">
                      {classData.present}/{classData.active}
                    </span>
                  </div>

                  {/* Statistics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 ml-8">
                    {classData.approved > 0 && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="font-medium">Approved:</span>
                        <span className="font-bold text-white">{classData.approved}</span>
                      </div>
                    )}

                    {classData.unapproved > 0 && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="font-medium">Unapproved:</span>
                        <span className="font-bold text-white">{classData.unapproved}</span>
                      </div>
                    )}

                    {classData.od > 0 && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="font-medium">OD:</span>
                        <span className="font-bold text-white">{classData.od}</span>
                      </div>
                    )}

                    {classData.suspended > 0 && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="font-medium">Suspended:</span>
                        <span className="font-bold text-white">{classData.suspended}</span>
                      </div>
                    )}

                    {classData.intern > 0 && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <span className="font-medium">Intern:</span>
                        <span className="font-bold text-white">{classData.intern}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t-2 border-white/10 text-right">
            <p className="text-gray-400 font-semibold">
              Reported by: {userProfile?.name || 'Admin'}, {selectedDeptData.code}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default DepartmentOverview
