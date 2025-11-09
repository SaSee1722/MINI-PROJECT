-- CREATE INTERACTIVE TIMETABLE SYSTEM
-- This creates tables for managing class timetables and period-wise attendance

BEGIN;

-- Step 1: Create timetable table
CREATE TABLE IF NOT EXISTS public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7), -- 1=Monday, 7=Sunday
  period_number INTEGER NOT NULL CHECK (period_number >= 1 AND period_number <= 10),
  subject_name TEXT NOT NULL,
  subject_code TEXT,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  room_number TEXT,
  is_lab BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, day_of_week, period_number)
);

-- Step 2: Create period_attendance table (for marking attendance by period)
CREATE TABLE IF NOT EXISTS public.period_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_id UUID REFERENCES timetable(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_marked BOOLEAN DEFAULT FALSE,
  total_students INTEGER DEFAULT 0,
  present_count INTEGER DEFAULT 0,
  absent_count INTEGER DEFAULT 0,
  marked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(timetable_id, date)
);

-- Step 3: Create period_student_attendance table (individual student attendance per period)
CREATE TABLE IF NOT EXISTS public.period_student_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_attendance_id UUID REFERENCES period_attendance(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('present', 'absent', 'on_duty')) NOT NULL,
  approval_status TEXT CHECK (approval_status IN ('approved', 'unapproved', NULL)),
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(period_attendance_id, student_id)
);

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day ON timetable(day_of_week);
CREATE INDEX IF NOT EXISTS idx_period_attendance_class ON period_attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_period_attendance_date ON period_attendance(date);
CREATE INDEX IF NOT EXISTS idx_period_student_attendance_student ON period_student_attendance(student_id);

-- Step 5: Enable RLS
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_student_attendance ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies for timetable
CREATE POLICY "Anyone can view timetable" ON timetable
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff and admins can manage timetable" ON timetable
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

-- Step 7: Create RLS policies for period_attendance
CREATE POLICY "Anyone can view period attendance" ON period_attendance
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff and admins can mark period attendance" ON period_attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

-- Step 8: Create RLS policies for period_student_attendance
CREATE POLICY "Anyone can view period student attendance" ON period_student_attendance
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff and admins can mark period student attendance" ON period_student_attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff', 'admin')
    )
  );

COMMIT;

-- Verify tables created
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('timetable', 'period_attendance', 'period_student_attendance')
ORDER BY table_name, ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Timetable system created successfully!';
  RAISE NOTICE '✅ Tables: timetable, period_attendance, period_student_attendance';
  RAISE NOTICE '✅ Ready for interactive timetable and period-wise attendance';
END $$;
