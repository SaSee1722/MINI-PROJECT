const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqyuzavylleqqavqykvc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxeXV6YXZ5bGxlcXFhdnF5a3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODYzMjAsImV4cCI6MjA3Nzc2MjMyMH0.YISR-q4WEdrJVel51dhe0wuxZIH6CDVl-QjQ4A1wZ6c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('=== CHECKING DAILY_STUDENT_ATTENDANCE TABLE ===');
  
  // Try to get one record with all joins
  const { data, error } = await supabase
    .from('daily_student_attendance')
    .select(`
      *,
      students (*),
      classes (*)
    `)
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample record:', JSON.stringify(data, null, 2));
  }
  
  // Check if there are ANY records
  const { count } = await supabase
    .from('daily_student_attendance')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\nTotal daily_student_attendance records: ${count}`);
}

checkTableStructure();
