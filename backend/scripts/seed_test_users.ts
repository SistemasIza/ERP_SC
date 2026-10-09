import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

async function createTestUsers() {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const testPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(testPassword, 10);

  console.log('🚀 Creating test organization and user...');

  // 1. Ensure a test organization exists
  let { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('name', 'Sparktree Dev')
    .single();

  if (!org) {
    const { data: newOrg, error: createOrgError } = await supabase
      .from('organizations')
      .insert({ name: 'Sparktree Dev', plan: 'pro' })
      .select()
      .single();
    
    if (createOrgError) {
      console.error('Error creating organization:', createOrgError);
      return;
    }
    org = newOrg;
    console.log(`✅ Created Org: ${org.name} (${org.id})`);
  } else {
    console.log(`ℹ️ Org already exists: ${org.name} (${org.id})`);
  }

  // 2. Create a test superadmin user
  const testEmail = 'admin+fabpsandoval@gmail.com';
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', testEmail)
    .single();

  if (!existingUser) {
    const { error: userError } = await supabase
      .from('users')
      .insert({
        email: testEmail,
        full_name: 'Super Admin',
        role: 'superadmin',
        organization_id: org.id,
        password_hash: hashedPassword
      });

    if (userError) {
      console.error('Error creating user:', userError);
    } else {
      console.log(`✅ Created SuperAdmin: ${testEmail}`);
    }
  } else {
    console.log(`ℹ️ User already exists: ${testEmail}`);
  }

  // 3. Create a regular admin user for the same org
  const staffEmail = 'staff+fabpsandoval@gmail.com';
  const { data: existingStaff } = await supabase
    .from('users')
    .select('*')
    .eq('email', staffEmail)
    .single();

  if (!existingStaff) {
    await supabase
      .from('users')
      .insert({
        email: staffEmail,
        full_name: 'Staff Member',
        role: 'admin',
        organization_id: org.id,
        password_hash: hashedPassword
      });
    console.log(`✅ Created Admin User: ${staffEmail}`);
  }

  console.log('\n✨ Test data setup complete.');
}

createTestUsers();
