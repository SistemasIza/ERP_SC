
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/Sistemas/Downloads/Aa/Proyecto-SAAS-Sparktree/backend/.env' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function testInit() {
  console.log('Testing QR Init logic...');
  
  // 1. Get an organization
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  if (!orgs || orgs.length === 0) {
    console.log('No organization found');
    return;
  }
  const orgId = orgs[0].id;
  console.log('Organization ID:', orgId);

  // 2. Get a user for this org
  const { data: users } = await supabase.from('users').select('*').eq('organization_id', orgId).limit(1);
  if (!users || users.length === 0) {
    console.log('No user found');
    return;
  }
  const user = users[0];
  console.log('User ID:', user.id);

  // 3. Try to fetch the columns that we suspect are missing
  console.log('Checking problematic columns...');
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('whatsapp_connections_limit, active_whatsapp_connections')
    .eq('id', user.id)
    .single();

  if (userError) {
    console.log('ERROR fetching columns:', userError.message);
  } else {
    console.log('Data fetched successfully:', userData);
  }

  // 4. Try to insert into whatsapp_connections
  console.log('Checking whatsapp_connections table structure...');
  const { data: connData, error: connInsertError } = await supabase
      .from('whatsapp_connections')
      .insert({
          user_id: user.id,
          organization_id: orgId,
          display_name: 'Test Connection ' + Date.now(),
          status: 'disconnected'
      })
      .select()
      .single();

  if (connInsertError) {
      console.log('ERROR inserting into whatsapp_connections:', connInsertError.message);
  } else {
      console.log('Inserted successfully:', connData);
      // Clean up
      await supabase.from('whatsapp_connections').delete().eq('id', connData.id);
  }
}

testInit();
