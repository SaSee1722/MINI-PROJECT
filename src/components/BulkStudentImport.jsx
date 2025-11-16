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

  // Map departments to streams
  // IT, AIML, AIDS, and CYBER are departments within CSE stream, not separate streams
  const getStreamIdFromDepartment = (departmentName) => {
    if (!departmentName) return null
    
    const dept = departmentName.toLowerCase().trim()
    
    // CSE stream departments (all map to CSE stream)
    if (dept === 'cse' || dept === 'computer science' || dept === 'computer science and engineering') {
      return 'cse'
    }
    
    // IT maps to IT stream
    if (dept === 'it' || dept === 'information technology') {
      return 'it'
    }
    
    // AIML department maps to CSE stream
    if (dept === 'aiml' || dept === 'ai/ml' || dept === 'artificial intelligence and machine learning' || 
        dept === 'artificial intelligence' || dept === 'machine learning') {
      return 'cse'
    }
    
    // AIDS department maps to CSE stream
    if (dept === 'aids' || dept === 'ai/ds' || dept === 'artificial intelligence and data science' || 
        dept === 'data science') {
      return 'cse'
    }
    
    // CYBER department maps to CSE stream
    if (dept === 'cyber' || dept === 'cybersecurity' || dept === 'cyber security' || 
        dept === 'cyber security engineering') {
      return 'cse'
    }
    
    // Other departments map to their respective streams
    if (dept === 'ece' || dept === 'electronics and communication' || dept === 'electronics and communication engineering') {
      return 'ece'
    }
    
    if (dept === 'eee' || dept === 'electrical and electronics' || dept === 'electrical and electronics engineering') {
      return 'eee'
    }
    
    if (dept === 'mech' || dept === 'mechanical' || dept === 'mechanical engineering') {
      return 'mech'
    }
    
    if (dept === 'civil' || dept === 'civil engineering') {
      return 'civil'
    }
    
    // Fallback: try to find in streams array
    const stream = streams.find(s => 
      s.name.toLowerCase() === departmentName.toLowerCase() || 
      s.code.toLowerCase() === departmentName.toLowerCase() ||
      s.name.toLowerCase().includes(departmentName.toLowerCase()) ||
      departmentName.toLowerCase().includes(s.code.toLowerCase())
    )
    
    return stream ? stream.id : null
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
    if (!className) return null
    
    console.log('🔍 Looking for class:', className, 'Available classes:', classes.map(c => ({id: c.id, name: c.name})))
    
    // Normalize the class name for matching (remove extra spaces, convert to lowercase)
    const normalizedInput = className.toLowerCase().trim().replace(/\s+/g, ' ')
    
    // Extract year part from input for validation
    const inputParts = normalizedInput.split(/\s+/)
    const inputYear = inputParts.find(p => ['i', 'ii', 'iii', 'iv', '1', '2', '3', '4'].includes(p))
    
    // Step 1: Try exact match first (highest priority)
    let cls = classes.find(c => {
      const normalizedClass = c.name.toLowerCase().trim().replace(/\s+/g, ' ')
      if (normalizedClass === normalizedInput) {
        // Verify year matches if both have years (prevent II matching III)
        if (inputYear) {
          const classParts = normalizedClass.split(/\s+/)
          const classYear = classParts.find(p => ['i', 'ii', 'iii', 'iv', '1', '2', '3', '4'].includes(p))
          if (classYear && classYear !== inputYear) {
            console.log(`⚠️ Year mismatch: input has "${inputYear}" but class has "${classYear}" - skipping`)
            return false  // Years don't match exactly
          }
        }
        return true
      }
      return false
    })
    
    if (cls) {
      console.log('✅ Found class (exact match):', cls.id, cls.name)
      return cls.id
    }
    
    // Step 2: Try matching with "YR" variations (III IT vs III YR IT)
    // Remove "YR" or "YEAR" from both for comparison, but keep the rest exact
    const inputWithoutYear = normalizedInput.replace(/\s*(yr|year)\s*/gi, ' ').replace(/\s+/g, ' ').trim()
    cls = classes.find(c => {
      const classWithoutYear = c.name.toLowerCase().trim().replace(/\s*(yr|year)\s*/gi, ' ').replace(/\s+/g, ' ').trim()
      if (classWithoutYear === inputWithoutYear) {
        // Double-check: verify year parts match exactly
        if (inputYear) {
          const classParts = classWithoutYear.split(/\s+/)
          const classYear = classParts.find(p => ['i', 'ii', 'iii', 'iv', '1', '2', '3', '4'].includes(p))
          if (classYear && classYear !== inputYear) {
            console.log(`⚠️ Year mismatch in YR variation: input has "${inputYear}" but class has "${classYear}" - skipping`)
            return false  // Years don't match exactly
          }
        }
        return true
      }
      return false
    })
    
    if (cls) {
      console.log('✅ Found class (year variation exact match):', cls.id, cls.name)
      return cls.id
    }
    
    // Step 3: Try matching with roman numeral conversions (III vs 3, II vs 2, I vs 1)
    // Convert both to a common format and compare
    const romanToNum = { 'i': '1', 'ii': '2', 'iii': '3', 'iv': '4' }
    const numToRoman = { '1': 'i', '2': 'ii', '3': 'iii', '4': 'iv' }
    
    // Convert input: replace roman numerals with numbers
    let normalizedInputWithNums = normalizedInput
    Object.entries(romanToNum).forEach(([roman, num]) => {
      // Use word boundaries to avoid matching "II" in "III"
      normalizedInputWithNums = normalizedInputWithNums.replace(new RegExp(`\\b${roman}\\b`, 'gi'), num)
    })
    
    // Also try converting numbers to roman
    let normalizedInputWithRoman = normalizedInput
    Object.entries(numToRoman).forEach(([num, roman]) => {
      normalizedInputWithRoman = normalizedInputWithRoman.replace(new RegExp(`\\b${num}\\b`, 'gi'), roman)
    })
    
    // Try exact match with converted formats
    cls = classes.find(c => {
      const normalizedClass = c.name.toLowerCase().trim().replace(/\s+/g, ' ')
      
      // Convert class name: replace roman numerals with numbers
      let normalizedClassWithNums = normalizedClass
      Object.entries(romanToNum).forEach(([roman, num]) => {
        normalizedClassWithNums = normalizedClassWithNums.replace(new RegExp(`\\b${roman}\\b`, 'gi'), num)
      })
      
      // Convert class name: replace numbers with roman
      let normalizedClassWithRoman = normalizedClass
      Object.entries(numToRoman).forEach(([num, roman]) => {
        normalizedClassWithRoman = normalizedClassWithRoman.replace(new RegExp(`\\b${num}\\b`, 'gi'), roman)
      })
      
      // Try exact matches with all combinations
      return normalizedClassWithNums === normalizedInputWithNums ||
             normalizedClassWithRoman === normalizedInputWithRoman ||
             normalizedClassWithNums === normalizedInput ||
             normalizedClassWithRoman === normalizedInput ||
             normalizedClass === normalizedInputWithNums ||
             normalizedClass === normalizedInputWithRoman
    })
    
    if (cls) {
      console.log('✅ Found class (roman numeral conversion match):', cls.id, cls.name)
      return cls.id
    }
    
    // Step 4: NO partial matching - it's too risky
    // If we haven't found an exact match by now, the class doesn't exist
    // This prevents "III IT" from incorrectly matching "II IT"
    
    console.log('❌ Class NOT FOUND:', className)
    console.log('💡 Available classes:', classes.map(c => c.name).join(', '))
    return null
  }

  const handleImport = async () => {
    if (!file) {
      showWarning('Please select a CSV file first')
      return
    }

    setImporting(true)
    showInfo('Starting import process...')

    try {
      // Get current authenticated user for created_by field
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        showError('User not authenticated. Please sign in again and retry import.')
        setImporting(false)
        return
      }

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
        // Support both old format (roll_number, name, stream, class) and new format (register_number, name, department, class)
        const rollNumber = student.register_number || student.roll_number || student.rollnumber || student.roll
        const name = student.name || student.student_name || student.studentname
        const department = student.department || student.dept || student.stream
        const className = student.class || student.class_name || student.classname
        
        if (!rollNumber || !name || !department || !className) {
          const missing = []
          if (!rollNumber) missing.push('register_number or roll_number')
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

        // Map department to stream_id (IT -> CSE stream, etc.)
        const classId = findClassId(className)
        const classObj = classes.find(c => c.id === classId)
        const streamIdFromDept = getStreamIdFromDepartment(department)
        const streamId = classObj?.stream_id || streamIdFromDept

        console.log(`📝 Row ${rowNum}: ${name} - Department: ${department} -> Stream ID: ${streamId}, Class: ${className} -> Class ID: ${classId}`)

        if (!streamId) {
          errors.push(`Row ${rowNum}: Could not determine stream. Department '${department}' did not map and class '${className}' has no stream.`)
          continue
        }

        if (!classId) {
          const availableClasses = classes.map(c => c.name).join(', ')
          errors.push(`Row ${rowNum}: Class '${className}' not found. Available classes: ${availableClasses || 'None'}`)
          console.error(`❌ Class not found for row ${rowNum}: "${className}". Available classes:`, classes.map(c => c.name))
          continue
        }

        validStudents.push({
          roll_number: student.roll_number,
          name: student.name,
          email: null,
          phone: null,
          stream_id: streamId,
          class_id: classId,
          date_of_birth: null,
          status: 'active',
          created_by: user.id
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
        .select(`
          *,
          classes (id, name),
          departments (id, name)
        `)

      if (insertError) {
        throw insertError
      }

      // Verify imported students
      console.log('✅ Imported students:', data)
      const studentsWithoutClass = data.filter(s => !s.class_id)
      if (studentsWithoutClass.length > 0) {
        console.warn('⚠️ Some students were imported without class_id:', studentsWithoutClass)
        showWarning(`${data.length} students imported, but ${studentsWithoutClass.length} are missing class assignments. Check console for details.`)
      } else {
        showSuccess(`🎉 Successfully imported ${data.length} students!`, 5000)
      }
      
      setFile(null)
      
      // Reset file input
      const fileInput = document.getElementById('csv-file-input')
      if (fileInput) fileInput.value = ''

      // Call callback to refresh the student list
      if (onImportComplete) {
        // Add a small delay to ensure database is updated
        setTimeout(() => {
          onImportComplete()
        }, 500)
      }
    } catch (err) {
      console.error('Import error:', err)
      showError(`Import failed: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = 'register_number,name,department,class\n' +
                     '267324104001,John Doe,CSE,II CSE A\n' +
                     '267324104002,Jane Smith,IT,II IT\n' +
                     '267324104003,Alice Brown,AIML,II AIML A\n' +
                     '267324104004,Bob Johnson,AIDS,II AIDS A\n' +
                     '267324104005,Charlie Wilson,CYBER,II CYBER A\n' +
                     '267324104006,David Lee,ECE,II ECE A'
    
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
            ✓ register_number
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
        <p className="text-xs text-gray-600 mb-2">
          <strong>Note:</strong> IT, AIML, AIDS, and CYBER departments are part of CSE stream. Valid departments: CSE, IT, AIML, AIDS, CYBER, ECE, EEE, MECH, CIVIL
        </p>
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
