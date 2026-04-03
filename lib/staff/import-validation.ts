import { isValidDateFormat } from '@/lib/date-parser';

/** 10-digit Indian mobile from digits only. */
export function digits10(value: unknown): string | undefined {
  const s = String(value ?? '').replace(/\D/g, '');
  return s.length === 10 ? s : undefined;
}

/** Normalize Aadhaar from Excel/CSV (string, number, or scientific notation). */
export function digits12Aadhaar(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const n = Math.round(value);
    if (n >= 100000000000 && n <= 999999999999) {
      return String(n);
    }
    return undefined;
  }
  const raw = String(value).trim();
  if (/^\d+(\.\d+)?[eE][+-]?\d+$/.test(raw)) {
    const n = Math.round(Number(raw));
    if (Number.isFinite(n) && n >= 100000000000 && n <= 999999999999) {
      return String(n);
    }
  }
  const digits = raw.replace(/\D/g, '');
  return digits.length === 12 ? digits : undefined;
}

export function normalizeStaffGenderForImport(
  value: unknown
): 'Male' | 'Female' | 'Other' | undefined {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const g = raw.toLowerCase();
  if (['male', 'm', 'boy', '1'].includes(g)) return 'Male';
  if (['female', 'f', 'girl', '2'].includes(g)) return 'Female';
  if (['other', 'o', '3'].includes(g)) return 'Other';
  if (raw === 'Male' || raw === 'Female' || raw === 'Other') return raw;
  return undefined;
}

function parseLogicalDate(value: unknown): Date | null {
  const s = String(value ?? '').trim();
  if (!s) return null;
  if (!isValidDateFormat(s)) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type StaffImportFieldErrors = Partial<
  Record<
    | 'full_name'
    | 'role'
    | 'department'
    | 'designation'
    | 'phone'
    | 'contact1'
    | 'date_of_joining'
    | 'dob'
    | 'gender'
    | 'adhar_no'
    | 'category'
    | 'email'
    | 'contact2',
    string
  >
>;

function setErr(
  fieldErrors: StaffImportFieldErrors,
  errors: string[],
  field: keyof StaffImportFieldErrors,
  message: string
) {
  errors.push(message);
  if (!fieldErrors[field]) fieldErrors[field] = message;
}

/**
 * Same rules for single add, CSV parse preview, Excel validate, and bulk import API.
 * Optional fields: validate format only when present (e.g. Aadhaar — 12 digits if filled).
 */
export function validateStaffImportCore(
  data: Record<string, unknown>,
  opts?: { validSubjects?: Set<string> }
): {
  errors: string[];
  fieldErrors: StaffImportFieldErrors;
  warnings: string[];
} {
  const errors: string[] = [];
  const fieldErrors: StaffImportFieldErrors = {};
  const warnings: string[] = [];

  const fullName = String(data.full_name ?? '').trim();
  if (!fullName) setErr(fieldErrors, errors, 'full_name', 'Full name is required');

  const role = String(data.role ?? '').trim();
  if (!role) setErr(fieldErrors, errors, 'role', 'Role is required');

  const department = String(data.department ?? '').trim();
  // Department is optional — many spreadsheets omit it; it can be added later in the directory.

  const designation = String(data.designation ?? '').trim();
  if (
    designation &&
    opts?.validSubjects &&
    opts.validSubjects.size > 0 &&
    !opts.validSubjects.has(designation)
  ) {
    setErr(
      fieldErrors,
      errors,
      'designation',
      'If you enter a designation (subject), it must match a subject name from your timetable'
    );
  }

  const phone = digits10(data.phone);
  if (!String(data.phone ?? '').trim()) setErr(fieldErrors, errors, 'phone', 'Phone is required');
  else if (!phone)
    setErr(fieldErrors, errors, 'phone', 'Phone must be a valid 10-digit number');

  const contact1FromField = digits10(data.contact1);
  const contact1Typed = String(data.contact1 ?? '').trim();
  if (contact1Typed && !contact1FromField) {
    setErr(
      fieldErrors,
      errors,
      'contact1',
      'Primary contact must be a valid 10-digit number'
    );
  }
  // When Primary Contact column is empty, the validated phone number is used as primary contact.

  const dojStr = String(data.date_of_joining ?? '').trim();
  if (!dojStr)
    setErr(fieldErrors, errors, 'date_of_joining', 'Date of joining is required');
  const doj = parseLogicalDate(dojStr);
  if (dojStr && !doj) {
    setErr(
      fieldErrors,
      errors,
      'date_of_joining',
      'Invalid date of joining. Use YYYY-MM-DD, DD-MM-YYYY, or DD/MM/YYYY'
    );
  } else if (doj) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (doj > today)
      setErr(
        fieldErrors,
        errors,
        'date_of_joining',
        'Date of joining cannot be in the future'
      );
  }

  const dobStr = String(data.dob ?? '').trim();
  if (!dobStr) setErr(fieldErrors, errors, 'dob', 'Date of birth is required');
  const dob = parseLogicalDate(dobStr);
  if (dobStr && !dob) {
    setErr(
      fieldErrors,
      errors,
      'dob',
      'Invalid date of birth. Use YYYY-MM-DD, DD-MM-YYYY, or DD/MM/YYYY'
    );
  } else if (dob) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (dob > today)
      setErr(fieldErrors, errors, 'dob', 'Date of birth cannot be in the future');
    if (doj && dob >= doj) {
      setErr(
        fieldErrors,
        errors,
        'dob',
        'Date of birth must be before date of joining'
      );
    }
  }

  const genderNorm = normalizeStaffGenderForImport(data.gender);
  if (!String(data.gender ?? '').trim()) setErr(fieldErrors, errors, 'gender', 'Gender is required');
  else if (!genderNorm) {
    setErr(fieldErrors, errors, 'gender', 'Gender must be Male, Female, or Other');
  }

  const adharRaw = String(data.adhar_no ?? '').trim();
  const adhar = digits12Aadhaar(data.adhar_no);
  if (adharRaw && !adhar) {
    setErr(
      fieldErrors,
      errors,
      'adhar_no',
      'Aadhaar number must be exactly 12 digits when provided'
    );
  }

  const category = String(data.category ?? '').trim();
  if (!category) setErr(fieldErrors, errors, 'category', 'Category is required');

  const email = String(data.email ?? '').trim();
  if (!email) setErr(fieldErrors, errors, 'email', 'Email is required');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setErr(fieldErrors, errors, 'email', 'Invalid email format');
  }

  const contact2 = String(data.contact2 ?? '').trim();
  if (contact2) {
    const c2 = digits10(data.contact2);
    if (!c2)
      setErr(
        fieldErrors,
        errors,
        'contact2',
        'Secondary contact must be a valid 10-digit number'
      );
  }

  const bloodGroup = String(data.blood_group ?? '').trim();
  if (bloodGroup) {
    const valid = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (!valid.includes(bloodGroup.toUpperCase())) {
      warnings.push('Invalid blood group');
    }
  }

  const exp = data.experience_years;
  if (exp !== undefined && exp !== null && String(exp).trim() !== '') {
    const n = typeof exp === 'number' ? exp : parseFloat(String(exp));
    if (Number.isNaN(n) || n < 0) warnings.push('Experience (years) must be a valid non-negative number');
  }

  const website = String(data.website ?? '').trim();
  if (website) {
    try {
      new URL(website);
    } catch {
      warnings.push('Invalid website URL');
    }
  }

  return { errors, fieldErrors, warnings };
}
