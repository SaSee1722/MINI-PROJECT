import { useState } from 'react'
import { supabase } from '../services/supabase'

const BulkStudentImport = ({ onImportComplete, departments, classes }) => {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      const fileType = selectedFile.name.split('.').pop().toLowerCase()
      if (fileType !== 'csv') {
        setError('Please upload a CSV file')
        return
      }
      setFile(selectedFile)
      setError('')
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

  const findDepartmentId = (deptName) => {
    const dept = departments.find(d => 
      d.name.toLowerCase() === deptName.toLowerCase() || 
      d.code.toLowerCase() === deptName.toLowerCase()
    )
    return dept?.id
  }

  const findClassId = (className) => {
    const cls = classes.find(c => 
      c.name.toLowerCase() === className.toLowerCase()
    )
    return cls?.id
  }

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    setImporting(true)
    setError('')
    setSuccess('')

    try {
      const text = await file.text()
      const students = parseCSV(text)

      if (students.length === 0) {
        setError('No valid data found in CSV. Please check the file format.')
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
        const department = student.department || student.dept
        const className = student.class || student.class_name || student.classname
        
        if (!rollNumber || !name || !department || !className) {
          const missing = []
          if (!rollNumber) missing.push('roll_number')
          if (!name) missing.push('name')
          if (!department) missing.push('department')
          if (!className) missing.push('class')
          errors.push(`Row ${rowNum}: Missing required fields: ${missing.join(', ')}`)
          continue
        }
        
        // Update student object with normalized field names
        student.roll_number = rollNumber
        student.name = name
        student.department = department
        student.class = className

        const departmentId = findDepartmentId(student.department)
        const classId = findClassId(student.class)

        if (!departmentId) {
          errors.push(`Row ${rowNum}: Department '${student.department}' not found`)
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
          department_id: departmentId,
          class_id: classId,
          date_of_birth: null
        })
      }

      if (errors.length > 0) {
        setError(`Import errors:\n${errors.join('\n')}`)
      }

      if (validStudents.length === 0) {
        setError('No valid students to import')
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

      setSuccess(`Successfully imported ${data.length} students!`)
      setFile(null)
      
      // Reset file input
      const fileInput = document.getElementById('csv-file-input')
      if (fileInput) fileInput.value = ''

      // Call callback
      if (onImportComplete) {
        onImportComplete()
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Import error:', err)
      setError(`Import failed: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = 'roll_number,name,department,class\n' +
                     'CS001,John Doe,Computer Science,I YR CSE-A\n' +
                     'CS002,Jane Smith,CS,I YR CSE-A'
    
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
        <span className="text-3xl">📊</span>
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
            ✓ department
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

        {error && (
          <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded-xl text-sm whitespace-pre-line animate-scaleIn shadow-lg">
            <div className="flex items-start gap-2">
              <span className="text-xl">⚠️</span>
              <div>{error}</div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-2 border-green-300 text-green-700 px-4 py-3 rounded-xl text-sm animate-scaleIn shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-xl">✅</span>
              <span>{success}</span>
            </div>
          </div>
        )}

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

      <div className="mt-6 p-4 glass rounded-xl">
        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
          <span>📝</span>
          CSV Format Example:
        </h4>
        <pre className="text-xs bg-white bg-opacity-50 p-4 rounded-lg overflow-x-auto border border-gray-200">
roll_number,name,department,class
CS001,John Doe,Computer Science,I YR CSE-A
CS002,Jane Smith,CS,I YR CSE-A
        </pre>
        <div className="mt-3 text-xs text-gray-600 space-y-1">
          <p>💡 <strong>Tip:</strong> Department and Class must match existing records</p>
          <p>💡 <strong>Tip:</strong> You can use department code (e.g., "CS" instead of "Computer Science")</p>
        </div>
      </div>
    </div>
  )
}

export default BulkStudentImport
