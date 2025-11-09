# 🗄️ Supabase SQL Setup Guide

## 📋 Step-by-Step Instructions

### Step 1: Get Your Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Create a new project (or select existing)
3. Go to **Settings** → **API**
4. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

5. Open `.env` file and replace:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

---

### Step 2: Run SQL Files in Order

Go to your Supabase project → **SQL Editor** → Click **New Query**

**Run these files IN THIS EXACT ORDER:**

#### 1️⃣ **database-schema.sql** (MUST RUN FIRST)
```
This creates all tables, RLS policies, and sample data
```
- Creates: users, departments, classes, sessions, students, attendance tables
- Sets up: Row Level Security policies
- Adds: Sample departments and sessions
- **Status**: ✅ Run this first!

#### 2️⃣ **update-attendance-status.sql**
```
Adds 'on_duty' status to attendance tables
```
- Updates: student_attendance and staff_attendance constraints
- Allows: Present, Absent, On Duty statuses
- **Status**: ✅ Run after database-schema.sql

#### 3️⃣ **fix-staff-attendance-constraint.sql**
```
Fixes unique constraint for staff attendance
```
- Allows: Staff to mark attendance for multiple sessions per day
- Updates: Unique constraint to include session_id
- **Status**: ✅ Run after update-attendance-status.sql

#### 4️⃣ **force-fix-roles.sql**
```
Sets up user roles properly
```
- Ensures: Role column has correct constraints
- **Status**: ✅ Run after fix-staff-attendance-constraint.sql

---

### Step 3: Create Your Admin User

After running all SQL files:

1. In Supabase, go to **Authentication** → **Users**
2. Click **Add User** → **Create new user**
3. Enter:
   - Email: `your_email@example.com`
   - Password: `your_password`
   - Click **Create User**

4. Go back to **SQL Editor** and run:
```sql
UPDATE users 
SET role = 'admin' 
WHERE email = 'your_email@example.com';
```
(Replace with your actual email)

5. Verify by running:
```sql
SELECT email, name, role FROM users;
```

---

## 🎯 Quick Checklist

- [ ] Created Supabase project
- [ ] Copied URL and anon key to `.env` file
- [ ] Ran `database-schema.sql`
- [ ] Ran `update-attendance-status.sql`
- [ ] Ran `fix-staff-attendance-constraint.sql`
- [ ] Ran `force-fix-roles.sql`
- [ ] Created admin user in Authentication
- [ ] Updated user role to 'admin' via SQL

---

## 📝 SQL Files Summary

| File | Purpose | Order | Required |
|------|---------|-------|----------|
| database-schema.sql | Creates all tables & policies | 1st | ✅ YES |
| update-attendance-status.sql | Adds 'on_duty' status | 2nd | ✅ YES |
| fix-staff-attendance-constraint.sql | Fixes session constraint | 3rd | ✅ YES |
| force-fix-roles.sql | Fixes user roles | 4th | ✅ YES |
| cleanup-duplicate-attendance.sql | Cleans old records | Optional | ⚠️ Only if errors |

---

## 🔍 How to Run SQL Files

### Method 1: Copy & Paste
1. Open SQL file in your editor
2. Copy all content (Cmd+A, Cmd+C)
3. Go to Supabase SQL Editor
4. Paste content (Cmd+V)
5. Click **Run** button

### Method 2: Direct in Supabase
1. Go to Supabase SQL Editor
2. Click **New Query**
3. Copy content from SQL file
4. Paste and click **Run**

---

## ✅ Verification

After running all SQL files, verify setup:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should show: users, departments, classes, sessions, students, 
--              student_attendance, staff_attendance

-- Check sample data
SELECT * FROM departments;
SELECT * FROM sessions;

-- Check your admin user
SELECT email, role FROM users;
```

---

## 🐛 Troubleshooting

### Issue: "relation already exists"
**Solution**: Table already created, skip that file or drop table first

### Issue: "permission denied"
**Solution**: Make sure you're running in your project's SQL Editor

### Issue: "constraint already exists"
**Solution**: Constraint already added, safe to ignore

### Issue: Can't login after setup
**Solution**: 
1. Check user exists in Authentication
2. Verify role is set to 'admin' in users table
3. Check .env file has correct credentials

---

## 🎉 You're Done!

Once all SQL files are run and admin user is created:

```bash
npm run dev
```

Then open http://localhost:3000 and login with your admin credentials!

---

## 📞 Need Help?

If you see any errors:
1. Check which SQL file caused the error
2. Read the error message carefully
3. Most errors are safe to ignore if they say "already exists"
4. For "permission denied", make sure you're in the right project

**Your database is now ready!** 🚀
