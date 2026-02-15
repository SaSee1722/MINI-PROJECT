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
import { LogoPremium } from '../components/Logo'
import NeoSidebar from '../components/NeoSidebar'
import NeoCard from '../components/NeoCard'
import NeoLineChart from '../components/NeoLineChart'
import BulkStudentImport from '../components/BulkStudentImport'
import InteractiveTimetable from '../components/InteractiveTimetable'
import AdminTimetableView from '../components/AdminTimetableView'
import DepartmentOverview from '../components/DepartmentOverview'
import Toast from '../components/Toast'
import { generateAttendanceReport, generatePeriodAttendanceReport, generateDailyConsolidatedReport } from '../utils/pdfGenerator'
import { 
  Users, 
  User as UserIcon, 
  LayoutDashboard, 
  Activity, 
  Globe, 
  Shield, 
  Settings, 
  Zap,
  Layout,
  Clock,
  Briefcase,
  FileText,
  UserCheck,
  ChevronRight,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

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

// Status Badge Helper Component
const StatusBadge = ({ label, value, color }) => {
  const colors = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    gray: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  }
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${colors[color] || colors.gray} transition-all duration-300`}>
      <div className={`w-1.5 h-1.5 rounded-full ${colors[color]?.split(' ')[1].replace('text-', 'bg-') || 'bg-gray-400'}`}></div>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      <span className="text-xs font-black ml-1">{value}</span>
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

// Session-wise Attendance Graph Component
const SessionAttendanceGraph = ({ sessionData }) => {
  const chartRef = useRef(null)
  
  if (!sessionData || sessionData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Activity size={48} className="mb-4 opacity-20" />
        <p className="font-bold uppercase tracking-widest text-xs">No attendance data for this date</p>
      </div>
    )
  }

  // Group by period_number and calculate average percentage
  const periodMap = new Map()
  sessionData.forEach(record => {
    const p = record.period_attendance
    if (!p) return
    const key = p.period_number
    if (!periodMap.has(key)) {
      periodMap.set(key, { sum: 0, count: 0 })
    }
    const pct = (p.present_count / p.total_students) * 100
    const val = periodMap.get(key)
    val.sum += pct
    val.count += 1
  })

  const periods = Array.from(periodMap.entries())
    .map(([num, data]) => ({
      period: num,
      percentage: Math.round(data.sum / data.count)
    }))
    .sort((a, b) => a.period - b.period)

  const maxVal = 100
  const points = periods.map((p, i) => ({
    x: (i * (380 / Math.max(1, periods.length - 1))) + 20,
    y: 180 - (p.percentage / maxVal) * 160
  }))

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div className="relative w-full h-full">
      <svg className="w-full h-full" viewBox="0 0 420 200" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="sessionGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(val => (
          <g key={val}>
            <line x1="20" y1={180 - (val/100)*160} x2="400" y2={180 - (val/100)*160} stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
            <text x="0" y={180 - (val/100)*160} fill="rgba(255,255,255,0.3)" fontSize="8" dominantBaseline="middle">{val}%</text>
          </g>
        ))}

        {/* Area fill */}
        {periods.length > 1 && (
          <path 
            d={`${path} L ${points[points.length-1].x} 180 L ${points[0].x} 180 Z`} 
            fill="url(#sessionGrad)" 
          />
        )}

        {/* Line */}
        <path 
          d={path} 
          stroke="#10b981" 
          strokeWidth="3" 
          fill="none" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
        />

        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#020617" stroke="#10b981" strokeWidth="2" />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">{periods[i].percentage}%</text>
            <text x={p.x} y="195" textAnchor="middle" fill="#64748b" fontSize="8" fontWeight="bold">P{periods[i].period}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

const AdminDashboardNew = () => {
  const [timetableRefreshKey, setTimetableRefreshKey] = useState(0)
  const { userProfile } = useAuth()
  const { students, addStudent, deleteStudent, refetch: refetchStudents } = useStudents()
  const { classes, addClass, deleteClass, refetch: refetchClasses } = useClasses()
  const { sessions, addSession, deleteSession } = useSessions()
  const { attendance: studentAttendance } = useStudentAttendance()
  const { attendance: staffAttendance } = useAttendance()
  const { timetable, addTimetableEntry, deleteTimetableEntry } = useTimetable()
  const { 
    users, 
    onlineUsers, 
    deleteUser, 
    deleteMyAccount, 
    updateUser, 
    appointAsHOD,
    removeHOD,
    appointAsClassAdvisor,
    removeClassAdvisor 
  } = useUsers()


  // Define the single stream (CSE)
  const streams = [
    { id: 'cse', name: 'Computer Science and Engineering', code: 'CSE' }
  ]

  const [activeTab, setActiveTab] = useState('overview')
  const [showForm, setShowForm] = useState({ dept: false, class: false, session: false, student: false, intern: false, suspended: false, timetable: false, bulkTimetable: false })
  const [periodAttendanceCount, setPeriodAttendanceCount] = useState(0)
  const [studentAttendanceCount, setStudentAttendanceCount] = useState(0)
  const [staffAttendanceCount, setStaffAttendanceCount] = useState(0)
  const [periodStudentAttendance, setPeriodStudentAttendance] = useState([])
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [toast, setToast] = useState(null)
  const [selectedClassView, setSelectedClassView] = useState(null)

  const [selectedStudents, setSelectedStudents] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [overviewDate, setOverviewDate] = useState(() => new Date().toISOString().split('T')[0])
  const [autoDateInitialized, setAutoDateInitialized] = useState(false)
  const [leaveRequests, setLeaveRequests] = useState([])
  const [loadingLeave, setLoadingLeave] = useState(false)
  const showOverviewCharts = true

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
      
      if (className.includes('AIML') || className.includes('AI ML') || className.includes('AI/ML') || className.includes('AI & ML')) {
        return 'Artificial Intelligence and Machine Learning'
      }
      if (className.includes('AIDS') || className.includes('AI DS') || className.includes('AI/DS') || className.includes('AI & DS')) {
        return 'Artificial Intelligence and Data Science'
      }
      if (className.includes('CYBER') || className.includes('CYBERSECURITY') || className.includes('CYBER SECURITY')) {
        return 'Cyber Security'
      }
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

  // Fetch Definitive Daily Attendance count for selected date
  const fetchDailyAttendanceCount = async () => {
    try {
      if (!userProfile?.id) return
      
      // Fetch all student attendance for the date
      const { data: studentData, error: studentError } = await supabase
        .from('daily_student_attendance')
        .select('id, class_id')
        .eq('date', overviewDate)
      
      if (studentError) throw studentError
      
      // Filter by stream for non-admin users
      let studentCount = 0
      if (userProfile.role === 'admin') {
        studentCount = studentData?.length || 0
      } else if (userProfile.stream_id && classes.length > 0) {
        const userStreamClasses = classes
          .filter(c => c.stream_id === userProfile.stream_id)
          .map(c => c.id)
        
        studentCount = studentData?.filter(record => 
          userStreamClasses.includes(record.class_id)
        ).length || 0
      }

      // Fetch all staff attendance for the date
      const { data: staffData, error: staffError } = await supabase
        .from('staff_attendance')
        .select('id, user_id')
        .eq('date', overviewDate)
      
      if (staffError) throw staffError
      
      // Filter by stream for non-admin users
      let staffCount = 0
      if (userProfile.role === 'admin') {
        staffCount = staffData?.length || 0
      } else if (userProfile.stream_id && users.length > 0) {
        const userStreamStaff = users
          .filter(u => u.stream_id === userProfile.stream_id)
          .map(u => u.id)
        
        staffCount = staffData?.filter(record => 
          userStreamStaff.includes(record.user_id)
        ).length || 0
      }

      const totalCount = studentCount + staffCount
      setPeriodAttendanceCount(totalCount)
      setStudentAttendanceCount(studentCount)
      setStaffAttendanceCount(staffCount)
    } catch (err) {
      console.error('Error fetching attendance count:', err)
      setPeriodAttendanceCount(0)
      setStudentAttendanceCount(0)
      setStaffAttendanceCount(0)
    }
  }

  const fetchLeaveRequests = async () => {
    try {
      setLoadingLeave(true)
      let query = supabase
        .from('student_leave_requests')
        .select('*')
        .order('created_at', { ascending: false })
      
      // If user is HOD, they should only see requests for their department
      if (userProfile?.is_hod && userProfile?.role !== 'admin') {
        query = query.eq('department_id', userProfile.stream_id)
      }

      const { data, error } = await query
      if (error && error.code !== 'PGRST116') throw error
      setLeaveRequests(data || [])
    } catch (err) {
      console.error('Error fetching leave requests:', err)
    } finally {
      setLoadingLeave(false)
    }
  }

  const handleLeaveAction = async (requestId, action) => {
    try {
      // HOD action: move to pending_admin
      // Admin action: move to approved
      let newStatus = ''
      if (action === 'approve') {
        newStatus = userProfile?.role === 'admin' ? 'approved' : 'pending_admin'
      } else {
        newStatus = 'rejected'
      }

      const { error } = await supabase
        .from('student_leave_requests')
        .update({ status: newStatus })
        .eq('id', requestId)
      
      if (error) throw error
      
      setToast({ message: `Request ${action}d successfully`, type: 'success' })
      fetchLeaveRequests()
    } catch (err) {
      setToast({ message: 'Error updating status', type: 'error' })
    }
  }

  // Fetch definitive daily student attendance data
  const fetchDailyStudentAttendance = async () => {
    try {
      if (!userProfile?.id) return
      
      // If there are no classes, just return empty array
      if (classes.length === 0) {
        setPeriodStudentAttendance([])
        return
      }
      
      // Fetch all recent daily attendance
      const { data, error } = await supabase
        .from('daily_student_attendance')
        .select(`
          *,
          students (id, name, roll_number, class_id, stream_id),
          classes (id, name, stream_id)
        `)
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (error) throw error
      
      // Filter client-side based on user role and stream
      let filteredData = data || []
      
      if (userProfile.role !== 'admin' && userProfile.stream_id) {
        // For non-admin users, filter by their stream
        const userStreamClasses = classes
          .filter(c => c.stream_id === userProfile.stream_id)
          .map(c => c.id)
        
        filteredData = filteredData.filter(record => 
          userStreamClasses.includes(record.class_id)
        )
      }
      
      setPeriodStudentAttendance(filteredData.slice(0, 20))
    } catch (err) {
      console.error('Error fetching daily student attendance:', err)
      setPeriodStudentAttendance([])
    }
  }

  // Auto-select latest marked date for this stream (run once after profile loads)
  const fetchLatestMarkedDate = async () => {
    try {
      if (!userProfile?.stream_id || autoDateInitialized) return
      // Try latest student period attendance first
      const { data: latestPeriod, error: latestPeriodError } = await supabase
        .from('period_attendance')
        .select('date, classes!inner(stream_id)')
        .eq('is_marked', true)
        .eq('classes.stream_id', userProfile.stream_id)
        .order('date', { ascending: false })
        .limit(1)
      if (latestPeriodError) throw latestPeriodError
      let latest = latestPeriod?.[0]?.date || null
      if (!latest) {
        // Fallback: check staff attendance
        const { data: latestStaff, error: latestStaffError } = await supabase
          .from('staff_attendance')
          .select('date, users!inner(stream_id)')
          .eq('users.stream_id', userProfile.stream_id)
          .order('date', { ascending: false })
          .limit(1)
        if (latestStaffError) throw latestStaffError
        latest = latestStaff?.[0]?.date || null
      }
      if (latest) {
        setOverviewDate(latest)
      }
      setAutoDateInitialized(true)
    } catch (err) {
      console.error('Error fetching latest marked date:', err)
      setAutoDateInitialized(true)
    }
  }

  // Fetch count when userProfile loads OR when attendance data changes
  useEffect(() => {
    if (userProfile?.stream_id) {
      fetchDailyAttendanceCount()
      fetchDailyStudentAttendance()
      fetchLeaveRequests()
      
      // Initialize forms with current stream
      setForms(prev => ({
        ...prev,
        class: { ...prev.class, streamId: userProfile.stream_id },
        student: { ...prev.student, streamId: userProfile.stream_id },
        intern: { ...prev.intern, streamId: userProfile.stream_id },
        suspended: { ...prev.suspended, streamId: userProfile.stream_id }
      }))
    }
  }, [userProfile, studentAttendance, staffAttendance, classes, students, users, overviewDate])

  useEffect(() => {
    if (!userProfile?.stream_id) return
    const channel = supabase
      .channel('admin-dashboard-attendance')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_student_attendance' }, () => {
        fetchDailyStudentAttendance()
        fetchDailyAttendanceCount()
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'period_attendance' },
        (payload) => {
          // Extract the date from the new/old row
          const dateStr = payload?.new?.date || payload?.old?.date
          if (dateStr) {
            // If user hasn’t manually chosen a date (auto mode) OR the new date is more recent, switch overview
            if (new Date(dateStr) > new Date(overviewDate)) {
              setOverviewDate(dateStr)
            }
          }
          fetchDailyStudentAttendance()
          fetchDailyAttendanceCount()
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        refetchStudents()
        fetchDailyStudentAttendance()
        fetchDailyAttendanceCount()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userProfile, overviewDate, autoDateInitialized])
  
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
          class_id: forms.timetable.classId,
          day_of_week: parseInt(forms.timetable.dayOfWeek),
          period_number: parseInt(forms.timetable.periodNumber),
          subject_code: forms.timetable.subjectCode,
          subject_name: forms.timetable.subjectName,
          faculty_name: forms.timetable.facultyName,
          faculty_code: forms.timetable.facultyCode || '',
          is_lab: forms.timetable.isLab
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
      
      if (type === 'timetable') {
        setTimetableRefreshKey(prev => prev + 1)
      }
      
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
    console.log('📊 Total classes in state:', classes.length)
    console.log('📊 Total students in state:', students.length)
    console.log('📊 Classes array:', classes)
    
    // Determine which stream to use (fallback to user stream or first available)
    const reportStream = shortReportStream || userProfile?.stream_id || (streams.length > 0 ? streams[0].id : null)
    
    console.log('📊 Report stream:', reportStream)
    console.log('📊 User profile stream_id:', userProfile?.stream_id)
    console.log('📊 shortReportStream:', shortReportStream)
    
    if (!reportStream) {
      setToast({ message: 'No department available', type: 'info' })
      return
    }
    
    console.log('🚀 Starting report generation...')

    setLoadingReport(true)
    try {
      // Get all classes for the selected stream
      // Priority 1: Match stream_id
      // Priority 2: Fallback to name-based identification for better resilience
      const streamInfo = streams.find(s => s.id.toLowerCase() === reportStream.toLowerCase())
      const streamCode = streamInfo?.code?.toLowerCase() || ''
      const streamName = streamInfo?.name?.toLowerCase() || ''
      
      console.log('📊 Stream info:', streamInfo)
      console.log('📊 Stream code:', streamCode)

      const streamClasses = classes.filter(c => {
        const cStreamId = c.stream_id?.toLowerCase()
        const cName = c.name?.toLowerCase()
        
        const matches = cStreamId === reportStream.toLowerCase() || 
               (streamCode && cName?.includes(streamCode)) ||
               (streamName && cName?.includes(streamName))
        
        console.log(`📊 Checking class "${c.name}": stream_id=[${c.stream_id}], matches=${matches}`)
        
        return matches
      })
      
      console.log(`📊 Report Generation: Found ${streamClasses.length} class nodes for stream [${reportStream}]`)
      console.log('📊 Filtered classes:', streamClasses)
      
      if (streamClasses.length === 0) {
        console.log('📋 ALL available classes:', classes)
        console.log('⚠️ No classes found for this stream!')
        setToast({ message: 'No classes found for this department', type: 'warning' })
        setLoadingReport(false)
        return
      }
      
      const reportData = {
        stream: streams.find(s => s.id.toLowerCase() === reportStream.toLowerCase()),
        date: shortReportDate,
        classes: []
      }

      for (const cls of streamClasses) {
        // Get all students in this class
        const classStudents = students.filter(s => s.class_id === cls.id)
        const totalStudents = classStudents.length
        
        console.log(`📊 Fetching attendance for class: ${cls.name} (ID: ${cls.id})`)
        console.log(`📊 Date: ${shortReportDate}`)
        
        // Get today's definitive daily attendance for this class
        let attendanceRecords = []
        try {
          const { data, error } = await supabase
            .from('daily_student_attendance')
            .select('*')
            .eq('class_id', cls.id)
            .eq('date', shortReportDate)

          if (error) {
            console.error('❌ Error fetching daily attendance:', error)
            throw error
          }
          
          attendanceRecords = data || []
          console.log(`✅ Found ${attendanceRecords.length} attendance records`)
        } catch (err) {
          console.error('❌ Failed to fetch attendance for class:', cls.name, err)
          // Continue with empty attendance records
        }

        let presentCount = 0
        let approvedAbsentCount = 0
        let unapprovedAbsentCount = 0
        let onDutyCount = 0

        attendanceRecords?.forEach(record => {
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
        })

        // Count suspended and intern students
        const suspendedCount = classStudents.filter(s => s.status === 'suspended').length
        const internCount = classStudents.filter(s => s.status === 'intern').length

        const classData = {
          name: cls.name,
          present: presentCount,
          total: totalStudents,
          approved: approvedAbsentCount,
          unapproved: unapprovedAbsentCount,
          onDuty: onDutyCount,
          suspended: suspendedCount,
          intern: internCount
        }
        
        console.log(`📊 Adding class to report:`, classData)
        reportData.classes.push(classData)
      }

      console.log(`📊 Final report data:`, reportData)
      console.log(`📊 Total classes in report: ${reportData.classes.length}`)

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
    const pendingLeaveCount = leaveRequests.filter(req => {
      const isHOD = userProfile?.is_hod
      const isAdmin = userProfile?.role === 'admin'
      return (isHOD && req.status === 'pending_hod') || (isAdmin && (req.status === 'pending_admin' || req.status === 'pending_hod'))
    }).length

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

    // Add Users tab for Admins, HODs, and PCs
    if (userProfile?.role === 'admin' || userProfile?.is_pc || userProfile?.is_hod) {
      baseTabs.push({ id: 'users', name: 'Users' })
    }

    // Add Leave Requests tab for Admins and HODs
    if (userProfile?.role === 'admin' || userProfile?.is_hod) {
      baseTabs.push({ id: 'leaveRequests', name: 'Leave Requests', badge: pendingLeaveCount })
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
  const [reportFromDate, setReportFromDate] = useState(() => new Date().toISOString().split('T')[0])
  const [reportToDate, setReportToDate] = useState(() => new Date().toISOString().split('T')[0])
  const [reportSelectedClass, setReportSelectedClass] = useState('')
  const [reportMode, setReportMode] = useState('daily') // 'daily' or 'range'
  const [reportDailySessions, setReportDailySessions] = useState([])
  const [reportDailyStaff, setReportDailyStaff] = useState([])

  useEffect(() => {
    const fetchReportCounts = async () => {
      try {
        if (!userProfile?.stream_id) return

        const { count: studentSessionsCount, error: studentSessionsError } = await supabase
          .from('period_attendance')
          .select('*, classes!class_id!inner(stream_id)', { count: 'exact', head: true })
          .eq('is_marked', true)
          .eq('classes.stream_id', userProfile.stream_id)

        if (studentSessionsError) throw studentSessionsError
        setReportStudentSessionCount(studentSessionsCount || 0)

        const { count: staffMarkedCount, error: staffMarkedError } = await supabase
          .from('staff_attendance')
          .select('*, users!user_id!inner(stream_id)', { count: 'exact', head: true })
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

  // Fetch sessions when mode, date, or class changes
  useEffect(() => {
    const fetchReportData = async () => {
       if (activeTab !== 'reports' || !reportFromDate) return
       
       try {
          // Fetch student periods
          let studentQuery = supabase
             .from('period_attendance')
             .select('*, timetable(subject_code, subject_name, faculty_name, faculty_code), classes(name, stream_id)')
             .eq('is_marked', true)

          if (reportMode === 'daily') {
             studentQuery = studentQuery.eq('date', reportFromDate)
          } else {
             studentQuery = studentQuery.gte('date', reportFromDate).lte('date', reportToDate)
          }
          
          if (reportSelectedClass) {
             studentQuery = studentQuery.eq('class_id', reportSelectedClass)
          } else {
             const streamClassIds = classes.filter(c => c.stream_id === userProfile?.stream_id).map(c => c.id)
             studentQuery = studentQuery.in('class_id', streamClassIds)
          }
          
          const { data: sData } = await studentQuery
          setReportDailySessions(sData || [])
          setReportStudentSessionCount(sData?.length || 0)

          // Fetch staff attendance
          let staffQuery = supabase
             .from('staff_attendance')
             .select('*, users!user_id!inner(name, stream_id)')
          
          if (reportMode === 'daily') {
             staffQuery = staffQuery.eq('date', reportFromDate)
          } else {
             staffQuery = staffQuery.gte('date', reportFromDate).lte('date', reportToDate)
          }
          
          staffQuery = staffQuery.eq('users.stream_id', userProfile?.stream_id)
          
          const { data: stData } = await staffQuery
          setReportDailyStaff(stData || [])
          setReportStaffMarkedCount(stData?.length || 0)
       } catch (err) {
          console.error('Error fetching report data:', err)
       }
    }
    fetchReportData()
  }, [activeTab, reportMode, reportFromDate, reportToDate, reportSelectedClass, userProfile, classes])

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
        {/* Animated Hero Section */}
        {/* Premium Dashboard Header */}
        <div className="relative mb-16 py-12 overflow-hidden rounded-[3rem] bg-[#020617] border border-white/5 shadow-2xl animate-smoothFadeIn px-10 group">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] -mr-60 -mt-60 animate-pulse transition-colors duration-1000 group-hover:bg-emerald-500/20"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -ml-40 -mb-40"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
            <div className="space-y-6 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Administrative Control</span>
              </div>
              
              <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-8 leading-[0.9]">
                {greeting},<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 animate-gradient whitespace-nowrap">
                  {userProfile?.name?.split(' ')[0]}
                </span>.
              </h1>
              
              <p className="text-gray-400 text-xl font-medium leading-relaxed max-w-lg">
                Your daily attendance overview is ready. Monitoring {students.length} students in CSE Department.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-8 border border-white/10 hover:bg-white/10 transition-all duration-500 group/item hover:scale-105">
                <Users size={24} className="text-emerald-400 mb-4 group-hover/item:scale-110 transition-transform" />
                <div className="text-3xl font-black text-white">{students.length}</div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Students</div>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-[2rem] p-8 border border-white/10 hover:bg-white/10 transition-all duration-500 group/item hover:scale-105">
                <Globe size={24} className="text-blue-400 mb-4 group-hover/item:scale-110 transition-transform" />
                <div className="text-3xl font-black text-white">{classes.length}</div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Classes</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#020617]/40 backdrop-blur-3xl rounded-[4rem] border border-white/5 mb-16 shadow-2xl overflow-hidden group/container hover:border-emerald-500/10 transition-colors duration-700">
          <div className="border-b border-white/5 px-8 pt-8 pb-4 bg-white/[0.01]">
            <nav className="flex overflow-x-auto gap-4 scrollbar-hide items-center justify-center">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative px-8 py-4 transition-all duration-700 rounded-[1.5rem] text-[10px] font-black tracking-[0.2em] uppercase overflow-hidden ${
                    activeTab === tab.id 
                    ? 'text-black bg-white shadow-2xl shadow-emerald-500/20' 
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {tab.name}
                    {tab.badge > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[8px] animate-pulse ${
                        activeTab === tab.id 
                        ? 'bg-black text-white' 
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </span>
                  {activeTab === tab.id && (
                    <div className="absolute inset-0 bg-gradient-to-br from-white via-emerald-50 to-emerald-100 rounded-[1.5rem] -z-0"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-8 sm:p-16">
            {activeTab === 'overview' && (
              <div className="space-y-16 animate-smoothFadeIn">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
                   <div className="space-y-4">
                      <div className="w-12 h-1.5 bg-emerald-500 rounded-full"></div>
                      <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">Attendance Overview</h2>
                      <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">Real-time statistics for CSE Department</p>
                   </div>
                     <div className="flex items-center gap-6">
                        <div className="text-right">
                           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Select Date</p>
                           <div className="relative group/date">
                              <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500/50 group-hover/date:text-emerald-400 transition-colors pointer-events-none" />
                              <input
                                 type="date"
                                 value={overviewDate}
                                 onChange={(e) => { setOverviewDate(e.target.value); setAutoDateInitialized(true) }}
                                 className="bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-2 text-white font-bold text-sm outline-none focus:border-emerald-500/50 transition-all cursor-pointer [color-scheme:dark]"
                              />
                           </div>
                        </div>
                     </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {/* Active Students */}
                  <div className="group relative bg-[#020617] border border-white/5 rounded-[2.5rem] p-10 hover:bg-white/[0.04] transition-all duration-500 overflow-hidden cursor-pointer">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors"></div>
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 mb-8 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-500">
                      <Users className="text-emerald-400 w-8 h-8" />
                    </div>
                    <h3 className="text-6xl font-black text-white mb-2 tracking-tighter">
                       {students.filter(s => s.status === 'active').length}
                    </h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Students</p>
                     <div className="mt-8 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">Online Now</span>
                     </div>
                  </div>

                  {/* Classes Card */}
                  <div className="group relative bg-[#020617] border border-white/5 rounded-[2.5rem] p-10 hover:bg-white/[0.04] transition-all duration-500 overflow-hidden cursor-pointer">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors"></div>
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 mb-8 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-500">
                      <LayoutDashboard className="text-blue-400 w-8 h-8" />
                    </div>
                    <h3 className="text-6xl font-black text-white mb-2 tracking-tighter">
                       {classes.length}
                    </h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Classes</p>
                     <div className="mt-8 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-[10px] font-black text-blue-500/60 uppercase tracking-widest">Total Classes</span>
                     </div>
                  </div>

                  {/* Staff Members */}
                   <div className="group relative bg-[#020617] border border-white/5 rounded-[2.5rem] p-10 hover:bg-white/[0.04] transition-all duration-500 overflow-hidden cursor-pointer">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-colors"></div>
                    <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 mb-8 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-500">
                      <UserCheck className="text-purple-400 w-8 h-8" />
                    </div>
                    <h3 className="text-6xl font-black text-white mb-2 tracking-tighter">
                       {users.filter(u => u.role === 'staff' && u.stream_id === userProfile?.stream_id).length}
                    </h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Staff Members</p>
                     <div className="mt-8 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span className="text-[10px] font-black text-purple-500/60 uppercase tracking-widest">Active Staff</span>
                     </div>
                  </div>

                  {/* Syncs */}
                  <div className="group relative bg-[#020617] border border-white/5 rounded-[2.5rem] p-10 hover:bg-white/[0.04] transition-all duration-500 overflow-hidden cursor-pointer">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-colors"></div>
                    <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 mb-8 group-hover:scale-110 group-hover:bg-orange-500/20 transition-all duration-500">
                      <Activity className="text-orange-400 w-8 h-8" />
                    </div>
                     <h3 className="text-6xl font-black text-white mb-2 tracking-tighter">
                        {studentAttendanceCount + staffAttendanceCount}
                     </h3>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Attendance Recorded</p>
                     <div className="mt-8 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        <span className="text-[10px] font-black text-orange-500/60 uppercase tracking-widest">Today's Data</span>
                     </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 font-black">
                   {/* Online Now */}
                   <div className="group relative bg-[#020617] border border-white/5 rounded-[2.5rem] p-8 hover:bg-white/[0.04] transition-all duration-500 hover:scale-[1.02] cursor-pointer">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20 group-hover:bg-cyan-500 group-hover:text-white transition-all duration-500 text-cyan-400">
                        <Globe size={24} className="animate-pulse" />
                      </div>
                       <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Active Now</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">{onlineUsers?.size || 0} Online</h4>
                      </div>
                    </div>
                   </div>

                   {/* Suspended */}
                   <div className="group relative bg-[#020617] border border-white/5 rounded-[2.5rem] p-8 hover:bg-white/[0.04] transition-all duration-500 hover:scale-[1.02] cursor-pointer">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 group-hover:bg-red-500 group-hover:text-white transition-all duration-500 text-red-400">
                        <Shield size={24} />
                      </div>
                       <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Suspended</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">{students.filter(s => s.status === 'suspended').length} Students</h4>
                      </div>
                    </div>
                   </div>

                   {/* Interns */}
                   <div className="group relative bg-[#020617] border border-white/5 rounded-[2.5rem] p-8 hover:bg-white/[0.04] transition-all duration-500 hover:scale-[1.02] cursor-pointer">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500 text-indigo-400">
                        <Settings size={24} />
                      </div>
                       <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Internships</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">{students.filter(s => s.status === 'intern').length} Interns</h4>
                      </div>
                    </div>
                   </div>

                   {/* System Health */}
                   <div className="group relative bg-[#020617] border border-white/5 rounded-[2.5rem] p-8 hover:bg-white/[0.04] transition-all duration-500 hover:scale-[1.02] cursor-pointer">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center border border-yellow-500/20 group-hover:bg-yellow-500 group-hover:text-white transition-all duration-500 text-yellow-400">
                        <Zap size={24} />
                      </div>
                       <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Platform Status</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter">System Online</h4>
                      </div>
                    </div>
                   </div>
                </div>

                {/* Quick Actions */}
                {/* Operational Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="group bg-white/[0.01] border border-white/5 rounded-[3rem] p-10 hover:bg-white/[0.03] transition-all duration-500 overflow-hidden relative border-l-emerald-500/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors"></div>
                    <div className="relative z-10">
                      <div className="w-16 h-16 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center mb-8 border border-emerald-500/10 group-hover:scale-110 transition-transform duration-500">
                        <FileText className="text-emerald-400 w-8 h-8" />
                      </div>
                       <h3 className="text-2xl font-black text-white mb-4 tracking-tighter">Attendance Reports</h3>
                      <p className="text-sm text-gray-500 mb-10 leading-relaxed font-medium">Generate detailed attendance reports and download PDF summaries for each department.</p>
                      <button 
                        onClick={() => setActiveTab('reports')} 
                        className="w-full py-5 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-400 transition-all duration-500 font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20"
                      >
                        Launch Reports
                        <Activity size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="group bg-white/[0.01] border border-white/5 rounded-[3rem] p-10 hover:bg-white/[0.03] transition-all duration-500 overflow-hidden relative border-l-blue-500/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors"></div>
                    <div className="relative z-10">
                      <div className="w-16 h-16 bg-blue-500/10 rounded-[1.5rem] flex items-center justify-center mb-8 border border-blue-500/10 group-hover:scale-110 transition-transform duration-500">
                        <UserCheck className="text-blue-400 w-8 h-8" />
                      </div>
                       <h3 className="text-2xl font-black text-white mb-4 tracking-tighter">Student Directory</h3>
                      <p className="text-sm text-gray-500 mb-10 leading-relaxed font-medium">Manage student enrollments, bulk import records, and update student profiles.</p>
                      <button 
                        onClick={() => setActiveTab('students')} 
                        className="w-full py-5 bg-blue-500 text-white rounded-2xl hover:bg-blue-400 transition-all duration-500 font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20"
                      >
                        View Students
                        <Users size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="group bg-white/[0.01] border border-white/5 rounded-[3rem] p-10 hover:bg-white/[0.03] transition-all duration-500 overflow-hidden relative border-l-purple-500/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-colors"></div>
                    <div className="relative z-10">
                      <div className="w-16 h-16 bg-purple-500/10 rounded-[1.5rem] flex items-center justify-center mb-8 border border-purple-500/10 group-hover:scale-110 transition-transform duration-500">
                        <Clock className="text-purple-400 w-8 h-8" />
                      </div>
                       <h3 className="text-2xl font-black text-white mb-4 tracking-tighter">Class Timetable</h3>
                      <p className="text-sm text-gray-500 mb-10 leading-relaxed font-medium">Configure class schedules and manage laboratory session timings for each semester.</p>
                      <button 
                        onClick={() => setActiveTab('timetable')} 
                        className="w-full py-5 bg-purple-500 text-white rounded-2xl hover:bg-purple-400 transition-all duration-500 font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-purple-500/20"
                      >
                        View Timetable
                        <Zap size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dashboard Layout */}
                {/* Analytical Matrix */}
                <div className={`grid gap-10 ${showOverviewCharts ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
                  <div className={showOverviewCharts ? 'lg:col-span-2 space-y-10' : 'hidden'}>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-black">
                      <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
                         <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-white tracking-tighter">Engagement Distribution</h3>
                         </div>
                        
                        <div className="flex flex-col items-center">
                          <div className="relative w-40 h-40 mb-10">
                             <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                {(() => {
                                   const streamClassIds = classes.filter(c => c.stream_id === userProfile?.stream_id).map(c => c.id)
                                   const activeIds = new Set(students.filter(s => s.status === 'active' && streamClassIds.includes(s.class_id)).map(s => s.id))
                                   const todayAttendance = periodStudentAttendance.filter(pa => pa.period_attendance?.date === overviewDate)
                                   const byStudent = new Map()
                                   for (const r of todayAttendance) {
                                     const id = (r.student_id || r.students?.id)
                                     if (!id || !activeIds.has(id)) continue
                                     const prev = byStudent.get(id) || 'unmarked'
                                     const curr = r.status
                                     let next = prev
                                     if (curr === 'present') next = 'present'
                                     else if (curr === 'on_duty' && prev !== 'present') next = 'on_duty'
                                     else if (curr === 'absent' && prev !== 'present' && prev !== 'on_duty') next = 'absent'
                                     byStudent.set(id, next)
                                   }
                                   let stats = { present: 0, absent: 0, on_duty: 0 }
                                   for (const v of byStudent.values()) stats[v]++
                                   const total = activeIds.size
                                   const unmarked = Math.max(0, total - stats.present - stats.absent - stats.on_duty)
                                   
                                   let offset = 0
                                   const createCircle = (val, color) => {
                                      const p = (val / total) * 100
                                      const circle = <circle key={color} cx="50" cy="50" r="40" fill="transparent" stroke={color} strokeWidth="12" strokeDasharray={`${p} ${100-p}`} strokeDashoffset={-offset} className="transition-all duration-1000" />
                                      offset += p
                                      return circle
                                   }
                                   return [
                                      createCircle(stats.present, '#10b981'),
                                      createCircle(stats.on_duty, '#3b82f6'),
                                      createCircle(stats.absent, '#ef4444'),
                                      <circle key="bg" cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="12" strokeDasharray={`${unmarked} ${100-unmarked}`} strokeDashoffset={-offset} />
                                   ]
                                })()}
                             </svg>
                             <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-white">
                                  {(() => {
                                    const streamClassIds = classes.filter(c => c.stream_id === userProfile?.stream_id).map(c => c.id)
                                    const activeIds = new Set(students.filter(s => s.status === 'active' && streamClassIds.includes(s.class_id)).map(s => s.id))
                                    const todayAttendance = periodStudentAttendance.filter(pa => pa.period_attendance?.date === overviewDate)
                                    const presents = new Set(todayAttendance.filter(pa => pa.status === 'present' && activeIds.has(pa.student_id || pa.students?.id)).map(pa => pa.student_id || pa.students?.id))
                                    return (presents.size / activeIds.size * 100).toFixed(0)
                                  })()}%
                                </span>
                                <span className="text-[8px] text-gray-500 uppercase tracking-widest font-black">Present</span>
                             </div>
                          </div>
                          
                          <div className="w-full space-y-4">
                             {['present', 'on_duty', 'absent'].map(type => {
                                const colors = { present: 'bg-emerald-500', on_duty: 'bg-blue-500', absent: 'bg-red-500' }
                                const labels = { present: 'Present', on_duty: 'On Duty', absent: 'Absent' }
                                return (
                                  <div key={type} className="flex items-center justify-between group/item">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-2 h-2 rounded-full ${colors[type]}`}></div>
                                      <span className="text-xs text-gray-400 group-hover/item:text-white transition-colors uppercase tracking-wider">{labels[type]}</span>
                                    </div>
                                    <span className="text-xs text-white">
                                       {(() => {
                                          const streamClassIds = classes.filter(c => c.stream_id === userProfile?.stream_id).map(c => c.id)
                                          const activeIds = new Set(students.filter(s => s.status === 'active' && streamClassIds.includes(s.class_id)).map(s => s.id))
                                          const todayAttendance = periodStudentAttendance.filter(pa => pa.period_attendance?.date === overviewDate)
                                          const filtered = todayAttendance.filter(pa => pa.status === type && activeIds.has(pa.student_id || pa.students?.id))
                                          const unique = new Set(filtered.map(pa => pa.student_id || pa.students?.id))
                                          return unique.size
                                       })()}
                                    </span>
                                  </div>
                                )
                             })}
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-10 relative overflow-hidden group">
                         <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl"></div>
                         <h3 className="text-xl font-black text-white tracking-tighter mb-8">Executive Snapshot</h3>
                         <div className="space-y-6">
                            {users.filter(u => u.stream_id === userProfile?.stream_id).slice(0, 4).map(u => (
                              <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-transparent hover:border-white/10 group/user">
                                 <div className="flex items-center gap-4">
                                    <div className="relative">
                                       <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-lg font-black">
                                          {u.name?.charAt(0).toUpperCase()}
                                       </div>
                                       {onlineUsers?.has(u.id) && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#0a0a0a] rounded-full"></div>}
                                    </div>
                                    <div>
                                       <h4 className="text-sm font-black text-white group-hover/user:text-blue-400 transition-colors">{u.name}</h4>
                                       <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{u.role}</p>
                                    </div>
                                 </div>
                                 <ChevronRight size={16} className="text-gray-600 group-hover/user:text-white transition-all transform group-hover:translate-x-1" />
                              </div>
                            ))}
                            <button onClick={() => setActiveTab('users')} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                               Audit Full Matrix
                            </button>
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-10">
                     <div className="bg-white/[0.01] border border-white/5 rounded-[3rem] p-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl"></div>
                        <h3 className="text-xl font-black text-white tracking-tighter mb-8 flex items-center gap-3">
                           <Activity size={20} className="text-orange-500" />
                           Recent Activity
                        </h3>
                        <div className="space-y-8">
                           {periodStudentAttendance.slice(0, 6).map((r, i) => (
                             <div key={i} className="flex items-start gap-4 group/entry">
                                <div className={`mt-1 w-2 h-2 rounded-full ring-4 ${r.status === 'present' ? 'bg-emerald-500 ring-emerald-500/10' : r.status === 'on_duty' ? 'bg-blue-500 ring-blue-500/10' : 'bg-red-500 ring-red-500/10'}`}></div>
                                <div className="flex-1">
                                   <h4 className="text-sm font-black text-white group-hover/entry:text-orange-400 transition-colors uppercase tracking-tight">{r.students?.name || 'Anonymous Student'}</h4>
                                   <div className="flex items-center justify-between mt-1">
                                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{r.status.replace('_', ' ')}</p>
                                      <p className="text-[10px] font-bold text-gray-600">{new Date(r.date || r.period_attendance?.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                                   </div>
                                </div>
                             </div>
                           ))}
                        </div>
                        <button onClick={() => setActiveTab('reports')} className="w-full mt-10 py-5 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-orange-500 hover:text-white transition-all duration-500 shadow-xl shadow-white/5 hover:shadow-orange-500/20">
                           Access Intelligence
                        </button>
                     </div>

                     <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-[3rem] p-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                        <div className="relative z-10">
                           <Shield size={40} className="text-white mb-6" />
                           <h3 className="text-2xl font-black text-white tracking-tighter mb-4">Institutional Shield</h3>
                           <p className="text-sm text-blue-100 leading-relaxed font-medium mb-8">Your session is secured with end-to-end data encryption. Maintain regular synchronization for optimal data integrity.</p>
                           <div className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                              System Integrity Optimal
                           </div>
                        </div>
                     </div>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'shortreport' && (
              <div className="space-y-10 animate-smoothFadeIn">
                {/* Section Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white tracking-tighter">Daily Intelligence</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">
                      {userProfile?.role === 'admin' 
                        ? 'Institutional synchronize summary' 
                        : `Departmental synchronize summary: ${streams.find(s => s.id === userProfile?.stream_id)?.code}`
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 p-2 rounded-2xl">
                    <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-black tracking-widest uppercase border border-emerald-500/20">
                      Real-time Feed
                    </div>
                  </div>
                </div>

                {/* Report Control Panel */}
                <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                  
                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                    <div className="md:col-span-5 space-y-4">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Academic Department</label>
                      <div className="relative group/input">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500/50 group-hover/input:text-emerald-400 transition-colors">
                          <Globe size={18} />
                        </div>
                        {userProfile?.role === 'admin' ? (
                          <select
                            value={shortReportStream || userProfile?.stream_id || ''}
                            onChange={(e) => {
                              setShortReportStream(e.target.value)
                              setShortReportData(null)
                            }}
                            className="w-full pl-14 pr-12 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-emerald-500/50 outline-none transition-all appearance-none cursor-pointer"
                          >
                            <option value="">Select Department</option>
                            {streams.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="w-full pl-14 pr-6 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm cursor-not-allowed">
                            {streams.find(s => s.id === shortReportStream)?.name ||
                              streams.find(s => s.id === userProfile?.stream_id)?.name ||
                              'Institutional Core'}
                          </div>
                        )}
                        <input type="hidden" value={shortReportStream || userProfile?.stream_id || 'cse'} />
                        {userProfile?.role === 'admin' && (
                          <ChevronRight size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500/30 rotate-90 pointer-events-none" />
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-4 space-y-4">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Target Timeline</label>
                         <div className="relative group/date">
                           <Calendar size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-500/50 group-hover/date:text-blue-400 transition-colors pointer-events-none" />
                           <input 
                             type="date" 
                             value={shortReportDate} 
                             onChange={(e) => setShortReportDate(e.target.value)} 
                             className="w-full pl-14 pr-12 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-blue-500/50 focus:bg-blue-500/5 outline-none transition-all duration-300 [color-scheme:dark]"
                           />
                         </div>
                    </div>

                    <div className="md:col-span-3">
                      <button 
                        onClick={generateShortReport} 
                        disabled={loadingReport}
                        className="w-full py-4 bg-white text-black rounded-2xl hover:bg-emerald-400 transition-all duration-500 font-black text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-3 shadow-xl shadow-white/5 disabled:opacity-30 disabled:grayscale"
                      >
                        {loadingReport ? (
                          <Activity size={18} className="animate-spin" />
                        ) : (
                          <>
                            <Zap size={18} />
                            Generate
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Intelligence Feed Display */}
                {shortReportData ? (
                  <div className="space-y-8">
                    <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-8 sm:p-12 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
                      
                      {/* Report Header Metadata */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6 border-b border-white/5 pb-10">
                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
                            <LogoPremium size="small" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-black text-white tracking-tight">{shortReportData.stream?.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-gray-500 font-bold text-xs uppercase tracking-widest">{new Date(shortReportData.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                              {userProfile?.is_pc && userProfile?.role !== 'admin' && (
                                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-md text-[8px] font-black uppercase tracking-widest border border-purple-500/20">
                                  PC Verified
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Authorization</span>
                          <span className="text-lg font-bold text-white">Dean, {shortReportData.stream?.code}</span>
                        </div>
                      </div>

                      {/* Departmental Units Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {shortReportData.classes.map((cls, index) => (
                          <div key={index} className="group bg-white/[0.03] border border-white/5 rounded-3xl p-8 hover:bg-white/[0.05] transition-all duration-500 relative">
                            <div className="flex items-center justify-between mb-8">
                              <div className="space-y-1">
                                <h4 className="text-xl font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors">{cls.name}</h4>
                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{shortReportData.stream?.code} Academic Class</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-black text-white leading-none">{cls.present}<span className="text-gray-600 mx-1">/</span>{cls.total}</div>
                                <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1">Synched Records</div>
                              </div>
                            </div>

                            {/* Status Indicators */}
                            <div className="flex flex-wrap gap-3">
                              <StatusBadge label="Approved" value={cls.approved} color="emerald" />
                              <StatusBadge label="Unapproved" value={cls.unapproved} color="orange" />
                              <StatusBadge label="On Duty" value={cls.onDuty} color="blue" />
                              <StatusBadge label="Restricted" value={cls.suspended} color="red" />
                              <StatusBadge label="Intern" value={cls.intern} color="gray" />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Copyable Feed Preview */}
                      <div className="mt-12 space-y-4">
                        <div className="flex items-center gap-2 ml-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                           <h4 className="text-[10px] font-black text-emerald-500/80 uppercase tracking-[0.2em]">Institutional Feed Preview</h4>
                        </div>
                        <div className="bg-black/60 border border-emerald-500/20 rounded-[2.5rem] p-10 relative group overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
                          <pre className="text-emerald-400/90 font-mono text-xs leading-relaxed whitespace-pre-wrap select-all">
                            {(() => {
                              const dateStr = new Date(shortReportData.date).toLocaleDateString('en-GB')
                              const streamName = shortReportData.stream?.name
                              const streamCode = shortReportData.stream?.code
                              
                              let text = `☀️Stream: ${streamName}\n☀️Date: ${dateStr}\n\n`
                              
                              if (shortReportData.classes && shortReportData.classes.length > 0) {
                                shortReportData.classes.forEach(cls => {
                                  text += `➕${cls.name}: ${streamCode}  ${cls.present}/${cls.total}\n`
                                  if (cls.approved > 0) text += `📍Approved: ${String(cls.approved).padStart(2, '0')}\n`
                                  if (cls.unapproved > 0) text += `📍Unapproved: ${String(cls.unapproved).padStart(2, '0')}\n`
                                  if (cls.onDuty > 0) text += `📍OD: ${String(cls.onDuty).padStart(2, '0')}\n`
                                  if (cls.suspended > 0) text += `📍Suspend: ${String(cls.suspended).padStart(2, '0')}\n`
                                  if (cls.intern > 0) text += `📍Intern: ${String(cls.intern).padStart(2, '0')}\n`
                                  text += '\n'
                                })
                              } else {
                                text += `[Daily Intelligence Cycle: No decentralized records found]\n\n`
                              }
                              
                              text += `Reported by: Dean, ${streamCode}.`
                              return text
                            })()}
                          </pre>
                          
                          <div className="mt-8 flex justify-end relative z-10">
                            <button
                              onClick={() => {
                                const dateStr = new Date(shortReportData.date).toLocaleDateString('en-GB')
                                const streamName = shortReportData.stream?.name
                                const streamCode = shortReportData.stream?.code
                                
                                let text = `☀️Stream: ${streamName}\n☀️Date: ${dateStr}\n\n`
                                shortReportData.classes.forEach(cls => {
                                  text += `➕${cls.name}: ${streamCode}  ${cls.present}/${cls.total}\n`
                                  if (cls.approved > 0) text += `📍Approved: ${String(cls.approved).padStart(2, '0')}\n`
                                  if (cls.unapproved > 0) text += `📍Unapproved: ${String(cls.unapproved).padStart(2, '0')}\n`
                                  if (cls.onDuty > 0) text += `📍OD: ${String(cls.onDuty).padStart(2, '0')}\n`
                                  if (cls.suspended > 0) text += `📍Suspend: ${String(cls.suspended).padStart(2, '0')}\n`
                                  if (cls.intern > 0) text += `📍Intern: ${String(cls.intern).padStart(2, '0')}\n`
                                  text += '\n'
                                })
                                text += `Reported by: Dean, ${streamCode}.`

                                navigator.clipboard.writeText(text)
                                setToast({ message: 'Institutional protocol cached to clipboard!', type: 'success' })
                              }}
                              className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-emerald-500/20 transition-all flex items-center gap-3"
                            >
                              <FileText size={16} />
                              Synchronize Digital Feed
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/[0.01] border border-white/5 border-dashed rounded-[3rem] p-20 text-center group">
                    <div className="w-20 h-20 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10 group-hover:scale-110 transition-transform duration-500">
                      <Layout size={40} className="text-gray-700" />
                    </div>
                    <h4 className="text-xl font-black text-gray-500 tracking-tight mb-2">Awaiting Timeline Selection</h4>
                    <p className="text-gray-600 font-bold text-xs uppercase tracking-widest">Select target date to synchronize intelligence feed</p>
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
              <div className="space-y-10 animate-smoothFadeIn">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white tracking-tighter">Academic Classes</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">Configure and deploy institutional classes for students</p>
                  </div>
                  <button
                    onClick={() => setShowForm({ ...showForm, class: !showForm.class })}
                    className="group px-8 py-4 bg-white text-black rounded-2xl hover:bg-emerald-400 transition-all duration-500 font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-white/5"
                  >
                    <div className="p-1 bg-black/10 rounded-lg group-hover:rotate-90 transition-transform">
                      <Zap size={14} />
                    </div>
                    Provision New Class
                  </button>
                </div>

                {showForm.class && (
                  <form onSubmit={(e) => handleSubmit('class', e)} className="bg-white/[0.03] border border-white/10 p-10 rounded-[2.5rem] relative overflow-hidden animate-smoothFadeIn">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
                    <div className="grid md:grid-cols-2 gap-8 relative z-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Class Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g., III CSE A" 
                          value={forms.class.name} 
                          onChange={(e) => setForms({ ...forms, class: { ...forms.class, name: e.target.value }})} 
                          className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-emerald-500/50 outline-none transition-all" 
                          required 
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Assigned Stream</label>
                        <div className="w-full px-6 py-4 bg-white/[0.02] border border-white/5 rounded-2xl text-gray-400 font-bold tracking-tight text-sm flex items-center gap-3 cursor-not-allowed">
                          <Shield size={16} className="text-gray-600" />
                          {streams.find(s => s.id === forms.class.streamId)?.name || 'Institutional Default'}
                        </div>
                      </div>
                      <input type="hidden" name="streamId" value={forms.class.streamId} required />
                    </div>
                    <div className="mt-10 flex gap-4">
                      <button type="submit" className="px-8 py-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-400 transition-all font-black text-xs uppercase tracking-widest">Deploy Class</button>
                      <button type="button" onClick={() => setShowForm({ ...showForm, class: false })} className="px-8 py-4 bg-white/5 text-gray-400 rounded-2xl hover:bg-white/10 transition-all font-black text-xs uppercase tracking-widest">Abort</button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {classes.map((cls) => (
                    <div 
                      key={cls.id} 
                      onClick={() => setSelectedClassView(cls)}
                      className="group bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.04] transition-all duration-500 relative overflow-hidden cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-8">
                        <div className="w-14 h-14 bg-white/[0.05] rounded-2xl flex items-center justify-center border border-white/10 group-hover:border-emerald-500/30 transition-colors">
                          <Layout className="text-gray-400 group-hover:text-emerald-400 transition-colors" />
                        </div>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (confirm('Decommission this class?')) {
                              await deleteClass(cls.id)
                              fetchPeriodAttendanceCount()
                            }
                          }}
                          className="p-2 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Shield size={18} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-black text-white tracking-tight">{cls.name}</h3>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Academic Section</p>
                      </div>
                      
                      <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-between">
                         <div className="flex -space-x-3">
                            {students.filter(s => s.class_id === cls.id).slice(0, 3).map((_, i) => (
                              <div key={i} className="w-8 h-8 rounded-full bg-white/5 border-2 border-[#0f172a] flex items-center justify-center">
                                <Users size={12} className="text-gray-600" />
                              </div>
                            ))}
                         </div>
                         <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                           {students.filter(s => s.class_id === cls.id).length} Active Enrollment
                         </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'timetable' && (
              <div className="space-y-10 animate-smoothFadeIn">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white tracking-tighter">Class Timetable</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">Managing schedules and subject assignments for classes</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setShowForm({ ...showForm, timetable: !showForm.timetable })} 
                      className="group px-6 py-4 bg-white/[0.05] border border-white/10 text-white rounded-2xl hover:bg-white/[0.1] transition-all duration-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-3"
                    >
                      <Zap size={14} className="text-emerald-400" />
                      Add Entry
                    </button>
                  </div>
                </div>

                {showForm.timetable && (
                  <form onSubmit={(e) => handleSubmit('timetable', e)} className="bg-white/[0.03] border border-white/10 p-10 rounded-[2.5rem] relative overflow-hidden animate-smoothFadeIn">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
                    <h3 className="text-xl font-black text-white mb-8 tracking-tight flex items-center gap-3">
                      <Clock className="text-purple-400" />
                      Provision New Schedule Segment
                    </h3>
                    
                    <div className="grid md:grid-cols-3 gap-8 mb-8 relative z-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Select Class</label>
                        <select
                          value={forms.timetable.classId}
                          onChange={(e) => setForms({ ...forms, timetable: { ...forms.timetable, classId: e.target.value }})}
                          className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-purple-500/50 outline-none transition-all appearance-none cursor-pointer"
                          required
                        >
                          <option value="">Select Class</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Temporal Day</label>
                        <select
                          value={forms.timetable.dayOfWeek}
                          onChange={(e) => setForms({ ...forms, timetable: { ...forms.timetable, dayOfWeek: e.target.value }})}
                          className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-purple-500/50 outline-none transition-all appearance-none cursor-pointer"
                          required
                        >
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                            <option key={day} value={String(i + 1)}>{day}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Segment Index</label>
                        <select
                          value={forms.timetable.periodNumber}
                          onChange={(e) => setForms({ ...forms, timetable: { ...forms.timetable, periodNumber: e.target.value }})}
                          className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-purple-500/50 outline-none transition-all appearance-none cursor-pointer"
                          required
                        >
                          {[1,2,3,4,5,6].map(p => (
                            <option key={p} value={String(p)}>Segment {p}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-8 mb-8 relative z-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Module Code</label>
                        <input
                          type="text"
                          placeholder="e.g., CA-302"
                          value={forms.timetable.subjectCode}
                          onChange={(e) => setForms({ ...forms, timetable: { ...forms.timetable, subjectCode: e.target.value }})}
                          className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-purple-500/50 outline-none transition-all"
                          required
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Module Descriptor</label>
                        <input
                          type="text"
                          placeholder="Computer Architecture"
                          value={forms.timetable.subjectName}
                          onChange={(e) => setForms({ ...forms, timetable: { ...forms.timetable, subjectName: e.target.value }})}
                          className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-purple-500/50 outline-none transition-all"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 mb-8 relative z-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Faculty Name</label>
                        <input
                          type="text"
                          placeholder="e.g., Dr. Smith"
                          value={forms.timetable.facultyName}
                          onChange={(e) => setForms({ ...forms, timetable: { ...forms.timetable, facultyName: e.target.value }})}
                          className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-purple-500/50 outline-none transition-all"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="mt-10 flex gap-4">
                      <button type="submit" className="px-8 py-4 bg-purple-600 text-white rounded-2xl hover:bg-purple-500 transition-all font-black text-xs uppercase tracking-widest">Deploy Segment</button>
                      <button type="button" onClick={() => setShowForm({ ...showForm, timetable: false })} className="px-8 py-4 bg-white/5 text-gray-400 rounded-2xl hover:bg-white/10 transition-all font-black text-xs uppercase tracking-widest">Abort</button>
                    </div>
                  </form>
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
                    key={`timetable-${timetableRefreshKey}`}
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
              <div className="space-y-10 animate-smoothFadeIn">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white tracking-tighter">Student Directory</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">Manage student profiles, internships and academic status</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowForm({ ...showForm, student: !showForm.student, intern: false, suspended: false })} 
                      className="px-6 py-4 bg-white text-black rounded-2xl hover:bg-emerald-400 transition-all duration-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-white/5"
                    >
                      <Zap size={14} />
                      Add Student
                    </button>
                    <button 
                      onClick={() => setShowForm({ ...showForm, intern: !showForm.intern, student: false, suspended: false })} 
                      className="px-6 py-4 bg-white/[0.05] border border-white/10 text-white rounded-2xl hover:bg-white/[0.1] transition-all duration-500 font-black text-[10px] uppercase tracking-widest"
                    >
                      Intern
                    </button>
                    <button 
                      onClick={() => setShowForm({ ...showForm, suspended: !showForm.suspended, student: false, intern: false })} 
                      className="px-6 py-4 bg-white/[0.05] border border-white/10 text-white rounded-2xl hover:bg-white/[0.1] transition-all duration-500 font-black text-[10px] uppercase tracking-widest"
                    >
                      Suspend
                    </button>
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-emerald-400 transition-colors">
                    <Globe size={18} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search students by name or roll number..." 
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="w-full pl-16 pr-6 py-5 bg-white/[0.03] border border-white/10 rounded-[2rem] text-white font-bold tracking-tight text-sm focus:border-emerald-500/50 focus:bg-emerald-500/5 outline-none transition-all duration-300"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/[0.05] px-3 py-1 rounded-full border border-white/5">
                      {students.length} Records Found
                    </span>
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/5 rounded-[3rem] p-8">
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
                  <form onSubmit={(e) => handleSubmit('student', e)} className="bg-white/[0.03] border border-white/10 p-10 rounded-[2.5rem] relative overflow-hidden animate-smoothFadeIn">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
                    <h3 className="text-xl font-black text-white mb-8 tracking-tight flex items-center gap-3">
                      <UserIcon className="text-emerald-400" />
                      Register New Student
                    </h3>
                    <div className="grid md:grid-cols-2 gap-8 relative z-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Identity Hash (Roll No)</label>
                        <input type="text" placeholder="e.g., 21CS001" value={forms.student.rollNumber} onChange={(e) => setForms({ ...forms, student: { ...forms.student, rollNumber: e.target.value }})} className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-emerald-500/50 outline-none transition-all" required />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Full Label (Name)</label>
                        <input type="text" placeholder="e.g., John Doe" value={forms.student.name} onChange={(e) => setForms({ ...forms, student: { ...forms.student, name: e.target.value }})} className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-emerald-500/50 outline-none transition-all" required />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Assigned Class</label>
                        <select value={forms.student.classId} onChange={(e) => {
                          const selectedClass = classes.find(c => c.id === e.target.value)
                          setForms({ ...forms, student: { ...forms.student, classId: e.target.value, streamId: selectedClass?.stream_id || '' }})
                        }} className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-emerald-500/50 outline-none transition-all appearance-none cursor-pointer" required>
                          <option value="">Select Class</option>
                          {classes.map((cls) => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-10 flex gap-4">
                      <button type="submit" className="px-8 py-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-400 transition-all font-black text-xs uppercase tracking-widest">Add Student</button>
                      <button type="button" onClick={() => setShowForm({ ...showForm, student: false })} className="px-8 py-4 bg-white/5 text-gray-400 rounded-2xl hover:bg-white/10 transition-all font-black text-xs uppercase tracking-widest">Abort</button>
                    </div>
                  </form>
                )}


                {/* Intern Form */}
                {showForm.intern && (
                  <form onSubmit={(e) => handleSubmit('intern', e)} className="bg-white/[0.03] border border-white/10 p-10 rounded-[2.5rem] relative overflow-hidden animate-smoothFadeIn">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
                    <div className="grid md:grid-cols-2 gap-8 relative z-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Roll Number</label>
                        <input 
                          type="text" 
                          placeholder="e.g., 21CS001" 
                          value={forms.intern.rollNumber} 
                          onChange={(e) => setForms({ ...forms, intern: { ...forms.intern, rollNumber: e.target.value }})} 
                          className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-purple-500/50 outline-none transition-all" 
                          required 
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Student Name</label>
                        <input 
                          type="text" 
                          placeholder="Full Name" 
                          value={forms.intern.name} 
                          onChange={(e) => setForms({ ...forms, intern: { ...forms.intern, name: e.target.value }})} 
                          className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-purple-500/50 outline-none transition-all" 
                          required 
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Assigned Stream</label>
                        <div className="w-full px-6 py-4 bg-white/[0.02] border border-white/5 rounded-2xl text-gray-400 font-bold tracking-tight text-sm flex items-center gap-3 cursor-not-allowed">
                          <Shield size={16} className="text-gray-600" />
                          {streams.find(s => s.id === forms.intern.streamId)?.name || 'Institutional Default'}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Class Assignment</label>
                        <select 
                          value={forms.intern.classId} 
                          onChange={(e) => setForms({ ...forms, intern: { ...forms.intern, classId: e.target.value }})} 
                          className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-purple-500/50 outline-none transition-all appearance-none cursor-pointer" 
                          required
                        >
                          <option value="">Select Class</option>
                          {classes.filter(c => c.stream_id === forms.intern.streamId).map(cls => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-10 flex gap-4">
                      <button type="submit" className="px-8 py-4 bg-purple-500 text-white rounded-2xl hover:bg-purple-400 transition-all font-black text-xs uppercase tracking-widest">Mark as Intern</button>
                      <button type="button" onClick={() => setShowForm({ ...showForm, intern: false })} className="px-8 py-4 bg-white/5 text-gray-400 rounded-2xl hover:bg-white/10 transition-all font-black text-xs uppercase tracking-widest">Abort</button>
                    </div>
                  </form>
                )}

                {/* Suspended Form */}
                {showForm.suspended && (
                  <form onSubmit={(e) => handleSubmit('suspended', e)} className="bg-white/[0.03] border border-white/10 p-10 rounded-[2.5rem] relative overflow-hidden animate-smoothFadeIn">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl"></div>
                    <div className="grid md:grid-cols-2 gap-8 relative z-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Roll Number</label>
                        <input 
                          type="text" 
                          placeholder="e.g., 21CS001" 
                          value={forms.suspended.rollNumber} 
                          onChange={(e) => setForms({ ...forms, suspended: { ...forms.suspended, rollNumber: e.target.value }})} 
                          className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-red-500/50 outline-none transition-all" 
                          required 
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Student Name</label>
                        <input 
                          type="text" 
                          placeholder="Full Name" 
                          value={forms.suspended.name} 
                          onChange={(e) => setForms({ ...forms, suspended: { ...forms.suspended, name: e.target.value }})} 
                          className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-red-500/50 outline-none transition-all" 
                          required 
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Assigned Stream</label>
                        <div className="w-full px-6 py-4 bg-white/[0.02] border border-white/5 rounded-2xl text-gray-400 font-bold tracking-tight text-sm flex items-center gap-3 cursor-not-allowed">
                          <Shield size={16} className="text-gray-600" />
                          {streams.find(s => s.id === forms.suspended.streamId)?.name || 'Institutional Default'}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Class Assignment</label>
                        <select 
                          value={forms.suspended.classId} 
                          onChange={(e) => setForms({ ...forms, suspended: { ...forms.suspended, classId: e.target.value }})} 
                          className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-red-500/50 outline-none transition-all appearance-none cursor-pointer" 
                          required
                        >
                          <option value="">Select Class</option>
                          {classes.filter(c => c.stream_id === forms.suspended.streamId).map(cls => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-10 flex gap-4">
                      <button type="submit" className="px-8 py-4 bg-red-500 text-white rounded-2xl hover:bg-red-400 transition-all font-black text-xs uppercase tracking-widest">Mark as Suspended</button>
                      <button type="button" onClick={() => setShowForm({ ...showForm, suspended: false })} className="px-8 py-4 bg-white/5 text-gray-400 rounded-2xl hover:bg-white/10 transition-all font-black text-xs uppercase tracking-widest">Abort</button>
                    </div>
                  </form>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-8 py-4 border-b border-white/5">
                    <div className="flex items-center gap-6">
                      <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="w-5 h-5 bg-white/5 border-white/10 rounded-lg" />
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Synchronization Map</span>
                    </div>
                    {selectedStudents.length > 0 && (
                      <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">
                        Decommission Selected ({selectedStudents.length})
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {students
                      .filter(student => {
                        if (!studentSearchQuery) return true
                        const query = studentSearchQuery.toLowerCase()
                        return student.name.toLowerCase().includes(query) || student.roll_number.toLowerCase().includes(query)
                      })
                      .map((student) => (
                        <div key={student.id} className="group bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-6 hover:bg-white/[0.04] transition-all duration-500">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                              <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => handleSelectStudent(student.id)} className="w-5 h-5 bg-white/5 border-white/10 rounded-lg group-hover:border-emerald-500/30" />
                              <div className="w-16 h-16 bg-white/[0.05] rounded-3xl flex items-center justify-center border border-white/10 group-hover:border-emerald-500/30 transition-colors">
                                <UserIcon className="text-gray-500 group-hover:text-emerald-400" />
                              </div>
                              <div>
                                <h4 className="text-xl font-black text-white tracking-tight">{student.name}</h4>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">{student.roll_number}</span>
                                  <span className="w-1 h-1 rounded-full bg-gray-800"></span>
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{student.classes?.name}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-8">
                              <div className="text-right hidden md:block">
                                <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Status Protocol</p>
                                <StatusBadge 
                                  label={student.status?.toUpperCase() || 'ACTIVE'} 
                                  value="" 
                                  color={student.status === 'suspended' ? 'red' : student.status === 'intern' ? 'purple' : 'emerald'} 
                                />
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={async () => {
                                    if (confirm('Delete this student profile?')) {
                                      await deleteStudent(student.id)
                                      fetchPeriodAttendanceCount()
                                    }
                                  }}
                                  className="w-12 h-12 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-center text-gray-600 hover:text-red-400 hover:border-red-400/30 transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <Shield size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'users' && (
              <div className="space-y-10 animate-smoothFadeIn">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white tracking-tighter">Staff & Users</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">Managing user accounts and system privileges</p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={async () => {
                        if (window.confirm('⚠️ Are you sure you want to delete your account? This action cannot be undone!')) {
                          const result = await deleteMyAccount()
                          if (result.success) {
                            setToast({ message: '✅ Account deleted successfully. You will be signed out.', type: 'success' })
                            setTimeout(() => { window.location.href = '/login' }, 2000)
                          } else {
                            setToast({ message: '❌ Error deleting account: ' + result.error, type: 'error' })
                          }
                        }
                      }}
                      className="px-6 py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl hover:bg-red-500 hover:text-white transition-all duration-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                    >
                      Delete My Account
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {users
                    .filter(user => {
                      if (userProfile?.role === 'admin') return true
                      return user.stream_id === userProfile?.stream_id
                    })
                    .map((user) => (
                      <div key={user.id} className="group bg-white/[0.02] border border-white/5 rounded-[3rem] p-8 hover:bg-white/[0.04] transition-all duration-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors"></div>
                        
                        <div className="flex items-start justify-between relative z-10">
                          <div className="flex items-center gap-6">
                            <div className="relative">
                              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[2rem] flex items-center justify-center text-white font-black text-2xl shadow-2xl">
                                {user.name?.charAt(0)?.toUpperCase()}
                              </div>
                              {onlineUsers.has(user.id) && (
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-[#0a0a0a] rounded-full animate-pulse"></div>
                              )}
                            </div>
                            <div>
                              <h4 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                {user.name}
                                {user.id === userProfile?.id && (
                                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">Primary</span>
                                )}
                              </h4>
                              <p className="text-gray-500 font-bold text-sm tracking-tight">{user.email}</p>
                              <div className="flex items-center gap-2 mt-3">
                                 {user.role === 'admin' && <StatusBadge label="Role" value="ADMIN" color="red" />}
                                 {user.role === 'staff' && !user.is_pc && !user.is_hod && !user.is_class_advisor && <StatusBadge label="Role" value="STAFF" color="blue" />}
                                 {user.is_pc && <StatusBadge label="Rank" value="PC" color="purple" />}
                                 {user.is_hod && <StatusBadge label="Rank" value="HOD" color="emerald" />}
                                 {user.is_class_advisor && (
                                   <StatusBadge 
                                     label="Advisor" 
                                     value={classes.find(c => c.id === user.advisor_class_id)?.name || 'Class'} 
                                     color="blue" 
                                   />
                                 )}
                                 {user.status === 'suspended' && <StatusBadge label="State" value="Suspended" color="orange" />}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-10 relative z-10">
                               <div className="space-y-4">
                                 <label className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Coordination & Appointments</label>
                                 <div className="flex flex-col gap-3">
                                   <>
                                     {/* HOD Appointment */}
                                        <button
                                          onClick={async () => {
                                            try {
                                              if (user.is_hod) {
                                                if (window.confirm('Remove HOD status?')) {
                                                  const result = await removeHOD(user.id)
                                                  if (result.success) setToast({ message: 'HOD status removed', type: 'success' })
                                                  else throw new Error(result.error)
                                                }
                                              } else {
                                                if (window.confirm('Appoint as HOD?')) {
                                                  const result = await appointAsHOD(user.id)
                                                  if (result.success) setToast({ message: 'User appointed as HOD', type: 'success' })
                                                  else throw new Error(result.error)
                                                }
                                              }
                                            } catch (err) {
                                              setToast({ message: 'Error: ' + err.message, type: 'error' })
                                            }
                                          }}
                                          className={`w-full px-4 py-3 rounded-xl font-bold tracking-tight text-xs transition-all flex items-center justify-between ${
                                            user.is_hod 
                                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white' 
                                              : 'bg-white/[0.05] text-gray-400 border border-white/5 hover:bg-white/10'
                                          }`}
                                        >
                                          <span>{user.is_hod ? 'HOD Status Active' : 'Appoint as HOD'}</span>
                                          <Zap size={14} className={user.is_hod ? 'text-emerald-400' : 'text-gray-600'} />
                                        </button>

                                        {/* Class Advisor Appointment */}
                                        <div className="space-y-2">
                                          {user.is_class_advisor ? (
                                            <button
                                              onClick={async () => {
                                                try {
                                                  if (window.confirm('Remove Class Advisor status?')) {
                                                    const result = await removeClassAdvisor(user.id)
                                                    if (result.success) setToast({ message: 'Advisor status removed', type: 'success' })
                                                    else throw new Error(result.error)
                                                  }
                                                } catch (err) {
                                                  setToast({ message: 'Error: ' + err.message, type: 'error' })
                                                }
                                              }}
                                              className="w-full px-4 py-3 rounded-xl font-bold tracking-tight text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all flex items-center justify-between"
                                            >
                                              <span>Advisor: {classes.find(c => c.id === user.advisor_class_id)?.name}</span>
                                              <Users size={14} />
                                            </button>
                                          ) : (
                                            <select
                                              onChange={async (e) => {
                                                try {
                                                  const selectedClass = classes.find(c => c.id === e.target.value)
                                                  if (e.target.value && window.confirm(`Appoint as Class Advisor for ${selectedClass?.name}?`)) {
                                                    const result = await appointAsClassAdvisor(user.id, e.target.value)
                                                    if (result.success) setToast({ message: `Successfully appointed as advisor for ${selectedClass?.name}`, type: 'success' })
                                                    else throw new Error(result.error)
                                                  }
                                                } catch (err) {
                                                  setToast({ message: 'Error: ' + err.message, type: 'error' })
                                                }
                                              }}
                                              className="w-full px-4 py-3 bg-white/[0.05] border border-white/5 rounded-xl text-gray-400 font-bold tracking-tight text-xs outline-none hover:bg-white/10 transition-all appearance-none cursor-pointer"
                                              disabled={classes.filter(c => c.stream_id === (user.stream_id || 'cse')).length === 0}
                                            >
                                              <option value="">Appoint as Advisor...</option>
                                              {classes
                                                .filter(cls => (cls.stream_id === (user.stream_id || 'cse')))
                                                .map(cls => (
                                                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                                                ))
                                              }
                                            </select>
                                          )}
                                        </div>
                                     </>
                                 </div>
                               </div>
                             </div>
                        
                        <div className="mt-4 flex gap-2 relative z-10">
                          <button
                            onClick={async () => {
                              const newStatus = user.status === 'active' ? 'suspended' : 'active';
                              if (window.confirm(`Update status for ${user.name}?`)) {
                                const result = await updateUser(user.id, { status: newStatus })
                                if (result.success) setToast({ message: `User ${newStatus}`, type: 'success' })
                              }
                            }}
                            className="flex-1 px-4 py-3 bg-white/[0.03] border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 transition-all"
                          >
                            {user.status === 'suspended' ? 'Reactivate User' : 'Suspend User'}
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm('Delete this user account?')) {
                                const result = await deleteUser(user.id)
                                if (result.success) setToast({ message: 'User deleted', type: 'success' })
                              }
                            }}
                            className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
                          >
                            <Shield size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {activeTab === 'leaveRequests' && (
              <div className="space-y-10 animate-smoothFadeIn">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black text-white tracking-tighter">Leave Protocol</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">Administrative approval for student leave requests</p>
                  </div>
                  <div className="flex gap-4">
                     <div className="px-6 py-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Shield size={16} />
                        Authority: {userProfile?.role === 'admin' ? 'Institutional Admin' : 'Head of Department'}
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 sm:p-10 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                    
                    <div className="flex items-center gap-4 relative z-10 border-b border-white/5 pb-8">
                      <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                         <FileText size={24} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white tracking-tight">Synchronized Request Queue</h3>
                        <p className="text-emerald-500/60 font-bold uppercase tracking-widest text-[10px]">Tracking all active leave requests</p>
                      </div>
                    </div>

                    <div className="space-y-6 relative z-10">
                      {loadingLeave ? (
                        <div className="py-20 text-center animate-pulse">
                          <Activity size={48} className="mx-auto mb-6 text-gray-700" />
                          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.3em]">Synchronizing Intelligence Feed...</p>
                        </div>
                      ) : leaveRequests.length === 0 ? (
                        <div className="py-20 text-center bg-black/20 rounded-[2rem] border border-dashed border-white/10">
                           <Layout size={40} className="mx-auto mb-6 text-gray-800" />
                           <h4 className="text-xl font-black text-gray-600 tracking-tight">No Active Requests</h4>
                           <p className="text-gray-700 font-bold uppercase text-[10px] tracking-widest mt-2">All student leave protocols have been resolved</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {leaveRequests.map(req => {
                            const isHOD = userProfile?.is_hod
                            const isAdmin = userProfile?.role === 'admin'
                            const canApprove = (isHOD && req.status === 'pending_hod') || (isAdmin && (req.status === 'pending_admin' || req.status === 'pending_hod'))
                            
                            return (
                              <div key={req.id} className="group bg-[#020617] border border-white/5 rounded-[2rem] p-8 hover:bg-white/[0.04] transition-all duration-500 relative overflow-hidden flex flex-col justify-between">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-emerald-500/5 transition-colors"></div>
                                
                                <div className="flex-1">
                                  <div className="flex justify-between items-start mb-6">
                                    <div>
                                      <h4 className="text-xl font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors">{req.student_name}</h4>
                                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-0.5">{req.register_number} • SEC {req.section}</p>
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                                      req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                      req.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                      req.status === 'pending_admin' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                      'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                    }`}>
                                      {req.status?.replace('_', ' ')}
                                    </span>
                                  </div>

                                  <div className="bg-white/5 rounded-2xl p-5 mb-8 border border-white/5 group-hover:border-white/10 transition-colors">
                                    <p className="text-sm text-gray-400 font-medium leading-relaxed italic">"{req.reason}"</p>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                                      <span className="block text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Attendance</span>
                                      <span className="text-lg font-black text-white">{req.attendance_percentage}%</span>
                                    </div>
                                    <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                                      <span className="block text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Created At</span>
                                      <span className="text-xs font-black text-white uppercase tracking-tight">{new Date(req.created_at).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                                  {req.letter_url && (
                                    <a 
                                      href={req.letter_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="flex-1 px-4 py-4 bg-white/5 text-gray-400 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
                                    >
                                      <FileText size={14} /> View Document
                                    </a>
                                  )}
                                  
                                  {canApprove && (
                                    <div className="flex gap-3 w-full sm:w-auto">
                                      <button 
                                        onClick={() => handleLeaveAction(req.id, 'approve')}
                                        className="flex-1 px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                                      >
                                        <CheckCircle size={14} /> Approve
                                      </button>
                                      <button 
                                        onClick={() => handleLeaveAction(req.id, 'reject')}
                                        className="px-6 py-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                                      >
                                        <XCircle size={14} /> Reject
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'reports' && (
              <div className="space-y-10 animate-smoothFadeIn">
                 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                   <div className="space-y-2">
                     <h2 className="text-4xl font-black text-white tracking-tighter">Intelligence Export</h2>
                     <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">Generating documented archives of institutional activity</p>
                   </div>
                   
                   <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                      <button 
                         onClick={() => setReportMode('daily')}
                         className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportMode === 'daily' ? 'bg-emerald-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                      >
                         Daily Sessions
                      </button>
                      <button 
                         onClick={() => setReportMode('range')}
                         className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportMode === 'range' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                      >
                         Custom Range
                      </button>
                   </div>
                 </div>

                 <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 sm:p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Assigned Class (Optional)</label>
                          <select
                             value={reportSelectedClass}
                             onChange={(e) => setReportSelectedClass(e.target.value)}
                             className="w-full px-6 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-emerald-500/50 outline-none transition-all appearance-none cursor-pointer"
                          >
                             <option value="">Overall Stream</option>
                             {classes.filter(c => c.stream_id === userProfile?.stream_id).map(cls => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                             ))}
                          </select>
                       </div>
                       
                       {reportMode === 'daily' ? (
                          <div className="md:col-span-2 space-y-4">
                             <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Target Date</label>
                             <div className="relative group/date">
                                <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500/50 group-hover:text-emerald-400 transition-colors pointer-events-none" />
                                <input
                                   type="date"
                                   value={reportFromDate}
                                   onChange={(e) => { setReportFromDate(e.target.value); setReportToDate(e.target.value) }}
                                   className="w-full pl-6 pr-12 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-emerald-500/50 outline-none transition-all [color-scheme:dark]"
                                />
                             </div>
                          </div>
                       ) : (
                          <>
                             <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Temporal From</label>
                                <div className="relative group/date">
                                   <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500/50 group-hover:text-emerald-400 transition-colors pointer-events-none" />
                                   <input
                                      type="date"
                                      value={reportFromDate}
                                      onChange={(e) => setReportFromDate(e.target.value)}
                                      className="w-full pl-6 pr-12 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-emerald-500/50 outline-none transition-all [color-scheme:dark]"
                                   />
                                </div>
                             </div>
                             <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Temporal To</label>
                                <div className="relative group/date">
                                   <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500/50 group-hover:text-emerald-400 transition-colors pointer-events-none" />
                                   <input
                                      type="date"
                                      value={reportToDate}
                                      onChange={(e) => setReportToDate(e.target.value)}
                                      className="w-full pl-6 pr-12 py-4 bg-white/[0.05] border border-white/10 rounded-2xl text-white font-bold tracking-tight text-sm focus:border-emerald-500/50 outline-none transition-all [color-scheme:dark]"
                                   />
                                </div>
                             </div>
                          </>
                       )}
                    </div>
                 </div>

                 {reportMode === 'daily' ? (
                   <div className="grid gap-10">
                      {/* Student Sessions Card */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-10 relative overflow-hidden group col-span-full">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
                         <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-emerald-500/10 rounded-2x flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                  <Users size={20} />
                               </div>
                               <div>
                                  <h3 className="text-xl font-black text-white tracking-tight">Student Anthology</h3>
                                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{reportDailySessions.length} recorded log entries</p>
                               </div>
                            </div>
                            {reportDailySessions.length > 0 && (
                               <div className="flex gap-2">
                                  <button 
                                     onClick={async () => {
                                        await generateDailyConsolidatedReport(reportDailySessions, supabase)
                                     }}
                                     className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl hover:bg-blue-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                                     title="Daily Grid View"
                                  >
                                     <Layout size={14} />
                                     Combined
                                  </button>
                                  <button 
                                     onClick={async () => {
                                        await generatePeriodAttendanceReport(reportDailySessions, supabase, {
                                           startDate: reportFromDate,
                                           endDate: reportToDate,
                                           className: reportSelectedClass ? classes.find(c => c.id === reportSelectedClass)?.name : 'All Classes'
                                        })
                                     }}
                                     className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
                                     title="Chronological Bulk"
                                  >
                                     <FileText size={16} />
                                  </button>
                               </div>
                            )}
                         </div>

                         <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                            {reportDailySessions.length > 0 ? reportDailySessions.sort((a,b) => a.period_number - b.period_number).map((session, i) => (
                               <div key={i} className="flex items-center justify-between p-5 bg-white/[0.03] border border-white/5 rounded-2xl group/item hover:bg-white/[0.05] transition-all">
                                  <div className="flex items-center gap-4">
                                     <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-emerald-400 group-hover/item:scale-110 transition-transform">
                                        P{session.period_number}
                                     </div>
                                     <div>
                                        <h4 className="font-black text-white text-sm tracking-tight">{session.timetable?.subject_name || 'Technical Session'}</h4>
                                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{session.timetable?.faculty_name || 'Assigned Lead'}</p>
                                     </div>
                                  </div>
                                  <div className="flex items-center gap-6">
                                     <div className="text-right">
                                        <div className="text-sm font-black text-white">{session.present_count}<span className="text-gray-600 mx-1">/</span>{session.total_students}</div>
                                        <div className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">Marked</div>
                                     </div>
                                     <button 
                                        onClick={async (e) => {
                                           e.stopPropagation();
                                           await generatePeriodAttendanceReport([session], supabase)
                                        }}
                                        className="p-2 bg-white/5 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                                     >
                                        <FileText size={14} />
                                     </button>
                                  </div>
                               </div>
                            )) : (
                               <div className="py-20 text-center opacity-30">
                                  <Clock size={32} className="mx-auto mb-4" />
                                  <p className="text-[10px] font-black uppercase tracking-widest">No session logs found</p>
                               </div>
                            )}
                         </div>
                      </div>
                   </div>
                 ) : (
                     <div className="space-y-10">
                        <div className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-12 text-center relative overflow-hidden group">
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-blue-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                          <div className="relative z-10 space-y-8">
                            <div className="flex justify-center gap-4">
                               <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                  <Users size={32} />
                               </div>
                               <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                                  <Activity size={32} />
                               </div>
                            </div>
                            
                            <div className="max-w-md mx-auto">
                               <h3 className="text-3xl font-black text-white tracking-tight">Range Intelligence Export</h3>
                               <p className="text-gray-500 font-bold text-sm tracking-tight mt-3 uppercase tracking-[0.1em]">
                                 Chronological Session Archive
                               </p>
                               <p className="text-gray-600 text-[10px] font-bold mt-2 uppercase tracking-widest italic">
                                 Automated aggregation of institutional activity logs
                               </p>
                            </div>

                            <div className="flex flex-wrap justify-center gap-4">
                               <StatusBadge label="Marked Sessions" value={reportStudentSessionCount} color="emerald" />
                            </div>

                            <button 
                              onClick={async () => {
                                try {
                                  if (reportDailySessions.length === 0) return setToast({ message: 'No records found for this range', type: 'info' })
                                  
                                  const selectedClassName = reportSelectedClass ? classes.find(c => c.id === reportSelectedClass)?.name : 'Overall Stream'
                                  
                                  await generatePeriodAttendanceReport(reportDailySessions, supabase, {
                                    startDate: reportFromDate,
                                    endDate: reportToDate,
                                    className: selectedClassName
                                  })
                                  
                                  setToast({ message: 'Intelligence archived successfully', type: 'success' })
                                } catch (err) {
                                  setToast({ message: `Export failed: ${err.message}`, type: 'error' })
                                }
                              }}
                              className="w-full max-w-lg mx-auto py-6 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-emerald-500/20 border border-emerald-400/20"
                            >
                              Launch Chronological Export
                            </button>
                          </div>
                        </div>

                        {/* Student Anthology Card - Full Width */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-10 relative overflow-hidden group col-span-full">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
                           <div className="flex items-center justify-between mb-8">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-emerald-500/10 rounded-2x flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                    <Users size={20} />
                                 </div>
                                 <div>
                                    <h3 className="text-xl font-black text-white tracking-tight">Student Anthology</h3>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{reportDailySessions.length} sessions in range</p>
                                 </div>
                              </div>
                              {reportDailySessions.length > 0 && (
                                 <button 
                                    onClick={async () => {
                                       await generatePeriodAttendanceReport(reportDailySessions, supabase, {
                                          startDate: reportFromDate,
                                          endDate: reportToDate,
                                          className: reportSelectedClass ? classes.find(c => c.id === reportSelectedClass)?.name : 'Overall Stream'
                                       })
                                    }}
                                    className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 transition-all shadow-lg"
                                 >
                                    <FileText size={16} />
                                 </button>
                              )}
                           </div>

                           <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                              {reportDailySessions.length > 0 ? reportDailySessions.sort((a,b) => new Date(a.date) - new Date(b.date) || a.period_number - b.period_number).map((session, i) => (
                                 <div key={i} className="flex items-center justify-between p-5 bg-white/[0.03] border border-white/5 rounded-2xl group/item hover:bg-white/[0.05] transition-all">
                                    <div className="flex items-center gap-4">
                                       <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-emerald-400 group-hover/item:scale-110 transition-transform">
                                          P{session.period_number}
                                       </div>
                                       <div>
                                          <h4 className="font-black text-white text-sm tracking-tight">{session.timetable?.subject_name || 'Academic Session'}</h4>
                                          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{new Date(session.date).toLocaleDateString()} • {session.timetable?.faculty_name || 'Assigned'}</p>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <button 
                                          onClick={async () => await generatePeriodAttendanceReport([session], supabase)}
                                          className="p-2 bg-white/5 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"
                                       >
                                          <FileText size={14} />
                                       </button>
                                    </div>
                                 </div>
                              )) : (
                                 <div className="py-20 text-center opacity-30">
                                    <Clock size={32} className="mx-auto mb-4" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No entries found for this range</p>
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                 )}
               </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {selectedClassView && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4 sm:px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedClassView(null)}></div>
          <div className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl animate-smoothFadeIn">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
            
            {/* Modal Header */}
            <div className="p-8 sm:p-12 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-black text-white tracking-tighter">{selectedClassView.name}</h2>
                <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2">Active Class Statistics - {students.filter(s => s.class_id === selectedClassView.id).length} Students</p>
              </div>
              <button 
                onClick={() => setSelectedClassView(null)}
                className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all border border-white/10"
              >
                <Shield size={20} className="rotate-45" />
              </button>
            </div>

            {/* Modal Content - Student List */}
            <div className="p-8 sm:p-12 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {students
                  .filter(s => s.class_id === selectedClassView.id)
                  .sort((a, b) => a.roll_number.localeCompare(b.roll_number))
                  .map((student) => (
                    <div key={student.id} className="group bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-white/[0.05] rounded-xl flex items-center justify-center border border-white/10 text-gray-500 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-all">
                          <Users size={18} />
                        </div>
                        <div>
                          <h4 className="font-black text-white tracking-tight">{student.name}</h4>
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mt-0.5">{student.roll_number}</span>
                        </div>
                        <div className="ml-auto">
                          <StatusBadge 
                            label="" 
                            value={student.status?.toUpperCase() || 'ACTIVE'} 
                            color={student.status === 'suspended' ? 'red' : student.status === 'intern' ? 'purple' : 'emerald'} 
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                {students.filter(s => s.class_id === selectedClassView.id).length === 0 && (
                  <div className="col-span-full py-20 text-center">
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No students enrolled in this class</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-white/5 bg-white/[0.02] flex justify-end">
              <button 
                onClick={() => setSelectedClassView(null)}
                className="px-8 py-4 bg-white text-black rounded-2xl hover:bg-emerald-400 transition-all font-black text-xs uppercase tracking-widest"
              >
                Close Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboardNew
