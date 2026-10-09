
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env from backend
dotenv.config({ path: 'c:/Users/Sistemas/Downloads/Aa/Proyecto-SAAS-Sparktree/backend/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase config');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking Supabase connection and schema...');
  
  // 1. Check organizations
  const { data: orgs, error: orgError } = await supabase.from('organizations').select('*').limit(1);
  if (orgError) console.error('Org Error:', orgError);
  else console.log('Found organizations:', orgs?.length);

  // 2. Check users
  const { data: users, error: userError } = await supabase.from('users').select('*').limit(1);
  if (userError) console.error('User Error:', userError);
  else {
    console.log('Found users:', users?.length);
    if (users && users[0]) {
      const keys = Object.keys(users[0]);
      console.log('User columns:', keys);
      const missing = ['whatsapp_connections_limit', 'active_whatsapp_connections'].filter(k => !keys.includes(k));
      if (missing.length > 0) console.log('MISSING USER COLUMNS:', missing);
    }
  }

  // 3. Check whatsapp_connections
  const { data: conns, error: connError } = await supabase.from('whatsapp_connections').select('*').limit(1);
  if (connError) {
      console.error('Connection Table Error:', connError.message);
  } else {
      console.log('whatsapp_connections table exists.');
      // Inspect columns via a dummy query or better, just check what fields come back if any, 
      // but since it's empty we need another way. 
      // Let's try to get one row and if null, we can't easily get keys from supabase-js without data.
      // But we can try to select a known 'problematic' column.
      const { error: qrError } = await supabase.from('whatsapp_connections').select('qr_code').limit(1);
      if (qrError) console.log('MISSING COLUMN qr_code:', qrError.message);
      else console.log('Column qr_code exists.');

      const { error: authError } = await supabase.from('whatsapp_connections').select('auth_state_path').limit(1);
      if (authError) console.log('MISSING COLUMN auth_state_path:', authError.message);
      else console.log('Column auth_state_path exists.');
  }

  // 4. Check flow_assignments
  const { data: flowAss, error: flowError } = await supabase.from('flow_assignments').select('*').limit(1);
  if (flowError) {
      console.error('Flow Assignments Table Error:', flowError.message);
  } else {
      console.log('flow_assignments table exists.');
  }
}

check();
