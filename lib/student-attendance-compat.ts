/** PostgREST / DB missing column on student_attendance */
export function isMissingStudentAttendanceAcademicYearIdColumn(err: {
  message?: string;
  code?: string;
}): boolean {
  const m = String(err.message || '');
  return (
    err.code === 'PGRST204' ||
    /Could not find the 'academic_year_id' column/i.test(m) ||
    /column "academic_year_id" does not exist/i.test(m)
  );
}

export function stripAcademicYearIdFromAttendanceRows<T extends Record<string, unknown>>(
  rows: T[]
): Record<string, unknown>[] {
  return rows.map((row) => {
    const { academic_year_id: _a, ...rest } = row;
    void _a;
    return rest;
  });
}
