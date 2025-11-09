-- Update existing class names to new format (I YR CSE-A, II YR AIML-B, etc.)
-- This removes the semester field and changes to year-based naming

-- First, let's see what classes exist
-- SELECT * FROM classes ORDER BY name;

-- Update class names to new format
-- You'll need to run these updates based on your actual class data
-- Replace the old names with the new format

-- Example updates (modify according to your actual data):
-- UPDATE classes SET name = 'I YR CSE-A' WHERE name = 'AI - Year 2 Sem 3';
-- UPDATE classes SET name = 'I YR CSE-B' WHERE name = 'AI - Year 2 Sem 4';
-- UPDATE classes SET name = 'II YR CSE-A' WHERE name = 'AI - Year 3 Sem 5';
-- UPDATE classes SET name = 'II YR CSE-B' WHERE name = 'AI - Year 3 Sem 6';
-- UPDATE classes SET name = 'III YR CSE-A' WHERE name = 'AI - Year 4 Sem 7';
-- UPDATE classes SET name = 'III YR CSE-B' WHERE name = 'AI - Year 4 Sem 8';

-- For AIML department:
-- UPDATE classes SET name = 'I YR AIML-A' WHERE name = 'AIML - Year 2 Sem 3';
-- UPDATE classes SET name = 'I YR AIML-B' WHERE name = 'AIML - Year 2 Sem 4';

-- Note: The format is:
-- I YR = First Year (Year 2, Sem 3-4)
-- II YR = Second Year (Year 3, Sem 5-6)
-- III YR = Third Year (Year 4, Sem 7-8)
-- IV YR = Fourth Year (if applicable)

-- After updating, verify:
-- SELECT * FROM classes ORDER BY name;
