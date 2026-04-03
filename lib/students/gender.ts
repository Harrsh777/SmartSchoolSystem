/**
 * Map spreadsheet / UI gender text to values that satisfy `students.gender` CHECK constraints.
 */

export type CanonicalStudentGender = 'Male' | 'Female' | 'Other';

const CANONICAL = new Set<string>(['Male', 'Female', 'Other']);

/**
 * Returns a canonical gender string, or null if empty / unrecognized (store as NULL in DB).
 */
export function normalizeStudentGenderForDb(raw: unknown): CanonicalStudentGender | null {
  if (raw === null || raw === undefined) return null;
  // Excel often uses ALL CAPS (MALE/FEMALE) and non-breaking spaces (U+00A0)
  const s = String(raw)
    .normalize('NFKC')
    .replace(/\u00A0/g, ' ')
    .trim();
  if (!s) return null;

  if (CANONICAL.has(s)) return s as CanonicalStudentGender;

  const lower = s.toLowerCase().replace(/\s+/g, ' ');

  if (lower === 'male' || lower === 'female' || lower === 'other') {
    return lower === 'male' ? 'Male' : lower === 'female' ? 'Female' : 'Other';
  }

  if (/^\d+$/.test(lower)) {
    if (lower === '1') return 'Male';
    if (lower === '2') return 'Female';
    if (lower === '3') return 'Other';
    return null;
  }

  if (
    lower === 'm' ||
    lower === 'boy' ||
    lower === 'boys' ||
    lower === 'man' ||
    lower === 'gentleman'
  ) {
    return 'Male';
  }

  if (
    lower === 'f' ||
    lower === 'girl' ||
    lower === 'girls' ||
    lower === 'woman' ||
    lower === 'lady'
  ) {
    return 'Female';
  }

  if (
    lower === 'o' ||
    lower === 'others' ||
    lower === 'transgender' ||
    lower === 'trans' ||
    lower === 'non-binary' ||
    lower === 'nonbinary' ||
    lower === 'nb'
  ) {
    return 'Other';
  }

  return null;
}
