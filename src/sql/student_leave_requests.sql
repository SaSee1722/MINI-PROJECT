-- 1. Create the student_leave_requests table
CREATE TABLE IF NOT EXISTS student_leave_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name text NOT NULL,
  register_number text NOT NULL,
  department_id text NOT NULL,
  section text NOT NULL,
  attendance_percentage numeric,
  reason text,
  letter_url text,
  status text DEFAULT 'pending_hod', -- pending_hod, pending_admin, approved, rejected
  staff_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create the 'documents' storage bucket
-- Note: This requires the storage schema to be enabled.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- 3. Set up Storage Policies

-- Allow public read access to documents
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'documents' );

-- Allow authenticated users (staff) to upload files
create policy "Authenticated users can upload"
  on storage.objects for insert
  with check ( bucket_id = 'documents' and auth.role() = 'authenticated' );

-- 4. Set up Table Policies for student_leave_requests

-- Enable RLS
ALTER TABLE student_leave_requests ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own requests
CREATE POLICY "Enable insert for authenticated users" ON student_leave_requests
    FOR INSERT WITH CHECK (auth.uid() = staff_id);

-- Allow users to view their own requests
CREATE POLICY "Enable select for users based on staff_id" ON student_leave_requests
    FOR SELECT USING (auth.uid() = staff_id);

-- Allow HODs and Admins to view all requests (simplified policy, assuming application logic handles filtering or broader access)
-- Ideally this would check a user_roles table, but for now we'll allow authenticated users to select all to ensure HODs can see them
CREATE POLICY "Enable select for all authenticated users" ON student_leave_requests
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow HODs and Admins to update (simplified)
CREATE POLICY "Enable update for all authenticated users" ON student_leave_requests
    FOR UPDATE USING (auth.role() = 'authenticated');
