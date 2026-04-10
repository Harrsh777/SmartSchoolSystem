import * as XLSX from 'xlsx';
import {
  normalizeMarksEntryCode,
  remarksForMarksEntryCode,
  type MarksEntryCode,
} from '@/lib/marks-entry-codes';

/** Exact template headers (order matters for validation). */
export const BULK_MARKS_TEMPLATE_HEADERS = [
  'Student ID',
  'Admission No',
  'Student Name',
  'Class',
  'Section',
  'Marks',
] as const;

export type BulkMarksRosterStudent = {
  id: string;
  admission_no: string | null;
  student_name: string;
  class: string;
  section: string;
};

export type BulkMarksRowError = {
  excel_row: number;
  reason: string;
  student_id?: string;
  admission_no?: string;
};

export type BulkMarksParsedRow = {
  student_id: string;
  marks_obtained: number;
  marks_entry_code: MarksEntryCode | null;
  remarks: string | null;
};

function normHeader(s: unknown): string {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function validateBulkMarksHeaderRow(row: unknown[]): { ok: true } | { ok: false; error: string } {
  if (!row || row.length !== BULK_MARKS_TEMPLATE_HEADERS.length) {
    return {
      ok: false,
      error: `Template must have exactly ${BULK_MARKS_TEMPLATE_HEADERS.length} columns in the header row: ${BULK_MARKS_TEMPLATE_HEADERS.join(' | ')}.`,
    };
  }
  for (let i = 0; i < BULK_MARKS_TEMPLATE_HEADERS.length; i++) {
    if (normHeader(row[i]) !== normHeader(BULK_MARKS_TEMPLATE_HEADERS[i])) {
      return {
        ok: false,
        error: `Invalid header in column ${i + 1}. Expected "${BULK_MARKS_TEMPLATE_HEADERS[i]}" (exact order). Re-download the template from the portal — do not add, remove, or reorder columns.`,
      };
    }
  }
  return { ok: true };
}

/** Scans from the top of the sheet for the fixed header row (supports optional metadata rows above). */
export function findBulkMarksHeaderRowIndex(rows: unknown[][]): number {
  const maxScan = Math.min(rows.length, 80);
  for (let i = 0; i < maxScan; i++) {
    const check = validateBulkMarksHeaderRow(rows[i] as unknown[]);
    if (check.ok) return i;
  }
  return -1;
}

export type BulkMarksSheetMetaParse =
  | { kind: 'none' }
  | { kind: 'ok'; subjectName: string; maxMarks: number }
  | { kind: 'bad'; error: string };

function isBulkMarksRowEmpty(row: unknown[] | undefined): boolean {
  if (!row?.length) return true;
  return row.every((c) => isBulkMarksCellEmpty(c));
}

/**
 * Reads Subject / Maximum marks rows placed directly above the header (portal template).
 * `none` = legacy file with no metadata (header is the first row of the sheet).
 * `bad` = metadata area looks wrong (do not process rows).
 */
export function parseBulkMarksSheetMeta(rows: unknown[][], headerIdx: number): BulkMarksSheetMetaParse {
  if (headerIdx <= 0) {
    return { kind: 'none' };
  }

  let i = headerIdx - 1;
  while (i >= 0 && isBulkMarksRowEmpty(rows[i])) i--;

  if (i < 0) {
    if (headerIdx >= 3) {
      return {
        kind: 'bad',
        error:
          'Missing Subject and Maximum marks rows above the student table. Re-download the template from the portal and do not delete those rows.',
      };
    }
    return { kind: 'none' };
  }

  const maxRow = rows[i] as unknown[];
  const maxLabel = normHeader(maxRow[0]);
  if (maxLabel !== 'maximum marks') {
    if (headerIdx >= 3) {
      return {
        kind: 'bad',
        error:
          'The row directly above the student table must be "Maximum marks" with a number. Re-download the template — do not remove or change the Subject / Maximum marks rows.',
      };
    }
    return { kind: 'none' };
  }

  const maxMarks = Number(String(maxRow[1] ?? '').trim().replace(/,/g, ''));
  if (!Number.isFinite(maxMarks) || maxMarks <= 0) {
    return {
      kind: 'bad',
      error: 'Invalid "Maximum marks" value in the spreadsheet. Re-download the template.',
    };
  }

  const subjIdx = i - 1;
  if (subjIdx < 0) {
    return {
      kind: 'bad',
      error: 'Missing Subject row above Maximum marks. Re-download the template.',
    };
  }

  const subjRow = rows[subjIdx] as unknown[];
  if (normHeader(subjRow[0]) !== 'subject') {
    return {
      kind: 'bad',
      error: 'Missing Subject row above Maximum marks. Re-download the template.',
    };
  }

  const subjectName = String(subjRow[1] ?? '').trim();
  if (!subjectName) {
    return {
      kind: 'bad',
      error: 'Subject name is empty in the spreadsheet. Re-download the template.',
    };
  }

  return { kind: 'ok', subjectName, maxMarks };
}

/** Case- and whitespace-insensitive subject title compare (Latin-friendly; trims Unicode). */
export function bulkMarksSubjectNamesMatch(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFKC')
      .toLowerCase();
  return norm(a) === norm(b);
}

export function isBulkMarksCellEmpty(raw: unknown): boolean {
  return raw == null || String(raw).trim() === '';
}

export function parseMarksCell(
  raw: unknown,
  maxMarks: number
): { ok: true; value: BulkMarksParsedRow['marks_obtained']; code: MarksEntryCode | null } | { ok: false; error: string } {
  const str = String(raw).trim();
  const code = normalizeMarksEntryCode(str);
  if (code) {
    return { ok: true, value: 0, code };
  }
  const n = Number(str);
  if (!Number.isFinite(n)) {
    return { ok: false, error: `Marks must be a number between 0 and ${maxMarks}, or one of: AB, NA, ML, EXEMPT.` };
  }
  if (n < 0) {
    return { ok: false, error: 'Marks cannot be negative.' };
  }
  if (n > maxMarks) {
    return { ok: false, error: `Marks (${n}) exceed maximum (${maxMarks}) for this exam subject.` };
  }
  return { ok: true, value: n, code: null };
}

function normIdentity(s: unknown): string {
  return String(s ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normAdmission(s: unknown): string {
  return String(s ?? '').trim();
}

/**
 * Match row to roster using Student ID (UUID) and/or Admission No.
 * Rejects tampering when both are present but disagree with the database.
 */
export function resolveStudentForBulkRow(
  rowStudentId: unknown,
  rowAdmission: unknown,
  rosterById: Map<string, BulkMarksRosterStudent>,
  rosterByAdmission: Map<string, BulkMarksRosterStudent>
): { ok: true; student: BulkMarksRosterStudent } | { ok: false; error: string } {
  const idRaw = String(rowStudentId ?? '').trim();
  const admRaw = normAdmission(rowAdmission);

  let student: BulkMarksRosterStudent | undefined;

  if (idRaw) {
    student = rosterById.get(idRaw);
    if (student && admRaw) {
      const dbAdm = normAdmission(student.admission_no);
      if (dbAdm && normIdentity(admRaw) !== normIdentity(dbAdm)) {
        return {
          ok: false,
          error: 'Student ID and Admission No do not match the same enrolled student (possible tampering).',
        };
      }
    }
  }

  if (!student && admRaw) {
    student = rosterByAdmission.get(admRaw) ?? rosterByAdmission.get(admRaw.toLowerCase());
    if (student && idRaw && idRaw !== student.id) {
      return {
        ok: false,
        error: 'Admission No maps to a different Student ID than in the file (possible tampering).',
      };
    }
  }

  if (!student) {
    return {
      ok: false,
      error: idRaw
        ? 'Student ID is not enrolled in this class, or admission number does not match.'
        : admRaw
          ? 'Admission number is not enrolled in this class.'
          : 'Student ID or Admission No is required.',
    };
  }

  return { ok: true, student };
}

export function assertIdentityColumnsMatchRoster(
  student: BulkMarksRosterStudent,
  rowName: unknown,
  rowClass: unknown,
  rowSection: unknown
): { ok: true } | { ok: false; error: string } {
  if (normIdentity(rowName) !== normIdentity(student.student_name)) {
    return {
      ok: false,
      error: 'Student Name does not match the enrolled record. Do not edit identity columns — re-download the template.',
    };
  }
  if (normIdentity(rowClass) !== normIdentity(student.class)) {
    return {
      ok: false,
      error: 'Class does not match the enrolled record. Do not edit identity columns — re-download the template.',
    };
  }
  if (normIdentity(rowSection) !== normIdentity(student.section)) {
    return {
      ok: false,
      error: 'Section does not match the enrolled record. Do not edit identity columns — re-download the template.',
    };
  }
  return { ok: true };
}

export function readBulkMarksSheet(buffer: Buffer): { ok: true; rows: unknown[][] } | { ok: false; error: string } {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  } catch {
    return { ok: false, error: 'Could not read the file. Upload a valid .xlsx exported from this system.' };
  }
  const name = workbook.SheetNames[0];
  if (!name) {
    return { ok: false, error: 'The workbook has no sheets.' };
  }
  const sheet = workbook.Sheets[name];
  if (!sheet) {
    return { ok: false, error: 'Missing first worksheet.' };
  }
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];
  return { ok: true, rows };
}

export type BulkMarksTemplateMeta = {
  subjectName: string;
  maxMarks: number;
};

export function buildBulkMarksTemplateBuffer(rows: string[][], meta?: BulkMarksTemplateMeta): Buffer {
  const headerRow = [...BULK_MARKS_TEMPLATE_HEADERS];
  const top: string[][] = meta
    ? [
        ['Subject', meta.subjectName],
        ['Maximum marks', String(meta.maxMarks)],
        [],
        headerRow,
      ]
    : [headerRow];
  const aoa: string[][] = [...top, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Marks');
  const second = XLSX.utils.aoa_to_sheet([
    ['Instructions'],
    ['The Marks sheet lists Subject and Maximum marks above the table — leave those rows as-is.'],
    ['Only edit the Marks column. Use numbers, or AB / NA / ML / EXEMPT.'],
    ['Student ID and Admission No must match enrolled students.'],
    ['Re-uploading the same file updates marks (no duplicate rows).'],
  ]);
  XLSX.utils.book_append_sheet(wb, second, 'Instructions');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer);
}

export function buildParsedRowFromMarks(
  parsed: { value: number; code: MarksEntryCode | null }
): Omit<BulkMarksParsedRow, 'student_id'> {
  const code = parsed.code;
  return {
    marks_obtained: code ? 0 : parsed.value,
    marks_entry_code: code,
    remarks: code ? remarksForMarksEntryCode(code) : null,
  };
}
