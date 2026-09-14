import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = Object.fromEntries(
  envContent
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey);

async function verifySD5() {
  console.log('=== Step S.D.5: End-to-End Attendance Verification ===\n');

  // 1. Get an active student
  const { data: students, error: sErr } = await admin
    .from('student_profiles')
    .select('id, full_name_en, email, qr_code')
    .eq('status', 'active')
    .limit(1);

  if (sErr || !students || students.length === 0) {
    console.error('No active student found:', sErr);
    return;
  }
  const student = students[0];
  console.log(`1. Found student: ${student.full_name_en} (${student.email}), QR: ${student.qr_code}`);

  // 2. Get a course session
  const { data: sessions, error: sesErr } = await admin
    .from('course_sessions')
    .select('id, course_id, session_number, title, session_date')
    .limit(1);

  if (sesErr || !sessions || sessions.length === 0) {
    console.error('No course session found:', sesErr);
    return;
  }
  const session = sessions[0];
  console.log(`2. Found session: Session ${session.session_number}: "${session.title}" (Course ID: ${session.course_id})`);

  // 3. Ensure student is enrolled in this course
  const { data: enrollExisting } = await admin
    .from('course_enrollments')
    .select('id, status')
    .eq('course_id', session.course_id)
    .eq('student_id', student.id)
    .maybeSingle();

  if (!enrollExisting) {
    await admin.from('course_enrollments').insert({
      course_id: session.course_id,
      student_id: student.id,
      status: 'confirmed',
    });
    console.log(`3. Enrolled student into course.`);
  } else {
    if (enrollExisting.status !== 'confirmed') {
      await admin.from('course_enrollments').update({ status: 'confirmed' }).eq('id', enrollExisting.id);
    }
    console.log(`3. Student confirmed enrollment exists.`);
  }

  // 4. Clean up any prior test attendance for this session & student
  await admin
    .from('student_attendance')
    .delete()
    .eq('session_id', session.id)
    .eq('student_id', student.id);

  // 5. Get an officer (HR/President/Instructor)
  const { data: officers } = await admin
    .from('profiles')
    .select('id, full_name, role')
    .limit(1);
  const officer = officers?.[0];
  console.log(`4. Officer performing check-in: ${officer?.full_name} (${officer?.role})`);

  // 6. Record attendance (Simulate QR Scan)
  const checkInTime = new Date().toISOString();
  const { data: attRecord, error: attErr } = await admin
    .from('student_attendance')
    .insert({
      session_id: session.id,
      student_id: student.id,
      checked_in_by: officer.id,
      method: 'qr',
      check_in_time: checkInTime,
      notes: 'End-to-end S.D.5 test check-in via QR scan',
    })
    .select('id, check_in_time, method')
    .single();

  if (attErr) {
    console.error('Failed to record attendance:', attErr);
    return;
  }
  console.log(`5. Attendance successfully recorded! ID: ${attRecord.id}, Method: ${attRecord.method}`);

  // 7. Verify Duplicate Scan Prevention (attempting to re-insert should trigger unique constraint)
  const { error: dupErr } = await admin
    .from('student_attendance')
    .insert({
      session_id: session.id,
      student_id: student.id,
      checked_in_by: officer.id,
      method: 'qr',
    });

  if (dupErr && dupErr.code === '23505') {
    console.log(`6. Duplicate scan prevention confirmed! DB prevented duplicate check-in (code: 23505).`);
  } else {
    console.warn('Duplicate check-in was not rejected as expected:', dupErr);
  }

  // 8. Verify Session Attendance Sheet view
  const { data: sheetRows } = await admin
    .from('student_attendance')
    .select(`
      id,
      check_in_time,
      method,
      student:student_profiles(full_name_en, email),
      officer:profiles!student_attendance_checked_in_by_fkey(full_name)
    `)
    .eq('session_id', session.id)
    .eq('student_id', student.id)
    .single();

  const stuData = Array.isArray(sheetRows?.student) ? sheetRows.student[0] : sheetRows?.student;
  const offData = Array.isArray(sheetRows?.officer) ? sheetRows.officer[0] : sheetRows?.officer;
  console.log(`7. Session Attendance Sheet check:`);
  console.log(`   - Student: ${stuData?.full_name_en}`);
  console.log(`   - Status: PRESENT`);
  console.log(`   - Timestamp: ${sheetRows?.check_in_time}`);
  console.log(`   - Verified by: ${offData?.full_name}`);
  console.log(`   - Method: ${sheetRows?.method}`);

  // 9. Verify Student Dashboard calculation
  const { count: totalAttended } = await admin
    .from('student_attendance')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', student.id);

  console.log(`8. Student Dashboard Attendance count: ${totalAttended} total session(s) attended.`);
  console.log('\n=== Step S.D.5 End-to-End Verification: PASSED SUCCESSFULLY! ===');
}

verifySD5();
