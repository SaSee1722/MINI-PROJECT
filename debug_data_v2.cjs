
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqyuzavylleqqavqykvc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxeXV6YXZ5bGxlcXFhdnF5a3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODYzMjAsImV4cCI6MjA3Nzc2MjMyMH0.YISR-q4WEdrJVel51dhe0wuxZIH6CDVl-QjQ4A1wZ6c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: users, error: userError } = await supabase.from('users').select('id, name, role, stream_id');
  console.log('--- USERS ---', userError || '');
  users?.forEach(u => console.log(`${u.name} (${u.role}): [${u.stream_id}]`));

  const { data: classes, error: classError } = await supabase.from('classes').select('*');
  console.log('--- CLASSES ---', classError || '');
  classes?.forEach(c => console.log(`${c.name}: [${c.stream_id}]`));

  const { data: attendance, error: attError } = await supabase.from('daily_student_attendance').select('*').limit(5);
  console.log('--- DAILY ATTENDANCE (LAST 5) ---', attError || '');
  attendance?.forEach(a => console.log(`${a.date}: ID ${a.id}, Student ${a.student_id}, Class ${a.class_id}`));
}

checkData();
