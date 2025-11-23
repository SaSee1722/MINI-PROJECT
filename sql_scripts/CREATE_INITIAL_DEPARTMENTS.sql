-- ============================================
-- CREATE INITIAL DEPARTMENTS
-- ============================================
-- Run this BEFORE anyone signs up
-- This creates all college departments so they're available during signup

-- ============================================
-- STEP 1: Delete existing departments (optional)
-- ============================================

-- Uncomment if you want to start fresh
-- DELETE FROM departments;

-- ============================================
-- STEP 2: Create all departments
-- ============================================

-- Computer Science and Engineering
INSERT INTO departments (name, code, description)
VALUES (
  'Computer Science and Engineering',
  'CSE',
  'Department of Computer Science and Engineering'
) ON CONFLICT DO NOTHING;

-- Civil Engineering
INSERT INTO departments (name, code, description)
VALUES (
  'Civil Engineering',
  'CIVIL',
  'Department of Civil Engineering'
) ON CONFLICT DO NOTHING;

-- Mechanical Engineering
INSERT INTO departments (name, code, description)
VALUES (
  'Mechanical Engineering',
  'MECH',
  'Department of Mechanical Engineering'
) ON CONFLICT DO NOTHING;

-- Information Technology
INSERT INTO departments (name, code, description)
VALUES (
  'Information Technology',
  'IT',
  'Department of Information Technology'
) ON CONFLICT DO NOTHING;

-- Artificial Intelligence and Machine Learning
INSERT INTO departments (name, code, description)
VALUES (
  'Artificial Intelligence and Machine Learning',
  'AIML',
  'Department of Artificial Intelligence and Machine Learning'
) ON CONFLICT DO NOTHING;

-- Artificial Intelligence and Data Science
INSERT INTO departments (name, code, description)
VALUES (
  'Artificial Intelligence and Data Science',
  'AIDS',
  'Department of Artificial Intelligence and Data Science'
) ON CONFLICT DO NOTHING;

-- Cyber Security
INSERT INTO departments (name, code, description)
VALUES (
  'Cyber Security',
  'CS',
  'Department of Cyber Security'
) ON CONFLICT DO NOTHING;

-- Electronics and Communication Engineering (optional)
INSERT INTO departments (name, code, description)
VALUES (
  'Electronics and Communication Engineering',
  'ECE',
  'Department of Electronics and Communication Engineering'
) ON CONFLICT DO NOTHING;

-- Electrical and Electronics Engineering (optional)
INSERT INTO departments (name, code, description)
VALUES (
  'Electrical and Electronics Engineering',
  'EEE',
  'Department of Electrical and Electronics Engineering'
) ON CONFLICT DO NOTHING;

-- ============================================
-- STEP 3: Verify departments created
-- ============================================

SELECT id, name, code, description, created_at 
FROM departments 
ORDER BY name;

-- ============================================
-- NOTES
-- ============================================

/*
IMPORTANT:

1. Run this script FIRST before anyone signs up
2. All departments will be available in signup dropdown
3. Deans can then select their department during signup
4. Each department will have its own Dean (admin)

Department Structure:
├── CSE Department → Dean A
├── MECH Department → Dean B
├── IT Department → Dean C
└── AIML Department → Dean D

Each Dean manages only their department!

If you need to add more departments later:
INSERT INTO departments (name, code, description)
VALUES ('New Department Name', 'CODE', 'Description');
*/
