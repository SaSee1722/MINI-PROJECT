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
    { value: 'present', label: 'Present', color: 'bg-emerald-500 shadow-emerald-500/20', icon: '✓', unselected: 'bg-white/5 text-gray-400 hover:bg-white/10' },
    { value: 'absent', label: 'Absent', color: 'bg-red-500 shadow-red-500/20', icon: '✗', unselected: 'bg-white/5 text-gray-400 hover:bg-white/10' },
    { value: 'on_duty', label: 'On Duty', color: 'bg-blue-500 shadow-blue-500/20', icon: '◉', unselected: 'bg-white/5 text-gray-400 hover:bg-white/10' }
  ]

  return (
    <div className="flex flex-col gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-all">
      {/* Student Info */}
      <div className="flex-shrink-0">
        <div className="font-bold text-gray-200 text-sm tracking-tight">{studentName}</div>
      </div>
      
      {/* Attendance and Approval Options Container */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Attendance Options */}
        <div className="flex gap-2">
          {statuses.map((status) => (
            <button
              key={status.value}
              onClick={() => handleStatusChange(status.value)}
              className={`
                relative px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all duration-300
                ${selectedStatus === status.value 
                  ? `${status.color} text-white shadow-xl scale-105` 
                  : status.unselected
                }
              `}
            >
              <span className="flex items-center gap-2">
                <span className="text-sm">{status.icon}</span>
                <span>{status.label}</span>
              </span>
              {selectedStatus === status.value && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Approval Status Options - Show only when Absent is selected */}
        {showApprovalOptions && (
          <div className="flex items-center gap-3 animate-fadeIn pl-2 sm:border-l sm:border-white/10">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Status:</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleApprovalChange('approved')}
                className={`
                  px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-300 whitespace-nowrap border
                  ${approvalStatus === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                    : 'bg-white/5 text-gray-500 border-transparent hover:bg-white/10'
                  }
                `}
              >
                <div className="flex items-center gap-1.5">
                  <span>✓</span>
                  <span>Approved</span>
                </div>
              </button>
              <button
                onClick={() => handleApprovalChange('unapproved')}
                className={`
                  px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-300 whitespace-nowrap border
                  ${approvalStatus === 'unapproved'
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-lg shadow-orange-500/10'
                    : 'bg-white/5 text-gray-500 border-transparent hover:bg-white/10'
                  }
                `}
              >
                <div className="flex items-center gap-1.5">
                  <span>⚠</span>
                  <span>Unapproved</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AttendanceCheckbox
