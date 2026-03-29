/** Case-insensitive match between fee structure scope and UI class/section/year selection. */

export function academicYearMatchesStructure(
  structAy: string | null | undefined,
  selected: string | null | undefined
): boolean {
  const s = selected != null ? String(selected).trim() : '';
  const a = structAy != null ? String(structAy).trim() : '';
  if (!a) return true;
  if (!s) return true;
  return a === s;
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
