-- Add is_pc column to users table
ALTER TABLE users
ADD COLUMN is_pc BOOLEAN DEFAULT FALSE;

-- Create index for better performance
CREATE INDEX idx_users_is_pc ON users(is_pc);

-- Update schema cache (Supabase will auto-update)
