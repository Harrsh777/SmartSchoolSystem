/**
 * Canonical copy checking types for API/UI.
 * DB may still contain legacy work_type `class_work` and legacy status colors.
 */

export type CopyCheckingWorkTypeClient = 'homework' | 'classwork';

/** Stored in database */
export type CopyCheckingWorkTypeDb = 'homework' | 'class_work';

export type CopyCheckingStatus = 'not_checked' | 'checked' | 'missing' | 'late';
type CopyCheckingStatusDb = 'not_checked' | 'completed' | 'missing' | 'late';

export type CopyCheckingStats = {
  not_checked: number;
  checked: number;
  missing: number;
  late: number;
};

export function workTypeToDb(raw: string): CopyCheckingWorkTypeDb {
  const x = String(raw || '')
    .toLowerCase()
    .trim();
  if (x === 'homework') return 'homework';
  return 'class_work';
}

/** Query param / client → DB value for lookups */
export function workTypeFromClient(raw: string): CopyCheckingWorkTypeDb {
  return workTypeToDb(raw);
}

export function workTypeToClient(db: string | null | undefined): CopyCheckingWorkTypeClient {
  const x = String(db || '').toLowerCase();
  return x === 'homework' ? 'homework' : 'classwork';
}

/** Map legacy + new input to canonical status for storage (DB expects `completed`) */
export function normalizeStatusForStorage(raw: string | null | undefined): CopyCheckingStatusDb {
  const s = String(raw || '')
    .toLowerCase()
    .trim();
  if (s === 'checked' || s === 'completed' || s === 'green') return 'completed';
  if (s === 'late' || s === 'yellow') return 'late';
  if (s === 'missing' || s === 'red' || s === 'absent') return 'missing';
  if (
    s === 'not_checked' ||
    s === 'not_marked' ||
    s === 'pending' ||
    s === '' ||
    s === 'unchecked'
  ) {
    return 'not_checked';
  }
  return 'not_checked';
}

export function normalizeStatusForDisplay(raw: string | null | undefined): CopyCheckingStatus {
  const s = String(raw || '')
    .toLowerCase()
    .trim();
  if (s === 'completed' || s === 'checked' || s === 'green') return 'checked';
  if (s === 'late' || s === 'yellow') return 'late';
  if (s === 'missing' || s === 'red' || s === 'absent') return 'missing';
  return 'not_checked';
}

export function emptyCopyCheckingStats(): CopyCheckingStats {
  return { not_checked: 0, checked: 0, missing: 0, late: 0 };
}

export function tallyCopyCheckingStatuses(
  statuses: Array<string | null | undefined>
): CopyCheckingStats {
  const out = emptyCopyCheckingStats();
  for (const raw of statuses) {
    const s = normalizeStatusForDisplay(raw);
    out[s] += 1;
  }
  return out;
}
