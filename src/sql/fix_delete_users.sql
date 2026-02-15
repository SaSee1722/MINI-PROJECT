-- Fix User Deletion Issues
-- This script updates foreign key constraints to allow cascading deletes.
-- This means when you delete a user from the Authentication dashboard, 
-- their related data in public tables will be automatically deleted.

-- 1. Fix 'users' table (profiles)
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_id_fkey, -- Drop if exists (name might vary)
ADD CONSTRAINT users_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- 2. Fix 'student_leave_requests' table
-- Check if table exists first to avoid errors
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_leave_requests') THEN
        ALTER TABLE public.student_leave_requests
        DROP CONSTRAINT IF EXISTS student_leave_requests_staff_id_fkey; -- Try standard name

        ALTER TABLE public.student_leave_requests
        ADD CONSTRAINT student_leave_requests_staff_id_fkey
            FOREIGN KEY (staff_id)
            REFERENCES auth.users(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- 3. Fix 'timetable' table (created_by column)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'timetable') THEN
        -- We need to find the constraint name or just drop by column if possible, but SQL needs names.
        -- We'll try generic names or just add the constraint if it was missing/default.
        -- To be safe, we might need to inspect information_schema, but simpler is to try dropping standard names.
        
        -- Attempt to drop likely constraint names
        BEGIN
            ALTER TABLE public.timetable DROP CONSTRAINT IF EXISTS timetable_created_by_fkey;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        ALTER TABLE public.timetable
        ADD CONSTRAINT timetable_created_by_fkey
            FOREIGN KEY (created_by)
            REFERENCES auth.users(id)
            ON DELETE SET NULL; -- Or CASCADE? Usually we want to keep the timetable even if staff is deleted.
                                -- Let's use SET NULL for content that should survive user deletion.
    END IF;
END $$;

-- 4. Fix 'students' table (created_by column)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'students') THEN
        BEGIN
            ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_created_by_fkey;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        ALTER TABLE public.students
        ADD CONSTRAINT students_created_by_fkey
            FOREIGN KEY (created_by)
            REFERENCES auth.users(id)
            ON DELETE SET NULL; -- Keep student records even if the creating staff is deleted
    END IF;
END $$;

-- 5. Fix 'attendance' table (if it references users/staff)
-- Check if 'attendance' exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance') THEN
        -- If marked_by exists
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'marked_by') THEN
             BEGIN
                ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_marked_by_fkey;
             EXCEPTION WHEN OTHERS THEN NULL; END;

             ALTER TABLE public.attendance
             ADD CONSTRAINT attendance_marked_by_fkey
                 FOREIGN KEY (marked_by)
                 REFERENCES auth.users(id)
                 ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 6. Add ON DELETE CASCADE to any table referencing public.users (if any)
-- Assuming 'public.users' is the main profile table. 
-- However, most relationships seem to be direct to auth.users or to 'students'.

-- If you have specific tables failing, you can find the constraint name in the browser console error or Supabase dashboard error (if visible).
