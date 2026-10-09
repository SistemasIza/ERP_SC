const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey ? 'Found' : 'Not found');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('Users:', data);
  }

  const { data: wc, error: wcError } = await supabase.from('whatsapp_connections').select('*').limit(1);
  if (wcError) {
    console.error('Error fetching whatsapp_connections:', wcError);
  } else {
    console.log('whatsapp_connections:', wc);
  }
}

test();
