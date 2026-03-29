'use client';

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  ArrowLeft,
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  Receipt,
  Users,
  Calendar,
  FileText,
  UserCheck,
  Clock,
  Wallet,
  User,
  Hash,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  Bus,
  Layers,
  Sparkles,
} from 'lucide-react';

interface AdjustmentLine {
  rule_id: string;
  label: string;
  adjustment_type: string;
  delta: number;
  reason: string | null;
}

interface ManualLine {
  id: string;
  label: string;
  amount: number;
  kind: string;
}

interface StructureLineItem {
  amount: number;
  fee_head: { id?: string; name?: string } | null;
}

interface TransportSnap {
  amount?: number;
  pickup_name?: string | null;
  drop_name?: string | null;
  pickup_fare?: number | null;
  drop_fare?: number | null;
  custom_fare?: number | null;
}

interface StudentFee {
  id: string;
  fee_structure_id?: string;
  fee_source?: string;
  due_month: string;
  due_date: string;
  base_amount: number;
  paid_amount: number;
  adjustment_amount: number;
  balance_due: number;
  late_fee: number;
  total_due: number;
  status: string;
  rules_adjustment_delta?: number;
  effective_adjustment_amount?: number;
  final_amount?: number;
  adjustment_lines?: AdjustmentLine[];
  installment_manual_lines?: ManualLine[];
  installment_display_label?: string;
  transport_snapshot?: TransportSnap | null;
  structure_line_items?: StructureLineItem[];
  fee_structure: {
    id?: string;
    name: string;
    class_name?: string;
    academic_year?: string | null;
    late_fee_type?: string;
    late_fee_value?: number;
    grace_period_days?: number;
  };
}

interface FeeStructureGroup {
  key: string;
  name: string;
  academicYear: string | null;
  fees: StudentFee[];
  sumDue: number;
  sumPaid: number;
  pendingInstallments: number;
}

interface PendingStudent {
  id: string;
  admission_no: string;
  student_name: string;
  class: string;
  section: string;
  pending_amount: number;
  late_fee_amount?: number;
  due_date: string;
}

interface SessionPaidUpStudent {
  id: string;
  admission_no: string;
  student_name: string;
  class: string;
  section: string;
  installment_count: number;
  total_paid_session: number;
  period_label?: string | null;
}

type PaidPeriodListMode = 'month' | 'quarter';

interface PaymentRecord {
  id: string;
  amount: number;
  payment_mode: string;
  payment_date: string;
  receipt_number?: string;
  receipt?: { receipt_no?: string };
  allocations?: Array<{
    student_fee_id?: string;
    allocated_amount?: number;
    student_fee?: { id?: string; due_date?: string };
  }>;
}

interface Staff {
  id: string;
  staff_id: string;
  full_name: string;
}

export default function PaymentCollectionPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [paidUpStudents, setPaidUpStudents] = useState<SessionPaidUpStudent[]>([]);
  const [paidPeriodListMode, setPaidPeriodListMode] = useState<PaidPeriodListMode>('month');
  const [paidUpPeriodMeta, setPaidUpPeriodMeta] = useState<{
    mode: string;
    label: string;
    as_of: string;
  } | null>(null);
  const [classRows, setClassRows] = useState<Array<{ class?: string; section?: string }>>([]);
  const [selectedStudent, setSelectedStudent] = useState<PendingStudent | null>(null);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [feesLoading, setFeesLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedCollector, setSelectedCollector] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string>('');
  const [academicYearsList, setAcademicYearsList] = useState<Array<{ year_name: string; is_current?: boolean }>>([]);
  /** Expanded fee structure id — breakdown shown as receipt-style panel */
  const [expandedStructureId, setExpandedStructureId] = useState<string | null>(null);

  const fetchAcademicYears = useCallback(async () => {
    if (!schoolCode) return;
    try {
      const res = await fetch(`/api/academic-year-management/years?school_code=${encodeURIComponent(schoolCode)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        const list = data.data as Array<{ year_name?: string; is_current?: boolean }>;
        setAcademicYearsList(list.map((r) => ({ year_name: String(r.year_name || '').trim(), is_current: r.is_current })));
        const currentRow = list.find((r) => r.is_current === true);
        const fallbackRow = list[0];
        const year = currentRow?.year_name?.trim() || fallbackRow?.year_name?.trim() || '';
        setCurrentAcademicYear(year);
      } else {
        setCurrentAcademicYear('');
      }
    } catch {
      setCurrentAcademicYear('');
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  const fetchClassRows = useCallback(async () => {
    try {
      const res = await fetch(`/api/classes?school_code=${encodeURIComponent(schoolCode)}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        setClassRows(data.data as Array<{ class?: string; section?: string }>);
      } else {
        setClassRows([]);
      }
    } catch {
      setClassRows([]);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchClassRows();
  }, [fetchClassRows]);

  const fetchPendingStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const q = new URLSearchParams({ school_code: schoolCode, limit: '300' });
      if (classFilter) q.set('class', classFilter);
      if (sectionFilter) q.set('section', sectionFilter);
      if (currentAcademicYear) q.set('academic_year', currentAcademicYear);

      const pendingUrl = `/api/v2/fees/students/pending?${q.toString()}`;

      const paidQ = new URLSearchParams(q);
      paidQ.set('paid_period', paidPeriodListMode);
      const now = new Date();
      const asOf = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      paidQ.set('as_of', asOf);
      const paidUpUrl = `/api/v2/fees/students/session-paid-up?${paidQ.toString()}`;

      const [pendingRes, paidUpRes] = await Promise.all([fetch(pendingUrl), fetch(paidUpUrl)]);
      const pendingJson = await pendingRes.json();
      const paidUpJson = await paidUpRes.json();

      if (pendingRes.ok) setPendingStudents(pendingJson.data || []);
      else {
        setPendingStudents([]);
        setError(pendingJson.error || 'Failed to load students with pending fees');
      }

      if (paidUpRes.ok) {
        setPaidUpStudents(paidUpJson.data || []);
        const meta = paidUpJson.period_meta;
        if (meta && typeof meta.label === 'string' && typeof meta.as_of === 'string') {
          setPaidUpPeriodMeta({
            mode: String(meta.mode || paidPeriodListMode),
            label: meta.label,
            as_of: meta.as_of,
          });
        } else setPaidUpPeriodMeta(null);
      } else {
        setPaidUpStudents([]);
        setPaidUpPeriodMeta(null);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load students');
      setPendingStudents([]);
      setPaidUpStudents([]);
    } finally {
      setLoading(false);
    }
  }, [schoolCode, classFilter, sectionFilter, currentAcademicYear, paidPeriodListMode]);

  useEffect(() => {
    void fetchPendingStudents();
  }, [fetchPendingStudents]);

  useEffect(() => {
    fetchStaff();
    try {
      const storedStaff = sessionStorage.getItem('staff');
      if (storedStaff) {
        const staffData = JSON.parse(storedStaff);
        if (staffData.staff_id) setSelectedCollector(staffData.staff_id);
      }
    } catch {
      // ignore
    }
  }, [schoolCode]);

  const fetchStaff = useCallback(async () => {
    try {
      setLoadingStaff(true);
      const response = await fetch(`/api/staff?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok) setStaffList(result.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStaff(false);
    }
  }, [schoolCode]);

  const uniqueClasses = useMemo(() => {
    const fromApi = Array.from(
      new Set(classRows.map((r) => String(r.class ?? '').trim()).filter(Boolean))
    );
    if (fromApi.length > 0) {
      return fromApi.sort((a, b) => {
        const numA = parseInt(a, 10) || 0;
        const numB = parseInt(b, 10) || 0;
        if (numA !== numB) return numA - numB;
        return a.localeCompare(b);
      });
    }
    return Array.from(new Set(pendingStudents.map((s) => s.class))).sort((a, b) => {
      const numA = parseInt(a, 10) || 0;
      const numB = parseInt(b, 10) || 0;
      return numA - numB;
    });
  }, [classRows, pendingStudents]);

  const uniqueSections = useMemo(() => {
    if (!classFilter) return [] as string[];
    const fromApi = Array.from(
      new Set(
        classRows
          .filter((r) => String(r.class ?? '').trim() === String(classFilter).trim())
          .map((r) => String(r.section ?? '').trim())
          .filter(Boolean)
      )
    );
    if (fromApi.length > 0) return fromApi.sort();
    return Array.from(
      new Set(pendingStudents.filter((s) => s.class === classFilter).map((s) => s.section))
    ).sort();
  }, [classFilter, classRows, pendingStudents]);

  const handleStudentSelect = async (student: PendingStudent | SessionPaidUpStudent) => {
    setSelectedStudent({
      id: student.id,
      student_name: student.student_name,
      admission_no: student.admission_no,
      class: student.class,
      section: student.section,
      pending_amount:
        'pending_amount' in student ? student.pending_amount : 0,
      late_fee_amount: 'late_fee_amount' in student ? student.late_fee_amount : undefined,
      due_date: 'due_date' in student ? student.due_date : '',
    });
    setStudentFees([]);
    setRecentPayments([]);
    setAllocations({});
    setPaymentAmount('');
    setError('');
    setSuccess('');

    try {
      setFeesLoading(true);
      const feesUrl = currentAcademicYear
        ? `/api/v2/fees/students/${student.id}/fees?school_code=${schoolCode}&academic_year=${encodeURIComponent(currentAcademicYear)}`
        : `/api/v2/fees/students/${student.id}/fees?school_code=${schoolCode}`;
      const [feesRes, paymentsRes] = await Promise.all([
        fetch(feesUrl),
        fetch(`/api/v2/fees/payments?school_code=${schoolCode}&student_id=${student.id}`),
      ]);

      const feesResult = await feesRes.json();
      const paymentsResult = await paymentsRes.json();

      if (feesRes.ok) setStudentFees(feesResult.data || []);
      else setError(feesResult.error || 'Failed to load fees');

      if (paymentsRes.ok) {
        const list = Array.isArray(paymentsResult.data) ? paymentsResult.data : [];
        setRecentPayments(list);
      }
    } catch (err) {
      setError('Failed to load student data');
      console.error(err);
    } finally {
      setFeesLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedStudent || !currentAcademicYear) return;
    let cancelled = false;
    setFeesLoading(true);
    const feesUrl = `/api/v2/fees/students/${selectedStudent.id}/fees?school_code=${schoolCode}&academic_year=${encodeURIComponent(currentAcademicYear)}`;
    fetch(feesUrl)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.data) setStudentFees(Array.isArray(data.data) ? data.data : []);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load fees for selected year');
      })
      .finally(() => {
        if (!cancelled) setFeesLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentAcademicYear, schoolCode, selectedStudent?.id]);

  const handleAllocationChange = (feeId: string, amount: number) => {
    const newAllocations = { ...allocations };
    if (amount > 0) newAllocations[feeId] = amount;
    else delete newAllocations[feeId];
    setAllocations(newAllocations);
    const total = Object.values(newAllocations).reduce((sum, amt) => sum + amt, 0);
    setPaymentAmount(total.toFixed(2));
  };

  const handleCollectPayment = async () => {
    if (!selectedStudent) return;
    const totalAllocated = Object.values(allocations).reduce((sum, amt) => sum + amt, 0);
    const paymentAmt = parseFloat(paymentAmount);
    if (paymentAmt <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }
    if (Math.abs(totalAllocated - paymentAmt) > 0.01) {
      setError('Total allocated amount must equal payment amount');
      return;
    }
    if (Object.keys(allocations).length === 0) {
      setError('Please allocate payment to at least one fee');
      return;
    }
    if (!selectedCollector) {
      setError('Please select a collector');
      return;
    }

    try {
      setCollecting(true);
      setError('');
      setSuccess('');
      const allocationArray = Object.entries(allocations).map(([student_fee_id, allocated_amount]) => ({
        student_fee_id,
        allocated_amount,
      }));

      const response = await fetch('/api/v2/fees/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-id': selectedCollector,
        },
        body: JSON.stringify({
          school_code: schoolCode,
          student_id: selectedStudent.id,
          amount: paymentAmt,
          payment_mode: paymentMode,
          reference_no: referenceNo.trim() || null,
          allocations: allocationArray,
          remarks: '',
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Payment collected successfully! Receipt generated.');
        setSelectedStudent(null);
        setStudentFees([]);
        setRecentPayments([]);
        setAllocations({});
        setPaymentAmount('');
        setReferenceNo('');
        fetchPendingStudents();
        setTimeout(() => setSuccess(''), 2500);
      } else {
        setError(result.error || 'Failed to collect payment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to collect payment');
      console.error(err);
    } finally {
      setCollecting(false);
    }
  };

  const filteredStudents = useMemo(
    () =>
      pendingStudents.filter(
        (s) =>
          s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.admission_no.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [pendingStudents, searchQuery]
  );

  const filteredPaidUpStudents = useMemo(
    () =>
      paidUpStudents.filter(
        (s) =>
          s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.admission_no.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [paidUpStudents, searchQuery]
  );

  const totalDue = studentFees.reduce((sum, f) => sum + f.total_due, 0);
  const totalDueForDisplay = selectedStudent ? selectedStudent.pending_amount : totalDue;
  const totalAllocated = Object.values(allocations).reduce((sum, amt) => sum + amt, 0);
  const totalPaid = studentFees.reduce((sum, f) => sum + f.paid_amount, 0);

  const lastPaymentDateByFeeId = useMemo(() => {
    const map: Record<string, string> = {};
    recentPayments.forEach((pay) => {
      const date = pay.payment_date;
      if (!date) return;
      pay.allocations?.forEach((alloc) => {
        const feeId = alloc.student_fee_id || (alloc.student_fee as { id?: string })?.id;
        if (feeId && (!map[feeId] || new Date(date) > new Date(map[feeId]))) map[feeId] = date;
      });
    });
    return map;
  }, [recentPayments]);

  useEffect(() => {
    setExpandedStructureId(null);
  }, [selectedStudent?.id]);

  const structureGroups = useMemo((): FeeStructureGroup[] => {
    const map = new Map<string, FeeStructureGroup>();
    for (const f of studentFees) {
      const fs = f.fee_structure;
      const key = String(fs?.id || f.fee_structure_id || 'unknown');
      const name = String(fs?.name || 'Fees');
      const academicYear = fs?.academic_year != null ? String(fs.academic_year) : null;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name,
          academicYear,
          fees: [],
          sumDue: 0,
          sumPaid: 0,
          pendingInstallments: 0,
        });
      }
      map.get(key)!.fees.push(f);
    }
    const out: FeeStructureGroup[] = [];
    for (const g of map.values()) {
      g.fees.sort((a, b) => String(a.due_month).localeCompare(String(b.due_month)));
      g.sumDue = g.fees.reduce((s, f) => s + f.total_due, 0);
      g.sumPaid = g.fees.reduce((s, f) => s + f.paid_amount, 0);
      g.pendingInstallments = g.fees.filter((f) => f.total_due > 0.009).length;
      out.push(g);
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [studentFees]);

  const structureHeadAllocated = (fee: StudentFee) => {
    const items = fee.structure_line_items || [];
    const base = Number(fee.base_amount || 0);
    const totalTpl = items.reduce((s, i) => s + Number(i.amount || 0), 0);
    if (items.length === 0 || totalTpl <= 0) return [];
    return items.map((i) => {
      const a = Number(i.amount || 0);
      return {
        name: i.fee_head?.name || 'Fee head',
        template: a,
        allocated: (a / totalTpl) * base,
      };
    });
  };

  const formatCurrency = (n: number) =>
    `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const formatDateShort = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const getInitials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
          
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                <Wallet size={24} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Collect Payment</h1>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {currentAcademicYear ? `Session: ${currentAcademicYear}` : 'Loading session...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 flex items-center gap-3"
            >
              <CheckCircle size={20} />
              <p className="font-medium">{success}</p>
            </motion.div>
          )}
        </AnimatePresence>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 flex items-center gap-3">
            <AlertCircle size={20} />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Select Student bar */}
        <Card className="mb-6 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select Student</h2>
            {(classFilter || sectionFilter || searchQuery.trim()) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 text-xs h-8"
                onClick={() => {
                  setClassFilter('');
                  setSectionFilter('');
                  setSearchQuery('');
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 flex-1 min-w-0 w-full">
              <div className="sm:col-span-2 lg:col-span-5 min-w-0">
                <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  <Input
                    type="text"
                    placeholder="Name or admission number"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-11 w-full"
                  />
                </div>
              </div>
              <div className="sm:col-span-1 lg:col-span-3 min-w-0">
                <label
                  htmlFor="collect-class-filter"
                  className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5"
                >
                  Class
                </label>
                <select
                  id="collect-class-filter"
                  value={classFilter}
                  onChange={(e) => {
                    setClassFilter(e.target.value);
                    setSectionFilter('');
                  }}
                  className="w-full h-11 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                >
                  <option value="">All classes</option>
                  {uniqueClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1 lg:col-span-4 min-w-0">
                <label
                  htmlFor="collect-section-filter"
                  className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1.5"
                >
                  Section
                </label>
                <select
                  id="collect-section-filter"
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  disabled={!classFilter}
                  className="w-full h-11 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{classFilter ? 'All sections' : 'Select a class first'}</option>
                  {uniqueSections.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {selectedStudent && (
              <div className="flex items-center gap-3 shrink-0 p-3 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
                  {getInitials(selectedStudent.student_name)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedStudent.student_name}</p>
                  <p className="text-sm text-gray-600 dark:text-slate-400 font-mono">
                    {selectedStudent.admission_no} • {selectedStudent.class}-{selectedStudent.section}
                  </p>
                </div>
                <CheckCircle size={22} className="text-blue-600 dark:text-blue-400" />
              </div>
            )}
          </div>
        </Card>

        {selectedStudent && (
          <>
            {/* 4 info cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="p-4 bg-blue-600 border-0 text-white">
                <div className="flex items-center gap-2 text-blue-100 mb-1">
                  <User size={18} />
                  <span className="text-xs font-medium uppercase tracking-wide">Student Name</span>
                </div>
                <p className="text-lg font-bold truncate">{selectedStudent.student_name}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 mb-1">
                  <Hash size={18} />
                  <span className="text-xs font-medium uppercase tracking-wide">Roll Number</span>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white font-mono">
                  {selectedStudent.admission_no} • {selectedStudent.class}-{selectedStudent.section}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                  <IndianRupee size={18} />
                  <span className="text-xs font-medium uppercase tracking-wide">Recent Period Due</span>
                </div>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  {feesLoading ? '—' : formatCurrency(totalDueForDisplay)}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                  <CheckCircle size={18} />
                  <span className="text-xs font-medium uppercase tracking-wide">Total Paid</span>
                </div>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                  {feesLoading ? '—' : formatCurrency(totalPaid)}
                </p>
              </Card>
            </div>

            {feesLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={40} className="animate-spin text-blue-600" />
              </div>
            ) : studentFees.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No fees found</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Generate fees from an active fee structure for session {currentAcademicYear || '—'}.
                </p>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/fee-structures`)}
                >
                  Go to Fee Structures
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Fee structures → receipt-style breakdown */}
                <div className="lg:col-span-2">
                  <Card className="p-5 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Fee structures</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                          Select a structure to view heads, transport, discounts, and adjustments like a receipt.
                        </p>
                      </div>
                      <div className="shrink-0">
                        {academicYearsList.length > 0 && (
                          <select
                            value={currentAcademicYear}
                            onChange={(e) => setCurrentAcademicYear(e.target.value)}
                            className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-slate-300 border-0 focus:ring-2 focus:ring-blue-500"
                          >
                            {academicYearsList.map((y) => (
                              <option key={y.year_name} value={y.year_name}>
                                Session: {y.year_name}
                              </option>
                            ))}
                          </select>
                        )}
                        {academicYearsList.length === 0 && currentAcademicYear && (
                          <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-slate-300 inline-block">
                            Session: {currentAcademicYear}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 max-h-[min(40vh,280px)] overflow-y-auto pr-1">
                      {structureGroups.map((g) => {
                        const expanded = expandedStructureId === g.key;
                        return (
                          <button
                            key={g.key}
                            type="button"
                            onClick={() => setExpandedStructureId(expanded ? null : g.key)}
                            className={`w-full text-left rounded-xl border-2 transition-all p-4 flex items-start gap-3 ${
                              expanded
                                ? 'border-blue-400 dark:border-blue-600 bg-blue-50/70 dark:bg-blue-950/35 shadow-sm ring-1 ring-blue-200/60 dark:ring-blue-800/50'
                                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/20 hover:border-gray-300 dark:hover:border-slate-600'
                            }`}
                          >
                            <div
                              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                                expanded
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'
                              }`}
                            >
                              <Layers size={22} strokeWidth={2} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 dark:text-white leading-snug">{g.name}</p>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-gray-600 dark:text-slate-400">
                                {g.academicYear && (
                                  <span className="rounded-md bg-gray-100 dark:bg-slate-800 px-2 py-0.5 font-medium">
                                    {g.academicYear}
                                  </span>
                                )}
                                <span>
                                  {g.fees.length} installment{g.fees.length !== 1 ? 's' : ''}
                                </span>
                                {g.pendingInstallments > 0 && (
                                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                                    {g.pendingInstallments} pending
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-3 mt-2 text-sm">
                                <span className="text-red-600 dark:text-red-400 font-semibold tabular-nums">
                                  Due {formatCurrency(g.sumDue)}
                                </span>
                                <span className="text-green-600 dark:text-green-400 font-medium tabular-nums">
                                  Paid {formatCurrency(g.sumPaid)}
                                </span>
                              </div>
                            </div>
                            <div className="shrink-0 pt-1 text-gray-400">
                              {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-6 pt-6 border-t border-dashed border-gray-300 dark:border-slate-600">
                      <AnimatePresence mode="wait">
                        {(() => {
                          const expandedGroup =
                            structureGroups.find((x) => x.key === expandedStructureId) ?? null;
                          if (!expandedGroup) {
                            return (
                              <motion.div
                                key="placeholder"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="rounded-2xl border border-dashed border-gray-300 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-900/30 py-14 px-6 text-center"
                              >
                                <Layers
                                  size={40}
                                  className="mx-auto mb-3 text-gray-300 dark:text-slate-600"
                                  strokeWidth={1.5}
                                />
                                <p className="text-gray-600 dark:text-slate-400 font-medium">
                                  Select a fee structure above
                                </p>
                                <p className="text-sm text-gray-500 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                                  You will see every installment with fee heads, transport, misc lines, rule
                                  adjustments, late fee, and pay actions.
                                </p>
                              </motion.div>
                            );
                          }
                          return (
                            <motion.div
                              key={expandedGroup.key}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                              className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-gradient-to-b from-white via-slate-50/80 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 shadow-[0_1px_0_rgba(15,23,42,0.06),0_12px_40px_-12px_rgba(15,23,42,0.15)] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)] overflow-hidden"
                            >
                              <div className="relative px-5 sm:px-7 pt-6 pb-5 border-b border-slate-200/80 dark:border-slate-700/80 bg-gradient-to-r from-blue-600/95 to-indigo-600/95 text-white">
                                <div className="absolute top-3 right-5 opacity-[0.12] pointer-events-none">
                                  <Receipt size={120} strokeWidth={1} />
                                </div>
                                <div className="relative flex items-start gap-3">
                                  <div className="p-2 rounded-xl bg-white/15 backdrop-blur-sm">
                                    <Sparkles size={22} className="text-amber-200" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-100/90">
                                      Fee receipt preview
                                    </p>
                                    <h4 className="text-xl font-bold tracking-tight mt-1">{expandedGroup.name}</h4>
                                    <p className="text-sm text-blue-100/90 mt-1">
                                      {selectedStudent.student_name}
                                      <span className="text-blue-200/80"> · </span>
                                      <span className="font-mono">{selectedStudent.admission_no}</span>
                                      <span className="text-blue-200/80"> · </span>
                                      {selectedStudent.class}-{selectedStudent.section}
                                    </p>
                                    {expandedGroup.academicYear && (
                                      <p className="text-xs text-blue-100/80 mt-2">
                                        Session {expandedGroup.academicYear}
                                        {currentAcademicYear && expandedGroup.academicYear !== currentAcademicYear
                                          ? ` · Viewing ${currentAcademicYear}`
                                          : ''}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="px-4 sm:px-6 py-5 space-y-5 max-h-[min(55vh,520px)] overflow-y-auto">
                                {expandedGroup.fees.map((fee) => {
                                  const isPaid = fee.total_due <= 0 || fee.status === 'paid';
                                  const allocated = allocations[fee.id] || 0;
                                  const lastPaidDate = lastPaymentDateByFeeId[fee.id];
                                  const isOverdue =
                                    !isPaid &&
                                    (fee.status === 'overdue' || new Date(fee.due_date) < new Date());
                                  const lines = fee.adjustment_lines ?? [];
                                  const manual = fee.installment_manual_lines ?? [];
                                  const heads = structureHeadAllocated(fee);
                                  const snap = fee.transport_snapshot;
                                  const isTransport = fee.fee_source === 'transport';

                                  const shellClass = isPaid
                                    ? 'border border-emerald-200/90 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/15'
                                    : allocated > 0
                                    ? 'border-2 border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/25'
                                    : isOverdue
                                    ? 'border-2 border-orange-200 dark:border-orange-800 bg-orange-50/25 dark:bg-orange-950/20'
                                    : 'border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/25';

                                  return (
                                    <div
                                      key={fee.id}
                                      className={`rounded-xl overflow-hidden ${shellClass}`}
                                    >
                                      <div className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.06]">
                                        <div className="flex gap-3 min-w-0">
                                          <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                              isPaid
                                                ? 'bg-emerald-100 dark:bg-emerald-900/50'
                                                : 'bg-amber-100 dark:bg-amber-900/50'
                                            }`}
                                          >
                                            {isPaid ? (
                                              <CheckCircle
                                                size={20}
                                                className="text-emerald-600 dark:text-emerald-400"
                                              />
                                            ) : (
                                              <Clock size={20} className="text-amber-600 dark:text-amber-400" />
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                              {fee.installment_display_label ||
                                                fee.fee_structure?.name ||
                                                'Installment'}
                                            </p>
                                            {isPaid ? (
                                              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                                                Settled
                                                {lastPaidDate ? ` · ${formatDate(lastPaidDate)}` : ''}
                                              </p>
                                            ) : (
                                              <p className="text-sm text-amber-700 dark:text-amber-400">
                                                Due {formatDateShort(fee.due_date)}
                                                {isOverdue ? ' · Overdue' : ''}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                                          {!isPaid && (
                                            <p className="text-lg font-bold tabular-nums text-gray-900 dark:text-white sm:text-right">
                                              {formatCurrency(fee.total_due)}
                                            </p>
                                          )}
                                          {isPaid && (
                                            <div className="text-right">
                                              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                Nothing due
                                              </p>
                                              <p className="text-xs text-gray-500 dark:text-slate-400 tabular-nums">
                                                Paid {formatCurrency(fee.paid_amount)}
                                              </p>
                                            </div>
                                          )}
                                          {!isPaid && (
                                            <Button
                                              size="sm"
                                              className="bg-blue-600 hover:bg-blue-700 text-white h-9 text-xs font-semibold"
                                              onClick={() => handleAllocationChange(fee.id, fee.total_due)}
                                            >
                                              Pay full for this installment
                                            </Button>
                                          )}
                                        </div>
                                      </div>

                                      <div className="px-4 py-4 space-y-4 bg-white/60 dark:bg-slate-900/20">
                                        {heads.length > 0 && (
                                          <div>
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                                              Fee heads (share of base)
                                            </p>
                                            <div className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                                              <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 bg-gray-100/90 dark:bg-slate-800/90 text-xs font-semibold text-gray-600 dark:text-slate-300">
                                                <span>Head</span>
                                                <span className="text-right tabular-nums">Amount</span>
                                              </div>
                                              {heads.map((h, idx) => (
                                                <div
                                                  key={`${h.name}-${idx}`}
                                                  className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-sm border-t border-gray-100 dark:border-slate-800/80 text-gray-800 dark:text-slate-200"
                                                >
                                                  <span className="min-w-0 pr-2">{h.name}</span>
                                                  <span className="tabular-nums font-medium text-right shrink-0">
                                                    {formatCurrency(h.allocated)}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {isTransport && snap && (
                                          <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/90 to-orange-50/40 dark:from-amber-950/40 dark:to-orange-950/20 px-4 py-3">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-amber-950 dark:text-amber-100">
                                              <Bus size={18} className="shrink-0" />
                                              Transport
                                            </div>
                                            <dl className="mt-2 grid gap-1.5 text-sm text-amber-950/90 dark:text-amber-50/90">
                                              {snap.pickup_name != null && String(snap.pickup_name).trim() !== '' && (
                                                <div className="flex justify-between gap-2">
                                                  <dt className="text-amber-800/80 dark:text-amber-200/70">Pickup</dt>
                                                  <dd className="font-medium text-right">{snap.pickup_name}</dd>
                                                </div>
                                              )}
                                              {snap.drop_name != null && String(snap.drop_name).trim() !== '' && (
                                                <div className="flex justify-between gap-2">
                                                  <dt className="text-amber-800/80 dark:text-amber-200/70">Drop</dt>
                                                  <dd className="font-medium text-right">{snap.drop_name}</dd>
                                                </div>
                                              )}
                                              {snap.pickup_fare != null &&
                                                Number(snap.pickup_fare) > 0 && (
                                                  <div className="flex justify-between gap-2 tabular-nums">
                                                    <dt className="text-amber-800/80 dark:text-amber-200/70">
                                                      Pickup fare
                                                    </dt>
                                                    <dd>{formatCurrency(Number(snap.pickup_fare))}</dd>
                                                  </div>
                                                )}
                                              {snap.drop_fare != null && Number(snap.drop_fare) > 0 && (
                                                <div className="flex justify-between gap-2 tabular-nums">
                                                  <dt className="text-amber-800/80 dark:text-amber-200/70">
                                                    Drop fare
                                                  </dt>
                                                  <dd>{formatCurrency(Number(snap.drop_fare))}</dd>
                                                </div>
                                              )}
                                              {snap.custom_fare != null && Number(snap.custom_fare) > 0 && (
                                                <div className="flex justify-between gap-2 tabular-nums">
                                                  <dt className="text-amber-800/80 dark:text-amber-200/70">
                                                    Custom fare
                                                  </dt>
                                                  <dd>{formatCurrency(Number(snap.custom_fare))}</dd>
                                                </div>
                                              )}
                                              <div className="flex justify-between gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/40 font-semibold tabular-nums">
                                                <dt>Period transport</dt>
                                                <dd>
                                                  {formatCurrency(
                                                    Number(
                                                      snap.amount ??
                                                        fee.base_amount ??
                                                        fee.final_amount ??
                                                        0
                                                    )
                                                  )}
                                                </dd>
                                              </div>
                                            </dl>
                                          </div>
                                        )}

                                        {heads.length === 0 && !isTransport && (
                                          <div className="rounded-lg border border-dashed border-gray-300 dark:border-slate-600 px-3 py-2 text-sm text-gray-600 dark:text-slate-400">
                                            Base installment{' '}
                                            <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                                              {formatCurrency(fee.base_amount)}
                                            </span>
                                            {typeof fee.final_amount === 'number' && (
                                              <span className="ml-2">
                                                → Final{' '}
                                                <span className="font-semibold tabular-nums">
                                                  {formatCurrency(fee.final_amount)}
                                                </span>
                                              </span>
                                            )}
                                          </div>
                                        )}

                                        {manual.length > 0 && (
                                          <div>
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                                              Misc & discounts
                                            </p>
                                            <ul className="rounded-lg border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-800">
                                              {manual.map((ln) => (
                                                <li
                                                  key={ln.id}
                                                  className="flex justify-between gap-3 px-3 py-2 text-sm text-gray-800 dark:text-slate-200"
                                                >
                                                  <span className="min-w-0">
                                                    {ln.label}{' '}
                                                    <span className="text-gray-500 text-xs">({ln.kind})</span>
                                                  </span>
                                                  <span
                                                    className={`tabular-nums font-medium shrink-0 ${
                                                      ln.amount < 0
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-red-600 dark:text-red-400'
                                                    }`}
                                                  >
                                                    {ln.amount < 0 ? '−' : '+'}
                                                    {formatCurrency(Math.abs(ln.amount))}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {lines.length > 0 && (
                                          <div>
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                                              Rule adjustments
                                            </p>
                                            <ul className="rounded-lg border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-800">
                                              {lines.map((ln) => (
                                                <li
                                                  key={ln.rule_id}
                                                  className="flex justify-between gap-3 px-3 py-2 text-sm text-gray-800 dark:text-slate-200"
                                                >
                                                  <span className="min-w-0">
                                                    {ln.label}
                                                    {ln.reason ? (
                                                      <span className="text-gray-500 text-xs block sm:inline sm:ml-1">
                                                        — {ln.reason}
                                                      </span>
                                                    ) : null}
                                                  </span>
                                                  <span
                                                    className={`tabular-nums font-medium shrink-0 ${
                                                      ln.delta < 0
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-red-600 dark:text-red-400'
                                                    }`}
                                                  >
                                                    {ln.delta < 0 ? '−' : '+'}
                                                    {formatCurrency(Math.abs(ln.delta))}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        {Math.abs(Number(fee.adjustment_amount || 0)) > 0.001 && (
                                          <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
                                            Includes legacy approved manual adjustment{' '}
                                            {formatCurrency(Number(fee.adjustment_amount))} from older per-fee
                                            approvals.
                                          </p>
                                        )}

                                        <div className="rounded-lg bg-slate-100/90 dark:bg-slate-800/60 px-3 py-3 space-y-1.5 text-sm">
                                          <div className="flex justify-between gap-2 text-gray-700 dark:text-slate-300">
                                            <span>Base</span>
                                            <span className="tabular-nums font-medium">
                                              {formatCurrency(fee.base_amount)}
                                            </span>
                                          </div>
                                          {typeof fee.final_amount === 'number' && (
                                            <div className="flex justify-between gap-2 text-gray-700 dark:text-slate-300">
                                              <span>After rules / lines</span>
                                              <span className="tabular-nums font-medium">
                                                {formatCurrency(fee.final_amount)}
                                              </span>
                                            </div>
                                          )}
                                          {fee.late_fee > 0 && (
                                            <div className="flex justify-between gap-2 text-amber-800 dark:text-amber-200">
                                              <span>Late fee</span>
                                              <span className="tabular-nums font-semibold">
                                                +{formatCurrency(fee.late_fee)}
                                              </span>
                                            </div>
                                          )}
                                          {fee.paid_amount > 0 && !isPaid && (
                                            <div className="flex justify-between gap-2 text-green-700 dark:text-green-400">
                                              <span>Already paid</span>
                                              <span className="tabular-nums font-semibold">
                                                −{formatCurrency(fee.paid_amount)}
                                              </span>
                                            </div>
                                          )}
                                          {!isPaid && (
                                            <div className="flex justify-between gap-2 pt-2 mt-2 border-t border-slate-200 dark:border-slate-600 text-base font-bold text-gray-900 dark:text-white">
                                              <span>Amount due</span>
                                              <span className="tabular-nums">{formatCurrency(fee.total_due)}</span>
                                            </div>
                                          )}
                                        </div>

                                        {allocated > 0 && !isPaid && (
                                          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                            {formatCurrency(allocated)} allocated from payment for this installment
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          );
                        })()}
                      </AnimatePresence>
                    </div>
                  </Card>
                </div>

                {/* Payment Details */}
                <div>
                  <Card className="p-5">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Payment Details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">
                          Payment Amount
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                          <Input
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder="0.00"
                            className="pl-8 h-12 text-lg font-semibold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">
                          Collector *
                        </label>
                        <select
                          value={selectedCollector}
                          onChange={(e) => setSelectedCollector(e.target.value)}
                          className="w-full h-12 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-4"
                        >
                          <option value="">Select collector...</option>
                          {staffList.map((s) => (
                            <option key={s.id} value={s.staff_id}>
                              {s.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">
                          Payment Mode
                        </label>
                        <select
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value)}
                          className="w-full h-12 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-4"
                        >
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="bank">Bank Transfer</option>
                          <option value="online">Online</option>
                          <option value="cheque">Cheque</option>
                          <option value="dd">Demand Draft</option>
                        </select>
                      </div>
                      {(paymentMode === 'upi' ||
                        paymentMode === 'bank' ||
                        paymentMode === 'online' ||
                        paymentMode === 'cheque' ||
                        paymentMode === 'dd') && (
                        <Input
                          label="Reference number"
                          value={referenceNo}
                          onChange={(e) => setReferenceNo(e.target.value)}
                          placeholder="Transaction ID, UPI ref, cheque no."
                        />
                      )}

                      <div className="pt-4 border-t border-gray-200 dark:border-slate-700 space-y-2">
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          Allocated {formatCurrency(totalAllocated)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          Total Due (all visible rows) {formatCurrency(totalDue)}
                        </p>
                      </div>

                      <Button
                        onClick={handleCollectPayment}
                        disabled={
                          collecting ||
                          !paymentAmount ||
                          parseFloat(paymentAmount) <= 0 ||
                          totalAllocated === 0 ||
                          !selectedCollector
                        }
                        className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2"
                      >
                        {collecting ? (
                          <>
                            <Loader2 size={20} className="animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Receipt size={20} />
                            Collect & Generate Receipt
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </>
        )}

        {/* Student list - when no student selected or for quick select */}
        {!selectedStudent && (
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Students with pending dues
            </h2>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={32} className="animate-spin text-blue-600" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-slate-400 px-2">
                <Users size={48} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                <p className="font-medium text-gray-800 dark:text-slate-200">No students with pending dues</p>
                <p className="text-sm mt-2 max-w-md mx-auto leading-relaxed">
                  {searchQuery.trim() || classFilter || sectionFilter ? (
                    <>
                      Nothing matches your search or class/section filters for session{' '}
                      <span className="font-medium text-gray-700 dark:text-slate-300">
                        {currentAcademicYear || '—'}
                      </span>
                      . Try <span className="font-medium">Clear filters</span> or another class/section.
                    </>
                  ) : pendingStudents.length === 0 ? (
                    <>
                      No unpaid installments in this session (
                      <span className="font-medium">{currentAcademicYear || 'current'}</span>
                      ) for active fee structures, or dues are not in pending/partial/overdue status.
                    </>
                  ) : (
                    'No names match your search.'
                  )}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                {filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleStudentSelect(student)}
                    className="text-left p-4 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors"
                  >
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {student.student_name}
                    </p>
                    <p className="text-sm font-mono text-gray-500 dark:text-slate-400">
                      {student.admission_no} • {student.class}-{student.section}
                    </p>
                    <p className="text-sm font-bold text-red-600 dark:text-red-400 mt-1">
                      {formatCurrency(student.pending_amount)} due
                    </p>
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}

        {!selectedStudent && (
          <Card className="p-5 mt-6 border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                  <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" />
                  Paid for current period
                </h2>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                  Students who have{' '}
                  <span className="font-medium text-gray-800 dark:text-slate-200">no balance</span> on every fee
                  installment that falls in the selected period (they may still owe other months or quarters). Session{' '}
                  <span className="font-medium">{currentAcademicYear || '—'}</span>
                  {classFilter ? (
                    <>
                      {' '}
                      · class <span className="font-medium">{classFilter}</span>
                      {sectionFilter ? (
                        <>
                          {' '}
                          · section <span className="font-medium">{sectionFilter}</span>
                        </>
                      ) : null}
                    </>
                  ) : null}
                  .
                </p>
                {paidUpPeriodMeta?.label && (
                  <p className="text-xs text-emerald-800 dark:text-emerald-300/90 mt-2 font-medium">
                    Period: {paidUpPeriodMeta.label}
                    {paidUpPeriodMeta.as_of ? (
                      <span className="font-normal text-gray-500 dark:text-slate-500">
                        {' '}
                        (as of {paidUpPeriodMeta.as_of})
                      </span>
                    ) : null}
                  </p>
                )}
              </div>
              <div className="flex rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900/40 p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setPaidPeriodListMode('month')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    paidPeriodListMode === 'month'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  This month
                </button>
                <button
                  type="button"
                  onClick={() => setPaidPeriodListMode('quarter')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    paidPeriodListMode === 'quarter'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                >
                  This quarter
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-500 mb-4 -mt-2">
              <span className="font-medium text-gray-600 dark:text-slate-400">Month:</span> calendar month of
              due-month on each fee row. <span className="font-medium text-gray-600 dark:text-slate-400">Quarter:</span>{' '}
              academic quarters Apr–Jun, Jul–Sep, Oct–Dec, Jan–Mar (Apr–Mar year).
            </p>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={28} className="animate-spin text-emerald-600" />
              </div>
            ) : filteredPaidUpStudents.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-slate-400">
                <UserCheck size={40} className="mx-auto mb-2 text-emerald-200 dark:text-emerald-900" />
                <p className="font-medium">
                  No students cleared for{' '}
                  {paidPeriodListMode === 'month' ? 'this calendar month' : 'this academic quarter'}
                </p>
                <p className="text-sm mt-1 max-w-md mx-auto">
                  Either no installments fall in this period, or some are still due. Try the other period toggle,
                  adjust class/section, or collect outstanding dues from the list above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto">
                {filteredPaidUpStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => handleStudentSelect(student)}
                    className="text-left p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 transition-colors"
                  >
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {student.student_name}
                    </p>
                    <p className="text-sm font-mono text-gray-500 dark:text-slate-400">
                      {student.admission_no} • {student.class}-{student.section}
                    </p>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                      {student.installment_count} installment{student.installment_count !== 1 ? 's' : ''} in period
                      {' · '}
                      {formatCurrency(student.total_paid_session)} received
                      {student.period_label ? (
                        <span className="block text-[11px] text-gray-500 dark:text-slate-500 mt-0.5">
                          {student.period_label}
                        </span>
                      ) : null}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
