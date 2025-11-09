-- RENAME CLASSES TO NEW FORMAT
-- Changes from "AI - Year 2 Sem 3" to "I YR CSE-A" format
-- Removes semester field dependency

-- First, let's see current classes
-- SELECT name, year, semester FROM classes ORDER BY name;

-- Delete any existing classes with the new naming format to avoid conflicts
DELETE FROM classes WHERE name LIKE '% YR %-%';

-- Update AI (Artificial Intelligence) classes
UPDATE classes SET name = 'I YR AI-A' WHERE name = 'AI - Year 2 Sem 3';
UPDATE classes SET name = 'I YR AI-B' WHERE name = 'AI - Year 2 Sem 4';
UPDATE classes SET name = 'II YR AI-A' WHERE name = 'AI - Year 3 Sem 5';
UPDATE classes SET name = 'II YR AI-B' WHERE name = 'AI - Year 3 Sem 6';
UPDATE classes SET name = 'III YR AI-A' WHERE name = 'AI - Year 4 Sem 7';
UPDATE classes SET name = 'III YR AI-B' WHERE name = 'AI - Year 4 Sem 8';

-- Update CS (Computer Science) classes
UPDATE classes SET name = 'I YR CSE-A' WHERE name = 'CS - Year 2 Sem 3';
UPDATE classes SET name = 'I YR CSE-B' WHERE name = 'CS - Year 2 Sem 4';
UPDATE classes SET name = 'II YR CSE-A' WHERE name = 'CS - Year 3 Sem 5';
UPDATE classes SET name = 'II YR CSE-B' WHERE name = 'CS - Year 3 Sem 6';
UPDATE classes SET name = 'III YR CSE-A' WHERE name = 'CS - Year 4 Sem 7';
UPDATE classes SET name = 'III YR CSE-B' WHERE name = 'CS - Year 4 Sem 8';

-- Update EC (Electronics) classes
UPDATE classes SET name = 'I YR ECE-A' WHERE name = 'EC - Year 2 Sem 3';
UPDATE classes SET name = 'I YR ECE-B' WHERE name = 'EC - Year 2 Sem 4';
UPDATE classes SET name = 'II YR ECE-A' WHERE name = 'EC - Year 3 Sem 5';
UPDATE classes SET name = 'II YR ECE-B' WHERE name = 'EC - Year 3 Sem 6';
UPDATE classes SET name = 'III YR ECE-A' WHERE name = 'EC - Year 4 Sem 7';
UPDATE classes SET name = 'III YR ECE-B' WHERE name = 'EC - Year 4 Sem 8';

-- Update ME (Mechanical) classes
UPDATE classes SET name = 'I YR MECH-A' WHERE name = 'ME - Year 2 Sem 3';
UPDATE classes SET name = 'I YR MECH-B' WHERE name = 'ME - Year 2 Sem 4';
UPDATE classes SET name = 'II YR MECH-A' WHERE name = 'ME - Year 3 Sem 5';
UPDATE classes SET name = 'II YR MECH-B' WHERE name = 'ME - Year 3 Sem 6';
UPDATE classes SET name = 'III YR MECH-A' WHERE name = 'ME - Year 4 Sem 7';
UPDATE classes SET name = 'III YR MECH-B' WHERE name = 'ME - Year 4 Sem 8';

-- Update CIVIL classes
UPDATE classes SET name = 'I YR CIVIL-A' WHERE name = 'CIVIL - Year 2 Sem 3';
UPDATE classes SET name = 'I YR CIVIL-B' WHERE name = 'CIVIL - Year 2 Sem 4';
UPDATE classes SET name = 'II YR CIVIL-A' WHERE name = 'CIVIL - Year 3 Sem 5';
UPDATE classes SET name = 'II YR CIVIL-B' WHERE name = 'CIVIL - Year 3 Sem 6';
UPDATE classes SET name = 'III YR CIVIL-A' WHERE name = 'CIVIL - Year 4 Sem 7';
UPDATE classes SET name = 'III YR CIVIL-B' WHERE name = 'CIVIL - Year 4 Sem 8';

-- Update AIML (AI & ML) classes if they exist
UPDATE classes SET name = 'I YR AIML-A' WHERE name LIKE 'AIML%Year 2 Sem 3';
UPDATE classes SET name = 'I YR AIML-B' WHERE name LIKE 'AIML%Year 2 Sem 4';
UPDATE classes SET name = 'II YR AIML-A' WHERE name LIKE 'AIML%Year 3 Sem 5';
UPDATE classes SET name = 'II YR AIML-B' WHERE name LIKE 'AIML%Year 3 Sem 6';
UPDATE classes SET name = 'III YR AIML-A' WHERE name LIKE 'AIML%Year 4 Sem 7';
UPDATE classes SET name = 'III YR AIML-B' WHERE name LIKE 'AIML%Year 4 Sem 8';

-- Update any Year 1 classes (Sem 1-2) if they exist
UPDATE classes SET name = 'I YR CSE-A' WHERE name = 'CS - Year 1 Sem 1';
UPDATE classes SET name = 'I YR CSE-B' WHERE name = 'CS - Year 1 Sem 2';
UPDATE classes SET name = 'I YR AI-A' WHERE name = 'AI - Year 1 Sem 1';
UPDATE classes SET name = 'I YR AI-B' WHERE name = 'AI - Year 1 Sem 2';
UPDATE classes SET name = 'I YR ECE-A' WHERE name = 'EC - Year 1 Sem 1';
UPDATE classes SET name = 'I YR ECE-B' WHERE name = 'EC - Year 1 Sem 2';
UPDATE classes SET name = 'I YR MECH-A' WHERE name = 'ME - Year 1 Sem 1';
UPDATE classes SET name = 'I YR MECH-B' WHERE name = 'ME - Year 1 Sem 2';
UPDATE classes SET name = 'I YR CIVIL-A' WHERE name = 'CIVIL - Year 1 Sem 1';
UPDATE classes SET name = 'I YR CIVIL-B' WHERE name = 'CIVIL - Year 1 Sem 2';

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
  RAISE NOTICE '✅ Semester field is no longer used in class names';
  RAISE NOTICE '✅ Format: [Year] YR [DEPT]-[Section]';
END $$;
