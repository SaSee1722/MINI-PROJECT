-- QUICK FIX FOR LOGIN STUCK ISSUE
-- Run this entire script in Supabase SQL Editor
-- Replace 'salabadeshwaran@gmail.com' with your actual email

-- Step 1: Check if user exists and get their ID
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'salabadeshwaran@gmail.com';
  v_name TEXT := 'Salabadeshwaran';
  v_role TEXT := 'admin';
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found in auth.users with email: %', v_email;
  END IF;
  
  RAISE NOTICE 'Found user ID: %', v_user_id;
  
  -- Create or update user profile in public.users
  INSERT INTO public.users (id, email, name, role, created_at)
  VALUES (v_user_id, v_email, v_name, v_role, NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role;
  
  RAISE NOTICE 'User profile created/updated successfully';
  
END $$;

-- Step 2: Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;

-- Step 4: Create proper RLS policies
-- Allow users to read their own profile
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

-- Allow insert for new signups (needed for trigger)
CREATE POLICY "Enable insert for authenticated users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Step 5: Verify everything worked
SELECT 
  'User Profile' as check_type,
  id,
  email,
  name,
  role,
  created_at
FROM public.users 
WHERE email = 'salabadeshwaran@gmail.com'

UNION ALL

SELECT 
  'Auth User' as check_type,
  id,
  email,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data->>'role' as role,
  created_at
FROM auth.users 
WHERE email = 'salabadeshwaran@gmail.com';

-- Step 6: Show active policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  roles
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- SUCCESS MESSAGE
DO $$
BEGIN
  RAISE NOTICE '✅ Login fix completed! Try logging in again.';
  RAISE NOTICE '📧 Email: salabadeshwaran@gmail.com';
  RAISE NOTICE '🔐 Role: admin';
END $$;
