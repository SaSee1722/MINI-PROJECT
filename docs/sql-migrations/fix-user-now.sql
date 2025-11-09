-- FIX USER NOW - Run this in Supabase SQL Editor
-- This will fix your existing user

-- Step 1: Check if user exists in auth
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'salabadeshwaran@gmail.com';

-- Step 2: Update the user profile with email and name
UPDATE public.users 
SET 
  email = 'salabadeshwaran@gmail.com',
  name = 'Salabadeshwaran',
  role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'salabadeshwaran@gmail.com'
);

-- Step 3: Verify it worked
SELECT id, email, name, role 
FROM public.users 
WHERE email = 'salabadeshwaran@gmail.com';

-- You should see:
-- email: salabadeshwaran@gmail.com
-- name: Salabadeshwaran
-- role: admin

-- Step 4: Also verify email is confirmed in auth
SELECT email, email_confirmed_at 
FROM auth.users 
WHERE email = 'salabadeshwaran@gmail.com';

-- If email_confirmed_at is NULL, run this:
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW()
-- WHERE email = 'salabadeshwaran@gmail.com';
