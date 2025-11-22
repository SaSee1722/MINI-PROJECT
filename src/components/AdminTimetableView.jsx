import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTimetable } from '../hooks/useTimetable'
import { usePeriodAttendance } from '../hooks/usePeriodAttendance'
import { useStudents } from '../hooks/useStudents'
import { supabase } from '../services/supabase'

const AdminTimetableView = ({ classId, selectedDate }) => {
  const { userProfile } = useAuth()
  const { timetable, periodTimes, loading, addTimetableEntry, deleteTimetableEntry, refetch: refetchTimetable } = useTimetable(classId)
  const { periodAttendance, getPeriodStudentAttendance } = usePeriodAttendance(classId, selectedDate)
  const { students } = useStudents()
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const [attendanceReport, setAttendanceReport] = useState(null)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showAddPeriodModal, setShowAddPeriodModal] = useState(false)
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

  // Get class students
  const classStudents = students.filter(s => s.class_id === classId && s.status === 'active')

  // Get timetable entry for specific day and period
  const getTimetableEntry = (dayIndex, periodNum) => {
    return timetable.find(entry => 
      entry.day_of_week === dayIndex + 1 && entry.period_number === periodNum
    )
  }

  // Check if period has attendance marked
  const isPeriodMarked = (dayIndex, periodNum) => {
    const entry = getTimetableEntry(dayIndex, periodNum)
    if (!entry) return false
    return periodAttendance.some(pa => pa.timetable_id === entry.id && pa.is_marked === true)
  }

  // Get attendance stats for a period
  const getAttendanceStats = (dayIndex, periodNum) => {
    const entry = getTimetableEntry(dayIndex, periodNum)
    if (!entry) return null
    
    const attendanceRecord = periodAttendance.find(pa => 
      pa.timetable_id === entry.id && pa.is_marked === true
    )
    
    if (!attendanceRecord) return null
    
    return {
      totalStudents: classStudents.length,
      attendanceRecord
    }
  }

  // Handle period click - show attendance report or delete option
  const handlePeriodClick = async (dayIndex, periodNum) => {
    const entry = getTimetableEntry(dayIndex, periodNum)
    if (!entry) return

    setSelectedPeriod({ ...entry, dayIndex, periodNum })

    // Check if attendance is marked for this period
    const isMarked = isPeriodMarked(dayIndex, periodNum)
    
    if (isMarked) {
      // Show attendance report
      const periodAttendanceRecord = periodAttendance.find(pa => 
        pa.timetable_id === entry.id && pa.is_marked === true
      )
      
      if (periodAttendanceRecord) {
        const result = await getPeriodStudentAttendance(periodAttendanceRecord.id)
        if (result.success) {
          setAttendanceReport({
            ...periodAttendanceRecord,
            studentAttendance: result.data,
            entry: entry,
            dayName: days[dayIndex],
            periodNumber: periodNum
          })
          setShowAttendanceModal(true)
        }
      }
    } else {
      // Show period management options (no attendance marked yet)
      setAttendanceReport({
        entry: entry,
        dayName: days[dayIndex],
        periodNumber: periodNum,
        noAttendance: true
      })
      setShowAttendanceModal(true)
    }
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

  // Handle add period submit
  const handleAddPeriodSubmit = async (e) => {
    e.preventDefault()
    try {
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
        await refetchTimetable(classId)
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
        alert('Period added successfully!')
      }
    } catch (error) {
      console.error('Error adding period:', error)
      alert('Error adding period')
    }
  }

  // ... existing code ...
  const handleDeletePeriod = async (periodId) => {
    try {
      await deleteTimetableEntry(periodId)
      setShowDeleteConfirm(null)
      await refetchTimetable(classId)
      alert('Period deleted successfully!')
    } catch (error) {
      console.error('Error deleting period:', error)
      alert('Error deleting period')
    }
  }

  // Get period time
  const getPeriodTime = (periodNum) => {
    const times = periodTimes.find(pt => pt.period_number === periodNum)
    if (times) {
      return `${times.start_time} - ${times.end_time}`
    }
    return `Period ${periodNum}`
  }

  // Get date for specific day
  const getDateForDay = (dayIndex) => {
    const today = new Date(selectedDate)
    const currentDay = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    const targetDay = dayIndex + 1 // Convert to our format (1 = Monday)
    
    const daysToAdd = targetDay - currentDay
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + daysToAdd)
    
    return targetDate.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit' 
    })
  }

  if (loading) {
    return <div className="text-center py-8 text-white">Loading timetable...</div>
  }

  if (!classId) {
    return <div className="text-center py-8 text-gray-400">Please select a class to view timetable</div>
  }

  return (
    <div className="space-y-6">
      {/* Admin Notice */}
      <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-blue-100 mb-2">👨‍💼 Admin Timetable View</h3>
            <p className="text-blue-200 text-sm">
              Click on periods to view attendance reports or manage periods. You can add/delete periods but cannot mark attendance.
            </p>
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden border border-white/20">
        <div className="p-6 bg-gradient-to-r from-gray-800 to-gray-700">
          <h2 className="text-2xl font-bold text-white">Weekly Timetable - Admin View</h2>
          <p className="text-gray-300 mt-1">Click on periods to view reports or manage</p>
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
                <tr key={day} className="hover:bg-gray-800">
                  <td className="border border-gray-600 px-4 py-6 bg-gray-800 font-bold text-white">
                    <div className="text-white text-base">{day}</div>
                    <div className="text-sm text-gray-400 font-semibold mt-1">{getDateForDay(dayIndex)}</div>
                  </td>
                  {periods.map(period => {
                    const entry = getTimetableEntry(dayIndex, period)
                    const isMarked = isPeriodMarked(dayIndex, period)
                    const stats = getAttendanceStats(dayIndex, period)
                    
                    return (
                      <td 
                        key={period} 
                        className={`border border-gray-600 px-3 py-2 cursor-pointer transition-all ${
                          entry 
                            ? isMarked 
                              ? 'bg-green-900 hover:bg-green-800 border-green-600' 
                              : 'bg-gray-700 hover:bg-gray-600'
                            : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                        onClick={() => entry && handlePeriodClick(dayIndex, period)}
                      >
                        {entry ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-sm text-white">
                              {entry.subject_code}
                            </div>
                            <div className="text-xs text-gray-300 line-clamp-2">
                              {entry.subject_name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {entry.faculty_name}
                            </div>
                            {entry.faculty_code && (
                              <div className="text-xs text-gray-500">
                                ({entry.faculty_code})
                              </div>
                            )}
                            {entry.is_lab && (
                              <div className="inline-block px-2 py-1 bg-purple-600 text-white text-xs rounded">
                                LAB
                              </div>
                            )}
                            {isMarked && stats && (
                              <div className="mt-2 text-xs">
                                <div className="text-green-400 font-semibold">✅ Attendance Marked</div>
                                <div className="text-gray-400">Click to view report</div>
                              </div>
                            )}
                            {!isMarked && (
                              <div className="mt-2 text-xs text-yellow-400">
                                ⏳ No attendance yet
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAddPeriodClick(dayIndex, period)
                            }}
                            className="w-full h-full flex items-center justify-center text-gray-400 hover:text-blue-400 hover:bg-blue-900/30 transition-all rounded group"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              <span className="text-xs font-medium">Add Period</span>
                            </div>
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Report Modal */}
      {showAttendanceModal && attendanceReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">
                    {attendanceReport.entry.subject_code} - {attendanceReport.entry.subject_name}
                  </h3>
                  <p className="text-blue-100 mt-1">
                    {attendanceReport.dayName} - Period {attendanceReport.periodNumber} | {attendanceReport.entry.faculty_name}
                  </p>
                </div>
                <button 
                  onClick={() => setShowAttendanceModal(false)}
                  className="text-white hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {attendanceReport.noAttendance ? (
                <div className="text-center py-8">
                  <div className="text-yellow-400 text-6xl mb-4">⏳</div>
                  <h4 className="text-xl font-bold text-white mb-2">No Attendance Marked Yet</h4>
                  <p className="text-gray-400 mb-6">Staff hasn't marked attendance for this period</p>
                  
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => setShowDeleteConfirm(attendanceReport.entry.id)}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                    >
                      🗑️ Delete Period
                    </button>
                    <button
                      onClick={() => setShowAttendanceModal(false)}
                      className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Attendance Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-900 border border-green-700 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {attendanceReport.studentAttendance?.filter(sa => sa.status === 'present').length || 0}
                      </div>
                      <div className="text-green-200 text-sm">Present</div>
                    </div>
                    <div className="bg-red-900 border border-red-700 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-400">
                        {attendanceReport.studentAttendance?.filter(sa => sa.status === 'absent').length || 0}
                      </div>
                      <div className="text-red-200 text-sm">Absent</div>
                    </div>
                    <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        {classStudents.length}
                      </div>
                      <div className="text-blue-200 text-sm">Total Students</div>
                    </div>
                  </div>

                  {/* Student List */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-white">Student Attendance Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Present Students */}
                      <div className="bg-green-900 border border-green-700 rounded-lg p-4">
                        <h5 className="font-bold text-green-200 mb-3">✅ Present Students</h5>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {attendanceReport.studentAttendance?.filter(sa => sa.status === 'present').map(sa => {
                            const student = classStudents.find(s => s.id === sa.student_id)
                            return (
                              <div key={sa.id} className="flex justify-between items-center bg-green-800 p-2 rounded">
                                <span className="text-green-100">{student?.name}</span>
                                <span className="text-green-300 text-sm">{student?.roll_number}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Absent Students */}
                      <div className="bg-red-900 border border-red-700 rounded-lg p-4">
                        <h5 className="font-bold text-red-200 mb-3">❌ Absent Students</h5>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {attendanceReport.studentAttendance?.filter(sa => sa.status === 'absent').map(sa => {
                            const student = classStudents.find(s => s.id === sa.student_id)
                            return (
                              <div key={sa.id} className="flex justify-between items-center bg-red-800 p-2 rounded">
                                <span className="text-red-100">{student?.name}</span>
                                <span className="text-red-300 text-sm">{student?.roll_number}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-center gap-4 mt-6">
                    <button
                      onClick={() => setShowDeleteConfirm(attendanceReport.entry.id)}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                    >
                      🗑️ Delete Period
                    </button>
                    <button
                      onClick={() => setShowAttendanceModal(false)}
                      className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Period Modal */}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg shadow-2xl max-w-md w-full border border-gray-700">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">🗑️ Delete Period</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete this period? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePeriod(showDeleteConfirm)}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminTimetableView
