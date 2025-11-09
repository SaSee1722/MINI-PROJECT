-- ============================================
-- QUICK FIX: Set User's Department ID
-- ============================================
-- Run this ONE TIME to fix the current user

-- Step 1: Update user's department_id to CSE
UPDATE users 
SET department_id = (SELECT id FROM departments WHERE code = 'CSE')
WHERE email = 'salabadeshwaran@gmail.com';

-- Step 2: Verify
SELECT 
  u.email,
  u.role,
  d.name as department,
  d.code
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
WHERE u.email = 'salabadeshwaran@gmail.com';

-- Expected output:
-- email: salabadeshwaran@gmail.com
-- role: admin
-- department: Computer Science and Engineering
-- code: CSE
