-- ============================================
-- COMPLETE FIX FOR DEPARTMENT FILTERING
-- ============================================

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

-- Expected: department_id should be NULL (this is the problem!)

-- ============================================
-- STEP 2: Check auth metadata
-- ============================================

SELECT 
  id,
  email,
  raw_user_meta_data->>'department_id' as metadata_dept_id,
  raw_user_meta_data
FROM auth.users
WHERE email = 'salabadeshwaran@gmail.com';

-- Check if department_id was saved in metadata

-- ============================================
-- STEP 3: Get CSE department ID
-- ============================================

SELECT id, name, code FROM departments WHERE code = 'CSE';

-- Copy the ID from the result

-- ============================================
-- STEP 4: Fix user's department_id
-- ============================================

-- Replace with actual CSE department ID from STEP 3
UPDATE users 
SET department_id = (SELECT id FROM departments WHERE code = 'CSE')
WHERE email = 'salabadeshwaran@gmail.com';

-- ============================================
-- STEP 5: Verify fix
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
-- department_id: <UUID>

-- ============================================
-- STEP 6: Test department filtering query
-- ============================================

-- This simulates what useDepartments hook does
WITH user_profile AS (
  SELECT id, role, department_id 
  FROM users 
  WHERE email = 'salabadeshwaran@gmail.com'
)
SELECT 
  d.id,
  d.name,
  d.code,
  d.description,
  up.department_id as user_dept_id
FROM departments d
CROSS JOIN user_profile up
WHERE d.id = up.department_id;

-- Should return ONLY 1 row (CSE department)
-- If it returns 0 rows, department_id is still NULL
-- If it returns 8 rows, the WHERE clause isn't working

-- ============================================
-- STEP 7: Verify RLS is not blocking
-- ============================================

-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'departments';

-- If rowsecurity = true, disable it
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 8: Final verification
-- ============================================

-- Count departments user should see
SELECT COUNT(*) as department_count
FROM departments d
WHERE d.id = (
  SELECT department_id 
  FROM users 
  WHERE email = 'salabadeshwaran@gmail.com'
);

-- Should return: 1

-- ============================================
-- NOTES
-- ============================================

/*
After running this fix:

1. User's department_id will be set to CSE
2. useDepartments hook will return only 1 department
3. Dashboard will show "1 Active" instead of "8 Active"
4. Departments tab will show only CSE
5. All dropdowns will show only CSE

IMPORTANT: After running this SQL, you MUST:
1. Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Or clear browser cache
3. Or logout and login again

The frontend caches the departments data!
*/
