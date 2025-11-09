-- ============================================
-- FIX: Staff Cannot See Classes
-- ============================================
-- Problem: Staff dashboard shows no classes because classes.staff_id is NULL
-- Solution: Either assign staff to classes OR show all classes to staff

-- ============================================
-- OPTION 1: Assign Staff to Specific Classes
-- ============================================

-- First, get the staff user ID
SELECT id, name, email, role FROM users WHERE role = 'staff';
-- Copy the staff user ID (e.g., for RAJARAJAN)

-- Then assign staff to classes
-- Replace 'STAFF_USER_ID_HERE' with the actual staff user ID

UPDATE classes 
SET staff_id = 'STAFF_USER_ID_HERE' 
WHERE name = 'II CSE B';

UPDATE classes 
SET staff_id = 'STAFF_USER_ID_HERE' 
WHERE name = 'II MECH A';

UPDATE classes 
SET staff_id = 'STAFF_USER_ID_HERE' 
WHERE name = 'III CSE';

-- ============================================
-- OPTION 2: Show All Classes to All Staff (Simpler)
-- ============================================
-- This allows any staff to see and mark attendance for any class
-- No need to assign specific classes to specific staff

-- No SQL needed - just update the code to fetch all classes for staff role

-- ============================================
-- VERIFICATION
-- ============================================

-- Check which classes have staff assigned:
SELECT 
  c.id,
  c.name,
  c.staff_id,
  u.name as staff_name,
  u.email as staff_email
FROM classes c
LEFT JOIN users u ON c.staff_id = u.id
ORDER BY c.name;

-- Check staff users:
SELECT id, name, email, role FROM users WHERE role = 'staff';

-- ============================================
-- RECOMMENDED APPROACH
-- ============================================

-- For your use case, I recommend OPTION 2 (show all classes to staff)
-- because:
-- 1. Simpler - no need to manually assign staff to classes
-- 2. More flexible - staff can cover for each other
-- 3. Easier to manage - admin creates classes, staff can access them

-- The code fix will be in the useClasses hook to check user role
-- and fetch accordingly:
-- - Admin: Filter by created_by (only their classes)
-- - Staff: Show all classes (or filter by created_by of admin who created them)
