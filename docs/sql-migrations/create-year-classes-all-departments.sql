-- CREATE YEAR-BASED CLASSES FOR ALL DEPARTMENTS
-- This creates classes for each year/semester in all departments

-- Step 1: Create classes for Computer Science (CS)
DO $$
DECLARE
  dept_id UUID;
BEGIN
  SELECT id INTO dept_id FROM departments WHERE code = 'CS';
  
  IF dept_id IS NOT NULL THEN
    INSERT INTO classes (name, department_id, year, semester, academic_year) VALUES
      ('CS - Year 1 Sem 1', dept_id, 1, 1, '2024-2025'),
      ('CS - Year 1 Sem 2', dept_id, 1, 2, '2024-2025'),
      ('CS - Year 2 Sem 3', dept_id, 2, 3, '2024-2025'),
      ('CS - Year 2 Sem 4', dept_id, 2, 4, '2024-2025'),
      ('CS - Year 3 Sem 5', dept_id, 3, 5, '2024-2025'),
      ('CS - Year 3 Sem 6', dept_id, 3, 6, '2024-2025'),
      ('CS - Year 4 Sem 7', dept_id, 4, 7, '2024-2025'),
      ('CS - Year 4 Sem 8', dept_id, 4, 8, '2024-2025')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Created classes for Computer Science (CS)';
  END IF;
END $$;

-- Step 2: Create classes for Electronics (EC)
DO $$
DECLARE
  dept_id UUID;
BEGIN
  SELECT id INTO dept_id FROM departments WHERE code = 'EC';
  
  IF dept_id IS NOT NULL THEN
    INSERT INTO classes (name, department_id, year, semester, academic_year) VALUES
      ('EC - Year 1 Sem 1', dept_id, 1, 1, '2024-2025'),
      ('EC - Year 1 Sem 2', dept_id, 1, 2, '2024-2025'),
      ('EC - Year 2 Sem 3', dept_id, 2, 3, '2024-2025'),
      ('EC - Year 2 Sem 4', dept_id, 2, 4, '2024-2025'),
      ('EC - Year 3 Sem 5', dept_id, 3, 5, '2024-2025'),
      ('EC - Year 3 Sem 6', dept_id, 3, 6, '2024-2025'),
      ('EC - Year 4 Sem 7', dept_id, 4, 7, '2024-2025'),
      ('EC - Year 4 Sem 8', dept_id, 4, 8, '2024-2025')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Created classes for Electronics (EC)';
  END IF;
END $$;

-- Step 3: Create classes for Mechanical (ME)
DO $$
DECLARE
  dept_id UUID;
BEGIN
  SELECT id INTO dept_id FROM departments WHERE code = 'ME';
  
  IF dept_id IS NOT NULL THEN
    INSERT INTO classes (name, department_id, year, semester, academic_year) VALUES
      ('ME - Year 1 Sem 1', dept_id, 1, 1, '2024-2025'),
      ('ME - Year 1 Sem 2', dept_id, 1, 2, '2024-2025'),
      ('ME - Year 2 Sem 3', dept_id, 2, 3, '2024-2025'),
      ('ME - Year 2 Sem 4', dept_id, 2, 4, '2024-2025'),
      ('ME - Year 3 Sem 5', dept_id, 3, 5, '2024-2025'),
      ('ME - Year 3 Sem 6', dept_id, 3, 6, '2024-2025'),
      ('ME - Year 4 Sem 7', dept_id, 4, 7, '2024-2025'),
      ('ME - Year 4 Sem 8', dept_id, 4, 8, '2024-2025')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Created classes for Mechanical (ME)';
  END IF;
END $$;

-- Step 4: Create classes for Civil Engineering (CIVIL)
DO $$
DECLARE
  dept_id UUID;
BEGIN
  SELECT id INTO dept_id FROM departments WHERE code = 'CIVIL';
  
  IF dept_id IS NOT NULL THEN
    INSERT INTO classes (name, department_id, year, semester, academic_year) VALUES
      ('CIVIL - Year 1 Sem 1', dept_id, 1, 1, '2024-2025'),
      ('CIVIL - Year 1 Sem 2', dept_id, 1, 2, '2024-2025'),
      ('CIVIL - Year 2 Sem 3', dept_id, 2, 3, '2024-2025'),
      ('CIVIL - Year 2 Sem 4', dept_id, 2, 4, '2024-2025'),
      ('CIVIL - Year 3 Sem 5', dept_id, 3, 5, '2024-2025'),
      ('CIVIL - Year 3 Sem 6', dept_id, 3, 6, '2024-2025'),
      ('CIVIL - Year 4 Sem 7', dept_id, 4, 7, '2024-2025'),
      ('CIVIL - Year 4 Sem 8', dept_id, 4, 8, '2024-2025')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Created classes for Civil Engineering (CIVIL)';
  END IF;
END $$;

-- Step 5: Create classes for AIDS (AI)
DO $$
DECLARE
  dept_id UUID;
BEGIN
  SELECT id INTO dept_id FROM departments WHERE code = 'AI';
  
  IF dept_id IS NOT NULL THEN
    INSERT INTO classes (name, department_id, year, semester, academic_year) VALUES
      ('AI - Year 1 Sem 1', dept_id, 1, 1, '2024-2025'),
      ('AI - Year 1 Sem 2', dept_id, 1, 2, '2024-2025'),
      ('AI - Year 2 Sem 3', dept_id, 2, 3, '2024-2025'),
      ('AI - Year 2 Sem 4', dept_id, 2, 4, '2024-2025'),
      ('AI - Year 3 Sem 5', dept_id, 3, 5, '2024-2025'),
      ('AI - Year 3 Sem 6', dept_id, 3, 6, '2024-2025'),
      ('AI - Year 4 Sem 7', dept_id, 4, 7, '2024-2025'),
      ('AI - Year 4 Sem 8', dept_id, 4, 8, '2024-2025')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Created classes for AIDS (AI)';
  END IF;
END $$;

-- Verify all created classes
SELECT 
  d.code as dept_code,
  d.name as department,
  c.name as class_name,
  c.year,
  c.semester,
  c.academic_year
FROM classes c
JOIN departments d ON d.id = c.department_id
WHERE c.year IS NOT NULL
ORDER BY d.code, c.year, c.semester;

-- Summary
DO $$
DECLARE
  total_classes INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_classes FROM classes WHERE year IS NOT NULL;
  RAISE NOTICE '✅ Total year-based classes created: %', total_classes;
  RAISE NOTICE '✅ Classes are organized by: Department → Year → Semester';
END $$;
