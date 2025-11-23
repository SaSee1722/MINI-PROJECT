-- ============================================
-- ADD last_seen COLUMN FOR ONLINE STATUS TRACKING
-- ============================================
-- This script adds the last_seen column to the users table
-- Run this in Supabase SQL Editor

-- Step 1: Check if last_seen column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'last_seen';

-- Step 2: Add last_seen column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);

-- Step 4: Set initial value for existing users (optional - set to current time)
UPDATE users
SET last_seen = NOW()
WHERE last_seen IS NULL;

-- Step 5: Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'last_seen';

-- ============================================
-- NOTES
-- ============================================
/*
This column is used to track when users were last active.
Users are considered "online" if their last_seen timestamp is within the last 5 minutes.

The application will automatically update this column every 30 seconds for the current user.
*/

