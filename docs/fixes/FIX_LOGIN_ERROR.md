# 🔧 Fix Login "Failed to fetch" Error

## ⚠️ The Error Means: User doesn't exist or has wrong credentials

---

## ✅ SOLUTION: Create the User First

### **Step 1: Go to Supabase Dashboard**
https://supabase.com/dashboard

Select: **MINI PRO** project

### **Step 2: Create User in Authentication**
1. Click **"Authentication"** (left sidebar)
2. Click **"Users"** tab
3. Click **"Add User"** button (top right)
4. Fill in:
   ```
   Email: salabadeshwaran@gmail.com
   Password: Admin123
   Auto Confirm User: ✅ MUST CHECK THIS BOX!
   ```
5. Click **"Create User"**

### **Step 3: Set Role in SQL Editor**
1. Click **"SQL Editor"** (left sidebar)
2. Click **"New Query"**
3. Copy and paste:
```sql
-- First check if user exists
SELECT * FROM auth.users WHERE email = 'salabadeshwaran@gmail.com';

-- If user exists, set their role
UPDATE users 
SET role = 'admin', name = 'Salabadeshwaran'
WHERE email = 'salabadeshwaran@gmail.com';

-- Verify it worked
SELECT email, name, role FROM users WHERE email = 'salabadeshwaran@gmail.com';
```
4. Click **"Run"** ▶️

### **Step 4: Try Login Again**
1. Go to: http://localhost:3000/login
2. Email: `salabadeshwaran@gmail.com`
3. Password: `Admin123`
4. Click **"Sign In"**
5. ✅ Should work now!

---

## 🔍 If Still Not Working

### **Check 1: Verify User Exists**
Run in SQL Editor:
```sql
SELECT email, email_confirmed_at FROM auth.users 
WHERE email = 'salabadeshwaran@gmail.com';
```
**Expected:** Should show your email and a timestamp

### **Check 2: Verify Profile Exists**
Run in SQL Editor:
```sql
SELECT email, name, role FROM users 
WHERE email = 'salabadeshwaran@gmail.com';
```
**Expected:** Should show email, name, and role = 'admin'

### **Check 3: If Profile Missing, Create It**
Run in SQL Editor:
```sql
-- Get user ID from auth
SELECT id FROM auth.users WHERE email = 'salabadeshwaran@gmail.com';

-- Insert profile (replace YOUR_USER_ID with the ID from above)
INSERT INTO users (id, email, name, role)
VALUES (
  'YOUR_USER_ID',
  'salabadeshwaran@gmail.com',
  'Salabadeshwaran',
  'admin'
)
ON CONFLICT (id) DO UPDATE
SET name = 'Salabadeshwaran', role = 'admin';
```

---

## 🎯 Common Issues

### **Issue 1: "Invalid login credentials"**
**Cause:** Wrong password or user doesn't exist
**Fix:** Create user in Supabase Dashboard first

### **Issue 2: "Failed to fetch"**
**Cause:** Network issue or user profile missing
**Fix:** Check internet connection, verify user exists

### **Issue 3: "Email not confirmed"**
**Cause:** Didn't check "Auto Confirm User"
**Fix:** In Supabase → Authentication → Users → Click user → Confirm email

---

## ✅ Complete Fresh Start

If nothing works, start fresh:

### **1. Delete Old User (if exists)**
```sql
DELETE FROM users WHERE email = 'salabadeshwaran@gmail.com';
DELETE FROM auth.users WHERE email = 'salabadeshwaran@gmail.com';
```

### **2. Create New User**
Supabase Dashboard → Authentication → Users → Add User
- Email: `salabadeshwaran@gmail.com`
- Password: `Admin123`
- Auto Confirm: ✅

### **3. Set Role**
```sql
UPDATE users 
SET role = 'admin', name = 'Salabadeshwaran'
WHERE email = 'salabadeshwaran@gmail.com';
```

### **4. Login**
http://localhost:3000/login

---

## 🚀 Quick Checklist

Before trying to login:
- [ ] User created in Supabase Authentication
- [ ] "Auto Confirm User" was checked
- [ ] Role set via SQL (admin or staff)
- [ ] Using correct email and password
- [ ] Internet connection working
- [ ] App is running (npm run dev)

---

## 📝 Your Credentials

After following the steps:
```
Email: salabadeshwaran@gmail.com
Password: Admin123
Role: admin
```

---

**Follow the steps above and login should work!** ✨
