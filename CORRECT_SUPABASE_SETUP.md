# ✅ CORRECT Supabase Configuration

## Your Actual Netlify URL:
**`https://smart-presence-cseb.netlify.app`**

---

## Step 1: Run User Profile Trigger SQL

1. Open https://supabase.com → Your project
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

### Get User ID:
```sql
SELECT id, email FROM auth.users WHERE email = 'salabtradebot@gmail.com';
```

Copy the `id` (UUID)

### Create Profile:
Replace `PASTE_UUID_HERE` with the actual UUID:
```sql
INSERT INTO public.users (id, email, name, role, created_at)
VALUES (
  'PASTE_UUID_HERE',
  'salabtradebot@gmail.com',
  'Salab Admin',
  'admin',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  name = 'Salab Admin';
```

Click **Run**

---

## Step 3: Configure Supabase Auth URLs (CORRECT URLS)

1. Go to **Authentication** → **URL Configuration**

2. **Site URL:** 
   ```
   https://smart-presence-cseb.netlify.app
   ```

3. **Redirect URLs:** Add these (one per line):
   ```
   https://smart-presence-cseb.netlify.app/**
   https://smart-presence-cseb.netlify.app/login
   https://smart-presence-cseb.netlify.app/auth/callback
   http://localhost:3000/**
   ```

4. Click **Save**

---

## Step 4: Test Everything

### Test 1: Login with Existing User
1. Go to: **https://smart-presence-cseb.netlify.app/login**
2. Login with: salabtradebot@gmail.com
3. Should work WITHOUT "profile could not be loaded" error ✅

### Test 2: New User Signup
1. Go to: **https://smart-presence-cseb.netlify.app/signup**
2. Sign up with a NEW email
3. Check email for confirmation link
4. Click confirmation link
5. Should redirect to confirmation page (not 404) ✅
6. Then redirect to login
7. Login should work ✅

### Test 3: Data Isolation
1. Login as Admin A
2. Create a department
3. Logout
4. Login as Admin B (different account)
5. Should NOT see Admin A's department ✅

---

## Verification Queries

### Check if trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```
Should return 1 row.

### Check if profile exists:
```sql
SELECT * FROM users WHERE email = 'salabtradebot@gmail.com';
```
Should return 1 row with role = 'admin'.

### Check all users:
```sql
SELECT 
  au.email,
  u.name,
  u.role,
  CASE WHEN u.id IS NULL THEN 'NO PROFILE' ELSE 'HAS PROFILE' END as status
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
ORDER BY au.created_at DESC;
```

---

## What Each Step Does

**Step 1:** Creates automatic profile creation for new signups
**Step 2:** Fixes the existing user who has no profile
**Step 3:** Tells Supabase where to redirect after email confirmation
**Step 4:** Verifies everything works

---

## Expected Results

✅ Login works without errors
✅ New signups auto-create profiles
✅ Email confirmation redirects correctly
✅ Each admin has isolated data
✅ No 404 errors
✅ No "profile could not be loaded" errors

---

## Time Required

- Step 1: **2 minutes**
- Step 2: **2 minutes**
- Step 3: **1 minute**
- Step 4: **5 minutes** (testing)

**Total: ~10 minutes**

---

## Priority Order

1. ⚠️ **CRITICAL:** Run Step 1 (trigger SQL)
2. ⚠️ **CRITICAL:** Run Step 2 (fix existing user)
3. 🔧 **IMPORTANT:** Complete Step 3 (Auth URLs)
4. ✅ **VERIFY:** Test with Step 4

**Your production URL is: https://smart-presence-cseb.netlify.app**
