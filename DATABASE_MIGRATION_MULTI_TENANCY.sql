-- ============================================
-- MULTI-TENANCY DATABASE MIGRATION
-- ============================================
-- This migration adds created_by fields to enable data isolation
-- Each admin will only see their own students, departments, and classes

-- Step 1: Add created_by column to departments table
ALTER TABLE departments 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Step 2: Add created_by column to classes table
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Step 3: Add created_by column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Step 4: Add created_by column to timetable table
ALTER TABLE timetable 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Step 5: Add created_by column to sessions table (if exists)
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Step 6: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_departments_created_by ON departments(created_by);
CREATE INDEX IF NOT EXISTS idx_classes_created_by ON classes(created_by);
CREATE INDEX IF NOT EXISTS idx_students_created_by ON students(created_by);
CREATE INDEX IF NOT EXISTS idx_timetable_created_by ON timetable(created_by);
CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON sessions(created_by);

-- Step 7: Enable Row Level Security (RLS) on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies for departments
DROP POLICY IF EXISTS "Users can view their own departments" ON departments;
CREATE POLICY "Users can view their own departments" ON departments
  FOR SELECT USING (
    created_by = auth.uid() OR 
    created_by IS NULL  -- Allow viewing legacy data without created_by
  );

DROP POLICY IF EXISTS "Users can insert their own departments" ON departments;
CREATE POLICY "Users can insert their own departments" ON departments
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their own departments" ON departments;
CREATE POLICY "Users can update their own departments" ON departments
  FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own departments" ON departments;
CREATE POLICY "Users can delete their own departments" ON departments
  FOR DELETE USING (created_by = auth.uid());

-- Step 9: Create RLS policies for classes
DROP POLICY IF EXISTS "Users can view their own classes" ON classes;
CREATE POLICY "Users can view their own classes" ON classes
  FOR SELECT USING (
    created_by = auth.uid() OR 
    created_by IS NULL  -- Allow viewing legacy data
  );

DROP POLICY IF EXISTS "Users can insert their own classes" ON classes;
CREATE POLICY "Users can insert their own classes" ON classes
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their own classes" ON classes;
CREATE POLICY "Users can update their own classes" ON classes
  FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own classes" ON classes;
CREATE POLICY "Users can delete their own classes" ON classes
  FOR DELETE USING (created_by = auth.uid());

-- Step 10: Create RLS policies for students
DROP POLICY IF EXISTS "Users can view their own students" ON students;
CREATE POLICY "Users can view their own students" ON students
  FOR SELECT USING (
    created_by = auth.uid() OR 
    created_by IS NULL  -- Allow viewing legacy data
  );

DROP POLICY IF EXISTS "Users can insert their own students" ON students;
CREATE POLICY "Users can insert their own students" ON students
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their own students" ON students;
CREATE POLICY "Users can update their own students" ON students
  FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own students" ON students;
CREATE POLICY "Users can delete their own students" ON students
  FOR DELETE USING (created_by = auth.uid());

-- Step 11: Create RLS policies for timetable
DROP POLICY IF EXISTS "Users can view their own timetable" ON timetable;
CREATE POLICY "Users can view their own timetable" ON timetable
  FOR SELECT USING (
    created_by = auth.uid() OR 
    created_by IS NULL
  );

DROP POLICY IF EXISTS "Users can insert their own timetable" ON timetable;
CREATE POLICY "Users can insert their own timetable" ON timetable
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their own timetable" ON timetable;
CREATE POLICY "Users can update their own timetable" ON timetable
  FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own timetable" ON timetable;
CREATE POLICY "Users can delete their own timetable" ON timetable
  FOR DELETE USING (created_by = auth.uid());

-- Step 12: Create RLS policies for sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON sessions;
CREATE POLICY "Users can view their own sessions" ON sessions
  FOR SELECT USING (
    created_by = auth.uid() OR 
    created_by IS NULL
  );

DROP POLICY IF EXISTS "Users can insert their own sessions" ON sessions;
CREATE POLICY "Users can insert their own sessions" ON sessions
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their own sessions" ON sessions;
CREATE POLICY "Users can update their own sessions" ON sessions
  FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own sessions" ON sessions;
CREATE POLICY "Users can delete their own sessions" ON sessions
  FOR DELETE USING (created_by = auth.uid());

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. After running, all NEW data will be isolated per user
-- 3. Existing data (created_by = NULL) will be visible to all users
-- 4. To assign existing data to a specific user, run:
--    UPDATE departments SET created_by = 'USER_ID' WHERE created_by IS NULL;
--    UPDATE classes SET created_by = 'USER_ID' WHERE created_by IS NULL;
--    UPDATE students SET created_by = 'USER_ID' WHERE created_by IS NULL;
-- 5. Replace 'USER_ID' with the actual UUID of the user
