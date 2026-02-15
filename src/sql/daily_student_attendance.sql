-- Create daily_student_attendance table for Class Advisors to mark daily attendance
CREATE TABLE IF NOT EXISTS daily_student_attendance (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent', 'on_duty')),
  marked_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Enable Row Level Security
ALTER TABLE daily_student_attendance ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Allow all authenticated users (staff/admin) to view attendance
CREATE POLICY "Enable select for all authenticated users" ON daily_student_attendance
    FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Allow staff to mark attendance
CREATE POLICY "Enable insert for authenticated staff" ON daily_student_attendance
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Allow staff to update attendance
CREATE POLICY "Enable update for authenticated staff" ON daily_student_attendance
    FOR UPDATE USING (auth.role() = 'authenticated');
