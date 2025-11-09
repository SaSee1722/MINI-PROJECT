# 🔧 Signup Error Fix

## ⚠️ Error: "Failed to fetch"

This error happens because of RLS (Row Level Security) policies on the users table.

---

## ✅ Quick Fix

### **Step 1: Run the Fix SQL**

Go to **Supabase SQL Editor** and run:

**File: `fix-signup-policies.sql`**

Or copy and paste this:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Create new policies that allow signup
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### **Step 2: Refresh Your App**

Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows) to hard refresh.

### **Step 3: Try Signup Again**

Go to: http://localhost:3000/signup

Fill the form and click "Create Account"

---

## 🎯 What This Does

The SQL adds a policy that allows users to **INSERT** their own profile when signing up.

**Before:** Users couldn't create their profile (INSERT denied)
**After:** Users can create their own profile during signup

---

## 🔍 Alternative: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try signing up again
4. Look for detailed error messages
5. Share the error if still having issues

---

## ✅ Expected Behavior After Fix

1. Fill signup form
2. Click "Create Account"
3. See "Account created successfully!" alert
4. Redirect to login page
5. Login with your credentials
6. Access dashboard based on role

---

## 🆘 Still Not Working?

### **Option 1: Disable RLS Temporarily (Testing Only)**

```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

⚠️ **Warning:** Only for testing! Re-enable after:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### **Option 2: Check Trigger Function**

```sql
-- Verify trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- If missing, recreate it
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', 'staff');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 📝 Summary

**Problem:** RLS policies blocking user profile creation
**Solution:** Add INSERT policy for users table
**File:** `fix-signup-policies.sql`
**Action:** Run in Supabase SQL Editor

---

**After running the SQL, signup should work perfectly!** ✨
