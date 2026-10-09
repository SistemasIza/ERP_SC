import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function checkAllUserColumns() {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const columns = ['id', 'email', 'password_hash', 'full_name', 'role', 'organization_id'];
  console.log('🔍 Checking columns in "users" table...');
  
  for (const col of columns) {
    const { error } = await supabase.from('users').select(col).limit(1);
    if (error) {
      console.log(`❌ Column "${col}" is MISSING or inaccessible: ${error.message}`);
    } else {
      console.log(`✅ Column "${col}" exists.`);
    }
  }
}

checkAllUserColumns();
