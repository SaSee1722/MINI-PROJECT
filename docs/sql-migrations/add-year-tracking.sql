-- ADD YEAR TRACKING FOR STUDENTS
-- This adds year/semester tracking to the attendance system

BEGIN;

-- Temporarily disable RLS for modifications
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;

-- Option 1: Add year column to students table
-- This tracks which year the student is in (1st year, 2nd year, etc.)
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT 1 
CHECK (year >= 1 AND year <= 4);

-- Option 2: Add semester column (optional)
-- This tracks which semester (1-8 for 4-year programs)
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS semester INTEGER DEFAULT 1 
CHECK (semester >= 1 AND semester <= 8);

-- Option 3: Add academic year column (optional)
-- This tracks the academic year (e.g., '2024-2025')
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT NULL;

-- Option 4: Add batch/admission year
-- This tracks when the student was admitted (e.g., 2021, 2022)
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS admission_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_year ON students(year);
CREATE INDEX IF NOT EXISTS idx_students_semester ON students(semester);
CREATE INDEX IF NOT EXISTS idx_students_admission_year ON students(admission_year);

-- Re-enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'students' 
  AND column_name IN ('year', 'semester', 'academic_year', 'admission_year')
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Year tracking columns added successfully!';
  RAISE NOTICE '✅ year: Current year (1-4)';
  RAISE NOTICE '✅ semester: Current semester (1-8)';
  RAISE NOTICE '✅ academic_year: Academic year (e.g., 2024-2025)';
  RAISE NOTICE '✅ admission_year: Year of admission';
END $$;

-- Example: Update existing students
-- UPDATE students SET year = 1, semester = 1, admission_year = 2024 WHERE department_id = 'some-id';
