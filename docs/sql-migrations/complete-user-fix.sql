-- COMPLETE USER FIX - Run ALL of this in Supabase SQL Editor
-- This will fix everything needed for login to work

-- Step 1: Check what exists
SELECT 'Checking auth user...' as step;
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'salabadeshwaran@gmail.com';

-- Step 2: Confirm the email if not confirmed
SELECT 'Confirming email...' as step;
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  confirmed_at = COALESCE(confirmed_at, NOW())
WHERE email = 'salabadeshwaran@gmail.com';

-- Step 3: Update or insert user profile
SELECT 'Updating user profile...' as step;
INSERT INTO public.users (id, email, name, role, created_at, updated_at)
SELECT 
  id, 
  email, 
  'Salabadeshwaran', 
  'admin',
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'salabadeshwaran@gmail.com'
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  name = 'Salabadeshwaran',
  role = 'admin',
  updated_at = NOW();

-- Step 4: Verify everything is correct
SELECT 'Verification - Auth User:' as step;
SELECT id, email, email_confirmed_at, confirmed_at 
FROM auth.users 
WHERE email = 'salabadeshwaran@gmail.com';

SELECT 'Verification - User Profile:' as step;
SELECT id, email, name, role 
FROM public.users 
WHERE email = 'salabadeshwaran@gmail.com';

-- Step 5: Check if IDs match
SELECT 'Checking ID match:' as step;
SELECT 
  a.id as auth_id,
  u.id as user_id,
  CASE WHEN a.id = u.id THEN '✅ IDs MATCH' ELSE '❌ IDs DO NOT MATCH' END as status
FROM auth.users a
LEFT JOIN public.users u ON a.id = u.id
WHERE a.email = 'salabadeshwaran@gmail.com';

-- Done!
SELECT '✅ User fix complete! Try logging in now.' as message;
