-- ADD APPROVAL STATUS FOR ABSENT STUDENTS
-- This adds an approval_status field to track approved/unapproved absences

-- Step 1: Add approval_status column to student_attendance table
ALTER TABLE public.student_attendance 
ADD COLUMN IF NOT EXISTS approval_status TEXT 
CHECK (approval_status IN ('approved', 'unapproved', NULL))
DEFAULT NULL;

-- Step 2: Add approval_status column to staff_attendance table
ALTER TABLE public.staff_attendance 
ADD COLUMN IF NOT EXISTS approval_status TEXT 
CHECK (approval_status IN ('approved', 'unapproved', NULL))
DEFAULT NULL;

-- Step 3: Add notes/reason column for absences (optional but useful)
ALTER TABLE public.student_attendance 
ADD COLUMN IF NOT EXISTS absence_reason TEXT DEFAULT NULL;

ALTER TABLE public.staff_attendance 
ADD COLUMN IF NOT EXISTS absence_reason TEXT DEFAULT NULL;

-- Step 4: Create index for faster queries on approval_status
CREATE INDEX IF NOT EXISTS idx_student_attendance_approval 
ON student_attendance(approval_status) 
WHERE approval_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_attendance_approval 
ON staff_attendance(approval_status) 
WHERE approval_status IS NOT NULL;

-- Step 5: Verify the changes
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'student_attendance' 
  AND column_name IN ('approval_status', 'absence_reason')
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Approval status columns added successfully!';
  RAISE NOTICE '✅ You can now track approved/unapproved absences';
  RAISE NOTICE '✅ Absence reason field added for documentation';
END $$;
