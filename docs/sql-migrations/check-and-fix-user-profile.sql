-- CHECK AND FIX USER PROFILE
-- Run this in Supabase SQL Editor to diagnose and fix login issues

-- Step 1: Check if user exists in auth.users
SELECT 
  id, 
  email, 
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'salabadeshwaran@gmail.com';

-- Step 2: Check if user profile exists in public.users
SELECT 
  id, 
  email, 
  name, 
  role,
  created_at
FROM public.users 
WHERE email = 'salabadeshwaran@gmail.com';

-- Step 3: If profile doesn't exist, create it manually
-- (Replace the ID with the one from Step 1)
INSERT INTO public.users (id, email, name, role)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', 'Admin User'),
  COALESCE(raw_user_meta_data->>'role', 'admin')
FROM auth.users
WHERE email = 'salabadeshwaran@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = COALESCE(EXCLUDED.name, public.users.name),
  role = COALESCE(EXCLUDED.role, public.users.role);

-- Step 4: Verify the profile was created/updated
SELECT 
  id, 
  email, 
  name, 
  role,
  created_at
FROM public.users 
WHERE email = 'salabadeshwaran@gmail.com';

-- Step 5: Check RLS policies on users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';

-- Step 6: If no policies exist or they're blocking, enable RLS with proper policies
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;

-- Create new policies that allow users to read their own profile
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow insert for new signups (this is typically handled by triggers)
CREATE POLICY "Enable insert for authenticated users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Step 7: Verify policies were created
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'users';

-- Step 8: Final verification - try to select as the user would
SELECT 
  id, 
  email, 
  name, 
  role
FROM public.users 
WHERE email = 'salabadeshwaran@gmail.com';
