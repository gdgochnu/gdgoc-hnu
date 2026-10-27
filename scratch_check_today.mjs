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

async function fetchAllSupabaseRows(fetchPage) {
  const allRows = [];
  const PAGE_SIZE = 1000;
  let from = 0;
  let to = PAGE_SIZE - 1;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await fetchPage(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      from += PAGE_SIZE;
      to += PAGE_SIZE;
    }
  }
  return allRows;
}

async function check() {
  const certRows = await fetchAllSupabaseRows((from, to) =>
    supabase
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
      .order('created_at', { ascending: false })
      .range(from, to)
  );

  console.log('certRows length:', certRows.length);

  // Check the 11 certs from today
  const todayCerts = certRows.filter(c => c.created_at?.startsWith('2026-10-27'));
  console.log('Today certs count:', todayCerts.length);
  for (const c of todayCerts) {
    console.log({
      id: c.id,
      number: c.certificate_number,
      student_id: c.student_id,
      name_en: c.student?.full_name_en,
      name_ar: c.student?.full_name_ar,
      email: c.student?.email,
      pdf_drive_url: c.pdf_drive_url,
      pdf_drive_file_id: c.pdf_drive_file_id,
      created_at: c.created_at
    });
  }
}

check();
