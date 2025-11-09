-- Add status field to students table for tracking suspended and intern students

BEGIN;

-- Add status column to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'suspended', 'intern'));

-- Add comment
COMMENT ON COLUMN students.status IS 'Student status: active, suspended, or intern';

-- Update existing students to active status
UPDATE students SET status = 'active' WHERE status IS NULL;

COMMIT;

-- Verify the change
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'students' 
  AND column_name = 'status';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Student status field added successfully';
  RAISE NOTICE '✅ Possible values: active, suspended, intern';
  RAISE NOTICE '✅ Default value: active';
END $$;
