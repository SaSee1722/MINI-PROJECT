-- ============================================
-- FIX: Set User's Department ID
-- ============================================
-- The user's department_id is NULL, so the dropdown shows "Select Department"

-- Step 1: Check CSE department exists
SELECT id, name, code FROM departments WHERE code = 'CSE';

-- Step 2: Update user with CSE department
UPDATE users 
SET department_id = (SELECT id FROM departments WHERE code = 'CSE')
WHERE email = 'salabadeshwaran@gmail.com';

-- Step 3: Verify the fix
SELECT 
  id,
  email,
  name,
  role,
  department_id
FROM users 
WHERE email = 'salabadeshwaran@gmail.com';

-- Expected: department_id should have a UUID value (not NULL)

-- Step 4: Verify department name
SELECT 
  u.email,
  u.role,
  d.name as department_name,
  d.code as department_code
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
WHERE u.email = 'salabadeshwaran@gmail.com';

-- Expected output:
-- email: salabadeshwaran@gmail.com
-- role: admin
-- department_name: Computer Science and Engineering
-- department_code: CSE
