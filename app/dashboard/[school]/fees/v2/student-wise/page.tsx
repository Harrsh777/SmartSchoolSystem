'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  ArrowLeft,
  Eye,
  Loader2,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  User,
  Search,
} from 'lucide-react';

type OverviewRow = {
  student: {
    id: string;
    student_name: string;
    admission_no: string;
    class: string;
    section: string;
    father_name: string | null;
  };
  has_generated_fees: boolean;
  fee_structure_names: string[];
  receivable_after_discount: number;
  paid_till_date: number;
  fee_due: number;
};

type EnrichedFee = {
  id: string;
  due_month: string;
  due_date: string;
  base_amount: number;
  paid_amount: number;
  status: string;
  final_amount: number;
  balance_due: number;
  total_due: number;
  late_fee: number;
  installment_manual_lines?: Array<{ id: string; label: string; amount: number; kind: string }>;
  /** Per-installment title (e.g. correct Q1–Q4 for quarterly) */
  installment_display_label?: string;
  fee_structure: { name?: string };
};

type LineDetail = {
  structure_components: Array<{ fee_head_id: string; name: string; amount: number }>;
  manual_lines: Array<{
    id: string;
    label: string;
    amount: number;
    kind: string;
    source?: 'student' | 'class';
  }>;
  editable: boolean;
};

type PaymentAlloc = {
  student_fee_id?: string;
  allocated_amount?: number;
  student_fee?: { id?: string };
};
type PaymentRow = {
  id: string;
  payment_date: string;
  payment_mode?: string;
  allocations?: PaymentAlloc[];
  receipt?: { receipt_no?: string };
};

export default function StudentWiseFeesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  const [academicYearsList, setAcademicYearsList] = useState<Array<{ year_name: string; is_current?: boolean }>>([]);
  const [academicYear, setAcademicYear] = useState('');
  const [className, setClassName] = useState('');
  const [section, setSection] = useState('');
  const [search, setSearch] = useState('');
  const [allYearDues, setAllYearDues] = useState(false);
  const [classes, setClasses] = useState<string[]>([]);
  const [classRows, setClassRows] = useState<Array<{ class?: string; section?: string }>>([]);
  const [rows, setRows] = useState<OverviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedStudent, setSelectedStudent] = useState<OverviewRow['student'] | null>(null);
  const [studentFees, setStudentFees] = useState<EnrichedFee[]>([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [expandedFeeId, setExpandedFeeId] = useState<string | null>(null);
  const [lineDetail, setLineDetail] = useState<Record<string, LineDetail>>({});
  const [lineLoading, setLineLoading] = useState<string | null>(null);
  const [newLineLabel, setNewLineLabel] = useState('');
  const [newLineAmount, setNewLineAmount] = useState('');
  const [newLineKind, setNewLineKind] = useState<'misc' | 'discount'>('misc');
  const [savingLine, setSavingLine] = useState(false);

  const [activeTab, setActiveTab] = useState<'record' | 'siblings' | 'discount' | 'breakup' | 'wallet'>('record');
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const fetchYears = useCallback(async () => {
    try {
      const res = await fetch(`/api/academic-year-management/years?school_code=${encodeURIComponent(schoolCode)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        const list = data.data as Array<{ year_name?: string; is_current?: boolean }>;
        setAcademicYearsList(
          list.map((r) => ({ year_name: String(r.year_name || '').trim(), is_current: r.is_current }))
        );
        const cur = list.find((r) => r.is_current) || list[0];
        if (cur?.year_name) setAcademicYear(String(cur.year_name).trim());
      }
    } catch {
      setAcademicYearsList([]);
    }
  }, [schoolCode]);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch(`/api/classes?school_code=${encodeURIComponent(schoolCode)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        const raw = data.data as Array<{ class?: string; section?: string }>;
        setClassRows(raw);
        const u = Array.from(new Set(raw.map((c) => c.class).filter(Boolean))) as string[];
        setClasses(u.sort());
      }
    } catch {
      setClasses([]);
      setClassRows([]);
    }
  }, [schoolCode]);

  const sectionOptions = useMemo(() => {
    if (!className) return [] as string[];
    const set = new Set<string>();
    for (const r of classRows) {
      if (String(r.class ?? '').trim() === String(className).trim() && r.section != null && String(r.section).trim()) {
        set.add(String(r.section).trim());
      }
    }
    return Array.from(set).sort();
  }, [className, classRows]);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/v2/fees/students/fee-overview?school_code=${encodeURIComponent(schoolCode)}&limit=120`;
      if (className) url += `&class=${encodeURIComponent(className)}`;
      if (section) url += `&section=${encodeURIComponent(section)}`;
      if (academicYear && !allYearDues) url += `&academic_year=${encodeURIComponent(academicYear)}`;
      if (allYearDues) url += `&all_years=1`;
      if (search.trim().length >= 3) url += `&q=${encodeURIComponent(search.trim())}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) setRows(data.data);
      else setRows([]);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [schoolCode, className, section, academicYear, allYearDues, search]);

  useEffect(() => {
    fetchYears();
    fetchClasses();
  }, [fetchYears, fetchClasses]);

  useEffect(() => {
    const t = setTimeout(() => fetchOverview(), search.trim().length >= 3 || search.trim().length === 0 ? 0 : 400);
    return () => clearTimeout(t);
  }, [fetchOverview, search]);

  useEffect(() => {
    setNewLineLabel('');
    setNewLineAmount('');
    setNewLineKind('misc');
  }, [expandedFeeId]);

  const loadStudentFees = async (studentId: string) => {
    setFeesLoading(true);
    try {
      let url = `/api/v2/fees/students/${studentId}/fees?school_code=${encodeURIComponent(schoolCode)}`;
      if (academicYear.trim() && !allYearDues) {
        url += `&academic_year=${encodeURIComponent(academicYear)}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) setStudentFees(data.data as EnrichedFee[]);
      else setStudentFees([]);
    } catch {
      setStudentFees([]);
    } finally {
      setFeesLoading(false);
    }
  };

  const loadPayments = async (studentId: string) => {
    try {
      const res = await fetch(
        `/api/v2/fees/payments?school_code=${encodeURIComponent(schoolCode)}&student_id=${encodeURIComponent(studentId)}`
      );
      const data = await res.json();
      setPayments(res.ok && Array.isArray(data.data) ? data.data : []);
    } catch {
      setPayments([]);
    }
  };

  const openStudent = (r: OverviewRow) => {
    setSelectedStudent(r.student);
    setExpandedFeeId(null);
    setLineDetail({});
    setActiveTab('record');
    loadStudentFees(r.student.id);
    loadPayments(r.student.id);
  };

  const closeStudent = () => {
    setSelectedStudent(null);
    setStudentFees([]);
    setExpandedFeeId(null);
    setLineDetail({});
    fetchOverview();
  };

  const toggleInstallment = async (feeId: string) => {
    if (expandedFeeId === feeId) {
      setExpandedFeeId(null);
      return;
    }
    setExpandedFeeId(feeId);
    if (lineDetail[feeId]) return;
    setLineLoading(feeId);
    try {
      const res = await fetch(
        `/api/v2/fees/student-fees/${feeId}/lines?school_code=${encodeURIComponent(schoolCode)}`
      );
      const data = await res.json();
      if (res.ok && data.data) {
        setLineDetail((prev) => ({
          ...prev,
          [feeId]: {
            structure_components: data.data.structure_components || [],
            manual_lines: data.data.manual_lines || [],
            editable: data.data.editable !== false,
          },
        }));
      }
    } finally {
      setLineLoading(null);
    }
  };

  const staffHeaders = (): HeadersInit => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const raw = sessionStorage.getItem('staff');
      if (raw) {
        const s = JSON.parse(raw);
        if (s.staff_id) h['x-staff-id'] = s.staff_id;
      }
    } catch {
      /* ignore */
    }
    return h;
  };

  const addManualLine = async (feeId: string) => {
    if (!newLineLabel.trim() || !newLineAmount) return;
    const kindAdded = newLineKind;
    setSavingLine(true);
    try {
      const res = await fetch(`/api/v2/fees/student-fees/${feeId}/lines`, {
        method: 'POST',
        headers: staffHeaders(),
        body: JSON.stringify({
          school_code: schoolCode,
          label: newLineLabel.trim(),
          amount: parseFloat(newLineAmount),
          kind: newLineKind,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        alert(j.error || 'Failed to save');
        return;
      }
      setNewLineLabel('');
      setNewLineAmount('');
      alert(
        kindAdded === 'discount'
          ? 'Discount added for this student installment.'
          : 'Misc fee added for this student installment.'
      );
      const res2 = await fetch(
        `/api/v2/fees/student-fees/${feeId}/lines?school_code=${encodeURIComponent(schoolCode)}`
      );
      const jd = await res2.json();
      if (res2.ok && jd.data) {
        setLineDetail((prev) => ({
          ...prev,
          [feeId]: {
            structure_components: jd.data.structure_components || [],
            manual_lines: jd.data.manual_lines || [],
            editable: jd.data.editable !== false,
          },
        }));
      }
      setExpandedFeeId(feeId);
      if (selectedStudent) await loadStudentFees(selectedStudent.id);
    } finally {
      setSavingLine(false);
    }
  };

  const removeLine = async (feeId: string, lineId: string) => {
    if (lineId.startsWith('class:')) {
      alert(
        'This line is a class-wide fee. Remove it under Fee Management → Class-wise fees for that class and section.'
      );
      return;
    }
    if (!confirm('Remove this line?')) return;
    const res = await fetch(
      `/api/v2/fees/student-fees/${feeId}/lines/${lineId}?school_code=${encodeURIComponent(schoolCode)}`,
      { method: 'DELETE', headers: staffHeaders() }
    );
    if (!res.ok) {
      alert('Failed to remove');
      return;
    }
    const res2 = await fetch(
      `/api/v2/fees/student-fees/${feeId}/lines?school_code=${encodeURIComponent(schoolCode)}`
    );
    const jd = await res2.json();
    if (res2.ok && jd.data) {
      setLineDetail((prev) => ({
        ...prev,
        [feeId]: {
          structure_components: jd.data.structure_components || [],
          manual_lines: jd.data.manual_lines || [],
          editable: jd.data.editable !== false,
        },
      }));
    }
    setExpandedFeeId(feeId);
    if (selectedStudent) await loadStudentFees(selectedStudent.id);
  };

  const summary = useMemo(() => {
    if (!studentFees.length) return { recv: 0, paid: 0, due: 0 };
    return studentFees.reduce(
      (acc, f) => ({
        recv: acc.recv + Number(f.final_amount || 0),
        paid: acc.paid + Number(f.paid_amount || 0),
        due: acc.due + Number(f.total_due || 0),
      }),
      { recv: 0, paid: 0, due: 0 }
    );
  }, [studentFees]);

  const formatMoney = (n: number) =>
    `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const getInitials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';

  if (selectedStudent) {
    const hasFees = studentFees.length > 0;

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-10 border-b bg-white px-4 py-3 flex items-center gap-4">
          <Button type="button" variant="outline" size="sm" onClick={closeStudent}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to list
          </Button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Student-wise Fee</h1>
            <p className="text-xs text-gray-500">Fee Management</p>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-teal-700 text-white flex items-center justify-center text-sm font-semibold shrink-0">
              {getInitials(selectedStudent.student_name)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm sm:text-base leading-tight truncate">
                {selectedStudent.student_name}
              </p>
              <p className="text-xs text-gray-600 font-mono">
                {selectedStudent.admission_no} · {selectedStudent.class}-{selectedStudent.section}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-gray-200 pb-2">
            {(
              [
                ['record', 'Fee Record'],
                ['siblings', 'Siblings (0)'],
                ['discount', 'Discount'],
                ['breakup', 'Fees break-up'],
                ['wallet', 'Fee wallet (₹0)'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`px-2.5 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'record' && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-blue-600 text-white px-3 py-2">
                  <p className="text-[10px] font-medium text-blue-100 uppercase leading-tight">Receivable</p>
                  <p className="text-base sm:text-lg font-bold tabular-nums">{formatMoney(summary.recv)}</p>
                </div>
                <div className="rounded-lg bg-green-600 text-white px-3 py-2">
                  <p className="text-[10px] font-medium text-green-100 uppercase">Paid</p>
                  <p className="text-base sm:text-lg font-bold tabular-nums">{formatMoney(summary.paid)}</p>
                </div>
                <div className="rounded-lg bg-red-600 text-white px-3 py-2">
                  <p className="text-[10px] font-medium text-red-100 uppercase">Due</p>
                  <p className="text-base sm:text-lg font-bold tabular-nums">{formatMoney(summary.due)}</p>
                </div>
              </div>

              {feesLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-10 h-10 animate-spin text-teal-700" />
                </div>
              ) : !hasFees ? (
                <Card className="p-8 text-center border-2 border-amber-200 bg-amber-50/50">
                  <p className="text-gray-800 font-medium mb-2">No generated fees for this student</p>
                  <p className="text-sm text-gray-600 mb-6">
                    Activate a fee structure for this class and generate fees, or create a matching structure first.
                  </p>
                  <Button onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/fee-structures`)}>
                    Go to fee structures
                  </Button>
                </Card>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50/80 px-3 py-2 border-b border-amber-100">
                    <h2 className="text-sm font-bold text-gray-900">Fee record</h2>
                    <p className="text-[11px] text-orange-800/80">Expand an installment for components, payments, misc/discount</p>
                  </div>
                  <div className="p-2 space-y-1.5">
                    {studentFees.map((fee, idx) => {
                      const isPaid = String(fee.status).toLowerCase() === 'paid' || fee.total_due <= 0;
                      const open = expandedFeeId === fee.id;
                      const detail = lineDetail[fee.id];
                      const loadingLines = lineLoading === fee.id;
                      const dueAmt = isPaid ? 0 : Math.max(0, fee.balance_due + fee.late_fee);

                      return (
                        <div key={fee.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleInstallment(fee.id)}
                            className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-gray-50"
                          >
                            <span className="text-gray-400 text-xs w-6 tabular-nums shrink-0">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                Inst. {idx + 1} ·{' '}
                                {fee.installment_display_label || fee.fee_structure?.name || 'Fee'}
                              </p>
                              <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                                <span className="tabular-nums">Total {formatMoney(fee.final_amount)}</span>
                                <span className="text-gray-400 mx-1">·</span>
                                <span className="text-orange-700 font-medium tabular-nums">Due {formatMoney(dueAmt)}</span>
                                {fee.late_fee > 0 && !isPaid && (
                                  <span className="text-amber-600 font-normal"> (incl. late {formatMoney(fee.late_fee)})</span>
                                )}
                                <span className="text-gray-400 mx-1">·</span>
                                <span className="text-green-700 tabular-nums">Paid {formatMoney(fee.paid_amount)}</span>
                                <span className="text-gray-400 mx-1">·</span>
                                <span className="text-gray-500">{formatDate(fee.due_date)}</span>
                              </p>
                            </div>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                isPaid ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                              }`}
                            >
                              {isPaid ? 'Paid' : 'Pending'}
                            </span>
                            {open ? (
                              <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                            )}
                          </button>

                          {open && (
                            <div className="border-t border-gray-100 bg-gray-50/80 px-2.5 py-2 space-y-2">
                              {loadingLines ? (
                                <Loader2 className="w-5 h-5 animate-spin text-teal-700 mx-auto" />
                              ) : detail ? (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    <div className="rounded-md border border-gray-200 bg-white p-2">
                                      <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                                        Fee components
                                      </p>
                                      <div className="max-h-40 overflow-y-auto text-xs">
                                        <table className="w-full">
                                          <tbody>
                                            {detail.structure_components.map((c) => (
                                              <tr key={c.fee_head_id} className="border-b border-gray-50 last:border-0">
                                                <td className="py-1 pr-2 text-gray-800">{c.name}</td>
                                                <td className="py-1 text-right tabular-nums font-medium text-gray-900">
                                                  {formatMoney(c.amount)}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                    <div className="rounded-md border border-gray-200 bg-white p-2">
                                      <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                                        Payment history
                                      </p>
                                      <div className="max-h-40 overflow-y-auto text-xs">
                                        <table className="w-full">
                                          <thead>
                                            <tr className="text-left text-[10px] text-gray-500 border-b">
                                              <th className="pb-1 font-medium">Date</th>
                                              <th className="pb-1 font-medium">Receipt</th>
                                              <th className="pb-1 font-medium text-right">Amount</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {(() => {
                                              const histRows = payments.flatMap((pay) => {
                                                const allocs = (pay.allocations || []).filter((a) => {
                                                  const fid =
                                                    a.student_fee_id ||
                                                    (a.student_fee as { id?: string } | undefined)?.id;
                                                  return fid === fee.id;
                                                });
                                                if (allocs.length === 0) return [];
                                                return allocs.map((a, j) => (
                                                  <tr key={`${pay.id}-${j}`} className="border-b border-gray-50">
                                                    <td className="py-1 text-gray-700">
                                                      {new Date(pay.payment_date).toLocaleDateString('en-IN', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                      })}
                                                    </td>
                                                    <td className="py-1 font-mono text-[10px] text-gray-600 truncate max-w-[4rem]">
                                                      {pay.receipt?.receipt_no || '—'}
                                                    </td>
                                                    <td className="py-1 text-right tabular-nums text-green-700">
                                                      {formatMoney(Number(a.allocated_amount || 0))}
                                                    </td>
                                                  </tr>
                                                ));
                                              });
                                              if (histRows.length === 0) {
                                                return (
                                                  <tr>
                                                    <td colSpan={3} className="py-3 text-center text-gray-400">
                                                      No payments yet
                                                    </td>
                                                  </tr>
                                                );
                                              }
                                              return histRows;
                                            })()}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>

                                  {detail.manual_lines.length > 0 && (
                                    <div className="rounded-md border border-dashed border-orange-200 bg-orange-50/50 px-2 py-1.5">
                                      <p className="text-[11px] font-bold text-orange-900 mb-1">Misc / discounts</p>
                                      <ul className="text-xs space-y-0.5">
                                        {detail.manual_lines.map((ln) => (
                                          <li key={ln.id} className="flex justify-between items-center gap-2">
                                            <span className="text-gray-800 truncate">
                                              {ln.source === 'class' && (
                                                <span className="text-[10px] font-semibold text-teal-700 mr-1">
                                                  [Class]
                                                </span>
                                              )}
                                              {ln.label}{' '}
                                              <span className="text-gray-500">({ln.kind})</span>
                                            </span>
                                            <span className="flex items-center gap-2 shrink-0">
                                              <span className={ln.amount < 0 ? 'text-green-600' : 'text-red-600'}>
                                                {ln.amount < 0 ? '−' : '+'}
                                                {formatMoney(Math.abs(ln.amount))}
                                              </span>
                                              {detail.editable && ln.source !== 'class' && !ln.id.startsWith('class:') && (
                                                <button
                                                  type="button"
                                                  className="text-[10px] text-red-600 hover:underline"
                                                  onClick={() => removeLine(fee.id, ln.id)}
                                                >
                                                  ×
                                                </button>
                                              )}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {detail.editable && (
                                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-orange-200 bg-white px-2 py-1.5">
                                      <span className="text-[11px] font-semibold text-gray-700 shrink-0">Add line</span>
                                      <select
                                        value={newLineKind}
                                        onChange={(e) => setNewLineKind(e.target.value as 'misc' | 'discount')}
                                        className="border border-gray-200 rounded px-1.5 py-1 text-xs h-8"
                                      >
                                        <option value="misc">Misc +</option>
                                        <option value="discount">Discount −</option>
                                      </select>
                                      <Input
                                        placeholder="Label"
                                        value={newLineLabel}
                                        onChange={(e) => setNewLineLabel(e.target.value)}
                                        className="h-8 text-xs min-w-[120px] flex-1 max-w-[200px]"
                                      />
                                      <Input
                                        type="number"
                                        placeholder="₹"
                                        value={newLineAmount}
                                        onChange={(e) => setNewLineAmount(e.target.value)}
                                        className="h-8 text-xs w-24"
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        disabled={savingLine}
                                        onClick={() => addManualLine(fee.id)}
                                        className="h-8 text-xs px-3 bg-orange-600 hover:bg-orange-700 shrink-0"
                                      >
                                        {savingLine ? '…' : 'Save'}
                                      </Button>
                                    </div>
                                  )}
                                </>
                              ) : null}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab !== 'record' && (
            <Card className="p-8 text-center text-gray-500">
              This section will be wired in a later iteration.
            </Card>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/dashboard`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 mt-4">Student-wise Fee</h1>
            <p className="text-gray-600 text-sm">Fee Management</p>
          </div>
        </div>

        <Card className="p-4 md:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Academic year</label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                disabled={allYearDues}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {academicYearsList.map((y) => (
                  <option key={y.year_name} value={y.year_name}>
                    {y.year_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Class</label>
              <select
                value={className}
                onChange={(e) => {
                  setClassName(e.target.value);
                  setSection('');
                }}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Section</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                disabled={!className}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
              >
                <option value="">All sections</option>
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allYearDues}
                  onChange={(e) => setAllYearDues(e.target.checked)}
                />
                Show all year dues
              </label>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name / admission ID (min 3 characters)"
              className="pl-10"
            />
          </div>
        </Card>

        <Card className="overflow-hidden border border-gray-300 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-[#003D4C] text-white text-left">
                  <th className="px-3 py-3 font-bold w-10">#</th>
                  <th className="px-3 py-3 font-bold">Student Name</th>
                  <th className="px-3 py-3 font-bold">Admission Id</th>
                  <th className="px-3 py-3 font-bold">Father Name</th>
                  <th className="px-3 py-3 font-bold">Class</th>
                  <th className="px-3 py-3 font-bold">Fee schedule</th>
                  <th className="px-3 py-3 font-bold">Receivable after discount</th>
                  <th className="px-3 py-3 font-bold">Paid till date</th>
                  <th className="px-3 py-3 font-bold">Fee due</th>
                  <th className="px-3 py-3 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-teal-700 mx-auto" />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-gray-500">
                      No students match filters. Adjust class, section, or search.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={r.student.id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-3 py-3 text-gray-500">{String(i + 1).padStart(2, '0')}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="font-medium text-gray-900">{r.student.student_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-gray-800">{r.student.admission_no}</td>
                      <td className="px-3 py-3 text-gray-700">{r.student.father_name || '—'}</td>
                      <td className="px-3 py-3">
                        {r.student.class} {r.student.section}
                      </td>
                      <td className="px-3 py-3 text-gray-800 max-w-[200px]">
                        {r.has_generated_fees
                          ? r.fee_structure_names.join(', ') || '—'
                          : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 font-semibold text-gray-900">
                          <IndianRupee className="w-3 h-3" />
                          {r.receivable_after_discount.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-green-700 font-medium">
                        ₹{r.paid_till_date.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-3 text-red-600 font-semibold">
                        ₹{r.fee_due.toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => openStudent(r)}
                          className="p-2 rounded-lg text-amber-700 hover:bg-amber-50"
                          title="View"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t bg-gray-50 text-sm text-gray-600 flex justify-between items-center">
            <span>Total rows: {rows.length}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
