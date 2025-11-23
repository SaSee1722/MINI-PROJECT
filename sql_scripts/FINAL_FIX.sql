-- ============================================
-- FINAL FIX - Run this EXACT script
-- ============================================

-- Step 1: Check if CSE department exists
SELECT id, name, code FROM departments WHERE code = 'CSE';

-- If the above returns NO ROWS, run this:
INSERT INTO departments (name, code, description)
VALUES ('Computer Science and Engineering', 'CSE', 'Department of Computer Science and Engineering')
ON CONFLICT DO NOTHING;

-- Step 2: Update user with CSE department
UPDATE users 
SET department_id = (SELECT id FROM departments WHERE code = 'CSE')
WHERE email = 'salabadeshwaran@gmail.com';

-- Step 3: Verify the fix worked
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

-- EXPECTED OUTPUT:
-- department_id should NOT be null
-- department_name should be "Computer Science and Engineering"
-- department_code should be "CSE"

-- If department_id is STILL null, the CSE department doesn't exist
-- In that case, check departments table:
SELECT * FROM departments ORDER BY name;
