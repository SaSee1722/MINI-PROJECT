import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useStudents } from '../hooks/useStudents'
import { useClasses } from '../hooks/useClasses'
import { useSessions } from '../hooks/useSessions'
import { useAttendance } from '../hooks/useAttendance'
import { useStudentAttendance } from '../hooks/useStudentAttendance'
import { useUsers } from '../hooks/useUsers'
import { useDailyAttendance } from '../hooks/useDailyAttendance'
import { supabase } from '../services/supabase'
import Navbar from '../components/Navbar'
import AttendanceCheckbox from '../components/AttendanceCheckbox'
import InteractiveTimetable from '../components/InteractiveTimetable'
import Toast from '../components/Toast'
import { generatePeriodAttendanceReport } from '../utils/pdfGenerator'
import { Zap, Shield, Users, Clock, FileText, Activity, AlertCircle, Upload, CheckCircle, XCircle, Layout } from 'lucide-react'

const streams = [
  { id: 'cse', name: 'Computer Science and Engineering', code: 'CSE' }
]

const StaffDashboardNew = () => {
  const { user, userProfile } = useAuth()
  const { students } = useStudents()
  const { classes } = useClasses()
  const { sessions } = useSessions()
  const { attendance, markAttendance: markMyAttendance, refetch: refetchStaffAttendance } = useAttendance()
  const { attendance: studentAttendance, markAttendance: markStudentAttendance } = useStudentAttendance()

  const { 
    appointAsHOD, 
    removeHOD, 
    appointAsClassAdvisor, 
    removeClassAdvisor 
  } = useUsers()

  const [activeTab, setActiveTab] = useState('timetable')
  const [leaveFormData, setLeaveFormData] = useState({
    name: '',
    regNo: '',
    departmentId: '',
    section: '',
    attendancePct: '',
    reason: ''
  })
  const [fileToUpload, setFileToUpload] = useState(null)
  const [leaveRequests, setLeaveRequests] = useState([])
  const [hodRequests, setHodRequests] = useState([])
  const [loadingLeave, setLoadingLeave] = useState(false)
  
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSession, setSelectedSession] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])
  const [attendanceMap, setAttendanceMap] = useState({})
  const [toast, setToast] = useState(null)
  
  const [selectedClassForTimetable, setSelectedClassForTimetable] = useState('')
  const [timetableDate, setTimetableDate] = useState(new Date().toISOString().split('T')[0])
  const [shortReportData, setShortReportData] = useState(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [shortReportSelectedClasses, setShortReportSelectedClasses] = useState([])
  const [showDailyRoster, setShowDailyRoster] = useState(false)
  const [localDailyAttendance, setLocalDailyAttendance] = useState({})
  const [recentHistory, setRecentHistory] = useState([])
  const [submittingDaily, setSubmittingDaily] = useState(false)
  const [reportSubjectCode, setReportSubjectCode] = useState('')
  const [foundReports, setFoundReports] = useState([])
  const [searchingReports, setSearchingReports] = useState(false)
  const [advisorReportData, setAdvisorReportData] = useState(null)
  const [loadingAdvisorReport, setLoadingAdvisorReport] = useState(false)

  const { dailyAttendance, bulkMarkDailyAttendance, fetchRecentHistory } = useDailyAttendance(
    userProfile?.advisor_class_id, 
    attendanceDate
  )

  useEffect(() => {
    if (dailyAttendance) {
      setLocalDailyAttendance(dailyAttendance)
    }
  }, [dailyAttendance])

  const loadHistory = async () => {
    const history = await fetchRecentHistory()
    setRecentHistory(history)
  }

  useEffect(() => {
    if (activeTab === 'dayAttendance' && userProfile?.advisor_class_id) {
      loadHistory()
    }
  }, [activeTab, userProfile?.advisor_class_id])

  const handleSubmitDailyAttendance = async () => {
    if (!userProfile?.advisor_class_id) return
    
    setSubmittingDaily(true)
    const records = Object.entries(localDailyAttendance).map(([id, data]) => ({
      student_id: id,
      class_id: userProfile.advisor_class_id,
      date: attendanceDate,
      status: data.status,
      approval_status: data.approval_status,
      marked_by: user?.id
    }))

    if (records.length === 0) {
      setToast({ message: 'No attendance marked yet', type: 'warning' })
      setSubmittingDaily(false)
      return
    }

    const result = await bulkMarkDailyAttendance(records)

    if (result.success) {
      setToast({ message: 'Daily attendance synchronized successfully!', type: 'success' })
      setShowDailyRoster(false)
      setLocalDailyAttendance({})
      // Delay history load to allow DB to propagate
      setTimeout(() => loadHistory(), 800)
    } else {
      setToast({ message: 'Synchronization failed: ' + result.error, type: 'error' })
    }
    setSubmittingDaily(false)
  }

  const handleMarkAllDailyPresent = async () => {
    const allPresentMap = {}
    dailyStudents.forEach(student => {
      allPresentMap[student.id] = {
        status: 'present',
        approval_status: 'approved'
      }
    })
    setLocalDailyAttendance(prev => ({ ...prev, ...allPresentMap }))
    setToast({ message: 'All students set to present in local state. Click Sync to save.', type: 'info' })
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const currentStream = streams.find(s => s.id === userProfile?.stream_id)

  useEffect(() => {
    // Proactive fetch for HOD badge
    if (userProfile?.is_hod && userProfile?.stream_id) {
      fetchHodRequests()
    }

    if (activeTab === 'leaveRequest') {
      fetchMyLeaveRequests()
    }
  }, [activeTab, userProfile])

  const fetchMyLeaveRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('student_leave_requests')
        .select('*')
        .eq('staff_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error && error.code !== 'PGRST116') { // Ignore if table doesn't exist yet
         console.error('Error fetching leave requests:', error)
      }
      setLeaveRequests(data || [])
    } catch (err) {
      console.error('Error fetching requests:', err)
    }
  }

  const fetchHodRequests = async () => {
    if (!userProfile?.stream_id) return
    try {
      const { data, error } = await supabase
        .from('student_leave_requests')
        .select('*')
        .eq('department_id', userProfile.stream_id)
        .eq('status', 'pending_hod')
        .order('created_at', { ascending: false })

      if (error && error.code !== 'PGRST116') {
         console.error('Error fetching HOD requests:', error)
      }
      setHodRequests(data || [])
    } catch (err) {
      console.error('Error fetching HOD requests:', err)
    }
  }

  const handleLeaveSubmit = async (e) => {
    e.preventDefault()
    if (!leaveFormData.departmentId || !leaveFormData.section) {
      setToast({ message: 'Please fill all required fields', type: 'info' })
      return
    }

    setLoadingLeave(true)
    try {
      let publicUrl = ''
      
      if (fileToUpload) {
        const fileExt = fileToUpload.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `leave-letters/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, fileToUpload)
          
        if (uploadError) {
          console.error('File upload failed:', uploadError)
          setToast({ 
            message: 'Upload failed: ' + (uploadError.message === 'The resource was not found' ? 'Storage bucket "documents" missing. Please run the SQL script.' : uploadError.message), 
            type: 'error' 
          })
          setLoadingLeave(false)
          return
        } else {
          const { data } = supabase.storage.from('documents').getPublicUrl(filePath)
          publicUrl = data.publicUrl
        }
      }
      
      const { error } = await supabase.from('student_leave_requests').insert([{
        student_name: leaveFormData.name,
        register_number: leaveFormData.regNo,
        department_id: leaveFormData.departmentId,
        section: leaveFormData.section,
        attendance_percentage: leaveFormData.attendancePct,
        reason: leaveFormData.reason,
        letter_url: publicUrl,
        staff_id: user.id,
        status: 'pending_hod'
      }])
      
      if (error) throw error
      
      setToast({ message: 'Leave request submitted successfully!', type: 'success' })
      setLeaveFormData({
        name: '',
        regNo: '',
        departmentId: '',
        section: '',
        attendancePct: '',
        reason: ''
      })
      setFileToUpload(null)
      fetchMyLeaveRequests()
    } catch (err) {
      console.error('Submission error:', err)
      setToast({ message: 'Error submitting request: ' + err.message, type: 'error' })
    } finally {
      setLoadingLeave(false)
    }
  }

  const handleHodAction = async (requestId, action) => {
    try {
      const newStatus = action === 'approve' ? 'pending_admin' : 'rejected'
      
      const { error } = await supabase
        .from('student_leave_requests')
        .update({ status: newStatus })
        .eq('id', requestId)
        
      if (error) throw error
      
      setToast({ message: `Request ${action}d successfully`, type: 'success' })
      fetchHodRequests()
    } catch (err) {
      setToast({ message: 'Error updating status', type: 'error' })
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

  const handleSearchReports = async () => {
    if (!selectedClass || !reportSubjectCode) {
      setToast({ message: 'Select class and enter subject code', type: 'info' })
      return
    }

    setSearchingReports(true)
    try {
      const { data, error } = await supabase
        .from('period_attendance')
        .select(`
          *,
          timetable (
            subject_code,
            subject_name,
            faculty_name
          ),
          classes (
            name,
            id
          )
        `)
        .eq('class_id', selectedClass)
        .eq('is_marked', true)
        .eq('marked_by', user.id)
        .filter('timetable.subject_code', 'eq', reportSubjectCode)
        .order('date', { ascending: false })

      if (error) throw error
      
      const filtered = data.filter(p => p.timetable && p.timetable.subject_code === reportSubjectCode)
      setFoundReports(filtered)
      
      if (filtered.length === 0) {
        setToast({ message: 'No reports found for this subject code', type: 'info' })
      }
    } catch (err) {
      console.error('Search error:', err)
      setToast({ message: 'Error searching reports', type: 'error' })
    } finally {
      setSearchingReports(false)
    }
  }

  const handleDownloadReport = async (reportsToDownload) => {
    if (!reportsToDownload || reportsToDownload.length === 0) return
    
    try {
      await generatePeriodAttendanceReport(reportsToDownload, supabase, { subjectCode: reportSubjectCode })
      setToast({ message: 'Report generated successfully', type: 'success' })
    } catch (err) {
      console.error('Download error:', err)
      setToast({ message: 'Error generating PDF', type: 'error' })
    }
  }

  const generateAdvisorReport = async () => {
    if (!userProfile?.advisor_class_id) {
      setToast({ message: 'Class Advisor node not initialized', type: 'warning' })
      return
    }

    setLoadingAdvisorReport(true)
    try {
      const classId = userProfile.advisor_class_id
      const classObj = classes.find(c => c.id === classId)
      
      // Fetch DEFINITIVE daily records for this date
      const { data: records, error } = await supabase
        .from('daily_student_attendance')
        .select(`
          status,
          student_id,
          students (
            id,
            name,
            roll_number,
            status
          )
        `)
        .eq('class_id', classId)
        .eq('date', attendanceDate)

      if (error) throw error

      const classStudents = students.filter(s => s.class_id === classId)
      
      const report = {
        date: attendanceDate,
        className: classObj?.name || 'Class',
        total: classStudents.length,
        present: 0,
        absent: 0,
        od: 0,
        internCount: classStudents.filter(s => s.status === 'intern').length,
        unapproved: [],
        approved: [],
        onDuty: [],
        interns: classStudents.filter(s => s.status === 'intern').map(s => ({ name: s.name, roll: s.roll_number }))
      }

      // Get approved leave requests for this date
      // Note: We'll match by roll number since leave_requests uses register_number
      const approvedLeaves = leaveRequests?.filter(r => r.status === 'approved') || []

      records?.forEach(record => {
        if (record.status === 'present') {
          report.present++
        } else if (record.status === 'absent') {
          report.absent++
          const roll = record.students?.roll_number
          const isApproved = approvedLeaves.some(l => l.register_number === roll)
          
          if (isApproved) {
            report.approved.push({ 
              name: record.students?.name, 
              roll: roll 
            })
          } else {
            report.unapproved.push({ 
              name: record.students?.name, 
              roll: roll 
            })
          }
        } else if (record.status === 'on_duty') {
          report.od++
          report.onDuty.push({ 
            name: record.students?.name, 
            roll: record.students?.roll_number 
          })
        }
      })

      setAdvisorReportData(report)
    } catch (err) {
      console.error('Advisor Report Error:', err)
      setToast({ message: 'Failed to generate class report', type: 'error' })
    } finally {
      setLoadingAdvisorReport(false)
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

        // Get today's definitive daily attendance for this class
        const { data: attendanceRecords, error } = await supabase
          .from('daily_student_attendance')
          .select(`
            status,
            student_id,
            students (
              id,
              roll_number
            )
          `)
          .eq('class_id', cls.id)
          .eq('date', shortReportDate)

        if (error) {
          console.error('Error fetching daily attendance:', error)
          continue
        }

        let presentCount = 0
        let approvedAbsentCount = 0
        let unapprovedAbsentCount = 0
        let onDutyCount = 0

        // Get approved leave requests
        const approvedLeaves = leaveRequests?.filter(r => r.status === 'approved') || []

        attendanceRecords?.forEach(record => {
          if (record.status === 'present') {
            presentCount++
          } else if (record.status === 'absent') {
            const roll = record.students?.roll_number
            const isApproved = approvedLeaves.some(l => l.register_number === roll)
            if (isApproved) {
              approvedAbsentCount++
            } else {
              unapprovedAbsentCount++
            }
          } else if (record.status === 'on_duty') {
            onDutyCount++
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
  const dailyStudents = userProfile?.advisor_class_id ? students.filter(s => s.class_id === userProfile.advisor_class_id && s.status !== 'suspended' && s.status !== 'intern') : []
  const dailySuspendedStudents = userProfile?.advisor_class_id ? students.filter(s => s.class_id === userProfile.advisor_class_id && s.status === 'suspended') : []
  const dailyInternStudents = userProfile?.advisor_class_id ? students.filter(s => s.class_id === userProfile.advisor_class_id && s.status === 'intern') : []
  const myAttendanceRecords = attendance.filter(record => record.user_id === user?.id)

  const tabs = [
    { id: 'timetable', name: 'Timetable' },
    ...(userProfile?.is_class_advisor ? [{ id: 'dayAttendance', name: 'Day Attendance' }, { id: 'advisorReport', name: 'Class Report' }] : []),
    ...(userProfile?.is_hod ? [{ id: 'shortreport', name: 'Short Report' }] : []),
    { id: 'leaveRequest', name: 'Leave Request', badge: userProfile?.is_hod ? hodRequests.length : 0 },
    { id: 'reports', name: 'Reports' }
  ]

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full" style={{backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
      </div>
      
      <Navbar />
      
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Premium Dashboard Header */}
        <div className="relative mb-8 sm:mb-16 py-8 sm:py-12 overflow-hidden rounded-3xl sm:rounded-[3rem] bg-[#020617] border border-white/5 shadow-2xl animate-smoothFadeIn px-6 sm:px-10 group">
          <div className="absolute top-0 right-0 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-emerald-500/10 rounded-full blur-[80px] sm:blur-[120px] -mr-32 -mt-32 sm:-mr-60 sm:-mt-60 animate-pulse transition-colors duration-1000 group-hover:bg-emerald-500/20"></div>
          <div className="absolute bottom-0 left-0 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-blue-500/10 rounded-full blur-[60px] sm:blur-[100px] -ml-20 -mb-20 sm:-ml-40 sm:-mb-40"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 sm:gap-10">
            <div className="space-y-4 sm:space-y-6 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-2 sm:mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Faculty Access Node</span>
              </div>
              
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter leading-[1.1] sm:leading-[0.9]">
                Staff <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Dashboard</span>
              </h1>
              
              <p className="text-lg text-gray-400 font-medium max-w-xl leading-relaxed">
                Welcome back, <span className="text-white font-bold">{userProfile?.name}</span>. Manage your academic schedule, track attendance, and generate reports from your command center.
              </p>

              <div className="flex flex-wrap gap-3">
                {userProfile?.role === 'admin' && (
                  <span className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                    ADMINISTRATION
                  </span>
                )}
                {userProfile?.is_hod && (
                  <span className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                    HEAD OF DEPARTMENT
                  </span>
                )}
                {userProfile?.is_class_advisor && (
                  <span className="px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                    CLASS ADVISOR: {classes.find(c => c.id === userProfile.advisor_class_id)?.name}
                  </span>
                )}
                {currentStream?.code && (
                   <span className="px-4 py-2 rounded-xl bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-widest border border-white/10">
                     {currentStream.code} STREAM
                   </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Daily Prompt for Class Advisors */}
        {userProfile?.is_class_advisor && (
          <div className="mb-12 sm:mb-16 bg-gradient-to-r from-blue-600/10 to-emerald-600/10 border border-blue-500/20 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-blue-500/20 transition-all duration-700"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-10">
              <div className="flex items-center gap-4 sm:gap-8 w-full md:w-auto">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-500/20 rounded-2xl sm:rounded-3xl flex items-center justify-center text-2xl sm:text-3xl text-blue-400 border border-blue-500/20 shadow-2xl flex-shrink-0">
                  <Clock size={28} />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Daily Protocol</h3>
                  <p className="text-blue-200/60 text-xs sm:text-sm font-bold uppercase tracking-widest mt-1">Ensure synchronization for <span className="text-white">{classes.find(c => c.id === userProfile.advisor_class_id)?.name}</span></p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => {
                    setSelectedClassForTimetable(userProfile.advisor_class_id)
                    setActiveTab('timetable')
                  }}
                  className="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white/20 transition-all"
                >
                  Period Protocol
                </button>
                <button 
                  onClick={() => {
                    setActiveTab('dayAttendance')
                  }}
                  className="px-8 py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
                >
                  Daily Protocol
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide items-center justify-start sm:justify-center gap-2 sm:gap-4 mb-8 sm:mb-16 animate-slideUp py-2 -mx-3 px-3 sm:mx-0 sm:px-0" style={{animationDelay: '0.1s'}}>
           {tabs.map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`whitespace-nowrap px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] transition-all duration-500 flex-shrink-0 ${
                 activeTab === tab.id 
                   ? 'bg-white text-black shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] scale-105 sm:scale-110' 
                   : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'
               }`}
             >
               <span className="flex items-center gap-2">
                 {tab.name}
                 {tab.badge > 0 && (
                   <span className={`px-2 py-0.5 rounded-full text-[8px] animate-pulse ${
                     activeTab === tab.id ? 'bg-black text-white' : 'bg-emerald-500 text-white'
                   }`}>
                     {tab.badge}
                   </span>
                 )}
               </span>
             </button>
           ))}
        </div>

        <div className="animate-slideUp" style={{animationDelay: '0.2s'}}>

          <div className="p-3 sm:p-6">
           {activeTab === 'timetable' && (
             <div className="space-y-8 sm:space-y-10">
               <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                 <div className="space-y-2">
                   <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter">Interactive Timetable</h2>
                   <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">Manage sessions & mark attendance</p>
                 </div>
               </div>

               <div className="bg-white/[0.03] border border-white/10 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 space-y-6 sm:space-y-8">
                 <div className="space-y-4">
                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Select Academic Node</label>
                   <select
                     value={selectedClassForTimetable}
                     onChange={(e) => setSelectedClassForTimetable(e.target.value)}
                     className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-emerald-500/50 outline-none transition-all appearance-none cursor-pointer"
                   >
                     <option value="">-- Select Class Node --</option>
                     {classes.map((cls) => (
                       <option key={cls.id} value={cls.id}>
                         {cls.name} ({cls.departments?.name})
                       </option>
                     ))}
                   </select>
                 </div>

                 {selectedClassForTimetable ? (
                   <InteractiveTimetable 
                     classId={selectedClassForTimetable} 
                     selectedDate={timetableDate}
                     className={classes.find(c => c.id === selectedClassForTimetable)?.name}
                   />
                 ) : (
                   <div className="py-20 text-center opacity-30">
                     <Activity size={48} className="mx-auto mb-6 text-gray-500" />
                     <h3 className="text-xl font-black text-white tracking-tight uppercase">No Class Selected</h3>
                     <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Select a class node to initialize timetable</p>
                   </div>
                 )}
               </div>
             </div>
          )}

          {activeTab === 'dayAttendance' && userProfile?.is_class_advisor && (
            <div className="space-y-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <h2 className="text-4xl font-black text-white tracking-tighter">Daily Protocol</h2>
                  <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">Synchronization of institutional presence</p>
                </div>
                {Object.keys(dailyAttendance).length > 0 && (
                  <div className="flex items-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-smoothFadeIn">
                    <CheckCircle size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-0.5">Records Synchronized for {new Date(attendanceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                  </div>
                )}
                <div className="flex gap-4">
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-emerald-500/50 outline-none transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Class Card for Advisor */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userProfile?.advisor_class_id && (
                   <div 
                    onClick={() => {
                      if (Object.keys(dailyAttendance).length > 0) {
                        setToast({ 
                          message: 'Institutional records for today are already synchronized!', 
                          type: 'info' 
                        })
                        return
                      }
                      setShowDailyRoster(!showDailyRoster)
                    }}
                    className={`group cursor-pointer bg-white/[0.04] border ${showDailyRoster ? 'border-emerald-500' : 'border-emerald-500/30'} rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 relative overflow-hidden transition-all duration-500 shadow-2xl shadow-emerald-500/10 hover:scale-[1.02] active:scale-95`}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors"></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 sm:gap-5 mb-6 sm:mb-8">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-500/20 rounded-2xl sm:rounded-[1.5rem] flex items-center justify-center border border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-500 transition-all">
                          <Layout size={24} className={showDailyRoster ? 'text-white' : ''} />
                        </div>
                        <div>
                          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            {classes.find(c => c.id === userProfile.advisor_class_id)?.name}
                          </h3>
                          <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${Object.keys(dailyAttendance).length > 0 ? 'text-emerald-400' : 'text-emerald-500/60'}`}>
                            {showDailyRoster 
                              ? 'Marking in Progress' 
                              : Object.keys(dailyAttendance).length > 0 
                                ? 'Attendance Already Marked' 
                                : 'Click to Mark Attendance'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between py-6 border-y border-white/5 mb-8">
                        <div>
                          <span className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Strength</span>
                          <span className="text-2xl font-black text-white">
                            {dailyStudents.length} Students
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Status</span>
                          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">Active</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-3">
                          {dailyStudents.slice(0, 3).map((_, i) => (
                            <div key={i} className="w-10 h-10 rounded-full bg-white/5 border-2 border-[#020617] flex items-center justify-center overflow-hidden">
                              <Users size={16} className="text-gray-500" />
                            </div>
                          ))}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ml-2 ${Object.keys(dailyAttendance).length > 0 ? 'text-emerald-500' : 'text-gray-500'}`}>
                          {Object.keys(dailyAttendance).length > 0 ? 'Protocol Synchronized' : 'Verification Ready'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Daily Records Summary */}
                <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      <Activity size={18} className="text-emerald-500" />
                      <h4 className="text-sm font-black text-white uppercase tracking-widest leading-none mt-1">Recent Intelligence Analysis</h4>
                    </div>
                    <button 
                      onClick={loadHistory}
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-white"
                      title="Refresh Analysis"
                    >
                      <Clock size={16} />
                    </button>
                  </div>
                  
                  {recentHistory.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">No recent exceptions logged</p>
                      <p className="text-[9px] text-gray-700 uppercase tracking-tighter mt-2 font-bold focus:animate-pulse">Analyzing Archives...</p>
                    </div>
                  ) : recentHistory[0]?.date === 'error' ? (
                    <div className="py-10 text-center">
                      <AlertCircle size={24} className="mx-auto mb-4 text-red-500/50" />
                      <p className="text-[10px] font-black text-red-500/50 uppercase tracking-widest">Operational Fault Detected</p>
                      <p className="text-[8px] text-gray-600 mt-1 font-mono">{recentHistory[0].error}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentHistory.map((day) => (
                        <div key={day.date} className="group flex flex-col gap-3 p-5 bg-white/[0.02] rounded-[1.5rem] border border-white/5 hover:border-emerald-500/20 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                              {day.date === 'error' ? 'SYSTEM ERROR' : new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${day.exceptions.length > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                              {day.exceptions.length > 0 ? `${day.exceptions.length} Departures` : 'Full Presence'}
                            </span>
                          </div>
                          
                          {day.exceptions.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {day.exceptions.map((record, idx) => (
                                <div key={`${day.date}-${record.student_id}-${idx}`} className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-lg border border-white/5">
                                  <span className="text-[10px] font-bold text-gray-300">{record.students?.name || record.student_id.slice(0, 8)}</span>
                                  <span className={`text-[8px] font-black uppercase tracking-widest ${record.status === 'absent' ? 'text-red-400' : 'text-blue-400'}`}>
                                    {record.status === 'absent' ? 'ABS' : 'OD'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest italic">100% Institutional Presence Synchronized</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {showDailyRoster ? (
                <div className="space-y-8 animate-smoothFadeIn">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400">
                        <Users size={20} />
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-white tracking-tight">Attendance Roster</h4>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-0.5">Physical headcount verification</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={handleMarkAllDailyPresent}
                        className="px-5 py-3 bg-white/5 text-gray-400 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                      >
                        <CheckCircle size={14} />
                        All Present
                      </button>
                      <button
                        onClick={handleSubmitDailyAttendance}
                        disabled={submittingDaily}
                        className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        <Upload size={14} />
                        {submittingDaily ? 'Syncing...' : 'Sync Protocol'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {dailyStudents.map((student) => (
                      <AttendanceCheckbox
                        key={student.id}
                        studentId={student.id}
                        studentName={student.name}
                        initialStatus={localDailyAttendance[student.id]?.status || ''}
                        initialApprovalStatus={localDailyAttendance[student.id]?.approval_status || ''}
                        onChange={(id, status, approval) => {
                          setLocalDailyAttendance(prev => ({
                            ...prev,
                            [id]: { status, approval_status: approval }
                          }))
                        }}
                      />
                    ))}
                  </div>

                  {/* Suspended and Intern Students Sector */}
                  {(dailySuspendedStudents.length > 0 || dailyInternStudents.length > 0) && (
                    <div className="pt-10 space-y-6">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                        <Shield size={16} className="text-gray-500" />
                        <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mt-1">Special Administrative Category</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {dailySuspendedStudents.map(student => (
                          <div key={student.id} className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center justify-between opacity-70 grayscale hover:grayscale-0 transition-all">
                            <div>
                              <div className="font-bold text-red-100 text-sm tracking-tight">{student.name}</div>
                              <div className="text-[9px] text-red-500/50 font-black tracking-widest">{student.roll_number}</div>
                            </div>
                            <span className="px-3 py-1 bg-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-widest rounded-lg border border-red-500/30">
                              Suspended
                            </span>
                          </div>
                        ))}
                        
                        {dailyInternStudents.map(student => (
                          <div key={student.id} className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-center justify-between opacity-70 grayscale hover:grayscale-0 transition-all">
                            <div>
                              <div className="font-bold text-blue-100 text-sm tracking-tight">{student.name}</div>
                              <div className="text-[9px] text-blue-500/50 font-black tracking-widest">{student.roll_number}</div>
                            </div>
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest rounded-lg border border-blue-500/30">
                              Internship
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-8 border-t border-white/5 flex justify-center">
                    <button
                      onClick={handleSubmitDailyAttendance}
                      disabled={submittingDaily}
                      className="w-full sm:w-auto px-20 py-5 bg-emerald-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 shadow-2xl shadow-emerald-500/30 transition-all disabled:opacity-50"
                    >
                      {submittingDaily ? 'Finalizing Sync...' : 'Finalize Sync Protocol'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center opacity-30 animate-smoothFadeIn">
                  <Activity size={48} className="mx-auto mb-6 text-gray-500" />
                  <h3 className="text-xl font-black text-white tracking-tight uppercase">Ready for Deployment</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Click the class card above to initialize daily attendance roster</p>
                </div>
              )}
            </div>
          )}

            {activeTab === 'shortreport' && (
              <div className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white tracking-tighter">Short Intelligence Report</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">
                      Daily summary for {streams.find(s => s.id === userProfile?.stream_id)?.code || 'Stream'}
                    </p>
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 sm:p-10 space-y-8">
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Academic Stream</label>
                      <div className="w-full px-6 py-4 bg-white/[0.02] border border-white/10 rounded-2xl text-gray-400 font-bold tracking-tight text-sm cursor-not-allowed">
                        {streams.find(s => s.id === userProfile?.stream_id)?.name || 'Stream'}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Target Date</label>
                      <input
                        type="date"
                        value={shortReportDate}
                        onChange={e => setShortReportDate(e.target.value)}
                        className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-emerald-500/50 outline-none transition-all [color-scheme:dark]"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={generateShortReport}
                        disabled={loadingReport}
                        className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {loadingReport ? 'Building Intelligence...' : 'Generate Report'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Select Class Nodes</label>
                    <div className="max-h-64 overflow-y-auto bg-white/[0.02] border border-white/10 rounded-2xl p-4 space-y-2 custom-scrollbar">
                      {classes.length === 0 && (
                        <p className="text-gray-500 text-xs font-bold text-center py-4">No classes found.</p>
                      )}
                      {classes.map(cls => (
                        <label key={cls.id} className="flex items-center gap-4 p-3 hover:bg-white/[0.05] rounded-xl transition-all cursor-pointer group">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded-lg border-white/20 bg-white/5 checked:bg-emerald-500 checked:border-emerald-500 transition-all"
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
                          <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">
                            {cls.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {shortReportData && (
                  <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 sm:p-10 animate-smoothFadeIn">
                    <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-2xl font-black text-white tracking-tight">Stream Report: {shortReportData.stream?.name}</h3>
                        </div>
                        <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Date: {new Date(shortReportData.date).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {shortReportData.classes.map((cls, index) => (
                        <div key={index} className="bg-white/[0.02] rounded-2xl p-6 border border-white/5 hover:bg-white/[0.04] transition-all">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg">
                              📊
                            </div>
                            <h4 className="text-lg font-black text-white tracking-tight">
                              {cls.name} <span className="text-gray-500 text-sm font-bold">| {shortReportData.stream?.code}</span> <span className="text-emerald-400 ml-2">{cls.present}/{cls.total}</span>
                            </h4>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 ml-14">
                            {cls.approved > 0 && (
                              <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                                <span className="block text-[8px] font-black text-emerald-500/70 uppercase tracking-widest">Approved</span>
                                <span className="text-lg font-black text-emerald-400">{String(cls.approved).padStart(2, '0')}</span>
                              </div>
                            )}
                            {cls.unapproved > 0 && (
                              <div className="bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">
                                <span className="block text-[8px] font-black text-red-500/70 uppercase tracking-widest">Unapproved</span>
                                <span className="text-lg font-black text-red-400">{String(cls.unapproved).padStart(2, '0')}</span>
                              </div>
                            )}
                            {cls.onDuty > 0 && (
                              <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-xl">
                                <span className="block text-[8px] font-black text-blue-500/70 uppercase tracking-widest">On Duty</span>
                                <span className="text-lg font-black text-blue-400">{String(cls.onDuty).padStart(2, '0')}</span>
                              </div>
                            )}
                            {cls.suspended > 0 && (
                              <div className="bg-orange-500/10 border border-orange-500/20 px-3 py-2 rounded-xl">
                                <span className="block text-[8px] font-black text-orange-500/70 uppercase tracking-widest">Suspended</span>
                                <span className="text-lg font-black text-orange-400">{String(cls.suspended).padStart(2, '0')}</span>
                              </div>
                            )}
                            {cls.intern > 0 && (
                              <div className="bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
                                <span className="block text-[8px] font-black text-gray-500 uppercase tracking-widest">Intern</span>
                                <span className="text-lg font-black text-white">{String(cls.intern).padStart(2, '0')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Copyable Feed Preview */}
                    <div className="mt-12 space-y-4">
                      <div className="flex items-center gap-2 ml-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                         <h4 className="text-[10px] font-black text-emerald-500/80 uppercase tracking-[0.2em]">Syncable Intelligence Feed</h4>
                      </div>
                      <div className="bg-black/60 border border-emerald-500/20 rounded-[2rem] p-8 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
                        <pre className="text-emerald-400/90 font-mono text-xs leading-relaxed whitespace-pre-wrap select-all">
                          {(() => {
                            const d = new Date(shortReportData.date)
                            const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`
                            const streamCode = shortReportData.stream?.code
                            
                            let text = `Department: ${streamCode}\n☀Date: ${dateStr}\n\n`
                            
                            if (shortReportData.classes && shortReportData.classes.length > 0) {
                              shortReportData.classes.forEach(cls => {
                                text += `➕${cls.name}: ${streamCode} ${cls.present}/${cls.total}\n`
                                if (cls.approved > 0) text += `📍Approved: ${String(cls.approved).padStart(2, '0')}\n`
                                if (cls.unapproved > 0) text += `📍Unapproved: ${String(cls.unapproved).padStart(2, '0')}\n`
                                if (cls.onDuty > 0) text += `📍OD: ${String(cls.onDuty).padStart(2, '0')}\n`
                                if (cls.suspended > 0) text += `📍Suspend: ${String(cls.suspended).padStart(2, '0')}\n`
                                if (cls.intern > 0) text += `📍Intern: ${String(cls.intern).padStart(2, '0')}\n`
                                text += '\n'
                              })
                            } else {
                              text += `[No active class nodes selected for synchronization]\n\n`
                            }
                            
                            text += `Reported by: \nHOD /${streamCode} : "${userProfile?.name}"`
                            return text
                          })()}
                        </pre>
                        
                        <div className="mt-8 flex justify-end relative z-10">
                          <button
                            onClick={() => {
                              const d = new Date(shortReportData.date)
                              const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`
                              const streamCode = shortReportData.stream?.code
                              
                              let text = `Department: ${streamCode}\n☀Date: ${dateStr}\n\n`
                              shortReportData.classes.forEach(cls => {
                                text += `➕${cls.name}: ${streamCode} ${cls.present}/${cls.total}\n`
                                if (cls.approved > 0) text += `📍Approved: ${String(cls.approved).padStart(2, '0')}\n`
                                if (cls.unapproved > 0) text += `📍Unapproved: ${String(cls.unapproved).padStart(2, '0')}\n`
                                if (cls.onDuty > 0) text += `📍OD: ${String(cls.onDuty).padStart(2, '0')}\n`
                                if (cls.suspended > 0) text += `📍Suspend: ${String(cls.suspended).padStart(2, '0')}\n`
                                if (cls.intern > 0) text += `📍Intern: ${String(cls.intern).padStart(2, '0')}\n`
                                text += '\n'
                              })
                              text += `Reported by: \nHOD /${streamCode} : "${userProfile?.name}"`

                              navigator.clipboard.writeText(text)
                              setToast({ message: 'Synchronize protocol cached to clipboard!', type: 'success' })
                            }}
                            className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/20 transition-all flex items-center gap-3"
                          >
                            <FileText size={16} />
                            Cache Digital Feed
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!shortReportData && !loadingReport && (
                  <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-12 text-center">
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Select a date and classes to initialize report generation</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'advisorReport' && (
              <div className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white tracking-tighter">Advisor Intelligence Feed</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">
                      Daily summary for {classes.find(c => c.id === userProfile?.advisor_class_id)?.name}
                    </p>
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 sm:p-10 space-y-8">
                  <div className="grid md:grid-cols-3 gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Target Date</label>
                      <input
                        type="date"
                        value={attendanceDate}
                        onChange={e => setAttendanceDate(e.target.value)}
                        className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-emerald-500/50 outline-none transition-all [color-scheme:dark]"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={generateAdvisorReport}
                        disabled={loadingAdvisorReport}
                        className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      >
                        {loadingAdvisorReport ? 'Generating Feed...' : 'Generate Class Feed'}
                      </button>
                    </div>
                  </div>
                </div>

                {advisorReportData && (
                  <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 sm:p-10 animate-smoothFadeIn">
                    <div className="mt-4 space-y-4">
                      <div className="flex items-center gap-2 ml-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                         <h4 className="text-[10px] font-black text-emerald-500/80 uppercase tracking-[0.2em]">Synchronized Institutional Feed</h4>
                      </div>
                      <div className="bg-black/60 border border-emerald-500/20 rounded-[2rem] p-8 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
                        <pre className="text-emerald-400/90 font-mono text-sm leading-relaxed whitespace-pre-wrap select-all">
                          {(() => {
                            const d = new Date(advisorReportData.date)
                            const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear())}`
                            
                            let text = `📕Date: ${dateStr}\n\n`
                            text += `Year:${advisorReportData.className}\n`
                            text += `📍Total: ${String(advisorReportData.total).padStart(2, '0')}\n`
                            text += `📍Present: ${String(advisorReportData.present).padStart(2, '0')}\n`
                            text += `📍Absent: ${String(advisorReportData.absent).padStart(2, '0')}\n`
                            text += `📍OD: ${String(advisorReportData.od).padStart(2, '0')}\n`
                            text += `📍Intern: ${String(advisorReportData.internCount).padStart(2, '0')}\n\n`
                            
                            text += `✅ Absentees Name:\n\n`
                            text += `📌 Unapproved leave- \n\n`
                            if (advisorReportData.unapproved.length > 0) {
                              advisorReportData.unapproved.forEach(sid => {
                                text += `      ${sid.name} ${sid.roll.slice(-2)}\n`
                              })
                            } else {
                              text += `      None\n`
                            }
                            text += `\n\n`
                            
                            text += `📌 Approved leave -\n`
                            if (advisorReportData.approved.length > 0) {
                              advisorReportData.approved.forEach(sid => {
                                text += `     ${sid.name} ${sid.roll.slice(-2)}\n`
                              })
                            } else {
                              text += `     None\n`
                            }
                            text += `\n\n`
                            
                            text += `📌On duty- ${advisorReportData.onDuty.length > 0 ? advisorReportData.onDuty.map(s => s.name).join(', ') : 'Nil'}\n\n`
                            
                            text += `📌 Intern-   \n`
                            if (advisorReportData.interns.length > 0) {
                              advisorReportData.interns.forEach((sid, idx) => {
                                text += `${idx + 1}. ${sid.name}- ${sid.roll.slice(-3)}\n`
                              })
                            } else {
                              text += `Nil\n`
                            }
                            
                            text += `\nClass Advisor: \n"${userProfile?.name}"`
                            return text
                          })()}
                        </pre>
                        
                        <div className="mt-8 flex justify-end relative z-10">
                          <button
                            onClick={() => {
                              const d = new Date(advisorReportData.date)
                              const dateStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear())}`
                              
                              let text = `📕Date: ${dateStr}\n\n`
                              text += `Year:${advisorReportData.className}\n`
                              text += `📍Total: ${String(advisorReportData.total).padStart(2, '0')}\n`
                              text += `📍Present: ${String(advisorReportData.present).padStart(2, '0')}\n`
                              text += `📍Absent: ${String(advisorReportData.absent).padStart(2, '0')}\n`
                              text += `📍OD: ${String(advisorReportData.od).padStart(2, '0')}\n`
                              text += `📍Intern: ${String(advisorReportData.internCount).padStart(2, '0')}\n\n`
                              
                              text += `✅ Absentees Name:\n\n`
                              text += `📌 Unapproved leave- \n\n`
                              if (advisorReportData.unapproved.length > 0) {
                                advisorReportData.unapproved.forEach(sid => {
                                  text += `      ${sid.name} ${sid.roll.slice(-2)}\n`
                                })
                              } else {
                                text += `      None\n`
                              }
                              text += `\n\n`
                              
                              text += `📌 Approved leave -\n`
                              if (advisorReportData.approved.length > 0) {
                                advisorReportData.approved.forEach(sid => {
                                  text += `     ${sid.name} ${sid.roll.slice(-2)}\n`
                                })
                              } else {
                                text += `     None\n`
                              }
                              text += `\n\n`
                              
                              text += `📌On duty- ${advisorReportData.onDuty.length > 0 ? advisorReportData.onDuty.map(s => s.name).join(', ') : 'Nil'}\n\n`
                              
                              text += `📌 Intern-   \n`
                              if (advisorReportData.interns.length > 0) {
                                advisorReportData.interns.forEach((sid, idx) => {
                                  text += `${idx + 1}. ${sid.name}- ${sid.roll.slice(-3)}\n`
                                })
                              } else {
                                text += `Nil\n`
                              }
                              
                              text += `\nClass Advisor: \n"${userProfile?.name}"`

                              navigator.clipboard.writeText(text)
                              setToast({ message: 'Class protocol cached to clipboard!', type: 'success' })
                            }}
                            className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/20 transition-all flex items-center gap-3"
                          >
                            <FileText size={16} />
                            Cache Class Feed
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'leaveRequest' && (
              <div className="space-y-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white tracking-tighter">Student Leave Protocol</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">Submit & Manage Student Leave Requests</p>
                  </div>
                </div>
                
                {/* HOD Approvals Section */}
                {userProfile?.is_hod && (
                  <div className="bg-gradient-to-br from-emerald-900/20 to-black border border-emerald-500/20 rounded-[2.5rem] p-8 sm:p-10 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mr-20 -mt-20"></div>
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                         <Shield size={24} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white tracking-tight">HOD Approval Queue</h3>
                        <p className="text-emerald-500/60 font-bold uppercase tracking-widest text-[10px]">Pending requests for {currentStream?.name}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                      {hodRequests.length === 0 ? (
                         <div className="text-center py-8 bg-black/20 rounded-2xl border border-white/5">
                           <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">No pending requests</p>
                         </div>
                      ) : (
                         hodRequests.map(req => (
                           <div key={req.id} className="bg-black/40 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                             <div>
                               <h4 className="text-white font-bold text-lg">{req.student_name} <span className="text-gray-500 text-sm">({req.register_number})</span></h4>
                               <p className="text-gray-400 text-xs mt-1">{req.reason}</p>
                               {req.letter_url && (
                                 <a href={req.letter_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 text-blue-400 hover:text-blue-300 text-[10px] font-black uppercase tracking-widest">
                                   <FileText size={12} /> View Letter
                                 </a>
                               )}
                               <div className="flex gap-4 mt-3">
                                 <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                   Att: {req.attendance_percentage}%
                                 </div>
                                  <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                   Sec: {req.section}
                                 </div>
                               </div>
                             </div>
                             <div className="flex gap-3">
                               <button 
                                 onClick={() => handleHodAction(req.id, 'approve')}
                                 className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center gap-2"
                               >
                                 <CheckCircle size={14} /> Approve
                               </button>
                               <button 
                                 onClick={() => handleHodAction(req.id, 'reject')}
                                 className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center gap-2"
                               >
                                 <XCircle size={14} /> Reject
                               </button>
                             </div>
                           </div>
                         ))
                      )}
                    </div>
                  </div>
                )}

                {/* Leave Request Form */}
                <div className="grid md:grid-cols-2 gap-8">
                   {/* Form Section */}
                   <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 sm:p-10 space-y-8">
                     <h3 className="text-2xl font-black text-white tracking-tight mb-6">New Request</h3>
                     <form onSubmit={handleLeaveSubmit} className="space-y-5">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Student Name</label>
                         <input type="text" value={leaveFormData.name} onChange={e => setLeaveFormData({...leaveFormData, name: e.target.value})} className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:border-white/30" required placeholder="e.g. John Doe" />
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Register No.</label>
                            <input type="text" value={leaveFormData.regNo} onChange={e => setLeaveFormData({...leaveFormData, regNo: e.target.value})} className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:border-white/30" required placeholder="e.g. 9100..." />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Attendance %</label>
                            <input type="number" value={leaveFormData.attendancePct} onChange={e => setLeaveFormData({...leaveFormData, attendancePct: e.target.value})} className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:border-white/30" placeholder="e.g. 85" />
                          </div>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Department</label>
                            <select value={leaveFormData.departmentId} onChange={e => setLeaveFormData({...leaveFormData, departmentId: e.target.value})} className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:border-white/30 appearance-none" required>
                              <option value="">Select Dept</option>
                              {streams.map(s => <option key={s.id} value={s.id}>{s.code}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Section</label>
                            <input type="text" value={leaveFormData.section} onChange={e => setLeaveFormData({...leaveFormData, section: e.target.value})} className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:border-white/30" required placeholder="e.g. A" />
                          </div>
                       </div>

                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Reason</label>
                         <textarea value={leaveFormData.reason} onChange={e => setLeaveFormData({...leaveFormData, reason: e.target.value})} className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold text-sm outline-none focus:border-white/30 h-24 resize-none" required placeholder="Detailed reason..." />
                       </div>

                       <div className="space-y-2">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Upload Letter</label>
                         <div className="relative">
                            <input type="file" id="letterUpload" onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                  setFileToUpload(e.target.files[0]) 
                                }
                            }} className="hidden" accept="image/*,.pdf" />
                            <label htmlFor="letterUpload" className="w-full px-6 py-4 bg-white/[0.05] border border-dashed border-white/20 rounded-2xl flex items-center justify-center gap-3 cursor-pointer hover:bg-white/10 transition-all text-gray-400 hover:text-white">
                              <Upload size={18} />
                              <span className="font-bold text-xs uppercase tracking-widest">{fileToUpload ? fileToUpload.name : 'Click to Upload Document'}</span>
                            </label>
                         </div>
                       </div>

                       <button type="submit" disabled={loadingLeave} className="w-full py-5 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.01] active:scale-95 transition-all shadow-xl disabled:opacity-50">
                         {loadingLeave ? 'Submitting...' : 'Submit Request'}
                       </button>
                     </form>
                   </div>

                   {/* My Requests List */}
                   <div className="space-y-6">
                     <h3 className="text-2xl font-black text-white tracking-tight pl-2">My Request Log</h3>
                     <div className="space-y-4">
                       {leaveRequests.length === 0 ? (
                         <div className="p-8 text-center text-gray-500 font-bold uppercase text-xs tracking-widest bg-white/[0.02] border border-white/5 rounded-2xl">
                           No recent requests
                         </div>
                       ) : (
                         leaveRequests.map(req => (
                           <div key={req.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] transition-all">
                             <div className="flex justify-between items-start mb-2">
                               <h4 className="text-white font-bold">{req.student_name}</h4>
                               <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                                 req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                 req.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                 req.status === 'pending_admin' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                               }`}>
                                 {req.status?.replace('_', ' ')}
                               </span>
                             </div>
                             <p className="text-gray-500 text-xs mb-3">{req.department_id} - Sec {req.section} • {new Date(req.created_at).toLocaleDateString()}</p>
                             {req.letter_url && (
                                <a href={req.letter_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                                  <FileText size={10} /> Document Attached
                                </a>
                             )}
                           </div>
                         ))
                       )}
                     </div>
                   </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
               <div className="space-y-10">
                 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                   <div className="space-y-2">
                     <h2 className="text-4xl font-black text-white tracking-tighter">Attendance Intelligence</h2>
                     <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">Export detailed session archives</p>
                   </div>
                 </div>
 
                 <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 sm:p-10 space-y-8">
                   <div className="grid md:grid-cols-3 gap-6">
                     <div className="space-y-4">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Select Target Class</label>
                       <select 
                         value={selectedClass} 
                         onChange={(e) => {
                           setSelectedClass(e.target.value)
                           setFoundReports([])
                         }} 
                         className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-emerald-500/50 outline-none transition-all appearance-none cursor-pointer"
                       >
                         <option value="">Select Class Node</option>
                         {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
                       </select>
                     </div>
                     <div className="space-y-4">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Subject Code</label>
                       <input 
                         type="text"
                         value={reportSubjectCode}
                         onChange={(e) => {
                           setReportSubjectCode(e.target.value.toUpperCase())
                           setFoundReports([])
                         }}
                         placeholder="e.g. CS301"
                         className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-emerald-500/50 outline-none transition-all"
                       />
                     </div>
                     <div className="flex items-end">
                       <button 
                         onClick={handleSearchReports} 
                         disabled={!selectedClass || !reportSubjectCode || searchingReports}
                         className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl disabled:opacity-50"
                       >
                         {searchingReports ? 'Scanning...' : 'Search Sessions'}
                       </button>
                     </div>
                   </div>
                 </div>
 
                 {foundReports.length > 0 && (
                   <div className="space-y-6 animate-smoothFadeIn">
                     <div className="flex items-center justify-between px-2">
                       <h3 className="text-xl font-black text-white uppercase tracking-tight">Available Archive Nodes ({foundReports.length})</h3>
                       <button 
                         onClick={() => handleDownloadReport(foundReports)}
                         className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center gap-2"
                       >
                         <FileText size={14} /> Download Overall Report
                       </button>
                     </div>
 
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {foundReports.map((report) => (
                         <div key={report.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 hover:border-white/20 transition-all group">
                           <div className="flex justify-between items-start mb-4">
                             <div>
                               <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">{new Date(report.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                               <h4 className="text-white font-bold text-sm">Period {report.period_number} Sessions</h4>
                             </div>
                             <button 
                               onClick={() => handleDownloadReport([report])}
                               className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                               title="Download this node"
                             >
                               <Upload size={14} className="rotate-180" />
                             </button>
                           </div>
                           <div className="flex items-center justify-between py-3 border-t border-white/5">
                             <div className="text-center flex-1">
                               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Present</p>
                               <p className="text-emerald-400 font-black">{report.present_count}</p>
                             </div>
                             <div className="w-px h-6 bg-white/5"></div>
                             <div className="text-center flex-1">
                               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Absent</p>
                               <p className="text-red-400 font-black">{report.absent_count}</p>
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
 
                 <div className="bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[2rem] p-8 text-center text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                   {foundReports.length === 0 && !searchingReports ? (
                     <p>Select academic parameters to initialize archive retrieval</p>
                   ) : searchingReports ? (
                     <p className="animate-pulse">Retrieving encrypted archives from secure storage...</p>
                   ) : null}
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
