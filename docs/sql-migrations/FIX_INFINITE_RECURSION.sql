-- FIX INFINITE RECURSION ERROR IN RLS POLICIES
-- This fixes the "infinite recursion detected in policy" error

-- Step 1: Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Allow users to read own data" ON public.users;
DROP POLICY IF EXISTS "Allow users to update own data" ON public.users;

-- Step 2: Temporarily disable RLS to fix the issue
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify user profile exists
SELECT 
  id, 
  email, 
  name, 
  role
FROM public.users 
WHERE email = 'salabadeshwaran@gmail.com';

-- Step 4: If no profile exists, create it
INSERT INTO public.users (id, email, name, role)
SELECT 
  id,
  email,
  'Salabadeshwaran',
  'admin'
FROM auth.users
WHERE email = 'salabadeshwaran@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  name = 'Salabadeshwaran',
  role = 'admin';

-- Step 5: Re-enable RLS with SIMPLE, non-recursive policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 6: Create simple SELECT policy (no recursion)
CREATE POLICY "allow_select_own_user"
ON public.users
FOR SELECT
USING (id = auth.uid());

-- Step 7: Create simple UPDATE policy (no recursion)
CREATE POLICY "allow_update_own_user"
ON public.users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Step 8: Create simple INSERT policy (no recursion)
CREATE POLICY "allow_insert_own_user"
ON public.users
FOR INSERT
WITH CHECK (id = auth.uid());

-- Step 9: Verify policies were created
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';

-- Step 10: Final verification
SELECT 
  'Profile Check' as test,
  id, 
  email, 
  name, 
  role
FROM public.users 
WHERE email = 'salabadeshwaran@gmail.com';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Infinite recursion error fixed!';
  RAISE NOTICE '✅ RLS policies recreated without recursion';
  RAISE NOTICE '✅ Try logging in now';
END $$;
