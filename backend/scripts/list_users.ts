import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function checkUsers() {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  console.log('👥 Checking users in the database...');
  const { data: users, error } = await supabase.from('users').select('id, email, full_name, role, password_hash');
  
  if (error) {
    console.error('Error fetching users:', error.message);
  } else {
    console.log(`Found ${users.length} users:`);
    console.log(JSON.stringify(users, null, 2));
  }
}

checkUsers();
