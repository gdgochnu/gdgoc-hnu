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
  // Query exactly as getAllIssuedStudentCertificates does:
  const { data: certRows, error } = await supabase
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

  console.log('Total certRows returned:', certRows?.length, 'error:', error);

  // Check how many have certRows[i].student == null!
  const withoutStudent = certRows?.filter(c => !c.student) || [];
  console.log('Certificates where student is null:', withoutStudent.length);
  if (withoutStudent.length > 0) {
    console.log('Sample cert without student:', withoutStudent.slice(0, 3));
    // Let's check why student is null in student_profiles
    for (const c of withoutStudent.slice(0, 3)) {
      const { data: sp } = await supabase.from('student_profiles').select('*').eq('id', c.student_id);
      console.log('Direct student_profiles check for student_id', c.student_id, ':', sp);
    }
  }

  // Check how many have null full_name_en and full_name_ar
  const unnamed = certRows?.filter(c => c.student && !c.student.full_name_en && !c.student.full_name_ar) || [];
  console.log('Certificates where student has NO names:', unnamed.length);
  if (unnamed.length > 0) {
    console.log('Sample unnamed student cert:', unnamed.slice(0, 3));
  }

  // Also check: How many total rows in student_certificates
  const { count: exactCount } = await supabase.from('student_certificates').select('*', { count: 'exact', head: true });
  console.log('Exact count in DB:', exactCount);

  // Check if there are any duplicate certificates for same student and course
  const studentCertCount = {};
  for (const c of certRows || []) {
    const key = `${c.student_id}_${c.course_id || c.workshop_id}`;
    studentCertCount[key] = (studentCertCount[key] || 0) + 1;
  }
  const duplicates = Object.entries(studentCertCount).filter(([k, v]) => v > 1);
  console.log('Duplicates (student having multiple certs for same program):', duplicates.length, duplicates);
}

check();
