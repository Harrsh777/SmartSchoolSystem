export function computeLateFee(
  dueDate: string,
  baseAmount: number,
  lateFeeType: string | null,
  lateFeeValue: number,
  gracePeriodDays: number
): number {
  if (!lateFeeType) return 0;
  const currentDate = new Date();
  const due = new Date(dueDate);
  const effectiveDue = new Date(due);
  effectiveDue.setDate(effectiveDue.getDate() + gracePeriodDays);
  if (currentDate <= effectiveDue) return 0;
  const daysLate = Math.floor(
    (currentDate.getTime() - effectiveDue.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysLate <= 0) return 0;
  if (lateFeeType === 'flat') return lateFeeValue || 0;
  if (lateFeeType === 'per_day') return (lateFeeValue || 0) * daysLate;
  if (lateFeeType === 'percentage')
    return ((baseAmount * (lateFeeValue || 0)) / 100) * daysLate;
  return 0;
}
