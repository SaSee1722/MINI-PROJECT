const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqyuzavylleqqavqykvc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxeXV6YXZ5bGxlcXFhdnF5a3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODYzMjAsImV4cCI6MjA3Nzc2MjMyMH0.YISR-q4WEdrJVel51dhe0wuxZIH6CDVl-QjQ4A1wZ6c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestData() {
  console.log('=== CREATING TEST DATA ===\n');
  
  // 1. Create a test class
  console.log('1. Creating class "II CSE B"...');
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .insert({
      name: 'II CSE B',
      stream_id: 'cse'
    })
    .select()
    .single();
  
  if (classError) {
    console.error('Error creating class:', classError);
    return;
  }
  
  console.log(`✅ Class created with ID: ${classData.id}\n`);
  
  // 2. Create test students
  console.log('2. Creating 5 test students...');
  const students = [
    { name: 'Student A', roll_number: '001', class_id: classData.id, stream_id: 'cse' },
    { name: 'Student B', roll_number: '002', class_id: classData.id, stream_id: 'cse' },
    { name: 'Student C', roll_number: '003', class_id: classData.id, stream_id: 'cse' },
    { name: 'Student D', roll_number: '004', class_id: classData.id, stream_id: 'cse' },
    { name: 'Student E', roll_number: '005', class_id: classData.id, stream_id: 'cse' }
  ];
  
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .insert(students)
    .select();
  
  if (studentError) {
    console.error('Error creating students:', studentError);
    return;
  }
  
  console.log(`✅ Created ${studentData.length} students\n`);
  
  // 3. Create today's attendance
  console.log('3. Creating today\'s attendance records...');
  const today = new Date().toISOString().split('T')[0];
  
  const attendanceRecords = studentData.map((student, index) => ({
    student_id: student.id,
    class_id: classData.id,
    date: today,
    status: index < 3 ? 'present' : 'absent', // 3 present, 2 absent
    approval_status: index < 3 ? null : 'pending'
  }));
  
  const { data: attendanceData, error: attendanceError } = await supabase
    .from('daily_student_attendance')
    .insert(attendanceRecords)
    .select();
  
  if (attendanceError) {
    console.error('Error creating attendance:', attendanceError);
    return;
  }
  
  console.log(`✅ Created ${attendanceData.length} attendance records for ${today}\n`);
  
  console.log('=== TEST DATA CREATED SUCCESSFULLY ===');
  console.log('You can now generate the Short Report!');
}

createTestData();
