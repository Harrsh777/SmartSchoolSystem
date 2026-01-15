import bcrypt from 'bcryptjs';
import { hashPassword as hashPasswordUtil } from './password-utils';

/**
 * Generate a random password
 * @param length - Length of the password (default: 8)
 * @returns Generated password string
 */
export function generatePassword(length: number = 8): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  
  // Ensure at least one lowercase, one uppercase, and one number
  password += charset[Math.floor(Math.random() * 26)]; // lowercase
  password += charset[26 + Math.floor(Math.random() * 26)]; // uppercase
  password += charset[52 + Math.floor(Math.random() * 10)]; // number
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Hash a plain text password using bcrypt
 * @param password - Plain text password to hash
 * @returns Hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
  return await hashPasswordUtil(password);
}

/**
 * Generate a password and hash it
 * @param length - Length of the password to generate (default: 8)
 * @returns Object with plain password and hashed password
 */
export async function generateAndHashPassword(length: number = 8): Promise<{
  password: string;
  hashedPassword: string;
}> {
  const password = generatePassword(length);
  const hashedPassword = await hashPassword(password);
  return {
    password,
    hashedPassword,
  };
}
