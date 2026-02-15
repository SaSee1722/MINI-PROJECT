const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qqyuzavylleqqavqykvc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxeXV6YXZ5bGxlcXFhdnF5a3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODYzMjAsImV4cCI6MjA3Nzc2MjMyMH0.YISR-q4WEdrJVel51dhe0wuxZIH6CDVl-QjQ4A1wZ6c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugReportData() {
  const today = new Date().toISOString().split('T')[0];
  
  console.log('=== DEBUGGING SHORT REPORT DATA ===');
  console.log(`Date: ${today}\n`);
  
  // 1. Check classes
  console.log('1. CLASSES:');
  const { data: classes } = await supabase.from('classes').select('*');
  console.log(`Total classes: ${classes?.length || 0}`);
  classes?.forEach(c => {
    console.log(`  - ${c.name} | ID: ${c.id} | stream_id: [${c.stream_id}]`);
  });
  
  // 2. Check students
  console.log('\n2. STUDENTS:');
  const { data: students } = await supabase.from('students').select('*');
  console.log(`Total students: ${students?.length || 0}`);
  students?.forEach(s => {
    console.log(`  - ${s.name} (${s.roll_number}) | class_id: ${s.class_id} | stream_id: [${s.stream_id}]`);
  });
  
  // 3. Check daily attendance for today
  console.log('\n3. DAILY ATTENDANCE FOR TODAY:');
  const { data: attendance } = await supabase
    .from('daily_student_attendance')
    .select('*')
    .eq('date', today);
  
  console.log(`Total attendance records: ${attendance?.length || 0}`);
  attendance?.forEach(a => {
    console.log(`  - Student: ${a.student_id} | Class: ${a.class_id} | Status: ${a.status} | Date: ${a.date}`);
  });
  
  // 4. Simulate report generation
  console.log('\n4. SIMULATING REPORT GENERATION:');
  if (classes && classes.length > 0) {
    const reportStream = 'cse';
    console.log(`Report stream: ${reportStream}`);
    
    const streamClasses = classes.filter(c => {
      const cStreamId = c.stream_id?.toLowerCase();
      const cName = c.name?.toLowerCase();
      return cStreamId === reportStream.toLowerCase() || 
             cName?.includes('cse');
    });
    
    console.log(`Classes found for stream: ${streamClasses.length}`);
    streamClasses.forEach(cls => {
      console.log(`  - ${cls.name}`);
      
      const classStudents = students?.filter(s => s.class_id === cls.id) || [];
      console.log(`    Total students: ${classStudents.length}`);
      
      const classAttendance = attendance?.filter(a => a.class_id === cls.id) || [];
      console.log(`    Attendance records: ${classAttendance.length}`);
      
      const present = classAttendance.filter(a => a.status === 'present').length;
      const absent = classAttendance.filter(a => a.status === 'absent').length;
      console.log(`    Present: ${present}, Absent: ${absent}`);
    });
  }
}

debugReportData();
