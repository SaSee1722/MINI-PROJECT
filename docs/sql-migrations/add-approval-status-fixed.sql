-- ADD APPROVAL STATUS FOR ABSENT STUDENTS (FIXED VERSION)
-- This adds an approval_status field to track approved/unapproved absences
-- Run this as a single transaction to avoid authorization issues

BEGIN;

-- Temporarily disable RLS for modifications
ALTER TABLE public.student_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance DISABLE ROW LEVEL SECURITY;

-- Step 1: Add approval_status column to student_attendance table
ALTER TABLE public.student_attendance 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT NULL;

-- Step 2: Add approval_status column to staff_attendance table
ALTER TABLE public.staff_attendance 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT NULL;

-- Step 3: Add notes/reason column for absences (optional but useful)
ALTER TABLE public.student_attendance 
ADD COLUMN IF NOT EXISTS absence_reason TEXT DEFAULT NULL;

ALTER TABLE public.staff_attendance 
ADD COLUMN IF NOT EXISTS absence_reason TEXT DEFAULT NULL;

-- Step 4: Add check constraints (after columns are created)
DO $$ 
BEGIN
  -- Add constraint for student_attendance if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'student_attendance_approval_status_check'
  ) THEN
    ALTER TABLE public.student_attendance 
    ADD CONSTRAINT student_attendance_approval_status_check 
    CHECK (approval_status IN ('approved', 'unapproved', NULL));
  END IF;

  -- Add constraint for staff_attendance if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'staff_attendance_approval_status_check'
  ) THEN
    ALTER TABLE public.staff_attendance 
    ADD CONSTRAINT staff_attendance_approval_status_check 
    CHECK (approval_status IN ('approved', 'unapproved', NULL));
  END IF;
END $$;

-- Step 5: Create indexes for faster queries on approval_status
CREATE INDEX IF NOT EXISTS idx_student_attendance_approval 
ON public.student_attendance(approval_status) 
WHERE approval_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_attendance_approval 
ON public.staff_attendance(approval_status) 
WHERE approval_status IS NOT NULL;

-- Step 6: Re-enable RLS
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Step 7: Verify the changes
SELECT 
  table_name,
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('student_attendance', 'staff_attendance')
  AND column_name IN ('approval_status', 'absence_reason')
ORDER BY table_name, ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Approval status columns added successfully!';
  RAISE NOTICE '✅ You can now track approved/unapproved absences';
  RAISE NOTICE '✅ Absence reason field added for documentation';
  RAISE NOTICE '✅ RLS re-enabled for security';
END $$;
