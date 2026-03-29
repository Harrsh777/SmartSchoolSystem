/**
 * Canonical academic year label: two consecutive four-digit years, e.g. 2026-2027.
 * Matches how fee/session logic normalizes labels elsewhere.
 */

export const ACADEMIC_YEAR_NAME_FORMAT_HINT =
  'Use the form YYYY-YYYY (e.g. 2026-2027). Only digits and a single hyphen; the second year must be the next calendar year.';

export type ParsedAcademicYearName = { ok: true; year_name: string } | { ok: false; error: string };

/**
 * Validates and normalizes user input (allows spaces around the hyphen, en/em dash).
 */
export function parseAcademicYearName(raw: string): ParsedAcademicYearName {
  const compact = String(raw ?? '')
    .trim()
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, '');

  const m = compact.match(/^(\d{4})-(\d{4})$/);
  if (!m) {
    return { ok: false, error: `Invalid academic year. ${ACADEMIC_YEAR_NAME_FORMAT_HINT}` };
  }

  const y1 = parseInt(m[1], 10);
  const y2 = parseInt(m[2], 10);
  if (!Number.isFinite(y1) || !Number.isFinite(y2)) {
    return { ok: false, error: `Invalid academic year. ${ACADEMIC_YEAR_NAME_FORMAT_HINT}` };
  }

  if (y2 !== y1 + 1) {
    return {
      ok: false,
      error: `Invalid range: use consecutive years (e.g. ${y1}-${y1 + 1}, not ${y1}-${y2}).`,
    };
  }

  return { ok: true, year_name: `${y1}-${y2}` };
}
