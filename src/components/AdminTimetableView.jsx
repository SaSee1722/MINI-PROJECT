import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTimetable } from '../hooks/useTimetable'
import { usePeriodAttendance } from '../hooks/usePeriodAttendance'
import { useStudents } from '../hooks/useStudents'
import { supabase } from '../services/supabase'
import { Edit2, Trash2, Plus, X, Save, Info } from 'lucide-react'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from './Toast'

const AdminTimetableView = ({ classId, selectedDate, className }) => {
  const { userProfile } = useAuth()
  const { timetable, periodTimes, loading, addTimetableEntry, deleteTimetableEntry, refetch: refetchTimetable } = useTimetable(classId)
  const { periodAttendance, getPeriodStudentAttendance } = usePeriodAttendance(classId, selectedDate)
  const { students } = useStudents()
  const { toasts, removeToast, showSuccess, showError, showWarning } = useToast()
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const [attendanceReport, setAttendanceReport] = useState(null)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showAddPeriodModal, setShowAddPeriodModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)
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

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const periods = [1, 2, 3, 4, 5, 6, 7, 8]

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
    const dateStr = getDateForDayUTC(dayIndex)
    return periodAttendance.some(pa => pa.timetable_id === entry.id && pa.date === dateStr && pa.is_marked === true)
  }

  // Get attendance stats for a period
  const getAttendanceStats = (dayIndex, periodNum) => {
    const entry = getTimetableEntry(dayIndex, periodNum)
    if (!entry) return null
    
    const dateStr = getDateForDayUTC(dayIndex)
    const attendanceRecord = periodAttendance.find(pa => 
      pa.timetable_id === entry.id && pa.date === dateStr && pa.is_marked === true
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
      const dateStr = getDateForDayUTC(dayIndex)
      const periodAttendanceRecord = periodAttendance.find(pa => 
        pa.timetable_id === entry.id && pa.date === dateStr && pa.is_marked === true
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

  const handleUpdateSubject = async (e) => {
    e.preventDefault()
    setIsUpdating(true)
    try {
      const { oldCode, subjectCode, subjectName, facultyName, roomNumber } = editingSubject
      
      // Find all periods with this subject code
      const matchingPeriods = timetable.filter(p => p.subject_code === oldCode)
      
      for (const period of matchingPeriods) {
        const { error } = await supabase
          .from('timetable')
          .update({
            subject_code: subjectCode,
            subject_name: subjectName,
            faculty_name: facultyName,
            room_number: roomNumber
          })
          .eq('id', period.id)
        
        if (error) throw error
      }
      
      setEditingSubject(null)
      await refetchTimetable()
    } catch (err) {
      console.error('Error updating subject:', err)
      showError('Error updating subject: ' + err.message)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteSubject = async (subjectCode) => {
    if (!confirm(`Are you sure you want to delete ALL periods for subject ${subjectCode}?`)) return
    
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('timetable')
        .delete()
        .eq('class_id', classId)
        .eq('subject_code', subjectCode)
      
      if (error) throw error
      await refetchTimetable()
    } catch (err) {
      console.error('Error deleting subject:', err)
      showError('Error deleting subject: ' + err.message)
    } finally {
      setIsUpdating(false)
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
      room_number: newPeriodData.roomNumber,
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
          isLab: false
        })
        showSuccess('Period added successfully!')
      }
    } catch (error) {
      console.error('Error adding period:', error)
      showError('Error adding period')
    }
  }

  // ... existing code ...
  const handleDeletePeriod = async (periodId) => {
    try {
      await deleteTimetableEntry(periodId)
      setShowDeleteConfirm(null)
      await refetchTimetable(classId)
      showSuccess('Period deleted successfully!')
    } catch (error) {
      console.error('Error deleting period:', error)
      showError('Error deleting period')
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
    const adjustedCurrentDay = currentDay === 0 ? 7 : currentDay // Convert Sunday to 7
    const diff = (dayIndex + 1) - adjustedCurrentDay
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + diff)
    
    return targetDate.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit' 
    })
  }

  // Get date in YYYY-MM-DD for database comparison
  const getDateForDayUTC = (dayIndex) => {
    const today = new Date(selectedDate)
    const currentDay = today.getDay()
    const adjustedCurrentDay = currentDay === 0 ? 7 : currentDay
    const diff = (dayIndex + 1) - adjustedCurrentDay
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + diff)
    return targetDate.toISOString().split('T')[0]
  }

  if (loading) {
    return <div className="text-center py-8 text-white">Loading timetable...</div>
  }

  if (!classId) {
    return <div className="text-center py-8 text-gray-400">Please select a class to view timetable</div>
  }

  return (
    <div className="space-y-10">
      <div className="bg-white text-black p-8 rounded-[2.5rem] overflow-hidden">
        {/* Header Section */}
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-black uppercase tracking-tight mb-1">SREE SAKTHI ENGINEERING COLLEGE</h1>
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-600 mb-4">(AUTONOMOUS)</h2>
          <div className="flex flex-wrap justify-center text-xs font-bold uppercase tracking-wider gap-4">
            <div className="text-center">
              <div className="text-lg font-black mb-1">TIME TABLE FOR {className || 'SELECTED CLASS'}</div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-xs uppercase text-center">
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
                  <div style={{ writingMode: 'vertical-rl' }} className="py-4 text-center mx-auto">Tea Break</div>
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
                  <div style={{ writingMode: 'vertical-rl' }} className="py-4 text-center mx-auto">Lunch Break</div>
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
                  <div style={{ writingMode: 'vertical-rl' }} className="py-4 text-center mx-auto">Tea Break</div>
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
                  <td className="border border-black p-2 font-black text-left">
                    {day}
                    <div className="text-[10px] text-gray-400 mt-1">{getDateForDay(dayIndex)}</div>
                  </td>
                  
                  {/* Period 1 */}
                  <td 
                    className={`border border-black p-1 cursor-pointer hover:bg-gray-100 ${isPeriodMarked(dayIndex, 1) ? 'bg-emerald-100' : ''}`}
                    onClick={() => {
                        const entry = getTimetableEntry(dayIndex, 1)
                        if (entry) handlePeriodClick(dayIndex, 1)
                        else handleAddPeriodClick(dayIndex, 1)
                    }}
                  >
                    {getTimetableEntry(dayIndex, 1) ? (
                      <div className="flex flex-col h-full justify-center">
                         <div className={`font-bold ${getTimetableEntry(dayIndex, 1).is_lab ? 'text-indigo-600' : ''}`}>{getTimetableEntry(dayIndex, 1).subject_name}</div>
                      </div>
                    ) : <span className="text-gray-300 text-lg">+</span>}
                  </td>

                  {/* Period 2 */}
                  <td 
                    className={`border border-black p-1 cursor-pointer hover:bg-gray-100 ${isPeriodMarked(dayIndex, 2) ? 'bg-emerald-100' : ''}`}
                    onClick={() => {
                        const entry = getTimetableEntry(dayIndex, 2)
                        if (entry) handlePeriodClick(dayIndex, 2)
                        else handleAddPeriodClick(dayIndex, 2)
                    }}
                  >
                    {getTimetableEntry(dayIndex, 2) ? (
                      <div className="flex flex-col h-full justify-center">
                         <div className={`font-bold ${getTimetableEntry(dayIndex, 2).is_lab ? 'text-indigo-600' : ''}`}>{getTimetableEntry(dayIndex, 2).subject_name}</div>
                      </div>
                    ) : <span className="text-gray-300 text-lg">+</span>}
                  </td>

                  {/* Tea Break */}
                  <td style={{ writingMode: 'vertical-rl' }} className="border border-black p-1 bg-gray-200 text-[10px] font-bold text-center text-gray-500">Break</td>

                  {/* Period 3 */}
                  <td 
                    className={`border border-black p-1 cursor-pointer hover:bg-gray-100 ${isPeriodMarked(dayIndex, 3) ? 'bg-emerald-100' : ''}`}
                    onClick={() => {
                        const entry = getTimetableEntry(dayIndex, 3)
                        if (entry) handlePeriodClick(dayIndex, 3)
                        else handleAddPeriodClick(dayIndex, 3)
                    }}
                  >
                    {getTimetableEntry(dayIndex, 3) ? (
                      <div className="flex flex-col h-full justify-center">
                         <div className={`font-bold ${getTimetableEntry(dayIndex, 3).is_lab ? 'text-indigo-600' : ''}`}>{getTimetableEntry(dayIndex, 3).subject_name}</div>
                      </div>
                    ) : <span className="text-gray-300 text-lg">+</span>}
                  </td>

                  {/* Period 4 */}
                  <td 
                    className={`border border-black p-1 cursor-pointer hover:bg-gray-100 ${isPeriodMarked(dayIndex, 4) ? 'bg-emerald-100' : ''}`}
                    onClick={() => {
                        const entry = getTimetableEntry(dayIndex, 4)
                        if (entry) handlePeriodClick(dayIndex, 4)
                        else handleAddPeriodClick(dayIndex, 4)
                    }}
                  >
                    {getTimetableEntry(dayIndex, 4) ? (
                      <div className="flex flex-col h-full justify-center">
                         <div className={`font-bold ${getTimetableEntry(dayIndex, 4).is_lab ? 'text-indigo-600' : ''}`}>{getTimetableEntry(dayIndex, 4).subject_name}</div>
                      </div>
                    ) : <span className="text-gray-300 text-lg">+</span>}
                  </td>

                  {/* Lunch Break */}
                  <td style={{ writingMode: 'vertical-rl' }} className="border border-black p-1 bg-gray-200 text-[10px] font-bold text-center text-gray-500">Lunch</td>

                  {/* Period 5 */}
                  <td 
                    className={`border border-black p-1 cursor-pointer hover:bg-gray-100 ${isPeriodMarked(dayIndex, 5) ? 'bg-emerald-100' : ''}`}
                    onClick={() => {
                        const entry = getTimetableEntry(dayIndex, 5)
                        if (entry) handlePeriodClick(dayIndex, 5)
                        else handleAddPeriodClick(dayIndex, 5)
                    }}
                  >
                    {getTimetableEntry(dayIndex, 5) ? (
                      <div className="flex flex-col h-full justify-center">
                         <div className={`font-bold ${getTimetableEntry(dayIndex, 5).is_lab ? 'text-indigo-600' : ''}`}>{getTimetableEntry(dayIndex, 5).subject_name}</div>
                      </div>
                    ) : <span className="text-gray-300 text-lg">+</span>}
                  </td>

                  {/* Period 6 */}
                  <td 
                    className={`border border-black p-1 cursor-pointer hover:bg-gray-100 ${isPeriodMarked(dayIndex, 6) ? 'bg-emerald-100' : ''}`}
                    onClick={() => {
                        const entry = getTimetableEntry(dayIndex, 6)
                        if (entry) handlePeriodClick(dayIndex, 6)
                        else handleAddPeriodClick(dayIndex, 6)
                    }}
                  >
                    {getTimetableEntry(dayIndex, 6) ? (
                      <div className="flex flex-col h-full justify-center">
                         <div className={`font-bold ${getTimetableEntry(dayIndex, 6).is_lab ? 'text-indigo-600' : ''}`}>{getTimetableEntry(dayIndex, 6).subject_name}</div>
                      </div>
                    ) : <span className="text-gray-300 text-lg">+</span>}
                  </td>

                  {/* Tea Break */}
                  <td style={{ writingMode: 'vertical-rl' }} className="border border-black p-1 bg-gray-200 text-[10px] font-bold text-center text-gray-500">Break</td>

                  {/* Period 7 */}
                  <td 
                    className={`border border-black p-1 cursor-pointer hover:bg-gray-100 ${isPeriodMarked(dayIndex, 7) ? 'bg-emerald-100' : ''}`}
                    onClick={() => {
                        const entry = getTimetableEntry(dayIndex, 7)
                        if (entry) handlePeriodClick(dayIndex, 7)
                        else handleAddPeriodClick(dayIndex, 7)
                    }}
                  >
                    {getTimetableEntry(dayIndex, 7) ? (
                      <div className="flex flex-col h-full justify-center">
                         <div className={`font-bold ${getTimetableEntry(dayIndex, 7).is_lab ? 'text-indigo-600' : ''}`}>{getTimetableEntry(dayIndex, 7).subject_name}</div>
                      </div>
                    ) : <span className="text-gray-300 text-lg">+</span>}
                  </td>

                  {/* Period 8 */}
                  <td 
                    className={`border border-black p-1 cursor-pointer hover:bg-gray-100 ${isPeriodMarked(dayIndex, 8) ? 'bg-emerald-100' : ''}`}
                    onClick={() => {
                        const entry = getTimetableEntry(dayIndex, 8)
                        if (entry) handlePeriodClick(dayIndex, 8)
                        else handleAddPeriodClick(dayIndex, 8)
                    }}
                  >
                    {getTimetableEntry(dayIndex, 8) ? (
                      <div className="flex flex-col h-full justify-center">
                         <div className={`font-bold ${getTimetableEntry(dayIndex, 8).is_lab ? 'text-indigo-600' : ''}`}>{getTimetableEntry(dayIndex, 8).subject_name}</div>
                      </div>
                    ) : <span className="text-gray-300 text-lg">+</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Subject Allocation section */}
        <div className="mt-12 pt-8 border-t-2 border-black">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black uppercase underline flex items-center gap-2">
              <Info size={16} />
              Subject - Allocation
            </h3>
            <button 
              onClick={() => setShowAddPeriodModal(true)}
              className="px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center gap-2"
            >
              <Plus size={14} />
              Add Module
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-black text-[10px] uppercase text-center font-bold">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-black p-2 w-10">S.No</th>
                  <th className="border border-black p-2">Subject Code</th>
                  <th className="border border-black p-2">Room No</th>
                  <th className="border border-black p-2 text-left">Subject Name / Lab</th>
                  <th className="border border-black p-2 text-left">Faculty Name</th>
                  <th className="border border-black p-3 w-16 text-center">Hours / Week</th>
                  <th className="border border-black p-2 w-24">Actions</th>
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
                      isLab: curr.is_lab,
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
                    <td className="border border-black p-2 text-left">{sub.name} {sub.isLab ? '[LAB]' : ''}</td>
                    <td className="border border-black p-2 text-left">{sub.faculty}</td>
                    <td className="border border-black p-2 text-center text-xs font-black">{sub.hours}</td>
                    <td className="border border-black p-2">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => setEditingSubject({
                            oldCode: sub.code,
                            subjectCode: sub.code,
                            subjectName: sub.name,
                            facultyName: sub.faculty,
                            roomNumber: sub.room === '-' ? '' : sub.room
                          })}
                          className="p-1.5 hover:bg-blue-100 text-blue-600 rounded transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteSubject(sub.code)}
                          className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan="5" className="border border-black p-2 text-right">TOTAL WORKING HOURS</td>
                  <td className="border border-black p-2 text-center text-xs">
                    {timetable.length}
                  </td>
                  <td className="border border-black p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Subject Modal */}
      {editingSubject && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[2rem] border border-black shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gray-50 p-6 border-b border-black">
              <h3 className="text-xl font-black uppercase flex items-center gap-3 text-gray-900">
                <Edit2 size={24} />
                Edit Module Metadata
              </h3>
            </div>
            <form onSubmit={handleUpdateSubject} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-black uppercase tracking-widest ml-2">Subject Code</label>
                <input 
                  type="text" 
                  value={editingSubject.subjectCode}
                  onChange={e => setEditingSubject({...editingSubject, subjectCode: e.target.value})}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-black rounded-2xl font-bold focus:bg-white outline-none text-black placeholder:text-gray-400"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-black uppercase tracking-widest ml-2">Subject Name</label>
                <input 
                  type="text" 
                  value={editingSubject.subjectName}
                  onChange={e => setEditingSubject({...editingSubject, subjectName: e.target.value})}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-black rounded-2xl font-bold focus:bg-white outline-none text-black placeholder:text-gray-400"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-black uppercase tracking-widest ml-2">Faculty Name</label>
                <input 
                  type="text" 
                  value={editingSubject.facultyName}
                  onChange={e => setEditingSubject({...editingSubject, facultyName: e.target.value})}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-black rounded-2xl font-bold focus:bg-white outline-none text-black placeholder:text-gray-400"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-black uppercase tracking-widest ml-2">Room Number</label>
                <input 
                  type="text" 
                  value={editingSubject.roomNumber}
                  onChange={e => setEditingSubject({...editingSubject, roomNumber: e.target.value})}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-black rounded-2xl font-bold focus:bg-white outline-none text-black placeholder:text-gray-400"
                  placeholder="e.g., R302"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="submit" 
                  disabled={isUpdating}
                  className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                >
                  {isUpdating ? <span className="animate-spin inline-block">⏳</span> : <Save size={16} />}
                  Synchronize Changes
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingSubject(null)}
                  className="px-6 py-4 bg-gray-100 text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-black"
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
                  style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#d1d5db' }}
                  className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-black"
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
                  style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#d1d5db' }}
                  className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-black"
                  required
                />
              </div>


              {/* Room Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Room Number</label>
                <input
                  type="text"
                  placeholder="e.g., R302"
                  value={newPeriodData.roomNumber}
                  onChange={(e) => setNewPeriodData({ ...newPeriodData, roomNumber: e.target.value })}
                  style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#d1d5db' }}
                  className="w-full px-4 py-2.5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-black"
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
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

export default AdminTimetableView
