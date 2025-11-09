-- Migration to add period column to staff_attendance table
-- Run this in Supabase SQL Editor

-- Add period column to store period information (e.g., "P1,P2,P3")
ALTER TABLE public.staff_attendance 
ADD COLUMN IF NOT EXISTS period TEXT;

-- Create index for better performance on period queries
CREATE INDEX IF NOT EXISTS idx_staff_attendance_period ON public.staff_attendance(period);

-- Add comment to explain the column
COMMENT ON COLUMN public.staff_attendance.period IS 'Comma-separated period numbers (e.g., "P1,P2,P3")';

SELECT 'Period column added to staff_attendance table successfully!' as message;
