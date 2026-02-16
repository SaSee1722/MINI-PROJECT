-- FIX USER DELETION ERRORS
-- This script updates foreign key constraints that are currently blocking user deletion in the Supabase Dashboard.
-- Run this in the Supabase SQL Editor.

BEGIN;

-- 1. Fix student_leave_requests (references auth.users directly)
ALTER TABLE IF EXISTS public.student_leave_requests 
    DROP CONSTRAINT IF EXISTS student_leave_requests_staff_id_fkey;

ALTER TABLE IF EXISTS public.student_leave_requests
    ADD CONSTRAINT student_leave_requests_staff_id_fkey 
    FOREIGN KEY (staff_id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- 2. Fix daily_student_attendance (references auth.users directly)
ALTER TABLE IF EXISTS public.daily_student_attendance 
    DROP CONSTRAINT IF EXISTS daily_student_attendance_marked_by_fkey;

ALTER TABLE IF EXISTS public.daily_student_attendance
    ADD CONSTRAINT daily_student_attendance_marked_by_fkey 
    FOREIGN KEY (marked_by) REFERENCES auth.users(id) ON DELETE SET NULL;


-- 3. Fix period_attendance (if referencing auth.users directly or via public.users)
-- (Some versions reference public.users, some auth.users)
-- Let's handle both possibilities by checking common constraint names or just applying to both.

ALTER TABLE IF EXISTS public.period_attendance 
    DROP CONSTRAINT IF EXISTS period_attendance_marked_by_fkey;

ALTER TABLE IF EXISTS public.period_attendance
    ADD CONSTRAINT period_attendance_marked_by_fkey 
    FOREIGN KEY (marked_by) REFERENCES auth.users(id) ON DELETE SET NULL;


-- 4. Fix student_attendance (marked_by)
ALTER TABLE IF EXISTS public.student_attendance 
    DROP CONSTRAINT IF EXISTS student_attendance_marked_by_fkey;

ALTER TABLE IF EXISTS public.student_attendance
    ADD CONSTRAINT student_attendance_marked_by_fkey 
    FOREIGN KEY (marked_by) REFERENCES public.users(id) ON DELETE SET NULL;


-- 5. Extra check for public.users -> auth.users link
-- This is usually the root cause if it's missing ON DELETE CASCADE
ALTER TABLE IF EXISTS public.users 
    DROP CONSTRAINT IF EXISTS users_id_fkey;

ALTER TABLE IF EXISTS public.users
    ADD CONSTRAINT users_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- 6. Notifications (user_id)
ALTER TABLE IF EXISTS public.notifications 
    DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE IF EXISTS public.notifications
    ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

COMMIT;

SELECT '✅ All foreign key constraints updated! You can now delete users from the Auth dashboard.' as message;
