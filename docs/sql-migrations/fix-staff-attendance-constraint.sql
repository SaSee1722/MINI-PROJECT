-- Fix staff_attendance unique constraint to allow multiple sessions per day
-- Run this in Supabase SQL Editor

-- Step 1: Drop the old unique constraint (user_id, date)
ALTER TABLE staff_attendance DROP CONSTRAINT IF EXISTS attendance_user_id_date_key;
ALTER TABLE staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_user_id_date_key;

-- Step 2: Add new unique constraint (user_id, date, session_id)
-- This allows staff to mark attendance for multiple sessions in one day
ALTER TABLE staff_attendance 
ADD CONSTRAINT staff_attendance_user_date_session_key 
UNIQUE (user_id, date, session_id);

-- Step 3: Verify the constraint
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'staff_attendance' 
AND constraint_type = 'UNIQUE';

-- Done! Now staff can mark attendance for different sessions on the same day
SELECT 'Staff attendance constraint fixed!' as message;
