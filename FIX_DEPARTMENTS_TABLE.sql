-- ============================================
-- FIX DEPARTMENTS TABLE FOR INITIAL SETUP
-- ============================================
-- Make created_by nullable so we can create initial departments
-- before any users exist

-- ============================================
-- STEP 1: Make created_by nullable
-- ============================================

ALTER TABLE departments 
ALTER COLUMN created_by DROP NOT NULL;

-- ============================================
-- STEP 2: Now you can create initial departments
-- ============================================

-- Run CREATE_INITIAL_DEPARTMENTS.sql after this

-- ============================================
-- VERIFICATION
-- ============================================

-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'departments';

-- ============================================
-- NOTES
-- ============================================

/*
Why this is needed:

1. Departments table has created_by field
2. created_by references users table
3. But we need departments BEFORE users can signup
4. Solution: Make created_by nullable
5. Initial departments will have created_by = NULL
6. Later, when Deans create new departments, created_by will be set

This is the correct approach for initial setup!
*/
