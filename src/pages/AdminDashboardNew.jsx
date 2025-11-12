import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useStudents } from '../hooks/useStudents'
import { useDepartments } from '../hooks/useDepartments'
import { useClasses } from '../hooks/useClasses'
import { useSessions } from '../hooks/useSessions'
import { useStudentAttendance } from '../hooks/useStudentAttendance'
import { useAttendance } from '../hooks/useAttendance'
import { useTimetable } from '../hooks/useTimetable'
import { supabase } from '../services/supabase'
import Navbar from '../components/Navbar'
import BulkStudentImport from '../components/BulkStudentImport'
import TimetableImageUpload from '../components/TimetableImageUpload'
import InteractiveTimetable from '../components/InteractiveTimetable'
import DepartmentOverview from '../components/DepartmentOverview'
import Toast from '../components/Toast'
import { generateAttendanceReport, generatePeriodAttendanceReport } from '../utils/pdfGenerator'

// Animated Hero Text Component (inspired by Dario.io)
const AnimatedHeroText = ({ words, staticText }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [words.length])
  
  return (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
      <span className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
        {staticText}
      </span>
      <div className="relative h-10 sm:h-14 md:h-16 overflow-hidden">
        <div 
          className="absolute transition-transform duration-500 ease-in-out"
          style={{ transform: `translateY(-${currentIndex * 100}%)` }}
        >
          {words.map((word, index) => (
            <div 
              key={index}
              className="h-10 sm:h-14 md:h-16 flex items-center"
            >
              <span className="text-2xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400 bg-clip-text text-transparent animate-gradient">
                {word}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Interactive Attendance Trend Chart Component
const AttendanceTrendChart = ({ attendanceData, totalStudents }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const chartRef = useRef(null)
  
  // Calculate attendance for last 7 days from real data
  const getLast7Days = () => {
    const days = []
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Calculate attendance percentage for this day
      const dayAttendance = attendanceData.filter(a => a.date === dateStr)
      const presentCount = dayAttendance.filter(a => a.status === 'present').length
      const attendancePercent = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0
      
      days.push({
        day: dayNames[date.getDay()],
        attendance: attendancePercent,
        date: `${monthNames[date.getMonth()]} ${date.getDate()}`
      })
    }
    return days
  }
  
  const chartData = getLast7Days()
  
  // Calculate positions for data points
  const maxAttendance = 100
  const minAttendance = 70
  const range = maxAttendance - minAttendance
  
  const getYPosition = (attendance) => {
    const normalized = (attendance - minAttendance) / range
    return 180 - (normalized * 160) // Invert Y axis
  }
  
  const dataPoints = chartData.map((data, index) => ({
    x: (index * 60) + 20,
    y: getYPosition(data.attendance),
    ...data
  }))
  
  const handleMouseMove = (e, point, index) => {
    if (chartRef.current) {
      const rect = chartRef.current.getBoundingClientRect()
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
    setHoveredPoint(index)
  }
  
  const handleMouseLeave = () => {
    setHoveredPoint(null)
  }
  
  // Create path for the line
  const linePath = dataPoints.map((point, i) => 
    `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
  ).join(' ')
  
  // Create path for the area
  const areaPath = `${linePath} L ${dataPoints[dataPoints.length - 1].x} 200 L ${dataPoints[0].x} 200 Z`
  
  return (
    <div className="bg-gray-900 border border-white/20 rounded-xl p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-bold text-white mb-1 sm:mb-2">Daily Attendance Trend</h3>
      <p className="text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">Last 7 days</p>
      
      <div className="relative">
        <div ref={chartRef} className="relative h-48 sm:h-56 md:h-64">
          <svg className="w-full h-full" viewBox="0 0 420 200" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#34d399" stopOpacity="1"/>
              </linearGradient>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.05"/>
              </linearGradient>
            </defs>
            
            {/* Grid lines */}
            <line x1="0" y1="50" x2="420" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            <line x1="0" y1="100" x2="420" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            <line x1="0" y1="150" x2="420" y2="150" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            
            {/* Area under the line */}
            <path d={areaPath} fill="url(#areaGradient)"/>
            
            {/* Main trend line */}
            <path 
              d={linePath} 
              stroke="url(#lineGradient)" 
              strokeWidth="3" 
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Interactive data points */}
            {dataPoints.map((point, index) => (
              <g key={index}>
                {/* Invisible larger circle for easier hover */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="12"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={(e) => handleMouseMove(e, point, index)}
                  onMouseMove={(e) => handleMouseMove(e, point, index)}
                  onMouseLeave={handleMouseLeave}
                />
                {/* Visible circle */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={hoveredPoint === index ? "6" : "4"}
                  fill="#10b981"
                  className={`transition-all duration-200 pointer-events-none ${
                    index === dataPoints.length - 1 ? 'animate-pulse' : ''
                  }`}
                  style={{
                    filter: hoveredPoint === index ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))' : 'none'
                  }}
                />
              </g>
            ))}
          </svg>
          
          {/* Tooltip */}
          {hoveredPoint !== null && (
            <div 
              className="absolute bg-gray-800 border border-white/30 rounded-lg px-3 py-2 pointer-events-none z-10 shadow-xl"
              style={{
                left: `${tooltipPos.x + 10}px`,
                top: `${tooltipPos.y - 60}px`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="text-xs font-bold text-white mb-1">{dataPoints[hoveredPoint].date}</div>
              <div className="text-sm font-bold text-green-400">{dataPoints[hoveredPoint].attendance}% Present</div>
              <div className="text-xs text-gray-400">{dataPoints[hoveredPoint].day}</div>
            </div>
          )}
        </div>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2 px-2 text-xs text-gray-500">
          {chartData.map((data, index) => (
            <span key={index} className="text-center">{data.day}</span>
          ))}
        </div>
      </div>
      
      {/* Trend indicator - moved below chart */}
      <div className="mt-4 pt-4 border-t border-white/10">
        {(() => {
          // Calculate trend: compare last 3 days avg vs previous 4 days avg
          const recentDays = chartData.slice(-3)
          const previousDays = chartData.slice(0, 4)
          
          const recentAvg = recentDays.reduce((sum, d) => sum + d.attendance, 0) / recentDays.length
          const previousAvg = previousDays.reduce((sum, d) => sum + d.attendance, 0) / previousDays.length
          
          const trendPercent = previousAvg > 0 
            ? ((recentAvg - previousAvg) / previousAvg * 100).toFixed(1)
            : 0
          
          const isPositive = trendPercent >= 0
          
          return (
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <div className={`flex items-center gap-1 ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isPositive ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  )}
                </svg>
                <span className="text-sm font-bold">
                  {isPositive ? '+' : ''}{trendPercent}%
                </span>
              </div>
              <span className="text-sm text-gray-400 whitespace-nowrap">from last week</span>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

const AdminDashboardNew = () => {
  const { userProfile } = useAuth()
  const { students, addStudent, deleteStudent, refetch: refetchStudents } = useStudents()
  const { departments, addDepartment, deleteDepartment } = useDepartments()
  const { classes, addClass, deleteClass } = useClasses()
  const { sessions, addSession, deleteSession } = useSessions()
  const { attendance: studentAttendance } = useStudentAttendance()
  const { attendance: staffAttendance } = useAttendance()
  const { timetable, addTimetableEntry, deleteTimetableEntry } = useTimetable()

  const [activeTab, setActiveTab] = useState('overview')
  const [showForm, setShowForm] = useState({ dept: false, class: false, session: false, student: false, intern: false, suspended: false, timetable: false })
  const [periodAttendanceCount, setPeriodAttendanceCount] = useState(0)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [toast, setToast] = useState(null)

  // Fetch period attendance count
  const fetchPeriodAttendanceCount = async () => {
    try {
      // Wait for userProfile to load
      if (!userProfile?.department_id) {
        console.log('⏳ Waiting for user profile to load...')
        setPeriodAttendanceCount(0)
        return
      }
      
      console.log('📊 Fetching period attendance count for department:', userProfile.department_id)
      
      const { count, error } = await supabase
        .from('period_attendance')
        .select('*, classes!inner(department_id)', { count: 'exact', head: true })
        .eq('is_marked', true)
        .eq('classes.department_id', userProfile.department_id)
      
      if (error) {
        console.error('Error fetching count:', error)
        throw error
      }
      
      console.log('✅ Period attendance count:', count)
      setPeriodAttendanceCount(count || 0)
    } catch (err) {
      console.error('Error fetching period attendance count:', err)
      setPeriodAttendanceCount(0)
    }
  }

  // Fetch count when userProfile loads
  useEffect(() => {
    if (userProfile?.department_id) {
      fetchPeriodAttendanceCount()
    }
  }, [userProfile])
  
  const [forms, setForms] = useState({
    dept: { name: '', code: '', description: '' },
    class: { name: '', departmentId: '' },
    student: { rollNumber: '', name: '', email: '', phone: '', departmentId: '', classId: '', dateOfBirth: '' },
    intern: { rollNumber: '', name: '', email: '', phone: '', departmentId: '', classId: '', dateOfBirth: '' },
    suspended: { rollNumber: '', name: '', email: '', phone: '', departmentId: '', classId: '', dateOfBirth: '' },
    timetable: { classId: '', dayOfWeek: '1', periodNumber: '1', subjectCode: '', subjectName: '', facultyName: '', facultyCode: '', isLab: false }
  })

  const handleSubmit = async (type, e) => {
    e.preventDefault()
    let result
    
    switch(type) {
      case 'dept':
        result = await addDepartment(forms.dept.name, forms.dept.code, forms.dept.description)
        break
      case 'class':
        result = await addClass(forms.class.name, forms.class.departmentId)
        break
      case 'student':
        result = await addStudent({
          roll_number: forms.student.rollNumber,
          name: forms.student.name,
          email: forms.student.email || null,
          phone: forms.student.phone || null,
          department_id: forms.student.departmentId,
          class_id: forms.student.classId,
          date_of_birth: forms.student.dateOfBirth || null,
          status: 'active'
        })
        break
      case 'intern':
        // Check if student with this roll number already exists
        const existingInternStudent = students.find(s => s.roll_number === forms.intern.rollNumber)
        
        if (existingInternStudent) {
          // Update existing student's status to intern
          const { error: updateError } = await supabase
            .from('students')
            .update({ status: 'intern' })
            .eq('id', existingInternStudent.id)
          
          if (updateError) {
            result = { success: false, error: updateError.message }
          } else {
            await refetchStudents()
            result = { success: true }
          }
        } else {
          // Add new intern student
          result = await addStudent({
            roll_number: forms.intern.rollNumber,
            name: forms.intern.name,
            email: forms.intern.email || null,
            phone: forms.intern.phone || null,
            department_id: forms.intern.departmentId,
            class_id: forms.intern.classId,
            date_of_birth: forms.intern.dateOfBirth || null,
            status: 'intern'
          })
        }
        break
      case 'suspended':
        // Check if student with this roll number already exists
        const existingStudent = students.find(s => s.roll_number === forms.suspended.rollNumber)
        
        if (existingStudent) {
          // Update existing student's status to suspended
          const { error: updateError } = await supabase
            .from('students')
            .update({ status: 'suspended' })
            .eq('id', existingStudent.id)
          
          if (updateError) {
            result = { success: false, error: updateError.message }
          } else {
            await refetchStudents()
            result = { success: true }
          }
        } else {
          // Add new suspended student
          result = await addStudent({
            roll_number: forms.suspended.rollNumber,
            name: forms.suspended.name,
            email: forms.suspended.email || null,
            phone: forms.suspended.phone || null,
            department_id: forms.suspended.departmentId,
            class_id: forms.suspended.classId,
            date_of_birth: forms.suspended.dateOfBirth || null,
            status: 'suspended'
          })
        }
        break
      case 'timetable':
        result = await addTimetableEntry({
          classId: forms.timetable.classId,
          dayOfWeek: parseInt(forms.timetable.dayOfWeek),
          periodNumber: parseInt(forms.timetable.periodNumber),
          subjectCode: forms.timetable.subjectCode,
          subjectName: forms.timetable.subjectName,
          facultyName: forms.timetable.facultyName,
          facultyCode: forms.timetable.facultyCode || '',
          isLab: forms.timetable.isLab
        })
        break
    }
    
    if (result.success) {
      setShowForm({ ...showForm, [type]: false })
      setForms({ ...forms, [type]: type === 'dept' ? { name: '', code: '', description: '' } : 
                type === 'class' ? { name: '', departmentId: '' } :
                type === 'timetable' ? { classId: '', dayOfWeek: '1', periodNumber: '1', subjectCode: '', subjectName: '', facultyName: '', facultyCode: '', isLab: false } :
                { rollNumber: '', name: '', email: '', phone: '', departmentId: '', classId: '', dateOfBirth: '' }
      })
      setToast({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} added successfully!`, type: 'success' })
    } else {
      setToast({ message: 'Error: ' + result.error, type: 'error' })
    }
  }

  const [selectedClassForTimetable, setSelectedClassForTimetable] = useState('')
  const [timetableDate, setTimetableDate] = useState(new Date().toISOString().split('T')[0])
  
  // Short Report states
  const [shortReportDept, setShortReportDept] = useState('')
  const [shortReportDate, setShortReportDate] = useState(new Date().toISOString().split('T')[0])
  const [shortReportData, setShortReportData] = useState(null)
  const [loadingReport, setLoadingReport] = useState(false)

  // Auto-set department when user profile and departments are loaded
  useEffect(() => {
    console.log('🔍 Checking user profile:', userProfile)
    console.log('📋 Departments loaded:', departments.length)
    
    if (!userProfile) {
      console.warn('⚠️ User profile not loaded yet')
      return
    }
    
    if (!userProfile.department_id) {
      console.error('❌ CRITICAL: User has no department_id! Please run SQL to fix.')
      console.error('📝 Run this SQL: UPDATE users SET department_id = (SELECT id FROM departments WHERE code = \'CSE\') WHERE email = \'' + userProfile.email + '\';')
      setToast({ 
        message: 'Your account is not assigned to a department. Please contact administrator.', 
        type: 'error' 
      })
      return
    }
    
    if (departments.length === 0) {
      console.warn('⚠️ Departments not loaded yet')
      return
    }
    
    console.log('🔧 Auto-setting department:', userProfile.department_id)
    console.log('📋 Available departments:', departments)
    
    // Always set short report department
    setShortReportDept(userProfile.department_id)
    console.log('✅ Short report dept set to:', userProfile.department_id)
    
    // Set default department for all forms
    setForms(prev => ({
      ...prev,
      class: { ...prev.class, departmentId: userProfile.department_id },
      student: { ...prev.student, departmentId: userProfile.department_id },
      intern: { ...prev.intern, departmentId: userProfile.department_id },
      suspended: { ...prev.suspended, departmentId: userProfile.department_id }
    }))
  }, [userProfile, departments])

  // Generate Short Report
  const generateShortReport = async () => {
    console.log('🎯 Generate Report clicked')
    console.log('📊 shortReportDept value:', shortReportDept)
    console.log('📅 shortReportDate value:', shortReportDate)
    
    if (!shortReportDept) {
      console.error('❌ No department selected!')
      setToast({ message: 'Please select a department', type: 'info' })
      return
    }
    
    console.log('✅ Department is set, generating report...')

    setLoadingReport(true)
    try {
      // Get all classes for the selected department
      const deptClasses = classes.filter(c => c.department_id === shortReportDept)
      
      const reportData = {
        department: departments.find(d => d.id === shortReportDept),
        date: shortReportDate,
        classes: []
      }

      for (const cls of deptClasses) {
        // Get all students in this class
        const classStudents = students.filter(s => s.class_id === cls.id)
        const totalStudents = classStudents.length
        
        // Get today's attendance for this class
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

        // Calculate statistics
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

        // Count suspended and intern students
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
    } catch (error) {
      console.error('Error generating report:', error)
      setToast({ message: 'Error generating report', type: 'error' })
    } finally {
      setLoadingReport(false)
    }
  }

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'shortreport', name: 'Short Report' },
    { id: 'classes', name: 'Classes' },
    { id: 'timetable', name: 'Timetable' },
    { id: 'students', name: 'Students' },
    { id: 'reports', name: 'Reports' }
  ]

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Animated Hero Section */}
        <div className="mb-6 sm:mb-10 animate-fadeIn">
          <AnimatedHeroText 
            staticText="Let's"
            words={['TRACK', 'MANAGE', 'ANALYZE', 'IMPROVE', 'MONITOR']}
          />
          <p className="text-gray-400 text-sm sm:text-lg mt-3 sm:mt-4 max-w-2xl">
            Welcome back, <span className="text-white font-semibold">{userProfile?.name}</span>. 
            Track attendance, manage students, and gain insights—all in one place.
          </p>
        </div>

        <div className="bg-gray-900 rounded-xl border border-white/10 mb-6 shadow-2xl">
          <div className="border-b border-white/10">
            <nav className="flex overflow-x-auto p-2 gap-2 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 sm:px-6 py-2 sm:py-3 font-semibold transition-all duration-300 rounded-xl whitespace-nowrap text-sm sm:text-base ${
                    activeTab === tab.id ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-3 sm:p-6">
            {activeTab === 'overview' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <h2 className="text-xl sm:text-3xl font-bold text-white">Attendance Overview</h2>
                  <p className="text-gray-400 text-xs sm:text-base">Today: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {/* Total Students */}
                  <div className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 rounded-xl p-3 sm:p-6 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-500 hover:scale-105 cursor-pointer">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <p className="text-gray-400 text-xs sm:text-sm font-semibold uppercase tracking-wide">Students</p>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-green-400 group-hover:to-emerald-400 transition-all duration-300 mb-1">{students.filter(s => s.status === 'active').length}</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Active</p>
                  </div>

                  {/* Total Classes */}
                  <div className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 rounded-xl p-3 sm:p-6 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-500 hover:scale-105 cursor-pointer">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <p className="text-gray-400 text-xs sm:text-sm font-semibold uppercase tracking-wide">Classes</p>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 group-hover:from-purple-500/30 group-hover:to-pink-500/30 rounded-lg flex items-center justify-center transition-all duration-300">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:text-purple-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-purple-400 group-hover:to-pink-400 transition-all duration-300 mb-1">{classes.length}</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Total</p>
                  </div>

                  {/* Attendance Records */}
                  <div className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 rounded-xl p-3 sm:p-6 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-500 hover:scale-105 cursor-pointer">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <p className="text-gray-400 text-xs sm:text-sm font-semibold uppercase tracking-wide">Records</p>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500/20 to-amber-500/20 group-hover:from-orange-500/30 group-hover:to-amber-500/30 rounded-lg flex items-center justify-center transition-all duration-300">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:text-orange-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-orange-400 group-hover:to-amber-400 transition-all duration-300 mb-1">{periodAttendanceCount}</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Period</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-900 border border-white/20 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2">Generate Reports</h3>
                        <p className="text-sm text-gray-400 mb-4">Create detailed attendance reports for specific periods or departments.</p>
                        <button onClick={() => setActiveTab('reports')} className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-all duration-300 font-semibold text-sm uppercase tracking-wide">
                          Go to Reports
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-900 border border-white/20 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2">Manage Students</h3>
                        <p className="text-sm text-gray-400 mb-4">Add, edit, or remove students and manage their attendance status.</p>
                        <button onClick={() => setActiveTab('students')} className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-all duration-300 font-semibold text-sm uppercase tracking-wide">
                          Manage Students
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Attendance Trend Chart */}
                  <AttendanceTrendChart 
                    attendanceData={studentAttendance} 
                    totalStudents={students.filter(s => s.status === 'active').length} 
                  />

                  {/* Status Breakdown Pie Chart */}
                  <div className="bg-gray-900 border border-white/20 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-2">Student Status Breakdown</h3>
                    <p className="text-sm text-gray-400 mb-6">Current distribution (Today)</p>
                    
                    <div className="flex items-center justify-center mb-6">
                      {/* Donut Chart */}
                      <svg className="w-48 h-48" viewBox="0 0 200 200">
                        <defs>
                          <filter id="shadow">
                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                          </filter>
                        </defs>
                        
                        {/* Calculate percentages */}
                        {(() => {
                          const activeCount = students.filter(s => s.status === 'active').length
                          const internCount = students.filter(s => s.status === 'intern').length
                          const suspendedCount = students.filter(s => s.status === 'suspended').length
                          
                          // Calculate absent count from today's attendance
                          const today = new Date().toISOString().split('T')[0]
                          const todayAttendance = studentAttendance.filter(a => a.date === today)
                          const absentCount = todayAttendance.filter(a => a.status === 'absent').length
                          
                          const total = activeCount + internCount + suspendedCount + absentCount || 1
                          
                          const activePercent = (activeCount / total) * 100
                          const internPercent = (internCount / total) * 100
                          const suspendedPercent = (suspendedCount / total) * 100
                          const absentPercent = (absentCount / total) * 100
                          
                          // Calculate arc paths
                          const radius = 70
                          const innerRadius = 45
                          const centerX = 100
                          const centerY = 100
                          
                          let currentAngle = -90
                          
                          const createArc = (percentage, color) => {
                            const angle = (percentage / 100) * 360
                            const startAngle = currentAngle
                            const endAngle = currentAngle + angle
                            
                            const startRad = (startAngle * Math.PI) / 180
                            const endRad = (endAngle * Math.PI) / 180
                            
                            const x1 = centerX + radius * Math.cos(startRad)
                            const y1 = centerY + radius * Math.sin(startRad)
                            const x2 = centerX + radius * Math.cos(endRad)
                            const y2 = centerY + radius * Math.sin(endRad)
                            
                            const x3 = centerX + innerRadius * Math.cos(endRad)
                            const y3 = centerY + innerRadius * Math.sin(endRad)
                            const x4 = centerX + innerRadius * Math.cos(startRad)
                            const y4 = centerY + innerRadius * Math.sin(startRad)
                            
                            const largeArc = angle > 180 ? 1 : 0
                            
                            currentAngle = endAngle
                            
                            return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`
                          }
                          
                          return (
                            <>
                              {/* Active - Green */}
                              {activePercent > 0 && (
                                <path d={createArc(activePercent, '#10b981')} fill="#10b981" filter="url(#shadow)" className="hover:opacity-80 transition-opacity cursor-pointer"/>
                              )}
                              {/* Intern - Gray */}
                              {internPercent > 0 && (
                                <path d={createArc(internPercent, '#6b7280')} fill="#6b7280" filter="url(#shadow)" className="hover:opacity-80 transition-opacity cursor-pointer"/>
                              )}
                              {/* Suspended - Dark Gray */}
                              {suspendedPercent > 0 && (
                                <path d={createArc(suspendedPercent, '#374151')} fill="#374151" filter="url(#shadow)" className="hover:opacity-80 transition-opacity cursor-pointer"/>
                              )}
                              {/* Absent - Red */}
                              {absentPercent > 0 && (
                                <path d={createArc(absentPercent, '#ef4444')} fill="#ef4444" filter="url(#shadow)" className="hover:opacity-80 transition-opacity cursor-pointer"/>
                              )}
                              
                              {/* Center circle */}
                              <circle cx="100" cy="100" r="45" fill="#111827"/>
                              
                              {/* Center text */}
                              <text x="100" y="95" textAnchor="middle" className="text-2xl font-bold fill-white">{total}</text>
                              <text x="100" y="110" textAnchor="middle" className="text-xs fill-gray-400">Total</text>
                            </>
                          )
                        })()}
                      </svg>
                    </div>
                    
                    {/* Legend */}
                    <div className="space-y-3">
                      {(() => {
                        const activeCount = students.filter(s => s.status === 'active').length
                        const internCount = students.filter(s => s.status === 'intern').length
                        const suspendedCount = students.filter(s => s.status === 'suspended').length
                        const today = new Date().toISOString().split('T')[0]
                        const todayAttendance = studentAttendance.filter(a => a.date === today)
                        const absentCount = todayAttendance.filter(a => a.status === 'absent').length
                        const total = activeCount + internCount + suspendedCount + absentCount || 1
                        
                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-sm text-gray-300">Active</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{activeCount}</span>
                                <span className="text-xs text-green-500 font-semibold">
                                  {Math.round((activeCount / total) * 100)}%
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                                <span className="text-sm text-gray-300">Intern</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{internCount}</span>
                                <span className="text-xs text-gray-400 font-semibold">
                                  {Math.round((internCount / total) * 100)}%
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-gray-700"></div>
                                <span className="text-sm text-gray-300">Suspended</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{suspendedCount}</span>
                                <span className="text-xs text-gray-400 font-semibold">
                                  {Math.round((suspendedCount / total) * 100)}%
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-sm text-gray-300">Absent</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{absentCount}</span>
                                <span className="text-xs text-red-500 font-semibold">
                                  {Math.round((absentCount / total) * 100)}%
                                </span>
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'shortreport' && (
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Short Report</h2>
                  <p className="text-gray-400">Daily attendance summary by department and class</p>
                </div>

                {/* Report Form */}
                <div className="bg-gray-900 border border-white/20 rounded-xl p-6">
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Department</label>
                      <div className="px-4 py-3 bg-gray-900 border-2 border-white/30 rounded-lg text-gray-400 cursor-not-allowed opacity-75">
                        {departments.find(d => d.id === shortReportDept)?.name || 'Computer Science and Engineering'}
                      </div>
                      <input type="hidden" value={shortReportDept} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Date</label>
                      <input 
                        type="date" 
                        value={shortReportDate} 
                        onChange={(e) => setShortReportDate(e.target.value)} 
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
                </div>

                {/* Report Display */}
                {shortReportData && (
                  <div className="bg-gray-900 border border-white/20 rounded-xl p-8">
                    {/* Report Header */}
                    <div className="mb-6 pb-4 border-b border-white/20">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">☀️</span>
                        <h3 className="text-xl font-bold text-white">Department: {shortReportData.department?.name}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">☀️</span>
                        <p className="text-gray-400">Date: {new Date(shortReportData.date).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>

                    {/* Classes Report */}
                    <div className="space-y-6">
                      {shortReportData.classes.map((cls, index) => (
                        <div key={index} className="bg-black/30 rounded-lg p-6 border border-white/10">
                          {/* Class Header */}
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl">➕</span>
                            <h4 className="text-lg font-bold text-white">
                              {cls.name}: {shortReportData.department?.code} {cls.present}/{cls.total}
                            </h4>
                          </div>

                          {/* Statistics */}
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

                    {/* Report Footer */}
                    <div className="mt-6 pt-4 border-t border-white/20">
                      <p className="text-gray-400 text-sm">
                        Reported by: <span className="text-white font-semibold">Dean, {shortReportData.department?.code}</span>
                      </p>
                    </div>

                    {/* Copy Button */}
                    <div className="mt-6">
                      <button
                        onClick={() => {
                          const reportText = `☀️Department: ${shortReportData.department?.name}\n☀️Date: ${new Date(shortReportData.date).toLocaleDateString('en-GB')}\n\n${shortReportData.classes.map(cls => 
                            `➕${cls.name}: ${shortReportData.department?.code}  ${cls.present}/${cls.total}\n${cls.approved > 0 ? `📍Approved: ${String(cls.approved).padStart(2, '0')}\n` : ''}${cls.unapproved > 0 ? `📍Unapproved: ${String(cls.unapproved).padStart(2, '0')}\n` : ''}${cls.onDuty > 0 ? `📍OD: ${String(cls.onDuty).padStart(2, '0')}\n` : ''}${cls.suspended > 0 ? `📍Suspend: ${String(cls.suspended).padStart(2, '0')}\n` : ''}${cls.intern > 0 ? `📍Intern: ${String(cls.intern).padStart(2, '0')}\n` : ''}`
                          ).join('\n')}\n\nReported by: Dean, ${shortReportData.department?.code}`
                          
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
                    <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-400 text-lg">Select a department and date to generate the short report</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'departments' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Departments</h2>
                  <button onClick={() => setShowForm({ ...showForm, dept: !showForm.dept })} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    + Add Department
                  </button>
                </div>

                {showForm.dept && (
                  <form onSubmit={(e) => handleSubmit('dept', e)} className="bg-gray-900 border border-gray-700 p-6 rounded-lg mb-6">
                    <div className="grid md:grid-cols-3 gap-4">
                      <input type="text" placeholder="Department Name" value={forms.dept.name} onChange={(e) => setForms({ ...forms, dept: { ...forms.dept, name: e.target.value }})} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600" required />
                      <input type="text" placeholder="Code (e.g., CS)" value={forms.dept.code} onChange={(e) => setForms({ ...forms, dept: { ...forms.dept, code: e.target.value }})} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600" required />
                      <input type="text" placeholder="Description" value={forms.dept.description} onChange={(e) => setForms({ ...forms, dept: { ...forms.dept, description: e.target.value }})} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600" />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Save</button>
                      <button type="button" onClick={() => setShowForm({ ...showForm, dept: false })} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">Cancel</button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900 border-b border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-400">Code</th>
                        <th className="px-4 py-3 text-left text-gray-400">Name</th>
                        <th className="px-4 py-3 text-left text-gray-400">Description</th>
                        <th className="px-4 py-3 text-left text-gray-400">Students</th>
                        <th className="px-4 py-3 text-left text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map((dept) => (
                        <tr key={dept.id} className="border-b border-gray-700 hover:bg-gray-750">
                          <td className="px-4 py-3 font-medium">{dept.code}</td>
                          <td className="px-4 py-3">{dept.name}</td>
                          <td className="px-4 py-3 text-gray-400">{dept.description}</td>
                          <td className="px-4 py-3">
                            <span className="px-3 py-1 bg-white text-black rounded-full text-sm font-bold">
                              {dept.student_count || 0} Students
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => confirm('Delete?') && deleteDepartment(dept.id)} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'classes' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Classes</h2>
                  <button onClick={() => setShowForm({ ...showForm, class: !showForm.class })} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">+ Add Class</button>
                </div>

                {showForm.class && (
                  <form onSubmit={(e) => handleSubmit('class', e)} className="bg-gray-900 border border-gray-700 p-6 rounded-lg mb-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        placeholder="Class Name (e.g., CSE-A, AIML-B)" 
                        value={forms.class.name} 
                        onChange={(e) => setForms({ ...forms, class: { ...forms.class, name: e.target.value }})} 
                        className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600" 
                        required 
                      />
                      <div className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed opacity-60">
                        {departments.find(d => d.id === forms.class.departmentId)?.name || 'Computer Science and Engineering'}
                      </div>
                      <input type="hidden" name="departmentId" value={forms.class.departmentId} required />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Save Class</button>
                      <button type="button" onClick={() => setShowForm({ ...showForm, class: false })} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">Cancel</button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900 border-b border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-400">Class</th>
                        <th className="px-4 py-3 text-left text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map((cls) => (
                        <tr key={cls.id} className="border-b border-gray-700 hover:bg-gray-750">
                          <td className="px-4 py-3 font-medium text-lg">{cls.name}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => confirm('Delete?') && deleteClass(cls.id)} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'timetable' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">Class Timetable</h2>
                    <p className="text-gray-600">View and manage class timetables</p>
                  </div>
                  <button 
                    onClick={() => setShowForm({ ...showForm, timetable: !showForm.timetable })} 
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                  >
                    <span className="text-xl">+</span> Add Period
                  </button>
                </div>

                <div className="mb-6">
                  <TimetableImageUpload onImportComplete={() => window.location.reload()} classes={classes} />
                </div>

                {showForm.timetable && (
                  <form onSubmit={(e) => handleSubmit('timetable', e)} className="bg-gray-50 p-6 rounded-lg mb-6 border-2 border-primary-200">
                    <h3 className="text-lg font-semibold mb-4">Add Timetable Entry</h3>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Class *</label>
                        <select
                          value={forms.timetable.classId}
                          onChange={(e) => setForms({ ...forms, timetable: { ...forms.timetable, classId: e.target.value }})}
                          className="w-full px-4 py-2 border rounded-lg"
                          required
                        >
                          <option value="">Select Class</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name} ({cls.departments?.name})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Day *</label>
                        <select
                          value={forms.timetable.dayOfWeek}
                          onChange={(e) => setForms({ ...forms, timetable: { ...forms.timetable, dayOfWeek: e.target.value }})}
                          className="w-full px-4 py-2 border rounded-lg"
                          required
                        >
                          <option value="1">Monday</option>
                          <option value="2">Tuesday</option>
                          <option value="3">Wednesday</option>
                          <option value="4">Thursday</option>
                          <option value="5">Friday</option>
                          <option value="6">Saturday</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Period *</label>
                        <select
                          value={forms.timetable.periodNumber}
                          onChange={(e) => setForms({ ...forms, timetable: { ...forms.timetable, periodNumber: e.target.value }})}
                          className="w-full px-4 py-2 border rounded-lg"
                          required
                        >
                          <option value="1">Period 1 (08:30-09:20)</option>
                          <option value="2">Period 2 (09:20-10:10)</option>
                          <option value="3">Period 3 (10:25-11:15)</option>
                          <option value="4">Period 4 (11:15-12:05)</option>
                          <option value="5">Period 5 (12:45-01:35)</option>
                          <option value="6">Period 6 (01:35-02:30)</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Subject Code *</label>
                        <input
                          type="text"
                          placeholder="e.g., CA(302)"
                          value={forms.timetable.subjectCode}
                          onChange={(e) => setForms({ ...forms, timetable: { ...forms.timetable, subjectCode: e.target.value }})}
                          className="w-full px-4 py-2 border rounded-lg"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Subject Name *</label>
                        <input
                          type="text"
                          placeholder="e.g., Computer Architecture"
                          value={forms.timetable.subjectName}
                          onChange={(e) => setForms({ ...forms, timetable: { ...forms.timetable, subjectName: e.target.value }})}
                          className="w-full px-4 py-2 border rounded-lg"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Faculty Name *</label>
                        <input
                          type="text"
                          placeholder="e.g., Mrs.I.Roshini"
                          value={forms.timetable.facultyName}
                          onChange={(e) => setForms({ ...forms, timetable: { ...forms.timetable, facultyName: e.target.value }})}
                          className="w-full px-4 py-2 border rounded-lg"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Faculty Code</label>
                        <input
                          type="text"
                          placeholder="e.g., IR"
                          value={forms.timetable.facultyCode}
                          onChange={(e) => setForms({ ...forms, timetable: { ...forms.timetable, facultyCode: e.target.value }})}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      </div>
                      
                      <div className="flex items-center pt-8">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={forms.timetable.isLab}
                            onChange={(e) => setForms({ ...forms, timetable: { ...forms.timetable, isLab: e.target.checked }})}
                            className="w-5 h-5 text-primary-600 rounded"
                          />
                          <span className="text-sm font-medium text-gray-700">Lab Session</span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">
                        Save Period
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setShowForm({ ...showForm, timetable: false })} 
                        className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                  
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white mb-2">Select Class</label>
                  <select
                    value={selectedClassForTimetable}
                    onChange={(e) => setSelectedClassForTimetable(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-white/30 bg-black text-white rounded-lg focus:ring-2 focus:ring-white focus:border-white outline-none transition-all"
                  >
                    <option value="" className="bg-gray-800">-- Select a Class --</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id} className="bg-gray-800">
                        {cls.name}
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
                  <div className="bg-gray-900 border border-white/20 rounded-lg shadow-lg p-12 text-center">
                    <h3 className="text-xl font-semibold text-white mb-2">NO CLASS SELECTED</h3>
                    <p className="text-gray-400">Please select a class from the dropdown above to view its timetable</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sessions' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Sessions</h2>
                  <button onClick={() => setShowForm({ ...showForm, session: !showForm.session })} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">+ Add Session</button>
                </div>

                {showForm.session && (
                  <form onSubmit={(e) => handleSubmit('session', e)} className="bg-gray-50 p-6 rounded-lg mb-6">
                    <div className="grid md:grid-cols-3 gap-4">
                      <input type="text" placeholder="Session Name" value={forms.session.name} onChange={(e) => setForms({ ...forms, session: { ...forms.session, name: e.target.value }})} className="px-4 py-2 border rounded-lg" required />
                      <input type="time" value={forms.session.startTime} onChange={(e) => setForms({ ...forms, session: { ...forms.session, startTime: e.target.value }})} className="px-4 py-2 border rounded-lg" required />
                      <input type="time" value={forms.session.endTime} onChange={(e) => setForms({ ...forms, session: { ...forms.session, endTime: e.target.value }})} className="px-4 py-2 border rounded-lg" required />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg">Save</button>
                      <button type="button" onClick={() => setShowForm({ ...showForm, session: false })} className="px-4 py-2 bg-gray-400 text-white rounded-lg">Cancel</button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left">Session Name</th>
                        <th className="px-4 py-3 text-left">Start Time</th>
                        <th className="px-4 py-3 text-left">End Time</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.id} className="border-b">
                          <td className="px-4 py-3 font-medium">{session.name}</td>
                          <td className="px-4 py-3">{session.start_time}</td>
                          <td className="px-4 py-3">{session.end_time}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => confirm('Delete?') && deleteSession(session.id)} className="text-red-600 hover:text-red-800">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'students' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Students</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setShowForm({ ...showForm, student: !showForm.student, intern: false, suspended: false })} className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-all duration-300 transform hover:scale-105 font-semibold">+ Add Student</button>
                    <button onClick={() => setShowForm({ ...showForm, intern: !showForm.intern, student: false, suspended: false })} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-300 transform hover:scale-105 font-semibold">Add Intern</button>
                    <button onClick={() => setShowForm({ ...showForm, suspended: !showForm.suspended, student: false, intern: false })} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-300 transform hover:scale-105 font-semibold">Add Suspended</button>
                  </div>
                </div>

                <div className="mb-6">
                  <BulkStudentImport onImportComplete={refetchStudents} departments={departments} classes={classes} />
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="🔍 Search students by name or roll number..."
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
                    />
                    {studentSearchQuery && (
                      <button
                        onClick={() => setStudentSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {showForm.student && (
                  <form onSubmit={(e) => handleSubmit('student', e)} className="bg-black p-6 rounded-lg mb-6 border-2 border-white shadow-xl animate-fadeIn">
                    <h3 className="text-lg font-bold mb-4 text-white">Add Regular Student</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <input type="text" placeholder="Roll Number" value={forms.student.rollNumber} onChange={(e) => setForms({ ...forms, student: { ...forms.student, rollNumber: e.target.value }})} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600" required />
                      <input type="text" placeholder="Name" value={forms.student.name} onChange={(e) => setForms({ ...forms, student: { ...forms.student, name: e.target.value }})} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600" required />
                      <div className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed opacity-60">
                        {departments.find(d => d.id === forms.student.departmentId)?.name || 'Computer Science and Engineering'}
                      </div>
                      <input type="hidden" name="departmentId" value={forms.student.departmentId} required />
                      <select value={forms.student.classId} onChange={(e) => setForms({ ...forms, student: { ...forms.student, classId: e.target.value }})} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-600" required>
                        <option value="">Select Class</option>
                        {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
                      </select>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Save Student</button>
                      <button type="button" onClick={() => setShowForm({ ...showForm, student: false })} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">Cancel</button>
                    </div>
                  </form>
                )}

                {showForm.intern && (
                  <form onSubmit={(e) => handleSubmit('intern', e)} className="bg-black p-6 rounded-lg mb-6 border-2 border-gray-500 shadow-xl animate-fadeIn">
                    <h3 className="text-lg font-bold mb-4 text-white">Add Intern Student</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <input type="text" placeholder="Roll Number" value={forms.intern.rollNumber} onChange={(e) => setForms({ ...forms, intern: { ...forms.intern, rollNumber: e.target.value }})} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600" required />
                      <input type="text" placeholder="Name" value={forms.intern.name} onChange={(e) => setForms({ ...forms, intern: { ...forms.intern, name: e.target.value }})} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600" required />
                      <div className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed opacity-60">
                        {departments.find(d => d.id === forms.intern.departmentId)?.name || 'Computer Science and Engineering'}
                      </div>
                      <input type="hidden" name="departmentId" value={forms.intern.departmentId} required />
                      <select value={forms.intern.classId} onChange={(e) => setForms({ ...forms, intern: { ...forms.intern, classId: e.target.value }})} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-600" required>
                        <option value="">Select Class</option>
                        {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
                      </select>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Save Intern</button>
                      <button type="button" onClick={() => setShowForm({ ...showForm, intern: false })} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">Cancel</button>
                    </div>
                  </form>
                )}

                {showForm.suspended && (
                  <form onSubmit={(e) => handleSubmit('suspended', e)} className="bg-black p-6 rounded-lg mb-6 border-2 border-gray-600 shadow-xl animate-fadeIn">
                    <h3 className="text-lg font-bold mb-4 text-white">Add Suspended Student</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <input type="text" placeholder="Roll Number" value={forms.suspended.rollNumber} onChange={(e) => setForms({ ...forms, suspended: { ...forms.suspended, rollNumber: e.target.value }})} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600" required />
                      <input type="text" placeholder="Name" value={forms.suspended.name} onChange={(e) => setForms({ ...forms, suspended: { ...forms.suspended, name: e.target.value }})} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-600" required />
                      <div className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed opacity-60">
                        {departments.find(d => d.id === forms.suspended.departmentId)?.name || 'Computer Science and Engineering'}
                      </div>
                      <input type="hidden" name="departmentId" value={forms.suspended.departmentId} required />
                      <select value={forms.suspended.classId} onChange={(e) => setForms({ ...forms, suspended: { ...forms.suspended, classId: e.target.value }})} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-600" required>
                        <option value="">Select Class</option>
                        {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
                      </select>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Save Suspended</button>
                      <button type="button" onClick={() => setShowForm({ ...showForm, suspended: false })} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">Cancel</button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900 border-b border-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-400">Roll No</th>
                        <th className="px-4 py-3 text-left text-gray-400">Name</th>
                        <th className="px-4 py-3 text-left text-gray-400">Department</th>
                        <th className="px-4 py-3 text-left text-gray-400">Class</th>
                        <th className="px-4 py-3 text-left text-gray-400">Status</th>
                        <th className="px-4 py-3 text-left text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students
                        .filter(student => {
                          if (!studentSearchQuery) return true
                          const query = studentSearchQuery.toLowerCase()
                          return student.name.toLowerCase().includes(query) || 
                                 student.roll_number.toLowerCase().includes(query)
                        })
                        .map((student) => (
                        <tr key={student.id} className="border-b border-gray-700 hover:bg-gray-750">
                          <td className="px-4 py-3 font-medium">{student.roll_number}</td>
                          <td className="px-4 py-3">{student.name}</td>
                          <td className="px-4 py-3">{student.departments?.name}</td>
                          <td className="px-4 py-3">{student.classes?.name}</td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              student.status === 'suspended' ? 'bg-gray-700 text-white border border-gray-500' :
                              student.status === 'intern' ? 'bg-gray-800 text-gray-300 border border-gray-600' :
                              'bg-white text-black border border-white'
                            }`}>
                              {student.status === 'suspended' ? 'SUSPENDED' :
                               student.status === 'intern' ? 'INTERN' :
                               'ACTIVE'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => confirm('Delete?') && deleteStudent(student.id)} className="text-red-500 hover:text-red-400">Delete</button>
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
                <h2 className="text-2xl font-bold mb-6">Attendance Reports</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gray-900 border-2 border-white/30 rounded-xl p-6 hover:border-white/50 transition-all duration-300">
                    <div className="mb-4">
                      <h3 className="font-bold text-xl text-white mb-2">Student Attendance Report</h3>
                      <p className="text-sm text-gray-400">Download all student attendance records</p>
                    </div>
                    <div className="mb-4 p-3 bg-black border border-white/20 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Total Period Attendance Records</div>
                      <div className="text-3xl font-bold text-white">{periodAttendanceCount}</div>
                    </div>
                    <button onClick={async () => {
                      try {
                        console.log('📊 Fetching period attendance data...')
                        
                        // Get current user and their department
                        const { data: { user: currentUser } } = await supabase.auth.getUser()
                        
                        if (!userProfile?.department_id) {
                          setToast({ message: 'Your account is not assigned to a department', type: 'error' })
                          return
                        }
                        
                        console.log('🔍 Filtering by department:', userProfile.department_id)
                        
                        const { data, error } = await supabase
                          .from('period_attendance')
                          .select(`
                            *,
                            timetable (
                              subject_code,
                              subject_name,
                              faculty_name
                            ),
                            classes!inner (
                              name,
                              department_id
                            )
                          `)
                          .eq('is_marked', true)
                          .eq('classes.department_id', userProfile.department_id)
                          .order('date', { ascending: false })
                        
                        if (error) {
                          console.error('Supabase error:', error)
                          throw error
                        }
                        
                        console.log('Fetched data:', data)
                        
                        if (!data || data.length === 0) {
                          setToast({ message: 'No attendance records found', type: 'info' })
                          return
                        }
                        
                        await generatePeriodAttendanceReport(data, supabase)
                      } catch (err) {
                        console.error('Error details:', err)
                        setToast({ message: `Error fetching attendance records: ${err.message}`, type: 'error' })
                      }
                    }} className="w-full px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-all duration-300 font-semibold uppercase tracking-wide">
                      Download Student Report PDF
                    </button>
                  </div>

                  <div className="bg-gray-900 border-2 border-white/30 rounded-xl p-6 hover:border-white/50 transition-all duration-300">
                    <div className="mb-4">
                      <h3 className="font-bold text-xl text-white mb-2">Staff Attendance Report</h3>
                      <p className="text-sm text-gray-400">Download all staff attendance records</p>
                    </div>
                    <div className="mb-4 p-3 bg-black border border-white/20 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Total Staff Records</div>
                      <div className="text-3xl font-bold text-white">{staffAttendance.length}</div>
                    </div>
                    <button onClick={() => {
                      if (staffAttendance.length > 0) {
                        generateAttendanceReport(staffAttendance, 'staff')
                      } else {
                        setToast({ message: 'No staff attendance records found', type: 'info' })
                      }
                    }} className="w-full px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-200 transition-all duration-300 font-semibold uppercase tracking-wide">
                      Download Staff Report PDF
                    </button>
                  </div>
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

export default AdminDashboardNew
