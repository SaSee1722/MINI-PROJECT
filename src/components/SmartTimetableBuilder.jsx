import { useState } from 'react'
import { supabase } from '../services/supabase'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from './Toast'

const SmartTimetableBuilder = ({ onImportComplete, classes }) => {
  const [selectedClass, setSelectedClass] = useState('')
  const [timetable, setTimetable] = useState({})
  const [importing, setImporting] = useState(false)
  const [csvFile, setCsvFile] = useState(null)
  const [csvPreview, setCsvPreview] = useState([])
  const [showCsvImport, setShowCsvImport] = useState(false)
  const { toasts, removeToast, showSuccess, showError, showWarning, showInfo } = useToast()

  const days = [
    { value: '1', label: 'Monday', short: 'Mon' },
    { value: '2', label: 'Tuesday', short: 'Tue' },
    { value: '3', label: 'Wednesday', short: 'Wed' },
    { value: '4', label: 'Thursday', short: 'Thu' },
    { value: '5', label: 'Friday', short: 'Fri' },
    { value: '6', label: 'Saturday', short: 'Sat' }
  ]

  const periods = [1, 2, 3, 4, 5, 6]

  // Initialize empty timetable
  const initializeEmptyTimetable = () => {
    const empty = {}
    days.forEach(day => {
      empty[day.value] = {}
      periods.forEach(period => {
        empty[day.value][period] = {
          subjectCode: '',
          subjectName: '',
          facultyName: '',
          facultyCode: '',
          isLab: false
        }
      })
    })
    setTimetable(empty)
    showInfo('📅 Empty week template created! Fill in your subjects.')
  }

  // Copy Monday to all other days
  const copyMondayToAll = () => {
    if (!timetable['1']) {
      showWarning('Please fill Monday schedule first!')
      return
    }
    
    const mondaySchedule = timetable['1']
    const newTimetable = { ...timetable }
    
    days.slice(1).forEach(day => {
      newTimetable[day.value] = { ...mondaySchedule }
    })
    
    setTimetable(newTimetable)
    showSuccess('📋 Monday schedule copied to all days!')
  }

  // Copy specific day to another day
  const copyDay = (fromDay, toDay) => {
    if (!timetable[fromDay]) return
    
    const newTimetable = { ...timetable }
    newTimetable[toDay] = { ...timetable[fromDay] }
    setTimetable(newTimetable)
    
    const fromDayName = days.find(d => d.value === fromDay)?.label
    const toDayName = days.find(d => d.value === toDay)?.label
    showSuccess(`📋 ${fromDayName} copied to ${toDayName}!`)
  }

  // Update period data
  const updatePeriod = (day, period, field, value) => {
    const newTimetable = { ...timetable }
    if (!newTimetable[day]) newTimetable[day] = {}
    if (!newTimetable[day][period]) {
      newTimetable[day][period] = {
        subjectCode: '',
        subjectName: '',
        facultyName: '',
        facultyCode: '',
        isLab: false
      }
    }
    newTimetable[day][period][field] = value
    setTimetable(newTimetable)
  }

  // Smart fill - common subjects
  const smartFill = (template) => {
    const templates = {
      engineering: {
        subjects: [
          { code: 'MATH101', name: 'Mathematics I', faculty: 'Dr. Smith' },
          { code: 'PHY101', name: 'Physics I', faculty: 'Dr. Johnson' },
          { code: 'CHEM101', name: 'Chemistry I', faculty: 'Dr. Brown' },
          { code: 'ENG101', name: 'English', faculty: 'Prof. Davis' },
          { code: 'CS101', name: 'Computer Programming', faculty: 'Dr. Wilson' },
          { code: 'LAB', name: 'Laboratory', faculty: 'Lab Assistant', isLab: true }
        ]
      }
    }

    const subjects = templates[template]?.subjects || []
    const newTimetable = {}
    
    days.forEach(day => {
      newTimetable[day.value] = {}
      periods.forEach((period, index) => {
        const subject = subjects[index % subjects.length]
        newTimetable[day.value][period] = {
          subjectCode: subject?.code || '',
          subjectName: subject?.name || '',
          facultyName: subject?.faculty || '',
          facultyCode: '',
          isLab: subject?.isLab || false
        }
      })
    })
    
    setTimetable(newTimetable)
    showSuccess('🎯 Smart template applied! Customize as needed.')
  }

  // CSV Import Functions
  const handleCsvFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      parseCsv(file)
    } else {
      showError('Please select a valid CSV file')
    }
  }

  const parseCsv = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      // Expected headers: day, period, subject_code, subject_name, faculty_name, faculty_code, room_number, is_lab
      const requiredHeaders = ['day', 'period', 'subject_code', 'subject_name', 'faculty_name']
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
      
      if (missingHeaders.length > 0) {
        showError(`Missing required columns: ${missingHeaders.join(', ')}`)
        return
      }

      const data = []
      const errors = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        if (values.length !== headers.length) continue

        const row = {}
        headers.forEach((header, index) => {
          row[header] = values[index]
        })

        // Validate required fields
        if (!row.day || !row.period || !row.subject_code || !row.subject_name || !row.faculty_name) {
          errors.push(`Row ${i + 1}: Missing required fields`)
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
        if (!dayNumber) {
          errors.push(`Row ${i + 1}: Invalid day "${row.day}"`)
          continue
        }

        const periodNumber = parseInt(row.period)
        if (!periodNumber || periodNumber < 1 || periodNumber > 6) {
          errors.push(`Row ${i + 1}: Invalid period "${row.period}"`)
          continue
        }

        data.push({
          day: dayNumber,
          period: periodNumber,
          subjectCode: row.subject_code,
          subjectName: row.subject_name,
          facultyName: row.faculty_name,
          facultyCode: row.faculty_code || '',
          roomNumber: row.room_number || '',
          isLab: row.is_lab === 'true' || row.is_lab === '1' || row.is_lab === 'yes'
        })
      }

      setCsvPreview(data)
      if (errors.length > 0) {
        showWarning(`CSV parsed with ${errors.length} errors. Check console for details.`)
        console.log('CSV parsing errors:', errors)
      } else {
        showSuccess(`✅ CSV parsed successfully! Found ${data.length} periods.`)
      }
    }
    reader.readAsText(file)
  }

  const importFromCsv = () => {
    if (csvPreview.length === 0) {
      showWarning('No valid data to import from CSV')
      return
    }

    // Convert CSV data to timetable format
    const newTimetable = {}
    days.forEach(day => {
      newTimetable[day.value] = {}
      periods.forEach(period => {
        newTimetable[day.value][period] = {
          subjectCode: '',
          subjectName: '',
          facultyName: '',
          facultyCode: '',
          roomNumber: '',
          isLab: false
        }
      })
    })

    // Fill with CSV data
    csvPreview.forEach(item => {
      if (newTimetable[item.day] && newTimetable[item.day][item.period]) {
        newTimetable[item.day][item.period] = {
          subjectCode: item.subjectCode,
          subjectName: item.subjectName,
          facultyName: item.facultyName,
          facultyCode: item.facultyCode,
          roomNumber: item.roomNumber,
          isLab: item.isLab
        }
      }
    })

    setTimetable(newTimetable)
    setShowCsvImport(false)
    showSuccess(`🎉 CSV data imported! ${csvPreview.length} periods loaded.`)
  }

  const downloadCsvTemplate = () => {
    const csvContent = `day,period,subject_code,subject_name,faculty_name,faculty_code,room_number,is_lab
Monday,1,CA(302),Computer Architecture,Mrs.I.Roshini,IR,R101,false
Monday,2,DS(302),Data Structures,Mr.Shivasankaran,SSS,R102,false
Monday,3,OOP(303),Object Oriented Programming,Ms.M.Benitta Mary,MBM,R103,true
Tuesday,1,DM(302),Discrete Mathematics,Mrs.R.TamilSelvi,RT,R104,false
Tuesday,2,ESS(301),Environmental Science,Dr.M.Kumaran,MK,R105,false
Tuesday,3,DPSD(301),Digital Principles,Ms.Sree Arthi D,DSA,R106,true`

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'timetable_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    showSuccess('📥 CSV template downloaded!')
  }

  // Submit timetable
  const handleSubmit = async () => {
    if (!selectedClass) {
      showWarning('Please select a class first!')
      return
    }

    // Convert timetable object to array
    const periods = []
    Object.entries(timetable).forEach(([day, dayPeriods]) => {
      Object.entries(dayPeriods).forEach(([period, data]) => {
        if (data.subjectCode && data.subjectName && data.facultyName) {
          periods.push({
            day,
            period,
            ...data
          })
        }
      })
    })

    if (periods.length === 0) {
      showWarning('Please fill at least one period!')
      return
    }

    setImporting(true)
    let successCount = 0
    let failCount = 0

    for (const period of periods) {
      try {
        const { error } = await supabase
          .from('timetable')
          .insert([{
            class_id: selectedClass,
            day_of_week: parseInt(period.day),
            period_number: parseInt(period.period),
            subject_code: period.subjectCode,
            subject_name: period.subjectName,
            faculty_name: period.facultyName,
            faculty_code: period.facultyCode || null,
            is_lab: period.isLab
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

    setImporting(false)
    showSuccess(`🎉 Import complete! Success: ${successCount}, Failed: ${failCount}`, 5000)
    
    if (successCount > 0) {
      setSelectedClass('')
      setTimetable({})
      onImportComplete()
    }
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-purple-900 flex items-center gap-2">
            🚀 Smart Timetable Builder
          </h3>
          <p className="text-purple-700 text-sm mt-1">Build complete week schedules in minutes!</p>
        </div>
      </div>

      {/* Class Selection */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-purple-900 mb-2">Select Class</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
        >
          <option value="">Choose a class...</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <button
          onClick={initializeEmptyTimetable}
          className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold text-sm"
        >
          📅 Empty Week
        </button>
        <button
          onClick={copyMondayToAll}
          className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold text-sm"
        >
          📋 Copy Monday
        </button>
        <button
          onClick={() => smartFill('engineering')}
          className="px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-semibold text-sm"
        >
          🎯 Smart Fill
        </button>
        <button
          onClick={downloadCsvTemplate}
          className="px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold text-sm"
        >
          📥 Download CSV
        </button>
        <button
          onClick={() => setShowCsvImport(!showCsvImport)}
          className="px-4 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors font-semibold text-sm"
        >
          📊 Import CSV
        </button>
        <button
          onClick={() => setTimetable({})}
          className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold text-sm"
        >
          🗑️ Clear All
        </button>
      </div>

      {/* CSV Import Section */}
      {showCsvImport && (
        <div className="mb-6 p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
          <h4 className="text-lg font-bold text-indigo-800 mb-3">📊 CSV Import</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-indigo-700 mb-2">Upload CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFileChange}
                className="w-full px-3 py-2 border-2 border-indigo-300 rounded-lg focus:border-indigo-500 focus:outline-none bg-white"
              />
              <p className="text-xs text-indigo-600 mt-1">
                Expected format: day, period, subject_code, subject_name, faculty_name, faculty_code, room_number, is_lab
              </p>
            </div>
            
            {csvPreview.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-indigo-700">Preview ({csvPreview.length} periods)</span>
                  <button
                    onClick={importFromCsv}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-sm"
                  >
                    ✅ Import Data
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto bg-white border border-indigo-200 rounded">
                  <table className="w-full text-xs">
                    <thead className="bg-indigo-100">
                      <tr>
                        <th className="px-2 py-1 text-left">Day</th>
                        <th className="px-2 py-1 text-left">Period</th>
                        <th className="px-2 py-1 text-left">Subject</th>
                        <th className="px-2 py-1 text-left">Faculty</th>
                        <th className="px-2 py-1 text-left">Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.slice(0, 10).map((item, index) => (
                        <tr key={index} className="border-b border-indigo-100">
                          <td className="px-2 py-1">{days.find(d => d.value == item.day)?.label}</td>
                          <td className="px-2 py-1">{item.period}</td>
                          <td className="px-2 py-1">{item.subjectCode}</td>
                          <td className="px-2 py-1">{item.facultyName}</td>
                          <td className="px-2 py-1">{item.facultyCode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvPreview.length > 10 && (
                    <p className="text-xs text-indigo-600 p-2 text-center">... and {csvPreview.length - 10} more</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timetable Grid */}
      {Object.keys(timetable).length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-bold text-purple-900 mb-4">📚 Week Schedule</h4>
          <div className="space-y-6">
            {days.map(day => (
              <div key={day.value} className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-bold text-purple-800">{day.label}</h5>
                  <div className="flex gap-2">
                    {days.filter(d => d.value !== day.value).map(targetDay => (
                      <button
                        key={targetDay.value}
                        onClick={() => copyDay(day.value, targetDay.value)}
                        className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                      >
                        → {targetDay.short}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {periods.map(period => (
                    <div key={period} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="text-xs font-bold text-gray-600 mb-2">Period {period}</div>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Subject Code"
                          value={timetable[day.value]?.[period]?.subjectCode || ''}
                          onChange={(e) => updatePeriod(day.value, period, 'subjectCode', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Subject Name"
                          value={timetable[day.value]?.[period]?.subjectName || ''}
                          onChange={(e) => updatePeriod(day.value, period, 'subjectName', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Faculty Name"
                          value={timetable[day.value]?.[period]?.facultyName || ''}
                          onChange={(e) => updatePeriod(day.value, period, 'facultyName', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`lab-${day.value}-${period}`}
                            checked={timetable[day.value]?.[period]?.isLab || false}
                            onChange={(e) => updatePeriod(day.value, period, 'isLab', e.target.checked)}
                            className="text-purple-500"
                          />
                          <label htmlFor={`lab-${day.value}-${period}`} className="text-xs text-gray-600">Lab Session</label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={importing || !selectedClass}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          {importing ? (
            <>
              <span className="animate-spin inline-block mr-2">⏳</span>
              Creating Timetable...
            </>
          ) : (
            <>
              <span className="mr-2">🚀</span>
              Create Timetable
            </>
          )}
        </button>
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 bg-purple-100 rounded-lg border border-purple-300">
        <h4 className="font-bold text-purple-900 mb-2">💡 Pro Tips:</h4>
        <ul className="text-sm text-purple-800 space-y-1">
          <li>• Use <strong>"📥 Download CSV"</strong> to get a template with your college format</li>
          <li>• Use <strong>"📊 Import CSV"</strong> for bulk import from Excel/Google Sheets</li>
          <li>• Use <strong>"📅 Empty Week"</strong> to create 36 empty slots (6 days × 6 periods)</li>
          <li>• Fill Monday completely, then use <strong>"📋 Copy Monday"</strong> to duplicate to all days</li>
          <li>• Use <strong>"🎯 Smart Fill"</strong> for common engineering subjects template</li>
          <li>• CSV format: day, period, subject_code, subject_name, faculty_name, faculty_code, room_number, is_lab</li>
          <li>• Only filled periods (with Subject Code, Name, and Faculty) will be saved</li>
        </ul>
      </div>
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

export default SmartTimetableBuilder
