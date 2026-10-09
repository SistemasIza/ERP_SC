
import dotenv from 'dotenv';
dotenv.config({ path: 'c:/Users/Sistemas/Downloads/Aa/Proyecto-SAAS-Sparktree/backend/.env' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function testAdmin() {
  console.log('Testing Admin Creation Logic...');
  
  // 1. Create a test organization
  const testOrgName = 'Test Admin Org ' + Date.now();
  console.log('Creating organization:', testOrgName);
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: testOrgName, plan: 'pro' })
    .select()
    .single();

  if (orgError) {
    console.error('Error creating org:', orgError.message);
    return;
  }
  console.log('Org created:', org.id);

  // 2. Create a test staff user
  const testEmail = `admin_${Date.now()}@test.com`;
  console.log('Creating user:', testEmail);
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      email: testEmail,
      full_name: 'Admin Test User',
      role: 'admin',
      organization_id: org.id,
      password_hash: 'testpass123'
    })
    .select()
    .single();

  if (userError) {
    console.error('Error creating user:', userError.message);
  } else {
    console.log('User created successfully:', user.id);
    console.log('User role:', user.role);
    console.log('User full_name:', user.full_name);
    
    // Check if name is also set or null
    console.log('User name (deprecated column?):', user.name);

    // Clean up
    await supabase.from('users').delete().eq('id', user.id);
  }

  // Final cleanup
  await supabase.from('organizations').delete().eq('id', org.id);
}

testAdmin();
