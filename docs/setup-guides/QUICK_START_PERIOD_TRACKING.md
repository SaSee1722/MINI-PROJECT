# Quick Start - Staff Period Tracking

## Step 1: Run Database Migration

Open Supabase SQL Editor and run:
```sql
-- File: add-period-to-staff-attendance.sql

ALTER TABLE public.staff_attendance 
ADD COLUMN IF NOT EXISTS period TEXT;

CREATE INDEX IF NOT EXISTS idx_staff_attendance_period 
ON public.staff_attendance(period);
```

## Step 2: Test Staff Attendance

### As Staff User:
1. Login to staff dashboard
2. Go to "My Attendance" tab
3. Fill the form:
   - **Date:** Select date
   - **Session:** Choose Morning/Afternoon/Evening
   - **Status:** Present/Absent/On Duty
   - **Periods:** Click P1, P2, P3 (or any combination)
4. Click "Mark Attendance for X Period(s)"
5. ✅ Success message shows: "Attendance marked successfully for periods: P1,P2,P3"

## Step 3: Verify in History

- Check "My Attendance History" table below
- Should show:
  - Date
  - Period (e.g., "P1,P2,P3")
  - Status

## Step 4: Generate Report

### As Admin:
1. Login to admin dashboard
2. Go to "Reports" tab
3. Click "Download Staff Report PDF"
4. PDF should show:
   - Staff Name
   - Date
   - Period (e.g., "P1,P2,P3")
   - Status (color-coded)

## What Changed?

### ✅ Before:
- Multiple records for each period
- Session/Period column with session name
- Email and Time Marked columns

### ✅ After:
- **One record** for all selected periods
- **Period column** showing "P1,P2,P3"
- **Only 4 columns:** Name, Date, Period, Status

## Common Issues

### Issue: "Not specified" in Period column
**Cause:** Old records before migration
**Solution:** Normal - new records will show periods

### Issue: Error when marking attendance
**Cause:** Database migration not run
**Solution:** Run the SQL migration script first

### Issue: Period not showing in report
**Cause:** Session not selected when marking
**Solution:** Always select a session when marking attendance

## Quick Reference

### Period Format:
- Single: `P1`
- Multiple: `P1,P2,P3`
- All: `P1,P2,P3,P4,P5,P6`

### Report Columns:
1. Staff Name
2. Date
3. Period
4. Status

### Status Colors:
- 🟢 Present (Green)
- 🔴 Absent (Red)
- 🔵 On Duty (Blue)
- 🟢 Absent (Approved) - Bold Green
- 🟠 Absent (Unapproved) - Bold Orange
