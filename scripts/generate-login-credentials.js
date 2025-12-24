const bcrypt = require('bcryptjs');

async function generateHashes() {
  // Student passwords
  const studentPassword = 'student123';
  const studentHash1 = await bcrypt.hash(studentPassword, 10);
  const studentHash2 = await bcrypt.hash(studentPassword, 10);

  // Staff passwords
  const staffPassword = 'teacher123';
  const staffHash1 = await bcrypt.hash(staffPassword, 10);
  const staffHash2 = await bcrypt.hash(staffPassword, 10);

  console.log('\n=== STUDENT LOGIN CREDENTIALS ===\n');
  console.log('Student 1 (SCH001, STU001):');
  console.log(`Password: ${studentPassword}`);
  console.log(`Hash: ${studentHash1}\n`);

  console.log('Student 2 (SCH002, STU002):');
  console.log(`Password: ${studentPassword}`);
  console.log(`Hash: ${studentHash2}\n`);

  console.log('\n=== STAFF LOGIN CREDENTIALS ===\n');
  console.log('Staff 1 (SCH002, STF001):');
  console.log(`Password: ${staffPassword}`);
  console.log(`Hash: ${staffHash1}\n`);

  console.log('Staff 2 (SCH002, STF002):');
  console.log(`Password: ${staffPassword}`);
  console.log(`Hash: ${staffHash2}\n`);

  // Generate SQL
  const sql = `
-- Insert Student Login Credentials
INSERT INTO student_login (school_code, admission_no, password_hash, is_active)
VALUES
  ('SCH001', 'STU001', '${studentHash1}', true),
  ('SCH002', 'STU002', '${studentHash2}', true)
ON CONFLICT (school_code, admission_no) 
DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Insert Staff Login Credentials
INSERT INTO staff_login (school_code, staff_id, password_hash, is_active)
VALUES
  ('SCH002', 'STF001', '${staffHash1}', true),
  ('SCH002', 'STF002', '${staffHash2}', true)
ON CONFLICT (school_code, staff_id) 
DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
`;

  console.log('\n=== SQL INSERT STATEMENTS ===\n');
  console.log(sql);
}

generateHashes().catch(console.error);

