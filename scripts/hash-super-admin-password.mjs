#!/usr/bin/env node
/**
 * Generate SUPER_ADMIN_PASSWORD_HASH for .env.local
 * Usage: node scripts/hash-super-admin-password.mjs "your-strong-password"
 */
import bcrypt from 'bcryptjs';

const pwd = process.argv[2];
if (!pwd || pwd.length < 12) {
  console.error('Usage: node scripts/hash-super-admin-password.mjs "<password min 12 chars>"');
  process.exit(1);
}

const hash = await bcrypt.hash(pwd, 12);
const forNextJs = hash.replace(/\$/g, '\\$');
console.log('\nAdd to .env.local (never commit).\n');
console.log('Next.js expands $ in env values — use escaped dollars:\n');
console.log(`SUPER_ADMIN_PASSWORD_HASH=${forNextJs}\n`);
