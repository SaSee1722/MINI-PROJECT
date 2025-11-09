-- FIX DUPLICATE CLASSES
-- This script removes duplicate classes and keeps only the old format ones
-- Then renames them to the new format

-- Step 1: Check current classes
SELECT name FROM classes ORDER BY name;

-- Step 2: Delete classes with new format (if they exist but are duplicates)
-- WARNING: This will delete any data associated with these classes
-- Only run this if you're sure these are duplicates without important data

DELETE FROM classes WHERE name IN (
  'I YR AI-A', 'I YR AI-B', 'II YR AI-A', 'II YR AI-B', 'III YR AI-A', 'III YR AI-B',
  'I YR CSE-A', 'I YR CSE-B', 'II YR CSE-A', 'II YR CSE-B', 'III YR CSE-A', 'III YR CSE-B',
  'I YR ECE-A', 'I YR ECE-B', 'II YR ECE-A', 'II YR ECE-B', 'III YR ECE-A', 'III YR ECE-B',
  'I YR MECH-A', 'I YR MECH-B', 'II YR MECH-A', 'II YR MECH-B', 'III YR MECH-A', 'III YR MECH-B',
  'I YR CIVIL-A', 'I YR CIVIL-B', 'II YR CIVIL-A', 'II YR CIVIL-B', 'III YR CIVIL-A', 'III YR CIVIL-B',
  'I YR AIML-A', 'I YR AIML-B', 'II YR AIML-A', 'II YR AIML-B', 'III YR AIML-A', 'III YR AIML-B'
);

-- Step 3: Now run the rename script
-- Copy and paste the UPDATE statements from rename-classes-to-new-format.sql here
-- Or run that script after running this one

SELECT 'Duplicate classes deleted. Now run rename-classes-to-new-format.sql' as message;
