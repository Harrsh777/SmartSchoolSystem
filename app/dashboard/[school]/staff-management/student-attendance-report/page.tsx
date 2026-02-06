'use client';

import { use, useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  ArrowLeft,
  Download,
  Calendar,
  Users,
  Search,
  X,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Percent,
  ClipboardList,
} from 'lucide-react';

interface Staff {
  id: string;
  staff_id: string;
  full_name: string;
  role: string;
  department: string;
}

interface AttendanceRecord {
  staff_id: string;
  attendance_date: string;
  status: string;
}

interface StaffStats {
  staff: Staff;
  markedDays: number;
  present: number;
  absent: number;
  late: number;
  half_day: number;
  leave: number;
  holiday: number;
  attendancePercent: number | null;
}

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0],
  };
}

export default function StudentAttendanceReportPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const defaultRange = useMemo(() => getDefaultDateRange(), []);

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'percent' | 'marked'>('percent');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadDateFrom, setDownloadDateFrom] = useState(defaultRange.from);
  const [downloadDateTo, setDownloadDateTo] = useState(defaultRange.to);
  const [downloadAllStaff, setDownloadAllStaff] = useState(true);
  const [downloadSelectedIds, setDownloadSelectedIds] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/staff?school_code=${schoolCode}`);
      const result = await res.json();
      if (res.ok && result.data) {
        setStaff(result.data);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolCode]);

  const fetchAttendance = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/attendance/staff?school_code=${schoolCode}&start_date=${dateFrom}&end_date=${dateTo}`
      );
      const result = await res.json();
      if (res.ok && result.data) {
        setAttendance(result.data);
      } else {
        setAttendance([]);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setAttendance([]);
    }
  }, [schoolCode, dateFrom, dateTo]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    if (schoolCode && dateFrom && dateTo) {
      fetchAttendance();
    }
  }, [schoolCode, dateFrom, dateTo, fetchAttendance]);

  // Compute stats per staff: only marked attendance (present, absent, late, half_day, leave, holiday)
  const staffStats: StaffStats[] = useMemo(() => {
    const byStaff = new Map<string, AttendanceRecord[]>();
    attendance.forEach((rec) => {
      const list = byStaff.get(rec.staff_id) || [];
      list.push(rec);
      byStaff.set(rec.staff_id, list);
    });

    return staff.map((s) => {
      const records = byStaff.get(s.id) || [];
      const markedDays = records.length;
      const present = records.filter((r) => r.status === 'present').length;
      const absent = records.filter((r) => r.status === 'absent').length;
      const late = records.filter((r) => r.status === 'late').length;
      const half_day = records.filter((r) => r.status === 'half_day').length;
      const leave = records.filter((r) => r.status === 'leave').length;
      const holiday = records.filter((r) => r.status === 'holiday').length;
      const attendancePercent =
        markedDays > 0 ? Math.round((present / markedDays) * 10000) / 100 : null;

      return {
        staff: s,
        markedDays,
        present,
        absent,
        late,
        half_day,
        leave,
        holiday,
        attendancePercent,
      };
    });
  }, [staff, attendance]);

  const filteredStats = useMemo(() => {
    let list = staffStats;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.staff.full_name?.toLowerCase().includes(q) ||
          s.staff.staff_id?.toLowerCase().includes(q) ||
          s.staff.role?.toLowerCase().includes(q) ||
          s.staff.department?.toLowerCase().includes(q)
      );
    }
    if (sortBy === 'percent') {
      list = [...list].sort((a, b) => {
        const pa = a.attendancePercent ?? -1;
        const pb = b.attendancePercent ?? -1;
        return pb - pa;
      });
    } else if (sortBy === 'marked') {
      list = [...list].sort((a, b) => b.markedDays - a.markedDays);
    } else {
      list = [...list].sort((a, b) =>
        (a.staff.full_name || '').localeCompare(b.staff.full_name || '')
      );
    }
    return list;
  }, [staffStats, searchQuery, sortBy]);

  const toggleDownloadStaff = (id: string) => {
    setDownloadSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllDownloadStaff = () => {
    if (downloadSelectedIds.size === staff.length) {
      setDownloadSelectedIds(new Set());
      setDownloadAllStaff(true);
    } else {
      setDownloadSelectedIds(new Set(staff.map((s) => s.id)));
      setDownloadAllStaff(false);
    }
  };

  const handleDownloadReport = async () => {
    setDownloadError('');
    const from = downloadDateFrom;
    const to = downloadDateTo;
    if (!from || !to) {
      setDownloadError('Please select both From and To dates.');
      return;
    }
    if (new Date(from) > new Date(to)) {
      setDownloadError('From date must be before or equal to To date.');
      return;
    }

    setDownloading(true);
    try {
      const params = new URLSearchParams({
        school_code: schoolCode,
        start_date: from,
        end_date: to,
      });
      if (!downloadAllStaff && downloadSelectedIds.size > 0) {
        params.set('staff_ids', Array.from(downloadSelectedIds).join(','));
      }
      const url = `/api/reports/staff-attendance-marking?${params}`;
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setDownloadError(err.error || 'Failed to generate report.');
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const filename = match ? match[1] : `staff_attendance_report_${schoolCode}_${from}_${to}.xlsx`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      setShowDownloadModal(false);
    } catch (err) {
      console.error('Download error:', err);
      setDownloadError('Failed to download report. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const overallMarked = staffStats.reduce((s, x) => s + x.markedDays, 0);
  const overallPresent = staffStats.reduce((s, x) => s + x.present, 0);
  const overallPercent =
    overallMarked > 0 ? Math.round((overallPresent / overallMarked) * 10000) / 100 : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/dashboard/${schoolCode}/staff-management`)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="text-indigo-600" size={28} />
              Staff Attendance Report
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Attendance percentage based on marked days only
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowDownloadModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm inline-flex items-center gap-2"
        >
          <Download size={18} />
          Download
        </Button>
      </div>

      {/* Date range & summary */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-9 w-full min-w-[140px]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-9 w-full min-w-[140px]"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 ml-auto">
            <div className="px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-100">
              <div className="text-xs text-indigo-600 font-medium">Marked days (total)</div>
              <div className="text-xl font-bold text-indigo-900">{overallMarked}</div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="text-xs text-emerald-600 font-medium">Present (total)</div>
              <div className="text-xl font-bold text-emerald-900">{overallPresent}</div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200">
              <div className="text-xs text-slate-600 font-medium">Overall %</div>
              <div className="text-xl font-bold text-slate-900">
                {overallPercent != null ? `${overallPercent}%` : '—'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Search & sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Search by name, ID, role, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'percent' | 'marked')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="percent">Attendance %</option>
            <option value="marked">Marked days</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : filteredStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Users size={48} className="mb-3 text-gray-300" />
            <p className="font-medium">No staff found</p>
            <p className="text-sm mt-1">
              {searchQuery ? 'Try a different search.' : 'Add staff to see attendance report.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                    Marked days
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                    Present
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                    Absent
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                    Late / Half / Leave
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                    Attendance %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStats.map((row, index) => (
                  <motion.tr
                    key={row.staff.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50/80"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.staff.full_name || '—'}</div>
                      {row.staff.staff_id && (
                        <div className="text-xs text-gray-500">{row.staff.staff_id}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.staff.role || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {row.staff.department || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{row.markedDays}</td>
                    <td className="px-4 py-3 text-sm text-right text-emerald-600 font-medium">
                      {row.present}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-red-600">{row.absent}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {row.late + row.half_day + row.leave}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.attendancePercent != null ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold ${
                            row.attendancePercent >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.attendancePercent >= 75
                                ? 'bg-amber-100 text-amber-800'
                                : row.markedDays > 0
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <Percent size={14} />
                          {row.attendancePercent}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">No marked days</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Download modal */}
      <AnimatePresence>
        {showDownloadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !downloading && setShowDownloadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FileSpreadsheet size={24} className="text-indigo-600" />
                  Download Report
                </h2>
                <button
                  onClick={() => !downloading && setShowDownloadModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto">
                <p className="text-sm text-gray-500">
                  Report includes only marked attendance (present, absent, late, etc.) in the selected date range.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date from</label>
                    <Input
                      type="date"
                      value={downloadDateFrom}
                      onChange={(e) => setDownloadDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date to</label>
                    <Input
                      type="date"
                      value={downloadDateTo}
                      onChange={(e) => setDownloadDateTo(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">Staff selection</label>
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadAllStaff(true);
                        setDownloadSelectedIds(new Set());
                      }}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      All staff
                    </button>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50">
                    <input
                      type="radio"
                      name="staffScope"
                      checked={downloadAllStaff}
                      onChange={() => {
                        setDownloadAllStaff(true);
                        setDownloadSelectedIds(new Set());
                      }}
                      className="text-indigo-600"
                    />
                    <span className="text-sm font-medium">All staff</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 mt-2">
                    <input
                      type="radio"
                      name="staffScope"
                      checked={!downloadAllStaff}
                      onChange={() => setDownloadAllStaff(false)}
                      className="text-indigo-600"
                    />
                    <span className="text-sm font-medium">Select specific staff</span>
                  </label>

                  {!downloadAllStaff && (
                    <div className="mt-4 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3 space-y-2">
                      <button
                        type="button"
                        onClick={selectAllDownloadStaff}
                        className="flex items-center gap-2 text-sm text-indigo-600 hover:underline mb-2"
                      >
                        {downloadSelectedIds.size === staff.length ? (
                          <CheckSquare size={18} />
                        ) : (
                          <Square size={18} />
                        )}
                        {downloadSelectedIds.size === staff.length ? 'Deselect all' : 'Select all'}
                      </button>
                      {staff.map((s) => (
                        <label
                          key={s.id}
                          className="flex items-center gap-2 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={downloadSelectedIds.has(s.id)}
                            onChange={() => toggleDownloadStaff(s.id)}
                            className="rounded border-gray-300 text-indigo-600"
                          />
                          <span className="text-sm text-gray-700">
                            {s.full_name || s.staff_id || s.id}
                          </span>
                          {s.role && (
                            <span className="text-xs text-gray-500">({s.role})</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {downloadError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
                    {downloadError}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => setShowDownloadModal(false)}
                  disabled={downloading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDownloadReport}
                  disabled={
                    downloading ||
                    (!downloadAllStaff && downloadSelectedIds.size === 0)
                  }
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {downloading ? (
                    <>
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Download size={18} className="mr-2" />
                      Download Excel
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
