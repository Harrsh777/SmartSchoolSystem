/** Case-insensitive match between fee structure scope and UI class/section/year selection. */

/**
 * Canonicalize labels like "2026-2027", "2026-27", "2026 - 2027" for comparison.
 * Empty string if unrecognised (caller falls back to case-insensitive raw compare).
 */
export function normalizeAcademicYearLabel(input: string | null | undefined): string {
  const raw = String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
  if (!raw) return '';
  const full = raw.match(/^(\d{4})-(\d{4})$/);
  if (full) return `${full[1]}-${full[2]}`;
  const shortSecond = raw.match(/^(\d{4})-(\d{2})$/);
  if (shortSecond) {
    const y1 = shortSecond[1];
    const d2 = parseInt(shortSecond[2], 10);
    if (!Number.isFinite(d2) || d2 < 0 || d2 > 99) return '';
    const y2 = 2000 + d2;
    return `${y1}-${y2}`;
  }
  return raw;
}

export function academicYearMatchesStructure(
  structAy: string | null | undefined,
  selected: string | null | undefined
): boolean {
  const s = selected != null ? String(selected).trim() : '';
  const a = structAy != null ? String(structAy).trim() : '';
  if (!a) return true;
  if (!s) return true;
  const na = normalizeAcademicYearLabel(a);
  const ns = normalizeAcademicYearLabel(s);
  if (na && ns) return na === ns;
  return a.toLowerCase() === s.toLowerCase();
}

export function classNameMatchesStructure(
  structClass: string | null | undefined,
  selected: string
): boolean {
  return String(structClass ?? '').trim().toLowerCase() === selected.trim().toLowerCase();
}

export function sectionMatchesStructure(
  structSec: string | null | undefined,
  selected: string
): boolean {
  const s = String(structSec ?? '').trim();
  if (!s) return true;
  return s.toLowerCase() === selected.trim().toLowerCase();
}

export function feeStructureMatchesSelection(
  structure: {
    academic_year?: string | null;
    class_name?: string | null;
    section?: string | null;
  },
  sel: { className: string; section: string; academicYear: string | null | undefined }
): boolean {
  return (
    academicYearMatchesStructure(structure.academic_year, sel.academicYear) &&
    classNameMatchesStructure(structure.class_name, sel.className) &&
    sectionMatchesStructure(structure.section, sel.section)
  );
}

/**
 * Collect Payment list filters: section applies only when a class is chosen (avoids stale section narrowing “All classes”).
 * Class and section compare case-insensitively to match roster vs UI labels.
 */
export function studentMatchesCollectPaymentFilters(
  student: { class?: string; section?: string } | null | undefined,
  classFilter: string,
  sectionFilter: string
): boolean {
  const cf = String(classFilter ?? '').trim();
  const sf = String(sectionFilter ?? '').trim();
  if (!cf) return true;
  const cls = String(student?.class ?? '').trim().toLowerCase();
  if (cls !== cf.toLowerCase()) return false;
  if (!sf) return true;
  const sec = String(student?.section ?? '').trim().toLowerCase();
  return sec === sf.toLowerCase();
}
