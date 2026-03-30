/** Normalize class/section strings for case-insensitive comparison (matches students table). */
export function normField(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

export function classMatches(studentClass: string | null | undefined, filterClass: string | null): boolean {
  if (!filterClass) return true;
  return normField(studentClass) === normField(filterClass);
}

export function sectionMatches(
  studentSection: string | null | undefined,
  filterSection: string | null
): boolean {
  if (!filterSection) return true;
  return normField(studentSection) === normField(filterSection);
}
