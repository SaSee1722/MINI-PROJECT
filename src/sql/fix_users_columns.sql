-- Add advisor_class_id and is_class_advisor columns to users table if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_class_advisor BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS advisor_class_id uuid REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_hod BOOLEAN DEFAULT false;

-- Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
