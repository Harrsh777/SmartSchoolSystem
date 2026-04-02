/**
 * Parse messy Excel class/section cells into canonical { class, section }.
 * Used by student import (Excel + CSV) before validating against `classes` table.
 */

export type ParseClassSectionResult =
  | { ok: true; class: string; section: string }
  | { ok: false; error: string };

function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Strip leading "class" label (any case). */
function stripClassPrefix(s: string): string {
  return collapseSpaces(s.replace(/^class\s+/i, '').trim());
}

/**
 * Try to parse a single cell that contains both class and section, e.g.:
 * "Class - 1 A", "1-A", "1 - A", "1 A", "10-B"
 */
export function parseCombinedClassField(raw: string): ParseClassSectionResult {
  let s = collapseSpaces(String(raw ?? ''));
  if (!s) {
    return { ok: false, error: 'Class is required' };
  }
  s = stripClassPrefix(s);

  // "1-A", "1 – A", "1/ A"
  const dashParts = /^(.+?)\s*[-–/]\s*(.+)$/.exec(s);
  if (dashParts) {
    const left = stripClassPrefix(dashParts[1]);
    const right = collapseSpaces(dashParts[2]);

    // Left is class number/name, right is section (e.g. "A")
    if (/^[A-Za-z0-9]{1,6}$/.test(right) && left.length > 0) {
      const cls = extractClassToken(left);
      if (cls) {
        return { ok: true, class: cls, section: right.toUpperCase() };
      }
    }

    // "Class - 1 A" → left "Class", right "1 A"
    const inner = /^(\d{1,2})\s+([A-Za-z0-9]{1,6})$/i.exec(right);
    if (inner) {
      return { ok: true, class: inner[1], section: inner[2].toUpperCase() };
    }

    // Left might be "1", right "A" after trimming
    const cls2 = extractClassToken(left);
    if (cls2 && /^[A-Za-z0-9]{1,6}$/.test(right)) {
      return { ok: true, class: cls2, section: right.toUpperCase() };
    }
  }

  // "1 A", "10 B" (space between)
  const spaceMatch = /^(\d{1,2})\s+([A-Za-z0-9]{1,6})$/i.exec(s);
  if (spaceMatch) {
    return { ok: true, class: spaceMatch[1], section: spaceMatch[2].toUpperCase() };
  }

  // Single token like "1A" → class 1, section A (last char letter)
  const compact = /^(\d{1,2})([A-Za-z])$/i.exec(s.replace(/\s/g, ''));
  if (compact) {
    return { ok: true, class: compact[1], section: compact[2].toUpperCase() };
  }

  return {
    ok: false,
    error: `Could not parse class/section from "${raw}". Use Class column (e.g. 1) and Section (e.g. A), or values like "1-A", "1 A", or "Class - 1 A".`,
  };
}

/** Pull main class token: digits, or text after removing "class". */
function extractClassToken(left: string): string | null {
  const t = stripClassPrefix(left);
  const digits = t.match(/\d{1,2}/);
  if (digits) return digits[0];
  if (/^(nursery|lkg|ukg|prep|kg)$/i.test(t)) {
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  }
  return t.length > 0 ? t : null;
}

/** Normalize standalone Class column value. */
export function normalizeStandaloneClassToken(raw: string): string {
  const s = stripClassPrefix(collapseSpaces(raw));
  const extracted = extractClassToken(s);
  return extracted ?? s;
}

/** Normalize standalone Section column (usually one letter). */
export function normalizeStandaloneSectionToken(raw: string): string {
  return collapseSpaces(String(raw ?? '')).toUpperCase();
}

/**
 * Parse from row: supports separate columns or combined class cell.
 */
export function parseStudentImportClassSection(params: {
  class?: unknown;
  section?: unknown;
}): ParseClassSectionResult {
  const classStr = String(params.class ?? '').trim();
  const secStr = String(params.section ?? '').trim();

  if (classStr && secStr) {
    const c = normalizeStandaloneClassToken(classStr);
    const s = normalizeStandaloneSectionToken(secStr);
    if (!c || !s) {
      return { ok: false, error: 'Class and section are required' };
    }
    return { ok: true, class: c, section: s };
  }

  if (classStr && !secStr) {
    return parseCombinedClassField(classStr);
  }

  if (!classStr && secStr) {
    const fromSec = parseCombinedClassField(secStr);
    if (fromSec.ok) return fromSec;
    return { ok: false, error: 'Class is required (Section alone is not enough)' };
  }

  return { ok: false, error: 'Class and section are required' };
}

export type ClassAllowRow = { class: unknown; section: unknown; academic_year: unknown };

/**
 * Map normalized key → canonical row from `classes` table (same idea as import API).
 */
export function buildClassAllowListMap(
  rows: ClassAllowRow[],
  fallbackYear: string
): Map<string, { class: string; section: string; academic_year: string }> {
  const map = new Map<string, { class: string; section: string; academic_year: string }>();
  const fy = String(fallbackYear ?? '').trim();
  for (const c of rows) {
    const ay = String(c.academic_year ?? '').trim() || fy;
    const cls = String(c.class ?? '').trim();
    const sec = String(c.section ?? '').trim();
    const key = `${cls.toUpperCase()}-${sec.toUpperCase()}-${ay}`;
    map.set(key, { class: cls, section: sec, academic_year: ay });
  }
  return map;
}

/**
 * Match parsed class/section to an allowed row for the given academic year.
 */
export function matchCanonicalClassFromAllowList(
  parsed: { class: string; section: string },
  academicYear: string,
  rows: ClassAllowRow[],
  fallbackYear: string
): { class: string; section: string; academic_year: string } | null {
  const map = buildClassAllowListMap(rows, fallbackYear);
  const year = String(academicYear ?? '').trim() || String(fallbackYear).trim();
  const key = `${parsed.class.toUpperCase()}-${parsed.section.toUpperCase()}-${year}`;
  return map.get(key) ?? null;
}
