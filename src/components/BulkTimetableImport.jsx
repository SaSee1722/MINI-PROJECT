import { useState } from 'react'
import { supabase } from '../services/supabase'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from './Toast'

const BulkTimetableImport = ({ onImportComplete, classes }) => {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState([])
  const [errors, setErrors] = useState([])
  const { toasts, removeToast, showSuccess, showError, showWarning } = useToast()

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      parseCSV(selectedFile)
    } else {
      showError('Please select a valid CSV file')
    }
  }

  const parseCSV = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      
      const data = []
      const parseErrors = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        if (values.length < 7) continue

        const row = {
          class_name: values[0],
          day_of_week: values[1],
          period_number: values[2],
          subject_code: values[3],
          subject_name: values[4],
          faculty_name: values[5],
          faculty_code: values[6] || '',
          is_lab: values[7]?.toLowerCase() === 'yes' || values[7]?.toLowerCase() === 'true'
        }

        // Validate day of week
        const dayMap = {
          'monday': 1, 'mon': 1,
          'tuesday': 2, 'tue': 2,
          'wednesday': 3, 'wed': 3,
          'thursday': 4, 'thu': 4,
          'friday': 5, 'fri': 5,
          'saturday': 6, 'sat': 6
        }
        
        const dayLower = row.day_of_week.toLowerCase()
        if (!dayMap[dayLower]) {
          parseErrors.push(`Row ${i + 1}: Invalid day "${row.day_of_week}"`)
          continue
        }
        row.day_of_week = dayMap[dayLower]

        // Validate period number
        const periodNum = parseInt(row.period_number)
        if (isNaN(periodNum) || periodNum < 1 || periodNum > 6) {
          parseErrors.push(`Row ${i + 1}: Invalid period number "${row.period_number}"`)
          continue
        }
        row.period_number = periodNum

        // Find matching class
        const matchingClass = classes.find(c => 
          c.name.toLowerCase() === row.class_name.toLowerCase()
        )
        
        if (!matchingClass) {
          parseErrors.push(`Row ${i + 1}: Class "${row.class_name}" not found`)
          continue
        }
        
        row.class_id = matchingClass.id
        data.push(row)
      }

      setPreview(data)
      setErrors(parseErrors)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (preview.length === 0) {
      showWarning('No valid data to import')
      return
    }

    setImporting(true)
    let successCount = 0
    let failCount = 0

    for (const period of preview) {
      try {
        const { error } = await supabase
          .from('timetable')
          .insert({
            class_id: period.class_id,
            day_of_week: period.day_of_week,
            period_number: period.period_number,
            subject_code: period.subject_code,
            subject_name: period.subject_name,
            faculty_name: period.faculty_name,
            faculty_code: period.faculty_code,
            is_lab: period.is_lab
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
      setFile(null)
      setPreview([])
      setErrors([])
      onImportComplete()
    }
  }

  const downloadTemplate = () => {
    const template = `class,day_of_week,period_number,subject_code,subject_name,faculty_name,faculty_code,is_lab
II CSE A,Monday,1,CA(302),Computer Architecture,MRS. ROSHINI,RO,No
II CSE A,Monday,2,DS(303),Data Structures,MR. KUMAR,KU,No
II CSE A,Monday,3,DBMS(304),Database Management,MS. PRIYA,PR,No
II CSE A,Tuesday,1,DS LAB,Data Structures Lab,MR. KUMAR,KU,Yes`
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'timetable_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-purple-900">📚 Bulk Timetable Import</h3>
          <p className="text-sm text-purple-600 mt-1">Upload multiple timetable periods at once using CSV</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
        >
          📥 Download CSV Template
        </button>
      </div>

      <div className="bg-white rounded-lg p-4 mb-4">
        <div className="mb-3">
          <h4 className="font-semibold text-gray-700 mb-2">📋 CSV Format Example:</h4>
          <div className="bg-gray-50 p-3 rounded border border-gray-200 text-xs font-mono overflow-x-auto">
            <div className="text-gray-600">class,day_of_week,period_number,subject_code,subject_name,faculty_name,faculty_code,is_lab</div>
            <div className="text-gray-800">II CSE A,Monday,1,CA(302),Computer Architecture,MRS. ROSHINI,RO,No</div>
            <div className="text-gray-800">II CSE A,Tuesday,2,DS(303),Data Structures,MR. KUMAR,KU,No</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-gray-700 mb-1">💡 Tips:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>Class name must match existing class</li>
              <li>Day: Monday, Tuesday, Wed, Thu, Fri, Sat</li>
              <li>Period: 1 to 6</li>
              <li>Is Lab: Yes or No</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">⚠️ Important:</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              <li>First row must be headers</li>
              <li>Use comma (,) as separator</li>
              <li>Faculty code is optional</li>
              <li>Check for duplicate entries</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="flex-1 px-4 py-2 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
        <button
          onClick={handleImport}
          disabled={!file || preview.length === 0 || importing}
          className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
            !file || preview.length === 0 || importing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          {importing ? '⏳ Importing...' : '📤 Import Periods'}
        </button>
      </div>

      {errors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-2">❌ Errors Found:</h4>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {preview.length > 0 && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">✅ Preview ({preview.length} periods ready to import):</h4>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-green-100 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left">Class</th>
                  <th className="px-2 py-1 text-left">Day</th>
                  <th className="px-2 py-1 text-left">Period</th>
                  <th className="px-2 py-1 text-left">Subject</th>
                  <th className="px-2 py-1 text-left">Faculty</th>
                  <th className="px-2 py-1 text-left">Lab</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((period, index) => (
                  <tr key={index} className="border-b border-green-200">
                    <td className="px-2 py-1">{period.class_name}</td>
                    <td className="px-2 py-1">{['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][period.day_of_week]}</td>
                    <td className="px-2 py-1">{period.period_number}</td>
                    <td className="px-2 py-1">{period.subject_code}</td>
                    <td className="px-2 py-1">{period.faculty_name}</td>
                    <td className="px-2 py-1">{period.is_lab ? '✓' : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && (
              <p className="text-xs text-green-700 mt-2 text-center">... and {preview.length - 10} more</p>
            )}
          </div>
        </div>
      )}
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

export default BulkTimetableImport
