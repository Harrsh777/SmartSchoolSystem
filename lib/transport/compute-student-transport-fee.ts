/**
 * Transport fee for a student: sum of selected leg fares, or optional flat override.
 * Pickup-only → pickup_fare; drop-only → drop_fare; both → sum (possibly different stops).
 */

export type StopFareRow = {
  pickup_fare: number | null | undefined;
  drop_fare: number | null | undefined;
};

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
