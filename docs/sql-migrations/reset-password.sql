-- RESET PASSWORD - If you forgot the password
-- Run this in Supabase SQL Editor

-- Option 1: Set a new password (Admin123)
-- This uses pgcrypto extension to hash the password
UPDATE auth.users
SET 
  encrypted_password = crypt('Admin123', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'salabadeshwaran@gmail.com';

-- Verify it worked
SELECT email, updated_at 
FROM auth.users 
WHERE email = 'salabadeshwaran@gmail.com';

-- Now you can login with:
-- Email: salabadeshwaran@gmail.com
-- Password: Admin123
