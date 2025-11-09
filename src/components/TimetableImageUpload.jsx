import { useState } from 'react'
import { supabase } from '../services/supabase'
import Tesseract from 'tesseract.js'

const TimetableImageUpload = ({ onImportComplete, classes }) => {
  const [selectedClass, setSelectedClass] = useState('')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [importing, setImporting] = useState(false)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
      setExtractedData(null)
    }
  }

  const processImage = async () => {
    if (!image || !selectedClass) {
      alert('Please select a class and upload an image')
      return
    }

    setProcessing(true)
    setOcrProgress(0)

    try {
      const result = await Tesseract.recognize(
        image,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100))
            }
          }
        }
      )

      const text = result.data.text
      console.log('Extracted text:', text)

      // Parse the extracted text to identify timetable structure
      const parsedData = parseTimetableText(text)
      setExtractedData(parsedData)
      
      if (parsedData.length === 0) {
        alert('Could not extract timetable data from the image. Please make sure the image is clear and contains a timetable.')
      }
    } catch (error) {
      console.error('OCR Error:', error)
      alert('Failed to process image. Please try again with a clearer image.')
    } finally {
      setProcessing(false)
      setOcrProgress(0)
    }
  }

  const parseTimetableText = (text) => {
    console.log('=== PARSING TIMETABLE ===')
    console.log('Raw text:', text)
    
    const periods = []
    const lines = text.split('\n').filter(line => line.trim())
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const dayMap = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 }
    
    // Step 1: Extract subject allocation table
    const subjectAllocation = {}
    let inSubjectSection = false
    
    console.log('Step 1: Extracting subject allocation...')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const lowerLine = line.toLowerCase()
      
      // Detect subject allocation section
      if (lowerLine.includes('subject') && (lowerLine.includes('allocation') || lowerLine.includes('name') || lowerLine.includes('s.no'))) {
        inSubjectSection = true
        console.log('Found subject section at line:', i)
        continue
      }
      
      // Stop at total working hours
      if (lowerLine.includes('total working') || lowerLine.includes('class advisor')) {
        inSubjectSection = false
      }
      
      if (inSubjectSection) {
        // More flexible pattern matching for subject entries
        // Handles: "1 24BSC202 Discrete Mathematics Mrs.R.TamilSelvi(RT) 6"
        // or "CA(302) Computer Architecture Mrs.I.Roshini(IR)"
        const patterns = [
          // Pattern 1: S.No Code Name Faculty Hours
          /^\d+\s+([A-Z0-9]+)\s+([A-Za-z\s&()]+?)\s+((?:Mrs?\.?|Dr\.?|Ms\.?)\s*[A-Za-z\s.]+\([A-Z]+\))/i,
          // Pattern 2: Code Name Faculty
          /^([A-Z]{2,}\(\d+\))\s+([A-Za-z\s&]+?)\s+((?:Mrs?\.?|Dr\.?|Ms\.?)\s*[A-Za-z\s.]+)/i,
          // Pattern 3: Code(Number) Name Faculty(Code)
          /([A-Z0-9]{5,})\s+([A-Za-z\s&]+?)\s+((?:Mrs?\.?|Dr\.?|Ms\.?)\s*[A-Za-z\s.]+(?:\([A-Z]+\))?)/i
        ]
        
        for (const pattern of patterns) {
          const match = line.match(pattern)
          if (match) {
            const code = match[1].trim()
            const name = match[2].trim()
            const faculty = match[3].trim()
            
            // Extract faculty code from parentheses
            const facultyCodeMatch = faculty.match(/\(([A-Z]+)\)/)
            const facultyCode = facultyCodeMatch ? facultyCodeMatch[1] : ''
            const facultyName = faculty.replace(/\([A-Z]+\)/, '').trim()
            
            console.log(`Found subject: ${code} - ${name} - ${facultyName}(${facultyCode})`)
            
            // Create multiple key variants for matching
            const codeVariants = [
              code.toUpperCase(),
              code.replace(/[()]/g, '').toUpperCase(),
              code.split('(')[0].toUpperCase(),
              // Also store abbreviated versions (first letters)
              code.match(/[A-Z]+/)?.[0]?.toUpperCase()
            ].filter(Boolean)
            
            // Also add faculty code as a key
            if (facultyCode) {
              codeVariants.push(facultyCode.toUpperCase())
            }
            
            const subjectInfo = {
              subjectCode: code,
              subjectName: name,
              facultyName: facultyName,
              facultyCode: facultyCode
            }
            
            codeVariants.forEach(variant => {
              subjectAllocation[variant] = subjectInfo
            })
            
            break
          }
        }
      }
    }
    
    console.log('Subject allocation:', subjectAllocation)
    
    // Step 2: Parse the timetable grid
    console.log('Step 2: Parsing timetable grid...')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      const lowerLine = line.toLowerCase()
      
      // Check if line contains a day
      const foundDay = days.find(day => lowerLine.includes(day))
      
      if (foundDay) {
        const currentDay = dayMap[foundDay]
        console.log(`\nProcessing ${foundDay.toUpperCase()} (day ${currentDay}):`)
        console.log('Line:', line)
        
        // Extract all subject codes from this line
        // Look for patterns like: CA(302), DS(302), OOP, DPSD, ESS, DM, etc.
        const allMatches = [
          ...line.matchAll(/([A-Z]{2,})\s*\((\d+)\)/g),  // CA(302) format
          ...line.matchAll(/\b([A-Z]{2,}[A-Z0-9]*)\b/g)   // OOP, DPSD, ESS format
        ]
        
        const foundCodes = new Set()
        allMatches.forEach(match => {
          const code = match[1].toUpperCase()
          // Skip common words that aren't subject codes
          if (['DAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'TEA', 'LUNCH', 'BREAK', 'CLUB', 'ACTIVITY', 'CYCLE', 'TEST', 'NDA', 'COURSE'].includes(code)) {
            return
          }
          foundCodes.add(code)
        })
        
        console.log('Found codes:', Array.from(foundCodes))
        
        // For each found code, try to match it to a subject and determine period
        let periodCounter = 1
        foundCodes.forEach(code => {
          const cleanCode = code.replace(/[()]/g, '').trim()
          
          // Try to find subject info
          let subjectInfo = subjectAllocation[cleanCode] || 
                           subjectAllocation[code] ||
                           subjectAllocation[code.substring(0, 3)] || // Try first 3 letters
                           subjectAllocation[code.substring(0, 2)]    // Try first 2 letters
          
          if (subjectInfo) {
            // Check if it's a lab
            const isLab = line.toLowerCase().includes('lab') || 
                         subjectInfo.subjectName.toLowerCase().includes('laboratory')
            
            console.log(`  Period ${periodCounter}: ${code} -> ${subjectInfo.subjectCode} (${subjectInfo.subjectName})`)
            
            periods.push({
              day: currentDay,
              period: periodCounter,
              subjectCode: subjectInfo.subjectCode,
              subjectName: subjectInfo.subjectName,
              facultyName: subjectInfo.facultyName,
              facultyCode: subjectInfo.facultyCode,
              isLab: isLab
            })
            
            periodCounter++
          } else {
            console.log(`  No match found for code: ${code}`)
          }
        })
      }
    }
    
    console.log(`\nTotal periods extracted: ${periods.length}`)
    console.log('Periods:', periods)
    
    return periods
  }

  const handleImport = async () => {
    if (!extractedData || extractedData.length === 0) {
      alert('No data to import')
      return
    }

    setImporting(true)
    let successCount = 0
    let failCount = 0

    for (const period of extractedData) {
      try {
        const { error } = await supabase
          .from('timetable')
          .insert({
            class_id: selectedClass,
            day_of_week: period.day,
            period_number: period.period,
            subject_code: period.subjectCode,
            subject_name: period.subjectName,
            faculty_name: period.facultyName,
            faculty_code: period.facultyCode,
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
    alert(`Import complete!\n✅ Success: ${successCount}\n❌ Failed: ${failCount}`)
    
    if (successCount > 0) {
      setSelectedClass('')
      setImage(null)
      setImagePreview(null)
      setExtractedData(null)
      onImportComplete()
    }
  }

  const updateExtractedData = (index, field, value) => {
    const updated = [...extractedData]
    updated[index][field] = value
    setExtractedData(updated)
  }

  const removeExtractedRow = (index) => {
    setExtractedData(extractedData.filter((_, i) => i !== index))
  }

  const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  return (
    <div className="bg-black border-2 border-white/20 rounded-xl p-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">📸 Upload Timetable Image</h3>
        <p className="text-sm text-gray-400">Upload a clear image of your timetable and we'll extract the data automatically</p>
      </div>

      {/* Class Selection */}
      <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-white/10">
        <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Select Class *</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full px-4 py-3 bg-black border-2 border-white/30 text-white rounded-xl focus:border-white outline-none transition-all duration-300"
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

      {/* Image Upload */}
      <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-white/10">
        <label className="block text-sm font-bold text-white mb-2 uppercase tracking-wide">Upload Timetable Image *</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full px-4 py-3 bg-black border-2 border-white/30 text-white rounded-xl focus:border-white outline-none transition-all duration-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white file:text-black file:font-bold hover:file:bg-gray-200"
        />
        
        {imagePreview && (
          <div className="mt-4">
            <img 
              src={imagePreview} 
              alt="Timetable preview" 
              className="max-w-full h-auto rounded-lg border-2 border-white/20"
            />
          </div>
        )}
      </div>

      {/* Process Button */}
      {image && !extractedData && (
        <button
          onClick={processImage}
          disabled={processing || !selectedClass}
          className={`w-full px-6 py-4 rounded-xl font-bold text-lg transition-all mb-4 uppercase tracking-wider ${
            processing || !selectedClass
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-white text-black hover:bg-gray-200 hover:scale-105'
          }`}
        >
          {processing ? `🔄 PROCESSING... ${ocrProgress}%` : '🔍 EXTRACT TIMETABLE DATA'}
        </button>
      )}

      {/* Extracted Data Preview */}
      {extractedData && extractedData.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-white">Extracted Periods ({extractedData.length})</h4>
            <p className="text-sm text-gray-400">Review and edit before importing</p>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {extractedData.map((period, index) => (
              <div key={index} className="bg-black/50 rounded-lg p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-400">
                    {days[period.day]} - Period {period.period}
                  </span>
                  <button
                    onClick={() => removeExtractedRow(index)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 uppercase font-bold"
                  >
                    ✕ Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Subject Code</label>
                    <input
                      type="text"
                      value={period.subjectCode}
                      onChange={(e) => updateExtractedData(index, 'subjectCode', e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-white/30 text-white rounded-lg text-sm focus:border-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Subject Name</label>
                    <input
                      type="text"
                      value={period.subjectName}
                      onChange={(e) => updateExtractedData(index, 'subjectName', e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-white/30 text-white rounded-lg text-sm focus:border-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Faculty Name</label>
                    <input
                      type="text"
                      value={period.facultyName}
                      onChange={(e) => updateExtractedData(index, 'facultyName', e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-white/30 text-white rounded-lg text-sm focus:border-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">Faculty Code</label>
                    <input
                      type="text"
                      value={period.facultyCode}
                      onChange={(e) => updateExtractedData(index, 'facultyCode', e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-white/30 text-white rounded-lg text-sm focus:border-white outline-none"
                    />
                  </div>

                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={period.isLab}
                        onChange={(e) => updateExtractedData(index, 'isLab', e.target.checked)}
                        className="w-5 h-5 rounded"
                      />
                      <span className="text-sm font-bold text-white uppercase">Lab Session</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Import Button */}
          <button
            onClick={handleImport}
            disabled={importing}
            className={`w-full mt-4 px-6 py-4 rounded-xl font-bold text-lg transition-all uppercase tracking-wider ${
              importing
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-white text-black hover:bg-gray-200 hover:scale-105'
            }`}
          >
            {importing ? '⏳ IMPORTING...' : `✅ IMPORT ${extractedData.length} PERIOD${extractedData.length > 1 ? 'S' : ''}`}
          </button>
        </div>
      )}

      {/* Tips */}
      <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-white/10">
        <h4 className="font-bold text-white mb-2 uppercase tracking-wide">💡 Tips for Best Results:</h4>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Use a clear, well-lit image of your timetable</li>
          <li>• Make sure text is readable and not blurry</li>
          <li>• Avoid shadows or glare on the image</li>
          <li>• Review and edit extracted data before importing</li>
          <li>• The system works best with structured timetable formats</li>
        </ul>
      </div>
    </div>
  )
}

export default TimetableImageUpload
