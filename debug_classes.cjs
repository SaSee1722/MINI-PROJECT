
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqyuzavylleqqavqykvc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxeXV6YXZ5bGxlcXFhdnF5a3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODYzMjAsImV4cCI6MjA3Nzc2MjMyMH0.YISR-q4WEdrJVel51dhe0wuxZIH6CDVl-QjQ4A1wZ6c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClasses() {
  const { data, error } = await supabase.from('classes').select('id, name, stream_id');
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('--- CLASSES ---');
  data.forEach(c => {
    console.log(`ID: ${c.id}, Name: ${c.name}, StreamID: [${c.stream_id}]`);
  });
}

checkClasses();
