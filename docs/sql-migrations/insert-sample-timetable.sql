-- INSERT SAMPLE TIMETABLE DATA
-- Based on CSE B class timetable from the image

-- First, get the class ID for CSE B (or create sample classes)
DO $$
DECLARE
  cs_dept_id UUID;
  cse_b_class_id UUID;
BEGIN
  -- Get Computer Science department
  SELECT id INTO cs_dept_id FROM departments WHERE code = 'CS' LIMIT 1;
  
  IF cs_dept_id IS NULL THEN
    RAISE NOTICE 'Please create CS department first';
    RETURN;
  END IF;
  
  -- Create I YR CSE-B class if it doesn''t exist
  INSERT INTO classes (name, department_id)
  VALUES ('I YR CSE-B', cs_dept_id)
  ON CONFLICT (name) DO NOTHING
  RETURNING id INTO cse_b_class_id;
  
  -- If class already exists, get its ID
  IF cse_b_class_id IS NULL THEN
    SELECT id INTO cse_b_class_id FROM classes WHERE name = 'I YR CSE-B' LIMIT 1;
  END IF;
  
  -- Insert Monday timetable
  INSERT INTO timetable (class_id, day_of_week, period_number, subject_code, subject_name, faculty_name, faculty_code) VALUES
    (cse_b_class_id, 1, 1, 'CA(302)', 'Computer Architecture', 'Mrs.I.Roshini', 'IR'),
    (cse_b_class_id, 1, 2, 'DS(302)', 'Data Structures', 'Mr.Shivasankaran', 'SSS'),
    (cse_b_class_id, 1, 3, 'OOP(303)', 'Object Oriented Programming', 'Ms.M.Benitta Mary', 'MBM'),
    (cse_b_class_id, 1, 5, 'DPSD(302)', 'Digital Principles and System Design', 'Ms.Sree Arthi D', 'DSA')
  ON CONFLICT (class_id, day_of_week, period_number) DO NOTHING;
  
  -- Insert Tuesday timetable
  INSERT INTO timetable (class_id, day_of_week, period_number, subject_code, subject_name, faculty_name, faculty_code) VALUES
    (cse_b_class_id, 2, 1, 'ESS(303)', 'Environmental Science and Sustainability', 'Dr.M.Kumaran', 'MK'),
    (cse_b_class_id, 2, 2, 'CA(303)', 'Computer Architecture', 'Mrs.I.Roshini', 'IR'),
    (cse_b_class_id, 2, 3, 'CA(302)', 'Computer Architecture', 'Mrs.I.Roshini', 'IR'),
    (cse_b_class_id, 2, 4, 'DM(302)', 'Discrete Mathematics', 'Mrs.R.TamilSelvi', 'RT'),
    (cse_b_class_id, 2, 5, 'OOPL/MP', 'OOP Lab / Mini Project', 'MBM/IR', 'MBM/IR')
  ON CONFLICT (class_id, day_of_week, period_number) DO NOTHING;
  
  -- Insert Wednesday timetable
  INSERT INTO timetable (class_id, day_of_week, period_number, subject_code, subject_name, faculty_name, faculty_code) VALUES
    (cse_b_class_id, 3, 1, 'DS(302)', 'Data Structures', 'Mr.Shivasankaran', 'SSS'),
    (cse_b_class_id, 3, 3, 'DM(301)', 'Discrete Mathematics', 'Mrs.R.TamilSelvi', 'RT'),
    (cse_b_class_id, 3, 5, 'ESS(301)', 'Environmental Science and Sustainability', 'Dr.M.Kumaran', 'MK'),
    (cse_b_class_id, 3, 6, 'DPSD(301)', 'Digital Principles and System Design', 'Ms.Sree Arthi D', 'DSA')
  ON CONFLICT (class_id, day_of_week, period_number) DO NOTHING;
  
  -- Insert Thursday timetable
  INSERT INTO timetable (class_id, day_of_week, period_number, subject_code, subject_name, faculty_name, faculty_code) VALUES
    (cse_b_class_id, 4, 1, 'PLACEMENT(302)', 'Placement Hour', 'Faculty', ''),
    (cse_b_class_id, 4, 3, 'DS(301)', 'Data Structures', 'Mr.Shivasankaran', 'SSS'),
    (cse_b_class_id, 4, 4, 'ESS(301)', 'Environmental Science and Sustainability', 'Dr.M.Kumaran', 'MK'),
    (cse_b_class_id, 4, 5, 'DM(301)', 'Discrete Mathematics', 'Mrs.R.TamilSelvi', 'RT')
  ON CONFLICT (class_id, day_of_week, period_number) DO NOTHING;
  
  -- Insert Friday timetable
  INSERT INTO timetable (class_id, day_of_week, period_number, subject_code, subject_name, faculty_name, faculty_code) VALUES
    (cse_b_class_id, 5, 1, 'OOP(CC2)', 'Object Oriented Programming', 'Ms.M.Benitta Mary', 'MBM'),
    (cse_b_class_id, 5, 3, 'DPSDL/DSL', 'DPSD Lab / DS Lab', 'DSA/SSS', 'DSA/SSS'),
    (cse_b_class_id, 5, 5, 'DM(302)', 'Discrete Mathematics', 'Mrs.R.TamilSelvi', 'RT'),
    (cse_b_class_id, 5, 6, 'CA(302)', 'Computer Architecture', 'Mrs.I.Roshini', 'IR')
  ON CONFLICT (class_id, day_of_week, period_number) DO NOTHING;
  
  -- Update lab sessions
  UPDATE timetable SET is_lab = TRUE 
  WHERE class_id = cse_b_class_id 
    AND subject_code IN ('DPSDL/DSL', 'OOPL/MP', 'DSL/DPSDL');
  
  -- Insert Saturday timetable
  INSERT INTO timetable (class_id, day_of_week, period_number, subject_code, subject_name, faculty_name, faculty_code) VALUES
    (cse_b_class_id, 6, 1, 'OOPL/MP', 'OOP Lab / Mini Project', 'MBM/IR', 'MBM/IR'),
    (cse_b_class_id, 6, 3, 'DSL/DPSDL', 'DS Lab / DPSD Lab', 'SSS/DSA', 'SSS/DSA'),
    (cse_b_class_id, 6, 5, 'MC(S4)', 'Mandatory Course', 'Mr.R.Naresh', 'RN'),
    (cse_b_class_id, 6, 6, 'DPSD(304)', 'Digital Principles and System Design', 'Ms.Sree Arthi D', 'DSA')
  ON CONFLICT (class_id, day_of_week, period_number) DO NOTHING;
  
  RAISE NOTICE '✅ Sample timetable inserted for I YR CSE-B class';
  RAISE NOTICE '✅ Timetable includes all 6 days (Monday to Saturday)';
  RAISE NOTICE '✅ Total periods configured with subject codes and faculty names';
END $$;

-- Verify inserted data
SELECT 
  CASE day_of_week
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END as day,
  period_number,
  subject_code,
  subject_name,
  faculty_name,
  is_lab
FROM timetable t
JOIN classes c ON c.id = t.class_id
WHERE c.name = 'I YR CSE-B'
ORDER BY day_of_week, period_number;
