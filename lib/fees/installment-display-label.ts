/**
 * Build human-readable installment titles. Fee structures often store a static name ending in "Q1";
 * this derives the correct quarter (or month hint) from due_month + academic year bounds.
 */

export function buildAcademicYearMonthOrder(startMonth: number, endMonth: number): number[] {
  const sm = Math.min(12, Math.max(1, Math.floor(Number(startMonth)) || 1));
  const em = Math.min(12, Math.max(1, Math.floor(Number(endMonth)) || 12));
  const order: number[] = [];
  if (em >= sm) {
    for (let m = sm; m <= em; m++) order.push(m);
  } else {
    for (let m = sm; m <= 12; m++) order.push(m);
    for (let m = 1; m <= em; m++) order.push(m);
  }
  return order;
}

function parseDueMonthCalendarPart(dueMonth: string): { year: number; month: number } | null {
  const t = dueMonth.trim();
  const m = t.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
}

/** Remove trailing " Q1" … " Q4" from stored structure names. */
export function stripTrailingQuarterSuffix(structureName: string): string {
  return structureName.replace(/\s+Q[1-4]\s*$/i, '').trim();
}

export function quarterLabelFromDueMonth(
  dueMonth: string,
  startMonth: number,
  endMonth: number
): string | null {
  const parsed = parseDueMonthCalendarPart(dueMonth);
  if (!parsed) return null;
  const order = buildAcademicYearMonthOrder(startMonth, endMonth);
  const idx = order.indexOf(parsed.month);
  if (idx < 0) return null;
  return `Q${Math.floor(idx / 3) + 1}`;
}

function shortMonthYearFromDueMonth(dueMonth: string): string | null {
  const parsed = parseDueMonthCalendarPart(dueMonth);
  if (!parsed) return null;
  const d = new Date(parsed.year, parsed.month - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function installmentDisplayLabel(params: {
  structureName: string;
  frequency?: string | null;
  startMonth: number;
  endMonth: number;
  dueMonth: string;
}): string {
  const rawName = String(params.structureName || '').trim() || 'Fee';
  const base = stripTrailingQuarterSuffix(rawName);
  const freq = String(params.frequency || '').toLowerCase().trim();
  const sm = Number(params.startMonth);
  const em = Number(params.endMonth);

  if (freq === 'quarterly') {
    // Derive Q1–Q4 from this installment's due_month + structure start/end months. Structure names often
    // carry a single trailing "Q4" (or wrong quarter) for the whole template — using that for every row
    // would label Apr/Jul/Oct/Jan installments all as the same quarter.
    const q =
      Number.isFinite(sm) && Number.isFinite(em)
        ? quarterLabelFromDueMonth(params.dueMonth, sm, em)
        : null;
    if (q) return `${base} ${q}`.trim();
    const nameQuarter = rawName.match(/\b(Q[1-4])\b/i);
    if (nameQuarter) {
      return `${base} ${nameQuarter[1].toUpperCase()}`.trim();
    }
    return base || rawName;
  }

  if (freq === 'monthly') {
    const my = shortMonthYearFromDueMonth(params.dueMonth);
    if (my) return `${base} · ${my}`.trim();
  }

  return rawName;
}
