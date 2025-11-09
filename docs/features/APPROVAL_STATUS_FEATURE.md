# Approved/Unapproved Absence Feature

## Overview
Added a new feature to track whether student absences are **Approved** or **Unapproved**. This helps distinguish between legitimate absences (medical leave, official duty) and unauthorized absences.

## How It Works

### 1. When Marking Attendance
When you mark a student as **Absent**, two additional buttons appear:
- ✅ **Approved** (Green) - For legitimate absences with valid reason
- ⚠️ **Unapproved** (Orange) - For unauthorized absences

### 2. Default Behavior
- If you select "Present" or "On Duty" → No approval status needed
- If you select "Absent" → Defaults to "Unapproved" unless you click "Approved"

### 3. Visual Indicators
- **Approved Absence**: Green button with checkmark ✓
- **Unapproved Absence**: Orange button with warning ⚠
- The selected option will be highlighted and scaled

## Setup Instructions

### Step 1: Update Database Schema
Run this SQL script in Supabase SQL Editor:

```sql
-- File: add-approval-status.sql
```

This adds:
- `approval_status` column to `student_attendance` table
- `approval_status` column to `staff_attendance` table
- `absence_reason` column for documentation (optional)
- Indexes for better performance

### Step 2: Restart Your Dev Server
```bash
npm run dev
```

### Step 3: Test the Feature
1. Go to Staff Dashboard → Student Attendance tab
2. Select a class, session, and date
3. Click "Absent" for any student
4. You'll see "Approved" and "Unapproved" buttons appear
5. Select the appropriate status
6. Submit attendance

## Database Schema

### student_attendance table
```sql
- id (UUID)
- student_id (UUID)
- class_id (UUID)
- session_id (UUID)
- date (DATE)
- status (TEXT) - 'present', 'absent', 'on_duty'
- approval_status (TEXT) - 'approved', 'unapproved', NULL
- absence_reason (TEXT) - Optional notes
- marked_by (UUID)
- created_at (TIMESTAMP)
```

## Use Cases

### Approved Absences
- Medical leave with doctor's note
- Official college events
- Family emergencies (with prior notice)
- Government duty
- Sports/cultural activities

### Unapproved Absences
- Skipping class without reason
- Late arrival without valid excuse
- Leaving early without permission
- Unauthorized absence

## Benefits

1. **Better Tracking**: Distinguish between legitimate and unauthorized absences
2. **Fair Assessment**: Don't penalize students for approved absences
3. **Compliance**: Meet institutional requirements for attendance records
4. **Reporting**: Generate reports showing approved vs unapproved absences
5. **Accountability**: Clear record of absence approvals

## Future Enhancements

Possible additions:
- Add reason/notes field for absences
- Require approval from admin for certain absences
- Send notifications for unapproved absences
- Generate reports by approval status
- Set thresholds for unapproved absences
- Auto-calculate attendance percentage excluding approved absences

## Technical Details

### Files Modified
1. `/src/components/AttendanceCheckbox.jsx` - Added approval buttons UI
2. `/src/pages/StaffDashboardNew.jsx` - Updated attendance submission
3. `/src/hooks/useStudentAttendance.js` - Added approval_status parameter
4. `add-approval-status.sql` - Database schema update

### Component Props
```javascript
<AttendanceCheckbox
  studentId={student.id}
  studentName={student.name}
  initialStatus={status}
  initialApprovalStatus={approvalStatus}
  onChange={(id, status, approval) => handleChange(id, status, approval)}
/>
```

### Data Flow
```
User clicks "Absent" 
  → Approval buttons appear
  → User selects "Approved" or "Unapproved"
  → onChange callback fires with (studentId, 'absent', 'approved')
  → Data stored in attendanceMap
  → On submit, sent to database with approval_status field
```

## Troubleshooting

### Approval buttons not showing
- Make sure you selected "Absent" status first
- Check browser console for errors
- Verify component is receiving correct props

### Database errors
- Run `add-approval-status.sql` script
- Check if columns exist: `SELECT * FROM student_attendance LIMIT 1;`
- Verify RLS policies allow INSERT/UPDATE

### Data not saving
- Check browser console for errors
- Verify Supabase connection
- Check RLS policies in Supabase dashboard

## Example Usage

```javascript
// Mark student as absent with approved status
handleAttendanceChange(studentId, 'absent', 'approved')

// Mark student as absent with unapproved status
handleAttendanceChange(studentId, 'absent', 'unapproved')

// Mark student as present (no approval needed)
handleAttendanceChange(studentId, 'present', null)
```

## Testing Checklist

- [ ] Run database migration script
- [ ] Restart dev server
- [ ] Mark student as "Present" - no approval buttons
- [ ] Mark student as "Absent" - approval buttons appear
- [ ] Select "Approved" - button highlights in green
- [ ] Select "Unapproved" - button highlights in orange
- [ ] Submit attendance - data saves correctly
- [ ] Check database - approval_status column populated
- [ ] View attendance history - approval status displays

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify database schema is updated
3. Check Supabase logs
4. Ensure all files are saved
5. Clear browser cache and restart dev server
