-- ============================================
-- FIX CSE STREAM DEPARTMENTS STUDENTS STREAM ID
-- ============================================
-- This script updates IT, AIML, AIDS, and CYBER department students to have CSE stream_id
-- These are departments within CSE stream, not separate streams
-- Run this in Supabase SQL Editor

-- Step 1: Check current students with wrong stream_id (IT, AIML, AIDS, CYBER)
SELECT 
  id, 
  roll_number, 
  name, 
  stream_id,
  class_id
FROM students 
WHERE stream_id IN ('it', 'aiml', 'aids', 'cyber')
ORDER BY stream_id, roll_number;

-- Step 2: Update IT students to CSE stream
UPDATE students
SET stream_id = 'cse'
WHERE stream_id = 'it';

-- Step 3: Update AIML students to CSE stream
UPDATE students
SET stream_id = 'cse'
WHERE stream_id = 'aiml';

-- Step 4: Update AIDS students to CSE stream
UPDATE students
SET stream_id = 'cse'
WHERE stream_id = 'aids';

-- Step 5: Update CYBER students to CSE stream
UPDATE students
SET stream_id = 'cse'
WHERE stream_id = 'cyber';

-- Step 6: Verify the update
SELECT 
  id, 
  roll_number, 
  name, 
  stream_id,
  class_id
FROM students 
WHERE stream_id = 'cse'
ORDER BY roll_number;

-- Step 7: Check if any students still have wrong stream_id (should be 0 for each)
SELECT 
  stream_id,
  COUNT(*) as remaining_students
FROM students 
WHERE stream_id IN ('it', 'aiml', 'aids', 'cyber')
GROUP BY stream_id;

-- ============================================
-- NOTES
-- ============================================
/*
Why this is needed:

1. IT, AIML, AIDS, and CYBER are departments within CSE stream, not separate streams
2. Previously, these students might have been assigned stream_id = 'it', 'aiml', 'aids', or 'cyber'
3. But the filtering in useStudents only shows students with the same stream_id as the user
4. If admin/staff has stream_id = 'cse', they won't see students with different stream_ids
5. Solution: Update all IT, AIML, AIDS, and CYBER students to have stream_id = 'cse'

After running this script:
- IT, AIML, AIDS, and CYBER students will be visible to CSE stream admins/staff
- These students will appear in the dashboard and overview pages
- New students imported via CSV will automatically get stream_id = 'cse' for these departments
*/

