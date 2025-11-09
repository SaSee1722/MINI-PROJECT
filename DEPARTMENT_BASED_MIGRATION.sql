-- ============================================
-- DEPARTMENT-BASED MULTI-TENANCY MIGRATION
-- ============================================
-- Purpose: Link users to departments for proper isolation
-- Each Dean (admin) manages only their department
-- Each Staff sees only their department's data

-- ============================================
-- STEP 1: Add department_id to users table
-- ============================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);

-- ============================================
-- STEP 2: View existing data
-- ============================================

-- Check existing departments
SELECT id, name, code, created_by FROM departments ORDER BY name;

-- Check existing users
SELECT id, name, email, role, department_id FROM users ORDER BY role, email;

-- ============================================
-- STEP 3: Assign existing users to departments
-- ============================================

-- IMPORTANT: Replace the UUIDs below with actual IDs from your database

-- Example 1: Assign admin to CSE department
-- First, find the CSE department ID:
-- SELECT id FROM departments WHERE code = 'CSE';
-- Then assign:
-- UPDATE users 
-- SET department_id = 'YOUR_CSE_DEPARTMENT_ID' 
-- WHERE email = 'salabtradebot@gmail.com';

-- Example 2: Assign staff to MECH department
-- UPDATE users 
-- SET department_id = 'YOUR_MECH_DEPARTMENT_ID' 
-- WHERE email = 'rajarajan@example.com';

-- Template for assigning users:
/*
UPDATE users 
SET department_id = 'DEPARTMENT_ID_HERE' 
WHERE email = 'USER_EMAIL_HERE';
*/

-- ============================================
-- STEP 4: Update RLS Policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view their own classes" ON classes;
DROP POLICY IF EXISTS "Staff can view all classes" ON classes;
DROP POLICY IF EXISTS "Admins can view their own students" ON students;
DROP POLICY IF EXISTS "Staff can view all students" ON students;

-- ============================================
-- CLASSES POLICIES
-- ============================================

-- Admin (Dean) can view classes in their department
CREATE POLICY "Admins can view their department classes" ON classes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.department_id = classes.department_id
    )
  );

-- Admin can insert classes in their department
CREATE POLICY "Admins can insert classes in their department" ON classes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.department_id = classes.department_id
    )
  );

-- Admin can update classes in their department
CREATE POLICY "Admins can update their department classes" ON classes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.department_id = classes.department_id
    )
  );

-- Admin can delete classes in their department
CREATE POLICY "Admins can delete their department classes" ON classes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.department_id = classes.department_id
    )
  );

-- Staff can view classes in their department
CREATE POLICY "Staff can view their department classes" ON classes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'staff'
      AND users.department_id = classes.department_id
    )
  );

-- ============================================
-- STUDENTS POLICIES
-- ============================================

-- Admin can view students in their department
CREATE POLICY "Admins can view their department students" ON students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.department_id = students.department_id
    )
  );

-- Admin can insert students in their department
CREATE POLICY "Admins can insert students in their department" ON students
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.department_id = students.department_id
    )
  );

-- Admin can update students in their department
CREATE POLICY "Admins can update their department students" ON students
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.department_id = students.department_id
    )
  );

-- Admin can delete students in their department
CREATE POLICY "Admins can delete their department students" ON students
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.department_id = students.department_id
    )
  );

-- Staff can view students in their department
CREATE POLICY "Staff can view their department students" ON students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'staff'
      AND users.department_id = students.department_id
    )
  );

-- ============================================
-- DEPARTMENTS POLICIES
-- ============================================

-- Admin can view their own department
CREATE POLICY "Admins can view their department" ON departments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.department_id = departments.id
    )
  );

-- Staff can view their department
CREATE POLICY "Staff can view their department" ON departments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'staff'
      AND users.department_id = departments.id
    )
  );

-- ============================================
-- OPTIONAL: Super Admin Role
-- ============================================

-- Uncomment if you need a super admin who can see all departments

-- ALTER TABLE users 
-- ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- -- Assign super admin
-- UPDATE users 
-- SET is_super_admin = TRUE 
-- WHERE email = 'principal@college.edu';

-- -- Super admin can view all classes
-- CREATE POLICY "Super admin can view all classes" ON classes
--   FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM users 
--       WHERE users.id = auth.uid() 
--       AND users.is_super_admin = TRUE
--     )
--   );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check users and their departments
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  d.name as department_name,
  d.code as department_code
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
ORDER BY u.role, u.email;

-- Check classes and their departments
SELECT 
  c.id,
  c.name as class_name,
  d.name as department_name,
  d.code as department_code,
  u.name as created_by_user
FROM classes c
LEFT JOIN departments d ON c.department_id = d.id
LEFT JOIN users u ON c.created_by = u.id
ORDER BY d.name, c.name;

-- Check students and their departments
SELECT 
  s.id,
  s.name as student_name,
  s.roll_number,
  c.name as class_name,
  d.name as department_name
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
LEFT JOIN departments d ON s.department_id = d.id
ORDER BY d.name, c.name, s.name;

-- ============================================
-- NOTES
-- ============================================

/*
IMPORTANT STEPS AFTER RUNNING THIS MIGRATION:

1. Assign all existing users to their departments:
   - Find department IDs: SELECT id, name FROM departments;
   - Update users: UPDATE users SET department_id = 'DEPT_ID' WHERE email = 'user@email.com';

2. Update Signup.jsx to include department selection

3. Update all data hooks (useClasses, useStudents, etc.) to filter by department

4. Test with multiple departments to ensure isolation

5. Verify RLS policies are working correctly

6. Update dashboards to show department information
*/
