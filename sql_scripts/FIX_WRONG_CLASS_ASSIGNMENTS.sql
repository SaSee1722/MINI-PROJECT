-- ============================================
-- FIX STUDENTS ASSIGNED TO WRONG CLASS
-- ============================================
-- This script fixes students that were incorrectly assigned to "II IT" 
-- when they should be in "III IT" class
-- Run this in Supabase SQL Editor

-- Step 1: Check students in II IT that might belong to III IT
-- (Students with roll numbers that suggest they're third year)
SELECT 
  s.id,
  s.roll_number,
  s.name,
  s.class_id,
  c.name as current_class,
  s.created_at
FROM students s
JOIN classes c ON s.class_id = c.id
WHERE c.name = 'II IT'
  AND s.stream_id = 'cse'
  AND s.created_at >= NOW() - INTERVAL '7 days'  -- Recent imports
ORDER BY s.roll_number;

-- Step 2: Find the III IT class ID
SELECT 
  id,
  name,
  stream_id
FROM classes
WHERE stream_id = 'cse'
  AND (name = 'III IT' OR name = 'III YR IT' OR name = '3 IT')
ORDER BY name;

-- Step 3: Update students from II IT to III IT
-- IMPORTANT: Replace 'III_IT_CLASS_ID_HERE' with the actual class ID from Step 2
-- First, get the class ID:
-- SELECT id FROM classes WHERE name = 'III IT' AND stream_id = 'cse';

-- Then run this update (replace CLASS_ID_HERE with actual ID):
/*
UPDATE students
SET class_id = 'CLASS_ID_HERE'  -- Replace with actual III IT class ID
WHERE stream_id = 'cse'
  AND class_id IN (
    SELECT id FROM classes WHERE name = 'II IT' AND stream_id = 'cse'
  )
  AND created_at >= NOW() - INTERVAL '7 days'  -- Only recent imports
  AND roll_number LIKE '713623205%';  -- Adjust based on your roll number pattern
*/

-- Step 4: Verify the update
SELECT 
  s.id,
  s.roll_number,
  s.name,
  c.name as class_name,
  s.created_at
FROM students s
JOIN classes c ON s.class_id = c.id
WHERE s.stream_id = 'cse'
  AND c.name LIKE '%III%IT%'
ORDER BY s.roll_number;

-- ============================================
-- ALTERNATIVE: Manual Update by Roll Numbers
-- ============================================
-- If you know the exact roll numbers, you can update them directly:

-- Example (replace with actual roll numbers from your CSV):
/*
UPDATE students
SET class_id = (
  SELECT id FROM classes WHERE name = 'III IT' AND stream_id = 'cse' LIMIT 1
)
WHERE roll_number IN (
  '713623205001',
  '713623205002',
  '713623205003'
  -- Add all roll numbers from your III IT CSV
)
AND stream_id = 'cse';
*/

-- ============================================
-- SAFE UPDATE: Update all recent II IT students to III IT
-- ============================================
-- This updates all students in II IT class that were created recently
-- (assuming they're from your recent import)

-- First, verify how many will be affected:
SELECT COUNT(*) as students_to_update
FROM students s
JOIN classes c ON s.class_id = c.id
WHERE c.name = 'II IT'
  AND s.stream_id = 'cse'
  AND s.created_at >= NOW() - INTERVAL '7 days';

-- If the count looks correct, run the update:
/*
UPDATE students
SET class_id = (
  SELECT id FROM classes 
  WHERE name = 'III IT' AND stream_id = 'cse' 
  LIMIT 1
)
WHERE class_id IN (
  SELECT id FROM classes WHERE name = 'II IT' AND stream_id = 'cse'
)
AND stream_id = 'cse'
AND created_at >= NOW() - INTERVAL '7 days';
*/

