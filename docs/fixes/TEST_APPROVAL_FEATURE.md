# Testing the Approval Feature

## ✅ Fixed Issues

1. **Timing Issue**: Fixed the approval status not being set correctly when clicking "Absent"
2. **Props Issue**: Added missing `initialApprovalStatus` prop to AttendanceCheckbox component
3. **Data Structure**: Updated to use `{ status, approvalStatus }` object structure

## 🧪 How to Test

### Step 1: Run Database Migration
```bash
# In Supabase SQL Editor, run:
# File: add-approval-status.sql
```

### Step 2: Restart Dev Server
```bash
npm run dev
```

### Step 3: Test the Feature

1. **Go to Staff Dashboard**
   - Navigate to `http://localhost:3000/staff`
   - Click on "Student Attendance" tab

2. **Select Class and Session**
   - Choose a class from dropdown
   - Choose a session (Morning/Afternoon/Evening)
   - Select today's date

3. **Test Present Status**
   - Click "Present" for a student
   - ✅ Should highlight in green
   - ✅ No approval buttons should appear
   - ✅ Button should bounce/animate

4. **Test Absent Status**
   - Click "Absent" for a student
   - ✅ Should highlight in red
   - ✅ Approval buttons should appear on the right
   - ✅ "Unapproved" should be selected by default (orange)

5. **Test Approval Selection**
   - Click "Approved" button
   - ✅ Should highlight in green
   - ✅ Should scale up slightly
   - Click "Unapproved" button
   - ✅ Should highlight in orange
   - ✅ Should scale up slightly

6. **Test On Duty Status**
   - Click "On Duty" for a student
   - ✅ Should highlight in blue
   - ✅ No approval buttons should appear

7. **Test Switching Status**
   - Click "Absent" → approval buttons appear
   - Click "Present" → approval buttons disappear
   - Click "Absent" again → approval buttons reappear
   - ✅ Previous approval selection should be remembered

8. **Submit Attendance**
   - Mark several students with different statuses
   - Mark at least one as "Absent" with "Approved"
   - Mark at least one as "Absent" with "Unapproved"
   - Click "Submit Attendance"
   - ✅ Should show success message
   - ✅ All selections should be cleared

9. **Verify in Database**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT 
     s.name as student_name,
     sa.status,
     sa.approval_status,
     sa.date
   FROM student_attendance sa
   JOIN students s ON s.id = sa.student_id
   WHERE sa.date = CURRENT_DATE
   ORDER BY sa.created_at DESC;
   ```
   - ✅ Should see approval_status as 'approved' or 'unapproved' for absent students
   - ✅ Should see NULL for present/on_duty students

## 🐛 Troubleshooting

### Issue: Buttons not clickable
**Solution**: 
- Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)
- Check browser console for errors
- Ensure all files are saved

### Issue: Approval buttons don't appear
**Solution**:
- Make sure you clicked "Absent" first
- Check if `showApprovalOptions` state is true in React DevTools
- Verify component is receiving correct props

### Issue: Data not saving
**Solution**:
- Run `add-approval-status.sql` in Supabase
- Check browser console for errors
- Verify RLS policies in Supabase dashboard
- Check if `approval_status` column exists:
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'student_attendance';
  ```

### Issue: Old approval status not showing
**Solution**:
- Check if `initialApprovalStatus` prop is being passed
- Verify `attendanceMap` structure is `{ status, approvalStatus }`
- Check React DevTools for component props

## 📊 Expected Behavior

### Visual Indicators

| Status | Color | Approval Buttons | Default Approval |
|--------|-------|------------------|------------------|
| Present | Green | ❌ No | N/A |
| Absent | Red | ✅ Yes | Unapproved |
| On Duty | Blue | ❌ No | N/A |

### Approval Status Colors

| Approval | Color | Icon |
|----------|-------|------|
| Approved | Green | ✓ |
| Unapproved | Orange | ⚠ |

## 🎯 Success Criteria

- [ ] Can click Present/Absent/On Duty buttons
- [ ] Absent shows approval buttons
- [ ] Present/On Duty hide approval buttons
- [ ] Can select Approved/Unapproved
- [ ] Selected options highlight correctly
- [ ] Can submit attendance successfully
- [ ] Data saves to database with approval_status
- [ ] Can switch between statuses smoothly
- [ ] Approval selection persists when switching back to Absent
- [ ] No console errors

## 📝 Notes

- Default approval status for absent is "Unapproved"
- Approval status only applies to "Absent" status
- Present and On Duty students have NULL approval_status
- The feature is backward compatible (old records without approval_status still work)

## 🔍 Debug Mode

If you need to debug, add console logs:

```javascript
// In AttendanceCheckbox.jsx
const handleStatusChange = (status) => {
  console.log('Status changed to:', status)
  setSelectedStatus(status)
  
  if (status === 'absent') {
    const newApprovalStatus = approvalStatus || 'unapproved'
    console.log('Setting approval status to:', newApprovalStatus)
    setApprovalStatus(newApprovalStatus)
    
    if (onChange) {
      console.log('Calling onChange with:', studentId, status, newApprovalStatus)
      onChange(studentId, status, newApprovalStatus)
    }
  }
  // ... rest of code
}
```

## ✨ Feature Complete!

Once all tests pass, the feature is ready for production use! 🎉
