-- ADD YEAR/SEMESTER ORGANIZATION TO DEPARTMENTS
-- This allows departments to have multiple years with separate classes

BEGIN;

-- Temporarily disable RLS for modifications
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;

-- Step 1: Add year and semester columns to classes table
-- This allows each class to belong to a specific year/semester
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT 1 
CHECK (year >= 1 AND year <= 4);

ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS semester INTEGER DEFAULT 1 
CHECK (semester >= 1 AND semester <= 8);

-- Step 2: Add academic_year to classes
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT NULL;

-- Step 3: Add year and semester to students table (if not already added)
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT 1 
CHECK (year >= 1 AND year <= 4);

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS semester INTEGER DEFAULT 1 
CHECK (semester >= 1 AND semester <= 8);

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT NULL;

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS admission_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_classes_year ON classes(year);
CREATE INDEX IF NOT EXISTS idx_classes_semester ON classes(semester);
CREATE INDEX IF NOT EXISTS idx_classes_dept_year ON classes(department_id, year);

CREATE INDEX IF NOT EXISTS idx_students_year ON students(year);
CREATE INDEX IF NOT EXISTS idx_students_semester ON students(semester);
CREATE INDEX IF NOT EXISTS idx_students_class_year ON students(class_id, year);

-- Step 5: Re-enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verify the changes
SELECT 
  'classes' as table_name,
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'classes' 
  AND column_name IN ('year', 'semester', 'academic_year')
UNION ALL
SELECT 
  'students' as table_name,
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_name = 'students' 
  AND column_name IN ('year', 'semester', 'academic_year', 'admission_year')
ORDER BY table_name, column_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Year/Semester columns added to classes and students!';
  RAISE NOTICE '✅ Now you can organize classes by department AND year';
  RAISE NOTICE '✅ Example: CS Year 1, CS Year 2, CS Year 3, CS Year 4';
END $$;

-- Example: Create year-specific classes for Computer Science department
-- Uncomment and modify the department_id to match your actual department ID

/*
-- Get the Computer Science department ID
DO $$
DECLARE
  cs_dept_id UUID;
BEGIN
  SELECT id INTO cs_dept_id FROM departments WHERE code = 'CS';
  
  -- Create classes for each year
  INSERT INTO classes (name, department_id, year, semester, academic_year) VALUES
    ('CS Year 1 - Semester 1', cs_dept_id, 1, 1, '2024-2025'),
    ('CS Year 1 - Semester 2', cs_dept_id, 1, 2, '2024-2025'),
    ('CS Year 2 - Semester 3', cs_dept_id, 2, 3, '2024-2025'),
    ('CS Year 2 - Semester 4', cs_dept_id, 2, 4, '2024-2025'),
    ('CS Year 3 - Semester 5', cs_dept_id, 3, 5, '2024-2025'),
    ('CS Year 3 - Semester 6', cs_dept_id, 3, 6, '2024-2025'),
    ('CS Year 4 - Semester 7', cs_dept_id, 4, 7, '2024-2025'),
    ('CS Year 4 - Semester 8', cs_dept_id, 4, 8, '2024-2025')
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✅ Created year-specific classes for Computer Science';
END $$;
*/
