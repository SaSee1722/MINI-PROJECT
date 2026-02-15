-- Force delete a specific user by ID
-- Replace the UUID below with the specific User ID that is stuck
-- This bypasses standard foreign keys by manually clearing dependencies first

DO $$
DECLARE
    target_user_id UUID := 'b782f8e2-1011-42d6-93de-7250dbac3316'; -- User ID from screenshot
BEGIN
    -- 1. Remove from 'student_leave_requests' (Cascade Delete)
    DELETE FROM public.student_leave_requests WHERE staff_id = target_user_id;
    
    -- 2. Update 'timetable' (Set NULL)
    UPDATE public.timetable SET created_by = NULL WHERE created_by = target_user_id;
    
    -- 3. Update 'students' (Set NULL)
    UPDATE public.students SET created_by = NULL WHERE created_by = target_user_id;
    
    -- 4. Update 'attendance' (Set NULL)
    -- Check if table/column exists dynamically effectively, or just try-catch block
    BEGIN
        UPDATE public.attendance SET marked_by = NULL WHERE marked_by = target_user_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- 5. Update 'classes' (Set NULL, check created_by)
    BEGIN
        UPDATE public.classes SET created_by = NULL WHERE created_by = target_user_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;
    
    -- 6. Update 'departments' (Set NULL, check created_by)
    BEGIN
        UPDATE public.departments SET created_by = NULL WHERE created_by = target_user_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- 7. FINALLY, delete from public.users (Profile)
    DELETE FROM public.users WHERE id = target_user_id;

    -- After running this script in SQL Editor, go back to Auth Dashboard and try deleting again.
    -- Or, since we cleared public dependencies, the Auth delete should work now.
END $$;
