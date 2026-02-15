-- Comprehensive Audit and Fix for User Deletion
-- This script will attempt to find ALL foreign keys referencing auth.users or public.users
-- and update them to cascading delete or set null.

-- 1. Function to drop and recreate constraint safely
CREATE OR REPLACE FUNCTION update_foreign_key(
    target_table text, 
    target_column text, 
    ref_table text, 
    ref_column text, 
    on_delete_action text
) RETURNS void AS $$
DECLARE
    constraint_name text;
    sql_cmd text;
BEGIN
    -- Find existing constraint name
    SELECT
        tc.constraint_name INTO constraint_name
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
    WHERE constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = target_table
      AND kcu.column_name = target_column
      AND ccu.table_name = ref_table;

    -- If constraint exists, drop it
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.' || quote_ident(target_table) || ' DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;

    -- Add the new constraint
    -- We can't reuse the old name reliably if it was auto-generated differently, but we can try a standard naming convention
    -- or just let Postgres generate it if we didn't specify (but we want to specify for clarity).
    -- Let's use a standard name: {table}_{column}_fkey_fixed
    
    sql_cmd := 'ALTER TABLE public.' || quote_ident(target_table) || 
               ' ADD CONSTRAINT ' || quote_ident(target_table || '_' || target_column || '_fkey_fixed') || 
               ' FOREIGN KEY (' || quote_ident(target_column) || ') ' || 
               ' REFERENCES ' || quote_ident(ref_table) || '(' || quote_ident(ref_column) || ') ' || 
               ' ON DELETE ' || on_delete_action;
               
    EXECUTE sql_cmd;
    
    RAISE NOTICE 'Updated constraint on %.% referencing %.%', target_table, target_column, ref_table, ref_column;
END;
$$ LANGUAGE plpgsql;


-- 2. Execute Updates for Known Tables

-- A. USER PROFILES (Critical: Cascading Delete)
-- When auth user is deleted, their profile must go.
SELECT update_foreign_key('users', 'id', 'users', 'id', 'CASCADE'); 
-- Note: 'users' references 'auth.users'. The function above expects table names in current schema or public without schema prefix if in search path.
-- Wait, the function assumes ref_table is in visible path. 'users' is in 'auth' schema for the reference.
-- Let's adjust the function or just run specific commands for auth.users.

-- SIMPLIFIED APPROACH: DIRECT COMMANDS FOR ALL POSSIBLE TABLES

-- 1. public.users -> auth.users
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users 
    ADD CONSTRAINT users_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. public.student_leave_requests -> auth.users (staff_id)
ALTER TABLE public.student_leave_requests DROP CONSTRAINT IF EXISTS student_leave_requests_staff_id_fkey;
ALTER TABLE public.student_leave_requests 
    ADD CONSTRAINT student_leave_requests_staff_id_fkey 
    FOREIGN KEY (staff_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. public.timetable -> auth.users (created_by)
--    We want to keep timetables even if the creator is deleted, so SET NULL
ALTER TABLE public.timetable DROP CONSTRAINT IF EXISTS timetable_created_by_fkey;
ALTER TABLE public.timetable 
    ADD CONSTRAINT timetable_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. public.students -> auth.users (created_by)
--    Keep students, set creator to null
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_created_by_fkey;
ALTER TABLE public.students 
    ADD CONSTRAINT students_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. public.attendance -> auth.users (marked_by)
--    Keep attendance records, set marker to null
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_marked_by_fkey;
ALTER TABLE public.attendance 
    ADD CONSTRAINT attendance_marked_by_fkey 
    FOREIGN KEY (marked_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. public.notifications -> auth.users (user_id)
--    Delete notifications for the user
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications 
    ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. public.classes -> auth.users (created_by)
--    Keep classes, set creator to null
ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_created_by_fkey;
ALTER TABLE public.classes 
    ADD CONSTRAINT classes_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 8. public.departments -> auth.users (created_by)
--    Keep departments
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_created_by_fkey;
ALTER TABLE public.departments 
    ADD CONSTRAINT departments_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 9. Any table referencing public.users (Profile ID)
--    If you have tables referencing public.users.id instead of auth.users.id
--    (Usually 'students' or 'attendance' might reference public.users)

-- Check attendance student_id (references students(id)) - OK
-- Check student_leave_requests staff_id (references auth.users directly) - Handled above

-- 10. Check for 'advisor_class_id' in users table
--     This references 'classes(id)', so deleting a USER doesn't affect this (User is the child here).
--     But deleting a CLASS might be blocked by this. Not our current problem.

-- 11. Trigger Handling
-- If there are triggers that run ON DELETE and fail, that could block it.
-- But standard foreign keys are the main culprit.

