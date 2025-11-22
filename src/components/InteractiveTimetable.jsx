import { useState, useEffect } from 'react'
import { useTimetable } from '../hooks/useTimetable'
import { usePeriodAttendance } from '../hooks/usePeriodAttendance'
import { useStudents } from '../hooks/useStudents'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'
import AttendanceCheckbox from './AttendanceCheckbox'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from './Toast'

const InteractiveTimetable = ({ classId, selectedDate }) => {
  const { user, userProfile } = useAuth()
  const { timetable, periodTimes, loading, addTimetableEntry, refetch: refetchTimetable } = useTimetable(classId)
  const { periodAttendance, markPeriodAttendance, getPeriodStudentAttendance, refetch: refetchAttendance } = usePeriodAttendance(classId, selectedDate)
  const { students } = useStudents()
  const { toasts, removeToast, showSuccess, showError, showWarning } = useToast()
  
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const [attendanceMap, setAttendanceMap] = useState({})
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [showAddPeriodModal, setShowAddPeriodModal] = useState(false)
  const [showViewAttendanceModal, setShowViewAttendanceModal] = useState(false)
  const [viewAttendanceData, setViewAttendanceData] = useState(null)
  const [isAlternativeStaff, setIsAlternativeStaff] = useState(false)
  const [allStaff, setAllStaff] = useState([])
  const [selectedAlternativeStaff, setSelectedAlternativeStaff] = useState('')
  const [newPeriodData, setNewPeriodData] = useState({
    dayOfWeek: 1,
    periodNumber: 1,
    subjectCode: '',
    subjectName: '',
    facultyName: '',
    facultyCode: '',
    isLab: false
  })

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const periods = [1, 2, 3, 4, 5, 6]

  // Fetch all staff members for alternative staff selection
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('role', 'staff')
          .order('name')
        
        if (error) throw error
        setAllStaff(data || [])
      } catch (err) {
        console.error('Error fetching staff:', err)
      }
    }
    
    fetchStaff()
  }, [])

  // Get date for each day of the current week
  const getDateForDay = (dayIndex) => {
    const today = new Date(selectedDate)
    const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    const adjustedCurrentDay = currentDay === 0 ? 7 : currentDay // Convert Sunday to 7
    const diff = (dayIndex + 1) - adjustedCurrentDay
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + diff)
    return targetDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })
  }

  // Get timetable entry for specific day and period
  const getTimetableEntry = (dayIndex, periodNum) => {
    return timetable.find(t => t.day_of_week === dayIndex + 1 && t.period_number === periodNum)
  }

  // Check if period is marked
  const isPeriodMarked = (dayIndex, periodNum) => {
    const entry = getTimetableEntry(dayIndex, periodNum)
    if (!entry) return false
    
    return periodAttendance.some(pa => 
      pa.timetable_id === entry.id && 
      pa.is_marked === true
    )
  }

  // Get period time
  const getPeriodTime = (periodNum) => {
    const period = periodTimes.find(p => p.period_number === periodNum)
    if (!period) return ''
    return `${period.start_time.slice(0, 5)} - ${period.end_time.slice(0, 5)}`
  }

  // Handle add period click
  const handleAddPeriodClick = (dayIndex, periodNum) => {
    setNewPeriodData({
      dayOfWeek: dayIndex + 1,
      periodNumber: periodNum,
      subjectCode: '',
      subjectName: '',
      facultyName: '',
      facultyCode: '',
      isLab: false
    })
    setShowAddPeriodModal(true)
  }

  // Handle period click
  const handlePeriodClick = async (dayIndex, periodNum) => {
    const entry = getTimetableEntry(dayIndex, periodNum)
    if (!entry) return

    // Check if user is admin - admins can only view, not mark attendance
    if (userProfile?.role === 'admin') {
      showWarning('Admin cannot perform attendance marking action')
      return
    }

    const isMarked = isPeriodMarked(dayIndex, periodNum)
    
    if (isMarked) {
      // Show view attendance modal
      const periodAttendanceRecord = periodAttendance.find(pa => 
        pa.timetable_id === entry.id && pa.is_marked === true
      )
      
      if (periodAttendanceRecord) {
        const result = await getPeriodStudentAttendance(periodAttendanceRecord.id)
        if (result.success) {
          setViewAttendanceData({
            ...periodAttendanceRecord,
            studentAttendance: result.data,
            entry: entry
          })
          setShowViewAttendanceModal(true)
        }
      }
    } else {
      // Show mark attendance modal (only for staff)
      setSelectedPeriod({ ...entry, dayIndex, periodNum })
      setAttendanceMap({})
      setIsAlternativeStaff(false)
      setSelectedAlternativeStaff('')
      setShowAttendanceModal(true)
    }
  }

  // Handle attendance change
  const handleAttendanceChange = (studentId, status, approvalStatus) => {
    setAttendanceMap({
      ...attendanceMap,
      [studentId]: { status, approvalStatus }
    })
  }

  // Mark all students as present
  const handleMarkAllPresent = () => {
    const allPresentMap = {}
    classStudents.forEach(student => {
      allPresentMap[student.id] = { status: 'present', approvalStatus: 'approved' }
    })
    setAttendanceMap(allPresentMap)
  }

  // Submit attendance
  const handleSubmitAttendance = async () => {
    if (!selectedPeriod) return

    // Validate alternative staff selection if enabled
    if (isAlternativeStaff && !selectedAlternativeStaff) {
      showWarning('Please select an alternative staff member')
      return
    }

    const studentAttendance = Object.entries(attendanceMap).map(([studentId, data]) => ({
      student_id: studentId,
      status: data.status,
      approval_status: data.approvalStatus
    }))

    if (studentAttendance.length === 0) {
      showWarning('Please mark attendance for at least one student')
      return
    }

    // Prepare alternative staff data if applicable
    let alternativeStaffData = null
    if (isAlternativeStaff && selectedAlternativeStaff) {
      const selectedStaff = allStaff.find(s => s.id === selectedAlternativeStaff)
      alternativeStaffData = {
        isAlternative: true,
        staffId: selectedAlternativeStaff,
        staffName: selectedStaff?.name || 'Unknown'
      }
    }

    const result = await markPeriodAttendance(
      selectedPeriod.id,
      classId,
      selectedDate,
      selectedPeriod.day_of_week,
      selectedPeriod.period_number,
      studentAttendance,
      alternativeStaffData
    )

    if (result.success) {
      const message = isAlternativeStaff 
        ? `🎉 Attendance marked successfully by alternative staff: ${alternativeStaffData.staffName}!`
        : '🎉 Attendance marked successfully!'
      showSuccess(message)
      setShowAttendanceModal(false)
      setSelectedPeriod(null)
      setAttendanceMap({})
      setIsAlternativeStaff(false)
      setSelectedAlternativeStaff('')
      refetchAttendance(classId, selectedDate)
    } else {
      showError('Error: ' + result.error)
    }
  }

  // Handle add period submit
  const handleAddPeriodSubmit = async (e) => {
    e.preventDefault()
    
    const result = await addTimetableEntry({
      class_id: classId,
      day_of_week: newPeriodData.dayOfWeek,
      period_number: newPeriodData.periodNumber,
      subject_code: newPeriodData.subjectCode,
      subject_name: newPeriodData.subjectName,
      faculty_name: newPeriodData.facultyName,
      faculty_code: newPeriodData.facultyCode,
      is_lab: newPeriodData.isLab
    })

    if (result.success) {
      // Explicitly refetch the timetable to ensure UI updates
      await refetchTimetable(classId)
      
      showSuccess('🎉 Period added successfully!')
      setShowAddPeriodModal(false)
      setNewPeriodData({
        dayOfWeek: 1,
        periodNumber: 1,
        subjectCode: '',
        subjectName: '',
        facultyName: '',
        facultyCode: '',
        isLab: false
      })
    } else {
      showError('Error: ' + result.error)
    }
  }

  // Filter students by class - exclude suspended and intern students from attendance marking
  const classStudents = students.filter(s => s.class_id === classId && s.status !== 'suspended' && s.status !== 'intern')
  
  // Get suspended students separately to display them
  const suspendedStudents = students.filter(s => s.class_id === classId && s.status === 'suspended')
  
  // Get intern students separately to display them
  const internStudents = students.filter(s => s.class_id === classId && s.status === 'intern')

  if (loading) {
    return <div className="text-center py-8">Loading timetable...</div>
  }

  if (!classId) {
    return <div className="text-center py-8 text-gray-500">Please select a class to view timetable</div>
  }

  return (
    <div className="space-y-6">
      {/* Timetable Grid */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-primary-600 to-primary-700">
          <h2 className="text-2xl font-bold text-white">Weekly Timetable</h2>
          {userProfile?.role === 'admin' ? (
            <p className="text-primary-100 mt-1">📋 Admin View: Timetable management only. Use staff account for attendance marking.</p>
          ) : (
            <p className="text-primary-100 mt-1">Click on any period to mark attendance</p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-gray-800 to-gray-700">
                <th className="border border-gray-600 px-4 py-4 text-left font-bold text-white text-base">Day / Period</th>
                {periods.map(period => (
                  <th key={period} className="border border-gray-600 px-4 py-4 text-center min-w-[150px]">
                    <div className="font-bold text-white text-base">Period {period}</div>
                    <div className="text-xs text-gray-300 mt-1 font-semibold">{getPeriodTime(period)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((day, dayIndex) => (
                <tr key={day} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-4 font-bold bg-gradient-to-r from-gray-100 to-gray-50">
                    <div className="text-gray-900 text-base">{day}</div>
                    <div className="text-sm text-gray-700 font-semibold mt-1">{getDateForDay(dayIndex)}</div>
                  </td>
                  {periods.map(period => {
                    const entry = getTimetableEntry(dayIndex, period)
                    const isMarked = isPeriodMarked(dayIndex, period)
                    
                    return (
                      <td 
                        key={period} 
                        className={`border border-gray-300 px-3 py-2 transition-all ${
                          userProfile?.role === 'admin' 
                            ? entry 
                              ? 'bg-gray-50 cursor-default' 
                              : 'bg-gray-100 cursor-default'
                            : entry 
                              ? isMarked 
                                ? 'bg-green-100 hover:bg-green-200 cursor-pointer' 
                                : 'bg-blue-50 hover:bg-blue-100 cursor-pointer'
                              : 'bg-gray-100 cursor-pointer'
                        }`}
                        onClick={() => entry && handlePeriodClick(dayIndex, period)}
                      >
                        {entry ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-sm text-gray-900">
                              {entry.subject_code}
                            </div>
                            <div className="text-xs text-gray-600 line-clamp-2">
                              {entry.subject_name}
                            </div>
                            <div className="text-xs text-primary-600 font-medium">
                              {entry.faculty_name}
                            </div>
                            {entry.is_lab && (
                              <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                                Lab
                              </span>
                            )}
                            {isMarked && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                                <span className="text-xs text-green-700 font-semibold">Marked</span>
                              </div>
                            )}
                          </div>
                        ) : userProfile?.role === 'admin' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddPeriodClick(dayIndex, period)
                            }}
                            className="w-full h-full flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all rounded group"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              <span className="text-xs font-medium">Add Period</span>
                            </div>
                          </button>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <span className="text-xs">No Period</span>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
              <span>Not Marked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>Attendance Marked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">Lab</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add Period Modal - NEW VERSION */}
      {showAddPeriodModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
              <h3 className="text-xl font-bold">Add Period to Timetable</h3>
              <p className="text-blue-100 text-sm mt-2">
                {days[newPeriodData.dayOfWeek - 1]} - Period {newPeriodData.periodNumber}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleAddPeriodSubmit} className="p-6 space-y-5">
              {/* Subject Code */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Subject Code *</label>
                <input
                  type="text"
                  placeholder="e.g., CS101"
                  value={newPeriodData.subjectCode}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, subjectCode: e.target.value })}
                  style={{ backgroundColor: '#ffffff', color: '#1f2937', borderColor: '#d1d5db' }}
                  className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  required
                />
              </div>

              {/* Subject Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Subject Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Data Structures"
                  value={newPeriodData.subjectName}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, subjectName: e.target.value })}
                  style={{ backgroundColor: '#ffffff', color: '#1f2937', borderColor: '#d1d5db' }}
                  className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  required
                />
              </div>

              {/* Faculty Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Faculty Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Dr. Smith"
                  value={newPeriodData.facultyName}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, facultyName: e.target.value })}
                  style={{ backgroundColor: '#ffffff', color: '#1f2937', borderColor: '#d1d5db' }}
                  className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  required
                />
              </div>

              {/* Faculty Code */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Faculty Code</label>
                <input
                  type="text"
                  placeholder="e.g., DS"
                  value={newPeriodData.facultyCode}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, facultyCode: e.target.value })}
                  style={{ backgroundColor: '#ffffff', color: '#1f2937', borderColor: '#d1d5db' }}
                  className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Lab Session Checkbox */}
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                <input
                  type="checkbox"
                  id="isLab"
                  checked={newPeriodData.isLab}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, isLab: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="isLab" className="text-sm font-semibold text-gray-800 cursor-pointer">This is a Lab Session</label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
                >
                  Add Period
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPeriodModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-300 text-gray-800 rounded-lg font-semibold hover:bg-gray-400 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && selectedPeriod && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold">{selectedPeriod.subject_name}</h3>
                  <p className="text-primary-100 mt-1">
                    {selectedPeriod.subject_code} • {selectedPeriod.faculty_name}
                  </p>
                  <p className="text-primary-100 text-sm mt-1">
                    Period {selectedPeriod.period_number} • {getPeriodTime(selectedPeriod.period_number)}
                  </p>
                </div>
                <button
                  onClick={() => setShowAttendanceModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Student List */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
              {/* Alternative Staff Section */}
              <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="alternativeStaff"
                    checked={isAlternativeStaff}
                    onChange={(e) => {
                      setIsAlternativeStaff(e.target.checked)
                      if (!e.target.checked) {
                        setSelectedAlternativeStaff('')
                      }
                    }}
                    className="mt-1 w-5 h-5 text-yellow-600 rounded"
                  />
                  <div className="flex-1">
                    <label htmlFor="alternativeStaff" className="block font-bold text-gray-900 mb-1 cursor-pointer">
                      🔄 Mark as Alternative Staff
                    </label>
                    <p className="text-sm text-gray-600 mb-3">
                      Check this if you are marking attendance on behalf of the regular faculty who is absent
                    </p>
                    
                    {isAlternativeStaff && (
                      <div className="mt-3">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Select Alternative Staff Member *
                        </label>
                        <select
                          value={selectedAlternativeStaff}
                          onChange={(e) => setSelectedAlternativeStaff(e.target.value)}
                          className="w-full px-4 py-2 border-2 border-yellow-400 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-gray-900"
                          required={isAlternativeStaff}
                        >
                          <option value="">-- Select Staff Member --</option>
                          {allStaff.map((staff) => (
                            <option key={staff.id} value={staff.id}>
                              {staff.name} ({staff.email})
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs text-gray-600">
                          ℹ️ The attendance report will show this staff member as the one who marked attendance
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mark All Present Button */}
              <div className="mb-4 flex justify-end">
                <button
                  onClick={handleMarkAllPresent}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mark All as Present
                </button>
              </div>
              
              <div className="space-y-3">
                {classStudents.map(student => (
                  <AttendanceCheckbox
                    key={student.id}
                    studentId={student.id}
                    studentName={student.name}
                    initialStatus={attendanceMap[student.id]?.status || ''}
                    initialApprovalStatus={attendanceMap[student.id]?.approvalStatus || ''}
                    onChange={handleAttendanceChange}
                  />
                ))}
              </div>
              
              {/* Intern Students Section */}
              {internStudents.length > 0 && (
                <div className="mt-6 pt-6 border-t-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-blue-700 font-bold text-lg">👔 Intern Students</span>
                    <span className="text-sm text-gray-500">(Cannot mark attendance)</span>
                  </div>
                  <div className="space-y-2">
                    {internStudents.map(student => (
                      <div 
                        key={student.id}
                        className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200 opacity-60"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-700">{student.name}</div>
                          <div className="text-xs text-gray-500">{student.roll_number}</div>
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          Intern
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Suspended Students Section */}
              {suspendedStudents.length > 0 && (
                <div className="mt-6 pt-6 border-t-2 border-red-200">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-red-700 font-bold text-lg">🚫 Suspended Students</span>
                    <span className="text-sm text-gray-500">(Cannot mark attendance)</span>
                  </div>
                  <div className="space-y-2">
                    {suspendedStudents.map(student => (
                      <div 
                        key={student.id}
                        className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200 opacity-60"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-700">{student.name}</div>
                          <div className="text-xs text-gray-500">{student.roll_number}</div>
                        </div>
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                          Suspended
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleSubmitAttendance}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Submit Attendance
              </button>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="px-6 py-3 bg-gray-400 text-white rounded-lg font-semibold hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Attendance Modal */}
      {showViewAttendanceModal && viewAttendanceData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-green-600 to-green-700 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold">{viewAttendanceData.entry.subject_name}</h3>
                  <p className="text-green-100 mt-1">
                    {viewAttendanceData.entry.subject_code} • {viewAttendanceData.entry.faculty_name}
                  </p>
                  <p className="text-green-100 text-sm mt-1">
                    Period {viewAttendanceData.period_number} • {getPeriodTime(viewAttendanceData.period_number)}
                  </p>
                  <p className="text-green-100 text-sm mt-2">
                    ✅ Marked on {new Date(viewAttendanceData.marked_at).toLocaleString()}
                  </p>
                  {viewAttendanceData.is_alternative_staff && (
                    <div className="mt-3 p-3 bg-yellow-500/20 border border-yellow-300 rounded-lg">
                      <p className="text-white font-semibold flex items-center gap-2">
                        <span>🔄</span>
                        <span>Marked by Alternative Staff:</span>
                      </p>
                      <p className="text-yellow-100 text-sm mt-1">
                        {viewAttendanceData.alternative_staff_name}
                      </p>
                      <p className="text-yellow-100 text-xs mt-1">
                        (Regular faculty: {viewAttendanceData.entry.faculty_name} was absent)
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowViewAttendanceModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Attendance Summary */}
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <h4 className="font-bold text-gray-900 mb-3">Attendance Summary</h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-gray-900">{viewAttendanceData.total_students}</div>
                  <div className="text-sm text-gray-600">Total Students</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{viewAttendanceData.present_count}</div>
                  <div className="text-sm text-green-600">Present</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-700">{viewAttendanceData.absent_count}</div>
                  <div className="text-sm text-red-600">Absent</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">{viewAttendanceData.on_duty_count}</div>
                  <div className="text-sm text-blue-600">On Duty</div>
                </div>
              </div>
            </div>

            {/* Student List */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-400px)]">
              <h4 className="font-bold text-gray-900 mb-4">Student Attendance Details</h4>
              <div className="space-y-2">
                {viewAttendanceData.studentAttendance.map((attendance) => (
                  <div 
                    key={attendance.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      attendance.status === 'present' ? 'bg-green-50 border-green-200' :
                      attendance.status === 'absent' ? 'bg-red-50 border-red-200' :
                      'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{attendance.students?.name}</div>
                      <div className="text-sm text-gray-600">{attendance.students?.roll_number}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                        attendance.status === 'present' ? 'bg-green-500 text-white' :
                        attendance.status === 'absent' ? 'bg-red-500 text-white' :
                        'bg-blue-500 text-white'
                      }`}>
                        {attendance.status === 'present' ? '✓ Present' :
                         attendance.status === 'absent' ? '✗ Absent' :
                         '◉ On Duty'}
                      </span>
                      {attendance.status === 'absent' && attendance.approval_status && (
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          attendance.approval_status === 'approved' ? 'bg-green-100 text-green-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {attendance.approval_status === 'approved' ? '✓ Approved' : '⚠ Unapproved'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => setShowViewAttendanceModal(false)}
                className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

export default InteractiveTimetable
