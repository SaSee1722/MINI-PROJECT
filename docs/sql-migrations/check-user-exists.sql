-- Check if user exists in both auth and users tables
-- Run this in Supabase SQL Editor

-- Check auth.users table
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'salabadeshwaran@gmail.com';

-- Check public.users table
SELECT id, email, name, role, created_at 
FROM public.users 
WHERE email = 'salabadeshwaran@gmail.com';

-- If user exists in auth but not in public.users, create profile:
-- INSERT INTO public.users (id, email, name, role)
-- SELECT id, email, 'Salabadeshwaran', 'admin'
-- FROM auth.users
-- WHERE email = 'salabadeshwaran@gmail.com'
-- ON CONFLICT (id) DO NOTHING;
