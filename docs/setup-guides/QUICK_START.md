# ⚡ Quick Start Guide

## 🎯 3-Minute Setup

### 1. Configure Supabase (2 min)

**Get credentials:**
1. Go to https://supabase.com/dashboard
2. Settings → API
3. Copy **Project URL** and **anon public key**

**Update .env file:**
```bash
# Open .env and replace these:
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

### 2. Run SQL Files (1 min)

Go to Supabase → **SQL Editor** → Run these **IN ORDER**:

```
1. database-schema.sql          ← Creates everything
2. update-attendance-status.sql ← Adds 'on_duty' status
3. fix-staff-attendance-constraint.sql ← Fixes sessions
4. force-fix-roles.sql          ← Fixes roles
```

**Copy each file content → Paste in SQL Editor → Click Run**

---

### 3. Create Admin User (30 sec)

**In Supabase:**
1. Authentication → Users → Add User
2. Enter email & password
3. Create User

**In SQL Editor, run:**
```sql
UPDATE users SET role = 'admin' WHERE email = 'your_email@example.com';
```

---

### 4. Start App (10 sec)

```bash
npm run dev
```

Open http://localhost:3000

Login with your admin credentials!

---

## 🎉 That's It!

Your College Attendance System is now running!

**Next:** Reply with "Create dashboard files" to get the final 2 dashboard pages.

---

## 📋 Files to Run in Supabase SQL Editor

| # | File | What it does |
|---|------|--------------|
| 1 | `database-schema.sql` | Creates all tables |
| 2 | `update-attendance-status.sql` | Adds on_duty status |
| 3 | `fix-staff-attendance-constraint.sql` | Fixes sessions |
| 4 | `force-fix-roles.sql` | Fixes user roles |

**Run them in this order!** ☝️

---

## 🆘 Quick Troubleshooting

**Can't find SQL files?**
→ They're in the project root folder

**"relation already exists" error?**
→ Safe to ignore, table already created

**Can't login?**
→ Check you set role to 'admin' in SQL

**Wrong credentials error?**
→ Check .env file has correct URL and key

---

**Need detailed help?** See `SQL_SETUP_GUIDE.md`
