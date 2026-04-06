'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, Table2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export type ManualClassOption = {
  id: string;
  class: string;
  section: string;
  academic_year?: string | null;
};

type StudentRow = {
  id: string;
  student_name: string;
  roll_number: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  schoolCode: string;
  staffId: string | null;
  /** True while resolving a staff UUID for school-admin login (no `staff` in session). */
  staffIdResolving?: boolean;
  classes: ManualClassOption[];
};

const PAGE_SIZE = 50;
const DRAFT_PREFIX = 'manual-attendance-draft:';

function sortByRoll(a: StudentRow, b: StudentRow): number {
  const ra = String(a.roll_number ?? '').trim();
  const rb = String(b.roll_number ?? '').trim();
  const byRoll = ra.localeCompare(rb, undefined, { numeric: true });
  if (byRoll !== 0) return byRoll;
  return (a.student_name || '').localeCompare(b.student_name || '');
}

function draftKey(schoolCode: string, classId: string, year: string) {
  return `${DRAFT_PREFIX}${schoolCode}:${classId}:${year}`;
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 3
): Promise<Response> {
  let last: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, init);
      if (res.status >= 500 && i < retries - 1) {
        await new Promise((r) => setTimeout(r, 300 * (i + 1)));
        continue;
      }
      return res;
    } catch (e) {
      last = e instanceof Error ? e : new Error(String(e));
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, 300 * (i + 1)));
      }
    }
  }
  throw last || new Error('Request failed');
}

export default function ManualAttendanceModal({
  open,
  onClose,
  schoolCode,
  staffId,
  staffIdResolving = false,
  classes,
}: Props) {
  const [selectedClassId, setSelectedClassId] = useState('');
  const [twd, setTwd] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [attended, setAttended] = useState<Record<string, string>>({});
  const [fillUnfilledWithZero, setFillUnfilledWithZero] = useState(true);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedMeta = useMemo(
    () => classes.find((c) => c.id === selectedClassId),
    [classes, selectedClassId]
  );

  const academicYearLabel = (selectedMeta?.academic_year ?? '').trim() || '—';

  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const pageSlice = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return students.slice(start, start + PAGE_SIZE);
  }, [students, page]);

  const loadRosterAndSaved = useCallback(async () => {
    if (!selectedClassId || !selectedMeta || !staffId || !schoolCode) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const year = (selectedMeta.academic_year ?? '').trim();
    const params = new URLSearchParams({
      school_code: schoolCode,
      class: selectedMeta.class,
      section: selectedMeta.section ?? '',
      status: 'active',
    });
    if (year) params.set('academic_year', year);

    try {
      if (!year) {
        setError('This class has no academic year; assign one in class setup.');
        setStudents([]);
        setAttended({});
        return;
      }

      const stuRes = await fetch(`/api/students?${params}`, { credentials: 'include' });
      const stuJson = await stuRes.json();
      if (!stuRes.ok) {
        setError(stuJson.error || 'Failed to load students');
        setStudents([]);
        setAttended({});
        return;
      }

      let list = (stuJson.data || []) as StudentRow[];
      list = list.filter((s) => {
        const sy = String((s as { academic_year?: string }).academic_year ?? '').trim();
        return sy === year || sy === '';
      });
      list = [...list].sort(sortByRoll);
      setStudents(list);

      const attendedMap: Record<string, string> = {};
      const manRes = await fetch(
        `/api/attendance/manual?${new URLSearchParams({
          school_code: schoolCode,
          class_id: selectedClassId,
          academic_year: year,
          marked_by: staffId,
        })}`,
        { credentials: 'include' }
      );

      if (manRes.ok) {
        const manJson = await manRes.json();
        const rows = (manJson.data || []) as Array<{
          student_id: string;
          total_working_days: number;
          attended_days: number;
        }>;
        if (rows.length > 0) {
          const twd0 = rows[0].total_working_days;
          setTwd(String(twd0));
          for (const r of rows) {
            attendedMap[r.student_id] = String(r.attended_days);
          }
        } else {
          const dk = draftKey(schoolCode, selectedClassId, year);
          const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(dk) : null;
          if (raw) {
            try {
              const d = JSON.parse(raw) as { twd?: string; attended?: Record<string, string> };
              if (d.twd) setTwd(d.twd);
              if (d.attended) Object.assign(attendedMap, d.attended);
            } catch {
              setTwd('');
            }
          } else {
            setTwd('');
          }
        }
      } else {
        const manJson = await manRes.json().catch(() => ({}));
        if (manRes.status === 503) {
          setError(manJson.details || manJson.error || 'Manual attendance table missing');
        } else {
          setError(manJson.error || 'Failed to load saved manual attendance');
        }
      }

      for (const s of list) {
        if (attendedMap[s.id] === undefined) attendedMap[s.id] = '';
      }
      setAttended(attendedMap);
      setPage(1);
    } catch (e) {
      console.error(e);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, staffId, selectedClassId, selectedMeta]);

  useEffect(() => {
    if (!open) return;
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [open, classes, selectedClassId]);

  useEffect(() => {
    if (!open || !selectedClassId || !staffId) return;
    loadRosterAndSaved();
  }, [open, selectedClassId, staffId, loadRosterAndSaved]);

  useEffect(() => {
    if (!open || !selectedClassId || !selectedMeta || !schoolCode) return;
    const year = (selectedMeta.academic_year ?? '').trim();
    const dk = draftKey(schoolCode, selectedClassId, year);
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          dk,
          JSON.stringify({ twd, attended, at: Date.now() })
        );
      } catch {
        /* quota */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [open, twd, attended, schoolCode, selectedClassId, selectedMeta]);

  const twdNum = parseInt(String(twd).trim(), 10);
  const twdValid = Number.isInteger(twdNum) && twdNum > 0;

  const rowPct = (studentId: string): string => {
    if (!twdValid) return '—';
    const raw = attended[studentId]?.trim() ?? '';
    if (raw === '' || !/^-?\d+$/.test(raw)) return '—';
    const ad = parseInt(raw, 10);
    if (ad < 0 || ad > twdNum) return '—';
    return `${Math.round((ad / twdNum) * 10000) / 100}%`;
  };

  const validateBeforeSubmit = (): string | null => {
    if (staffIdResolving) return 'Still resolving staff record; wait a moment.';
    if (!staffId) return 'No staff user available for audit; cannot save.';
    if (!selectedClassId) return 'Select a class.';
    if (!(selectedMeta?.academic_year ?? '').trim()) return 'Class has no academic year.';
    if (!twdValid) return 'Enter a valid Total Working Days (whole number > 0).';
    if (students.length === 0) return 'No students in this class.';

    const seen = new Set<string>();
    for (const s of students) {
      if (seen.has(s.id)) return 'Duplicate student in list.';
      seen.add(s.id);
      const raw = (attended[s.id] ?? '').trim();
      if (!fillUnfilledWithZero && raw === '') continue;
      const adRaw = fillUnfilledWithZero && raw === '' ? '0' : raw;
      if (adRaw === '') return `Enter attended days for ${s.student_name} or enable auto-fill 0.`;
      if (!/^\d+$/.test(adRaw)) {
        return `Attended days must be whole numbers (${s.student_name}).`;
      }
      const ad = parseInt(adRaw, 10);
      if (ad < 0) return `Attended days cannot be negative (${s.student_name}).`;
      if (ad > twdNum) return `Attended days cannot exceed TWD (${s.student_name}).`;
    }

    if (fillUnfilledWithZero) return null;

    const filled = students.filter((s) => (attended[s.id] ?? '').trim() !== '');
    if (filled.length === 0) {
      return 'Enter at least one student or enable auto-fill 0 for the class.';
    }

    return null;
  };

  const handleSubmit = async () => {
    const v = validateBeforeSubmit();
    if (v) {
      setError(v);
      return;
    }
    if (!staffId || !selectedMeta) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const year = (selectedMeta.academic_year ?? '').trim();
    const records = fillUnfilledWithZero
      ? students.map((s) => {
          const raw = (attended[s.id] ?? '').trim();
          const ad = raw === '' ? 0 : parseInt(raw, 10);
          return { student_id: s.id, attended_days: ad };
        })
      : students
          .filter((s) => (attended[s.id] ?? '').trim() !== '')
          .map((s) => ({
            student_id: s.id,
            attended_days: parseInt((attended[s.id] ?? '').trim(), 10),
          }));

    try {
      const res = await fetchWithRetry('/api/attendance/manual/bulk', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          class_id: selectedClassId,
          academic_year: year,
          total_working_days: twdNum,
          marked_by: staffId,
          fill_unfilled_with_zero: fillUnfilledWithZero,
          records,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || json.details || 'Save failed');
        return;
      }
      setSuccess(json.message || 'Saved successfully.');
      await loadRosterAndSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-attendance-title"
    >
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl border border-gray-200">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 min-w-0">
            <Table2 className="text-orange-600 shrink-0" size={22} />
            <h2 id="manual-attendance-title" className="text-lg font-semibold text-gray-900 truncate">
              Enter global data — manual attendance
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {staffIdResolving && (
            <p className="text-sm text-blue-900 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="animate-spin shrink-0" size={18} />
              Linking a staff record for your school admin session so saves can be audited…
            </p>
          )}
          {!staffId && !staffIdResolving && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              Cannot save without a staff user ID. If you use <strong>school admin</strong> login, add at
              least one staff member (e.g. principal) under Staff Management, or log in via the staff
              portal. <strong>Class teachers</strong> should use staff login.
            </p>
          )}

          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[200px]"
                disabled={classes.length === 0}
              >
                {classes.length === 0 ? (
                  <option value="">No classes</option>
                ) : (
                  classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.class}
                      {c.section ? `-${c.section}` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Academic year</label>
              <p className="text-sm font-medium text-gray-900 py-2 px-1">{academicYearLabel}</p>
            </div>
            <div className="flex-1 min-w-[160px] max-w-xs">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Total working days (TWD)
              </label>
              <Input
                type="text"
                inputMode="numeric"
                value={twd}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, '');
                  setTwd(v);
                }}
                placeholder="e.g. 200"
                className="w-full"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={fillUnfilledWithZero}
              onChange={(e) => setFillUnfilledWithZero(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-fill students you skip with 0 attended days (recommended)
          </label>

          {error && (
            <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg p-3">
              {success}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-600 gap-2">
              <Loader2 className="animate-spin" size={22} />
              Loading students…
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                Percentages below are indicative; the server recalculates on save. Large classes: use
                pagination. Draft is saved in this browser (localStorage).
              </p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[min(420px,50vh)] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-gray-700">Student name</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-700 w-24">Roll no.</th>
                        <th className="text-center px-3 py-2 font-semibold text-gray-700 w-28">TWD</th>
                        <th className="text-center px-3 py-2 font-semibold text-gray-700 w-36">
                          Attended days
                        </th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-700 w-28">Att. %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pageSlice.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50/80">
                          <td className="px-3 py-2 text-gray-900">{s.student_name}</td>
                          <td className="px-3 py-2 text-gray-700">{s.roll_number ?? '—'}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{twdValid ? twdNum : '—'}</td>
                          <td className="px-3 py-2">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={attended[s.id] ?? ''}
                              onChange={(e) => {
                                const v = e.target.value.replace(/[^\d]/g, '');
                                setAttended((prev) => ({ ...prev, [s.id]: v }));
                              }}
                              className="w-full text-center py-1"
                              placeholder={fillUnfilledWithZero ? '0 if empty' : '—'}
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">{rowPct(s.id)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {students.length > PAGE_SIZE && (
                <div className="flex items-center justify-between gap-2 text-sm text-gray-600">
                  <span>
                    Page {page} of {totalPages} ({students.length} students)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={16} className="mr-1" />
                      Prev
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                      <ChevronRight size={16} className="ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex flex-wrap justify-end gap-2 bg-gray-50">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving || loading || !staffId || staffIdResolving}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin inline mr-2" size={16} />
                Saving…
              </>
            ) : (
              'Final submit'
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
