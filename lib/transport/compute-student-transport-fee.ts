/**
 * Transport fee for a student using periodic stop charges or an optional flat override.
 */

import type { TransportBillingFrequency } from '@/lib/transport/transport-billing-period';

export type StopFareRow = {
  pickup_fare: number | null | undefined;
  drop_fare: number | null | undefined;
};

export type StopPeriodicRow = StopFareRow & {
  monthly_pickup_fee?: number | null | undefined;
  monthly_drop_fee?: number | null | undefined;
  quarterly_pickup_fee?: number | null | undefined;
  quarterly_drop_fee?: number | null | undefined;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function monthlyPickupPortion(stop: StopPeriodicRow | null): number {
  if (!stop) return 0;
  const m = Number(stop.monthly_pickup_fee ?? 0);
  if (Number.isFinite(m) && m > 0) return round2(m);
  return 0;
}

function monthlyDropPortion(stop: StopPeriodicRow | null): number {
  if (!stop) return 0;
  const m = Number(stop.monthly_drop_fee ?? 0);
  if (Number.isFinite(m) && m > 0) return round2(m);
  return 0;
}

function quarterlyPickupPortion(stop: StopPeriodicRow | null): number {
  if (!stop) return 0;
  const q = Number(stop.quarterly_pickup_fee ?? 0);
  if (Number.isFinite(q) && q > 0) return round2(q);
  return round2(monthlyPickupPortion(stop) * 3);
}

function quarterlyDropPortion(stop: StopPeriodicRow | null): number {
  if (!stop) return 0;
  const q = Number(stop.quarterly_drop_fee ?? 0);
  if (Number.isFinite(q) && q > 0) return round2(q);
  return round2(monthlyDropPortion(stop) * 3);
}

export function computeTransportFeeFromStops(params: {
  pickupStop: StopFareRow | null;
  dropStop: StopFareRow | null;
  customFare: number | null | undefined;
}): { total: number; fromCustom: boolean; pickupPortion: number; dropPortion: number } {
  const custom =
    params.customFare != null && Number.isFinite(Number(params.customFare))
      ? Math.round(Number(params.customFare) * 100) / 100
      : null;
  if (custom != null && custom >= 0) {
    return { total: custom, fromCustom: true, pickupPortion: 0, dropPortion: 0 };
  }

  let pickupPortion = 0;
  let dropPortion = 0;
  if (params.pickupStop) {
    const p = Number(params.pickupStop.pickup_fare ?? 0);
    if (Number.isFinite(p) && p > 0) pickupPortion = Math.round(p * 100) / 100;
  }
  if (params.dropStop) {
    const d = Number(params.dropStop.drop_fare ?? 0);
    if (Number.isFinite(d) && d > 0) dropPortion = Math.round(d * 100) / 100;
  }
  const total = Math.round((pickupPortion + dropPortion) * 100) / 100;
  return { total, fromCustom: false, pickupPortion, dropPortion };
}

/**
 * Per billing period (month or quarter) amount from monthly/quarterly stop fields.
 */
export function computePeriodicTransportFeeFromStops(params: {
  pickupStop: StopPeriodicRow | null;
  dropStop: StopPeriodicRow | null;
  frequency: TransportBillingFrequency;
  customFare: number | null | undefined;
}): { total: number; fromCustom: boolean; pickupPortion: number; dropPortion: number } {
  const custom =
    params.customFare != null && Number.isFinite(Number(params.customFare))
      ? round2(Number(params.customFare))
      : null;
  if (custom != null && custom >= 0) {
    return { total: custom, fromCustom: true, pickupPortion: 0, dropPortion: 0 };
  }

  const isQ = params.frequency === 'QUARTERLY';
  let pickupPortion = 0;
  let dropPortion = 0;
  if (params.pickupStop) {
    pickupPortion = isQ ? quarterlyPickupPortion(params.pickupStop) : monthlyPickupPortion(params.pickupStop);
  }
  if (params.dropStop) {
    dropPortion = isQ ? quarterlyDropPortion(params.dropStop) : monthlyDropPortion(params.dropStop);
  }
  const total = round2(pickupPortion + dropPortion);
  return { total, fromCustom: false, pickupPortion, dropPortion };
}
