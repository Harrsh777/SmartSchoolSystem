export const STAFF_DEPARTMENTS = [
  'Teaching',
  'Non-Teaching',
  'DRIVER/SUPPORTING STAFF',
  'ADMIN',
] as const;

export const STAFF_CATEGORIES = ['SC', 'ST', 'OBC', 'General'] as const;

export const STAFF_RELIGIONS = ['Hindu', 'Muslim', 'Sikh', 'Christian', 'Jain'] as const;

export function isValidStaffDepartment(value: unknown): value is (typeof STAFF_DEPARTMENTS)[number] {
  return normalizeStaffDepartment(value) !== null;
}

export function normalizeStaffDepartment(
  value: unknown
): (typeof STAFF_DEPARTMENTS)[number] | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  if (normalized === 'teaching' || normalized === 'teaching1' || normalized === 'academic') return 'Teaching';
  if (normalized === 'non-teaching' || normalized === 'non teaching' || normalized === 'non-teaching8') {
    return 'Non-Teaching';
  }
  if (normalized === 'driver/supporting staff') return 'DRIVER/SUPPORTING STAFF';
  if (normalized === 'admin') return 'ADMIN';
  return null;
}

export function isValidStaffCategory(value: unknown): value is (typeof STAFF_CATEGORIES)[number] {
  return STAFF_CATEGORIES.includes(String(value).trim() as (typeof STAFF_CATEGORIES)[number]);
}

export function isValidStaffReligion(value: unknown): value is (typeof STAFF_RELIGIONS)[number] {
  return STAFF_RELIGIONS.includes(String(value).trim() as (typeof STAFF_RELIGIONS)[number]);
}
