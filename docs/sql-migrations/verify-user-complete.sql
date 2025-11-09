-- Verify user is set up correctly
-- Run this in Supabase SQL Editor

-- Check 1: User in auth.users (authentication)
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users 
WHERE id = 'bed1237c-f828-4bc8-97f8-50c5a...'; -- Your user ID

-- Check 2: User profile in public.users
SELECT 
  id,
  email,
  name,
  role,
  created_at
FROM public.users 
WHERE id = 'bed1237c-f828-4bc8-97f8-50c5a...'; -- Your user ID

-- Check 3: If email is missing, update it
UPDATE public.users 
SET 
  email = (SELECT email FROM auth.users WHERE id = 'bed1237c-f828-4bc8-97f8-50c5a...'),
  name = 'Salabadeshwaran'
WHERE id = 'bed1237c-f828-4bc8-97f8-50c5a...';

-- Check 4: Verify the update
SELECT id, email, name, role FROM public.users 
WHERE id = 'bed1237c-f828-4bc8-97f8-50c5a...';

-- If everything looks good, you should see:
-- email: salabadeshwaran@gmail.com
-- name: Salabadeshwaran
-- role: admin
