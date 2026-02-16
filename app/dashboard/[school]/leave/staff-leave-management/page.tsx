'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  ArrowLeft,
  CalendarDays,
  Search,
  Download,
  User,
  Briefcase,
  Filter,
  AlertTriangle,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface LeaveTypeInfo {
  id: string;
  name: string;
  abbreviation: string;
  max_days_per_month: number | null;
}

interface LeaveSummaryItem {
  name: string;
  abbr: string;
  maxPerMonth: number | null;
  taken: number;
  takenThisMonth: number;
  remaining: number;
}

interface StaffLeaveSummary {
  staff_id: string;
  staff_name: string;
  staff_id_display: string;
  department: string;
  role: string;
  leave_summary: Record<string, LeaveSummaryItem>;
}

interface LeaveDayDetail {
  leave_type_id: string;
  leave_type_abbr: string;
  leave_type_name: string;
  dates: string[];
}

interface StaffLeaveDetail {
  staff_id: string;
  staff_name: string;
  staff_id_display: string;
  department: string;
  role: string;
  leave_days: LeaveDayDetail[];
}

export default function StaffLeaveManagementPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [staff, setStaff] = useState<StaffLeaveSummary[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [staffNameFilter, setStaffNameFilter] = useState('');
  const [detailStaff, setDetailStaff] = useState<StaffLeaveSummary | null>(null);
  const [detailData, setDetailData] = useState<StaffLeaveDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ school_code: schoolCode });
      if (month) params.set('month', month);
      if (leaveTypeFilter) params.set('leave_type_id', leaveTypeFilter);
      if (departmentFilter) params.set('department', departmentFilter);
      if (staffNameFilter.trim()) params.set('staff_name', staffNameFilter.trim());
      const res = await fetch(`/api/leave/staff-summary?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setStaff(json.data.staff || []);
        setLeaveTypes(json.data.leaveTypes || []);
      }
    } catch (err) {
      console.error('Error fetching staff leave summary:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolCode, month, leaveTypeFilter, departmentFilter, staffNameFilter]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleDownload = () => {
    const header = [
      'Staff ID',
      'Staff Name',
      'Department',
      'Role',
      ...leaveTypes.flatMap((lt) => [`${lt.abbreviation} Taken`, `${lt.abbreviation} This Month`, `${lt.abbreviation} Remaining`]),
    ];
    const rows: (string | number)[][] = [header];
    staff.forEach((s) => {
      const row = [
        s.staff_id_display,
        s.staff_name,
        s.department,
        s.role,
        ...leaveTypes.flatMap((lt) => {
          const sum = s.leave_summary[lt.id];
          return [sum?.taken ?? 0, sum?.takenThisMonth ?? 0, sum?.remaining ?? '-'];
        }),
      ];
      rows.push(row);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `staff-leave-report-${month || 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const getProgressColor = (taken: number, max: number | null) => {
    if (max == null || max === 0) return 'bg-slate-200';
    const pct = (taken / max) * 100;
    if (pct >= 100) return 'bg-red-500';
    if (pct >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const openDetail = async (s: StaffLeaveSummary) => {
    setDetailStaff(s);
    setDetailData(null);
    setLoadingDetail(true);
    try {
      const params = new URLSearchParams({
        school_code: schoolCode,
        month,
        staff_id: s.staff_id,
      });
      const res = await fetch(`/api/leave/staff-leave-detail?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.data?.staff?.length) {
        setDetailData(json.data.staff[0]);
      }
    } catch (err) {
      console.error('Error fetching staff leave detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDownloadDetailed = async () => {
    try {
      const params = new URLSearchParams({ school_code: schoolCode, month });
      const res = await fetch(`/api/leave/staff-leave-detail?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.data?.staff) return;
      const header = ['Staff ID', 'Staff Name', 'Department', 'Role', 'Leave Type', 'Date'];
      const rows: string[][] = [header];
      for (const s of json.data.staff as StaffLeaveDetail[]) {
        for (const ld of s.leave_days) {
          for (const date of ld.dates) {
            rows.push([
              s.staff_id_display,
              s.staff_name,
              s.department,
              s.role,
              `${ld.leave_type_abbr} (${ld.leave_type_name})`,
              date,
            ]);
          }
        }
      }
      if (rows.length === 1) rows.push(['No leave days in this month for the current filters.', '', '', '', '', '']);
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `staff-leave-detail-${month}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Error downloading detailed report:', err);
    }
  };

  const formatDetailDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const monthLabel = month
    ? new Date(month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#F8FAFC]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
            <CalendarDays className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Staff Leave Management</h1>
            <p className="text-sm text-[#64748B]">Track leave usage across staff</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/leave`)}
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <Download size={18} className="mr-2" />
            Summary report
          </Button>
          <Button
            onClick={handleDownloadDetailed}
            className="bg-[#1e3a8a] text-white hover:bg-[#1e40af]"
          >
            <FileSpreadsheet size={18} className="mr-2" />
            Detailed report
          </Button>
        </div>
      </motion.div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={18} className="text-[#64748B]" />
          <span className="text-sm font-semibold text-[#0F172A]">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a8a] focus:border-[#1e3a8a]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Leave type</label>
            <select
              value={leaveTypeFilter}
              onChange={(e) => setLeaveTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">All</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Department</label>
            <Input
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              placeholder="e.g. Teaching"
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Staff name</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
              <Input
                value={staffNameFilter}
                onChange={(e) => setStaffNameFilter(e.target.value)}
                placeholder="Search by name"
                className="pl-8 text-sm"
              />
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1e3a8a] border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {staff.map((s, index) => (
            <motion.div
              key={s.staff_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card
                className="p-4 h-full border border-[#E2E8F0] hover:border-[#1e3a8a]/30 hover:shadow-md transition-all cursor-pointer"
                onClick={() => openDetail(s)}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {s.staff_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#0F172A] truncate">{s.staff_name}</p>
                    <p className="text-xs text-[#64748B] font-mono">{s.staff_id_display}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-[#64748B]">
                      <Briefcase size={12} />
                      <span>{s.department || s.role || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {leaveTypes.map((lt) => {
                    const sum = s.leave_summary[lt.id];
                    if (!sum) return null;
                    const nearLimit = sum.maxPerMonth != null && sum.maxPerMonth > 0 && (sum.takenThisMonth / sum.maxPerMonth) >= 0.8;
                    const overLimit = sum.maxPerMonth != null && sum.maxPerMonth > 0 && sum.takenThisMonth >= sum.maxPerMonth;
                    return (
                      <div key={lt.id} className="rounded-lg bg-[#F8FAFC] p-2.5 border border-[#E2E8F0]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-[#0F172A]">{sum.abbr}</span>
                          {overLimit && (
                            <span className="flex items-center gap-0.5 text-xs text-red-600">
                              <AlertTriangle size={12} /> Limit reached
                            </span>
                          )}
                          {nearLimit && !overLimit && (
                            <span className="text-xs text-amber-600">Near limit</span>
                          )}
                        </div>
                        <div className="flex justify-between text-xs text-[#64748B] mb-1">
                          <span>Taken: {sum.takenThisMonth}{sum.maxPerMonth != null ? ` / ${sum.maxPerMonth}` : ''} this month</span>
                          {sum.maxPerMonth != null && <span>Remaining: {sum.remaining}</span>}
                        </div>
                        {sum.maxPerMonth != null && sum.maxPerMonth > 0 && (
                          <div className="h-1.5 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getProgressColor(sum.takenThisMonth, sum.maxPerMonth)}`}
                              style={{ width: `${Math.min(100, (sum.takenThisMonth / sum.maxPerMonth) * 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && staff.length === 0 && (
        <Card className="p-12 text-center">
          <User className="mx-auto text-[#94A3B8]" size={48} />
          <p className="text-[#64748B] mt-2">No staff match the current filters.</p>
        </Card>
      )}

      {/* Staff leave detail modal */}
      {detailStaff != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setDetailStaff(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#E2E8F0]">
              <div>
                <h2 className="text-lg font-semibold text-[#0F172A]">Leave details – {detailStaff.staff_name}</h2>
                <p className="text-sm text-[#64748B]">
                  {detailStaff.staff_id_display} · {detailStaff.department || detailStaff.role || '—'} · {monthLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailStaff(null)}
                className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {loadingDetail ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#1e3a8a] border-t-transparent" />
                </div>
              ) : detailData ? (
                <div className="space-y-4">
                  {detailData.leave_days.length === 0 ? (
                    <p className="text-[#64748B] text-sm">No leave days in this month.</p>
                  ) : (
                    detailData.leave_days.map((ld) => (
                      <div key={ld.leave_type_id} className="border border-[#E2E8F0] rounded-lg overflow-hidden">
                        <div className="px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-2">
                          <span className="font-semibold text-[#0F172A]">{ld.leave_type_abbr}</span>
                          <span className="text-sm text-[#64748B]">{ld.leave_type_name}</span>
                          <span className="text-xs text-[#94A3B8] ml-auto">{ld.dates.length} day(s)</span>
                        </div>
                        <div className="p-3">
                          <div className="flex flex-wrap gap-2">
                            {ld.dates.map((d) => (
                              <span
                                key={d}
                                className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#EAF1FF] text-[#1e3a8a] text-sm font-medium"
                              >
                                {formatDetailDate(d)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-[#64748B] text-sm">Could not load leave details.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
