# 🔧 Fix Signup Error - Run This Now!

## ⚠️ The "Failed to fetch" error is caused by database permissions

---

## ✅ SOLUTION: Run This SQL

### **Go to Supabase SQL Editor and run this:**

```sql
-- Update trigger function to use role from metadata
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'staff');
  
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'name', ''), 
    user_role
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
```

---

## 🚀 After Running SQL:

1. **Refresh your app** (Cmd+Shift+R or Ctrl+Shift+R)
2. **Go to signup**: http://localhost:3000/signup
3. **Fill the form**:
   - Name: `salabadee`
   - Email: `salabadeshwaran@gmail.com`
   - Role: Administrator
   - Password: (your choice)
4. **Click "Create Account"**
5. **Should work now!**

---

## 🎯 What This Does:

1. **Updates the trigger** to automatically set the role you choose during signup
2. **Fixes RLS policies** to allow user profile creation
3. **Enables signup** to work properly

---

## ✅ Expected Result:

After running the SQL:
- ✅ Signup form works
- ✅ Role is automatically set (admin or staff)
- ✅ No more "Failed to fetch" error
- ✅ Can login immediately after signup

---

## 📝 Quick Steps:

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy the SQL above
4. Click "Run"
5. Refresh your app
6. Try signup again

---

**This will fix the signup error!** 🎓✨
