import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useStudents } from '../hooks/useStudents'
// import { useDepartments } from '../hooks/useDepartments' // Replaced with streams
import { useClasses } from '../hooks/useClasses'
import { useSessions } from '../hooks/useSessions'
import { useAttendance } from '../hooks/useAttendance'
import { useTimetable } from '../hooks/useTimetable'
import { supabase } from '../services/supabase'
import { Users, UserCheck, UserX, TrendingUp, FileText, Settings, Plus, Calendar, Bell, BookOpen, Clock, Grid } from 'lucide-react'
import { generatePeriodAttendanceReport } from '../utils/pdfGenerator'
import BulkStudentImport from '../components/BulkStudentImport'
import SimpleBulkTimetable from '../components/SimpleBulkTimetable'
import SmartTimetableBuilder from '../components/SmartTimetableBuilder'
import InteractiveTimetable from '../components/InteractiveTimetable'
import DepartmentOverview from '../components/DepartmentOverview'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from '../components/Toast'

const ModernAdminDashboard = () => {
  const { userProfile, signOut } = useAuth()
  const [timetableRefreshKey, setTimetableRefreshKey] = useState(0)
  const { students, addStudent, deleteStudent, refetch: refetchStudents } = useStudents()
  // const { departments, addDepartment, deleteDepartment } = useDepartments() // Replaced with streams
  
  // Define the 6 streams
  const streams = [
    { id: 'cse', name: 'Computer Science and Engineering', code: 'CSE' }
  ]
  const { classes, addClass, deleteClass } = useClasses()
  const { sessions, addSession, deleteSession } = useSessions()
  const { attendance: staffAttendance } = useAttendance()
  const { timetable, addTimetableEntry, deleteTimetableEntry } = useTimetable()
  const { toasts, removeToast, showSuccess, showError } = useToast()
  
  const [activeTab, setActiveTab] = useState('timetable')
  const [showForm, setShowForm] = useState({ dept: false, class: false, session: false, student: false, intern: false, suspended: false, timetable: false })
  const [selectedClassForTimetable, setSelectedClassForTimetable] = useState('')
  const [timetableDate, setTimetableDate] = useState(new Date().toISOString().split('T')[0])
  
  const [forms, setForms] = useState({
    dept: { name: '', code: '', description: '' },
    class: { name: '', departmentId: '' },
    student: { rollNumber: '', name: '', email: '', phone: '', departmentId: '', classId: '', dateOfBirth: '' },
    intern: { rollNumber: '', name: '', email: '', phone: '', departmentId: '', classId: '', dateOfBirth: '' },
    suspended: { rollNumber: '', name: '', email: '', phone: '', departmentId: '', classId: '', dateOfBirth: '' },
    session: { name: '', startTime: '', endTime: '' },
    timetable: { classId: '', dayOfWeek: '1', periodNumber: '1', subjectCode: '', subjectName: '', facultyName: '', facultyCode: '', isLab: false }
  })
  const [todayStats, setTodayStats] = useState({ present: 0, absent: 0, onLeave: 0 })
  const [weeklyData, setWeeklyData] = useState([])
  const [departmentData, setDepartmentData] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [periodAttendanceCount, setPeriodAttendanceCount] = useState(0)

  // Fetch today's attendance stats
  useEffect(() => {
    fetchTodayStats()
    fetchWeeklyData()
    fetchDepartmentData()
    fetchRecentActivity()
    fetchPeriodAttendanceCount()
  }, [])

  const fetchTodayStats = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('period_student_attendance')
      .select(`status, students(id), period_attendance!inner(date)`) 
      .eq('period_attendance.date', today)
    if (!error && data) {
      const agg = new Map()
      for (const r of data) {
        const id = r.students?.id
        if (!id) continue
        const prev = agg.get(id) || 'unmarked'
        const curr = r.status
        let next = prev
        if (curr === 'present') next = 'present'
        else if (curr === 'on_duty' && prev !== 'present') next = 'on_duty'
        else if (curr === 'absent' && prev !== 'present' && prev !== 'on_duty') next = 'absent'
        agg.set(id, next)
      }
      let present = 0, absent = 0, onLeave = 0
      for (const v of agg.values()) {
        if (v === 'present') present++
        else if (v === 'on_duty') onLeave++
        else if (v === 'absent') absent++
      }
      setTodayStats({ present, absent, onLeave })
    }
  }

  const fetchWeeklyData = async () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const data = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const { data: records } = await supabase
        .from('period_student_attendance')
        .select(`status, students(id), period_attendance!inner(date)`) 
        .eq('period_attendance.date', dateStr)
      const agg = new Map()
      for (const r of records || []) {
        const id = r.students?.id
        if (!id) continue
        const prev = agg.get(id) || 'unmarked'
        const curr = r.status
        let next = prev
        if (curr === 'present') next = 'present'
        else if (curr === 'on_duty' && prev !== 'present') next = 'on_duty'
        else if (curr === 'absent' && prev !== 'present' && prev !== 'on_duty') next = 'absent'
        agg.set(id, next)
      }
      let present = 0, absent = 0, onLeave = 0
      for (const v of agg.values()) {
        if (v === 'present') present++
        else if (v === 'on_duty') onLeave++
        else if (v === 'absent') absent++
      }
      data.push({
        day: days[date.getDay()],
        present,
        absent,
        onLeave
      })
    }
    setWeeklyData(data)
  }

  const fetchDepartmentData = async () => {
    const deptStats = await Promise.all(
      departments.map(async (dept) => {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('department_id', dept.id)
        
        return {
          name: dept.name,
          count: count || 0
        }
      })
    )
    setDepartmentData(deptStats)
  }

  const fetchRecentActivity = async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*, users(name)')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (data) {
      setRecentActivity(data.map(record => ({
        text: `${record.users?.name || 'Someone'} marked attendance`,
        time: new Date(record.created_at).toLocaleString(),
        icon: record.status === 'present' ? 'check' : 'x'
      })))
    }
  }

  const fetchPeriodAttendanceCount = async () => {
    const { count } = await supabase
      .from('period_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('is_marked', true)
    setPeriodAttendanceCount(count || 0)
  }

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
        const existingSuspendedStudent = students.find(s => s.roll_number === forms.suspended.rollNumber)
        
        if (existingSuspendedStudent) {
          // Update existing student's status to suspended
          const { error: updateError } = await supabase
            .from('students')
            .update({ status: 'suspended' })
            .eq('id', existingSuspendedStudent.id)
          
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
      case 'session':
        result = await addSession(forms.session.name, forms.session.startTime, forms.session.endTime)
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
      // Reset form
      if (type === 'dept') setForms({ ...forms, dept: { name: '', code: '', description: '' }})
      if (type === 'class') setForms({ ...forms, class: { name: '', departmentId: '' }})
      if (type === 'student') setForms({ ...forms, student: { rollNumber: '', name: '', email: '', phone: '', departmentId: '', classId: '', dateOfBirth: '' }})
      if (type === 'intern') setForms({ ...forms, intern: { rollNumber: '', name: '', email: '', phone: '', departmentId: '', classId: '', dateOfBirth: '' }})
      if (type === 'suspended') setForms({ ...forms, suspended: { rollNumber: '', name: '', email: '', phone: '', departmentId: '', classId: '', dateOfBirth: '' }})
      if (type === 'session') setForms({ ...forms, session: { name: '', startTime: '', endTime: '' }})
      if (type === 'timetable') {
        setTimetableRefreshKey(prev => prev + 1)
      }
      showSuccess('🎉 Added successfully!')
    } else {
      showError('Error: ' + result.error)
    }
  }

  const handleGenerateReport = async () => {
    const { data: periodData } = await supabase
      .from('period_attendance')
      .select(`
        *,
        classes (name),
        timetable (subject_code, subject_name, faculty_name)
      `)
      .eq('is_marked', true)
      .order('date', { ascending: false })
      .limit(50)
    
    if (periodData) {
      await generatePeriodAttendanceReport(periodData, supabase)
    }
  }

  const totalEmployees = students.length + staffAttendance.length
  const lateArrivals = Math.floor(totalEmployees * 0.18)

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">
              SA
            </div>
            <span className="text-xl font-bold">SmartAttend</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              activeTab === 'dashboard' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Users size={20} />
            <span>Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              activeTab === 'reports' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <FileText size={20} />
            <span>Reports</span>
          </button>
          
          <button
            onClick={() => setActiveTab('timetable')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              activeTab === 'timetable' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Calendar size={20} />
            <span>Timetable</span>
          </button>
        </nav>
        
        <div className="p-4 border-t border-gray-800">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-gray-950 border-b border-gray-800 px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                {userProfile?.name?.charAt(0) || 'A'}
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="p-8">
            {/* Welcome Message */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Welcome, Admin User!</h2>
              <p className="text-gray-400">Here's an overview of your attendance dashboard</p>
              <p className="text-sm text-gray-500 mt-1">📅 Tuesday, November 6, 2025</p>
            </div>

            {/* Key Metrics */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4">Key Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400 text-sm">Total Employees</span>
                    <Users className="text-blue-500" size={24} />
                  </div>
                  <div className="text-3xl font-bold mb-1">{totalEmployees.toLocaleString()}</div>
                  <div className="text-green-500 text-sm">+12.5% from last month</div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400 text-sm">Present Today</span>
                    <UserCheck className="text-green-500" size={24} />
                  </div>
                  <div className="text-3xl font-bold mb-1">{todayStats.present}</div>
                  <div className="text-gray-400 text-sm">90% attendance rate</div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400 text-sm">Absent Today</span>
                    <UserX className="text-red-500" size={24} />
                  </div>
                  <div className="text-3xl font-bold mb-1">{todayStats.absent}</div>
                  <div className="text-gray-400 text-sm">Declining by 20 per week</div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400 text-sm">Late Arrivals</span>
                    <TrendingUp className="text-yellow-500" size={24} />
                  </div>
                  <div className="text-3xl font-bold mb-1">{lateArrivals}</div>
                  <div className="text-gray-400 text-sm">18% of total staff</div>
                </div>
              </div>
            </div>

            {/* Overview Reports */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4">Overview Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Daily Attendance Chart */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h4 className="text-lg font-semibold mb-2">Daily Attendance</h4>
                  <p className="text-gray-400 text-sm mb-6">Attendance overview for the last 7 days</p>
                  
                  <div className="flex items-end justify-between h-48 gap-4">
                    {weeklyData.map((day, index) => {
                      const maxValue = Math.max(...weeklyData.map(d => d.present + d.absent + d.onLeave))
                      const totalHeight = ((day.present + day.absent + day.onLeave) / maxValue) * 100
                      
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full bg-gray-700 rounded-t-lg relative" style={{ height: `${totalHeight}%` }}>
                            <div className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg" style={{ height: `${(day.present / (day.present + day.absent + day.onLeave)) * 100}%` }}></div>
                          </div>
                          <span className="text-xs text-gray-400">{day.day}</span>
                        </div>
                      )
                    })}
                  </div>
                  
                  <div className="flex items-center justify-center gap-6 mt-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-gray-400">Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-gray-400">Absent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span className="text-gray-400">On Leave</span>
                    </div>
                  </div>
                </div>

                {/* Department Attendance Donut Chart */}
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h4 className="text-lg font-semibold mb-2">Department Attendance</h4>
                  <p className="text-gray-400 text-sm mb-6">Distribution of employees across departments</p>
                  
                  <div className="flex items-center justify-center h-48 relative">
                    <svg width="200" height="200" viewBox="0 0 200 200">
                      {departmentData.map((dept, index) => {
                        const total = departmentData.reduce((sum, d) => sum + d.count, 0)
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
                        const percentage = (dept.count / total) * 100
                        const startAngle = departmentData.slice(0, index).reduce((sum, d) => sum + (d.count / total) * 360, 0)
                        const endAngle = startAngle + (percentage / 100) * 360
                        
                        const startRad = (startAngle - 90) * (Math.PI / 180)
                        const endRad = (endAngle - 90) * (Math.PI / 180)
                        
                        const x1 = 100 + 80 * Math.cos(startRad)
                        const y1 = 100 + 80 * Math.sin(startRad)
                        const x2 = 100 + 80 * Math.cos(endRad)
                        const y2 = 100 + 80 * Math.sin(endRad)
                        
                        const largeArc = percentage > 50 ? 1 : 0
                        
                        return (
                          <path
                            key={index}
                            d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                            fill={colors[index % colors.length]}
                            opacity="0.9"
                          />
                        )
                      })}
                      <circle cx="100" cy="100" r="50" fill="#1f2937" />
                    </svg>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-6 text-sm">
                    {departmentData.map((dept, index) => {
                      const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500']
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <div className={`w-3 h-3 ${colors[index % colors.length]} rounded`}></div>
                          <span className="text-gray-400">{dept.name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleGenerateReport}
                  className="flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <FileText size={20} />
                  <span className="font-semibold">Generate Reports</span>
                </button>
                
                <button className="flex items-center gap-3 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors">
                  <Settings size={20} />
                  <span className="font-semibold">Manage Settings</span>
                </button>
                
                <button className="flex items-center gap-3 px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors">
                  <Plus size={20} />
                  <span className="font-semibold">Add New Employee</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
              <div className="bg-gray-800 rounded-xl border border-gray-700 divide-y divide-gray-700">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="p-4 flex items-center gap-4 hover:bg-gray-750 transition-colors">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.icon === 'check' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {activity.icon === 'check' ? '✓' : '✗'}
                      </div>
                      <div className="flex-1">
                        <p className="text-white">{activity.text}</p>
                        <p className="text-sm text-gray-400">{activity.time}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-400">No recent activity</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-6">Department Reports</h2>
            
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <select className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white">
                  <option>Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                
                <select className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white">
                  <option>Last 30 Days</option>
                  <option>Last 7 Days</option>
                  <option>This Month</option>
                </select>
                
                <select className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white">
                  <option>All Departments</option>
                </select>
                
                <button
                  onClick={handleGenerateReport}
                  className="ml-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Export Report
                </button>
              </div>
              
              <h3 className="text-lg font-semibold mb-4">Detailed Attendance Overview</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Department</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium">Total Employees</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium">Present</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium">Absent</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium">On Leave</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium">Late Arrivals</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium">Status</th>
                      <th className="text-center py-3 px-4 text-gray-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((dept, index) => (
                      <tr key={dept.id} className="border-b border-gray-700 hover:bg-gray-750">
                        <td className="py-3 px-4">{dept.name}</td>
                        <td className="py-3 px-4 text-gray-400">2025-07-15</td>
                        <td className="py-3 px-4 text-center">{Math.floor(Math.random() * 50) + 20}</td>
                        <td className="py-3 px-4 text-center">{Math.floor(Math.random() * 40) + 15}</td>
                        <td className="py-3 px-4 text-center">{Math.floor(Math.random() * 5)}</td>
                        <td className="py-3 px-4 text-center">{Math.floor(Math.random() * 3)}</td>
                        <td className="py-3 px-4 text-center">{Math.floor(Math.random() * 5)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-sm">
                            Fully Present
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button className="text-blue-500 hover:text-blue-400">👁️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex items-center justify-between mt-6 text-sm text-gray-400">
                <span>Showing 1 to {departments.length} of {departments.length}</span>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-gray-900 border border-gray-700 rounded hover:bg-gray-800">Previous</button>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded">1</button>
                  <button className="px-3 py-1 bg-gray-900 border border-gray-700 rounded hover:bg-gray-800">2</button>
                  <button className="px-3 py-1 bg-gray-900 border border-gray-700 rounded hover:bg-gray-800">Next</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'timetable' && (
          <div className="p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">📚 Timetable Management</h2>
              <p className="text-gray-400">Create and manage class timetables with ease</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* Smart Timetable Builder */}
              <div className="xl:col-span-2">
                <SmartTimetableBuilder 
                  classes={classes} 
                  onImportComplete={() => {
                    setTimetableRefreshKey(prev => prev + 1)
                    console.log('Timetable import completed')
                  }} 
                />
              </div>

              {/* Interactive Timetable Viewer */}
              {selectedClassForTimetable && (
                <div className="xl:col-span-2">
                  <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4">📅 Interactive Timetable</h3>
                    <div className="mb-4 flex gap-4">
                      <select
                        value={selectedClassForTimetable}
                        onChange={(e) => setSelectedClassForTimetable(e.target.value)}
                        className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select Class</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={timetableDate}
                        onChange={(e) => setTimetableDate(e.target.value)}
                        className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <InteractiveTimetable 
                      key={`timetable-${timetableRefreshKey}`}
                      classId={selectedClassForTimetable} 
                      selectedDate={timetableDate} 
                    />
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">⚡ Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedClassForTimetable(classes[0]?.id || '')}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    📅 View Timetable
                  </button>
                  <button
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                  >
                    🚀 Create New Timetable
                  </button>
                </div>
              </div>

              {/* Tips & Help */}
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">💡 Tips</h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Use <strong>Smart Timetable Builder</strong> for quick week creation</li>
                  <li>• Create Monday schedule first, then copy to other days</li>
                  <li>• Use <strong>Smart Fill</strong> for common subject templates</li>
                  <li>• Interactive viewer allows attendance marking</li>
                  <li>• All changes are saved automatically</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-950 border-t border-gray-800 px-8 py-4 text-center text-sm text-gray-400">
          <p>© 2025 SmartAttend. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <span>•</span>
            <a href="#" className="hover:text-white">Terms of Service</a>
            <span>•</span>
            <a href="#" className="hover:text-white">Support</a>
          </div>
        </div>
      </div>
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

export default ModernAdminDashboard
