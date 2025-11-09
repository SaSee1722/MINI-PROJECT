# Quick Setup Guide - Alternative Staff Feature

## 🚀 Quick Start (5 Minutes)

### Step 1: Run Database Migration (2 minutes)

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `add-alternative-staff.sql`
5. Click **Run** or press `Ctrl+Enter`
6. Wait for success message: ✅ Alternative Staff feature added successfully!

### Step 2: Verify Installation (1 minute)

Run this query to verify columns were added:

```sql
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'period_attendance'
  AND column_name IN ('alternative_staff_id', 'alternative_staff_name', 'is_alternative_staff')
ORDER BY column_name;
```

**Expected Output:**
```
alternative_staff_id      | uuid    | YES
alternative_staff_name    | text    | YES
is_alternative_staff      | boolean | YES
```

### Step 3: Test the Feature (2 minutes)

1. Login as a **staff member**
2. Go to **Staff Dashboard** → **Timetable** tab
3. Select any class
4. Click on any period to mark attendance
5. Look for the **yellow "Alternative Staff" section** at the top
6. Check the checkbox and select a staff member
7. Mark attendance and submit
8. Success! ✅

---

## ✅ Verification Checklist

After setup, verify these work:

- [ ] Yellow alternative staff section appears in attendance modal
- [ ] Dropdown shows list of all staff members
- [ ] Can select alternative staff and submit attendance
- [ ] Success message shows alternative staff name
- [ ] Viewing marked attendance shows alternative staff badge (if applicable)
- [ ] Regular attendance (without alternative staff) still works

---

## 🎯 How to Use

### For Regular Attendance (No Change):
1. Click period → Mark attendance → Submit
2. Works exactly as before

### For Alternative Staff Attendance (NEW):
1. Click period
2. **Check "Mark as Alternative Staff"** ☑️
3. **Select staff member from dropdown** 📋
4. Mark student attendance
5. Submit
6. Done! ✅

---

## 🎨 Visual Guide

### What You'll See:

**In Attendance Modal:**
```
┌────────────────────────────────────────┐
│ 🔄 Mark as Alternative Staff           │
│ ☑ Check this if marking on behalf of  │
│   regular faculty who is absent        │
│                                        │
│ Select Alternative Staff Member *      │
│ [Dropdown with all staff names]        │
└────────────────────────────────────────┘
```

**When Viewing Marked Attendance:**
```
┌────────────────────────────────────────┐
│ ✅ Marked on 01/09/2025, 10:30 AM     │
│                                        │
│ 🔄 Marked by Alternative Staff:        │
│    Mrs. Jane Smith                     │
│    (Regular faculty: Mr. John Doe      │
│     was absent)                        │
└────────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Problem: SQL migration fails
**Solution:** 
- Make sure you're connected to the correct database
- Check if columns already exist (run verification query)
- Contact admin if permission denied

### Problem: Dropdown is empty
**Solution:**
- Verify staff members exist in database
- Run: `SELECT id, name, email FROM users WHERE role = 'staff'`
- Add staff members if needed

### Problem: Can't submit with alternative staff
**Solution:**
- Make sure you selected a staff member from dropdown
- Don't leave dropdown on "-- Select Staff Member --"

---

## 📊 Database Schema

### New Columns Added to `period_attendance`:

| Column | Type | Description |
|--------|------|-------------|
| `alternative_staff_id` | UUID | ID of alternative staff who marked attendance |
| `alternative_staff_name` | TEXT | Name of alternative staff (for quick reference) |
| `is_alternative_staff` | BOOLEAN | TRUE if marked by alternative staff |

### Relationships:
- `alternative_staff_id` → `users(id)` (Foreign Key)
- ON DELETE SET NULL (if staff deleted, field becomes NULL)

---

## 💡 Use Cases

### When to Use Alternative Staff:

✅ Regular faculty is on leave
✅ Faculty has emergency absence
✅ Planned substitution
✅ Department head covering class
✅ Guest lecturer marking attendance

### When NOT to Use:

❌ Regular faculty is present
❌ Just testing the system
❌ Marking your own scheduled periods

---

## 🎓 Training Tips

### For Staff Members:

1. **Always check the checkbox** when marking for absent colleague
2. **Select your own name** from the dropdown
3. **Verify success message** shows your name
4. **Reports will show** you marked the attendance

### For Administrators:

1. **Monitor usage** through database queries
2. **Generate reports** showing alternative staff usage
3. **Track patterns** in faculty absences
4. **Audit trail** is maintained automatically

---

## 📈 Reports & Analytics

### Query Alternative Staff Attendance:

```sql
SELECT 
  pa.date,
  pa.period_number,
  t.subject_name,
  t.faculty_name AS regular_faculty,
  pa.alternative_staff_name AS marked_by,
  pa.present_count,
  pa.absent_count
FROM period_attendance pa
JOIN timetable t ON pa.timetable_id = t.id
WHERE pa.is_alternative_staff = TRUE
ORDER BY pa.date DESC, pa.period_number;
```

### Count Alternative Staff Usage:

```sql
SELECT 
  alternative_staff_name,
  COUNT(*) AS times_marked_attendance
FROM period_attendance
WHERE is_alternative_staff = TRUE
GROUP BY alternative_staff_name
ORDER BY times_marked_attendance DESC;
```

---

## 🔒 Security Notes

### Permissions:
- ✅ All staff can mark attendance as alternative
- ✅ All staff can view attendance records
- ✅ Only staff and admins have access
- ✅ Students cannot mark attendance

### Data Privacy:
- ✅ Alternative staff info stored securely
- ✅ Audit trail maintained
- ✅ Original faculty info preserved
- ✅ No data is deleted or overwritten

---

## 📞 Need Help?

### Common Issues:

**Issue:** "Please select an alternative staff member"
**Fix:** Select a staff member from the dropdown before submitting

**Issue:** Dropdown not showing
**Fix:** Refresh the page and try again

**Issue:** Can't see alternative staff badge
**Fix:** Only shows when attendance was marked by alternative staff

---

## ✨ Success Indicators

You'll know it's working when:

1. ✅ Yellow section appears in attendance modal
2. ✅ Dropdown lists all staff members
3. ✅ Success message includes alternative staff name
4. ✅ Badge shows in view mode (when applicable)
5. ✅ Reports show correct attribution

---

## 🎉 You're All Set!

The Alternative Staff feature is now ready to use. Staff members can:

- ✅ Mark attendance when regular faculty is absent
- ✅ Select their name from dropdown
- ✅ See proper attribution in reports
- ✅ Maintain accurate attendance records

**No training required - the UI is self-explanatory!**

---

## 📄 Additional Resources

- **Full Documentation:** `ALTERNATIVE_STAFF_FEATURE.md`
- **Database Migration:** `add-alternative-staff.sql`
- **Support:** Contact your system administrator

---

**Setup Complete! 🎊**

The feature is production-ready and can be used immediately after running the database migration.

---

**Last Updated:** January 9, 2025
**Version:** 1.0
**Status:** ✅ READY FOR PRODUCTION
