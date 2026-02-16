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
  const { subjectCode } = options
  
  const primaryPurple = [31, 41, 55] // Gray-800
  const accentBlue = [37, 99, 235] // Blue-600
  const dangerRed = [220, 38, 38] // Red-600
  const successGreen = [22, 163, 74] // Green-600
  const warningOrange = [217, 119, 6] // Orange-600

  // --- Header Section ---
  doc.setFillColor(...primaryPurple)
  doc.rect(0, 0, 210, 40, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('Subject Attendance Report', 105, 18, { align: 'center' })
  
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(`Subject Code: ${subjectCode || 'N/A'}`, 105, 28, { align: 'center' })
  
  doc.setFontSize(9)
  doc.setTextColor(200, 200, 200)
  const genTime = new Date().toLocaleString()
  doc.text(`Generated on: ${genTime}`, 105, 35, { align: 'center' })

  let currentY = 50

  for (const session of periodData) {
    if (currentY > 240) {
      doc.addPage()
      currentY = 20
    }

    // Fetch all students in this class to identify Intern/Suspend
    const { data: allStudents } = await supabase
      .from('students')
      .select('id, name, roll_number, status')
      .eq('class_id', session.class_id)

    // Fetch attendance details for this session
    const { data: attendanceRecords } = await supabase
      .from('period_student_attendance')
      .select('*, students(name, roll_number)')
      .eq('period_attendance_id', session.id)

    const absentees = attendanceRecords?.filter(r => r.status === 'absent') || []
    const onDuty = attendanceRecords?.filter(r => r.status === 'on_duty') || []
    const interns = allStudents?.filter(s => s.status === 'intern') || []
    const suspended = allStudents?.filter(s => s.status === 'suspended') || []
    
    const totalStrength = allStudents?.length || 0
    const presentCount = session.present_count || 0
    
    // session card border
    doc.setDrawColor(229, 231, 235)
    doc.setLineWidth(0.5)
    doc.roundedRect(10, currentY, 190, 15, 2, 2, 'S')
    
    // Header row of the card
    doc.setFillColor(249, 250, 251)
    doc.roundedRect(10, currentY, 190, 15, 2, 2, 'FD')
    
    doc.setTextColor(17, 24, 39)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    const className = session.classes?.name || 'Unknown Class'
    const sessionDate = new Date(session.date).toLocaleDateString('en-GB')
    doc.text(`${className} | ${session.timetable?.subject_name} (${subjectCode})`, 15, currentY + 10)
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(107, 114, 128)
    doc.text(`Date: ${sessionDate} | Period: ${session.period_number} | Handler: ${session.timetable?.faculty_name || 'N/A'}`, 155, currentY + 10, { align: 'right' })

    currentY += 20

    // Stats Section
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17, 24, 39)
    doc.text('Attendance Statistics:', 15, currentY)
    
    doc.setFont('helvetica', 'normal')
    doc.text(`Present: `, 15, currentY + 7)
    doc.setTextColor(...successGreen)
    doc.text(`${presentCount}`, 30, currentY + 7)
    doc.setTextColor(107, 114, 128)
    doc.text(` / Total Strength: ${totalStrength}`, 35, currentY + 7)
    
    const attendanceRate = totalStrength > 0 ? ((presentCount / totalStrength) * 100).toFixed(1) : 0
    doc.text(`Attendance Rate: ${attendanceRate}%`, 130, currentY + 7)

    currentY += 15

    // Right side for OD/Intern/Suspend
    let rightY = currentY + 3
    
    const drawSideList = (title, list, color, x) => {
      if (list.length === 0) return rightY
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...color)
      doc.text(`${title} (${list.length}):`, x, rightY)
      rightY += 5
      
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(31, 41, 55)
      list.forEach(item => {
        const text = `${item.students?.roll_number || item.roll_number} - ${item.students?.name || item.name}`
        doc.text(text, x, rightY)
        rightY += 4
        if (rightY > 280) {
          // Very simplified overflow handling for side lists
           doc.text('...', x, rightY)
           return
        }
      })
      rightY += 5
      return rightY
    }

    // Absentees Table
    if (absentees.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...dangerRed)
      doc.text(`Absentees (${absentees.length}):`, 15, currentY)
      
      autoTable(doc, {
        startY: currentY + 3,
        head: [['Reg No', 'Student Name']],
        body: absentees.map(a => [a.students?.roll_number || 'N/A', a.students?.name || 'N/A']),
        theme: 'grid',
        headStyles: { fillColor: [254, 242, 242], textColor: [153, 27, 27], fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 15, right: 105 } // Left side for absentees
      })
      
      const tableEndY = doc.lastAutoTable.finalY
      
      rightY = drawSideList('On Duty', onDuty, accentBlue, 110)
      rightY = drawSideList('Internship', interns, warningOrange, 110)
      rightY = drawSideList('Suspended', suspended, primaryPurple, 110)
      
      currentY = Math.max(tableEndY, rightY) + 10
    } else {
      doc.setTextColor(...successGreen)
      doc.setFont('helvetica', 'bold')
      doc.text('All students are present.', 15, currentY)
      
      // Even if none absent, show OD/Intern/Suspend
      rightY = currentY + 7
      rightY = drawSideList('On Duty', onDuty, accentBlue, 15)
      rightY = drawSideList('Internship', interns, warningOrange, 15)
      rightY = drawSideList('Suspended', suspended, primaryPurple, 15)
      currentY = rightY + 10
    }

    // Divider
    doc.setDrawColor(243, 244, 246)
    doc.line(10, currentY - 5, 200, currentY - 5)
    currentY += 5
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175)
    doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: 'center' })
    doc.text(`Institutional System Log | ${subjectCode}`, 15, 285)
  }

  doc.save(`Attendance_Report_${subjectCode}_${new Date().toISOString().split('T')[0]}.pdf`)
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
