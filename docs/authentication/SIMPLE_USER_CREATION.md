# 👤 Simple User Creation Guide

## ✅ EASIEST WAY - Create Users in 3 Steps

Signup is disabled to avoid errors. Create users directly in Supabase instead.

---

## 📋 Step-by-Step

### **Step 1: Open Supabase**
1. Go to: https://supabase.com/dashboard
2. Select: **MINI PRO** project
3. Click: **Authentication** (left sidebar)
4. Click: **Users** tab

### **Step 2: Add User**
1. Click **"Add User"** button (top right)
2. Fill in:
   - **Email**: `salabadeshwaran@gmail.com`
   - **Password**: `Admin123`
   - **Auto Confirm User**: ✅ **MUST CHECK THIS!**
3. Click **"Create User"**

### **Step 3: Set Role**
1. Go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Paste this:
```sql
UPDATE users 
SET role = 'admin', name = 'Salabadeshwaran'
WHERE email = 'salabadeshwaran@gmail.com';
```
4. Click **"Run"** ▶️

---

## 🎉 Done! Now Login

1. Go to: **http://localhost:3000/login**
2. Email: `salabadeshwaran@gmail.com`
3. Password: `Admin123`
4. Click **Sign In**
5. ✅ **You're in the admin dashboard!**

---

## 👥 Create More Users

### **Admin User:**
```
Step 1 (Supabase Dashboard):
- Email: admin@college.com
- Password: Admin123
- Auto Confirm: ✅

Step 2 (SQL Editor):
UPDATE users SET role = 'admin', name = 'Admin User' 
WHERE email = 'admin@college.com';
```

### **Staff User:**
```
Step 1 (Supabase Dashboard):
- Email: staff@college.com
- Password: Staff123
- Auto Confirm: ✅

Step 2 (SQL Editor):
UPDATE users SET role = 'staff', name = 'Staff User' 
WHERE email = 'staff@college.com';
```

---

## 🎯 Quick Reference

**Create User:**
1. Supabase → Authentication → Users → Add User
2. Fill email, password, check "Auto Confirm"
3. SQL Editor → Run: `UPDATE users SET role = 'admin', name = 'Name' WHERE email = 'email';`
4. Login at http://localhost:3000/login

---

## ⚠️ Important

- ✅ Always check **"Auto Confirm User"**
- ✅ Set role via SQL after creating user
- ✅ Use strong passwords
- ✅ Role can be 'admin' or 'staff'

---

## 🚀 Your First User

**Right now, create your admin account:**

1. **Supabase Dashboard** → Authentication → Users → Add User
   - Email: `salabadeshwaran@gmail.com`
   - Password: `Admin123`
   - Auto Confirm: ✅

2. **SQL Editor** → Run:
   ```sql
   UPDATE users SET role = 'admin', name = 'Salabadeshwaran'
   WHERE email = 'salabadeshwaran@gmail.com';
   ```

3. **Login** at http://localhost:3000/login

**That's it! No more errors!** ✨
