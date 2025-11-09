-- Migration to add status column to students table
-- Run this in Supabase SQL Editor

-- Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'students' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.students 
    ADD COLUMN status TEXT CHECK (status IN ('active', 'intern', 'suspended')) DEFAULT 'active';
    
    -- Update existing students to have 'active' status
    UPDATE public.students SET status = 'active' WHERE status IS NULL;
    
    RAISE NOTICE 'Status column added successfully';
  ELSE
    RAISE NOTICE 'Status column already exists';
  END IF;
END $$;

-- Create index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_students_status ON public.students(status);

SELECT 'Migration completed successfully!' as message;
