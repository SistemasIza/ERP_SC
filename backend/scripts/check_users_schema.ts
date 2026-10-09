import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function checkUsersSchema() {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  console.log('--- USERS TABLE COLUMNS ---');
  // Try to insert a dummy row to a hypothetical column to see error or just select
  const { data, error } = await supabase.from('users').select('*').limit(0);
  if (error) {
    console.error(error);
  } else {
    // If we can't see columns via select, we might need a dummy insert or another way
    const { data: sample, error: sampleError } = await supabase.from('users').select('*').limit(1);
    console.log(sample && sample.length > 0 ? Object.keys(sample[0]) : 'No data in users table');
  }
}

checkUsersSchema();
