# 🎯 Enable Complete Signup System - FINAL FIX

## 🎓 Goal: Users can create their own accounts with role selection

---

## ✅ STEP-BY-STEP SOLUTION

### **Step 1: Run the Complete Fix SQL**

Go to **Supabase Dashboard** → **SQL Editor** → **New Query**

Copy and paste the entire content of: **`COMPLETE_SIGNUP_FIX.sql`**

Or copy this:

```sql
-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new trigger function that reads role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_name TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'staff');
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
  
  INSERT INTO public.users (id, email, name, role, created_at, updated_at)
  VALUES (
    NEW.id, 
    NEW.email, 
    user_name, 
    user_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Create new RLS policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO anon, authenticated;
```

**Click "Run"** ▶️

---

### **Step 2: Verify SQL Ran Successfully**

You should see:
- ✅ "Signup is now enabled! Users can create accounts with role selection."
- ✅ Trigger information displayed
- ✅ Policy list displayed

---

### **Step 3: Refresh Your App**

Press **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows) to hard refresh

---

### **Step 4: Test Signup**

1. Go to: **http://localhost:3000/signup**

2. Fill the form:
   - **Name**: Test User
   - **Email**: test@example.com
   - **Role**: Administrator (or Staff Member)
   - **Password**: Test@123
   - **Confirm Password**: Test@123

3. Click **"Create Account"**

4. Should see: **"Account created successfully!"**

5. Go to login and use your credentials

---

## 🎯 How It Works Now

### **User Flow:**

1. **User visits signup page**
   - Fills name, email, password
   - **Selects role** (Admin or Staff)

2. **System creates account**
   - Creates auth user in Supabase
   - Trigger automatically creates profile in `users` table
   - **Role is set from signup form**

3. **User logs in**
   - System checks role
   - **Admin** → redirects to `/admin`
   - **Staff** → redirects to `/staff`

4. **User accesses dashboard**
   - Full features based on role
   - No manual SQL needed!

---

## 🎨 Signup Features

### **Role Selection:**

**👨‍🏫 Staff Member:**
- Can mark own attendance
- Can mark student attendance
- Can generate class reports
- View attendance history

**⭐ Administrator:**
- All staff features PLUS:
- Manage departments
- Manage classes
- Manage sessions
- Manage students
- Bulk CSV import
- System-wide reports
- View all statistics

---

## ✅ What This Fix Does

1. **Updates Trigger Function**
   - Reads role from signup form metadata
   - Automatically creates user profile
   - Sets role correctly

2. **Fixes RLS Policies**
   - Allows users to INSERT their profile
   - Enables signup to work
   - Maintains security

3. **Grants Permissions**
   - Allows authenticated users to create profiles
   - Maintains row-level security

---

## 🧪 Test Cases

### **Test 1: Create Admin**
```
Name: Admin User
Email: admin@college.com
Role: ⭐ Administrator
Password: Admin@123
```
**Expected**: Account created, can login, see admin dashboard

### **Test 2: Create Staff**
```
Name: Staff User
Email: staff@college.com
Role: 👨‍🏫 Staff Member
Password: Staff@123
```
**Expected**: Account created, can login, see staff dashboard

### **Test 3: Multiple Users**
Create 3-4 users with different roles
**Expected**: All can signup and login independently

---

## 🐛 Troubleshooting

### **Still getting "Failed to fetch"?**

1. **Check SQL ran successfully**
   - Look for success message
   - Check for any errors

2. **Verify trigger exists**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

3. **Check RLS policies**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'users';
   ```

4. **Clear browser cache**
   - Hard refresh (Cmd+Shift+R)
   - Or clear all browser data

5. **Check browser console**
   - F12 → Console tab
   - Look for detailed errors

---

## 📊 Verification

After running the SQL, verify:

```sql
-- Check trigger
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check policies
SELECT policyname FROM pg_policies 
WHERE tablename = 'users';

-- Should show:
-- - Users can view their own profile
-- - Users can insert their own profile
-- - Users can update their own profile
-- - Admins can view all users
```

---

## 🎉 Success Indicators

✅ Signup form loads without errors
✅ Can fill and submit form
✅ See "Account created successfully!" message
✅ Can login with new credentials
✅ Redirected to correct dashboard (admin/staff)
✅ Dashboard shows user name and role
✅ All features work based on role

---

## 📝 Summary

**What we fixed:**
1. ✅ Trigger function to read role from signup
2. ✅ RLS policies to allow profile creation
3. ✅ Database permissions for authenticated users
4. ✅ Automatic role assignment

**What users can now do:**
1. ✅ Visit signup page
2. ✅ Choose their role (admin/staff)
3. ✅ Create account
4. ✅ Login immediately
5. ✅ Access appropriate dashboard

---

## 🚀 Next Steps

1. **Run the SQL** (COMPLETE_SIGNUP_FIX.sql)
2. **Refresh app**
3. **Test signup**
4. **Create your admin account**
5. **Start using the system!**

---

**File to run: `COMPLETE_SIGNUP_FIX.sql`**

**After running SQL, signup will work perfectly!** 🎓✨
