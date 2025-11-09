-- Clean up duplicate staff attendance records
-- This removes old records that don't have session_id
-- Run this in Supabase SQL Editor

-- Step 1: Check for records without session_id
SELECT COUNT(*) as records_without_session
FROM staff_attendance 
WHERE session_id IS NULL;

-- Step 2: Delete old records without session_id
-- (These are the ones causing conflicts)
DELETE FROM staff_attendance 
WHERE session_id IS NULL;

-- Step 3: Verify cleanup
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT date) as unique_dates
FROM staff_attendance;

-- Done! Now you can mark attendance without errors
SELECT 'Duplicate attendance records cleaned up!' as message;
