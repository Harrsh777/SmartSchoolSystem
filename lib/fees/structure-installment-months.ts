/**
 * Compute due_month / due_date rows from a fee structure's schedule (same rules as generate-fees).
 */

export type StructureScheduleInput = {
  start_month: number;
  end_month: number;
  frequency: string;
  payment_due_day?: number | null;
};

export type InstallmentMonthRow = { due_month: string; due_date: string };

function formatDateYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calendar year to anchor start_month (e.g. April 2026 when start_month is 4 and academic year begins 2026).
 */
export function computeInstallmentMonthsFromStructure(
  structure: StructureScheduleInput,
  anchorCalendarYear: number
): InstallmentMonthRow[] {
  const sm = Number(structure.start_month);
  const em = Number(structure.end_month);
  if (!Number.isFinite(sm) || !Number.isFinite(em)) return [];

  let startDate: Date;
  let endDate: Date;

  if (em < sm) {
    startDate = new Date(anchorCalendarYear, sm - 1, 1);
    endDate = new Date(anchorCalendarYear + 1, em, 0);
  } else {
    startDate = new Date(anchorCalendarYear, sm - 1, 1);
    endDate = new Date(anchorCalendarYear, em, 0);
  }

  const months: Date[] = [];
  const freq = String(structure.frequency || '').toLowerCase();

  if (freq === 'monthly') {
    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      months.push(new Date(d));
    }
  } else if (freq === 'quarterly') {
    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 3)) {
      months.push(new Date(d));
    }
  } else if (freq === 'yearly') {
    months.push(new Date(startDate));
  } else {
    for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
      months.push(new Date(d));
    }
  }

  const dueDayDefault = structure.payment_due_day
    ? Math.max(1, Math.min(31, Number(structure.payment_due_day)))
    : 15;

  return months.map((month) => {
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const dueDay = Math.min(dueDayDefault, lastDay);
    const dueDate = new Date(month.getFullYear(), month.getMonth(), dueDay);
    return {
      due_month: formatDateYYYYMMDD(new Date(month.getFullYear(), month.getMonth(), 1)),
      due_date: formatDateYYYYMMDD(dueDate),
    };
  });
}

/** Parse "2026-2027" → 2026; fallback current year. */
export function anchorYearFromAcademicYearLabel(academicYear: string): number {
  const t = academicYear.trim();
  const m = t.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (m) return parseInt(m[1], 10);
  const single = t.match(/^(\d{4})$/);
  if (single) return parseInt(single[1], 10);
  const n = parseInt(t, 10);
  if (!Number.isNaN(n) && n >= 1990 && n <= 2100) return n;
  return new Date().getFullYear();
}
