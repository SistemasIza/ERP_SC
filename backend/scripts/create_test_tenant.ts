import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function createTestTenant() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Create Organization
  const orgName = 'Empresa de Prueba ' + Math.floor(Math.random() * 1000);
  console.log(`Creating organization: ${orgName}...`);
  
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ 
      name: orgName,
      plan: 'pro'
    })
    .select()
    .single();

  if (orgError) {
    console.error('Error creating organization:', orgError.message);
    return;
  }

  console.log(`Organization created with ID: ${org.id}`);

  // 2. Create User for that Organization
  const userEmail = `test_${org.id.split('-')[0]}@sparktree.io`;
  const password = 'password123'; // Note: In production hashing is required
  console.log(`Creating user: ${userEmail}...`);

  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      email: userEmail,
      full_name: 'Usuario de Prueba',
      password_hash: password, // As requested, using simple password for now
      role: 'admin',
      organization_id: org.id
    })
    .select()
    .single();

  if (userError) {
    console.error('Error creating user:', userError.message);
    // Cleanup org if user creation fails
    await supabase.from('organizations').delete().eq('id', org.id);
    return;
  }

  console.log(`User created with ID: ${user.id}`);
  console.log('-----------------------------------');
  console.log('CREDENTIALS FOR TESTING:');
  console.log(`Email: ${userEmail}`);
  console.log(`Password: ${password}`);
  console.log(`Organization ID: ${org.id}`);
  console.log('-----------------------------------');
}

createTestTenant();
