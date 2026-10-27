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
  const martinId = '9f00a8d3-505e-4ce4-a151-95bb665e19c0';
  const { data: certs } = await supabase
    .from('student_certificates')
    .select('*')
    .eq('student_id', martinId);
  console.log('Certs for Martin:', certs);

  // Check student_certificates where pdf_drive_url is null
  const { data: nullDriveCerts } = await supabase
    .from('student_certificates')
    .select('id, certificate_number, student_id, title, course_id, workshop_id, created_at, student:student_profiles(full_name_en, full_name_ar, email)')
    .is('pdf_drive_url', null);

  console.log('Certificates with NULL pdf_drive_url in DB:', nullDriveCerts?.length);
  for (const c of nullDriveCerts || []) {
    console.log(c.certificate_number, c.created_at, c.student?.full_name_en, c.student?.email);
  }
}

check();
