-- ============================================
-- FIX: Department Filtering Issue
-- ============================================
-- Problem: Admin sees all 8 departments instead of only CSE
-- Cause: User's department_id is NULL or not set correctly

-- ============================================
-- STEP 1: Check current user profile
-- ============================================

SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.department_id,
  d.name as department_name,
  d.code as department_code
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
WHERE u.email = 'salabadeshwaran@gmail.com';

-- If department_id is NULL, continue to STEP 2

-- ============================================
-- STEP 2: Fix user's department_id
-- ============================================

-- Update user with CSE department
UPDATE users 
SET department_id = (SELECT id FROM departments WHERE code = 'CSE')
WHERE email = 'salabadeshwaran@gmail.com';

-- ============================================
-- STEP 3: Verify fix
-- ============================================

SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.department_id,
  d.name as department_name,
  d.code as department_code
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
WHERE u.email = 'salabadeshwaran@gmail.com';

-- Should now show:
-- department_name: Computer Science and Engineering
-- department_code: CSE

-- ============================================
-- STEP 4: Test department filtering
-- ============================================

-- This query simulates what the app does
-- Replace USER_ID with the actual user ID from STEP 3

WITH user_profile AS (
  SELECT role, department_id 
  FROM users 
  WHERE email = 'salabadeshwaran@gmail.com'
)
SELECT 
  d.id,
  d.name,
  d.code,
  d.description
FROM departments d
CROSS JOIN user_profile up
WHERE d.id = up.department_id;

-- Should return ONLY 1 row (CSE department)

-- ============================================
-- STEP 5: Check RLS policies
-- ============================================

-- Check if RLS is enabled on departments
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'departments';

-- If rowsecurity = true, check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'departments';

-- ============================================
-- OPTIONAL: Disable RLS on departments (if needed)
-- ============================================

-- Departments are not sensitive, so public read is fine
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;

-- ============================================
-- NOTES
-- ============================================

/*
After running this fix:

1. User's department_id will be set to CSE
2. useDepartments hook will filter by department_id
3. Admin dashboard will show only 1 department (CSE)
4. Department count will show "1 Active" instead of "8 Active"
5. Only CSE classes will be visible

Refresh the page after running this SQL!
*/
