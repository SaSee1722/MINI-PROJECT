import { useState } from 'react'
import { supabase } from '../services/supabase'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from './Toast'

const SimpleBulkTimetable = ({ onImportComplete, classes }) => {
  const [selectedClass, setSelectedClass] = useState('')
  const [periods, setPeriods] = useState([
    { day: '1', period: '1', subjectCode: '', subjectName: '', facultyName: '', facultyCode: '', isLab: false }
  ])
  const [importing, setImporting] = useState(false)
  const { toasts, removeToast, showSuccess, showError, showWarning } = useToast()

  const days = [
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' }
  ]

  const periodNumbers = [
    { value: '1', label: 'Period 1' },
    { value: '2', label: 'Period 2' },
    { value: '3', label: 'Period 3' },
    { value: '4', label: 'Period 4' },
    { value: '5', label: 'Period 5' },
    { value: '6', label: 'Period 6' },
    { value: '7', label: 'Period 7' },
    { value: '8', label: 'Period 8' }
  ]

  const addPeriodRow = () => {
    setPeriods([...periods, { 
      day: '1', 
      period: '1', 
      subjectCode: '', 
      subjectName: '', 
      facultyName: '', 
      facultyCode: '', 
      isLab: false 
    }])
  }

  const removePeriodRow = (index) => {
    if (periods.length > 1) {
      setPeriods(periods.filter((_, i) => i !== index))
    }
  }

  const updatePeriod = (index, field, value) => {
    const updated = [...periods]
    updated[index][field] = value
    setPeriods(updated)
  }

  const duplicateRow = (index) => {
    const newRow = { ...periods[index] }
    const updated = [...periods]
    updated.splice(index + 1, 0, newRow)
    setPeriods(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedClass) {
      showWarning('Please select a class')
      return
    }

    if (periods.some(p => !p.subjectCode || !p.subjectName || !p.facultyName)) {
      showWarning('Please fill in all required fields (Subject Code, Subject Name, Faculty Name)')
      return
    }

    setImporting(true)
    let successCount = 0
    let failCount = 0

    for (const period of periods) {
      try {
        const { error } = await supabase
          .from('timetable')
          .insert({
            class_id: selectedClass,
            day_of_week: parseInt(period.day),
            period_number: parseInt(period.period),
            subject_code: period.subjectCode,
            subject_name: period.subjectName,
            faculty_name: period.facultyName,
            faculty_code: period.facultyCode || '',
            is_lab: period.isLab
          })

        if (error) {
          console.error('Error inserting period:', error)
          failCount++
        } else {
          successCount++
        }
      } catch (err) {
        console.error('Error:', err)
        failCount++
      }
    }

    setImporting(false)
    showSuccess(`🎉 Import complete! Success: ${successCount}, Failed: ${failCount}`, 5000)
    
    if (successCount > 0) {
      setSelectedClass('')
      setPeriods([{ day: '1', period: '1', subjectCode: '', subjectName: '', facultyName: '', facultyCode: '', isLab: false }])
      onImportComplete()
    }
  }

  const fillWeekTemplate = () => {
    const template = []
    for (let day = 1; day <= 6; day++) {
      for (let period = 1; period <= 8; period++) {
        template.push({
          day: day.toString(),
          period: period.toString(),
          subjectCode: '',
          subjectName: '',
          facultyName: '',
          facultyCode: '',
          isLab: false
        })
      }
    }
    setPeriods(template)
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-blue-900">📚 Simple Bulk Timetable</h3>
          <p className="text-sm text-blue-600 mt-1">Add multiple periods easily - no CSV needed!</p>
        </div>
        <button
          type="button"
          onClick={fillWeekTemplate}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold"
        >
          📅 Fill Full Week Template
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Class Selection */}
        <div className="bg-white rounded-lg p-4 mb-4 border-2 border-blue-200">
          <label className="block text-sm font-bold text-gray-700 mb-2">Select Class *</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            required
          >
            <option value="">-- Choose a Class --</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.departments?.name})
              </option>
            ))}
          </select>
        </div>

        {/* Periods List */}
        <div className="bg-white rounded-lg p-4 mb-4 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-gray-800">Periods ({periods.length})</h4>
            <button
              type="button"
              onClick={addPeriodRow}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
            >
              ➕ Add Period
            </button>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {periods.map((period, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200 hover:border-blue-300 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-600">Period #{index + 1}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => duplicateRow(index)}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                      title="Duplicate this row"
                    >
                      📋 Copy
                    </button>
                    {periods.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePeriodRow(index)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Day */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Day *</label>
                    <select
                      value={period.day}
                      onChange={(e) => updatePeriod(index, 'day', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {days.map(day => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Period Number */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Period *</label>
                    <select
                      value={period.period}
                      onChange={(e) => updatePeriod(index, 'period', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {periodNumbers.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Subject Code */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Subject Code *</label>
                    <input
                      type="text"
                      value={period.subjectCode}
                      onChange={(e) => updatePeriod(index, 'subjectCode', e.target.value)}
                      placeholder="e.g., CA(302)"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Subject Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Subject Name *</label>
                    <input
                      type="text"
                      value={period.subjectName}
                      onChange={(e) => updatePeriod(index, 'subjectName', e.target.value)}
                      placeholder="e.g., Computer Architecture"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Faculty Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Faculty Name *</label>
                    <input
                      type="text"
                      value={period.facultyName}
                      onChange={(e) => updatePeriod(index, 'facultyName', e.target.value)}
                      placeholder="e.g., MRS. ROSHINI"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Faculty Code */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Faculty Code</label>
                    <input
                      type="text"
                      value={period.facultyCode}
                      onChange={(e) => updatePeriod(index, 'facultyCode', e.target.value)}
                      placeholder="e.g., RO"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Is Lab */}
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={period.isLab}
                        onChange={(e) => updatePeriod(index, 'isLab', e.target.checked)}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                      <span className="text-sm font-semibold text-gray-700">Lab Session</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={importing || !selectedClass}
            className={`flex-1 px-6 py-4 rounded-lg font-bold text-lg transition-all ${
              importing || !selectedClass
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl'
            }`}
          >
            {importing ? '⏳ Adding Periods...' : `✅ Add ${periods.length} Period${periods.length > 1 ? 's' : ''} to Timetable`}
          </button>
        </div>
      </form>

      {/* Quick Tips */}
      <div className="mt-4 p-4 bg-blue-100 rounded-lg border border-blue-300">
        <h4 className="font-bold text-blue-900 mb-2">💡 Quick Tips:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Click <strong>"📋 Copy"</strong> to duplicate a row with same details</li>
          <li>• Click <strong>"📅 Fill Full Week Template"</strong> to create 48 empty slots (6 days × 8 periods)</li>
          <li>• Use <strong>"➕ Add Period"</strong> to add one row at a time</li>
          <li>• Faculty Code is optional, all other fields are required</li>
        </ul>
      </div>
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

export default SimpleBulkTimetable
