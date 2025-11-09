-- Force fix user roles
-- Run this in Supabase SQL Editor

-- Make sure the users table has the role column with proper constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'staff'));

-- Set a specific user as admin (replace with your email)
-- UPDATE users SET role = 'admin' WHERE email = 'your_admin_email@example.com';

-- View all users and their roles
SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC;

-- Done!
SELECT 'User roles fixed! Update the email above to set your admin.' as message;
