-- ============================================
-- ASSIGN EXISTING USERS TO DEPARTMENTS
-- ============================================
-- Run this after the department-based migration
-- to assign your existing users to their departments

-- ============================================
-- STEP 1: View existing departments
-- ============================================

SELECT id, name, code FROM departments ORDER BY name;

-- Copy the department IDs you need

-- ============================================
-- STEP 2: View existing users
-- ============================================

SELECT id, name, email, role, department_id FROM users ORDER BY role, email;

-- ============================================
-- STEP 3: Assign users to departments
-- ============================================

-- Example: Assign salabtradebot@gmail.com (admin) to CSE department
-- Replace 'YOUR_CSE_DEPT_ID' with actual department ID from STEP 1

UPDATE users 
SET department_id = 'YOUR_CSE_DEPT_ID' 
WHERE email = 'salabtradebot@gmail.com';

-- Example: Assign RAJARAJAN (staff) to MECH department
-- Replace 'YOUR_MECH_DEPT_ID' with actual department ID from STEP 1

UPDATE users 
SET department_id = 'YOUR_MECH_DEPT_ID' 
WHERE email = 'rajarajan@example.com';

-- ============================================
-- STEP 4: Verify assignments
-- ============================================

SELECT 
  u.id,
  u.name as user_name,
  u.email,
  u.role,
  d.name as department_name,
  d.code as department_code
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
ORDER BY u.role, u.email;

-- ============================================
-- NOTES
-- ============================================

/*
After assigning users to departments:

1. Admin (Dean) will see only their department's data
2. Staff will see only their department's classes
3. Reports will be department-specific
4. New signups will require department selection

If a user has no department_id:
- Admin: Falls back to created_by filter (old behavior)
- Staff: Shows all data (old behavior)

This ensures backward compatibility!
*/
