const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqyuzavylleqqavqykvc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxeXV6YXZ5bGxlcXFhdnF5a3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODYzMjAsImV4cCI6MjA3Nzc2MjMyMH0.YISR-q4WEdrJVel51dhe0wuxZIH6CDVl-QjQ4A1wZ6c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFullData() {
  console.log('=== CHECKING CLASSES ===');
  const { data: classes, error: classError } = await supabase.from('classes').select('*');
  if (classError) {
    console.error('Error fetching classes:', classError);
  } else {
    console.log(`Total classes: ${classes?.length || 0}`);
    classes?.forEach(c => {
      console.log(`  - ${c.name} | stream_id: [${c.stream_id}] | id: ${c.id}`);
    });
  }

  console.log('\n=== CHECKING STUDENTS ===');
  const { data: students, error: studentError } = await supabase.from('students').select('id, name, class_id, stream_id');
  if (studentError) {
    console.error('Error fetching students:', studentError);
  } else {
    console.log(`Total students: ${students?.length || 0}`);
    if (students && students.length > 0) {
      console.log('Sample students:');
      students.slice(0, 5).forEach(s => {
        console.log(`  - ${s.name} | class_id: ${s.class_id} | stream_id: [${s.stream_id}]`);
      });
    }
  }

  console.log('\n=== CHECKING DAILY ATTENDANCE FOR TODAY ===');
  const today = new Date().toISOString().split('T')[0];
  console.log(`Date: ${today}`);
  
  const { data: attendance, error: attError } = await supabase
    .from('daily_student_attendance')
    .select('*')
    .eq('date', today);
  
  if (attError) {
    console.error('Error fetching attendance:', attError);
  } else {
    console.log(`Total attendance records for today: ${attendance?.length || 0}`);
    if (attendance && attendance.length > 0) {
      console.log('Sample attendance:');
      attendance.slice(0, 5).forEach(a => {
        console.log(`  - Student: ${a.student_id} | Class: ${a.class_id} | Status: ${a.status}`);
      });
    }
  }

  console.log('\n=== CHECKING USERS (ADMIN) ===');
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, name, role, stream_id')
    .eq('role', 'admin');
  
  if (userError) {
    console.error('Error fetching users:', userError);
  } else {
    console.log(`Total admin users: ${users?.length || 0}`);
    users?.forEach(u => {
      console.log(`  - ${u.name} | stream_id: [${u.stream_id}]`);
    });
  }
}

checkFullData();
