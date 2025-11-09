-- Migration to make session_id nullable in staff_attendance table
-- Run this in Supabase SQL Editor

-- Drop the existing unique constraint that includes session_id
ALTER TABLE public.staff_attendance 
DROP CONSTRAINT IF EXISTS staff_attendance_user_id_date_session_id_key;

-- Recreate unique constraint without session_id (allow multiple records per user per date)
-- This allows staff to mark attendance for different periods on the same date
ALTER TABLE public.staff_attendance 
DROP CONSTRAINT IF EXISTS staff_attendance_user_id_date_key;

-- Add new unique constraint on user_id, date, and period to prevent duplicate period entries
CREATE UNIQUE INDEX IF NOT EXISTS staff_attendance_user_date_period_unique 
ON public.staff_attendance(user_id, date, period);

SELECT 'Session ID is now nullable and unique constraint updated!' as message;
