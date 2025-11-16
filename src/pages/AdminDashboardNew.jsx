import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useStudents } from '../hooks/useStudents'
// import { useDepartments } from '../hooks/useDepartments' // Replaced with streams
import { useClasses } from '../hooks/useClasses'
import { useSessions } from '../hooks/useSessions'
import { useStudentAttendance } from '../hooks/useStudentAttendance'
import { useAttendance } from '../hooks/useAttendance'
import { useTimetable } from '../hooks/useTimetable'
import { useUsers } from '../hooks/useUsers'
import { supabase } from '../services/supabase'
import Navbar from '../components/Navbar'
import NeoSidebar from '../components/NeoSidebar'
import NeoCard from '../components/NeoCard'
import NeoLineChart from '../components/NeoLineChart'
import BulkStudentImport from '../components/BulkStudentImport'
import InteractiveTimetable from '../components/InteractiveTimetable'
import AdminTimetableView from '../components/AdminTimetableView'
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
      <span className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
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
      
      const dayAttendance = attendanceData.filter(a => a.date === dateStr)
      const agg = new Map()
      for (const r of dayAttendance) {
        const id = r.student_id
        if (!id) continue
        const prev = agg.get(id) || 'unmarked'
        const curr = r.status
        let next = prev
        if (curr === 'present') next = 'present'
        else if (curr === 'on_duty' && prev !== 'present') next = 'on_duty'
        else if (curr === 'absent' && prev !== 'present' && prev !== 'on_duty') next = 'absent'
        agg.set(id, next)
      }
      let presentCount = 0
      for (const v of agg.values()) if (v === 'present') presentCount++
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
  const maxAttendance = Math.max(100, ...chartData.map(d => d.attendance))
  const minAttendance = Math.min(0, ...chartData.map(d => d.attendance))
  const range = Math.max(1, maxAttendance - minAttendance)
  
  const getYPosition = (attendance) => {
    const normalized = Math.max(0, Math.min(1, (attendance - minAttendance) / range))
    return 180 - (normalized * 160)
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
  const { classes, addClass, deleteClass, refetch: refetchClasses } = useClasses()
  const { sessions, addSession, deleteSession } = useSessions()
  const { attendance: studentAttendance } = useStudentAttendance()
  const { attendance: staffAttendance } = useAttendance()
  const { timetable, addTimetableEntry, deleteTimetableEntry } = useTimetable()
  const { users, onlineUsers, deleteUser, deleteMyAccount, updateUser, appointAsPC, removePC } = useUsers()

  // Define the 6 streams
  const streams = [
    { id: 'cse', name: 'Computer Science and Engineering', code: 'CSE' },
    { id: 'it', name: 'Information Technology', code: 'IT' },
    { id: 'ece', name: 'Electronics and Communication Engineering', code: 'ECE' },
    { id: 'eee', name: 'Electrical and Electronics Engineering', code: 'EEE' },
    { id: 'mech', name: 'Mechanical Engineering', code: 'MECH' },
    { id: 'civil', name: 'Civil Engineering', code: 'CIVIL' }
  ]

  const [activeTab, setActiveTab] = useState('overview')
  const [showForm, setShowForm] = useState({ dept: false, class: false, session: false, student: false, intern: false, suspended: false, timetable: false, bulkTimetable: false })
  const [periodAttendanceCount, setPeriodAttendanceCount] = useState(0)
  const [studentAttendanceCount, setStudentAttendanceCount] = useState(0)
  const [staffAttendanceCount, setStaffAttendanceCount] = useState(0)
  const [periodStudentAttendance, setPeriodStudentAttendance] = useState([])
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [toast, setToast] = useState(null)
  const [selectedStudents, setSelectedStudents] = useState([])
  const [selectAll, setSelectAll] = useState(false)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const stream = streams.find(s => s.id === userProfile?.stream_id)

  // Bulk delete functions
  const handleSelectAll = () => {
    const filteredStudents = students.filter(student => {
      if (!studentSearchQuery) return true
      const query = studentSearchQuery.toLowerCase()
      return student.name.toLowerCase().includes(query) || 
             student.roll_number.toLowerCase().includes(query)
    })
    
    if (selectAll) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id))
    }
    setSelectAll(!selectAll)
  }

  const handleSelectStudent = (studentId) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId))
    } else {
      setSelectedStudents([...selectedStudents, studentId])
    }
  }

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) {
      setToast({ message: 'Please select students to delete', type: 'warning' })
      return
    }

    const confirmMessage = `Are you sure you want to delete ${selectedStudents.length} selected student(s)? This action cannot be undone!`
    if (!confirm(confirmMessage)) return

    try {
      for (const studentId of selectedStudents) {
        await deleteStudent(studentId)
      }
      setToast({ message: `Successfully deleted ${selectedStudents.length} student(s)`, type: 'success' })
      setSelectedStudents([])
      setSelectAll(false)
      fetchPeriodAttendanceCount() // Refresh count after deletion
    } catch (error) {
      setToast({ message: 'Error deleting students: ' + error.message, type: 'error' })
    }
  }

  const handleDeleteAll = async () => {
    const filteredStudents = students.filter(student => {
      if (!studentSearchQuery) return true
      const query = studentSearchQuery.toLowerCase()
      return student.name.toLowerCase().includes(query) || 
             student.roll_number.toLowerCase().includes(query)
    })

    if (filteredStudents.length === 0) {
      setToast({ message: 'No students to delete', type: 'warning' })
      return
    }

    const confirmMessage = `⚠️ DANGER: Are you sure you want to delete ALL ${filteredStudents.length} student(s)? This will permanently remove all student data and cannot be undone!`
    if (!confirm(confirmMessage)) return

    try {
      for (const student of filteredStudents) {
        await deleteStudent(student.id)
      }
      setToast({ message: `Successfully deleted all ${filteredStudents.length} student(s)`, type: 'success' })
      setSelectedStudents([])
      setSelectAll(false)
      fetchPeriodAttendanceCount() // Refresh count after deletion
    } catch (error) {
      setToast({ message: 'Error deleting all students: ' + error.message, type: 'error' })
    }
  }

  // Function to get department name based on class name patterns
  const getDepartmentForClass = (classId) => {
    const selectedClass = classes.find(c => c.id === classId)
    if (selectedClass) {
      console.log('🔍 Selected class:', selectedClass.name)
      
      // Determine department based on class name patterns
      const className = selectedClass.name.toUpperCase()
      
      if (className.includes('IT')) {
        console.log('🏢 Department: Information Technology')
        return 'Information Technology'
      } else if (className.includes('CSE') || className.includes('COMPUTER')) {
        console.log('🏢 Department: Computer Science and Engineering')
        return 'Computer Science and Engineering'
      } else if (className.includes('ECE') || className.includes('ELECTRONICS')) {
        console.log('🏢 Department: Electronics and Communication Engineering')
        return 'Electronics and Communication Engineering'
      } else if (className.includes('EEE') || className.includes('ELECTRICAL')) {
        console.log('🏢 Department: Electrical and Electronics Engineering')
        return 'Electrical and Electronics Engineering'
      } else if (className.includes('MECH') || className.includes('MECHANICAL')) {
        console.log('🏢 Department: Mechanical Engineering')
        return 'Mechanical Engineering'
      } else if (className.includes('CIVIL')) {
        console.log('🏢 Department: Civil Engineering')
        return 'Civil Engineering'
      } else {
        // Fallback to stream-based department
        const stream = streams.find(s => s.id === selectedClass.stream_id)
        console.log('🏢 Department (fallback):', stream?.name || 'Department')
        return stream?.name || 'Department'
      }
    }
    return 'Select Class First'
  }

  // Fetch today's period attendance count
  const fetchPeriodAttendanceCount = async () => {
    try {
      // Wait for userProfile to load
      if (!userProfile?.stream_id) {
        console.log('⏳ Waiting for user profile to load...')
        setPeriodAttendanceCount(0)
        return
      }
      
      console.log('📊 Fetching today\'s attendance count for stream:', userProfile.stream_id)
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0]
      
      const { count: studentCount, error: studentError } = await supabase
        .from('period_attendance')
        .select('*, classes!inner(stream_id)', { count: 'exact', head: true })
        .eq('is_marked', true)
        .eq('date', today)
        .eq('classes.stream_id', userProfile.stream_id)

      const { count: staffCount, error: staffError } = await supabase
        .from('staff_attendance')
        .select('*, users!inner(stream_id)', { count: 'exact', head: true })
        .eq('date', today)
        .eq('users.stream_id', userProfile.stream_id)

      if (studentError) {
        console.error('Error fetching student count:', studentError)
        throw studentError
      }

      if (staffError) {
        console.error('Error fetching staff count:', staffError)
        throw staffError
      }

      const totalCount = (studentCount || 0) + (staffCount || 0)
      console.log('✅ Today\'s attendance count - Students:', studentCount, 'Staff:', staffCount, 'Total:', totalCount)
      setPeriodAttendanceCount(totalCount)
      setStudentAttendanceCount(studentCount || 0)
      setStaffAttendanceCount(staffCount || 0)
    } catch (err) {
      console.error('Error fetching attendance count:', err)
      setPeriodAttendanceCount(0)
    }
  }

  // Fetch period student attendance data
  const fetchPeriodStudentAttendance = async () => {
    try {
      if (!userProfile?.stream_id || classes.length === 0) return
      
      // Get class IDs for this stream
      const streamClassIds = classes
        .filter(c => c.stream_id === userProfile.stream_id)
        .map(c => c.id)
      
      if (streamClassIds.length === 0) return
      
      // Fetch attendance data for all classes in this stream
      const { data, error } = await supabase
        .from('period_student_attendance')
        .select(`
          *,
          students (id, roll_number, name, class_id, status),
          period_attendance (date)
        `)
        .in('students.class_id', streamClassIds)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setPeriodStudentAttendance(data || [])
    } catch (err) {
      console.error('Error fetching period student attendance:', err)
      setPeriodStudentAttendance([])
    }
  }

  // Fetch count when userProfile loads OR when attendance data changes
  useEffect(() => {
    if (userProfile?.stream_id) {
      fetchPeriodAttendanceCount()
      fetchPeriodStudentAttendance()
    }
  }, [userProfile, studentAttendance, staffAttendance, classes, students, users])

  useEffect(() => {
    if (!userProfile?.stream_id) return
    const channel = supabase
      .channel('admin-dashboard-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'period_student_attendance' }, () => {
        fetchPeriodStudentAttendance()
        fetchPeriodAttendanceCount()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        refetchStudents()
        fetchPeriodStudentAttendance()
        fetchPeriodAttendanceCount()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userProfile])
  
  const [forms, setForms] = useState({
    stream: { name: '', code: '', description: '' },
    class: { name: '', streamId: '' },
    student: { rollNumber: '', name: '', email: '', phone: '', streamId: '', classId: '', dateOfBirth: '' },
    intern: { rollNumber: '', name: '', email: '', phone: '', streamId: '', classId: '', dateOfBirth: '' },
    suspended: { rollNumber: '', name: '', email: '', phone: '', streamId: '', classId: '', dateOfBirth: '' },
    timetable: { classId: '', dayOfWeek: '1', periodNumber: '1', subjectCode: '', subjectName: '', facultyName: '', facultyCode: '', isLab: false }
  })

  const handleSubmit = async (type, e) => {
    e.preventDefault()
    let result
    
    switch(type) {
      case 'stream':
        // Streams are predefined, no need to add them
        setToast({ message: 'Streams are predefined and cannot be added!', type: 'info' })
        return
      case 'class':
        console.log('🏫 Adding class:', forms.class.name, 'to stream:', forms.class.streamId)
        console.log('👤 User profile stream:', userProfile?.stream_id)
        
        // Check if class name is empty or just whitespace
        if (!forms.class.name || forms.class.name.trim() === '') {
          setToast({ message: 'Please enter a class name', type: 'error' })
          return
        }
        
        // Check if streamId is missing
        if (!forms.class.streamId) {
          console.error('❌ StreamId is missing! Using userProfile stream_id as fallback')
          forms.class.streamId = userProfile?.stream_id || 'cse'
        }
        
        // Use the class name as entered by user (no auto-appending)
        let finalClassName = forms.class.name.trim()
        console.log('🔧 Final class name:', finalClassName, 'Stream ID:', forms.class.streamId)
        
        // Check if class already exists before adding
        const existingClass = classes.find(c => c.name === finalClassName)
        if (existingClass) {
          setToast({ message: `Class "${finalClassName}" already exists in this stream!`, type: 'warning' })
          return
        }
        
        result = await addClass(finalClassName, forms.class.streamId)
        console.log('✅ Class add result:', result)
        
        // If duplicate key error, provide helpful message
        if (!result.success && result.error.includes('duplicate key')) {
          setToast({ message: `Class "${finalClassName}" already exists. Try a different name.`, type: 'error' })
          return
        }
        break
      case 'student':
        result = await addStudent({
          roll_number: forms.student.rollNumber,
          name: forms.student.name,
          email: forms.student.email || null,
          phone: forms.student.phone || null,
          stream_id: forms.student.streamId,
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
            stream_id: forms.intern.streamId,
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
            stream_id: forms.suspended.streamId,
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
      setForms({ ...forms, [type]: type === 'stream' ? { name: '', code: '', description: '' } : 
                type === 'class' ? { name: '', streamId: userProfile?.stream_id || '' } :
                type === 'timetable' ? { classId: '', dayOfWeek: '1', periodNumber: '1', subjectCode: '', subjectName: '', facultyName: '', facultyCode: '', isLab: false } :
                { rollNumber: '', name: '', email: '', phone: '', streamId: userProfile?.stream_id || '', classId: '', dateOfBirth: '' }
      })
      setToast({ message: `${type.charAt(0).toUpperCase() + type.slice(1)} added successfully!`, type: 'success' })
      
      // Refresh attendance count for classes and students
      if (type === 'class' || type === 'student') {
        fetchPeriodAttendanceCount() // Refresh attendance count
      }
    } else {
      setToast({ message: 'Error: ' + result.error, type: 'error' })
    }
  }

  const [selectedClassForTimetable, setSelectedClassForTimetable] = useState('')
  const [timetableDate] = useState(new Date().toISOString().split('T')[0])
  
  // Short Report states
  const [shortReportStream, setShortReportStream] = useState('')
  const [shortReportDate, setShortReportDate] = useState(new Date().toISOString().split('T')[0])
  const [shortReportData, setShortReportData] = useState(null)
  const [loadingReport, setLoadingReport] = useState(false)

  // Auto-set stream when user profile is loaded
  useEffect(() => {
    const setupUserStream = async () => {
      console.log('🔍 Checking user profile:', userProfile)
      
      if (!userProfile) {
        console.warn('⚠️ User profile not loaded yet')
        return
      }
      
      // Auto-assign CSE stream if user doesn't have one
      let userStreamId = userProfile.stream_id
      if (!userStreamId) {
        console.log('🔧 User has no stream_id, auto-assigning CSE stream')
        userStreamId = 'cse' // Default to CSE stream
        
        // Optionally update the database (silent update)
        try {
          await supabase
            .from('users')
            .update({ stream_id: 'cse' })
            .eq('id', userProfile.id)
          console.log('✅ Auto-assigned CSE stream to user')
        } catch (error) {
          console.warn('Could not update user stream in database:', error)
        }
      }
      
      console.log('🔧 Auto-setting stream:', userStreamId)
      console.log('📋 Available streams:', streams)
      
      // Always set short report stream
      setShortReportStream(userStreamId)
      console.log('✅ Short report stream set to:', userStreamId)
      
      // Set default stream for all forms
      setForms(prev => ({
        ...prev,
        class: { ...prev.class, streamId: userStreamId },
        student: { ...prev.student, streamId: userStreamId },
        intern: { ...prev.intern, streamId: userStreamId },
        suspended: { ...prev.suspended, streamId: userStreamId }
      }))
    }

    setupUserStream()
  }, [userProfile])

  // Generate Short Report
  const generateShortReport = async () => {
    console.log('🎯 Generate Report clicked')
    
    // Determine which stream to use (fallback to user stream or CSE)
    const reportStream = shortReportStream || userProfile?.stream_id || 'cse'
    
    console.log('📊 Report stream value:', reportStream)
    console.log('📅 shortReportDate value:', shortReportDate)
    console.log('👤 User role:', userProfile?.role)
    console.log('📋 Is PC:', userProfile?.is_pc)
    
    if (!reportStream) {
      console.error('❌ No stream available!')
      const message = userProfile?.role === 'admin' ? 'Please select a stream' : 'Your account is not assigned to a stream'
      setToast({ message, type: 'info' })
      return
    }
    
    console.log('🚀 Starting report generation...')

    setLoadingReport(true)
    try {
      // Get all classes for the selected stream
      const streamClasses = classes.filter(c => c.stream_id === reportStream)
      
      const reportData = {
        stream: streams.find(s => s.id === reportStream),
        date: shortReportDate,
        classes: []
      }

      for (const cls of streamClasses) {
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

  // Define tabs based on user role and PC status
  const getAvailableTabs = () => {
    const baseTabs = [
      { id: 'overview', name: 'Overview' },
      { id: 'classes', name: 'Classes' },
      { id: 'timetable', name: 'Timetable' },
      { id: 'students', name: 'Students' }
    ]

    // Add Short Report for Admins and PCs
    if (userProfile?.role === 'admin' || userProfile?.is_pc) {
      baseTabs.splice(1, 0, { id: 'shortreport', name: 'Short Report' })
    }

    // Add Users tab for Admins only
    if (userProfile?.role === 'admin') {
      baseTabs.push({ id: 'users', name: 'Users' })
    }

    // Add Reports tab for Admins only
    if (userProfile?.role === 'admin') {
      baseTabs.push({ id: 'reports', name: 'Reports' })
    }

    return baseTabs
  }

  const tabs = getAvailableTabs()

  const [reportStudentSessionCount, setReportStudentSessionCount] = useState(0)
  const [reportStaffMarkedCount, setReportStaffMarkedCount] = useState(0)

  useEffect(() => {
    const fetchReportCounts = async () => {
      try {
        if (!userProfile?.stream_id) return

        const { count: studentSessionsCount, error: studentSessionsError } = await supabase
          .from('period_attendance')
          .select('*, classes!inner(stream_id)', { count: 'exact', head: true })
          .eq('is_marked', true)
          .eq('classes.stream_id', userProfile.stream_id)

        if (studentSessionsError) throw studentSessionsError
        setReportStudentSessionCount(studentSessionsCount || 0)

        const { count: staffMarkedCount, error: staffMarkedError } = await supabase
          .from('staff_attendance')
          .select('*, users!inner(stream_id)', { count: 'exact', head: true })
          .eq('users.stream_id', userProfile.stream_id)

        if (staffMarkedError) throw staffMarkedError
        setReportStaffMarkedCount(staffMarkedCount || 0)
      } catch (err) {
        console.error('Error fetching report counts:', err)
        setReportStudentSessionCount(0)
        setReportStaffMarkedCount(0)
      }
    }

    fetchReportCounts()
  }, [userProfile, classes])

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Animated Hero Section */}
        <div className="mb-6 sm:mb-10 animate-fadeIn">
          <AnimatedHeroText 
            staticText={`${greeting},`}
            words={["SMART PRESENCE", "Track", "Manage", "Analyze", "Visualize"]}
          />
          <p className="text-gray-300 text-sm sm:text-lg mt-3 sm:mt-4 max-w-2xl">
            Hey, <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400 bg-clip-text text-transparent font-semibold">{userProfile?.name}</span> 👋 — track attendance, manage classes, and see insights in one place.
          </p>
          <div className="mt-3 flex items-center gap-2">
            {userProfile?.role && (
              <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs sm:text-sm font-semibold tracking-wide">
                {userProfile.role.toUpperCase()}
              </span>
            )}
            {stream?.code && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs sm:text-sm font-semibold tracking-wide">
                {stream.code}
              </span>
            )}
          </div>
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

                  {/* Student Attendance Records */}
                   <div className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 rounded-xl p-3 sm:p-6 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-500 hover:scale-105 cursor-pointer">
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <p className="text-gray-400 text-xs sm:text-sm font-semibold uppercase tracking-wide">Student Reports</p>
                       <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 group-hover:from-blue-500/30 group-hover:to-cyan-500/30 rounded-lg flex items-center justify-center transition-all duration-300">
                         <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:text-blue-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                         </svg>
                       </div>
                     </div>
                     <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-blue-400 group-hover:to-cyan-400 transition-all duration-300 mb-1">{studentAttendanceCount}</h3>
                     <p className="text-xs sm:text-sm text-gray-500">Today</p>
                   </div>

                   {/* Staff Attendance Records */}
                   <div className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 rounded-xl p-3 sm:p-6 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-500 hover:scale-105 cursor-pointer">
                     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <p className="text-gray-400 text-xs sm:text-sm font-semibold uppercase tracking-wide">Staff Reports</p>
                       <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-500/20 to-amber-500/20 group-hover:from-orange-500/30 group-hover:to-amber-500/30 rounded-lg flex items-center justify-center transition-all duration-300">
                         <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white group-hover:text-orange-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M7 20H2v-2a3 3 0 015.856-1.487M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zM5 7a2 2 0 11-4 0 2 2 0 014 0z" />
                         </svg>
                       </div>
                     </div>
                     <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-orange-400 group-hover:to-amber-400 transition-all duration-300 mb-1">{staffAttendanceCount}</h3>
                     <p className="text-xs sm:text-sm text-gray-500">Today</p>
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

                {/* Dashboard Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    {(() => {
                      const streamClassIds = classes.filter(c => c.stream_id === userProfile?.stream_id).map(c => c.id)
                      const activeIds = new Set(
                        students
                          .filter(s => s.status === 'active' && streamClassIds.includes(s.class_id))
                          .map(s => s.id)
                      )
                      const filtered = periodStudentAttendance
                        .filter(pa => activeIds.has(pa.students?.id))
                        .map(pa => ({
                          date: pa.period_attendance?.date,
                          status: pa.status,
                          student_id: pa.students?.id
                        }))
                      return (
                        <NeoLineChart attendanceData={filtered} total={activeIds.size} />
                      )
                    })()}

                  <div className="bg-neo-surface border border-neo-border rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-2">Today's Attendance Status</h3>
                    <p className="text-sm text-gray-400 mb-6">Real-time distribution of active students</p>
                    
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
                           const streamClassIds = classes.filter(c => c.stream_id === userProfile?.stream_id).map(c => c.id)
                           const activeIds = new Set(students.filter(s => s.status === 'active' && streamClassIds.includes(s.class_id)).map(s => s.id))
                           const today = new Date().toISOString().split('T')[0]
                           const todayAttendance = periodStudentAttendance.filter(pa => pa.period_attendance?.date === today)
                           const byStudent = new Map()
                           for (const r of todayAttendance) {
                             const id = r.students?.id
                             if (!id || !activeIds.has(id)) continue
                             const prev = byStudent.get(id) || 'unmarked'
                             const curr = r.status
                             let next = prev
                             if (curr === 'present') next = 'present'
                             else if (curr === 'on_duty' && prev !== 'present') next = 'on_duty'
                             else if (curr === 'absent' && prev !== 'present' && prev !== 'on_duty') next = 'absent'
                             byStudent.set(id, next)
                           }
                           let presentCount = 0
                           let absentCount = 0
                           let onDutyCount = 0
                           for (const v of byStudent.values()) {
                             if (v === 'present') presentCount++
                             else if (v === 'on_duty') onDutyCount++
                             else if (v === 'absent') absentCount++
                           }
                           const total = activeIds.size || 1
                           
                           const presentPercent = (presentCount / total) * 100
                           const absentPercent = (absentCount / total) * 100
                           const onDutyPercent = (onDutyCount / total) * 100
                           const notMarkedPercent = (Math.max(0, total - presentCount - absentCount - onDutyCount) / total) * 100
                          
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
                              {/* Present - Green */}
                              {presentPercent > 0 && (
                                <path d={createArc(presentPercent, '#10b981')} fill="#10b981" filter="url(#shadow)" className="hover:opacity-80 transition-opacity cursor-pointer"/>
                              )}
                              {/* On Duty - Blue */}
                              {onDutyPercent > 0 && (
                                <path d={createArc(onDutyPercent, '#3b82f6')} fill="#3b82f6" filter="url(#shadow)" className="hover:opacity-80 transition-opacity cursor-pointer"/>
                              )}
                              {/* Absent - Red */}
                              {absentPercent > 0 && (
                                <path d={createArc(absentPercent, '#ef4444')} fill="#ef4444" filter="url(#shadow)" className="hover:opacity-80 transition-opacity cursor-pointer"/>
                              )}
                              {/* Not Marked - Gray */}
                              {notMarkedPercent > 0 && (
                                <path d={createArc(notMarkedPercent, '#9ca3af')} fill="#9ca3af" filter="url(#shadow)" className="hover:opacity-80 transition-opacity cursor-pointer"/>
                              )}
                              
                              {/* Center circle */}
                              <circle cx="100" cy="100" r="45" fill="#111827"/>
                              
                              {/* Center text */}
                              <text x="100" y="95" textAnchor="middle" className="text-2xl font-bold fill-white">{presentCount}</text>
                              <text x="100" y="110" textAnchor="middle" className="text-xs fill-gray-400">Present</text>
                            </>
                          )
                        })()}
                      </svg>
                    </div>
                    
                    {/* Legend */}
                     <div className="space-y-3">
                       {(() => {
                         const streamClassIds = classes.filter(c => c.stream_id === userProfile?.stream_id).map(c => c.id)
                         const activeIds = new Set(students.filter(s => s.status === 'active' && streamClassIds.includes(s.class_id)).map(s => s.id))
                         const today = new Date().toISOString().split('T')[0]
                         const todayAttendance = periodStudentAttendance.filter(pa => pa.period_attendance?.date === today)
                         const agg = new Map()
                         for (const r of todayAttendance) {
                           const id = r.students?.id
                           if (!id || !activeIds.has(id)) continue
                           const prev = agg.get(id) || 'unmarked'
                           const curr = r.status
                           let next = prev
                           if (curr === 'present') next = 'present'
                           else if (curr === 'on_duty' && prev !== 'present') next = 'on_duty'
                           else if (curr === 'absent' && prev !== 'present' && prev !== 'on_duty') next = 'absent'
                           agg.set(id, next)
                         }
                         let presentCount = 0
                         let absentCount = 0
                         let onDutyCount = 0
                         for (const v of agg.values()) {
                           if (v === 'present') presentCount++
                           else if (v === 'on_duty') onDutyCount++
                           else if (v === 'absent') absentCount++
                         }
                         const total = activeIds.size || 1
                         const notMarkedCount = Math.max(0, total - presentCount - absentCount - onDutyCount)
                         
                         return (
                           <>
                             <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                 <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                 <span className="text-sm text-gray-300">Present</span>
                               </div>
                               <div className="flex items-center gap-2">
                                 <span className="text-sm font-bold text-white">{presentCount}</span>
                                 <span className="text-xs text-green-500 font-semibold">
                                   {Math.round((presentCount / total) * 100)}%
                                 </span>
                               </div>
                             </div>
                             
                             <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                 <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                 <span className="text-sm text-gray-300">On Duty</span>
                               </div>
                               <div className="flex items-center gap-2">
                                 <span className="text-sm font-bold text-white">{onDutyCount}</span>
                                 <span className="text-xs text-blue-500 font-semibold">
                                   {Math.round((onDutyCount / total) * 100)}%
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
                             
                             <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                 <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                                 <span className="text-sm text-gray-300">Not Marked</span>
                               </div>
                               <div className="flex items-center gap-2">
                                 <span className="text-sm font-bold text-white">{notMarkedCount}</span>
                                 <span className="text-xs text-gray-400 font-semibold">
                                   {Math.round((notMarkedCount / total) * 100)}%
                                 </span>
                               </div>
                             </div>
                           </>
                         )
                       })()}
                     </div>
                  </div>
                  </div>
                  <div>
                    <NeoCard title="Participants" subtitle="Recent users in your stream">
                      <div className="flex -space-x-3 mb-4">
                        {users.filter(u => u.stream_id === userProfile?.stream_id).slice(0, 6).map(u => (
                          <div key={u.id} className={`w-10 h-10 rounded-full border-2 ${onlineUsers?.has(u.id) ? 'border-neo-lime' : 'border-neo-border'} bg-black/40 flex items-center justify-center text-white text-xs`}> 
                            {String(u.name || 'U').slice(0,1).toUpperCase()}
                          </div>
                        ))}
                      </div>
                      <button className="px-3 py-2 rounded-xl bg-black/30 border border-neo-border text-white text-sm">View all</button>
                    </NeoCard>
                    <NeoCard title="Last actions" subtitle="Recent attendance entries">
                      <div className="space-y-3">
                        {periodStudentAttendance.slice(0, 6).map((r, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${r.status === 'present' ? 'bg-neo-lime' : r.status === 'on_duty' ? 'bg-blue-500' : 'bg-red-500'}`}></span>
                              <span className="text-white text-sm font-semibold">{r.students?.name || r.students?.roll_number || 'Student'}</span>
                            </div>
                            <span className="text-neo-subtext text-sm">{new Date(r.period_attendance?.date).toLocaleDateString('en-GB')}</span>
                          </div>
                        ))}
                      </div>
                    </NeoCard>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'shortreport' && (
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Short Report</h2>
                  <p className="text-gray-400">
                    {userProfile?.role === 'admin' 
                      ? 'Daily attendance summary by stream and class' 
                      : `Daily attendance summary for ${streams.find(s => s.id === userProfile?.stream_id)?.code || 'your stream'}`
                    }
                  </p>
                </div>

                {/* Report Form */}
                <div className="bg-gray-900 border border-white/20 rounded-xl p-6">
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Stream</label>
                      <div className="px-4 py-3 bg-gray-900 border-2 border-white/30 rounded-lg text-gray-400 cursor-not-allowed opacity-75">
                        {streams.find(s => s.id === shortReportStream)?.name ||
                          streams.find(s => s.id === userProfile?.stream_id)?.name ||
                          'Computer Science and Engineering'}
                      </div>
                      <input type="hidden" value={shortReportStream || userProfile?.stream_id || 'cse'} />
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
                        <span className="text-2xl">🎓</span>
                        <h3 className="text-xl font-bold text-white">Stream: {shortReportData.stream?.name}</h3>
                        {userProfile?.is_pc && userProfile?.role !== 'admin' && (
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

                    {/* Classes Report */}
                    <div className="space-y-6">
                      {shortReportData.classes.map((cls, index) => (
                        <div key={index} className="bg-black/30 rounded-lg p-6 border border-white/10">
                          {/* Class Header */}
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl">➕</span>
                            <h4 className="text-lg font-bold text-white">
                              {cls.name}: {shortReportData.stream?.code} {cls.present}/{cls.total}
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
                        Reported by: <span className="text-white font-semibold">Dean, {shortReportData.stream?.code}</span>
                      </p>
                    </div>

                    {/* Copy Button */}
                    <div className="mt-6">
                      <button
                        onClick={() => {
                          const reportText = `☀️Stream: ${shortReportData.stream?.name}\n☀️Date: ${new Date(shortReportData.date).toLocaleDateString('en-GB')}\n\n${shortReportData.classes.map(cls => 
                            `➕${cls.name}: ${shortReportData.stream?.code}  ${cls.present}/${cls.total}\n${cls.approved > 0 ? `📍Approved: ${String(cls.approved).padStart(2, '0')}\n` : ''}${cls.unapproved > 0 ? `📍Unapproved: ${String(cls.unapproved).padStart(2, '0')}\n` : ''}${cls.onDuty > 0 ? `📍OD: ${String(cls.onDuty).padStart(2, '0')}\n` : ''}${cls.suspended > 0 ? `📍Suspend: ${String(cls.suspended).padStart(2, '0')}\n` : ''}${cls.intern > 0 ? `📍Intern: ${String(cls.intern).padStart(2, '0')}\n` : ''}`
                          ).join('\n')}\n\nReported by: Dean, ${shortReportData.stream?.code}`
                          
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
                    <p className="text-gray-400 text-lg">Select a date to generate the short report for your stream</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'streams' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Streams</h2>
                  <div className="text-gray-400 text-sm">
                    Streams are predefined: CSE, ECE, EEE, MECH, CIVIL
                  </div>
                </div>

                {/* Display predefined streams */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {streams.map(stream => (
                    <div key={stream.id} className="bg-gray-900 border border-gray-700 p-6 rounded-lg">
                      <h3 className="text-lg font-bold text-white mb-2">{stream.code}</h3>
                      <p className="text-gray-300 text-sm">{stream.name}</p>
                      <div className="mt-4 text-xs text-gray-500">
                        Classes: {classes.filter(c => c.stream_id === stream.id).length}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {activeTab === 'classes' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Classes</h2>
                  <button
                    onClick={() => setShowForm({ ...showForm, class: !showForm.class })}
                    className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-all duration-300 font-semibold"
                  >
                    Add Class
                  </button>
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
                        {streams.find(s => s.id === forms.class.streamId)?.name || 'Computer Science and Engineering'}
                      </div>
                      <input type="hidden" name="streamId" value={forms.class.streamId} required />
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
                            <button onClick={async () => {
                              if (confirm('Delete?')) {
                                await deleteClass(cls.id)
                                fetchPeriodAttendanceCount() // Refresh count after class deletion
                              }
                            }} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
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
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowForm({ ...showForm, timetable: !showForm.timetable })} 
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                    >
                      <span className="text-xl">+</span> Add Period
                    </button>
                    <button 
                      onClick={() => setShowForm({ ...showForm, bulkTimetable: !showForm.bulkTimetable })} 
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <span className="text-xl">📊</span> CSV Import (36 Periods)
                    </button>
                  </div>
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

                {showForm.bulkTimetable && (
                  <div className="glass-card p-6 animate-scaleIn hover-lift mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold gradient-text flex items-center gap-2">
                        <span className="text-3xl">📊</span>
                        CSV Import - Class Timetable
                      </h3>
                      <button 
                        onClick={() => setShowForm({ ...showForm, bulkTimetable: false })} 
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                    
                    {/* Class Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Select Class *</label>
                      <select
                        value={forms.timetable.classId}
                        onChange={(e) => setForms({ ...forms, timetable: { ...forms.timetable, classId: e.target.value }})}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white shadow-sm"
                        required
                      >
                        <option value="">Choose a class...</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name} ({cls.departments?.name})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* CSV Template Section */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
                      <p className="text-sm text-gray-800 mb-3 font-medium">
                        ✨ Upload a CSV file with timetable data
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-blue-600 shadow-sm">
                          ✓ day
                        </span>
                        <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-blue-600 shadow-sm">
                          ✓ period
                        </span>
                        <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-blue-600 shadow-sm">
                          ✓ subject_code
                        </span>
                        <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-blue-600 shadow-sm">
                          ✓ subject_name
                        </span>
                        <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-blue-600 shadow-sm">
                          ✓ faculty_name
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          // Download CSV template
                          const csvContent = `day,period,subject_code,subject_name,faculty_name,faculty_code,room_number,is_lab
Monday,1,CA(302),Computer Architecture,Mrs.I.Roshini,IR,R101,false
Monday,2,DS(302),Data Structures,Mr.Shivasankaran,SSS,R102,false
Monday,3,OOP(303),Object Oriented Programming,Ms.M.Benitta Mary,MBM,R103,true
Monday,4,DM(302),Discrete Mathematics,Mrs.R.TamilSelvi,RT,R104,false
Monday,5,ESS(301),Environmental Science,Dr.M.Kumaran,MK,R105,false
Monday,6,DPSD(301),Digital Principles,Ms.Sree Arthi D,DSA,R106,true
Tuesday,1,CA(302),Computer Architecture,Mrs.I.Roshini,IR,R101,false
Tuesday,2,DS(302),Data Structures,Mr.Shivasankaran,SSS,R102,false
Tuesday,3,OOP(303),Object Oriented Programming,Ms.M.Benitta Mary,MBM,R103,true
Tuesday,4,DM(302),Discrete Mathematics,Mrs.R.TamilSelvi,RT,R104,false
Tuesday,5,ESS(301),Environmental Science,Dr.M.Kumaran,MK,R105,false
Tuesday,6,DPSD(301),Digital Principles,Ms.Sree Arthi D,DSA,R106,true
Wednesday,1,CA(302),Computer Architecture,Mrs.I.Roshini,IR,R101,false
Wednesday,2,DS(302),Data Structures,Mr.Shivasankaran,SSS,R102,false
Wednesday,3,OOP(303),Object Oriented Programming,Ms.M.Benitta Mary,MBM,R103,true
Wednesday,4,DM(302),Discrete Mathematics,Mrs.R.TamilSelvi,RT,R104,false
Wednesday,5,ESS(301),Environmental Science,Dr.M.Kumaran,MK,R105,false
Wednesday,6,DPSD(301),Digital Principles,Ms.Sree Arthi D,DSA,R106,true
Thursday,1,CA(302),Computer Architecture,Mrs.I.Roshini,IR,R101,false
Thursday,2,DS(302),Data Structures,Mr.Shivasankaran,SSS,R102,false
Thursday,3,OOP(303),Object Oriented Programming,Ms.M.Benitta Mary,MBM,R103,true
Thursday,4,DM(302),Discrete Mathematics,Mrs.R.TamilSelvi,RT,R104,false
Thursday,5,ESS(301),Environmental Science,Dr.M.Kumaran,MK,R105,false
Thursday,6,DPSD(301),Digital Principles,Ms.Sree Arthi D,DSA,R106,true
Friday,1,CA(302),Computer Architecture,Mrs.I.Roshini,IR,R101,false
Friday,2,DS(302),Data Structures,Mr.Shivasankaran,SSS,R102,false
Friday,3,OOP(303),Object Oriented Programming,Ms.M.Benitta Mary,MBM,R103,true
Friday,4,DM(302),Discrete Mathematics,Mrs.R.TamilSelvi,RT,R104,false
Friday,5,ESS(301),Environmental Science,Dr.M.Kumaran,MK,R105,false
Friday,6,DPSD(301),Digital Principles,Ms.Sree Arthi D,DSA,R106,true
Saturday,1,CA(302),Computer Architecture,Mrs.I.Roshini,IR,R101,false
Saturday,2,DS(302),Data Structures,Mr.Shivasankaran,SSS,R102,false
Saturday,3,OOP(303),Object Oriented Programming,Ms.M.Benitta Mary,MBM,R103,true
Saturday,4,DM(302),Discrete Mathematics,Mrs.R.TamilSelvi,RT,R104,false
Saturday,5,ESS(301),Environmental Science,Dr.M.Kumaran,MK,R105,false
Saturday,6,DPSD(301),Digital Principles,Ms.Sree Arthi D,DSA,R106,true`

                          const blob = new Blob([csvContent], { type: 'text/csv' })
                          const url = window.URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = 'timetable_template.csv'
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                          window.URL.revokeObjectURL(url)
                          setToast({ message: '📥 CSV template downloaded!', type: 'success' })
                        }}
                        className="px-4 py-2 bg-gradient-blue text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-semibold text-sm flex items-center gap-2"
                      >
                        <span>📥</span>
                        Download CSV Template
                      </button>
                    </div>

                    {/* File Upload Section */}
                    <div className="space-y-4">
                      <div>
                        <input
                          id="timetable-csv-input"
                          type="file"
                          accept=".csv"
                          onChange={async (e) => {
                            const file = e.target.files[0]
                            if (!file) return
                            
                            if (!forms.timetable.classId) {
                              setToast({ message: 'Please select a class first!', type: 'error' })
                              return
                            }
                            
                            const reader = new FileReader()
                            reader.onload = async (event) => {
                              const text = event.target.result
                              const lines = text.split('\n').filter(line => line.trim())
                              const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
                              
                              // Validate headers
                              const requiredHeaders = ['day', 'period', 'subject_code', 'subject_name', 'faculty_name']
                              const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
                              
                              if (missingHeaders.length > 0) {
                                setToast({ message: `Missing required columns: ${missingHeaders.join(', ')}`, type: 'error' })
                                return
                              }
                              
                              let successCount = 0
                              let failCount = 0
                              
                              for (let i = 1; i < lines.length; i++) {
                                const values = lines[i].split(',').map(v => v.trim())
                                if (values.length !== headers.length) continue
                                
                                const row = {}
                                headers.forEach((header, index) => {
                                  row[header] = values[index]
                                })
                                
                                // Validate required fields
                                if (!row.day || !row.period || !row.subject_code || !row.subject_name || !row.faculty_name) {
                                  failCount++
                                  continue
                                }
                                
                                // Convert day name to number
                                const dayMap = {
                                  'monday': 1, 'mon': 1, '1': 1,
                                  'tuesday': 2, 'tue': 2, '2': 2,
                                  'wednesday': 3, 'wed': 3, '3': 3,
                                  'thursday': 4, 'thu': 4, '4': 4,
                                  'friday': 5, 'fri': 5, '5': 5,
                                  'saturday': 6, 'sat': 6, '6': 6
                                }
                                
                                const dayNumber = dayMap[row.day.toLowerCase()]
                                const periodNumber = parseInt(row.period)
                                
                                if (!dayNumber || !periodNumber || periodNumber < 1 || periodNumber > 6) {
                                  failCount++
                                  continue
                                }
                                
                                try {
                                  const { error } = await supabase
                                    .from('timetable')
                                    .insert([{
                                      class_id: forms.timetable.classId,
                                      day_of_week: dayNumber,
                                      period_number: periodNumber,
                                      subject_code: row.subject_code,
                                      subject_name: row.subject_name,
                                      faculty_name: row.faculty_name,
                                      faculty_code: row.faculty_code || null,
                                      is_lab: row.is_lab === 'true' || row.is_lab === '1' || row.is_lab === 'yes'
                                    }])
                                  
                                  if (error) {
                                    console.error('Error:', error)
                                    failCount++
                                  } else {
                                    successCount++
                                  }
                                } catch (err) {
                                  console.error('Error:', err)
                                  failCount++
                                }
                              }
                              
                              setToast({ 
                                message: `🎉 CSV import complete! Success: ${successCount}, Failed: ${failCount}`, 
                                type: successCount > 0 ? 'success' : 'error' 
                              })
                              
                              if (successCount > 0) {
                                setShowForm({ ...showForm, bulkTimetable: false })
                                window.location.reload()
                              }
                            }
                            reader.readAsText(file)
                          }}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                        />
                      </div>

                      {/* Import Button */}
                      <button
                        onClick={() => document.getElementById('timetable-csv-input').click()}
                        className="w-full px-6 py-4 bg-gradient-purple text-white rounded-xl hover:shadow-2xl hover:scale-105 font-bold text-lg transition-all relative overflow-hidden group"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          <span>📤</span>
                          Import Timetable
                        </span>
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
                      </button>
                    </div>

                    {/* Format Guide */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <h4 className="font-bold text-gray-800 mb-3">📝 Example CSV Format:</h4>
                      <div className="bg-white p-3 rounded text-xs font-mono overflow-x-auto border">
                        <div className="text-gray-700">
                          day,period,subject_code,subject_name,faculty_name,faculty_code,room_number,is_lab<br/>
                          Monday,1,CA(302),Computer Architecture,Mrs.I.Roshini,IR,R101,false<br/>
                          Monday,2,DS(302),Data Structures,Mr.Shivasankaran,SSS,R102,false<br/>
                          Monday,3,OOP(303),Object Oriented Programming,Ms.M.Benitta Mary,MBM,R103,true<br/>
                          Tuesday,1,DM(302),Discrete Mathematics,Mrs.R.TamilSelvi,RT,R104,false<br/>
                          ...
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                  
                <div className="grid grid-cols-1 gap-4 mb-6">
                  <div>
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
                </div>

                {selectedClassForTimetable ? (
                  <AdminTimetableView 
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

                {/* Bulk Delete Controls */}
                {selectedStudents.length > 0 && (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-red-400 font-medium">
                        {selectedStudents.length} student(s) selected
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleBulkDelete}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 font-semibold text-sm"
                        >
                          🗑️ Delete Selected
                        </button>
                        <button 
                          onClick={() => {setSelectedStudents([]); setSelectAll(false)}}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-300 font-semibold text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Delete All Button */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400 text-sm">
                      {students.filter(student => {
                        if (!studentSearchQuery) return true
                        const query = studentSearchQuery.toLowerCase()
                        return student.name.toLowerCase().includes(query) || 
                               student.roll_number.toLowerCase().includes(query)
                      }).length} student(s) found
                    </span>
                  </div>
                  <button 
                    onClick={handleDeleteAll}
                    className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition-all duration-300 font-semibold text-sm"
                  >
                    ⚠️ Delete All Students
                  </button>
                </div>

                <div className="mb-6">
                  <BulkStudentImport onImportComplete={refetchStudents} streams={streams} classes={classes} />
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
                        {getDepartmentForClass(forms.student.classId)}
                      </div>
                      <input type="hidden" name="streamId" value={forms.student.streamId} required />
                      <select value={forms.student.classId} onChange={(e) => {
                        const selectedClass = classes.find(c => c.id === e.target.value)
                        setForms({ 
                          ...forms, 
                          student: { 
                            ...forms.student, 
                            classId: e.target.value,
                            streamId: selectedClass?.stream_id || ''
                          }
                        })
                      }} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-600" required>
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
                        {getDepartmentForClass(forms.intern.classId)}
                      </div>
                      <input type="hidden" name="streamId" value={forms.intern.streamId} required />
                      <select value={forms.intern.classId} onChange={(e) => {
                        const selectedClass = classes.find(c => c.id === e.target.value)
                        setForms({ 
                          ...forms, 
                          intern: { 
                            ...forms.intern, 
                            classId: e.target.value,
                            streamId: selectedClass?.stream_id || ''
                          }
                        })
                      }} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-600" required>
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
                        {getDepartmentForClass(forms.suspended.classId)}
                      </div>
                      <input type="hidden" name="streamId" value={forms.suspended.streamId} required />
                      <select value={forms.suspended.classId} onChange={(e) => {
                        const selectedClass = classes.find(c => c.id === e.target.value)
                        setForms({ 
                          ...forms, 
                          suspended: { 
                            ...forms.suspended, 
                            classId: e.target.value,
                            streamId: selectedClass?.stream_id || ''
                          }
                        })
                      }} className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-600" required>
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
                        <th className="px-4 py-3 text-left text-gray-400">
                          <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                          />
                        </th>
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
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.id)}
                              onChange={() => handleSelectStudent(student.id)}
                              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                            />
                          </td>
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
                            <button onClick={async () => {
                              if (confirm('Delete?')) {
                                await deleteStudent(student.id)
                                fetchPeriodAttendanceCount() // Refresh count after deletion
                              }
                            }} className="text-red-500 hover:text-red-400">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">User Management</h2>
                    <p className="text-gray-400 text-sm mt-1">Manage user accounts and permissions</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        if (window.confirm('⚠️ Are you sure you want to delete your account? This action cannot be undone!')) {
                          const result = await deleteMyAccount()
                          if (result.success) {
                            setToast({ message: '✅ Account deleted successfully. You will be signed out.', type: 'success' })
                            // User will be automatically signed out
                            setTimeout(() => {
                              window.location.href = '/login'
                            }, 2000)
                          } else {
                            setToast({ message: '❌ Error deleting account: ' + result.error, type: 'error' })
                          }
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                    >
                      🗑️ Delete My Account
                    </button>
                  </div>
                </div>

                {/* Users Table */}
                <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800 border-b border-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-gray-400 font-semibold">Name</th>
                          <th className="px-4 py-3 text-left text-gray-400 font-semibold">Email</th>
                          <th className="px-4 py-3 text-left text-gray-400 font-semibold">Role</th>
                          <th className="px-4 py-3 text-left text-gray-400 font-semibold">Stream</th>
                          <th className="px-4 py-3 text-left text-gray-400 font-semibold">Created</th>
                          <th className="px-4 py-3 text-left text-gray-400 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users
                          .filter(user => {
                            // Show all users if current user is admin, or only same stream users if staff
                            if (userProfile?.role === 'admin') return true
                            return user.stream_id === userProfile?.stream_id
                          })
                          .map((user) => (
                          <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-800">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                  </div>
                                  {/* Online Status Indicator */}
                                  {onlineUsers.has(user.id) && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 border-2 border-gray-900 rounded-full animate-pulse shadow-lg"></div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-white">{user.name || 'Unknown'}</div>
                                  {user.id === userProfile?.id && (
                                    <div className="text-xs text-green-400 font-semibold">You</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-300">{user.email}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit ${
                                  user.role === 'admin' 
                                    ? 'bg-red-900/40 text-red-100 border border-red-700' 
                                    : 'bg-blue-900/40 text-blue-100 border border-blue-700'
                                }`}>
                                  <div className={`w-2 h-2 rounded-full ${user.role === 'admin' ? 'bg-red-400' : 'bg-blue-400'}`}></div>
                                  {user.role === 'admin' ? 'Administrator' : 'Staff'}
                                </span>
                                {user.is_pc && (
                                  <span className="px-3 py-1 bg-purple-900/40 text-purple-100 rounded-full text-xs font-semibold border border-purple-700 flex items-center gap-1.5 w-fit">
                                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                                    Program Coordinator
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs font-semibold">
                                {streams.find(s => s.id === user.stream_id)?.code || 'N/A'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-400 text-sm">
                              {new Date(user.created_at).toLocaleDateString('en-GB')}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {user.id !== userProfile?.id && (
                                  <>
                                    
                                    {/* PC Appointment Button */}
                                    {user.role !== 'admin' && (
                                      <button
                                        onClick={async () => {
                                          if (user.is_pc) {
                                            // Remove PC role
                                            if (window.confirm(`Remove ${user.name} as Program Coordinator?`)) {
                                              const result = await removePC(user.id)
                                              if (result.success) {
                                                setToast({ message: `${user.name} removed as Program Coordinator`, type: 'success' })
                                              } else {
                                                setToast({ message: 'Error removing PC: ' + result.error, type: 'error' })
                                              }
                                            }
                                          } else {
                                            // Appoint as PC
                                            if (window.confirm(`Appoint ${user.name} as Program Coordinator for ${streams.find(s => s.id === user.stream_id)?.code || 'this stream'}? This will remove PC role from others in the same stream.`)) {
                                              const result = await appointAsPC(user.id)
                                              if (result.success) {
                                                setToast({ message: `${user.name} appointed as Program Coordinator`, type: 'success' })
                                              } else {
                                                setToast({ message: 'Error appointing Program Coordinator: ' + result.error, type: 'error' })
                                              }
                                            }
                                          }
                                        }}
                                        className={`px-3 py-1 rounded text-xs transition-colors font-semibold ${
                                           user.is_pc 
                                             ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                             : 'bg-purple-600 text-white hover:bg-purple-700'
                                         }`}
                                        >
                                         {user.is_pc ? 'Remove PC' : 'Make PC'}
                                        </button>
                                    )}
                                    <button
                                      onClick={async () => {
                                        if (window.confirm(`Are you sure you want to delete ${user.name}'s account? This action cannot be undone!`)) {
                                          const result = await deleteUser(user.id)
                                          if (result.success) {
                                            setToast({ message: `User ${user.name} deleted successfully`, type: 'success' })
                                            fetchPeriodAttendanceCount() // Refresh count after user deletion
                                          } else {
                                            setToast({ message: 'Error deleting user: ' + result.error, type: 'error' })
                                          }
                                        }
                                      }}
                                      className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                                    >
                                      🗑️ Delete
                                    </button>
                                  </>
                                )}
                                {user.id === userProfile?.id && (
                                  <span className="px-3 py-1 bg-gray-600 text-gray-300 rounded text-xs cursor-not-allowed">
                                    Current User
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {users.length === 0 && (
                    <div className="p-8 text-center text-gray-400">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      <p className="text-lg font-semibold">No users found</p>
                      <p className="text-sm">Users will appear here once they sign up</p>
                    </div>
                  )}
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
                       <div className="text-sm text-gray-400 mb-1">Total Marked Sessions</div>
                       <div className="text-3xl font-bold text-white">{reportStudentSessionCount}</div>
                     </div>
                     <button onClick={async () => {
                       try {
                         console.log('📊 Fetching all student attendance records...')
                         
                         if (!userProfile?.stream_id) {
                           setToast({ message: 'Your account is not assigned to a stream', type: 'error' })
                           return
                         }
                         
                         console.log('🔍 Fetching records for stream:', userProfile.stream_id)
                         
                         // Get stream class IDs
                         const streamClassIds = classes
                           .filter(c => c.stream_id === userProfile.stream_id)
                           .map(c => c.id)
                         
                         if (streamClassIds.length === 0) {
                           setToast({ message: 'No classes found for your stream', type: 'info' })
                           return
                         }
                         
                         // Fetch all attendance records for this stream
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
                               stream_id
                             )
                           `)
                           .eq('is_marked', true)
                           .in('class_id', streamClassIds)
                           .order('date', { ascending: false })
                         
                         if (error) {
                           console.error('Supabase error:', error)
                           throw error
                         }
                         
                         console.log('Fetched data:', data?.length, 'records')
                         
                         if (!data || data.length === 0) {
                           setToast({ message: 'No attendance records found for your stream', type: 'info' })
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
                       <div className="text-sm text-gray-400 mb-1">Total Staff Marked</div>
                       <div className="text-3xl font-bold text-white">{reportStaffMarkedCount}</div>
                     </div>
                    <button onClick={() => {
                      const staffForStream = staffAttendance.filter(sa => sa.users?.stream_id === userProfile?.stream_id)
                      if (staffForStream.length > 0) {
                        generateAttendanceReport(staffForStream, 'staff')
                      } else {
                        setToast({ message: 'No staff attendance records found for your stream', type: 'info' })
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
