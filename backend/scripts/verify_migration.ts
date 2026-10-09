import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function checkColumns() {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  console.log('🔍 Checking if "email" column exists in "users" table...');
  const { error } = await supabase.from('users').select('email').limit(1);
  
  if (error) {
    if (error.message.includes('column "email" does not exist')) {
      console.log('❌ FATAL: La columna "email" NO existe. El usuario NO ha ejecutado admin_v1.sql');
    } else {
      console.error('Error inesperado:', error.message);
    }
  } else {
    console.log('✅ La columna "email" existe.');
  }
}

checkColumns();
