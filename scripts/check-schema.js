const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = val;
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: null },
});

async function check() {
  const { data: tasks, error: tasksErr } = await supabase.from('tasks').select('*').limit(1);
  console.log('Tasks error:', tasksErr);
  console.log('Tasks sample keys:', tasks && tasks.length > 0 ? Object.keys(tasks[0]) : 'no rows');

  const { data: assignees, error: assigneesErr } = await supabase.from('task_assignees').select('*').limit(1);
  console.log('Task assignees error:', assigneesErr);
  console.log('Task assignees data:', assignees);
}

check();
