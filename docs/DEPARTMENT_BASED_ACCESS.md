# Department-Based Multi-Tenancy Solution

## Problem Statement

In a college:
- Multiple departments exist (CSE, MECH, ECE, etc.)
- Each department has a Dean (admin role)
- Each department has Staff members
- Currently, admins are isolated but not linked to departments
- Need to ensure Deans only manage their own department

## Current vs Proposed Structure

### Current (Problematic):
```
Admin A → Creates classes (but which department?)
Admin B → Creates classes (but which department?)
Staff → Sees all classes (from all departments!)
```

### Proposed (Correct):
```
Dean of CSE → Manages only CSE department
  ├── Creates CSE classes
  ├── Adds CSE students
  └── Generates CSE reports

Dean of MECH → Manages only MECH department
  ├── Creates MECH classes
  ├── Adds MECH students
  └── Generates MECH reports

Staff in CSE → Sees only CSE classes
Staff in MECH → Sees only MECH classes
```

## Database Changes Required

### 1. Add `department_id` to `users` table

```sql
-- Add department_id column to users table
ALTER TABLE users 
ADD COLUMN department_id UUID REFERENCES departments(id);

-- Add index for performance
CREATE INDEX idx_users_department_id ON users(department_id);
```

### 2. Update Signup Flow

When a user signs up:
1. Select role (Admin/Staff)
2. **Select department** (from existing departments)
3. User is linked to that department

### 3. Update Data Access Logic

**For Admin (Dean):**
- Can only create/view/edit data in THEIR department
- Filter: `created_by = current_user_id AND department_id = user.department_id`

**For Staff:**
- Can only see classes/students in THEIR department
- Filter: `department_id = user.department_id`

## Implementation Steps

### Step 1: Database Migration

```sql
-- DEPARTMENT_BASED_MIGRATION.sql

-- 1. Add department_id to users table
ALTER TABLE users 
ADD COLUMN department_id UUID REFERENCES departments(id);

-- 2. Create index
CREATE INDEX idx_users_department_id ON users(department_id);

-- 3. Update existing users (manual assignment needed)
-- First, check existing departments:
SELECT id, name, code FROM departments;

-- Then assign users to departments:
-- Example: Assign salabtradebot@gmail.com to CSE department
UPDATE users 
SET department_id = 'DEPARTMENT_ID_HERE' 
WHERE email = 'salabtradebot@gmail.com';

-- Example: Assign RAJARAJAN to MECH department
UPDATE users 
SET department_id = 'DEPARTMENT_ID_HERE' 
WHERE email = 'rajarajan@example.com';

-- 4. Make department_id NOT NULL after assignment (optional)
-- ALTER TABLE users ALTER COLUMN department_id SET NOT NULL;
```

### Step 2: Update Signup Component

```javascript
// src/pages/Signup.jsx

const [formData, setFormData] = useState({
  email: '',
  password: '',
  name: '',
  role: 'staff',
  departmentId: '' // NEW FIELD
})

// Fetch departments for dropdown
const [departments, setDepartments] = useState([])

useEffect(() => {
  const fetchDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('id, name, code')
      .order('name')
    setDepartments(data || [])
  }
  fetchDepartments()
}, [])

// In signup form:
<select 
  value={formData.departmentId}
  onChange={(e) => setFormData({...formData, departmentId: e.target.value})}
  required
>
  <option value="">Select Department</option>
  {departments.map(dept => (
    <option key={dept.id} value={dept.id}>
      {dept.name} ({dept.code})
    </option>
  ))}
</select>

// Update signup call:
const { data: authData, error: signUpError } = await supabase.auth.signUp({
  email: formData.email,
  password: formData.password,
  options: {
    emailRedirectTo: redirectUrl,
    data: {
      name: formData.name,
      role: formData.role,
      department_id: formData.departmentId // NEW
    }
  }
})

// Update user profile:
await supabase
  .from('users')
  .update({ 
    role: formData.role, 
    name: formData.name,
    department_id: formData.departmentId // NEW
  })
  .eq('email', formData.email)
```

### Step 3: Update Data Hooks

#### useClasses.js
```javascript
const fetchClasses = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get user profile with department
  const { data: profile } = await supabase
    .from('users')
    .select('role, department_id')
    .eq('id', user?.id)
    .single()
  
  let query = supabase
    .from('classes')
    .select(`
      *,
      departments (id, name, code),
      users (id, name, email)
    `)
  
  if (profile?.role === 'admin') {
    // Dean sees only their department's classes
    query = query
      .eq('department_id', profile.department_id)
      .or(`created_by.eq.${user?.id},created_by.is.null`)
  } else if (profile?.role === 'staff') {
    // Staff sees only their department's classes
    query = query.eq('department_id', profile.department_id)
  }
  
  const { data, error } = await query.order('name', { ascending: true })
  // ...
}
```

#### useStudents.js
```javascript
const fetchStudents = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: profile } = await supabase
    .from('users')
    .select('role, department_id')
    .eq('id', user?.id)
    .single()
  
  let query = supabase
    .from('students')
    .select(`
      *,
      departments (id, name, code),
      classes (id, name)
    `)
  
  if (profile?.role === 'admin') {
    // Dean sees only their department's students
    query = query
      .eq('department_id', profile.department_id)
      .or(`created_by.eq.${user?.id},created_by.is.null`)
  } else if (profile?.role === 'staff') {
    // Staff sees only their department's students
    query = query.eq('department_id', profile.department_id)
  }
  
  const { data, error } = await query.order('name', { ascending: true })
  // ...
}
```

### Step 4: Update Admin Dashboard

Show department info in header:

```javascript
// AdminDashboardNew.jsx

<div className="flex items-center gap-4">
  <div>
    <h1>Welcome back, {userProfile?.name}</h1>
    <p className="text-sm text-gray-400">
      Dean, {userProfile?.departments?.name} Department
    </p>
  </div>
</div>
```

### Step 5: Update RLS Policies

```sql
-- Update RLS policies to include department_id check

-- Classes policy for admin
DROP POLICY IF EXISTS "Admins can view their own classes" ON classes;
CREATE POLICY "Admins can view their department classes" ON classes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.department_id = classes.department_id
    )
  );

-- Classes policy for staff
DROP POLICY IF EXISTS "Staff can view all classes" ON classes;
CREATE POLICY "Staff can view their department classes" ON classes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'staff'
      AND users.department_id = classes.department_id
    )
  );

-- Similar updates for students, sessions, etc.
```

## Benefits of This Approach

### 1. Clear Department Boundaries
- ✅ Dean of CSE cannot see MECH data
- ✅ Staff in CSE cannot see MECH classes
- ✅ Each department is completely isolated

### 2. Proper Role Hierarchy
```
College
├── CSE Department
│   ├── Dean (Admin)
│   ├── Staff 1
│   ├── Staff 2
│   └── Students
├── MECH Department
│   ├── Dean (Admin)
│   ├── Staff 1
│   └── Students
└── ECE Department
    ├── Dean (Admin)
    └── Staff 1
```

### 3. Accurate Reporting
- Dean generates reports for THEIR department only
- Staff marks attendance for THEIR department only
- No cross-department data leakage

### 4. Scalability
- Add new departments easily
- Add new Deans/Staff to departments
- Each department operates independently

## Alternative: Super Admin Role (Optional)

If you need someone to manage ALL departments:

```sql
-- Add super_admin role
ALTER TABLE users 
ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;

-- Super admin can see all departments
UPDATE users 
SET is_super_admin = TRUE 
WHERE email = 'principal@college.edu';
```

Then in hooks:
```javascript
if (profile?.is_super_admin) {
  // No department filter - see everything
  query = query // no filter
} else if (profile?.role === 'admin') {
  // Department filter
  query = query.eq('department_id', profile.department_id)
}
```

## Migration Checklist

- [ ] Run database migration to add `department_id` to users
- [ ] Assign existing users to departments
- [ ] Update Signup component with department dropdown
- [ ] Update all data hooks (useClasses, useStudents, etc.)
- [ ] Update RLS policies
- [ ] Update dashboards to show department info
- [ ] Test with multiple departments
- [ ] Test Dean isolation
- [ ] Test Staff isolation
- [ ] Document department assignment process

## Testing Scenarios

### Test 1: Dean Isolation
1. Create Dean A for CSE department
2. Create Dean B for MECH department
3. Dean A creates CSE classes
4. Dean B creates MECH classes
5. Verify Dean A cannot see MECH classes
6. Verify Dean B cannot see CSE classes

### Test 2: Staff Access
1. Create Staff in CSE department
2. Create Staff in MECH department
3. Verify CSE staff sees only CSE classes
4. Verify MECH staff sees only MECH classes

### Test 3: Reports
1. Dean A generates report
2. Verify report contains only CSE data
3. Dean B generates report
4. Verify report contains only MECH data

## Summary

**Current Problem:**
- Multiple admins (Deans) but no department linkage
- Staff sees all classes from all departments
- No clear department boundaries

**Solution:**
- Add `department_id` to users table
- Link each user to their department
- Filter all data by department
- Dean manages only their department
- Staff sees only their department

**Result:**
- ✅ Clear department isolation
- ✅ Proper role hierarchy
- ✅ Accurate reporting
- ✅ Scalable multi-department system
