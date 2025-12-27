import bcrypt from 'bcryptjs';

/**
 * Generates a secure random password
 * Format: 8 characters (mix of uppercase, lowercase, numbers)
 */
export function generatePassword(): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluding I and O for clarity
  const lowercase = 'abcdefghijkmnpqrstuvwxyz'; // Excluding l and o for clarity
  const numbers = '23456789'; // Excluding 0, 1 for clarity
  
  let password = '';
  
  // Ensure at least one character from each set
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  
  // Fill the rest randomly
  const allChars = uppercase + lowercase + numbers;
  for (let i = password.length; i < 8; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Hashes a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Generates and hashes a password, returning both
 */
export async function generateAndHashPassword(): Promise<{ password: string; hash: string }> {
  const password = generatePassword();
  const hash = await hashPassword(password);
  return { password, hash };
}
