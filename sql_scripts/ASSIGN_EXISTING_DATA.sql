-- ============================================
-- ASSIGN EXISTING DATA TO YOUR USER
-- ============================================
-- This SQL assigns all existing data (students, departments, classes)
-- to your current user account (salabtradebot@gmail.com)

-- Step 1: Get your user ID
-- Run this first to get your UUID:
SELECT id, email, name, role FROM users WHERE email = 'salabtradebot@gmail.com';

-- Copy the 'id' (UUID) from the result above
-- It will look like: a1b2c3d4-e5f6-7890-abcd-ef1234567890

-- Step 2: Assign all existing data to your user
-- Replace 'YOUR_USER_ID_HERE' with the actual UUID from Step 1

-- Assign departments
UPDATE departments 
SET created_by = 'YOUR_USER_ID_HERE' 
WHERE created_by IS NULL;

-- Assign classes
UPDATE classes 
SET created_by = 'YOUR_USER_ID_HERE' 
WHERE created_by IS NULL;

-- Assign students
UPDATE students 
SET created_by = 'YOUR_USER_ID_HERE' 
WHERE created_by IS NULL;

-- Assign timetable
UPDATE timetable 
SET created_by = 'YOUR_USER_ID_HERE' 
WHERE created_by IS NULL;

-- Assign sessions
UPDATE sessions 
SET created_by = 'YOUR_USER_ID_HERE' 
WHERE created_by IS NULL;

-- Step 3: Verify the assignment
-- Run these to check:
SELECT COUNT(*) as departments_assigned FROM departments WHERE created_by = 'YOUR_USER_ID_HERE';
SELECT COUNT(*) as classes_assigned FROM classes WHERE created_by = 'YOUR_USER_ID_HERE';
SELECT COUNT(*) as students_assigned FROM students WHERE created_by = 'YOUR_USER_ID_HERE';

-- ============================================
-- ALTERNATIVE: Delete Old Data and Start Fresh
-- ============================================
-- If you want to start with a clean slate instead:
-- WARNING: This deletes ALL existing data!

/*
DELETE FROM period_attendance;
DELETE FROM student_attendance;
DELETE FROM staff_attendance;
DELETE FROM timetable;
DELETE FROM students;
DELETE FROM classes;
DELETE FROM departments;
DELETE FROM sessions;
*/

-- After deleting, you can create new departments, classes, and students
-- They will automatically be assigned to whoever creates them
