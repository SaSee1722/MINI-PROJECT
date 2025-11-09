-- ============================================
-- ABSOLUTE FINAL FIX
-- ============================================
-- Copy and paste this ENTIRE script into Supabase SQL Editor
-- Click RUN

-- Step 1: Find the user
DO $$
DECLARE
    user_email TEXT := 'salabadeshwaran@gmail.com';
    cse_dept_id UUID;
    user_id UUID;
BEGIN
    -- Get CSE department ID
    SELECT id INTO cse_dept_id FROM departments WHERE code = 'CSE' LIMIT 1;
    
    -- If CSE doesn't exist, create it
    IF cse_dept_id IS NULL THEN
        INSERT INTO departments (name, code, description)
        VALUES ('Computer Science and Engineering', 'CSE', 'Department of Computer Science and Engineering')
        RETURNING id INTO cse_dept_id;
        RAISE NOTICE 'Created CSE department with ID: %', cse_dept_id;
    ELSE
        RAISE NOTICE 'CSE department exists with ID: %', cse_dept_id;
    END IF;
    
    -- Get user ID
    SELECT id INTO user_id FROM users WHERE email = user_email LIMIT 1;
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User % not found in users table!', user_email;
    END IF;
    
    -- Update user's department_id
    UPDATE users 
    SET department_id = cse_dept_id
    WHERE id = user_id;
    
    RAISE NOTICE 'Updated user % with department_id: %', user_email, cse_dept_id;
END $$;

-- Step 2: Verify the fix
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.department_id,
  d.name as department_name,
  d.code as department_code
FROM users u
LEFT JOIN departments d ON u.department_id = d.id
WHERE u.email = 'salabadeshwaran@gmail.com';

-- EXPECTED OUTPUT:
-- department_id: <some UUID> (NOT NULL!)
-- department_name: Computer Science and Engineering
-- department_code: CSE

-- If you see this, the fix worked! ✅
