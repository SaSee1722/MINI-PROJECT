## Diagnosis
- Staff count shows 0 because admin counts filter `is_marked` in `staff_attendance`, but staff records inserted in `My Attendance` do not set `is_marked`.
  - Insert path: `src/pages/StaffDashboardNew.jsx:70-78`
  - Admin count path: `src/pages/AdminDashboardNew.jsx:421-456` (filters `.eq('is_marked', true)` on `staff_attendance`)
- Student records today show 0 because the card uses `period_attendance` count, not student-level entries. If staff only marked their own attendance, `period_attendance` stays 0.
  - Student card source: `src/pages/AdminDashboardNew.jsx:452-456`
- Duplicate staff rows can occur when `session_id` is `null` because existence check uses `.eq('session_id', sessionId)`; Postgres needs `.is('session_id', null)`.
  - Path: `src/hooks/useAttendance.js:60-69`

## Changes
### 1) Fix staff counts in Admin dashboard
- Remove `is_marked` filter for staff and count records by `date=today`, filtered to the admin’s `stream_id` via `users` join.
- Code: edit `fetchPeriodAttendanceCount` to:
  - Query `staff_attendance` with `.eq('date', today)` and select `users!inner(stream_id)`; set `staffAttendanceCount` to returned count.

### 2) Optionally set `is_marked` on staff insert
- When inserting staff attendance in `handleMarkMyAttendance`, include `is_marked: true` if the column exists.
- Code: update `src/pages/StaffDashboardNew.jsx:70-78` to add `is_marked: true`.

### 3) Correct student records today metric
- Compute `studentAttendanceCount` from `period_student_attendance` joined with `period_attendance(date=today)` and filtered by `classes.stream_id`.
- Replace current `period_attendance` count used for the “Student Records” card.

### 4) Null-safe existence check for staff attendance
- In `useAttendance.markAttendance`, replace `.eq('session_id', sessionId)` with `.is('session_id', null)` when `sessionId` is null; otherwise keep `.eq`.
- Prevent duplicate rows and support updates.

## Verification
- Mark staff attendance for multiple periods; confirm `My Attendance` lists entries and Admin “Staff Records” shows > 0 for today.
- Mark a class’s period attendance; confirm Admin “Student Records” reflects the count from `period_student_attendance` for today.
- Re-run Admin dashboard; ensure counts update without reload.
- Quick supabase checks:
  - `staff_attendance`: has rows for `date=today` and correct `user_id`; optional `is_marked=true` where we set it.
  - `period_attendance`: rows for today when periods are marked.
  - `period_student_attendance`: rows for today with matching `period_attendance_id`.

If you confirm, I’ll implement the edits in the referenced files and test the metrics end-to-end.