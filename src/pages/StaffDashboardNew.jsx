import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useStudents } from '../hooks/useStudents'
import { useClasses } from '../hooks/useClasses'
import { useSessions } from '../hooks/useSessions'
import { useAttendance } from '../hooks/useAttendance'
import { useStudentAttendance } from '../hooks/useStudentAttendance'
import { supabase } from '../services/supabase'
import Navbar from '../components/Navbar'
import AttendanceCheckbox from '../components/AttendanceCheckbox'
import InteractiveTimetable from '../components/InteractiveTimetable'
import Toast from '../components/Toast'
import { generatePeriodAttendanceReport } from '../utils/pdfGenerator'

const streams = [
  { id: 'cse', name: 'Computer Science and Engineering', code: 'CSE' },
  { id: 'it', name: 'Information Technology', code: 'IT' },
  { id: 'ece', name: 'Electronics and Communication Engineering', code: 'ECE' },
  { id: 'eee', name: 'Electrical and Electronics Engineering', code: 'EEE' },
  { id: 'mech', name: 'Mechanical Engineering', code: 'MECH' },
  { id: 'civil', name: 'Civil Engineering', code: 'CIVIL' }
]

const StaffDashboardNew = () => {
  const { user, userProfile } = useAuth()
  const { students } = useStudents()
  const { classes } = useClasses()
  const { sessions } = useSessions()
  const { attendance, markAttendance: markMyAttendance } = useAttendance()
  const { attendance: studentAttendance, markAttendance: markStudentAttendance } = useStudentAttendance()

  const [activeTab, setActiveTab] = useState('timetable')
  const [myAttendanceDate, setMyAttendanceDate] = useState(new Date().toISOString().split('T')[0])
  const [myAttendanceStatus, setMyAttendanceStatus] = useState('present')
  const [myAttendancePeriods, setMyAttendancePeriods] = useState([])
  const [myAttendanceSession, setMyAttendanceSession] = useState('')
  
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSession, setSelectedSession] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [toast, setToast] = useState(null)
  
  const [selectedClassForTimetable, setSelectedClassForTimetable] = useState('')
  const [timetableDate, setTimetableDate] = useState(new Date().toISOString().split('T')[0])
  const [shortReportDate, setShortReportDate] = useState(new Date().toISOString().split('T')[0])
  const [shortReportData, setShortReportData] = useState(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [shortReportSelectedClasses, setShortReportSelectedClasses] = useState([])

  const handlePeriodToggle = (period) => {
    if (myAttendancePeriods.includes(period)) {
      setMyAttendancePeriods(myAttendancePeriods.filter(p => p !== period))
    } else {
      setMyAttendancePeriods([...myAttendancePeriods, period])
    }
  }

  const handleMarkMyAttendance = async () => {
    if (myAttendancePeriods.length === 0) {
      setToast({ message: 'Please select at least one period', type: 'info' })
      return
    }
    
    // Format periods as comma-separated string (e.g., "P1,P2,P3")
    const periodString = myAttendancePeriods.sort((a, b) => a - b).map(p => `P${p}`).join(',')
    
    // Mark attendance once with all selected periods
    try {
      let { error } = await supabase
        .from('staff_attendance')
        .insert([{ 
          user_id: user.id,
          date: myAttendanceDate,
          status: myAttendanceStatus,
          session_id: null,
          period: periodString,
          is_marked: true
        }])

      if (error && String(error.message || '').toLowerCase().includes('is_marked')) {
        const fallback = await supabase
          .from('staff_attendance')
          .insert([{ 
            user_id: user.id,
            date: myAttendanceDate,
            status: myAttendanceStatus,
            session_id: null,
            period: periodString
          }])
        error = fallback.error
      }

      if (error) throw error
      
      setToast({ message: `Attendance marked successfully for periods: ${periodString}`, type: 'success' })
      setMyAttendancePeriods([])
      
      // Refresh attendance records
      window.location.reload()
    } catch (err) {
      console.error('Error marking attendance:', err)
      setToast({ message: `Error marking attendance: ${err.message}`, type: 'error' })
    }
  }

  const handleAttendanceChange = (studentId, status, approvalStatus = null) => {
    setAttendanceMap({ 
      ...attendanceMap, 
      [studentId]: { status, approvalStatus } 
    })
  }

  const handleSubmitAttendance = async () => {
    if (!selectedClass || !selectedSession) {
      setToast({ message: 'Please select class and session', type: 'info' })
      return
    }

    const records = Object.entries(attendanceMap).map(([studentId, data]) => ({
      student_id: studentId,
      class_id: selectedClass,
      session_id: selectedSession,
      date: attendanceDate,
      status: data.status,
      approval_status: data.approvalStatus,
      marked_by: user.id
    }))

    if (records.length === 0) {
      setToast({ message: 'Please mark attendance for at least one student', type: 'info' })
      return
    }

    const result = await markStudentAttendance(
      records[0].student_id, 
      selectedClass, 
      selectedSession, 
      attendanceDate, 
      records[0].status,
      records[0].approval_status
    )
    
    for (let i = 1; i < records.length; i++) {
      await markStudentAttendance(
        records[i].student_id, 
        selectedClass, 
        selectedSession, 
        attendanceDate, 
        records[i].status,
        records[i].approval_status
      )
    }

    if (result.success) {
      setToast({ message: 'Attendance marked successfully!', type: 'success' })
      setAttendanceMap({})
    } else {
      setToast({ message: 'Error: ' + result.error, type: 'error' })
    }
  }

  const handleDownloadReport = async () => {
    if (!selectedClass) {
      setToast({ message: 'Please select a class', type: 'info' })
      return
    }
    
    try {
      // Fetch period attendance data for the selected class
      const { data: periodData, error } = await supabase
        .from('period_attendance')
        .select(`
          *,
          timetable (
            subject_code,
            subject_name,
            faculty_name
          ),
          classes (
            name
          )
        `)
        .eq('class_id', selectedClass)
        .eq('is_marked', true)
        .order('date', { ascending: false })
      
      if (error) throw error
      
      if (!periodData || periodData.length === 0) {
        setToast({ message: 'No attendance records for this class', type: 'info' })
        return
      }
      
      await generatePeriodAttendanceReport(periodData, supabase)
    } catch (err) {
      console.error('Error fetching attendance:', err)
      setToast({ message: 'Error fetching attendance records', type: 'error' })
    }
  }
  const generateShortReport = async () => {
    if (!userProfile?.stream_id) {
      setToast({ message: 'Your account is not assigned to a stream', type: 'info' })
      return
    }

    if (shortReportSelectedClasses.length === 0) {
      setToast({ message: 'Please select at least one class', type: 'info' })
      return
    }

    const reportStream = userProfile.stream_id
    setLoadingReport(true)

    try {
      const streamInfo = streams.find(s => s.id === reportStream)

      const selectedClasses = classes.filter(cls =>
        shortReportSelectedClasses.includes(cls.id)
      )

      const reportData = {
        stream: streamInfo,
        date: shortReportDate,
        classes: []
      }

      for (const cls of selectedClasses) {
        const classStudents = students.filter(s => s.class_id === cls.id)
        const totalStudents = classStudents.length

        const { data: attendanceRecords, error } = await supabase
          .from('period_student_attendance')
          .select(`
            *,
            students!inner(class_id, status),
            period_attendance!inner(date)
          `)
          .eq('students.class_id', cls.id)
          .eq('period_attendance.date', shortReportDate)

        if (error) {
          console.error('Error fetching attendance:', error)
          continue
        }

        const uniqueStudentIds = new Set()
        let presentCount = 0
        let approvedAbsentCount = 0
        let unapprovedAbsentCount = 0
        let onDutyCount = 0

        attendanceRecords?.forEach(record => {
          if (!uniqueStudentIds.has(record.student_id)) {
            uniqueStudentIds.add(record.student_id)

            if (record.status === 'present') {
              presentCount++
            } else if (record.status === 'absent') {
              if (record.approval_status === 'approved') {
                approvedAbsentCount++
              } else {
                unapprovedAbsentCount++
              }
            } else if (record.status === 'on_duty') {
              onDutyCount++
            }
          }
        })

        const suspendedCount = classStudents.filter(s => s.status === 'suspended').length
        const internCount = classStudents.filter(s => s.status === 'intern').length

        reportData.classes.push({
          name: cls.name,
          present: presentCount,
          total: totalStudents,
          approved: approvedAbsentCount,
          unapproved: unapprovedAbsentCount,
          onDuty: onDutyCount,
          suspended: suspendedCount,
          intern: internCount
        })
      }

      setShortReportData(reportData)
    } catch (err) {
      console.error('Error generating report:', err)
      setToast({ message: 'Error generating report', type: 'error' })
    } finally {
      setLoadingReport(false)
    }
  }

  const filteredStudents = selectedClass ? students.filter(s => s.class_id === selectedClass && s.status !== 'suspended' && s.status !== 'intern') : []
  const myAttendanceRecords = attendance.filter(record => record.user_id === user?.id)
  const pcClasses = classes.filter(cls => cls.stream_id === userProfile?.stream_id)

  const tabs = [
    { id: 'timetable', name: 'Timetable' },
    ...(userProfile?.is_pc ? [{ id: 'shortreport', name: 'Short Report' }] : []),
    { id: 'myAttendance', name: 'My Attendance' },
    { id: 'reports', name: 'Reports' }
  ]

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
      </div>
      
      <Navbar />
      
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8 relative z-10 animate-fadeIn">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 tracking-tight">
            Staff Dashboard
          </h1>
          <p className="text-gray-400 text-sm sm:text-lg">Welcome back, {userProfile?.name}</p>
        </div>

        <div className="bg-gray-900 rounded-xl border border-white/10 mb-6 shadow-2xl">
          <div className="border-b border-white/10">
            <nav className="flex overflow-x-auto p-2 gap-2 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 sm:px-6 py-2 sm:py-3 font-semibold transition-all duration-300 rounded-xl whitespace-nowrap text-sm sm:text-base ${
                    activeTab === tab.id ? 'bg-white text-black shadow-lg transform scale-105' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-3 sm:p-6">
            {activeTab === 'timetable' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-4 text-white">Interactive Timetable & Attendance</h2>
                  <p className="text-gray-400 mb-4">Select a class to view its timetable and mark period-wise attendance</p>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Select Class</label>
                    <select
                      value={selectedClassForTimetable}
                      onChange={(e) => setSelectedClassForTimetable(e.target.value)}
                      className="w-full px-4 py-3 bg-black border-2 border-white/30 text-white rounded-lg focus:border-white outline-none transition-all duration-300"
                    >
                      <option value="">-- Select a Class --</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} ({cls.departments?.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedClassForTimetable ? (
                  <InteractiveTimetable 
                    classId={selectedClassForTimetable} 
                    selectedDate={timetableDate}
                  />
                ) : (
                  <div className="bg-gray-900 border border-white/20 rounded-lg shadow-lg p-12 text-center">
                    <h3 className="text-xl font-semibold text-white mb-2">NO CLASS SELECTED</h3>
                    <p className="text-gray-400">Please select a class from the dropdown above to view its timetable</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'shortreport' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Short Report</h2>
                  <p className="text-gray-400 text-sm sm:text-base">
                    Daily attendance summary for{' '}
                    {streams.find(s => s.id === userProfile?.stream_id)?.code || 'your stream'}. Select one or more classes to include.
                  </p>
                </div>

                <div className="bg-gray-900 border border-white/20 rounded-xl p-6">
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Stream</label>
                      <div className="px-4 py-3 bg-gray-900 border-2 border-white/30 rounded-lg text-gray-400 cursor-not-allowed opacity-75">
                        {streams.find(s => s.id === userProfile?.stream_id)?.name || 'Stream'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Date</label>
                      <input
                        type="date"
                        value={shortReportDate}
                        onChange={e => setShortReportDate(e.target.value)}
                        className="w-full px-4 py-3 bg-black border-2 border-white/30 text-white rounded-lg focus:border-white outline-none transition-all duration-300"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={generateShortReport}
                        disabled={loadingReport}
                        className="w-full px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 hover:scale-105 transition-all duration-300 font-semibold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loadingReport ? 'Generating...' : 'Generate Report'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Select Classes</label>
                    <div className="max-h-56 overflow-y-auto bg-black/40 border border-white/10 rounded-lg p-3 space-y-2">
                      {pcClasses.length === 0 && (
                        <p className="text-gray-400 text-sm">No classes found for your stream.</p>
                      )}
                      {pcClasses.map(cls => (
                        <label key={cls.id} className="flex items-center gap-2 text-sm text-gray-200">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-white/40 bg-black"
                            checked={shortReportSelectedClasses.includes(cls.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setShortReportSelectedClasses([...shortReportSelectedClasses, cls.id])
                              } else {
                                setShortReportSelectedClasses(
                                  shortReportSelectedClasses.filter(id => id !== cls.id)
                                )
                              }
                            }}
                          />
                          <span>
                            {cls.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {shortReportData && (
                  <div className="bg-gray-900 border border-white/20 rounded-xl p-8">
                    <div className="mb-6 pb-4 border-b border-white/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🎓</span>
                        <h3 className="text-xl font-bold text-white">Stream: {shortReportData.stream?.name}</h3>
                        {userProfile?.is_pc && (
                          <span className="ml-2 px-2 py-1 bg-purple-900 text-purple-200 rounded text-xs font-semibold">
                            📋 PC Report
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📅</span>
                        <p className="text-gray-400">Date: {new Date(shortReportData.date).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {shortReportData.classes.map((cls, index) => (
                        <div key={index} className="bg-black/30 rounded-lg p-6 border border-white/10">
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl">➕</span>
                            <h4 className="text-lg font-bold text-white">
                              {cls.name}: {shortReportData.stream?.code} {cls.present}/{cls.total}
                            </h4>
                          </div>

                          <div className="space-y-2 ml-6">
                            {cls.approved > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-green-500">📍</span>
                                <span className="text-gray-300">Approved: <span className="text-white font-semibold">{String(cls.approved).padStart(2, '0')}</span></span>
                              </div>
                            )}
                            {cls.unapproved > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-orange-500">📍</span>
                                <span className="text-gray-300">Unapproved: <span className="text-white font-semibold">{String(cls.unapproved).padStart(2, '0')}</span></span>
                              </div>
                            )}
                            {cls.onDuty > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-blue-500">📍</span>
                                <span className="text-gray-300">OD: <span className="text-white font-semibold">{String(cls.onDuty).padStart(2, '0')}</span></span>
                              </div>
                            )}
                            {cls.suspended > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-red-500">📍</span>
                                <span className="text-gray-300">Suspend: <span className="text-white font-semibold">{String(cls.suspended).padStart(2, '0')}</span></span>
                              </div>
                            )}
                            {cls.intern > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">📍</span>
                                <span className="text-gray-300">Intern: <span className="text-white font-semibold">{String(cls.intern).padStart(2, '0')}</span></span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/20">
                      <p className="text-gray-400 text-sm">
                        Reported by: <span className="text-white font-semibold">Program Coordinator, {shortReportData.stream?.code} - {userProfile?.name}</span>
                      </p>
                    </div>

                    <div className="mt-6">
                      <button
                        onClick={() => {
                          const reportText = `☀️Stream: ${shortReportData.stream?.name}\n☀️Date: ${new Date(shortReportData.date).toLocaleDateString('en-GB')}\n\n${shortReportData.classes.map(cls => 
                            `➕${cls.name}: ${shortReportData.stream?.code}  ${cls.present}/${cls.total}\n${cls.approved > 0 ? `📍Approved: ${String(cls.approved).padStart(2, '0')}\n` : ''}${cls.unapproved > 0 ? `📍Unapproved: ${String(cls.unapproved).padStart(2, '0')}\n` : ''}${cls.onDuty > 0 ? `📍OD: ${String(cls.onDuty).padStart(2, '0')}\n` : ''}${cls.suspended > 0 ? `📍Suspend: ${String(cls.suspended).padStart(2, '0')}\n` : ''}${cls.intern > 0 ? `📍Intern: ${String(cls.intern).padStart(2, '0')}\n` : ''}`
                          ).join('\n')}\n\nReported by: Program Coordinator, ${shortReportData.stream?.code} - ${userProfile?.name}`

                          navigator.clipboard.writeText(reportText)
                          setToast({ message: 'Report copied to clipboard!', type: 'success' })
                        }}
                        className="px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-all duration-300 font-semibold uppercase tracking-wide"
                      >
                        Copy Report to Clipboard
                      </button>
                    </div>
                  </div>
                )}

                {!shortReportData && !loadingReport && (
                  <div className="bg-gray-900 border border-white/20 rounded-xl p-12 text-center">
                    <p className="text-gray-400 text-lg">Select a date and classes to generate the short report for your stream</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'myAttendance' && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-white">Mark My Attendance</h2>
                
                <div className="bg-gray-900 border border-white/20 rounded-xl p-6 mb-6">
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Date</label>
                      <input type="date" value={myAttendanceDate} onChange={(e) => setMyAttendanceDate(e.target.value)} className="w-full px-4 py-3 bg-black border-2 border-white/30 text-white rounded-lg focus:border-white outline-none transition-all duration-300" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Status</label>
                      <select value={myAttendanceStatus} onChange={(e) => setMyAttendanceStatus(e.target.value)} className="w-full px-4 py-3 bg-black border-2 border-white/30 text-white rounded-lg focus:border-white outline-none transition-all duration-300">
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="on_duty">On Duty</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-white mb-3 uppercase tracking-wide">Select Periods (Multiple)</label>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      {[1, 2, 3, 4, 5, 6].map(period => (
                        <button
                          key={period}
                          type="button"
                          onClick={() => handlePeriodToggle(period)}
                          className={`px-4 py-3 rounded-lg font-semibold transition-all duration-300 ${
                            myAttendancePeriods.includes(period)
                              ? 'bg-white text-black border-2 border-white'
                              : 'bg-black text-white border-2 border-white/30 hover:border-white/50'
                          }`}
                        >
                          P{period}
                        </button>
                      ))}
                    </div>
                    {myAttendancePeriods.length > 0 && (
                      <p className="mt-2 text-sm text-gray-400">
                        Selected: {myAttendancePeriods.sort((a, b) => a - b).map(p => `P${p}`).join(', ')}
                      </p>
                    )}
                  </div>
                  
                  <button onClick={handleMarkMyAttendance} className="w-full px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 hover:scale-105 transition-all duration-300 font-semibold uppercase tracking-wide">
                    Mark Attendance for {myAttendancePeriods.length || 0} Period(s)
                  </button>
                </div>

                <h3 className="text-xl font-bold mb-4 text-white">My Attendance History</h3>
                <div className="overflow-x-auto bg-gray-900 border border-white/20 rounded-xl">
                  <table className="w-full">
                    <thead className="bg-black border-b border-white/20">
                      <tr>
                        <th className="px-4 py-3 text-left text-white font-bold uppercase tracking-wide text-sm">Date</th>
                        <th className="px-4 py-3 text-left text-white font-bold uppercase tracking-wide text-sm">Period</th>
                        <th className="px-4 py-3 text-left text-white font-bold uppercase tracking-wide text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myAttendanceRecords.map((record, index) => (
                        <tr key={index} className="border-b border-white/10 hover:bg-gray-800 transition-colors">
                          <td className="px-4 py-3 text-white">{new Date(record.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3">
                            <span className="text-gray-300 font-semibold">
                              {record.period || 'Not specified'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              record.status === 'present' ? 'bg-white text-black' :
                              record.status === 'absent' && record.approval_status === 'approved' ? 'bg-gray-300 text-black' :
                              record.status === 'absent' && record.approval_status === 'unapproved' ? 'bg-gray-600 text-white' :
                              record.status === 'absent' ? 'bg-gray-700 text-white' :
                              'bg-gray-400 text-black'
                            }`}>
                              {record.status === 'absent' && record.approval_status 
                                ? `Absent (${record.approval_status.charAt(0).toUpperCase() + record.approval_status.slice(1)})`
                                : record.status.charAt(0).toUpperCase() + record.status.slice(1).replace('_', ' ')
                              }
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-white">Attendance Reports</h2>
                
                <div className="bg-gray-900 border border-white/20 rounded-xl p-6 mb-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Select Class</label>
                      <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full px-4 py-3 bg-black border-2 border-white/30 text-white rounded-lg focus:border-white outline-none transition-all duration-300">
                        <option value="">Select Class</option>
                        {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button onClick={handleDownloadReport} className="w-full px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 hover:scale-105 transition-all duration-300 font-semibold uppercase tracking-wide">
                        Download PDF
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 border-2 border-white/30 rounded-xl p-4">
                  <p className="text-sm text-gray-300">
                    <strong className="text-white">Note:</strong> You can only download reports for your assigned classes. For system-wide reports, contact the administrator.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  )
}

export default StaffDashboardNew
