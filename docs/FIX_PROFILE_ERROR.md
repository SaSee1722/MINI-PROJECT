# Fix: "Login successful but profile could not be loaded" Error

## Problem
When users sign up and try to login, they get the error:
> "Login successful but your profile could not be loaded. Please contact support or check the browser console for details."

## Root Cause
The user is created in Supabase Auth (`auth.users` table) but their profile is NOT being created in the `users` table. This happens because:
1. The database trigger is missing or not working
2. The manual profile creation in signup is failing

---

## Solution: Create Database Trigger

### Step 1: Run This SQL in Supabase

1. Go to https://supabase.com → Your project
2. Click **SQL Editor**
3. Copy and paste this ENTIRE SQL:

```sql
-- Create or replace the function that handles new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

4. Click **Run**
5. Should see "Success. No rows returned"

---

## Step 2: Fix Existing User (salabtradebot@gmail.com)

This user already exists in auth but has no profile. We need to create it manually.

### Get User ID:
1. In Supabase SQL Editor, run:
```sql
SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'salabtradebot@gmail.com';
```

2. Copy the `id` (UUID)

### Create Profile:
Replace `USER_ID_HERE` with the actual UUID from above:

```sql
INSERT INTO public.users (id, email, name, role, created_at)
VALUES (
  'USER_ID_HERE',  -- Paste the UUID here
  'salabtradebot@gmail.com',
  'Salab Admin',
  'admin',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role;
```

---

## Step 3: Fix Email Confirmation 404 Error

The 404 error on mobile happens because the email confirmation link might have extra parameters.

### Update Supabase Auth Settings:

1. Go to **Authentication** → **URL Configuration**
2. **Site URL:** `https://smartpresent.netlify.app`
3. **Redirect URLs:** Add these:
   ```
   https://smartpresent.netlify.app/**
   https://smartpresent.netlify.app/login
   https://smartpresent.netlify.app/auth/callback
   http://localhost:3000/**
   ```

### Disable Email Confirmation (Optional):
If you want users to login immediately without email confirmation:

1. Go to **Authentication** → **Providers** → **Email**
2. **Uncheck** "Confirm email"
3. Save

---

## Step 4: Test the Fix

### Test 1: Existing User (salabtradebot@gmail.com)
1. After running Step 2, try logging in
2. Should work without profile error
3. Should see admin dashboard

### Test 2: New User Signup
1. Sign up with a NEW email
2. The trigger will auto-create the profile
3. Login should work immediately
4. No profile error

### Test 3: Email Confirmation
1. Sign up with new email
2. Check email for confirmation link
3. Click link
4. Should redirect to login page (not 404)

---

## Verification Queries

### Check if profile exists:
```sql
SELECT * FROM users WHERE email = 'salabtradebot@gmail.com';
```

### Check if trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### Check all users and their profiles:
```sql
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created,
  u.name,
  u.role,
  u.created_at as profile_created
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
ORDER BY au.created_at DESC;
```

---

## Common Issues

### "Function already exists"
→ Use `CREATE OR REPLACE FUNCTION` (already in the SQL above)

### "Trigger already exists"
→ The SQL drops it first with `DROP TRIGGER IF EXISTS`

### "Permission denied"
→ You need to be the project owner or have admin access

### Still getting profile error
→ Check browser console (F12) for detailed error
→ Verify the trigger was created successfully
→ Check if `users` table has the correct schema

---

## Expected Behavior After Fix

✅ New signups automatically create profile
✅ Login works without profile error
✅ Email confirmation redirects correctly
✅ Each admin sees their own isolated data
✅ No more "profile could not be loaded" error

---

## Files Reference

- **`FIX_USER_PROFILE_TRIGGER.sql`** - Run this in Supabase
- **This file** - Step-by-step guide
