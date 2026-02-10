import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useStudents } from '../hooks/useStudents'
import { useClasses } from '../hooks/useClasses'
import { useSessions } from '../hooks/useSessions'
import { useAttendance } from '../hooks/useAttendance'
import { useStudentAttendance } from '../hooks/useStudentAttendance'
import { useUsers } from '../hooks/useUsers'
import { supabase } from '../services/supabase'
import Navbar from '../components/Navbar'
import AttendanceCheckbox from '../components/AttendanceCheckbox'
import InteractiveTimetable from '../components/InteractiveTimetable'
import Toast from '../components/Toast'
import { generatePeriodAttendanceReport } from '../utils/pdfGenerator'
import { Zap, Shield, Users, Clock, FileText, Activity, AlertCircle, Upload, CheckCircle, XCircle } from 'lucide-react'

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
  const [shortReportDate, setShortReportDate] = useState(new Date().toISOString().split('T')[0])
  const [shortReportData, setShortReportData] = useState(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [shortReportSelectedClasses, setShortReportSelectedClasses] = useState([])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const currentStream = streams.find(s => s.id === userProfile?.stream_id)

  useEffect(() => {
    if (activeTab === 'leaveRequest') {
      fetchMyLeaveRequests()
      if (userProfile?.is_hod) {
        fetchHodRequests()
      }
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

        // Aggregate attendance status per student for the entire day
        const studentDailyStatus = {}
        
        attendanceRecords?.forEach(record => {
          const sid = record.student_id
          const currentStatus = record.status
          const prevStatus = studentDailyStatus[sid]?.status
          
          // Priority: present > on_duty > absent
          if (!prevStatus || 
              currentStatus === 'present' || 
              (currentStatus === 'on_duty' && prevStatus === 'absent')) {
            studentDailyStatus[sid] = {
              status: currentStatus,
              approval_status: record.approval_status
            }
          }
        })

        let presentCount = 0
        let approvedAbsentCount = 0
        let unapprovedAbsentCount = 0
        let onDutyCount = 0

        Object.values(studentDailyStatus).forEach(data => {
          if (data.status === 'present') {
            presentCount++
          } else if (data.status === 'absent') {
            if (data.approval_status === 'approved') {
              approvedAbsentCount++
            } else {
              unapprovedAbsentCount++
            }
          } else if (data.status === 'on_duty') {
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
  const myAttendanceRecords = attendance.filter(record => record.user_id === user?.id)
  const pcClasses = classes.filter(cls => cls.stream_id === userProfile?.stream_id)

  const tabs = [
    { id: 'timetable', name: 'Timetable' },
    ...(userProfile?.is_pc || userProfile?.is_hod || userProfile?.is_class_advisor ? [{ id: 'shortreport', name: 'Short Report' }] : []),
    { id: 'leaveRequest', name: 'Leave Request' },
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
        <div className="relative mb-16 py-12 overflow-hidden rounded-[3rem] bg-[#020617] border border-white/5 shadow-2xl animate-smoothFadeIn px-10 group">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] -mr-60 -mt-60 animate-pulse transition-colors duration-1000 group-hover:bg-emerald-500/20"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -ml-40 -mb-40"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
            <div className="space-y-6 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Faculty Access Node</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.9]">
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
                {userProfile?.is_pc && (
                  <span className="px-4 py-2 rounded-xl bg-purple-500/10 text-purple-400 text-[10px] font-black uppercase tracking-widest border border-purple-500/20">
                    PROGRAM COORDINATOR
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
          <div className="mb-16 bg-gradient-to-r from-blue-600/10 to-emerald-600/10 border border-blue-500/20 rounded-[2.5rem] p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-blue-500/20 transition-all duration-700"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 bg-blue-500/20 rounded-3xl flex items-center justify-center text-3xl text-blue-400 border border-blue-500/20 shadow-2xl">
                  <Clock size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight">Daily Protocol</h3>
                  <p className="text-blue-200/60 text-sm font-bold uppercase tracking-widest mt-2">Ensure synchronization for <span className="text-white">{classes.find(c => c.id === userProfile.advisor_class_id)?.name}</span></p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedClassForTimetable(userProfile.advisor_class_id)
                  setActiveTab('timetable')
                }}
                className="px-8 py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
              >
                Launch Protocol
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16 animate-slideUp" style={{animationDelay: '0.1s'}}>
           {tabs.map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-500 ${
                 activeTab === tab.id 
                   ? 'bg-white text-black shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] scale-110' 
                   : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white'
               }`}
             >
               {tab.name}
             </button>
           ))}
        </div>

        <div className="animate-slideUp" style={{animationDelay: '0.2s'}}>

          <div className="p-3 sm:p-6">
          {activeTab === 'timetable' && (
             <div className="space-y-10">
               <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                 <div className="space-y-2">
                   <h2 className="text-4xl font-black text-white tracking-tighter">Interactive Timetable</h2>
                   <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">Manage sessions & mark attendance</p>
                 </div>
               </div>

               <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 sm:p-10 space-y-8">
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
                      {pcClasses.length === 0 && (
                        <p className="text-gray-500 text-xs font-bold text-center py-4">No classes found for your stream.</p>
                      )}
                      {pcClasses.map(cls => (
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
                          {userProfile?.is_pc && (
                            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-[10px] font-black uppercase tracking-widest border border-purple-500/20">
                              PC Authorized
                            </span>
                          )}
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

                    <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-6">
                      <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                        Reported by: <span className="text-white">Program Coordinator, {shortReportData.stream?.code} - {userProfile?.name}</span>
                      </p>
                      
                      <button
                        onClick={() => {
                          const reportText = `☀️Stream: ${shortReportData.stream?.name}\n☀️Date: ${new Date(shortReportData.date).toLocaleDateString('en-GB')}\n\n${shortReportData.classes.map(cls => 
                            `➕${cls.name}: ${shortReportData.stream?.code}  ${cls.present}/${cls.total}\n${cls.approved > 0 ? `📍Approved: ${String(cls.approved).padStart(2, '0')}\n` : ''}${cls.unapproved > 0 ? `📍Unapproved: ${String(cls.unapproved).padStart(2, '0')}\n` : ''}${cls.onDuty > 0 ? `📍OD: ${String(cls.onDuty).padStart(2, '0')}\n` : ''}${cls.suspended > 0 ? `📍Suspend: ${String(cls.suspended).padStart(2, '0')}\n` : ''}${cls.intern > 0 ? `📍Intern: ${String(cls.intern).padStart(2, '0')}\n` : ''}`
                          ).join('\n')}\n\nReported by: Program Coordinator, ${shortReportData.stream?.code} - ${userProfile?.name}`

                          navigator.clipboard.writeText(reportText)
                          setToast({ message: 'Report copied to clipboard!', type: 'success' })
                        }}
                        className="px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 transition-all font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20"
                      >
                        Copy to Clipboard
                      </button>
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
                   <div className="grid md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Select Target Class</label>
                       <select 
                         value={selectedClass} 
                         onChange={(e) => setSelectedClass(e.target.value)} 
                         className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-emerald-500/50 outline-none transition-all appearance-none cursor-pointer"
                       >
                         <option value="">Select Class Node</option>
                         {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
                       </select>
                     </div>
                     <div className="flex items-end">
                       <button 
                         onClick={handleDownloadReport} 
                         disabled={!selectedClass}
                         className="w-full py-4 bg-blue-600/90 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         Download Archive PDF
                       </button>
                     </div>
                   </div>
                 </div>

                 <div className="bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[2rem] p-8 text-center">
                   <p className="text-gray-500 text-xs font-bold uppercase tracking-widest gap-2 flex items-center justify-center">
                     <AlertCircle size={14} className="text-blue-400" />
                     <span className="text-white">Note:</span> Access is limited to your assigned academic nodes. For system-wide intelligence, contact administration.
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
