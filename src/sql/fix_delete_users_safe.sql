-- FIXED Comprehensive User Deletion Script
-- This script safely checks if tables exist before attempting updates.
-- Copy and paste this ENTIRE block into Supabase SQL Editor.

-- 1. FIX: public.users (Profile) -> auth.users
-- This is critical. When auth user is deleted, profile MUST be deleted.
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        BEGIN
            ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        ALTER TABLE public.users
        ADD CONSTRAINT users_id_fkey
            FOREIGN KEY (id)
            REFERENCES auth.users(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- 2. FIX: public.student_leave_requests (staff_id)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_leave_requests') THEN
        BEGIN
            ALTER TABLE public.student_leave_requests DROP CONSTRAINT IF EXISTS student_leave_requests_staff_id_fkey;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        ALTER TABLE public.student_leave_requests
        ADD CONSTRAINT student_leave_requests_staff_id_fkey
            FOREIGN KEY (staff_id)
            REFERENCES auth.users(id)
            ON DELETE CASCADE;
    END IF;
END $$;


-- 3. FIX: public.notifications (user_id) - Safe check
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        BEGIN
            ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        ALTER TABLE public.notifications
        ADD CONSTRAINT notifications_user_id_fkey
            FOREIGN KEY (user_id)
            REFERENCES auth.users(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- 4. FIX: public.timetable (created_by)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'timetable') THEN
        BEGIN
            ALTER TABLE public.timetable DROP CONSTRAINT IF EXISTS timetable_created_by_fkey;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        ALTER TABLE public.timetable
        ADD CONSTRAINT timetable_created_by_fkey
            FOREIGN KEY (created_by)
            REFERENCES auth.users(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- 5. FIX: public.students (created_by)
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
            ON DELETE SET NULL;
    END IF;
END $$;

-- 6. FIX: public.attendance (marked_by)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'attendance') THEN
        -- Check if 'marked_by' column exists
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

-- 7. FIX: public.classes (created_by)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'classes') THEN
        BEGIN
             ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_created_by_fkey;
        EXCEPTION WHEN OTHERS THEN NULL; END;
        
        -- Check if created_by column exists before adding constraint (it usually does for audit)
         IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'created_by') THEN
            ALTER TABLE public.classes
            ADD CONSTRAINT classes_created_by_fkey
                FOREIGN KEY (created_by)
                REFERENCES auth.users(id)
                ON DELETE SET NULL;
         END IF;
    END IF;
END $$;

-- 8. FIX: public.departments (created_by)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'departments') THEN
         BEGIN
             ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_created_by_fkey;
         EXCEPTION WHEN OTHERS THEN NULL; END;

         IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'departments' AND column_name = 'created_by') THEN
            ALTER TABLE public.departments
            ADD CONSTRAINT departments_created_by_fkey
                FOREIGN KEY (created_by)
                REFERENCES auth.users(id)
                ON DELETE SET NULL;
         END IF;
    END IF;
END $$;
