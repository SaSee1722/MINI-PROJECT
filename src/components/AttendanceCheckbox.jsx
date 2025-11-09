import { useState, useEffect } from 'react'

const AttendanceCheckbox = ({ studentId, studentName, initialStatus, initialApprovalStatus, onChange }) => {
  const [selectedStatus, setSelectedStatus] = useState(initialStatus || '')
  const [approvalStatus, setApprovalStatus] = useState(initialApprovalStatus || '')
  const [showApprovalOptions, setShowApprovalOptions] = useState(false)

  useEffect(() => {
    setSelectedStatus(initialStatus || '')
    setApprovalStatus(initialApprovalStatus || '')
    setShowApprovalOptions(initialStatus === 'absent')
  }, [initialStatus, initialApprovalStatus])

  const handleStatusChange = (status) => {
    setSelectedStatus(status)
    
    // Show approval options only when absent is selected
    if (status === 'absent') {
      setShowApprovalOptions(true)
      // Default to unapproved if not set
      const newApprovalStatus = approvalStatus || 'unapproved'
      setApprovalStatus(newApprovalStatus)
      
      if (onChange) {
        onChange(studentId, status, newApprovalStatus)
      }
    } else {
      setShowApprovalOptions(false)
      // For present and on_duty, set approval status to 'approved'
      const newApprovalStatus = 'approved'
      setApprovalStatus(newApprovalStatus)
      
      if (onChange) {
        onChange(studentId, status, newApprovalStatus)
      }
    }
  }

  const handleApprovalChange = (approval) => {
    setApprovalStatus(approval)
    if (onChange) {
      onChange(studentId, selectedStatus, approval)
    }
  }

  const statuses = [
    { value: 'present', label: 'Present', color: 'bg-green-500', icon: '✓' },
    { value: 'absent', label: 'Absent', color: 'bg-red-500', icon: '✗' },
    { value: 'on_duty', label: 'On Duty', color: 'bg-blue-500', icon: '◉' }
  ]

  return (
    <div className="flex flex-col gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
      {/* Student Info */}
      <div className="flex-shrink-0">
        <div className="font-medium text-gray-900 text-base">{studentName}</div>
      </div>
      
      {/* Attendance and Approval Options Container */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Attendance Options */}
        <div className="flex gap-2">
          {statuses.map((status) => (
            <button
              key={status.value}
              onClick={() => handleStatusChange(status.value)}
              className={`
                relative px-4 py-2 rounded-lg font-semibold text-white transition-all duration-300 text-sm
                ${selectedStatus === status.value 
                  ? `${status.color} shadow-lg` 
                  : 'bg-gray-300 hover:bg-gray-400'
                }
              `}
            >
              <span className="flex items-center gap-1">
                <span className="text-base">{status.icon}</span>
                <span>{status.label}</span>
              </span>
              {selectedStatus === status.value && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Approval Status Options - Show only when Absent is selected */}
        {showApprovalOptions && (
          <div className="flex items-center gap-2 animate-fadeIn">
            <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">Absence Status:</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleApprovalChange('approved')}
                className={`
                  px-4 py-2 rounded-lg font-semibold transition-all duration-300 text-sm whitespace-nowrap
                  ${approvalStatus === 'approved'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }
                `}
              >
                <span className="flex items-center gap-1">
                  <span>✓</span>
                  <span>Approved</span>
                </span>
              </button>
              <button
                onClick={() => handleApprovalChange('unapproved')}
                className={`
                  px-4 py-2 rounded-lg font-semibold transition-all duration-300 text-sm whitespace-nowrap
                  ${approvalStatus === 'unapproved'
                    ? 'bg-orange-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }
                `}
              >
                <span className="flex items-center gap-1">
                  <span>⚠</span>
                  <span>Unapproved</span>
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AttendanceCheckbox
