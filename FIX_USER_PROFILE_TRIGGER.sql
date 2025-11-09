-- ============================================
-- FIX: Auto-create user profile on signup
-- ============================================
-- This trigger automatically creates a user profile in the 'users' table
-- when a new user signs up via Supabase Auth

-- Step 1: Create or replace the function that handles new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- After running this, test by signing up a new user
-- Then run this query to verify the profile was created:
-- SELECT * FROM users WHERE email = 'your-test-email@example.com';

-- ============================================
-- MANUAL FIX FOR EXISTING USER
-- ============================================
-- If you already have a user without a profile (salabtradebot@gmail.com),
-- you need to manually create their profile:

-- First, get the user's ID from auth.users:
-- SELECT id, email FROM auth.users WHERE email = 'salabtradebot@gmail.com';

-- Then insert their profile (replace 'USER_ID_HERE' with actual UUID):
/*
INSERT INTO public.users (id, email, name, role, created_at)
VALUES (
  'USER_ID_HERE',  -- Replace with actual UUID from auth.users
  'salabtradebot@gmail.com',
  'Salab Trade Bot',  -- Or whatever name you want
  'admin',  -- or 'staff'
  NOW()
)
ON CONFLICT (id) DO NOTHING;
*/
