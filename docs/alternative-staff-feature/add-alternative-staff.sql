-- Migration: Add Alternative Staff Support to Period Attendance
-- This allows marking attendance when regular staff is absent

-- Step 1: Add alternative staff columns to period_attendance table
ALTER TABLE public.period_attendance 
ADD COLUMN IF NOT EXISTS alternative_staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS alternative_staff_name TEXT,
ADD COLUMN IF NOT EXISTS is_alternative_staff BOOLEAN DEFAULT FALSE;

-- Step 2: Add comment to explain the columns
COMMENT ON COLUMN period_attendance.alternative_staff_id IS 'ID of the alternative staff who marked attendance (when regular staff is absent)';
COMMENT ON COLUMN period_attendance.alternative_staff_name IS 'Name of the alternative staff for quick reference';
COMMENT ON COLUMN period_attendance.is_alternative_staff IS 'TRUE if attendance was marked by alternative staff';

-- Step 3: Create index for alternative staff queries
CREATE INDEX IF NOT EXISTS idx_period_attendance_alternative_staff 
ON period_attendance(alternative_staff_id) 
WHERE alternative_staff_id IS NOT NULL;

-- Step 4: Update RLS policies to allow alternative staff to mark attendance
-- Drop existing policy
DROP POLICY IF EXISTS "Staff and admins can mark period attendance" ON period_attendance;

-- Create new policy that includes alternative staff
CREATE POLICY "Staff and admins can mark period attendance" ON period_attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('staff', 'admin')
    )
  );

-- Step 5: Verify the changes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'period_attendance'
  AND column_name IN ('alternative_staff_id', 'alternative_staff_name', 'is_alternative_staff', 'marked_by')
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Alternative Staff feature added successfully!';
  RAISE NOTICE '✅ New columns: alternative_staff_id, alternative_staff_name, is_alternative_staff';
  RAISE NOTICE '✅ Alternative staff can now mark attendance when regular staff is absent';
  RAISE NOTICE '✅ Reports will show who actually marked the attendance';
END $$;
