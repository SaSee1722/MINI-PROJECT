import { useState } from 'react'
import { supabase } from '../services/supabase'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from './Toast'

const BulkStudentImport = ({ onImportComplete, streams, classes }) => {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const { toasts, removeToast, showSuccess, showError, showWarning, showInfo } = useToast()

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      const fileType = selectedFile.name.split('.').pop().toLowerCase()
      if (fileType !== 'csv') {
        showError('Please upload a CSV file only')
        return
      }
      setFile(selectedFile)
      showSuccess('CSV file selected successfully!')
    }
  }

  const parseCSV = (text) => {
    // Handle different line endings (Windows, Mac, Unix)
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    
    if (lines.length === 0) return []
    
    // Parse header - handle quoted fields
    const parseCSVLine = (line) => {
      const result = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }
    
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
    
    const students = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length > 0 && values.some(v => v)) { // At least one non-empty value
        const student = {}
        headers.forEach((header, index) => {
          student[header] = values[index] || ''
        })
        students.push(student)
      }
    }
    return students
  }

  const findStreamId = (streamName) => {
    console.log('🔍 Looking for stream:', streamName, 'Available streams:', streams.map(s => ({id: s.id, name: s.name, code: s.code})))
    
    const stream = streams.find(s => 
      s.name.toLowerCase() === streamName.toLowerCase() || 
      s.code.toLowerCase() === streamName.toLowerCase() ||
      s.name.toLowerCase().includes(streamName.toLowerCase()) ||
      streamName.toLowerCase().includes(s.code.toLowerCase())
    )
    
    console.log('✅ Found stream:', stream?.id || 'NOT FOUND')
    return stream ? stream.id : null
  }

  const findClassId = (className) => {
    console.log('🔍 Looking for class:', className, 'Available classes:', classes.map(c => ({id: c.id, name: c.name})))
    
    const cls = classes.find(c => 
      c.name.toLowerCase() === className.toLowerCase() ||
      c.name.toLowerCase().includes(className.toLowerCase()) ||
      className.toLowerCase().includes(c.name.toLowerCase())
    )
    
    console.log('✅ Found class:', cls?.id || 'NOT FOUND')
    return cls?.id
  }

  const handleImport = async () => {
    if (!file) {
      showWarning('Please select a CSV file first')
      return
    }

    setImporting(true)
    showInfo('Starting import process...')

    try {
      const text = await file.text()
      const students = parseCSV(text)

      console.log('📄 Parsed CSV data:', students)
      console.log('📊 Available streams:', streams)
      console.log('🏫 Available classes:', classes)

      if (students.length === 0) {
        showError('No valid data found in CSV. Please check the file format.')
        setImporting(false)
        return
      }

      // Validate and transform data
      const validStudents = []
      const errors = []

      for (let i = 0; i < students.length; i++) {
        const student = students[i]
        const rowNum = i + 2 // +2 because of header and 0-index

        // Required fields - check with flexible field names
        const rollNumber = student.roll_number || student.rollnumber || student.roll
        const name = student.name || student.student_name || student.studentname
        const stream = student.stream || student.department || student.dept
        const className = student.class || student.class_name || student.classname
        
        if (!rollNumber || !name || !stream || !className) {
          const missing = []
          if (!rollNumber) missing.push('roll_number')
          if (!name) missing.push('name')
          if (!stream) missing.push('stream')
          if (!className) missing.push('class')
          errors.push(`Row ${rowNum}: Missing required fields: ${missing.join(', ')}`)
          continue
        }
        
        // Update student object with normalized field names
        student.roll_number = rollNumber
        student.name = name
        student.stream = stream
        student.class = className

        const streamId = findStreamId(student.stream)
        const classId = findClassId(student.class)

        if (!streamId) {
          errors.push(`Row ${rowNum}: Stream '${student.stream}' not found`)
          continue
        }

        if (!classId) {
          errors.push(`Row ${rowNum}: Class '${student.class}' not found`)
          continue
        }

        validStudents.push({
          roll_number: student.roll_number,
          name: student.name,
          email: null,
          phone: null,
          stream_id: streamId,
          class_id: classId,
          date_of_birth: null
        })
      }

      if (errors.length > 0) {
        showWarning(`Found ${errors.length} validation errors. Check console for details.`)
        console.warn('Import validation errors:', errors)
        
        // Show first few errors in the UI
        const firstErrors = errors.slice(0, 3).join('\n')
        showError(`Validation errors:\n${firstErrors}${errors.length > 3 ? '\n...and more (check console)' : ''}`)
      }

      if (validStudents.length === 0) {
        showError(`No valid students to import after validation. Found ${students.length} rows but none passed validation. Check console for details.`)
        setImporting(false)
        return
      }

      // Insert students
      const { data, error: insertError } = await supabase
        .from('students')
        .insert(validStudents)
        .select()

      if (insertError) {
        throw insertError
      }

      showSuccess(`🎉 Successfully imported ${data.length} students!`, 5000)
      setFile(null)
      
      // Reset file input
      const fileInput = document.getElementById('csv-file-input')
      if (fileInput) fileInput.value = ''

      // Call callback
      if (onImportComplete) {
        onImportComplete()
      }
    } catch (err) {
      console.error('Import error:', err)
      showError(`Import failed: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = 'roll_number,name,stream,class\n' +
                     'CS001,John Doe,CSE,I YR CSE-A\n' +
                     'CS002,Jane Smith,CSE,I YR CSE-A'
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student_import_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="glass-card p-6 animate-scaleIn hover-lift">
      <h3 className="text-2xl font-bold mb-4 gradient-text flex items-center gap-2">
        <span className="text-3xl">👥</span>
        Bulk Import Students
      </h3>
      
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200">
        <p className="text-sm text-gray-800 mb-3 font-medium">
          ✨ Upload a CSV file with student data
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-blue-600 shadow-sm">
            ✓ roll_number
          </span>
          <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-blue-600 shadow-sm">
            ✓ name
          </span>
          <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-blue-600 shadow-sm">
            ✓ stream
          </span>
          <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold text-blue-600 shadow-sm">
            ✓ class
          </span>
        </div>
        <button
          onClick={downloadTemplate}
          className="px-4 py-2 bg-gradient-blue text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-semibold text-sm flex items-center gap-2"
        >
          <span>📥</span>
          Download CSV Template
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <input
            id="csv-file-input"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
          />
        </div>

        {file && (
          <div className="text-sm text-gray-600">
            Selected: {file.name}
          </div>
        )}

        {/* Toast notifications will appear in top-right corner */}

        <button
          onClick={handleImport}
          disabled={!file || importing}
          className="w-full px-6 py-4 bg-gradient-purple text-white rounded-xl hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-all relative overflow-hidden group"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {importing ? (
              <>
                <span className="animate-spin">⏳</span>
                Importing...
              </>
            ) : (
              <>
                <span>📤</span>
                Import Students
              </>
            )}
          </span>
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
        </button>
      </div>

      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}

export default BulkStudentImport
