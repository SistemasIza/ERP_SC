import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function applyMigrations() {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  console.log('🚀 Applying migrations for Phase 2...');

  // Note: Standard Supabase client doesn't support 'ALTER TABLE' directly via .from()
  // We usually need the SQL API or a specific RPC. 
  // However, we can try to check if columns exist and if not, we might be stuck without SQL access.
  // BUT, I can try to use a trick if the user has an 'exec_sql' RPC or similar.
  // Given I don't know that, I will provide a clear message to the user.
  
  // Let's try to see if we can at least insert into organizations with the NEW 'plan' column.
  // If it fails, we know migrations are needed.
  
  const { error } = await supabase.from('organizations').select('plan').limit(1);
  if (error && error.message.includes('column "plan" does not exist')) {
    console.log('❌ Migrations needed! Please run backend/sql/admin_v1.sql in your Supabase SQL Editor.');
  } else {
    console.log('✅ Migrations seem to be already applied or columns exist.');
  }
}

applyMigrations();
