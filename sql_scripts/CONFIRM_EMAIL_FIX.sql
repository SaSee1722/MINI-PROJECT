-- ============================================
-- FIX: Manually Confirm Email
-- ============================================
-- This will confirm the user's email so they can login

-- Step 1: Confirm the email
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    confirmed_at = NOW()
WHERE email = 'salab4106@gmail.com';

-- Step 2: Verify the fix
SELECT 
  id,
  email, 
  email_confirmed_at, 
  confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'salab4106@gmail.com';

-- Step 3: Check if user profile exists
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.department_id,
  d.name as department_name
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
WHERE u.email = 'salab4106@gmail.com';

-- Step 4: If no profile exists, create it
INSERT INTO users (id, email, name, role, department_id, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', 'User'),
  COALESCE(au.raw_user_meta_data->>'role', 'staff'),
  (au.raw_user_meta_data->>'department_id')::uuid,
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email = 'salab4106@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'salab4106@gmail.com')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  department_id = EXCLUDED.department_id,
  updated_at = NOW();

-- Step 5: Final verification
SELECT 
  au.email,
  au.email_confirmed_at,
  u.role,
  d.name as department
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
LEFT JOIN departments d ON u.department_id = d.id
WHERE au.email = 'salab4106@gmail.com';

-- ============================================
-- EXPECTED OUTPUT
-- ============================================
-- email_confirmed_at should NOT be null
-- role should be set (admin or staff)
-- department should be set if user selected one during signup
