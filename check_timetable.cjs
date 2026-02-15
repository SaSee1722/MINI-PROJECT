const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://salabadeshwaran.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbGFiYWRlc2h3YXJhbiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM1OTkwNjkzLCJleHAiOjIwNTE1NjY2OTN9.Xv6Iy1Oc1_1R6b_Jns-dI78-447-ORBdde-supabase-js.io'
)

async function checkTimetable() {
  console.log('=== CHECKING TIMETABLE DATA ===\n')
  
  const { data, error } = await supabase
    .from('timetable')
    .select('*')
    .limit(5)
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log('Sample timetable entries:')
  data.forEach((entry, i) => {
    console.log(`\n${i + 1}. Entry ID: ${entry.id}`)
    console.log(`   Subject Code: ${entry.subject_code}`)
    console.log(`   Subject Name: ${entry.subject_name}`)
    console.log(`   Faculty Name: ${entry.faculty_name}`)
    console.log(`   Day: ${entry.day_of_week}, Period: ${entry.period_number}`)
  })
}

checkTimetable()
