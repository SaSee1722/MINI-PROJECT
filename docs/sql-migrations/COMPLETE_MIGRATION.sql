-- Complete Migration for Staff Attendance Period Tracking
-- Run this ONCE in Supabase SQL Editor

-- Step 1: Add period column to staff_attendance table
ALTER TABLE public.staff_attendance 
ADD COLUMN IF NOT EXISTS period TEXT;

-- Step 2: Create index for better performance on period queries
CREATE INDEX IF NOT EXISTS idx_staff_attendance_period 
ON public.staff_attendance(period);

-- Step 3: Make session_id nullable (since we're not using it anymore)
DO $$ 
BEGIN
  ALTER TABLE public.staff_attendance 
  ALTER COLUMN session_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Step 4: Drop old unique constraint if it exists
DO $$ 
BEGIN
  ALTER TABLE public.staff_attendance 
  DROP CONSTRAINT IF EXISTS staff_attendance_user_id_date_session_id_key;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Step 5: Drop existing unique index if it exists
DROP INDEX IF EXISTS staff_attendance_user_date_period_unique;

-- Success message
SELECT 'Migration completed successfully! You can now mark attendance with periods.' as message;
