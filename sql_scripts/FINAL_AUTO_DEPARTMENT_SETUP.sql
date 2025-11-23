-- ============================================
-- FINAL SETUP: Auto-assign Department on Signup
-- ============================================
-- This ensures ALL future users get their department automatically

-- ============================================
-- Step 1: Update the trigger to handle department_id
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, department_id, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    (NEW.raw_user_meta_data->>'department_id')::uuid,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = COALESCE(NEW.raw_user_meta_data->>'name', EXCLUDED.name),
    role = COALESCE(NEW.raw_user_meta_data->>'role', EXCLUDED.role),
    department_id = COALESCE((NEW.raw_user_meta_data->>'department_id')::uuid, EXCLUDED.department_id),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Step 2: Ensure trigger exists
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Step 3: Fix current user (salabadeshwaran@gmail.com)
-- ============================================

-- Update current user with CSE department
UPDATE users 
SET department_id = (SELECT id FROM departments WHERE code = 'CSE')
WHERE email = 'salabadeshwaran@gmail.com';

-- ============================================
-- Step 4: Verify everything
-- ============================================

-- Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check current user
SELECT 
  u.email,
  u.role,
  u.department_id,
  d.name as department_name,
  d.code as department_code
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
WHERE u.email = 'salabadeshwaran@gmail.com';

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- Trigger: on_auth_user_created should exist
-- User: department_id should have UUID (not NULL)
-- User: department_name should be "Computer Science and Engineering"
-- User: department_code should be "CSE"

-- ============================================
-- HOW IT WORKS NOW
-- ============================================
/*
When ANY user signs up:
1. User fills signup form with:
   - Email
   - Password
   - Role (Admin/Staff)
   - Department (CSE/MECH/etc.)

2. Signup saves department_id to auth metadata

3. Database trigger automatically:
   - Creates user profile in users table
   - Sets role from metadata
   - Sets department_id from metadata

4. User logs in:
   - Dashboard automatically loads their department
   - All forms show their department (grayed out)
   - Cannot change department

NO MANUAL SQL NEEDED! ✅
*/
