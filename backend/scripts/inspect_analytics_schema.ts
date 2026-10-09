import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function checkAnalyticsTables() {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const tables = ['weekly_flow_summary', 'top_flows_weekly', 'daily_flow_summary', 'hourly_activity'];
  
  for (const table of tables) {
    console.log(`\n📋 Table: ${table}`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    
    if (error) {
       console.error(`Error reading ${table}:`, error.message);
       continue;
    }
    
    if (data && data.length > 0) {
      console.log(`Columns found:`, Object.keys(data[0]));
    } else {
      console.log(`No data in ${table} to inspect columns.`);
    }
  }
}

checkAnalyticsTables();
