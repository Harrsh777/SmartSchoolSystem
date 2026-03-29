export const MARKS_ENTRY_CODES = ['AB', 'NA', 'EXEMPT', 'ML'] as const;
export type MarksEntryCode = (typeof MARKS_ENTRY_CODES)[number];

export function normalizeMarksEntryCode(raw: unknown): MarksEntryCode | null {
  if (raw == null || raw === '') return null;
  const u = String(raw).trim().toUpperCase();
  if ((MARKS_ENTRY_CODES as readonly string[]).includes(u)) return u as MarksEntryCode;
  return null;
}

/** Human-readable remarks stored with special codes (bulk + manual entry). */
export function remarksForMarksEntryCode(code: MarksEntryCode): string {
  switch (code) {
    case 'AB':
      return 'Absent';
    case 'NA':
      return 'N/A';
    case 'EXEMPT':
      return 'Exempt';
    case 'ML':
      return 'Medical leave';
    default:
      return code;
  }
}
