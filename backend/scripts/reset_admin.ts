import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

async function resetPassword() {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const email = 'admin+fabpsandoval@gmail.com';
  const newPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  console.log(`Updating password for ${email}...`);
  const { error } = await supabase
    .from('users')
    .update({ password_hash: hashedPassword })
    .eq('email', email);

  if (error) {
    console.error('Error updating password:', error.message);
  } else {
    console.log('✅ Password updated successfully! Use "admin123" to log in.');
  }
}

resetPassword();
