/**
 * Whether this staff member should get the full teacher portal (academics, marks, etc.)
 * vs the restricted non-teaching staff menu.
 * Aligns with staff directory “Teaching” vs “Non-Teaching” grouping.
 */
const EXACT_TEACHING_ROLES = new Set([
  'Teacher',
  'Principal',
  'Vice Principal',
  'Head Teacher',
]);

export function isTeachingStaffRole(
  role: string | null | undefined,
  designation?: string | null
): boolean {
  const roleTrim = String(role || '').trim();
  if (EXACT_TEACHING_ROLES.has(roleTrim)) return true;

  const combined = `${roleTrim} ${String(designation || '').trim()}`.toLowerCase();

  if (/\bteacher\b/.test(combined)) return true;
  if (combined.includes('principal')) return true;
  if (combined.includes('head teacher')) return true;
  if (combined.includes('lecturer')) return true;
  if (combined.includes('tutor')) return true;
  if (combined.includes('faculty')) return true;
  if (combined.includes('professor')) return true;
  if (combined.includes('instructor')) return true;

  return false;
}
