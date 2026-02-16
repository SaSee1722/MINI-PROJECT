-- PURGE ALL ATTENDANCE DATA
-- This script will clear all attendance records (Daily, Period-wise, and Staff)
-- It keeps your Students, Classes, and Staff accounts intact.
-- Run this in the Supabase SQL Editor.

BEGIN;

-- 1. Clear Period-wise Student Attendance (the individual marks)
TRUNCATE TABLE public.period_student_attendance CASCADE;

-- 2. Clear Period Attendance Headers (the aggregated period sessions)
TRUNCATE TABLE public.period_attendance CASCADE;

-- 3. Clear Daily Student Attendance (Advisor-marked attendance)
TRUNCATE TABLE public.daily_student_attendance CASCADE;

-- 4. Clear General Student Attendance (Legacy/Secondary records)
TRUNCATE TABLE public.student_attendance CASCADE;

-- 5. Clear Staff Attendance
TRUNCATE TABLE public.staff_attendance CASCADE;

-- 6. Optional: Clear Leave Requests (Uncomment if you want to reset these too)
-- TRUNCATE TABLE public.student_leave_requests CASCADE;

COMMIT;

SELECT '✅ All attendance reports and data have been cleared successfully!' as message;
