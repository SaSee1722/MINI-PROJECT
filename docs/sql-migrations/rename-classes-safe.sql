-- SAFE CLASS RENAMING SCRIPT
-- This script checks for existing classes and only updates old format names

-- Step 1: Check what classes currently exist
SELECT name, year, semester FROM classes ORDER BY name;

-- Step 2: Only update classes that have the old naming format
-- This prevents duplicate key errors

-- Update AI (Artificial Intelligence) classes
UPDATE classes SET name = 'I YR AI-A' WHERE name = 'AI - Year 2 Sem 3' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'I YR AI-A');
UPDATE classes SET name = 'I YR AI-B' WHERE name = 'AI - Year 2 Sem 4' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'I YR AI-B');
UPDATE classes SET name = 'II YR AI-A' WHERE name = 'AI - Year 3 Sem 5' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'II YR AI-A');
UPDATE classes SET name = 'II YR AI-B' WHERE name = 'AI - Year 3 Sem 6' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'II YR AI-B');
UPDATE classes SET name = 'III YR AI-A' WHERE name = 'AI - Year 4 Sem 7' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'III YR AI-A');
UPDATE classes SET name = 'III YR AI-B' WHERE name = 'AI - Year 4 Sem 8' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'III YR AI-B');

-- Update CS (Computer Science) classes
UPDATE classes SET name = 'I YR CSE-A' WHERE name = 'CS - Year 2 Sem 3' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'I YR CSE-A');
UPDATE classes SET name = 'I YR CSE-B' WHERE name = 'CS - Year 2 Sem 4' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'I YR CSE-B');
UPDATE classes SET name = 'II YR CSE-A' WHERE name = 'CS - Year 3 Sem 5' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'II YR CSE-A');
UPDATE classes SET name = 'II YR CSE-B' WHERE name = 'CS - Year 3 Sem 6' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'II YR CSE-B');
UPDATE classes SET name = 'III YR CSE-A' WHERE name = 'CS - Year 4 Sem 7' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'III YR CSE-A');
UPDATE classes SET name = 'III YR CSE-B' WHERE name = 'CS - Year 4 Sem 8' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'III YR CSE-B');

-- Update EC (Electronics) classes
UPDATE classes SET name = 'I YR ECE-A' WHERE name = 'EC - Year 2 Sem 3' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'I YR ECE-A');
UPDATE classes SET name = 'I YR ECE-B' WHERE name = 'EC - Year 2 Sem 4' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'I YR ECE-B');
UPDATE classes SET name = 'II YR ECE-A' WHERE name = 'EC - Year 3 Sem 5' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'II YR ECE-A');
UPDATE classes SET name = 'II YR ECE-B' WHERE name = 'EC - Year 3 Sem 6' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'II YR ECE-B');
UPDATE classes SET name = 'III YR ECE-A' WHERE name = 'EC - Year 4 Sem 7' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'III YR ECE-A');
UPDATE classes SET name = 'III YR ECE-B' WHERE name = 'EC - Year 4 Sem 8' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'III YR ECE-B');

-- Update ME (Mechanical) classes
UPDATE classes SET name = 'I YR MECH-A' WHERE name = 'ME - Year 2 Sem 3' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'I YR MECH-A');
UPDATE classes SET name = 'I YR MECH-B' WHERE name = 'ME - Year 2 Sem 4' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'I YR MECH-B');
UPDATE classes SET name = 'II YR MECH-A' WHERE name = 'ME - Year 3 Sem 5' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'II YR MECH-A');
UPDATE classes SET name = 'II YR MECH-B' WHERE name = 'ME - Year 3 Sem 6' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'II YR MECH-B');
UPDATE classes SET name = 'III YR MECH-A' WHERE name = 'ME - Year 4 Sem 7' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'III YR MECH-A');
UPDATE classes SET name = 'III YR MECH-B' WHERE name = 'ME - Year 4 Sem 8' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'III YR MECH-B');

-- Update CIVIL classes
UPDATE classes SET name = 'I YR CIVIL-A' WHERE name = 'CIVIL - Year 2 Sem 3' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'I YR CIVIL-A');
UPDATE classes SET name = 'I YR CIVIL-B' WHERE name = 'CIVIL - Year 2 Sem 4' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'I YR CIVIL-B');
UPDATE classes SET name = 'II YR CIVIL-A' WHERE name = 'CIVIL - Year 3 Sem 5' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'II YR CIVIL-A');
UPDATE classes SET name = 'II YR CIVIL-B' WHERE name = 'CIVIL - Year 3 Sem 6' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'II YR CIVIL-B');
UPDATE classes SET name = 'III YR CIVIL-A' WHERE name = 'CIVIL - Year 4 Sem 7' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'III YR CIVIL-A');
UPDATE classes SET name = 'III YR CIVIL-B' WHERE name = 'CIVIL - Year 4 Sem 8' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'III YR CIVIL-B');

-- Update AIML (AI & ML) classes if they exist
UPDATE classes SET name = 'I YR AIML-A' WHERE name LIKE 'AIML%Year 2 Sem 3' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'I YR AIML-A');
UPDATE classes SET name = 'I YR AIML-B' WHERE name LIKE 'AIML%Year 2 Sem 4' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'I YR AIML-B');
UPDATE classes SET name = 'II YR AIML-A' WHERE name LIKE 'AIML%Year 3 Sem 5' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'II YR AIML-A');
UPDATE classes SET name = 'II YR AIML-B' WHERE name LIKE 'AIML%Year 3 Sem 6' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'II YR AIML-B');
UPDATE classes SET name = 'III YR AIML-A' WHERE name LIKE 'AIML%Year 4 Sem 7' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'III YR AIML-A');
UPDATE classes SET name = 'III YR AIML-B' WHERE name LIKE 'AIML%Year 4 Sem 8' AND NOT EXISTS (SELECT 1 FROM classes WHERE name = 'III YR AIML-B');

-- Verify the changes
SELECT 
  c.name as class_name,
  d.name as department,
  c.year,
  c.semester
FROM classes c
LEFT JOIN departments d ON d.id = c.department_id
ORDER BY c.name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Classes renamed to new format (I YR CSE-A, II YR AIML-B, etc.)';
  RAISE NOTICE '✅ Duplicate classes were skipped to avoid conflicts';
END $$;
