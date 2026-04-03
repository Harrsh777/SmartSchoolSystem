/**
 * Plain-language messages for bulk import (non-technical users).
 * Server and client can import these helpers — no Node-only APIs.
 */

type DbLikeError = {
  message?: string;
  code?: string;
  details?: string | null;
};

function lower(m: string): string {
  return m.toLowerCase();
}

/** True when Postgres reports a unique violation on staff Aadhaar (any constraint name). */
export function isStaffAdharUniqueViolation(err: DbLikeError): boolean {
  if (err.code !== '23505') return false;
  const msg = lower(err.message || '');
  const details = lower(String(err.details || ''));
  return (
    msg.includes('adhar') ||
    details.includes('adhar') ||
    msg.includes('(adhar_no)') ||
    details.includes('(adhar_no)') ||
    msg.includes('idx_staff_school_code_adhar')
  );
}

export type StaffAdharDuplicateContext = 'same_school' | 'other_school_or_global_db';

/** User-facing text when Aadhaar unique constraint fails. */
export function staffAdharDuplicateMessage(ctx: StaffAdharDuplicateContext): string {
  if (ctx === 'other_school_or_global_db') {
    return (
      'This Aadhaar number is already stored on another staff record in the database ' +
      '(sometimes another school if your database still uses one global Aadhaar rule for all schools). ' +
      'Clear the Aadhaar cell, use a different number, or run the database migration that makes Aadhaar unique per school only (see supabase/migrations in your project).'
    );
  }
  return (
    'This Aadhaar is already on file for another staff member at your school. ' +
    'Use a different 12-digit number, clear the cell, or remove duplicate rows that share the same Aadhaar.'
  );
}

/** Map Postgres / PostgREST errors from staff import inserts/updates. */
export function friendlyStaffImportDbError(err: DbLikeError): string {
  const msg = lower(err.message || '');

  if (isStaffAdharUniqueViolation(err)) {
    return staffAdharDuplicateMessage('same_school');
  }

  if (msg.includes('duplicate') && (msg.includes('phone') || msg.includes('contact'))) {
    return (
      'This row could not be saved: this phone number is already used for another staff member.'
    );
  }

  if (msg.includes('duplicate') && msg.includes('staff')) {
    return 'This row could not be saved: it conflicts with existing staff data (duplicate ID or unique field).';
  }

  if (msg.includes('violates foreign key') || msg.includes('foreign key')) {
    return 'This row could not be saved: a linked value (for example school or subject) is missing or invalid.';
  }

  if (msg.includes('duplicate key')) {
    return 'This row could not be saved: some information in this row already exists in the system and cannot be repeated.';
  }

  return (
    'This row could not be saved. Please check the data. If the problem continues, contact your administrator.'
  );
}

/** Map Postgres / PostgREST errors from student import. */
export function friendlyStudentImportDbError(err: DbLikeError): string {
  const msg = lower(err.message || '');
  const details = lower(String(err.details || ''));

  if (
    msg.includes('admission') &&
    (msg.includes('duplicate') || msg.includes('unique'))
  ) {
    return (
      'This row could not be saved: this admission number is already used for another student at your school.'
    );
  }

  if (
    msg.includes('aadhaar') ||
    (msg.includes('duplicate') && details.includes('aadhaar'))
  ) {
    return (
      'This row could not be saved: the Aadhaar number is already used for another student. ' +
      'Use a different number or leave Aadhaar empty if allowed.'
    );
  }

  if (msg.includes('duplicate') && (msg.includes('email') || details.includes('email'))) {
    return 'This row could not be saved: this email address is already used for another student.';
  }

  if (msg.includes('duplicate') && (msg.includes('roll') || details.includes('roll'))) {
    return 'This row could not be saved: this roll number is already used in that class.';
  }

  if (msg.includes('violates foreign key') || msg.includes('foreign key')) {
    return 'This row could not be saved: class, section, or another linked field is missing or invalid.';
  }

  if (msg.includes('duplicate key')) {
    return 'This row could not be saved: some information already exists and cannot be repeated.';
  }

  return (
    'This row could not be saved. Please check the data. If the problem continues, contact your administrator.'
  );
}

/** Turn technical DB/validation text into short copy for import result screens. */
export function simplifyValidationErrorForUser(message: string): string {
  const m = message.trim();
  const low = lower(m);
  if (
    m.includes('duplicate key value violates unique constraint') ||
    low.includes('unique constraint')
  ) {
    if (
      low.includes('student') ||
      low.includes('admission') ||
      low.includes('aadhaar_number')
    ) {
      return friendlyStudentImportDbError({ message: m });
    }
    return friendlyStaffImportDbError({ message: m });
  }
  return m;
}
