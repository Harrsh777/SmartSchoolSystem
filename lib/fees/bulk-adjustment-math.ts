import type { MergedManualLine } from '@/lib/fees/class-fee-line-adjustments';

export type BulkChargeType = 'discount' | 'fine' | 'additional_charge';
export type BulkValueMode = 'absolute' | 'percent';

export type BulkAdjustmentInput = {
  charge_type: BulkChargeType;
  value_mode: BulkValueMode;
  /** Percent (0–100] or absolute ₹ amount (> 0). */
  value: number;
  label?: string;
};

/**
 * Multiple manual lines on one installment are **additive** (each stored separately).
 * Percent discounts are calculated on: base + rule adjustments + existing positive misc/fine lines.
 */
export function mapChargeTypeToKind(chargeType: BulkChargeType): 'discount' | 'misc' {
  return chargeType === 'discount' ? 'discount' : 'misc';
}

export function defaultBulkLabel(chargeType: BulkChargeType, custom?: string): string {
  const t = String(custom || '').trim();
  if (t) return t;
  if (chargeType === 'discount') return 'Discount';
  if (chargeType === 'fine') return 'Fine';
  return 'Additional charge';
}

export function validateBulkValue(input: BulkAdjustmentInput): string | null {
  const v = Number(input.value);
  if (!Number.isFinite(v)) return 'Enter a valid number';
  if (input.value_mode === 'percent') {
    if (v <= 0) return 'Percentage must be greater than 0';
    if (v > 100) return 'Percentage cannot exceed 100%';
    const decimals = String(input.value).split('.')[1];
    if (decimals && decimals.length > 2) return 'Use at most 2 decimal places for percentage';
    return null;
  }
  if (v <= 0) return 'Amount must be greater than 0';
  return null;
}

export function miscSubtotalFromLines(lines: MergedManualLine[]): number {
  return lines
    .filter((l) => l.kind === 'misc' && Number(l.amount) > 0)
    .reduce((s, l) => s + Number(l.amount || 0), 0);
}

export function discountSubtotalFromLines(lines: MergedManualLine[]): number {
  return lines
    .filter((l) => l.kind === 'discount')
    .reduce((s, l) => s + Math.abs(Number(l.amount || 0)), 0);
}

/** Base used when computing a new percent discount (matches Collect Payment). */
export function baseForPercentDiscount(
  baseAmount: number,
  rulesAdjustmentDelta: number,
  existingLines: MergedManualLine[]
): number {
  return Math.max(0, baseAmount + rulesAdjustmentDelta + miscSubtotalFromLines(existingLines));
}

/**
 * Signed line amount to store (discount negative, misc/fine positive).
 */
export function computeBulkLineAmount(
  input: BulkAdjustmentInput,
  ctx: {
    base_amount: number;
    rules_adjustment_delta: number;
    existing_lines: MergedManualLine[];
  }
): { signedAmount: number; error: string | null } {
  const valueErr = validateBulkValue(input);
  if (valueErr) return { signedAmount: 0, error: valueErr };

  const v = Number(input.value);
  let magnitude = 0;

  if (input.value_mode === 'percent') {
    const base =
      input.charge_type === 'discount'
        ? baseForPercentDiscount(ctx.base_amount, ctx.rules_adjustment_delta, ctx.existing_lines)
        : Math.max(0, ctx.base_amount + ctx.rules_adjustment_delta);
    magnitude = (base * v) / 100;
  } else {
    magnitude = v;
  }

  magnitude = Math.round(magnitude * 100) / 100;
  if (!Number.isFinite(magnitude) || magnitude <= 0) {
    return { signedAmount: 0, error: 'Invalid calculated amount' };
  }

  const signed =
    input.charge_type === 'discount' ? -magnitude : magnitude;

  return { signedAmount: signed, error: null };
}

/**
 * Payable before late fee: base + rules + sum(manual lines) + proposed line.
 * Must stay >= 0 (paid amounts handled separately via balance_due).
 */
export function projectedPayableBeforeLate(
  baseAmount: number,
  rulesAdjustmentDelta: number,
  existingLines: MergedManualLine[],
  proposedSignedLine: number
): number {
  const existingSum = existingLines.reduce((s, l) => s + Number(l.amount || 0), 0);
  return (
    Math.round((baseAmount + rulesAdjustmentDelta + existingSum + proposedSignedLine) * 100) / 100
  );
}

export function validateProjectedPayable(
  projected: number,
  paidAmount: number
): string | null {
  if (projected < 0) {
    return 'This adjustment would make the installment total negative. Reduce the discount or remove other discounts first.';
  }
  const balance = projected - Number(paidAmount || 0);
  if (balance < 0) {
    return 'This adjustment would make the balance due negative for this installment.';
  }
  return null;
}
