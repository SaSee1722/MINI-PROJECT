-- Force delete the user from AUTH.users 
-- This is necessary because 'public.users' is already clear, 
-- but 'auth.users' is the master table that might still be blocked by some other internal reference.

DO $$
DECLARE
    target_user_id UUID := 'b782f8e2-1011-42d6-93de-7250dbac3316';
BEGIN
    -- 1. Double check public.users is cleared (just in case)
    DELETE FROM public.users WHERE id = target_user_id;

    -- 2. Check for any lingering references in other known tables that might block auth delete
    
    -- Check 'objects' in 'storage' schema (if user uploaded files)
    -- We can't always delete from storage.objects easily due to RLS, but let's try updating owner
    BEGIN
        UPDATE storage.objects SET owner = NULL WHERE owner = target_user_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- 3. Attempt to delete directly from auth.users
    -- WARNING: This is usually done via the dashboard, but if the dashboard fails, 
    -- we can try to force it here if we have permissions (postgres role usually does).
    
    DELETE FROM auth.users WHERE id = target_user_id;
    
    RAISE NOTICE 'Attempted to delete user % from auth.users', target_user_id;
END $$;
