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
  const { data: certs } = await supabase
    .from('student_certificates')
    .select('id, certificate_number, created_at, student_id, student:student_profiles(full_name_en, full_name_ar, email)')
    .order('created_at', { ascending: false });

  console.log('Total certs:', certs?.length);
  const dates = {};
  for (const c of certs || []) {
    const d = c.created_at ? c.created_at.slice(0, 13) : 'unknown'; // Group by hour
    dates[d] = (dates[d] || 0) + 1;
  }
  console.log('Certs by created_at hour:', dates);

  // Check the newest 15 certs
  console.log('Newest 15 certs:');
  for (let i = 0; i < Math.min(15, certs?.length || 0); i++) {
    const c = certs[i];
    console.log(i + 1, c.certificate_number, c.created_at, c.student?.full_name_en, c.student?.email);
  }
}

check();
