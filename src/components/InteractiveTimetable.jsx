import { useState, useEffect } from 'react'
import { useTimetable } from '../hooks/useTimetable'
import { usePeriodAttendance } from '../hooks/usePeriodAttendance'
import { useStudents } from '../hooks/useStudents'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabase'
import AttendanceCheckbox from './AttendanceCheckbox'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from './Toast'

const InteractiveTimetable = ({ classId, selectedDate, className }) => {
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
    roomNumber: '',
    isLab: false
  })

  const [classAdvisor, setClassAdvisor] = useState(null)

  useEffect(() => {
    const fetchClassAdvisor = async () => {
      if (!classId) return
      try {
        const { data, error } = await supabase
          .from('users')
          .select('name')
          .eq('is_class_advisor', true)
          .eq('advisor_class_id', classId)
          .maybeSingle()
        
        if (error) throw error
        setClassAdvisor(data?.name || 'Not Assigned')
      } catch (err) {
        console.error('Error fetching class advisor:', err)
        setClassAdvisor('Error loading')
      }
    }
    
    fetchClassAdvisor()
  }, [classId])

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const periods = [1, 2, 3, 4, 5, 6, 7, 8]

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
      room_number: newPeriodData.roomNumber,
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
        roomNumber: '',
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
    <div className="space-y-10">
      {/* Timetable Grid - Updated Format */}
      <div className="bg-white text-black p-4 sm:p-8 rounded-3xl sm:rounded-[2.5rem] overflow-hidden">
        {/* Header Section */}
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-lg sm:text-2xl font-black uppercase tracking-tight mb-1">SREE SAKTHI ENGINEERING COLLEGE</h1>
          <h2 className="text-[10px] sm:text-sm font-bold uppercase tracking-widest text-gray-600 mb-4">(AUTONOMOUS)</h2>
          <div className="flex flex-wrap justify-center text-[10px] sm:text-xs font-bold uppercase tracking-wider gap-4">
            <div className="text-center">
              <div className="text-sm sm:text-lg font-black mb-1">TIME TABLE FOR {className || 'SELECTED CLASS'}</div>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-x-auto scrollbar-hide -mx-2 px-2">
        <table className="w-full border-collapse min-w-[800px] border border-black text-xs uppercase text-center">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 w-24">Day</th>
                <th className="border border-black p-2 min-w-[80px]">
                  <div>I</div>
                  <div className="text-[10px] mt-1">08.30-09.20</div>
                </th>
                <th className="border border-black p-2 min-w-[80px]">
                  <div>II</div>
                  <div className="text-[10px] mt-1">09.20-10.10</div>
                </th>
                <th className="border border-black p-2 w-8 bg-gray-200">
                  <div style={{ writingMode: 'vertical-rl' }} className="py-4">Tea Break</div>
                  <div className="text-[10px]">10.10-10.25</div>
                </th>
                <th className="border border-black p-2 min-w-[80px]">
                  <div>III</div>
                  <div className="text-[10px] mt-1">10.25-11.15</div>
                </th>
                <th className="border border-black p-2 min-w-[80px]">
                  <div>IV</div>
                  <div className="text-[10px] mt-1">11.15-12.05</div>
                </th>
                <th className="border border-black p-2 w-12 bg-gray-200">
                  <div style={{ writingMode: 'vertical-rl' }} className="py-4">Lunch Break</div>
                  <div className="text-[10px]">12.05-12.50</div>
                </th>
                <th className="border border-black p-2 min-w-[80px]">
                  <div>V</div>
                  <div className="text-[10px] mt-1">12.50-01.40</div>
                </th>
                <th className="border border-black p-2 min-w-[80px]">
                  <div>VI</div>
                  <div className="text-[10px] mt-1">01.40-02.30</div>
                </th>
                <th className="border border-black p-2 w-8 bg-gray-200">
                  <div style={{ writingMode: 'vertical-rl' }} className="py-4">Tea Break</div>
                  <div className="text-[10px]">02.30-02.40</div>
                </th>
                <th className="border border-black p-2 min-w-[80px]">
                  <div>VII</div>
                  <div className="text-[10px] mt-1">02.40-03.30</div>
                </th>
                <th className="border border-black p-2 min-w-[80px]">
                  <div>VIII</div>
                  <div className="text-[10px] mt-1">03.30-04.30</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {days.map((day, dayIndex) => (
                <tr key={day} className="hover:bg-gray-50">
                  <td className="border border-black p-2 font-black text-left">{day}</td>
                  
                  {/* Period 1 */}
                  <td 
                    className={`border border-black p-1 cursor-pointer hover:bg-gray-100 ${isPeriodMarked(dayIndex, 1) ? 'bg-emerald-100' : ''}`}
                    onClick={() => {
                        const entry = getTimetableEntry(dayIndex, 1)
                        if (entry) handlePeriodClick(dayIndex, 1)
                        else if (userProfile?.role === 'admin') handleAddPeriodClick(dayIndex, 1)
                    }}
                  >
                    {getTimetableEntry(dayIndex, 1) ? (
                      <div className="flex flex-col h-full justify-center">
                         <div className="font-bold">{getTimetableEntry(dayIndex, 1).subject_name}</div>
                      </div>
                    ) : userProfile?.role === 'admin' ? <span className="text-gray-300 text-lg">+</span> : ''}
                  </td>

                  {/* Period 2 */}
                  <td 
                    className={`border border-black p-1 cursor-pointer hover:bg-gray-100 ${isPeriodMarked(dayIndex, 2) ? 'bg-emerald-100' : ''}`}
                    onClick={() => {
                        const entry = getTimetableEntry(dayIndex, 2)
                        if (entry) handlePeriodClick(dayIndex, 2)
                        else if (userProfile?.role === 'admin') handleAddPeriodClick(dayIndex, 2)
                    }}
                  >
                    {getTimetableEntry(dayIndex, 2) ? (
                      <div className="flex flex-col h-full justify-center">
                         <div className="font-bold">{getTimetableEntry(dayIndex, 2).subject_name}</div>
                      </div>
                    ) : userProfile?.role === 'admin' ? <span className="text-gray-300 text-lg">+</span> : ''}
                  </td>

                  {/* Tea Break */}
                  <td style={{ writingMode: 'vertical-rl' }} className="border border-black p-1 bg-gray-200 text-[10px] font-bold text-center text-gray-500">Break</td>

                  {/* Period 3 */}
                  <td 
                    className={`border border-black p-1 cursor-pointer hover:bg-gray-100 ${isPeriodMarked(dayIndex, 3) ? 'bg-emerald-100' : ''}`}
                    onClick={() => {
                        const entry = getTimetableEntry(dayIndex, 3)
                        if (entry) handlePeriodClick(dayIndex, 3)
                        else if (userProfile?.role === 'admin') handleAddPeriodClick(dayIndex, 3)
                    }}
                  >
                    {getTimetableEntry(dayIndex, 3) ? (
                      <div className="flex flex-col h-full justify-center">
                         <div className="font-bold">{getTimetableEntry(dayIndex, 3).subject_name}</div>
                      </div>
                    ) : userProfile?.role === 'admin' ? <span className="text-gray-300 text-lg">+</span> : ''}
                  </td>

                  {/* Period 4 */}
                  <td 
                    className={`border border-black p-1 cursor-pointer hover:bg-gray-100 ${isPeriodMarked(dayIndex, 4) ? 'bg-emerald-100' : ''}`}
                    onClick={() => {
                        const entry = getTimetableEntry(dayIndex, 4)
                        if (entry) handlePeriodClick(dayIndex, 4)
                        else if (userProfile?.role === 'admin') handleAddPeriodClick(dayIndex, 4)
                    }}
                  >
                    {getTimetableEntry(dayIndex, 4) ? (
                      <div className="flex flex-col h-full justify-center">
                         <div className="font-bold">{getTimetableEntry(dayIndex, 4).subject_name}</div>
                      </div>
                    ) : userProfile?.role === 'admin' ? <span className="text-gray-300 text-lg">+</span> : ''}
                  </td>

                  {/* Lunch Break */}
                  <td style={{ writingMode: 'vertical-rl' }} className="border border-black p-1 bg-gray-200 text-[10px] font-bold text-center text-gray-500">Lunch</td>

                  {/* Period 5 */}
                  <td 
                    className={`border border-black p-1 cursor-pointer hover:bg-gray-100 ${isPeriodMarked(dayIndex, 5) ? 'bg-emerald-100' : ''}`}
                    onClick={() => {
                        const entry = getTimetableEntry(dayIndex, 5)
                        if (entry) handlePeriodClick(dayIndex, 5)
                        else if (userProfile?.role === 'admin') handleAddPeriodClick(dayIndex, 5)
                    }}
                  >
                    {getTimetableEntry(dayIndex, 5) ? (
                      <div className="flex flex-col h-full justify-center">
                         <div className="font-bold">{getTimetableEntry(dayIndex, 5).subject_name}</div>
                      </div>
                    ) : userProfile?.role === 'admin' ? <span className="text-gray-300 text-lg">+</span> : ''}
                  </td>

                  {/* Period 6 */}
                  <td 
                    className={`border border-black p-1 cursor-pointer hover:bg-gray-100 ${isPeriodMarked(dayIndex, 6) ? 'bg-emerald-100' : ''}`}
                    onClick={() => {
                        const entry = getTimetableEntry(dayIndex, 6)
                        if (entry) handlePeriodClick(dayIndex, 6)
                        else if (userProfile?.role === 'admin') handleAddPeriodClick(dayIndex, 6)
                    }}
                  >
                    {getTimetableEntry(dayIndex, 6) ? (
                      <div className="flex flex-col h-full justify-center">
                         <div className="font-bold">{getTimetableEntry(dayIndex, 6).subject_name}</div>
                      </div>
                    ) : userProfile?.role === 'admin' ? <span className="text-gray-300 text-lg">+</span> : ''}
                  </td>

                  {/* Tea Break */}
                  <td style={{ writingMode: 'vertical-rl' }} className="border border-black p-1 bg-gray-200 text-[10px] font-bold text-center text-gray-500">Break</td>

                  {/* Period 7 */}
                  <td 
                    className={`border border-black p-1 cursor-pointer hover:bg-gray-100 ${isPeriodMarked(dayIndex, 7) ? 'bg-emerald-100' : ''}`}
                    onClick={() => {
                        const entry = getTimetableEntry(dayIndex, 7)
                        if (entry) handlePeriodClick(dayIndex, 7)
                        else if (userProfile?.role === 'admin') handleAddPeriodClick(dayIndex, 7)
                    }}
                  >
                    {getTimetableEntry(dayIndex, 7) ? (
                      <div className="flex flex-col h-full justify-center">
                         <div className="font-bold">{getTimetableEntry(dayIndex, 7).subject_name}</div>
                      </div>
                    ) : userProfile?.role === 'admin' ? <span className="text-gray-300 text-lg">+</span> : ''}
                  </td>

                  {/* Period 8 */}
                  <td 
                    className={`border border-black p-1 cursor-pointer hover:bg-gray-100 ${isPeriodMarked(dayIndex, 8) ? 'bg-emerald-100' : ''}`}
                    onClick={() => {
                        const entry = getTimetableEntry(dayIndex, 8)
                        if (entry) handlePeriodClick(dayIndex, 8)
                        else if (userProfile?.role === 'admin') handleAddPeriodClick(dayIndex, 8)
                    }}
                  >
                    {getTimetableEntry(dayIndex, 8) ? (
                      <div className="flex flex-col h-full justify-center">
                         <div className="font-bold">{getTimetableEntry(dayIndex, 8).subject_name}</div>
                      </div>
                    ) : userProfile?.role === 'admin' ? <span className="text-gray-300 text-lg">+</span> : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        {/* Subject Allocation Table Section */}
        <div className="mt-12">
          <h3 className="text-sm font-black uppercase text-center border-b-2 border-black pb-2 mb-6 underline tracking-widest">Subject - Allocation Record</h3>
          
          <div className="overflow-x-auto scrollbar-hide -mx-2 px-2">
            <table className="w-full border-collapse border border-black text-[10px] uppercase text-center font-bold min-w-[600px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-black p-2 w-10">S.No</th>
                  <th className="border border-black p-2">Subject Code</th>
                  <th className="border border-black p-2">Room No</th>
                  <th className="border border-black p-2 text-left">Subject Name</th>
                  <th className="border border-black p-2 text-left">Faculty Name</th>
                  <th className="border border-black p-3 w-20 text-center">Hours / Week</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(timetable.reduce((acc, curr) => {
                  if (!acc[curr.subject_code]) {
                    acc[curr.subject_code] = {
                      code: curr.subject_code,
                      name: curr.subject_name,
                      faculty: curr.faculty_name,
                      room: curr.room_number || '-',
                      hours: 0
                    }
                  }
                  acc[curr.subject_code].hours += 1
                  return acc
                }, {})).map((sub, index) => (
                  <tr key={sub.code} className="hover:bg-gray-50 transition-colors">
                    <td className="border border-black p-2">{index + 1}</td>
                    <td className="border border-black p-2 font-black">{sub.code}</td>
                    <td className="border border-black p-2">{sub.room}</td>
                    <td className="border border-black p-2 text-left">{sub.name}</td>
                    <td className="border border-black p-2 text-left">{sub.faculty}</td>
                    <td className="border border-black p-2 text-center text-xs font-black">{sub.hours}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2 border-black">
                  <td colSpan="5" className="border border-black p-3 text-right">TOTAL WORKING HOURS / WEEK</td>
                  <td className="border border-black p-3 text-center text-xs font-black">
                    {timetable.length}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>


        {/* Footer / Signatures */}
        <div className="mt-12 space-y-8">
            <div className="border border-black p-2 text-xs font-bold flex gap-4">
                <span>Class Advisor Name:</span>
                <span className="uppercase text-gray-700">{classAdvisor || 'Loading...'}</span>
              </div>
            

        </div>
      </div>

      {/* Add Period Modal - NEW VERSION */}
      {showAddPeriodModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1115] rounded-3xl sm:rounded-[2rem] border border-white/10 shadow-2xl max-w-md w-full overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-white/[0.02] p-6 border-b border-white/10">
              <h3 className="text-xl font-black text-white tracking-tight">Add Session Node</h3>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                {days[newPeriodData.dayOfWeek - 1]} - Period {newPeriodData.periodNumber}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleAddPeriodSubmit} className="p-6 space-y-5">
              {/* Subject Code */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Subject Code *</label>
                <input
                  type="text"
                  placeholder="e.g., CS101"
                  value={newPeriodData.subjectCode}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, subjectCode: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white font-bold text-sm focus:border-white/30 outline-none"
                  required
                />
              </div>

              {/* Subject Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Subject Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Data Structures"
                  value={newPeriodData.subjectName}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, subjectName: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white font-bold text-sm focus:border-white/30 outline-none"
                  required
                />
              </div>

              {/* Faculty Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Faculty Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Dr. Smith"
                  value={newPeriodData.facultyName}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, facultyName: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white font-bold text-sm focus:border-white/30 outline-none"
                  required
                />
              </div>

              {/* Faculty Code */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Faculty Code</label>
                <input
                  type="text"
                  placeholder="e.g., DS"
                  value={newPeriodData.facultyCode}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, facultyCode: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white font-bold text-sm focus:border-white/30 outline-none"
                />
              </div>

              {/* Room Number */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Room Number</label>
                <input
                  type="text"
                  placeholder="e.g., R101"
                  value={newPeriodData.roomNumber}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, roomNumber: e.target.value })}
                  className="w-full px-4 py-3 bg-black border border-white/10 rounded-xl text-white font-bold text-sm focus:border-white/30 outline-none"
                />
              </div>

              {/* Lab Session Checkbox */}
              <div className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                <input
                  type="checkbox"
                  id="isLab"
                  checked={newPeriodData.isLab}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, isLab: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-black checked:bg-purple-500 transition-all"
                />
                <label htmlFor="isLab" className="text-xs font-bold text-gray-300 uppercase tracking-wide cursor-pointer">Lab Session</label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-white text-black rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Create Node
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddPeriodModal(false)}
                  className="flex-1 px-4 py-3 bg-white/10 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1115] rounded-3xl sm:rounded-[2.5rem] border border-white/10 shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 sm:p-8 bg-white/[0.02] border-b border-white/10">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl sm:text-3xl font-black text-white tracking-tighter uppercase">{selectedPeriod.subject_name}</h3>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">
                       {selectedPeriod.subject_name}
                    </span>
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">
                       {selectedPeriod.faculty_name}
                    </span>
                     <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] sm:text-xs font-bold text-emerald-400 uppercase tracking-wider">
                       Period {selectedPeriod.period_number} • {getPeriodTime(selectedPeriod.period_number)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowAttendanceModal(false)}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors border border-white/5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Student List */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {/* Alternative Staff Section */}
              <div className="mb-6 p-6 bg-yellow-500/5 border border-yellow-500/20 rounded-[1.5rem] relative overflow-hidden">
                <div className="relative z-10">
                   <div className="flex items-start gap-4">
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
                       className="mt-1 w-5 h-5 rounded border-yellow-500/40 bg-black checked:bg-yellow-500 transition-all"
                     />
                     <div className="flex-1">
                       <label htmlFor="alternativeStaff" className="block font-black text-yellow-500 uppercase tracking-widest text-sm mb-1 cursor-pointer">
                         Alternative Facutly Override
                       </label>
                       <p className="text-xs text-yellow-200/60 font-medium mb-4">
                         Enable this mode if you are conducting this session on behalf of the assigned faculty.
                       </p>
                       
                       {isAlternativeStaff && (
                         <div className="mt-3">
                           <label className="block text-[10px] font-black text-yellow-500/70 uppercase tracking-[0.2em] mb-2">
                             Select Acting Faculty Node
                           </label>
                           <select
                             value={selectedAlternativeStaff}
                             onChange={(e) => setSelectedAlternativeStaff(e.target.value)}
                             className="w-full px-4 py-3 bg-black/40 border border-yellow-500/30 rounded-xl text-yellow-100 font-bold text-sm focus:border-yellow-500/60 outline-none"
                             required={isAlternativeStaff}
                           >
                             <option value="">-- Select Faculty --</option>
                             {allStaff.map((staff) => (
                               <option key={staff.id} value={staff.id}>
                                 {staff.name} ({staff.email})
                               </option>
                             ))}
                           </select>
                           <p className="mt-2 text-[10px] text-yellow-500/50 font-bold uppercase tracking-widest">
                             This session will be logged under your credentials
                           </p>
                         </div>
                       )}
                     </div>
                   </div>
                </div>
              </div>

              {/* Mark All Present Button */}
              <div className="mb-6 flex justify-end">
                <button
                  onClick={handleMarkAllPresent}
                  className="px-5 py-3 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-500/20 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mark All Present
                </button>
              </div>
              
              <div className="space-y-4">
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
                <div className="mt-8 pt-8 border-t border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-gray-500 font-black text-xs uppercase tracking-widest">Intern Students</span>
                    <span className="text-[10px] text-gray-700 bg-white/5 px-2 py-0.5 rounded border border-white/5">ReadOnly</span>
                  </div>
                  <div className="space-y-2">
                    {internStudents.map(student => (
                      <div 
                        key={student.id}
                        className="flex items-center gap-3 p-4 bg-white/[0.02] rounded-xl border border-white/5 opacity-50"
                      >
                        <div className="flex-1">
                          <div className="font-bold text-gray-400 text-sm">{student.name}</div>
                          <div className="text-[10px] text-gray-600 font-black tracking-widest">{student.roll_number}</div>
                        </div>
                        <span className="px-3 py-1 bg-white/5 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/5">
                          Intern
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Suspended Students Section */}
              {suspendedStudents.length > 0 && (
                <div className="mt-8 pt-8 border-t border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-red-500/70 font-black text-xs uppercase tracking-widest">Suspended Students</span>
                    <span className="text-[10px] text-gray-700 bg-white/5 px-2 py-0.5 rounded border border-white/5">ReadOnly</span>
                  </div>
                  <div className="space-y-2">
                    {suspendedStudents.map(student => (
                      <div 
                        key={student.id}
                        className="flex items-center gap-3 p-4 bg-red-900/10 rounded-xl border border-red-500/10 opacity-60"
                      >
                        <div className="flex-1">
                          <div className="font-bold text-red-300 text-sm">{student.name}</div>
                          <div className="text-[10px] text-red-500/50 font-black tracking-widest">{student.roll_number}</div>
                        </div>
                        <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-red-500/20">
                          Suspended
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-white/[0.02] border-t border-white/10 flex gap-4">
              <button
                onClick={handleSubmitAttendance}
                className="flex-1 px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20"
              >
                Confirm Attendance
              </button>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="px-8 py-4 bg-white/5 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Attendance Modal */}
      {showViewAttendanceModal && viewAttendanceData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1115] rounded-[2.5rem] border border-white/10 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-8 bg-white/[0.02] border-b border-white/10">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase">{viewAttendanceData.entry.subject_name}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-400 uppercase tracking-wider">
                       {viewAttendanceData.entry.subject_name}
                    </span>
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-gray-400 uppercase tracking-wider">
                       {viewAttendanceData.entry.faculty_name}
                    </span>
                     <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-bold text-emerald-400 uppercase tracking-wider">
                       Period {viewAttendanceData.period_number} • {getPeriodTime(viewAttendanceData.period_number)}
                    </span>
                  </div>
                  <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mt-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Verified on {new Date(viewAttendanceData.marked_at).toLocaleString()}
                  </p>
                  {viewAttendanceData.is_alternative_staff && (
                    <div className="mt-4 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                      <p className="text-yellow-500 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                        <span>🔄</span>
                        <span>Marked by Acting Faculty:</span>
                      </p>
                      <p className="text-white text-sm font-bold mt-1">
                        {viewAttendanceData.alternative_staff_name}
                      </p>
                      <p className="text-yellow-500/50 text-[10px] font-bold uppercase tracking-widest mt-1">
                        (Regular faculty: {viewAttendanceData.entry.faculty_name} was absent)
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowViewAttendanceModal(false)}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors border border-white/5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Attendance Summary */}
            <div className="p-8 bg-white/[0.01] border-b border-white/10">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Session Analytics</h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/10 text-center group hover:bg-white/[0.05] transition-all">
                  <div className="text-3xl font-black text-white mb-1 group-hover:scale-110 transition-transform">{viewAttendanceData.total_students}</div>
                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Total Students</div>
                </div>
                <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/20 text-center group hover:bg-emerald-500/20 transition-all">
                  <div className="text-3xl font-black text-emerald-400 mb-1 group-hover:scale-110 transition-transform">{viewAttendanceData.present_count}</div>
                  <div className="text-[9px] text-emerald-500/70 font-bold uppercase tracking-widest">Present</div>
                </div>
                <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 text-center group hover:bg-red-500/20 transition-all">
                  <div className="text-3xl font-black text-red-400 mb-1 group-hover:scale-110 transition-transform">{viewAttendanceData.absent_count}</div>
                  <div className="text-[9px] text-red-500/70 font-bold uppercase tracking-widest">Absent</div>
                </div>
                <div className="bg-blue-500/10 p-6 rounded-2xl border border-blue-500/20 text-center group hover:bg-blue-500/20 transition-all">
                  <div className="text-3xl font-black text-blue-400 mb-1 group-hover:scale-110 transition-transform">{viewAttendanceData.on_duty_count}</div>
                  <div className="text-[9px] text-blue-500/70 font-bold uppercase tracking-widest">On Duty</div>
                </div>
              </div>
            </div>

            {/* Student List */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">Detailed Roll Call</h4>
              <div className="space-y-2">
                {viewAttendanceData.studentAttendance.map((attendance) => (
                  <div 
                    key={attendance.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all hover:scale-[1.01] ${
                      attendance.status === 'present' ? 'bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10' :
                      attendance.status === 'absent' ? 'bg-red-500/5 border-red-500/10 hover:bg-red-500/10' :
                      'bg-blue-500/5 border-blue-500/10 hover:bg-blue-500/10'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="font-bold text-white text-sm">{attendance.students?.name}</div>
                      <div className="text-[10px] text-gray-500 font-black tracking-widest">{attendance.students?.roll_number}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest ${
                        attendance.status === 'present' ? 'bg-emerald-500/20 text-emerald-400' :
                        attendance.status === 'absent' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {attendance.status === 'present' ? '✓ Present' :
                         attendance.status === 'absent' ? '✗ Absent' :
                         '◉ On Duty'}
                      </span>
                      {attendance.status === 'absent' && attendance.approval_status && (
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                          attendance.approval_status === 'approved' ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' :
                          'bg-orange-400/10 text-orange-400 border border-orange-400/20'
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
            <div className="p-8 bg-white/[0.02] border-t border-white/10">
              <button
                onClick={() => setShowViewAttendanceModal(false)}
                className="w-full py-4 bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/20 transition-all"
              >
                Close View
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
