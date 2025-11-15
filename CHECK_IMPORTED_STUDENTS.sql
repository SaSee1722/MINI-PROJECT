-- ============================================
-- CHECK IMPORTED STUDENTS DIAGNOSTIC QUERY
-- ============================================
-- Use this to diagnose why imported students aren't showing up
-- Run this in Supabase SQL Editor

-- Step 1: Check all IT students and their classes
SELECT 
  s.id,
  s.roll_number,
  s.name,
  s.stream_id,
  s.class_id,
  c.name as class_name,
  s.created_at
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
WHERE s.stream_id = 'cse'
  AND (c.name LIKE '%IT%' OR c.name IS NULL)
ORDER BY s.created_at DESC, s.roll_number
LIMIT 50;

-- Step 2: Check if "III IT" class exists
SELECT 
  id,
  name,
  stream_id,
  created_at
FROM classes
WHERE stream_id = 'cse'
  AND (name LIKE '%III%IT%' OR name LIKE '%3%IT%' OR name LIKE '%IT%')
ORDER BY name;

-- Step 3: Check students without class assignments
SELECT 
  s.id,
  s.roll_number,
  s.name,
  s.stream_id,
  s.class_id,
  s.created_at
FROM students s
WHERE s.stream_id = 'cse'
  AND s.class_id IS NULL
ORDER BY s.created_at DESC;

-- Step 4: Count students by class
SELECT 
  c.name as class_name,
  COUNT(s.id) as student_count
FROM classes c
LEFT JOIN students s ON c.id = s.class_id
WHERE c.stream_id = 'cse'
GROUP BY c.name
ORDER BY c.name;

-- Step 5: Check recent imports (last 24 hours)
SELECT 
  s.id,
  s.roll_number,
  s.name,
  s.stream_id,
  s.class_id,
  c.name as class_name,
  s.created_at
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
WHERE s.stream_id = 'cse'
  AND s.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY s.created_at DESC;

-- ============================================
-- FIX MISSING CLASS ASSIGNMENTS
-- ============================================
-- If students were imported without class_id, you can manually assign them:

-- Example: Assign students to "III IT" class (replace with actual class ID)
-- First, find the class ID:
-- SELECT id, name FROM classes WHERE name = 'III IT' AND stream_id = 'cse';

-- Then update students (replace CLASS_ID_HERE with actual class ID):
-- UPDATE students
-- SET class_id = 'CLASS_ID_HERE'
-- WHERE stream_id = 'cse'
--   AND class_id IS NULL
--   AND roll_number LIKE '%IT%';  -- Adjust this condition based on your roll number pattern

