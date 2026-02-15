-- FINAL STUBBORN USER PURGE
-- This script specifically targets the "sessions" table which was blocking the delete.

DO $$
DECLARE
    target_user_id UUID := 'b782f8e2-1011-42d6-93de-7250dbac3316';
BEGIN
    -- 1. Unlink from public.sessions (The blocker identified in the error)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sessions') THEN
        -- Using UPDATE instead of DELETE to keep the session history but remove the user link
        UPDATE public.sessions SET created_by = NULL WHERE created_by = target_user_id;
        
        -- If it's a direct reference that doesn't allow NULLs, we delete the session instead:
        -- DELETE FROM public.sessions WHERE created_by = target_user_id;
    END IF;

    -- 2. Clean up any other potential blockers
    BEGIN
        UPDATE public.timetable SET created_by = NULL WHERE created_by = target_user_id;
        UPDATE public.students SET created_by = NULL WHERE created_by = target_user_id;
        UPDATE public.attendance SET marked_by = NULL WHERE marked_by = target_user_id;
        DELETE FROM public.student_leave_requests WHERE staff_id = target_user_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- 3. Delete Profile
    DELETE FROM public.users WHERE id = target_user_id;

    -- 4. Delete Auth Record
    DELETE FROM auth.users WHERE id = target_user_id;
    
    RAISE NOTICE 'User purged successfully.';
END $$;
