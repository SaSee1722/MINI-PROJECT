# Year Tracking for Students

## Overview
Added year/semester tracking to help organize students by their academic progress.

## Database Columns Added

### 1. **year** (INTEGER)
- Current year of study (1st, 2nd, 3rd, 4th)
- Range: 1-4
- Default: 1
- Example: `year = 2` means 2nd year student

### 2. **semester** (INTEGER)
- Current semester (1-8 for 4-year programs)
- Range: 1-8
- Default: 1
- Example: `semester = 3` means 3rd semester

### 3. **academic_year** (TEXT)
- Academic year period
- Format: "YYYY-YYYY"
- Example: `"2024-2025"`

### 4. **admission_year** (INTEGER)
- Year when student was admitted
- Default: Current year
- Example: `2021` means admitted in 2021

## Setup Instructions

### Step 1: Run Database Migration
```bash
# In Supabase SQL Editor, run:
add-year-tracking.sql
```

### Step 2: Update Existing Students (Optional)
```sql
-- Update all Computer Science students to 2nd year
UPDATE students 
SET year = 2, semester = 3, admission_year = 2023
WHERE department_id = (SELECT id FROM departments WHERE code = 'CS');

-- Update specific students
UPDATE students 
SET year = 1, semester = 1, admission_year = 2024
WHERE roll_number IN ('CS001', 'CS002', 'CS003');
```

## Use Cases

### 1. Filter Students by Year
```sql
-- Get all 1st year students
SELECT * FROM students WHERE year = 1;

-- Get all 3rd semester students
SELECT * FROM students WHERE semester = 3;

-- Get students admitted in 2023
SELECT * FROM students WHERE admission_year = 2023;
```

### 2. Group by Year
```sql
-- Count students per year
SELECT year, COUNT(*) as student_count
FROM students
GROUP BY year
ORDER BY year;
```

### 3. Attendance by Year
```sql
-- Get attendance for 2nd year students
SELECT 
  s.name,
  s.year,
  sa.status,
  sa.date
FROM student_attendance sa
JOIN students s ON s.id = sa.student_id
WHERE s.year = 2;
```

## CSV Import Format

Update your student import template to include year fields:

```csv
roll_number,name,email,phone,department,class,date_of_birth,year,semester,admission_year
CS001,John Doe,john@example.com,1234567890,Computer Science,CS-2024-A,2000-01-15,1,1,2024
CS002,Jane Smith,jane@example.com,0987654321,CS,CS-2024-A,2000-03-20,2,3,2023
CS003,Bob Johnson,bob@example.com,1122334455,CS,CS-2024-B,1999-12-10,3,5,2022
```

## Frontend Updates Needed

### 1. Update Student Form
Add year fields to the student creation/edit form:

```javascript
// In student form component
<div>
  <label>Year</label>
  <select name="year">
    <option value="1">1st Year</option>
    <option value="2">2nd Year</option>
    <option value="3">3rd Year</option>
    <option value="4">4th Year</option>
  </select>
</div>

<div>
  <label>Semester</label>
  <select name="semester">
    <option value="1">Semester 1</option>
    <option value="2">Semester 2</option>
    {/* ... up to 8 */}
  </select>
</div>

<div>
  <label>Admission Year</label>
  <input type="number" name="admission_year" min="2000" max="2030" />
</div>
```

### 2. Add Year Filter
Add year filter to student list:

```javascript
// Filter students by year
const [selectedYear, setSelectedYear] = useState('')

const filteredStudents = students.filter(student => 
  !selectedYear || student.year === parseInt(selectedYear)
)
```

### 3. Display Year in Student List
```javascript
<div>
  <span>{student.name}</span>
  <span className="badge">Year {student.year}</span>
  <span className="badge">Sem {student.semester}</span>
</div>
```

## Reporting Enhancements

### 1. Attendance by Year
Generate reports filtered by year:
```javascript
const yearWiseReport = attendanceData.filter(record => 
  record.students?.year === selectedYear
)
```

### 2. Year-wise Statistics
```javascript
const stats = {
  year1: students.filter(s => s.year === 1).length,
  year2: students.filter(s => s.year === 2).length,
  year3: students.filter(s => s.year === 3).length,
  year4: students.filter(s => s.year === 4).length,
}
```

## Automatic Year Progression

You can create a function to automatically promote students to the next year:

```sql
-- Function to promote students to next year
CREATE OR REPLACE FUNCTION promote_students()
RETURNS void AS $$
BEGIN
  -- Promote students at the end of academic year
  UPDATE students 
  SET 
    year = year + 1,
    semester = semester + 2
  WHERE year < 4;
  
  -- Archive 4th year students (optional)
  -- UPDATE students SET status = 'graduated' WHERE year = 4;
END;
$$ LANGUAGE plpgsql;

-- Run this at the end of each academic year
-- SELECT promote_students();
```

## Year-based Class Organization

You can organize classes by year:

```sql
-- Create year-specific classes
INSERT INTO classes (name, department_id) VALUES
  ('CS-2024-Year1', (SELECT id FROM departments WHERE code = 'CS')),
  ('CS-2024-Year2', (SELECT id FROM departments WHERE code = 'CS')),
  ('CS-2024-Year3', (SELECT id FROM departments WHERE code = 'CS')),
  ('CS-2024-Year4', (SELECT id FROM departments WHERE code = 'CS'));
```

## Benefits

1. **Better Organization**: Group students by year/semester
2. **Targeted Attendance**: Take attendance for specific years
3. **Progress Tracking**: Monitor student progression
4. **Reporting**: Generate year-wise reports
5. **Analytics**: Analyze attendance patterns by year
6. **Batch Management**: Manage students by admission year

## Example Queries

### Get all 1st year students with low attendance
```sql
SELECT 
  s.roll_number,
  s.name,
  s.year,
  COUNT(CASE WHEN sa.status = 'present' THEN 1 END) as present_count,
  COUNT(*) as total_classes,
  (COUNT(CASE WHEN sa.status = 'present' THEN 1 END)::float / COUNT(*) * 100) as attendance_percentage
FROM students s
LEFT JOIN student_attendance sa ON sa.student_id = s.id
WHERE s.year = 1
GROUP BY s.id, s.roll_number, s.name, s.year
HAVING (COUNT(CASE WHEN sa.status = 'present' THEN 1 END)::float / COUNT(*) * 100) < 75
ORDER BY attendance_percentage;
```

### Get year-wise attendance summary
```sql
SELECT 
  s.year,
  COUNT(DISTINCT s.id) as total_students,
  COUNT(CASE WHEN sa.status = 'present' THEN 1 END) as total_present,
  COUNT(CASE WHEN sa.status = 'absent' THEN 1 END) as total_absent,
  ROUND(COUNT(CASE WHEN sa.status = 'present' THEN 1 END)::numeric / COUNT(*) * 100, 2) as attendance_percentage
FROM students s
LEFT JOIN student_attendance sa ON sa.student_id = s.id
GROUP BY s.year
ORDER BY s.year;
```

## Migration Strategy

### For Existing Students
1. Run the migration script
2. Update existing students with their current year:
   ```sql
   UPDATE students SET year = 1 WHERE admission_year = 2024;
   UPDATE students SET year = 2 WHERE admission_year = 2023;
   UPDATE students SET year = 3 WHERE admission_year = 2022;
   UPDATE students SET year = 4 WHERE admission_year = 2021;
   ```

### For New Students
- Year fields will be required during student creation
- Default to year 1, semester 1 for new admissions

## Next Steps

1. ✅ Run `add-year-tracking.sql` in Supabase
2. ⬜ Update student creation form to include year fields
3. ⬜ Add year filter to student list
4. ⬜ Update CSV import to handle year columns
5. ⬜ Add year-wise reporting
6. ⬜ Update existing student records with year data

## Support

If you need help with:
- Frontend implementation
- Custom year-based features
- Automatic year progression
- Year-wise analytics

Let me know and I'll help you implement them!
