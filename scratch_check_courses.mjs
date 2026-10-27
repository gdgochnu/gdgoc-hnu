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
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, category');
  console.log('Courses:', courses);

  const { data: workshops } = await supabase
    .from('workshops')
    .select('id, title, category');
  console.log('Workshops:', workshops);

  // Check certificates with empty or null or revoked
  const { data: certs } = await supabase
    .from('student_certificates')
    .select('id, student_id, course_id, workshop_id, certificate_number, title');
  
  console.log('Total certs:', certs.length);

  // Check if there are any certificates where student is null or student profile was deleted
  let orphanedCerts = 0;
  for (const c of certs) {
    const { data: st } = await supabase.from('student_profiles').select('id, full_name_en, full_name_ar').eq('id', c.student_id).maybeSingle();
    if (!st) orphanedCerts++;
  }
  console.log('Orphaned certs (no student profile):', orphanedCerts);
}

check();
