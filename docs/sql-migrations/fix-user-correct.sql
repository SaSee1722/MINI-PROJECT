-- CORRECTED USER FIX - Run this in Supabase SQL Editor
-- This fixes the "confirmed_at" error

-- Step 1: Confirm the email (only update email_confirmed_at, not confirmed_at)
UPDATE auth.users 
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email = 'salabadeshwaran@gmail.com';

-- Step 2: Update or insert user profile
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

-- Step 3: Reset password to Admin123
UPDATE auth.users
SET encrypted_password = crypt('Admin123', gen_salt('bf'))
WHERE email = 'salabadeshwaran@gmail.com';

-- Step 4: Verify everything
SELECT 'Auth User:' as check;
SELECT id, email, email_confirmed_at FROM auth.users 
WHERE email = 'salabadeshwaran@gmail.com';

SELECT 'User Profile:' as check;
SELECT id, email, name, role FROM public.users 
WHERE email = 'salabadeshwaran@gmail.com';

-- Done! Now login with:
-- Email: salabadeshwaran@gmail.com
-- Password: Admin123
