import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const generatePeriodAttendanceReport = async (periodData, supabase) => {
  const doc = new jsPDF('landscape') // Use landscape orientation for better fit
  
  // Add title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Period-wise Attendance Report', 14, 20)
  
  // Add date
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28)
  
  // Add legend for alternative staff
  doc.setFontSize(9)
  doc.setTextColor(204, 102, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('Legend: ', 14, 33)
  doc.setFont('helvetica', 'normal')
  doc.text('(Alt.) = Marked by Alternative Staff', 30, 33)
  doc.setTextColor(0, 0, 0) // Reset to black
  
  // Collect all attendance records with student details
  const allRecords = []
  
  for (const record of periodData) {
    // Fetch all students for this period
    try {
      const { data: students, error } = await supabase
        .from('period_student_attendance')
        .select(`
          *,
          students (
            roll_number,
            name,
            classes (name)
          )
        `)
        .eq('period_attendance_id', record.id)
        .order('students(roll_number)')
      
      if (!error && students) {
        students.forEach(student => {
          // Format status
          let statusText = student.status.charAt(0).toUpperCase() + student.status.slice(1).replace('_', ' ')
          if (student.status === 'absent' && student.approval_status) {
            statusText = `Absent (${student.approval_status.charAt(0).toUpperCase() + student.approval_status.slice(1)})`
          } else if (student.status === 'on_duty') {
            statusText = 'On Duty'
          }
          
          // Determine who marked the attendance
          let markedByFaculty = record.timetable?.faculty_name || 'N/A'
          if (record.is_alternative_staff && record.alternative_staff_name) {
            markedByFaculty = `${record.alternative_staff_name} (Alt.)`
          }
          
          allRecords.push({
            rollNumber: student.students?.roll_number || 'N/A',
            name: student.students?.name || 'N/A',
            class: student.students?.classes?.name || record.classes?.name || 'N/A',
            date: new Date(record.date).toLocaleDateString(),
            period: record.period_number,
            subject: `${record.timetable?.subject_code || 'N/A'} - ${record.timetable?.subject_name || 'N/A'}`,
            faculty: markedByFaculty,
            regularFaculty: record.timetable?.faculty_name || 'N/A',
            isAlternative: record.is_alternative_staff || false,
            status: statusText,
            statusRaw: student.status,
            approvalStatus: student.approval_status
          })
        })
      }
    } catch (err) {
      console.error('Error fetching students for period:', err)
    }
  }
  
  // Create table data
  const tableData = allRecords.map(record => [
    record.rollNumber,
    record.name,
    record.class,
    record.date,
    record.subject,
    record.faculty,
    record.status
  ])
  
  // Generate table
  autoTable(doc, {
    startY: 40,
    head: [['Roll No', 'Name', 'Class', 'Date', 'Subject', 'Faculty', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [102, 126, 234],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'ellipsize',
      cellWidth: 'wrap',
      valign: 'middle',
      minCellHeight: 8
    },
    columnStyles: {
      0: { cellWidth: 28, overflow: 'ellipsize' },  // Roll No
      1: { cellWidth: 52, overflow: 'linebreak' },  // Name - More space for full names
      2: { cellWidth: 24, halign: 'center', overflow: 'ellipsize' },  // Class
      3: { cellWidth: 26, halign: 'center', overflow: 'ellipsize' },  // Date
      4: { cellWidth: 42, overflow: 'linebreak' },  // Subject - More space
      5: { cellWidth: 36, overflow: 'ellipsize' },  // Faculty
      6: { cellWidth: 28, halign: 'center', overflow: 'ellipsize' }   // Status
    },
    // Add custom styling for different statuses and alternative staff
    didParseCell: function(data) {
      const rowIndex = data.row.index
      const record = allRecords[rowIndex]
      
      // Highlight alternative staff rows with yellow background
      if (record && record.isAlternative) {
        data.cell.styles.fillColor = [255, 252, 230] // Light yellow background
      }
      
      // Color code the faculty column for alternative staff
      if (data.column.index === 5 && data.cell.section === 'body') {
        const faculty = data.cell.raw
        if (faculty.includes('(Alt.)')) {
          data.cell.styles.textColor = [204, 102, 0] // Orange for alternative staff
          data.cell.styles.fontStyle = 'bold'
        }
      }
      
      // Color code status column
      if (data.column.index === 6 && data.cell.section === 'body') {
        const status = data.cell.raw
        if (status.includes('Approved')) {
          data.cell.styles.textColor = [34, 139, 34] // Green for approved
          data.cell.styles.fontStyle = 'bold'
        } else if (status.includes('Unapproved')) {
          data.cell.styles.textColor = [255, 140, 0] // Orange for unapproved
          data.cell.styles.fontStyle = 'bold'
        } else if (status === 'Present') {
          data.cell.styles.textColor = [0, 128, 0] // Green for present
        } else if (status === 'On Duty') {
          data.cell.styles.textColor = [0, 0, 255] // Blue for on duty
        } else if (status.includes('Absent') && !status.includes('Approved') && !status.includes('Unapproved')) {
          data.cell.styles.textColor = [220, 20, 60] // Red for absent
        }
      }
    }
  })
  
  // Add footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }
  
  // Save the PDF
  const fileName = `period_attendance_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

export const generateAttendanceReport = (attendanceData, reportType = 'student') => {
  const doc = new jsPDF()
  
  // Add title
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  const title = reportType === 'student' ? 'Student Attendance Report' : 'Staff Attendance Report'
  doc.text(title, 14, 20)
  
  // Add date
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28)
  
  if (reportType === 'student') {
    // Student attendance report
    const tableData = attendanceData.map(record => {
      // Format status with approval status for absent students
      let statusText = record.status.charAt(0).toUpperCase() + record.status.slice(1).replace('_', ' ')
      
      // Add approval status if student is absent
      if (record.status === 'absent' && record.approval_status) {
        const approvalText = record.approval_status.charAt(0).toUpperCase() + record.approval_status.slice(1)
        statusText = `Absent (${approvalText})`
      }
      
      return [
        record.students?.roll_number || 'N/A',
        record.students?.name || 'N/A',
        record.classes?.name || 'N/A',
        record.sessions?.name 
          ? `${record.sessions.name} (${record.sessions.start_time} - ${record.sessions.end_time})`
          : 'N/A',
        new Date(record.date).toLocaleDateString(),
        statusText
      ]
    })
    
    autoTable(doc, {
      startY: 35,
      head: [['Roll No', 'Name', 'Class', 'Session', 'Date', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [102, 126, 234],
        fontSize: 10,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 40 },
        2: { cellWidth: 28 },
        3: { cellWidth: 40 },
        4: { cellWidth: 28 },
        5: { cellWidth: 22 }
      },
      // Add custom styling for different statuses
      didParseCell: function(data) {
        if (data.column.index === 5 && data.cell.section === 'body') {
          const status = data.cell.raw
          if (status.includes('Approved')) {
            data.cell.styles.textColor = [34, 139, 34] // Green for approved
            data.cell.styles.fontStyle = 'bold'
          } else if (status.includes('Unapproved')) {
            data.cell.styles.textColor = [255, 140, 0] // Orange for unapproved
            data.cell.styles.fontStyle = 'bold'
          } else if (status === 'Present') {
            data.cell.styles.textColor = [0, 128, 0] // Green for present
          } else if (status.includes('Absent') && !status.includes('Approved') && !status.includes('Unapproved')) {
            data.cell.styles.textColor = [220, 20, 60] // Red for absent without approval status
          }
        }
      }
    })
  } else {
    // Staff attendance report
    const tableData = attendanceData.map(record => {
      // Format status with approval status for absent staff
      let statusText = record.status.charAt(0).toUpperCase() + record.status.slice(1).replace('_', ' ')
      
      // Add approval status if staff is absent
      if (record.status === 'absent' && record.approval_status) {
        const approvalText = record.approval_status.charAt(0).toUpperCase() + record.approval_status.slice(1)
        statusText = `Absent (${approvalText})`
      }
      
      // Show period information (e.g., "P1,P2,P3")
      let periodInfo = record.period || 'Not specified'
      
      return [
        record.users?.name || 'N/A',
        new Date(record.date).toLocaleDateString(),
        periodInfo,
        statusText
      ]
    })
    
    autoTable(doc, {
      startY: 35,
      head: [['Staff Name', 'Date', 'Period', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [102, 126, 234],
        fontSize: 11,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 10,
        cellPadding: 4,
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 60, halign: 'left' },
        1: { cellWidth: 45, halign: 'center' },
        2: { cellWidth: 40, halign: 'center', fontSize: 10 },
        3: { cellWidth: 45, halign: 'center' }
      },
      // Add custom styling for different statuses
      didParseCell: function(data) {
        if (data.column.index === 3 && data.cell.section === 'body') {
          const status = data.cell.raw
          if (status.includes('Approved')) {
            data.cell.styles.textColor = [34, 139, 34] // Green for approved
            data.cell.styles.fontStyle = 'bold'
          } else if (status.includes('Unapproved')) {
            data.cell.styles.textColor = [255, 140, 0] // Orange for unapproved
            data.cell.styles.fontStyle = 'bold'
          } else if (status === 'Present') {
            data.cell.styles.textColor = [0, 128, 0] // Green for present
          } else if (status.includes('Absent') && !status.includes('Approved') && !status.includes('Unapproved')) {
            data.cell.styles.textColor = [220, 20, 60] // Red for absent without approval status
          } else if (status === 'On Duty') {
            data.cell.styles.textColor = [0, 0, 255] // Blue for on duty
          }
        }
      }
    })
  }
  
  // Add footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }
  
  // Save the PDF
  const fileName = reportType === 'student' 
    ? `student_attendance_${new Date().toISOString().split('T')[0]}.pdf`
    : `staff_attendance_${new Date().toISOString().split('T')[0]}.pdf`
  
  doc.save(fileName)
}
