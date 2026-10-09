import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function checkSchema() {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const tables = ['messages', 'flow_executions', 'contacts', 'conversations'];
  
  for (const table of tables) {
    console.log(`\n📋 Table: ${table}`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    
    if (error) {
       console.error(`Error reading ${table}:`, error.message);
       continue;
    }
    
    if (data && data.length > 0) {
      console.log(`Columns found in sample record:`, Object.keys(data[0]));
    } else {
      // If no data, try to get column names via RPC or a dummy insert (but let's try something safer)
      console.log(`No data in ${table} to inspect columns.`);
    }
  }
}

checkSchema();
