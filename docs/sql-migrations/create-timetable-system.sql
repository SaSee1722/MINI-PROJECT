-- INTERACTIVE TIMETABLE SYSTEM
-- Based on college timetable format with 6 periods per day

BEGIN;

-- Step 1: Create timetable table
CREATE TABLE IF NOT EXISTS public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 6), -- 1=Monday to 6=Saturday
  period_number INTEGER NOT NULL CHECK (period_number >= 1 AND period_number <= 6),
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  faculty_name TEXT NOT NULL,
  faculty_code TEXT,
  room_number TEXT,
  is_lab BOOLEAN DEFAULT FALSE,
  hours_per_week INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, day_of_week, period_number)
);

-- Step 2: Create period_times table (defines period timings)
CREATE TABLE IF NOT EXISTS public.period_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_number INTEGER NOT NULL UNIQUE CHECK (period_number >= 1 AND period_number <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  period_name TEXT
);

-- Insert default period timings
INSERT INTO period_times (period_number, start_time, end_time, period_name) VALUES
  (1, '08:30', '09:20', 'Period I'),
  (2, '09:20', '10:10', 'Period II'),
  (3, '10:25', '11:15', 'Period III (After Tea Break)'),
  (4, '11:15', '12:05', 'Period IV'),
  (5, '12:45', '01:35', 'Period V (After Lunch)'),
  (6, '01:35', '02:30', 'Period VI')
ON CONFLICT (period_number) DO NOTHING;

-- Step 3: Create period_attendance table
CREATE TABLE IF NOT EXISTS public.period_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timetable_id UUID REFERENCES timetable(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  day_of_week INTEGER NOT NULL,
  period_number INTEGER NOT NULL,
  marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_marked BOOLEAN DEFAULT FALSE,
  total_students INTEGER DEFAULT 0,
  present_count INTEGER DEFAULT 0,
  absent_count INTEGER DEFAULT 0,
  on_duty_count INTEGER DEFAULT 0,
  marked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(timetable_id, date)
);

-- Step 4: Create period_student_attendance table
CREATE TABLE IF NOT EXISTS public.period_student_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_attendance_id UUID REFERENCES period_attendance(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('present', 'absent', 'on_duty')) NOT NULL,
  approval_status TEXT CHECK (approval_status IN ('approved', 'unapproved', NULL)),
  marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(period_attendance_id, student_id)
);

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day ON timetable(day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_class_day ON timetable(class_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_period_attendance_class_date ON period_attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_period_attendance_marked ON period_attendance(is_marked);
CREATE INDEX IF NOT EXISTS idx_period_student_attendance_student ON period_student_attendance(student_id);

-- Step 6: Enable RLS
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_student_attendance ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies
CREATE POLICY "Anyone can view timetable" ON timetable
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff and admins can manage timetable" ON timetable
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );

CREATE POLICY "Anyone can view period times" ON period_times
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can view period attendance" ON period_attendance
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff and admins can mark period attendance" ON period_attendance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );

CREATE POLICY "Anyone can view period student attendance" ON period_student_attendance
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Staff and admins can mark period student attendance" ON period_student_attendance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('staff', 'admin'))
  );

COMMIT;

-- Verify tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('timetable', 'period_times', 'period_attendance', 'period_student_attendance')
ORDER BY table_name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Interactive timetable system created!';
  RAISE NOTICE '✅ Tables: timetable, period_times, period_attendance, period_student_attendance';
  RAISE NOTICE '✅ 6 periods configured (08:30 - 02:30)';
  RAISE NOTICE '✅ Ready for period-wise attendance marking';
END $$;
