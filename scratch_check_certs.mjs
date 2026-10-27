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
  const { count, error } = await supabase
    .from('student_certificates')
    .select('*', { count: 'exact', head: true });
  console.log('Total count in student_certificates:', count, error);

  const { data: fullQueryData, error: qErr } = await supabase
    .from('student_certificates')
    .select(`
      id,
      title,
      certificate_number,
      verification_code,
      issue_date,
      pdf_drive_file_id,
      pdf_drive_url,
      completion_stats,
      created_at,
      student_id,
      course_id,
      workshop_id,
      template_id,
      student:student_profiles(id, full_name_ar, full_name_en, email, phone, faculty, academic_year, department_major),
      course:courses(id, title, category),
      workshop:workshops(id, title, category),
      template:certificate_templates(id, name),
      issuer:profiles!student_certificates_issued_by_fkey(full_name, role)
    `)
    .order('created_at', { ascending: false });

  console.log('Full query count:', fullQueryData?.length, 'error:', qErr);

  // Let's inspect what courses exist and certificates per course
  const { data: allCerts } = await supabase
    .from('student_certificates')
    .select('id, student_id, course_id, workshop_id, title, student:student_profiles(id, full_name_en, full_name_ar, email)');
  
  console.log('Sample cert with student info:');
  for (let i = 0; i < Math.min(5, allCerts?.length || 0); i++) {
    console.log(allCerts[i]);
  }

  // Count by course_id
  const byCourse = {};
  for (const c of allCerts || []) {
    const key = c.course_id ? `course:${c.course_id}` : `workshop:${c.workshop_id}`;
    byCourse[key] = (byCourse[key] || 0) + 1;
  }
  console.log('Certs by course/workshop:', byCourse);
}

check();
