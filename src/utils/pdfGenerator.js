import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Helper to draw a tick mark
const drawTick = (doc, x, y) => {
  doc.setDrawColor(0, 128, 0)
  doc.setLineWidth(0.5)
  doc.line(x - 2, y, x, y + 2)
  doc.line(x, y + 2, x + 3, y - 3)
}

// Helper to draw a cross mark
const drawCross = (doc, x, y) => {
  doc.setDrawColor(220, 20, 60)
  doc.setLineWidth(0.5)
  doc.line(x - 2, y - 2, x + 2, y + 2)
  doc.line(x + 2, y - 2, x - 2, y + 2)
}

const getPeriodText = (num) => {
  const map = {
    1: 'Period One', 2: 'Period Two', 3: 'Period Three', 4: 'Period Four',
    5: 'Period Five', 6: 'Period Six', 7: 'Period Seven', 8: 'Period Eight'
  }
  return map[num] || `Period ${num}`
}

export const generatePeriodAttendanceReport = async (periodData, supabase, options = {}) => {
  const doc = new jsPDF('p', 'mm', 'a4')
  const { startDate, endDate, className } = options
  
  const primaryPurple = [139, 92, 246] // Violet-500
  const darkPurple = [124, 58, 237] // Violet-600
  const slateText = [71, 85, 105]
  const successGreen = [34, 197, 94]
  const dangerRed = [239, 68, 68]

  // --- Header Section ---
  doc.setTextColor(...primaryPurple)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Smart Presence', 105, 15, { align: 'center' })
  
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(14)
  doc.text('Date Range Attendance Report', 105, 23, { align: 'center' })
  
  doc.setFontSize(10)
  doc.setTextColor(...slateText)
  const rangeStr = (startDate && endDate) ? (startDate === endDate ? startDate : `${startDate} to ${endDate}`) : ''
  doc.text(rangeStr, 105, 30, { align: 'center' })
  
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  const genTime = new Date().toLocaleString()
  doc.text(`Generated: ${genTime}`, 105, 36, { align: 'center' })

  // --- Data Extraction ---
  let totalPresentAcrossAll = 0
  let totalAbsentAcrossAll = 0
  let totalMarkedAcrossAll = 0
  const processedPeriods = []
  
  const sortedPeriods = [...periodData].sort((a,b) => {
     const dateA = new Date(a.date)
     const dateB = new Date(b.date)
     if (dateA - dateB !== 0) return dateA - dateB
     return a.period_number - b.period_number
  })

  for (const record of sortedPeriods) {
    try {
      const { data: students, error } = await supabase
        .from('period_student_attendance')
        .select(`*, students (roll_number, name, classes (name))`)
        .eq('period_attendance_id', record.id)
        .order('students(roll_number)')
      
      if (!error && students) {
        let p = 0, a = 0
        students.forEach(s => { 
          if (s.status === 'present') p++; else a++ 
          totalMarkedAcrossAll++
        })
        totalPresentAcrossAll += p
        totalAbsentAcrossAll += a
        processedPeriods.push({ ...record, studentList: students, presentCount: p, absentCount: a })
      }
    } catch (err) { console.error(err) }
  }

  // --- Attendance Summary Card ---
  doc.setFillColor(...primaryPurple)
  doc.roundedRect(10, 42, 190, 40, 3, 3, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('ATTENDANCE SUMMARY', 15, 50)
  
  const drawStatBox = (label, value, x) => {
    doc.setFillColor(...darkPurple)
    doc.roundedRect(x, 55, 42, 16, 2, 2, 'F')
    doc.setFontSize(10)
    doc.text(value.toString(), x + 21, 63, { align: 'center' })
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x + 21, 68, { align: 'center' })
    doc.setFont('helvetica', 'bold')
  }

  drawStatBox('TOTAL SESSIONS', processedPeriods.length, 15)
  drawStatBox('TRACKING UNITS', totalMarkedAcrossAll, 62)
  drawStatBox('PRESENT', totalPresentAcrossAll, 109)
  drawStatBox('ABSENT', totalAbsentAcrossAll, 156)
  
  doc.setFontSize(8)
  const rate = totalMarkedAcrossAll > 0 ? ((totalPresentAcrossAll/totalMarkedAcrossAll)*100).toFixed(1) : '0.0'
  doc.text(`Overall attendance rate for the following sessions:  ${rate}%`, 105, 76, { align: 'center' })

  // --- Session Blocks (Card Style) ---
  let currentY = 92

  processedPeriods.forEach((session, idx) => {
    if (currentY > 230) {
      doc.addPage()
      currentY = 20
    }
    
    // Header Row
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text((idx + 1).toString(), 15, currentY)
    
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    const staffName = session.is_alternative_staff ? session.alternative_staff_name : (session.timetable?.faculty_name || 'N/A')
    const sessionClass = session.classes?.name || className || 'N/A'
    const sessionDate = new Date(session.date).toLocaleDateString()
    
    doc.text(`Staff: ${staffName} | Date: ${sessionDate} | Session: ${getPeriodText(session.period_number)}`, 15, currentY + 5)
    doc.text(`${session.presentCount} Present | ${session.absentCount} Absent`, 195, currentY + 5, { align: 'right' })

    autoTable(doc, {
      startY: currentY + 8,
      head: [['STUDENT NAME', 'ROLL NUMBER', 'PERIOD', 'CLASS', 'STATUS']],
      body: session.studentList.map(s => [
        s.students?.name || 'N/A',
        s.students?.roll_number || 'N/A',
        getPeriodText(session.period_number),
        s.students?.classes?.name || className || 'N/A',
        s.status === 'present' ? 'Present' : 'Absent'
      ]),
      theme: 'striped',
      headStyles: { 
        fillColor: [241, 245, 249], 
        textColor: [71, 85, 105], 
        fontSize: 7, 
        fontStyle: 'bold',
        halign: 'left'
      },
      styles: { fontSize: 7, cellPadding: 2, valign: 'middle' },
      columnStyles: {
        4: { fontStyle: 'bold', halign: 'right' }
      },
      didDrawCell: (data) => {
        if (data.column.index === 4 && data.cell.section === 'body') {
          const status = data.cell.text[0]
          if (status === 'Present') {
            doc.setTextColor(...successGreen)
            data.cell.text[0] = '✓ Present'
          } else {
            doc.setTextColor(...dangerRed)
            data.cell.text[0] = '✗ Absent'
          }
        }
      },
      margin: { left: 15, right: 15 }
    })

    currentY = doc.lastAutoTable.finalY + 15
  })

  // --- Institutional Footer ---
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Smart Presence Report Archive`, 105, 285, { align: 'center' })
    doc.setDrawColor(30, 41, 59)
    doc.setLineWidth(0.3)
    doc.line(10, 280, 200, 280)
    doc.text(`Authenticated System Log - Page ${i} of ${pageCount}`, 15, 288)
  }

  doc.save(`smart_presence_archive_${new Date().toISOString().split('T')[0]}.pdf`)
}

export const generateDailyConsolidatedReport = async (periodData, supabase) => {
  const doc = new jsPDF('landscape')
  
  if (periodData.length === 0) return

  const sortedPeriods = [...periodData].sort((a,b) => a.period_number - b.period_number)
  const dateStr = new Date(sortedPeriods[0].date).toLocaleDateString()
  const className = sortedPeriods[0].classes?.name || 'Class'
  const facultyNames = [...new Set(sortedPeriods.map(p => p.is_alternative_staff ? p.alternative_staff_name : p.timetable?.faculty_name).filter(Boolean))].join(', ')

  // Header
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, 297, 45, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('Daily Consolidated Attendance Grid', 14, 20)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text(`Date: ${dateStr}  |  Class: ${className}  |  Staff: ${facultyNames || 'N/A'}`, 14, 28)
  doc.text(`Marked Sessions: ${periodData.length}`, 14, 34)

  // Legend
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  doc.text('Status: Present (P), Absent (A), On Duty (OD)', 220, 20)

  // Fetch all students and their attendance for these periods
  const studentAttendanceMap = {}
  const studentInfoMap = {}

  for (const period of sortedPeriods) {
    const { data: attendance } = await supabase
      .from('period_student_attendance')
      .select('*, students(roll_number, name)')
      .eq('period_attendance_id', period.id)
    
    attendance?.forEach(record => {
      const sid = record.student_id
      if (!studentAttendanceMap[sid]) {
        studentAttendanceMap[sid] = {}
        studentInfoMap[sid] = {
          rollNo: record.students?.roll_number,
          name: record.students?.name
        }
      }
      studentAttendanceMap[sid][period.period_number] = record.status
    })
  }

  const periodNumbers = sortedPeriods.map(p => p.period_number)
  const tableHead = ['Roll No', 'Name', ...periodNumbers.map(n => `P${n}`), 'Status']
  const sortedStudentIds = Object.keys(studentInfoMap).sort((a, b) => 
    studentInfoMap[a].rollNo.localeCompare(studentInfoMap[b].rollNo)
  )

  const tableBody = sortedStudentIds.map(sid => {
    const row = [studentInfoMap[sid].rollNo, studentInfoMap[sid].name]
    let presentCount = 0
    let totalMarked = 0
    
    periodNumbers.forEach(pNum => {
      const status = studentAttendanceMap[sid][pNum]
      if (status) {
        totalMarked++
        if (status === 'present') {
           row.push('P')
           presentCount++
        } else if (status === 'absent') row.push('A')
        else if (status === 'on_duty') row.push('OD')
        else row.push('-')
      } else {
        row.push('-')
      }
    })

    const statusLabel = presentCount === totalMarked ? 'FULL' : (presentCount > 0 ? 'PARTIAL' : 'ABSENT')
    row.push(statusLabel)
    return row
  })

  autoTable(doc, {
    startY: 50,
    head: [tableHead],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], halign: 'center' },
    styles: { fontSize: 8, halign: 'center', cellPadding: 2 },
    columnStyles: { 0: { halign: 'left' }, 1: { halign: 'left', cellWidth: 50 } },
    didDrawCell: function(data) {
       if (data.cell.section === 'body' && data.column.index >= 2 && data.column.index < tableHead.length - 1) {
          const text = data.cell.text[0]
          if (text === 'P') {
             doc.setFillColor(74, 222, 128) // Green
             doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F')
             doc.setTextColor(255, 255, 255)
             doc.text('P', data.cell.x + data.cell.width/2, data.cell.y + data.cell.height/2, { halign: 'center', valign: 'middle' })
          } else if (text === 'A') {
             doc.setFillColor(248, 113, 113) // Red
             doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F')
             doc.setTextColor(255, 255, 255)
             doc.text('A', data.cell.x + data.cell.width/2, data.cell.y + data.cell.height/2, { halign: 'center', valign: 'middle' })
          } else if (text === 'OD') {
             doc.setFillColor(96, 165, 250) // Blue
             doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F')
             doc.setTextColor(255, 255, 255)
             doc.text('OD', data.cell.x + data.cell.width/2, data.cell.y + data.cell.height/2, { halign: 'center', valign: 'middle' })
          }
       }
    }
  })

  doc.save(`consolidated_attendance_${dateStr.replace(/\//g, '-')}.pdf`)
}

export const generateAttendanceReport = (attendanceData, reportType = 'student') => {
  const doc = new jsPDF()
  
  // Header
  doc.setFillColor(30, 41, 59)
  doc.rect(0, 0, 210, 35, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  const title = reportType === 'student' ? 'Student Analytics Log' : 'Authority Attendance Log'
  doc.text(title, 14, 22)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 29)

  if (reportType === 'student') {
    const tableData = attendanceData.map(record => {
      let statusLabel = record.status.toUpperCase()
      if (record.status === 'absent' && record.approval_status) {
        statusLabel = `${record.approval_status.toUpperCase()}`
      }
      
      return [
        record.students?.roll_number || 'N/A',
        record.students?.name || 'N/A',
        record.classes?.name || 'N/A',
        record.sessions?.name || 'N/A',
        new Date(record.date).toLocaleDateString(),
        record.status === 'present' ? '  ' : (record.status === 'absent' ? '  ' : statusLabel)
      ]
    })
    
    autoTable(doc, {
      startY: 40,
      head: [['Roll No', 'Name', 'Class', 'Session', 'Date', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
      didDrawCell: function(data) {
        if (data.column.index === 5 && data.cell.section === 'body') {
          const record = attendanceData[data.row.index]
          if (record.status === 'present') {
            drawTick(doc, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2)
          } else if (record.status === 'absent') {
            drawCross(doc, data.cell.x + data.cell.width / 2 - 10, data.cell.y + data.cell.height / 2)
            doc.setTextColor(220, 20, 60)
            doc.text(record.approval_status?.toUpperCase() || 'ABSENT', data.cell.x + data.cell.width / 2 + 2, data.cell.y + data.cell.height / 2, { align: 'center', baseline: 'middle' })
          }
        }
      }
    })
  } else {
    // Staff report
    const tableData = attendanceData.map(record => {
      return [
        record.users?.name || 'N/A',
        new Date(record.date).toLocaleDateString(),
        record.period || 'General',
        record.status === 'present' ? '  ' : record.status.toUpperCase()
      ]
    })
    
    autoTable(doc, {
      startY: 40,
      head: [['Staff Identity', 'Date', 'Assigned Period', 'Executive Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], halign: 'center' },
      styles: { halign: 'center' },
      columnStyles: { 0: { halign: 'left' } },
      didDrawCell: function(data) {
        if (data.column.index === 3 && data.cell.section === 'body') {
          const record = attendanceData[data.row.index]
          if (record.status === 'present') {
            drawTick(doc, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2)
          } else if (record.status === 'absent') {
            drawCross(doc, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2)
          } else if (record.status === 'on_duty') {
            doc.setTextColor(0, 0, 255)
          }
        }
      }
    })
  }
  
  const fileName = `${reportType}_intelligence_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}
