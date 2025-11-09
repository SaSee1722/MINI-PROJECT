-- ============================================
-- DEBUG: Check User Profile and Department
-- ============================================

-- Step 1: Check user profile
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

-- Step 2: Check auth user metadata
SELECT 
  id,
  email,
  raw_user_meta_data
FROM auth.users
WHERE email = 'salabadeshwaran@gmail.com';

-- Step 3: Check all departments
SELECT id, name, code FROM departments ORDER BY name;

-- ============================================
-- FIX: If department_id is NULL
-- ============================================

-- Get CSE department ID
SELECT id FROM departments WHERE code = 'CSE';

-- Update user with CSE department (replace DEPT_ID with actual ID from above)
UPDATE users 
SET department_id = (SELECT id FROM departments WHERE code = 'CSE')
WHERE email = 'salabadeshwaran@gmail.com';

-- Verify fix
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
