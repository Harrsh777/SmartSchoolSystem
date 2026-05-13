/**
 * School code assigned on admin approval:
 * {first word of school name}{MM}{YY}/{approval serial}
 * Example: LORETO0426/01 — Loreto, April 2026, first approval with that prefix.
 */

const MAX_NAME_PART_LEN = 20;

function firstWordNamePart(schoolName: string): string {
  const raw = schoolName.trim().split(/\s+/)[0] ?? '';
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!cleaned) {
    return 'SCH';
  }
  return cleaned.slice(0, MAX_NAME_PART_LEN);
}

/** Prefix only: e.g. LORETO0426 */
export function buildSchoolApprovalCodePrefix(
  schoolName: string,
  approvalDate: Date
): string {
  const namePart = firstWordNamePart(schoolName);
  const mm = String(approvalDate.getMonth() + 1).padStart(2, '0');
  const yy = String(approvalDate.getFullYear() % 100).padStart(2, '0');
  return `${namePart}${mm}${yy}`;
}

/** Full code for a given serial (min width 2 for 1–99, then natural length). */
export function formatSchoolApprovalCode(prefix: string, serial: number): string {
  const n = serial < 1 ? 1 : serial;
  const suffix = n < 100 ? String(n).padStart(2, '0') : String(n);
  return `${prefix}/${suffix}`;
}

/** Next serial for this prefix from existing `school_code` values in accepted_schools. */
export function computeNextApprovalSerial(
  existingSchoolCodes: string[],
  prefix: string
): number {
  const needle = `${prefix}/`;
  let max = 0;
  for (const code of existingSchoolCodes) {
    if (typeof code !== 'string' || !code.startsWith(needle)) continue;
    const rest = code.slice(needle.length);
    const parsed = parseInt(rest, 10);
    if (!Number.isNaN(parsed)) {
      max = Math.max(max, parsed);
    }
  }
  return max + 1;
}
