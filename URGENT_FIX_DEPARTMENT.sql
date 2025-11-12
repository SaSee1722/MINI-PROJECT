-- ============================================
-- URGENT: Fix User Department ID
-- ============================================
-- The console shows: "Department ID: null"
-- This means the user's department_id is NOT set in the database

-- Step 1: Check current user's department
SELECT 
  email,
  name,
  role,
  department_id,
  created_at
FROM users 
WHERE email = 'salabadeshwaran@gmail.com';

-- Expected: department_id should be NULL (this is the problem!)

-- Step 2: Get CSE department ID
SELECT id, name, code 
FROM departments 
WHERE code = 'CSE';

-- Step 3: Update user with CSE department
UPDATE users 
SET department_id = (SELECT id FROM departments WHERE code = 'CSE')
WHERE email = 'salabadeshwaran@gmail.com';

-- Step 4: Verify the fix
SELECT 
  u.email,
  u.name,
  u.role,
  u.department_id,
  d.name as department_name,
  d.code as department_code
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
WHERE u.email = 'salabadeshwaran@gmail.com';

-- Expected output:
-- email: salabadeshwaran@gmail.com
-- role: admin
-- department_id: [UUID - NOT NULL]
-- department_name: Computer Science and Engineering
-- department_code: CSE

-- ============================================
-- AFTER RUNNING THIS SQL:
-- ============================================
-- 1. Refresh the browser (Cmd + Shift + R)
-- 2. Check console - should see:
--    "🔧 Auto-setting department: [UUID]"
--    "✅ Short report dept set to: [UUID]"
-- 3. Click "Generate Report" - should work!
