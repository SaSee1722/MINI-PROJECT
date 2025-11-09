# Department Year Organization - Complete Setup Guide

## ✅ What's Been Implemented

You can now organize your departments by **Year** and **Semester**! This allows you to have multiple years within the same department, each with their own classes and students.

## 🎯 Structure

```
Department (e.g., Computer Science)
  ├── Year 1
  │   ├── Semester 1 → Classes → Students
  │   └── Semester 2 → Classes → Students
  ├── Year 2
  │   ├── Semester 3 → Classes → Students
  │   └── Semester 4 → Classes → Students
  ├── Year 3
  │   ├── Semester 5 → Classes → Students
  │   └── Semester 6 → Classes → Students
  └── Year 4
      ├── Semester 7 → Classes → Students
      └── Semester 8 → Classes → Students
```

## 🚀 Setup Instructions

### Step 1: Run Database Migrations

**Run these SQL scripts in Supabase SQL Editor (in order):**

1. **`add-department-years.sql`** - Adds year/semester columns to classes and students tables
2. **`create-year-classes-all-departments.sql`** - Creates year-based classes for all departments

```bash
# In Supabase SQL Editor:
# 1. Run: add-department-years.sql
# 2. Run: create-year-classes-all-departments.sql
```

### Step 2: Verify Database Changes

After running the scripts, verify in Supabase:

```sql
-- Check classes table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'classes';

-- Check created classes
SELECT 
  d.code,
  c.name,
  c.year,
  c.semester
FROM classes c
JOIN departments d ON d.id = c.department_id
ORDER BY d.code, c.year, c.semester;
```

### Step 3: Frontend is Already Updated!

The frontend has been automatically updated with:
- ✅ Year selection dropdown (1-4)
- ✅ Semester selection dropdown (1-8)
- ✅ Academic year field
- ✅ Updated forms for classes and students

## 📋 How to Use

### Creating a New Class

1. **Go to Admin Dashboard** → Classes tab
2. **Click "+ Add Class"**
3. **Fill in the form:**
   - Class Name: e.g., "CS Year 1 - Section A"
   - Department: Select department
   - **Year**: Select 1, 2, 3, or 4
   - **Semester**: Select 1-8
   - **Academic Year**: e.g., "2024-2025"
4. **Click "Save"**

### Adding Students to Year-based Classes

1. **Go to Admin Dashboard** → Students tab
2. **Click "+ Add Student"**
3. **Fill in the form:**
   - Roll Number, Name, Email, Phone
   - Department: Select department
   - **Class**: Select year-specific class
   - **Year**: Select 1, 2, 3, or 4
   - **Semester**: Select 1-8
   - **Admission Year**: e.g., 2024
4. **Click "Save"**

## 🎓 Example: Computer Science Department

After running the setup scripts, you'll have:

### Year 1 (1st Year Students)
- CS - Year 1 Sem 1
- CS - Year 1 Sem 2

### Year 2 (2nd Year Students)
- CS - Year 2 Sem 3
- CS - Year 2 Sem 4

### Year 3 (3rd Year Students)
- CS - Year 3 Sem 5
- CS - Year 3 Sem 6

### Year 4 (4th Year Students)
- CS - Year 4 Sem 7
- CS - Year 4 Sem 8

## 📊 Benefits

### 1. Better Organization
- Separate classes for each year
- Easy to identify which year a class belongs to
- Clear semester progression

### 2. Targeted Attendance
- Take attendance for specific years
- Filter students by year/semester
- Generate year-wise reports

### 3. Progress Tracking
- Monitor student progression through years
- Track semester-wise performance
- Identify students who need to repeat

### 4. Batch Management
- Manage students by admission year
- Group students by cohort
- Track graduation batches

## 🔍 Filtering & Queries

### Filter Classes by Year
```javascript
// In your frontend code
const year1Classes = classes.filter(c => c.year === 1)
const year2Classes = classes.filter(c => c.year === 2)
```

### Filter Students by Year
```javascript
const year1Students = students.filter(s => s.year === 1)
const year3Students = students.filter(s => s.year === 3)
```

### Get Students by Department and Year
```sql
SELECT 
  s.roll_number,
  s.name,
  s.year,
  s.semester,
  d.name as department
FROM students s
JOIN departments d ON d.id = s.department_id
WHERE d.code = 'CS' AND s.year = 2
ORDER BY s.roll_number;
```

## 📈 Attendance by Year

### Take Attendance for Specific Year
```javascript
// Filter students by year before marking attendance
const selectedYear = 2
const filteredStudents = students.filter(s => 
  s.class_id === selectedClass && s.year === selectedYear
)
```

### Generate Year-wise Reports
```javascript
// Generate report for 3rd year students only
const year3Attendance = attendanceData.filter(record => 
  record.students?.year === 3
)
generateAttendanceReport(year3Attendance, 'student')
```

## 🔄 Year Progression

At the end of each academic year, you can promote students:

```sql
-- Promote all students to next year
UPDATE students 
SET 
  year = year + 1,
  semester = semester + 2
WHERE year < 4;

-- Update academic year
UPDATE students 
SET academic_year = '2025-2026'
WHERE year <= 4;
```

## 📝 CSV Import with Years

Update your CSV import template to include year fields:

```csv
roll_number,name,email,phone,department,class,date_of_birth,year,semester,admission_year
CS001,John Doe,john@example.com,1234567890,Computer Science,CS - Year 1 Sem 1,2000-01-15,1,1,2024
CS002,Jane Smith,jane@example.com,0987654321,Computer Science,CS - Year 2 Sem 3,1999-03-20,2,3,2023
```

## 🎯 Class Naming Convention

Recommended naming format:
- **`{DEPT_CODE} - Year {Y} Sem {S}`**
- Examples:
  - CS - Year 1 Sem 1
  - EC - Year 2 Sem 4
  - ME - Year 3 Sem 5

Or with sections:
- **`{DEPT_CODE} - Year {Y} Sem {S} - Section {X}`**
- Examples:
  - CS - Year 1 Sem 1 - Section A
  - CS - Year 1 Sem 1 - Section B

## 🔧 Customization

### Add More Years (e.g., 5-year programs)
```sql
-- Update check constraint
ALTER TABLE students 
DROP CONSTRAINT students_year_check;

ALTER TABLE students 
ADD CONSTRAINT students_year_check 
CHECK (year >= 1 AND year <= 5);

-- Same for classes table
ALTER TABLE classes 
DROP CONSTRAINT classes_year_check;

ALTER TABLE classes 
ADD CONSTRAINT classes_year_check 
CHECK (year >= 1 AND year <= 5);
```

### Add More Semesters
```sql
-- Update check constraint for 10 semesters
ALTER TABLE students 
DROP CONSTRAINT students_semester_check;

ALTER TABLE students 
ADD CONSTRAINT students_semester_check 
CHECK (semester >= 1 AND semester <= 10);
```

## 📊 Dashboard Enhancements

### Year-wise Statistics
```javascript
const stats = {
  year1: students.filter(s => s.year === 1).length,
  year2: students.filter(s => s.year === 2).length,
  year3: students.filter(s => s.year === 3).length,
  year4: students.filter(s => s.year === 4).length,
}
```

### Department-Year Breakdown
```javascript
const breakdown = departments.map(dept => ({
  department: dept.name,
  year1: students.filter(s => s.department_id === dept.id && s.year === 1).length,
  year2: students.filter(s => s.department_id === dept.id && s.year === 2).length,
  year3: students.filter(s => s.department_id === dept.id && s.year === 3).length,
  year4: students.filter(s => s.department_id === dept.id && s.year === 4).length,
}))
```

## ✅ Checklist

- [ ] Run `add-department-years.sql` in Supabase
- [ ] Run `create-year-classes-all-departments.sql` in Supabase
- [ ] Verify classes were created
- [ ] Test creating a new class with year/semester
- [ ] Test adding a student with year/semester
- [ ] Test filtering by year
- [ ] Test attendance for specific year
- [ ] Generate year-wise reports

## 🎉 You're All Set!

Your attendance system now supports:
- ✅ Multiple years per department
- ✅ Semester-based organization
- ✅ Year-wise class management
- ✅ Student progression tracking
- ✅ Year-based filtering and reporting

Start by creating year-specific classes and adding students to them!
