import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const courseId = 'f3d47082-d317-4ba2-a5de-e13a080f9068';

  // 1. Get confirmed enrollments
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('student_id, status')
    .eq('course_id', courseId)
    .eq('status', 'confirmed');

  console.log('Confirmed enrollments count:', enrollments?.length);

  // 2. Get certs for this course
  const { data: certs } = await supabase
    .from('student_certificates')
    .select('id, student_id, certificate_number')
    .eq('course_id', courseId);

  console.log('Certs for this course:', certs?.length);

  const certStudentIds = new Set(certs.map(c => c.student_id));

  // Check how many enrolled students have a cert
  const enrolledWithCert = enrollments.filter(e => certStudentIds.has(e.student_id));
  const enrolledWithoutCert = enrollments.filter(e => !certStudentIds.has(e.student_id));
  console.log('Enrolled with cert:', enrolledWithCert.length);
  console.log('Enrolled WITHOUT cert:', enrolledWithoutCert.length);

  // Check how many certs belong to students NOT in confirmed enrollments
  const enrollmentStudentIds = new Set(enrollments.map(e => e.student_id));
  const certWithoutEnrollment = certs.filter(c => !enrollmentStudentIds.has(c.student_id));
  console.log('Certs where student is NOT in confirmed enrollments:', certWithoutEnrollment.length);
}

check();
