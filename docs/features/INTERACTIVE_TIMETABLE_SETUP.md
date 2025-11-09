# Interactive Timetable System - Complete Setup Guide

## ✅ What's Been Implemented

A complete interactive timetable system with period-wise attendance marking! 

### Features:
- 📅 **Weekly Timetable View** - 6 days (Monday-Saturday), 6 periods per day
- 🎯 **Click-to-Mark** - Click any period to mark attendance
- 🟢 **Visual Feedback** - Marked periods turn green
- 📊 **Real-time Updates** - Dashboard updates instantly
- 👥 **Student-wise Attendance** - Mark each student present/absent/on duty
- ✅ **Approval Status** - Track approved/unapproved absences
- 🔄 **Period-wise Tracking** - Separate attendance for each period

## 🚀 Setup Instructions

### Step 1: Run Database Migrations

Run these SQL scripts in **Supabase SQL Editor** (in order):

```bash
# 1. Create timetable system tables
create-timetable-system.sql

# 2. Insert sample timetable data (optional)
insert-sample-timetable.sql
```

### Step 2: Verify Database

After running the scripts, verify in Supabase:

```sql
-- Check tables created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%timetable%' 
  OR table_name LIKE '%period%';

-- Check period times
SELECT * FROM period_times ORDER BY period_number;

-- Check sample timetable (if inserted)
SELECT * FROM timetable LIMIT 10;
```

### Step 3: Frontend is Ready!

All frontend components are already created and integrated:
- ✅ `useTimetable.js` hook
- ✅ `usePeriodAttendance.js` hook
- ✅ `InteractiveTimetable.jsx` component
- ✅ Admin Dashboard updated with Timetable tab

### Step 4: Restart Dev Server

```bash
npm run dev
```

## 📋 How to Use

### 1. Access Timetable

1. Login as **Admin**
2. Go to **Admin Dashboard**
3. Click **"Timetable"** tab
4. Select a **Class** from dropdown (e.g., CSE B)
5. Select **Date** (defaults to today)

### 2. View Timetable

You'll see a weekly timetable grid:
- **Rows**: Days (Monday-Saturday)
- **Columns**: Periods (1-6)
- **Each Cell Shows**:
  - Subject Code (e.g., CA(302))
  - Subject Name
  - Faculty Name
  - Lab indicator (if applicable)
  - ✅ Green "Marked" badge if attendance taken

### 3. Mark Attendance

**Click on any period cell** to mark attendance:

1. **Modal Opens** showing:
   - Subject details
   - Period time
   - List of all students in the class

2. **Mark Each Student**:
   - Click **Present** / **Absent** / **On Duty**
   - If Absent → Select **Approved** / **Unapproved**

3. **Submit Attendance**:
   - Click **"Submit Attendance"** button
   - Period turns **GREEN** ✅
   - Dashboard updates instantly

### 4. Visual Indicators

| Color | Meaning |
|-------|---------|
| 🔵 Blue | Period not marked yet |
| 🟢 Green | Attendance marked ✅ |
| ⚪ Gray | No class scheduled |
| 🟣 Purple badge | Lab session |

## 🎓 Example: CSE B Class

After running `insert-sample-timetable.sql`, you'll have a complete timetable for CSE B:

### Monday
- Period 1: CA(302) - Computer Architecture - Mrs.I.Roshini
- Period 2: DS(302) - Data Structures - Mr.Shivasankaran
- Period 3: OOP(303) - Object Oriented Programming - Ms.M.Benitta Mary
- Period 5: DPSD(302) - Digital Principles - Ms.Sree Arthi D

### Tuesday
- Period 1: ESS(303) - Environmental Science - Dr.M.Kumaran
- Period 2-3: CA - Computer Architecture
- Period 4: DM(302) - Discrete Mathematics
- Period 5: OOPL/MP - OOP Lab / Mini Project

... and so on for all 6 days!

## 📊 Database Structure

### Tables Created:

1. **`timetable`** - Stores class schedules
   - class_id, day_of_week, period_number
   - subject_code, subject_name, faculty_name
   - is_lab, room_number

2. **`period_times`** - Period timings
   - period_number (1-6)
   - start_time, end_time
   - Pre-populated with college timings

3. **`period_attendance`** - Period-wise attendance records
   - timetable_id, class_id, date
   - is_marked, marked_by, marked_at
   - total_students, present_count, absent_count

4. **`period_student_attendance`** - Individual student attendance
   - period_attendance_id, student_id
   - status (present/absent/on_duty)
   - approval_status (approved/unapproved)

## 🔧 Period Timings

Default timings (can be customized):

| Period | Time | Duration |
|--------|------|----------|
| Period 1 | 08:30 - 09:20 | 50 min |
| Period 2 | 09:20 - 10:10 | 50 min |
| **Tea Break** | 10:10 - 10:25 | 15 min |
| Period 3 | 10:25 - 11:15 | 50 min |
| Period 4 | 11:15 - 12:05 | 50 min |
| **Lunch Break** | 12:05 - 12:45 | 40 min |
| Period 5 | 12:45 - 01:35 | 50 min |
| Period 6 | 01:35 - 02:30 | 55 min |

## 📝 Adding Your Own Timetable

### Method 1: Manual Entry (SQL)

```sql
-- Get your class ID
SELECT id, name FROM classes WHERE name = 'YOUR_CLASS_NAME';

-- Insert timetable entries
INSERT INTO timetable (class_id, day_of_week, period_number, subject_code, subject_name, faculty_name) VALUES
  ('YOUR_CLASS_ID', 1, 1, 'MATH101', 'Mathematics', 'Dr. Smith'),
  ('YOUR_CLASS_ID', 1, 2, 'PHY101', 'Physics', 'Prof. Johnson'),
  -- Add more entries...
ON CONFLICT DO NOTHING;
```

### Method 2: Create Admin UI (Future Enhancement)

You can add a timetable management UI in the admin dashboard to:
- Add/Edit/Delete timetable entries
- Bulk import from CSV
- Copy timetable from previous semester

## 🎯 Benefits

### For Staff:
- ✅ Quick attendance marking (click and done!)
- ✅ Visual confirmation (green = marked)
- ✅ Period-wise tracking
- ✅ No manual record keeping

### For Admin:
- ✅ Real-time attendance monitoring
- ✅ Period-wise reports
- ✅ Identify missing attendance
- ✅ Track faculty attendance marking

### For Students:
- ✅ Accurate period-wise attendance
- ✅ Transparent approval status
- ✅ Better attendance tracking

## 📈 Reports & Analytics

### Period-wise Attendance Report

```sql
-- Get attendance summary for a class
SELECT 
  t.subject_name,
  t.faculty_name,
  pa.date,
  pa.total_students,
  pa.present_count,
  pa.absent_count,
  ROUND((pa.present_count::float / pa.total_students * 100), 2) as attendance_percentage
FROM period_attendance pa
JOIN timetable t ON t.id = pa.timetable_id
WHERE pa.class_id = 'YOUR_CLASS_ID'
  AND pa.date >= '2025-01-01'
ORDER BY pa.date DESC, t.period_number;
```

### Student Period-wise Attendance

```sql
-- Get individual student's period attendance
SELECT 
  s.roll_number,
  s.name,
  t.subject_name,
  pa.date,
  psa.status,
  psa.approval_status
FROM period_student_attendance psa
JOIN period_attendance pa ON pa.id = psa.period_attendance_id
JOIN students s ON s.id = psa.student_id
JOIN timetable t ON t.id = pa.timetable_id
WHERE s.id = 'STUDENT_ID'
ORDER BY pa.date DESC;
```

## 🔄 Daily Workflow

### Morning:
1. Admin/Staff opens dashboard
2. Clicks **Timetable** tab
3. Selects class (e.g., CSE B)
4. Date is auto-set to today

### During Classes:
1. After each period, click on that period cell
2. Mark attendance for all students
3. Submit
4. Period turns green ✅

### End of Day:
- All periods marked = Complete attendance ✅
- Any unmarked periods = Red flag 🚩
- Admin can see which classes/periods are pending

## 🎨 Customization

### Change Period Timings

```sql
UPDATE period_times 
SET start_time = '09:00', end_time = '09:50' 
WHERE period_number = 1;
```

### Add More Periods

```sql
INSERT INTO period_times (period_number, start_time, end_time, period_name) VALUES
  (7, '02:30', '03:20', 'Period VII'),
  (8, '03:20', '04:10', 'Period VIII');
```

### Change Days

Currently supports Monday-Saturday (1-6). To add Sunday:

```sql
-- Update check constraint
ALTER TABLE timetable 
DROP CONSTRAINT timetable_day_of_week_check;

ALTER TABLE timetable 
ADD CONSTRAINT timetable_day_of_week_check 
CHECK (day_of_week >= 1 AND day_of_week <= 7);
```

## 🐛 Troubleshooting

### Issue: Timetable not showing
**Solution**: 
- Check if class is selected
- Verify timetable data exists for that class
- Run: `SELECT * FROM timetable WHERE class_id = 'YOUR_CLASS_ID'`

### Issue: Can't mark attendance
**Solution**:
- Ensure you're marking today's class only
- Check if students exist in the class
- Verify RLS policies are enabled

### Issue: Period not turning green
**Solution**:
- Check browser console for errors
- Verify attendance was submitted successfully
- Refresh the page

## ✅ Checklist

- [ ] Run `create-timetable-system.sql` in Supabase
- [ ] Run `insert-sample-timetable.sql` (optional)
- [ ] Verify tables created
- [ ] Restart dev server (`npm run dev`)
- [ ] Login as admin
- [ ] Go to Timetable tab
- [ ] Select CSE B class
- [ ] View timetable
- [ ] Click on a period
- [ ] Mark attendance
- [ ] Verify period turns green
- [ ] Check attendance in database

## 🎉 You're All Set!

Your interactive timetable system is ready! Staff can now:
- View weekly timetables
- Mark period-wise attendance with a single click
- See real-time visual feedback
- Track approved/unapproved absences

The system is fully integrated with your existing attendance app! 🚀
