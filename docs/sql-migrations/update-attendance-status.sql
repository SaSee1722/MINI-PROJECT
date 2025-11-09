-- Add 'on_duty' status to attendance tables
-- Run this in Supabase SQL Editor after creating the main schema

-- Update student_attendance table constraint
ALTER TABLE student_attendance DROP CONSTRAINT IF EXISTS student_attendance_status_check;
ALTER TABLE student_attendance ADD CONSTRAINT student_attendance_status_check 
CHECK (status IN ('present', 'absent', 'on_duty'));

-- Update staff_attendance table constraint
ALTER TABLE staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_status_check;
ALTER TABLE staff_attendance ADD CONSTRAINT staff_attendance_status_check 
CHECK (status IN ('present', 'absent', 'on_duty'));

-- Done!
SELECT 'Attendance status updated to include on_duty!' as message;
