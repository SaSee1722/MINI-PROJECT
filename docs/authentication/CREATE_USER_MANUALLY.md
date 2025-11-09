# 👤 Create Users Manually (Easiest Method)

## ⚠️ Since signup is having issues, use this method instead:

---

## ✅ Method 1: Create User via Supabase Dashboard (EASIEST)

### **Step 1: Go to Supabase**
1. Open: https://supabase.com/dashboard
2. Select project: **MINI PRO**
3. Go to: **Authentication** → **Users**

### **Step 2: Add User**
1. Click **"Add User"** button (top right)
2. Fill in:
   - **Email**: `salabadeshwaran@gmail.com`
   - **Password**: `Admin@123` (or any password you want)
   - **Auto Confirm User**: ✅ **CHECK THIS BOX** (important!)
3. Click **"Create User"**

### **Step 3: Set Role to Admin**
1. Go to **SQL Editor**
2. Run this:
```sql
UPDATE users 
SET role = 'admin', name = 'Salabadeshwaran'
WHERE email = 'salabadeshwaran@gmail.com';
```

### **Step 4: Login**
1. Go to: http://localhost:3000/login
2. Email: `salabadeshwaran@gmail.com`
3. Password: `Admin@123` (or what you set)
4. Click **Sign In**
5. ✅ **You're in!**

---

## ✅ Method 2: Create User via SQL (Alternative)

Run this in **Supabase SQL Editor**:

```sql
-- Create admin user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'salabadeshwaran@gmail.com',
  crypt('Admin@123', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Salabadeshwaran"}',
  NOW(),
  NOW()
);

-- Set role to admin
UPDATE users 
SET role = 'admin', name = 'Salabadeshwaran'
WHERE email = 'salabadeshwaran@gmail.com';
```

**Password will be**: `Admin@123`

---

## 🎯 Create Multiple Users

### **Admin User:**
```sql
-- Via Dashboard:
Email: admin@college.com
Password: Admin@123
Auto Confirm: ✅

-- Then run:
UPDATE users SET role = 'admin', name = 'Admin User' 
WHERE email = 'admin@college.com';
```

### **Staff User:**
```sql
-- Via Dashboard:
Email: staff@college.com
Password: Staff@123
Auto Confirm: ✅

-- Then run:
UPDATE users SET role = 'staff', name = 'Staff User' 
WHERE email = 'staff@college.com';
```

---

## 🚀 Quick Start

**For your immediate use:**

1. **Create Admin via Dashboard:**
   - Email: `salabadeshwaran@gmail.com`
   - Password: `Admin@123`
   - Auto Confirm: ✅

2. **Run SQL:**
   ```sql
   UPDATE users SET role = 'admin', name = 'Salabadeshwaran'
   WHERE email = 'salabadeshwaran@gmail.com';
   ```

3. **Login:**
   - http://localhost:3000/login
   - Email: `salabadeshwaran@gmail.com`
   - Password: `Admin@123`

4. **✅ Done! You're in the admin dashboard!**

---

## 💡 Why This Works

- ✅ Bypasses signup form issues
- ✅ No RLS policy problems
- ✅ Direct user creation
- ✅ Works immediately
- ✅ Can create as many users as needed

---

## 📝 Summary

**Problem**: Signup form has "Failed to fetch" error
**Solution**: Create users directly in Supabase Dashboard
**Time**: 2 minutes
**Result**: Working admin/staff accounts

---

## 🎓 Your Credentials

After following Method 1:

**Admin Login:**
- Email: `salabadeshwaran@gmail.com`
- Password: `Admin@123`
- Dashboard: Full admin access

**Use this to login and start using your app!** ✨

---

## ⚠️ Note About Signup

The signup form issue is due to Supabase RLS policies. You can:
1. Use manual creation (above) - **Recommended for now**
2. Fix signup later by running the SQL fixes
3. Or disable signup and only allow admin-created users

**For now, just create users manually and your app works perfectly!** 🎉
