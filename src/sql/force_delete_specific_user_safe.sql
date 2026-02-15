-- Force delete a SPECIFIC user by ID
-- Replace the UUID below with the one you want to delete
-- This script safely ignores missing tables to prevent errors

DO $$
DECLARE
    -- The specific User ID you are trying to delete
    target_user_id UUID := 'b782f8e2-1011-42d6-93de-7250dbac3316';
BEGIN
    -- 1. Unlink from Timetables (Set creator to NULL)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'timetable') THEN
        UPDATE public.timetable SET created_by = NULL WHERE created_by = target_user_id;
    END IF;

    -- 2. Unlink from Students (Set creator to NULL)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
        UPDATE public.students SET created_by = NULL WHERE created_by = target_user_id;
    END IF;

    -- 3. Delete Leave Requests (Cascade Delete)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_leave_requests') THEN
        DELETE FROM public.student_leave_requests WHERE staff_id = target_user_id;
    END IF;

    -- 4. Unlink from Classes (Set creator to NULL)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'classes') THEN
        BEGIN
            UPDATE public.classes SET created_by = NULL WHERE created_by = target_user_id;
        EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;

    -- 5. Unlink from Attendance (Set marker to NULL)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance') THEN
        BEGIN
            -- Using dynamic SQL just in case column name varies, but standard update is fine if caught
            UPDATE public.attendance SET marked_by = NULL WHERE marked_by = target_user_id;
        EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
    
    -- 6. Unlink from Departments
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'departments') THEN
         BEGIN
            UPDATE public.departments SET created_by = NULL WHERE created_by = target_user_id;
         EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;

    -- 7. Delete Notifications (If table exists)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        DELETE FROM public.notifications WHERE user_id = target_user_id;
    END IF;

    -- 8. FINALLY, delete from public.users (Profile)
    -- This removes the main blocker for Auth deletion
    DELETE FROM public.users WHERE id = target_user_id;

    RAISE NOTICE 'Manually decoupled user % from public tables.', target_user_id;
END $$;
