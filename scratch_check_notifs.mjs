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
  // Check the 11 certs from today:
  const { data: certs } = await supabase
    .from('student_certificates')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(15);

  console.log('Last 15 certs:');
  for (const c of certs) {
    console.log(c.id, c.certificate_number, c.created_at, 'drive_url:', c.pdf_drive_url, 'drive_id:', c.pdf_drive_file_id);
  }

  // Check email logs or notifications sent to these students!
  const todayStudentIds = certs.slice(0, 11).map(c => c.student_id);
  const { data: notifs } = await supabase
    .from('student_notifications')
    .select('*')
    .in('student_id', todayStudentIds);

  console.log('Notifications for today students:', notifs?.length);
  for (const n of notifs || []) {
    console.log(n.student_id, n.title, n.type, n.created_at);
  }
}

check();
