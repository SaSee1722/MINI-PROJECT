# Fix Login Stuck Issue - Step by Step Guide

## Problem
After signup and email confirmation, login gets stuck on "Signing in..." and doesn't redirect to the dashboard.

## Root Cause
The user exists in `auth.users` but either:
1. The user profile doesn't exist in `public.users` table
2. RLS (Row Level Security) policies are blocking access to the profile
3. The database trigger didn't create the profile during signup

## Solution - Follow These Steps

### Step 1: Open Browser Console
1. Open your browser (Chrome/Firefox)
2. Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
3. Go to the **Console** tab
4. Try logging in again
5. Look for error messages - they will tell you exactly what's wrong

### Step 2: Run SQL Diagnostic Script
1. Go to your Supabase Dashboard
2. Click on **SQL Editor** in the left sidebar
3. Open the file: `check-and-fix-user-profile.sql`
4. Copy the entire content
5. Paste it into the SQL Editor
6. Run it step by step (or all at once)

This script will:
- ✅ Check if your user exists in auth.users
- ✅ Check if your profile exists in public.users
- ✅ Create the profile if missing
- ✅ Fix RLS policies
- ✅ Verify everything is working

### Step 3: Verify User Profile Exists

Run this query in Supabase SQL Editor:

```sql
-- Replace with your email
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.created_at
FROM public.users u
WHERE u.email = 'salabadeshwaran@gmail.com';
```

**Expected Result:** You should see one row with your user data.

**If no rows:** Your profile doesn't exist. Run this to create it:

```sql
-- Get user ID from auth
SELECT id, email FROM auth.users WHERE email = 'salabadeshwaran@gmail.com';

-- Create profile (replace YOUR_USER_ID with the ID from above)
INSERT INTO public.users (id, email, name, role)
VALUES (
  'YOUR_USER_ID',
  'salabadeshwaran@gmail.com',
  'Salabadeshwaran',
  'admin'
);
```

### Step 4: Check RLS Policies

Run this in SQL Editor:

```sql
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';
```

You should see policies like:
- "Users can view their own profile" (SELECT)
- "Users can update their own profile" (UPDATE)
- "Enable insert for authenticated users" (INSERT)

**If no policies exist**, run this:

```sql
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

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

-- Allow insert for new signups
CREATE POLICY "Enable insert for authenticated users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
```

### Step 5: Check Database Trigger

Verify the trigger exists to auto-create profiles:

```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
   OR trigger_name LIKE '%user%';
```

**If no trigger exists**, create it:

```sql
-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Step 6: Test Login Again

1. Clear your browser cache and cookies (or use Incognito mode)
2. Go to `http://localhost:3000/login`
3. Enter your credentials
4. Check the browser console for any errors
5. You should now be redirected to the dashboard

### Step 7: If Still Not Working

Check the browser console for specific error messages:

**Common Errors:**

1. **"Row Level Security policy violation"**
   - Solution: Fix RLS policies (see Step 4)

2. **"No rows returned"** or **"User profile not found"**
   - Solution: Create user profile manually (see Step 3)

3. **"Permission denied"**
   - Solution: Check RLS policies and ensure user is authenticated

4. **"Failed to fetch"**
   - Solution: Check Supabase URL and API keys in `.env` file

### Step 8: Manual Profile Creation (Last Resort)

If nothing else works, create the profile manually:

```sql
-- 1. Get your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- 2. Delete old profile if exists
DELETE FROM public.users WHERE email = 'your-email@example.com';

-- 3. Create new profile (replace YOUR_USER_ID)
INSERT INTO public.users (id, email, name, role, created_at)
VALUES (
  'YOUR_USER_ID',
  'your-email@example.com',
  'Your Name',
  'admin',
  NOW()
);

-- 4. Verify
SELECT * FROM public.users WHERE email = 'your-email@example.com';
```

## Quick Fix Command (All-in-One)

Run this in Supabase SQL Editor (replace email):

```sql
-- Complete fix for user profile and RLS
DO $$
DECLARE
  user_id UUID;
  user_email TEXT := 'salabadeshwaran@gmail.com';
BEGIN
  -- Get user ID
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  
  -- Create or update profile
  INSERT INTO public.users (id, email, name, role)
  VALUES (user_id, user_email, 'Admin User', 'admin')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, public.users.name),
    role = COALESCE(EXCLUDED.role, public.users.role);
  
  -- Enable RLS
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  
  -- Drop old policies
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
  DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
  
  -- Create new policies
  CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT TO authenticated
  USING (auth.uid() = id);
  
  CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  
  CREATE POLICY "Enable insert for authenticated users"
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
  
  RAISE NOTICE 'User profile fixed successfully!';
END $$;
```

## Prevention for Future Signups

To prevent this issue for future users, ensure:

1. ✅ Database trigger is created (see Step 5)
2. ✅ RLS policies are properly configured (see Step 4)
3. ✅ The trigger function has SECURITY DEFINER
4. ✅ Email confirmation is enabled in Supabase Auth settings

## Still Having Issues?

1. Check the browser console for specific error messages
2. Check Supabase logs in the Dashboard
3. Verify your `.env` file has correct Supabase credentials
4. Try creating a new user with a different email
5. Contact support with the error messages from the console

## Success Checklist

After fixing, verify:
- ✅ User exists in `auth.users`
- ✅ User profile exists in `public.users`
- ✅ RLS policies are enabled and correct
- ✅ Login redirects to correct dashboard
- ✅ No errors in browser console
- ✅ User can see their profile data
