# Staff Attendance - Period Tracking Update

## Overview
Updated the staff attendance system to track and display **specific periods** (P1, P2, P3, etc.) instead of sessions. Now when staff select multiple periods, all selected periods are saved in a single record and displayed in the report.

## Changes Made

### 1. Database Migration
**File:** `add-period-to-staff-attendance.sql`

- Added `period` column to `staff_attendance` table
- Stores comma-separated period values (e.g., "P1,P2,P3")
- Added index for better query performance

**Action Required:** Run this SQL script in Supabase SQL Editor before using the new features.

### 2. Staff Dashboard Updates
**File:** `/src/pages/StaffDashboardNew.jsx`

#### Attendance Marking:
- Staff selects multiple periods (P1-P6)
- All selected periods are saved in **one record** (not multiple records)
- Format: "P1,P2,P3" (comma-separated, sorted)
- Session is still required for database integrity

#### Attendance History Table:
- **Removed:** "Time Marked" column
- **Added:** "Period" column showing selected periods
- Displays: Date | Period | Status

### 3. PDF Report Generator
**File:** `/src/utils/pdfGenerator.js`

#### Report Columns:
1. **Staff Name** - Name of staff member
2. **Date** - Date of attendance
3. **Period** - Shows selected periods (e.g., "P1,P2,P3")
4. **Status** - Present/Absent/On Duty (color-coded)

#### Removed:
- Email column
- Time Marked column
- Session/Period column (replaced with just "Period")

## How It Works

### Staff Marking Attendance:

1. **Select Date** - Choose the attendance date
2. **Select Session** - Choose session (Morning/Afternoon/Evening)
3. **Select Status** - Present/Absent/On Duty
4. **Select Periods** - Click multiple period buttons (P1, P2, P3, etc.)
5. **Submit** - All selected periods saved in one record

**Example:**
- Staff selects: P1, P3, P5
- Saved as: "P1,P3,P5" in one record
- Shows in report: "P1,P3,P5"

### Report Generation:

1. Admin goes to Reports tab
2. Clicks "Download Staff Report PDF"
3. PDF shows simplified table:

```
┌─────────────┬────────────┬──────────┬──────────┐
│ Staff Name  │    Date    │  Period  │  Status  │
├─────────────┼────────────┼──────────┼──────────┤
│ RAJARAJAN   │ 07/11/2025 │ P1,P2,P3 │ Present  │
├─────────────┼────────────┼──────────┼──────────┤
│ RAJARAJAN   │ 07/11/2025 │ P4,P5    │ Absent   │
└─────────────┴────────────┴──────────┴──────────┘
```

## Key Features

### ✅ Single Record per Attendance
- No more duplicate records for each period
- One record contains all selected periods
- Cleaner database and easier reporting

### ✅ Period Display
- Shows exactly which periods staff marked (e.g., "P1,P2,P3")
- Easy to see at a glance
- Sorted in ascending order

### ✅ Simplified Report
- Only essential columns: Name, Date, Period, Status
- No unnecessary information
- Clean and professional layout

### ✅ Color-Coded Status
- **Present** - Green
- **Absent** - Red
- **Absent (Approved)** - Bold Green
- **Absent (Unapproved)** - Bold Orange
- **On Duty** - Blue

## Database Schema

### staff_attendance table:
```sql
- id: UUID
- user_id: UUID (references users)
- date: DATE
- status: TEXT (present/absent/on_duty)
- session_id: UUID (references sessions)
- period: TEXT (NEW - stores "P1,P2,P3")
- approval_status: TEXT (optional)
- created_at: TIMESTAMP
```

## Migration Steps

1. **Run Database Migration:**
   ```sql
   -- Execute: add-period-to-staff-attendance.sql
   ```

2. **Test Attendance Marking:**
   - Login as staff
   - Go to "My Attendance" tab
   - Select date, session, status, and multiple periods
   - Mark attendance
   - Verify success message shows periods

3. **Verify Attendance History:**
   - Check the attendance history table
   - Verify "Period" column shows selected periods
   - Format should be "P1,P2,P3"

4. **Generate Report:**
   - Login as admin
   - Go to Reports tab
   - Download staff attendance report
   - Verify PDF shows:
     - 4 columns only
     - Period column displays correctly
     - No email or time columns

## Example Scenarios

### Scenario 1: Staff marks 3 periods
- **Input:** P1, P3, P5 selected
- **Saved:** One record with period = "P1,P3,P5"
- **Report shows:** "P1,P3,P5"

### Scenario 2: Staff marks 1 period
- **Input:** P2 selected
- **Saved:** One record with period = "P2"
- **Report shows:** "P2"

### Scenario 3: Staff marks all periods
- **Input:** P1, P2, P3, P4, P5, P6 selected
- **Saved:** One record with period = "P1,P2,P3,P4,P5,P6"
- **Report shows:** "P1,P2,P3,P4,P5,P6"

## Benefits

1. **Accurate Period Tracking** - Know exactly which periods staff attended
2. **Single Record** - No duplicate entries, cleaner database
3. **Better Reporting** - Clear, concise reports with essential information
4. **Easy Auditing** - Quick to see attendance patterns by period
5. **Simplified UI** - Less clutter, more focus on important data

## Notes

- **Session is still required** for database integrity (foreign key)
- **Old records** without period data will show "Not specified"
- **Period format** is always comma-separated, sorted (P1,P2,P3)
- **No spaces** in period string for consistency
