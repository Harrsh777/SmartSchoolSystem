'use client';

import { use, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  Receipt,
  Users,
  FileText,
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
import { MANUAL_LINES_SECTION_TITLE, manualLineReceiptLabel } from '@/lib/fees/manual-line-display';

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

/** Align with payment validation / pending list — float noise and rounding */
const FEE_SETTLED_EPS = 0.02;
const TRANSPORT_PAY_EPS = 0.02;

function isInstallmentSettled(fee: Pick<StudentFee, 'total_due'>): boolean {
  return Number(fee.total_due || 0) <= FEE_SETTLED_EPS;
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
  roll_number?: string;
  student_name: string;
  class: string;
  section: string;
  pending_amount: number;
  late_fee_amount?: number;
  due_date: string;
  /** Sum of all pending fee rows (academic + transport); list column uses `pending_amount` for current month academic only. */
  total_pending_amount?: number;
  academic_fee_status?: 'NONE' | 'CURRENT_DUE' | 'CURRENT_CLEAR';
  transport?:
    | { mode: 'MERGED' }
    | { mode: 'NONE' }
    | {
        mode: 'SEPARATE';
        period_label: string;
        balance_due: number;
        expected: number;
        paid: boolean;
      };
}

interface SiblingDueRow {
  id: string;
  student_name: string;
  admission_no: string;
  roll_number?: string;
  class: string;
  section: string;
  due_for_selected_period: number;
}

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
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [classRows, setClassRows] = useState<Array<{ class?: string; section?: string }>>([]);
  const [selectedStudent, setSelectedStudent] = useState<PendingStudent | null>(null);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [feesLoading, setFeesLoading] = useState(false);
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
  /** Active installment inside the expanded structure (for uncluttered right-side detail view) */
  const [activeFeeId, setActiveFeeId] = useState<string | null>(null);
  /** Receipt modal before final collect */
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [siblingRows, setSiblingRows] = useState<SiblingDueRow[]>([]);
  const [siblingsLoading, setSiblingsLoading] = useState(false);
  const [hasHydratedFromQuery, setHasHydratedFromQuery] = useState(false);

  const [latestPaymentId, setLatestPaymentId] = useState<string | null>(null);
  const [latestReceiptNo, setLatestReceiptNo] = useState<string | null>(null);

  // Add-on manual lines for the active installment only (receipt-scoped in UI)
  const [miscAddLabel, setMiscAddLabel] = useState<string>('');
  const [miscAddAmount, setMiscAddAmount] = useState<string>('');
  const [discountAddMode, setDiscountAddMode] = useState<'percent' | 'flat'>('percent');
  const [discountAddPercent, setDiscountAddPercent] = useState<string>('');
  const [discountAddFlat, setDiscountAddFlat] = useState<string>('');
  const [lineSaving, setLineSaving] = useState<boolean>(false);
  /** Shown next to misc/discount actions (global banner is easy to miss when scrolled) */
  const [feeLineError, setFeeLineError] = useState('');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const lastActiveInstallmentDueRef = useRef<number>(0);

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

  useEffect(() => {
    if (hasHydratedFromQuery) return;
    const queryClass = String(searchParams.get('class') || '').trim();
    const querySection = String(searchParams.get('section') || '').trim();
    const queryAcademicYear = String(searchParams.get('academic_year') || '').trim();
    if (queryClass) setClassFilter(queryClass);
    if (querySection) setSectionFilter(querySection);
    if (queryAcademicYear) setCurrentAcademicYear(queryAcademicYear);
    setHasHydratedFromQuery(true);
  }, [hasHydratedFromQuery, searchParams]);

  const fetchPendingStudents = useCallback(async (opts?: { quiet?: boolean }) => {
    try {
      // Only show results once a specific class + section is selected.
      if (!classFilter || !sectionFilter) {
        setPendingStudents([]);
        setSelectedStudent(null);
        setStudentFees([]);
        setRecentPayments([]);
        setAllocations({});
        setPartialAmount('');
        setExpandedStructureId(null);
        return;
      }

      if (!opts?.quiet) setLoading(true);
      setError('');
      const q = new URLSearchParams({ school_code: schoolCode, limit: '300' });
      if (classFilter) q.set('class', classFilter);
      if (sectionFilter) q.set('section', sectionFilter);
      if (currentAcademicYear) q.set('academic_year', currentAcademicYear);

      const pendingUrl = `/api/v2/fees/students/pending?${q.toString()}`;
      const pendingRes = await fetch(pendingUrl, { cache: 'no-store' });
      const pendingJson = await pendingRes.json();

      if (pendingRes.ok) setPendingStudents(pendingJson.data || []);
      else {
        setPendingStudents([]);
        setError(pendingJson.error || 'Failed to load students with pending fees');
      }

    } catch (err) {
      console.error(err);
      setError('Failed to load students');
      setPendingStudents([]);
    } finally {
      if (!opts?.quiet) setLoading(false);
    }
  }, [schoolCode, classFilter, sectionFilter, currentAcademicYear]);

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

  const canAddFeeLines = Boolean(selectedCollector?.trim());

  useEffect(() => {
    setFeeLineError('');
  }, [selectedCollector, activeFeeId, expandedStructureId]);

  const resolveStaffId = (): string => {
    if (selectedCollector) return selectedCollector;
    try {
      const storedStaff = sessionStorage.getItem('staff');
      if (!storedStaff) return '';
      const staffData = JSON.parse(storedStaff);
      return staffData?.staff_id ? String(staffData.staff_id) : '';
    } catch {
      return '';
    }
  };

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

  const handleStudentSelect = async (student: PendingStudent) => {
    setSelectedStudent({
      id: student.id,
      student_name: student.student_name,
      admission_no: student.admission_no,
      roll_number: student.roll_number,
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
    setPartialAmount('');
    setError('');
    setFeeLineError('');
    setSuccess('');

    try {
      setFeesLoading(true);
      const feesUrl = currentAcademicYear
        ? `/api/v2/fees/students/${student.id}/fees?school_code=${schoolCode}&academic_year=${encodeURIComponent(currentAcademicYear)}`
        : `/api/v2/fees/students/${student.id}/fees?school_code=${schoolCode}`;
      const [feesRes, paymentsRes] = await Promise.all([
        fetch(feesUrl, { cache: 'no-store' }),
        fetch(`/api/v2/fees/payments?school_code=${schoolCode}&student_id=${student.id}`, {
          cache: 'no-store',
        }),
      ]);

      const feesResult = await feesRes.json();
      const paymentsResult = await paymentsRes.json();

      if (feesRes.ok) {
        const feesList = Array.isArray(feesResult.data) ? feesResult.data : [];
        setStudentFees(feesList);
        const sumOutstanding = feesList.reduce(
          (s: number, f: StudentFee) => s + Math.max(0, Number(f.total_due) || 0),
          0
        );
        setSelectedStudent((prev) =>
          prev && prev.id === student.id
            ? { ...prev, pending_amount: Math.round(sumOutstanding * 100) / 100 }
            : prev
        );
      } else setError(feesResult.error || 'Failed to load fees');

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
    fetch(feesUrl, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.data) {
          const feesList = Array.isArray(data.data) ? data.data : [];
          setStudentFees(feesList);
          const sumOutstanding = feesList.reduce(
            (s: number, f: StudentFee) => s + Math.max(0, Number(f.total_due) || 0),
            0
          );
          setSelectedStudent((prev) =>
            prev && prev.id === selectedStudent.id
              ? { ...prev, pending_amount: Math.round(sumOutstanding * 100) / 100 }
              : prev
          );
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load fees for selected year');
      })
      .finally(() => {
        if (!cancelled) setFeesLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentAcademicYear, schoolCode, selectedStudent?.id]);

  useEffect(() => {
    const preselectId = String(searchParams.get('student_id') || '').trim();
    if (!preselectId || !classFilter || !sectionFilter || pendingStudents.length === 0) return;
    if (selectedStudent?.id === preselectId) return;
    const target = pendingStudents.find((s) => s.id === preselectId);
    if (target) {
      void handleStudentSelect(target);
    }
    // Deliberately avoid `handleStudentSelect` in deps to prevent repeated auto-select loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, classFilter, sectionFilter, pendingStudents, selectedStudent?.id]);

  const handleInstallmentSelect = (fee: StudentFee) => {
    const settled = isInstallmentSettled(fee);

    if (activeFeeId === fee.id) {
      setActiveFeeId(null);
      setAllocations({});
      setPartialAmount('');
      setReceiptModalOpen(false);
      return;
    }

    setActiveFeeId(fee.id);
    setReceiptModalOpen(false);

    if (settled) {
      setAllocations({});
      setPartialAmount('');
      setMiscAddLabel('');
      setMiscAddAmount('');
      setDiscountAddMode('percent');
      setDiscountAddPercent('');
      setDiscountAddFlat('');
      return;
    }

    const amt = Math.round(Number(fee.total_due || 0) * 100) / 100;
    setAllocations(amt > 0 ? { [fee.id]: amt } : {});
    setPartialAmount(amt > 0 ? String(amt) : '');

    setMiscAddLabel('');
    setMiscAddAmount('');
    setDiscountAddMode('percent');
    setDiscountAddPercent('');
    setDiscountAddFlat('');
  };

  const handlePartialAmountChange = (raw: string) => {
    setPartialAmount(raw);
    if (!activeSelectedFee || isInstallmentSettled(activeSelectedFee)) return;

    const due = Math.max(0, Number(activeSelectedFee.total_due || 0));
    if (raw.trim() === '') {
      setAllocations({});
      setError('');
      return;
    }

    const entered = Number(raw);
    if (!Number.isFinite(entered) || entered <= 0) {
      setError('Partial payment amount must be greater than 0');
      return;
    }

    const safe = Math.round(Math.min(entered, due) * 100) / 100;
    if (entered > due) {
      setError(`Amount capped to due ${formatCurrency(due)}`);
      setPartialAmount(String(safe));
    } else {
      setError('');
    }
    setAllocations(safe > 0 ? { [activeSelectedFee.id]: safe } : {});
  };

  const reloadSelectedStudentFees = async () => {
    if (!selectedStudent) return;
    try {
      setFeesLoading(true);
      const feesUrl = currentAcademicYear
        ? `/api/v2/fees/students/${selectedStudent.id}/fees?school_code=${schoolCode}&academic_year=${encodeURIComponent(currentAcademicYear)}`
        : `/api/v2/fees/students/${selectedStudent.id}/fees?school_code=${schoolCode}`;

      const res = await fetch(feesUrl, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        const feesList = Array.isArray(data.data) ? data.data : [];
        setStudentFees(feesList);
        const sumOutstanding = feesList.reduce(
          (s: number, f: StudentFee) => s + Math.max(0, Number(f.total_due) || 0),
          0
        );
        setSelectedStudent((prev) =>
          prev && prev.id === selectedStudent.id
            ? { ...prev, pending_amount: Math.round(sumOutstanding * 100) / 100 }
            : prev
        );
        void fetchPendingStudents({ quiet: true });
      } else setError(data.error || 'Failed to reload fees');
    } catch (e) {
      console.error(e);
      setError('Failed to reload fees');
    } finally {
      setFeesLoading(false);
    }
  };

  const handleAddMiscLine = async (feeId: string) => {
    const staffId = resolveStaffId();
    if (!staffId) {
      setFeeLineError('Select a fee collector in the payment section above before adding misc or discount.');
      return;
    }
    const label = miscAddLabel.trim() || 'Misc fee';
    const amountNum = Number(miscAddAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setFeeLineError('Misc amount must be greater than 0');
      return;
    }

    try {
      setLineSaving(true);
      setFeeLineError('');
      const res = await fetch(`/api/v2/fees/student-fees/${feeId}/lines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-id': staffId,
        },
        body: JSON.stringify({
          school_code: schoolCode,
          label,
          amount: Math.round(amountNum * 100) / 100,
          kind: 'misc',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeeLineError(data.error || 'Failed to add misc line');
        return;
      }

      setMiscAddLabel('');
      setMiscAddAmount('');
      await reloadSelectedStudentFees();
    } catch (e) {
      console.error(e);
      setFeeLineError('Failed to add misc line');
    } finally {
      setLineSaving(false);
    }
  };

  const handleAddDiscountLine = async (feeId: string) => {
    const staffId = resolveStaffId();
    if (!staffId) {
      setFeeLineError('Select a fee collector in the payment section above before adding misc or discount.');
      return;
    }

    const feeRow = studentFees.find((f) => f.id === feeId);
    const baseAmount = Number((feeRow?.base_amount ?? 0) || 0);
    const miscSubtotal = (feeRow?.installment_manual_lines || [])
      .filter((l) => l.kind === 'misc')
      .reduce((s, l) => s + Number(l.amount || 0), 0);
    const rulesDelta = Number((feeRow as { rules_adjustment_delta?: number })?.rules_adjustment_delta ?? 0);
    const baseForDiscount = Math.max(0, baseAmount + rulesDelta + miscSubtotal);
    let discountAmount = 0;

    if (discountAddMode === 'percent') {
      const p = Number(discountAddPercent);
      if (!Number.isFinite(p) || p <= 0) {
        setFeeLineError('Discount % must be greater than 0');
        return;
      }
      discountAmount = (baseForDiscount * p) / 100;
    } else {
      const flat = Number(discountAddFlat);
      if (!Number.isFinite(flat) || flat <= 0) {
        setFeeLineError('Discount amount must be greater than 0');
        return;
      }
      discountAmount = flat;
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    if (!Number.isFinite(discountAmount) || discountAmount <= 0) {
      setFeeLineError('Invalid discount amount');
      return;
    }

    const label =
      discountAddMode === 'percent'
        ? `Discount ${discountAddPercent}%`
        : `Discount ${discountAddFlat}`;

    try {
      setLineSaving(true);
      setFeeLineError('');
      const res = await fetch(`/api/v2/fees/student-fees/${feeId}/lines`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-id': staffId,
        },
        body: JSON.stringify({
          school_code: schoolCode,
          label,
          amount: discountAmount,
          kind: 'discount',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeeLineError(data.error || 'Failed to add discount line');
        return;
      }

      setDiscountAddPercent('');
      setDiscountAddFlat('');
      await reloadSelectedStudentFees();
    } catch (e) {
      console.error(e);
      setFeeLineError('Failed to add discount line');
    } finally {
      setLineSaving(false);
    }
  };

  const handleCollectPayment = async () => {
    if (!selectedStudent) return;
    const totalAllocated = Object.values(allocations).reduce((sum, amt) => sum + amt, 0);
    const paymentAmt = Math.round(totalAllocated * 100) / 100;
    if (paymentAmt <= 0) {
      setError('Payment amount must be greater than 0');
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
        const paymentId = result?.data?.payment?.id ? String(result.data.payment.id) : null;
        const receiptNo = result?.data?.receipt?.receipt_no
          ? String(result.data.receipt.receipt_no)
          : null;

        setLatestPaymentId(paymentId);
        setLatestReceiptNo(receiptNo);
        setSuccess(
          receiptNo
            ? `Payment collected successfully! Receipt no. ${receiptNo}`
            : 'Payment collected successfully! Receipt generated.'
        );
        setSelectedStudent(null);
        setStudentFees([]);
        setRecentPayments([]);
        setAllocations({});
        setPartialAmount('');
        setReferenceNo('');
        setReceiptModalOpen(false);
        setActiveFeeId(null);
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

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? pendingStudents.filter(
          (s) =>
            s.student_name.toLowerCase().includes(q) ||
            s.admission_no.toLowerCase().includes(q) ||
            String(s.roll_number || '')
              .toLowerCase()
              .includes(q)
        )
      : [...pendingStudents];
    list.sort((a, b) => {
      const ra = String(a.roll_number || '').trim();
      const rb = String(b.roll_number || '').trim();
      if (!ra && !rb) {
        return a.student_name.localeCompare(b.student_name, undefined, { sensitivity: 'base' });
      }
      if (!ra) return 1;
      if (!rb) return -1;
      const cmp = ra.localeCompare(rb, undefined, { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return cmp;
      return a.student_name.localeCompare(b.student_name, undefined, { sensitivity: 'base' });
    });
    return list;
  }, [pendingStudents, searchQuery]);

  const totalDue = studentFees.reduce((sum, f) => sum + f.total_due, 0);
  const totalDueForDisplay = selectedStudent ? selectedStudent.pending_amount : totalDue;
  const totalAllocated = Object.values(allocations).reduce((sum, amt) => sum + amt, 0);
  const totalPaid = studentFees.reduce((sum, f) => sum + f.paid_amount, 0);
  const receiptSelectedFees = useMemo(
    () => studentFees.filter((f) => (allocations[f.id] ?? 0) > 0.009),
    [studentFees, allocations]
  );

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
    setActiveFeeId(null);
    setReceiptModalOpen(false);
    setMiscAddLabel('');
    setMiscAddAmount('');
    setDiscountAddMode('percent');
    setDiscountAddPercent('');
    setDiscountAddFlat('');
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
      g.pendingInstallments = g.fees.filter((f) => !isInstallmentSettled(f)).length;
      out.push(g);
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [studentFees]);

  const activeStructureGroup = useMemo(() => {
    if (!expandedStructureId) return null;
    return structureGroups.find((g) => g.key === expandedStructureId) ?? null;
  }, [expandedStructureId, structureGroups]);

  const activeSelectedFee = useMemo(() => {
    if (!activeStructureGroup || !activeFeeId) return null;
    return activeStructureGroup.fees.find((f) => f.id === activeFeeId) ?? null;
  }, [activeStructureGroup, activeFeeId]);

  useEffect(() => {
    if (!selectedStudent) {
      setSiblingRows([]);
      setSiblingsLoading(false);
      return;
    }
    const dueMonth = String(activeSelectedFee?.due_month || '').trim();
    let cancelled = false;
    setSiblingsLoading(true);
    const q = new URLSearchParams({ school_code: schoolCode });
    if (currentAcademicYear) q.set('academic_year', currentAcademicYear);
    if (dueMonth) q.set('due_month', dueMonth);
    fetch(`/api/v2/fees/students/${selectedStudent.id}/siblings?${q.toString()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setSiblingRows(Array.isArray(data.data) ? (data.data as SiblingDueRow[]) : []);
      })
      .catch(() => {
        if (!cancelled) setSiblingRows([]);
      })
      .finally(() => {
        if (!cancelled) setSiblingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedStudent?.id, activeSelectedFee?.due_month, currentAcademicYear, schoolCode]);

  useEffect(() => {
    lastActiveInstallmentDueRef.current = 0;
  }, [activeFeeId]);

  /** After misc/discount reload, fix stale allocations (was full due, now lower) or raise when due increased from same “full pay” snapshot. */
  useEffect(() => {
    if (!activeFeeId) return;
    const fee = studentFees.find((f) => f.id === activeFeeId);
    if (!fee || isInstallmentSettled(fee)) return;
    const due = Math.round(Math.max(0, Number(fee.total_due || 0)) * 100) / 100;
    const prevDueSnap = lastActiveInstallmentDueRef.current;
    lastActiveInstallmentDueRef.current = due;

    setAllocations((prev) => {
      const cur = prev[activeFeeId] ?? 0;
      if (cur <= FEE_SETTLED_EPS) return prev;
      if (cur > due + FEE_SETTLED_EPS) {
        const capped = Math.round(due * 100) / 100;
        return capped > FEE_SETTLED_EPS ? { [activeFeeId]: capped } : {};
      }
      if (
        prevDueSnap > FEE_SETTLED_EPS &&
        Math.abs(cur - prevDueSnap) <= FEE_SETTLED_EPS &&
        due > cur + FEE_SETTLED_EPS
      ) {
        return { [activeFeeId]: Math.round(due * 100) / 100 };
      }
      return prev;
    });

    setPartialAmount((prev) => {
      const n = parseFloat(prev);
      if (!Number.isFinite(n) || n <= FEE_SETTLED_EPS) return prev;
      if (n > due + FEE_SETTLED_EPS) return String(Math.round(due * 100) / 100);
      if (
        prevDueSnap > FEE_SETTLED_EPS &&
        Math.abs(n - prevDueSnap) <= FEE_SETTLED_EPS &&
        due > n + FEE_SETTLED_EPS
      ) {
        return String(Math.round(due * 100) / 100);
      }
      return prev;
    });
  }, [studentFees, activeFeeId]);

  // Keep the right-side detail view focused on one installment (the activeFeeId)
  useEffect(() => {
    if (!selectedStudent || !expandedStructureId) {
      setActiveFeeId(null);
      setAllocations({});
      setPartialAmount('');
      return;
    }

    // Wait for explicit installment selection (single-select).
    setActiveFeeId(null);
    setAllocations({});
    setPartialAmount('');

    // Receipt-scoped inputs should start fresh.
    setMiscAddLabel('');
    setMiscAddAmount('');
    setDiscountAddMode('percent');
    setDiscountAddPercent('');
    setDiscountAddFlat('');
  }, [expandedStructureId, selectedStudent?.id]);

  // Restrict allocations to the currently expanded fee-structure group
  useEffect(() => {
    setAllocations({});
    setPartialAmount('');
    setMiscAddLabel('');
    setMiscAddAmount('');
    setDiscountAddPercent('');
    setDiscountAddFlat('');
  }, [expandedStructureId, selectedStudent?.id]);

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

  /** Split a receipt amount across structure heads (for partial payments / this-receipt preview). */
  const structureHeadAllocatedForReceipt = (fee: StudentFee, receiptAmount: number) => {
    const items = fee.structure_line_items || [];
    const totalTpl = items.reduce((s, i) => s + Number(i.amount || 0), 0);
    const amt = Math.max(0, Number(receiptAmount) || 0);
    if (items.length === 0 || totalTpl <= 0) return [];
    return items.map((i) => {
      const a = Number(i.amount || 0);
      return {
        name: i.fee_head?.name || 'Fee head',
        template: a,
        allocated: Math.round(((a / totalTpl) * amt) * 100) / 100,
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

  const openReceiptView = async (paymentId: string) => {
    try {
      const q = new URLSearchParams({ school_code: schoolCode });
      const res = await fetch(`/api/fees/receipts/${paymentId}/download?${q.toString()}`);
      const html = await res.text();
      if (!res.ok) throw new Error('Failed to load receipt HTML');
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (e) {
      console.error(e);
      setError('Failed to open receipt');
    }
  };

  const printReceipt = async (paymentId: string) => {
    try {
      const q = new URLSearchParams({ school_code: schoolCode });
      const res = await fetch(`/api/fees/receipts/${paymentId}/download?${q.toString()}`);
      const html = await res.text();
      if (!res.ok) throw new Error('Failed to load receipt HTML');
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.open();
      w.document.write(html);
      w.document.close();
      // Give browser a moment to render before printing.
      setTimeout(() => w.print(), 500);
    } catch (e) {
      console.error(e);
      setError('Failed to print receipt');
    }
  };

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
              {latestPaymentId && (
                <div className="ml-auto flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 px-3"
                    onClick={() => void openReceiptView(latestPaymentId)}
                  >
                    View
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 px-3"
                    onClick={() => void printReceipt(latestPaymentId)}
                  >
                    Print
                  </Button>
                </div>
              )}
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
                    placeholder="Name, admission no., or roll no."
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
                  <option value="">Select class</option>
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
                  <option value="">{classFilter ? 'Select a section' : 'Select a class first'}</option>
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
                    {selectedStudent.roll_number?.trim()
                      ? `Roll ${selectedStudent.roll_number.trim()} • `
                      : ''}
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
              <div className="space-y-6">
                {/* Student summary (top) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-4 bg-blue-600 border-0 text-white">
                    <div className="flex items-center gap-2 text-blue-100 mb-1">
                      <User size={18} />
                      <span className="text-xs font-medium uppercase tracking-wide">Student Name</span>
                    </div>
                    <p className="text-lg font-bold truncate">{selectedStudent.student_name}</p>
                    <p className="text-xs text-blue-100/90 mt-1 font-mono truncate">
                      {selectedStudent.class}-{selectedStudent.section} · {selectedStudent.admission_no}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 mb-1">
                      <Hash size={18} />
                      <span className="text-xs font-medium uppercase tracking-wide">Roll Number</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white font-mono">
                      {selectedStudent.roll_number?.trim() || '—'}
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
                <Card className="p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                      Siblings (Father Mobile)
                    </p>
                    {activeSelectedFee?.due_month ? (
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        Period {activeSelectedFee.due_month}
                      </span>
                    ) : null}
                  </div>
                  {siblingsLoading ? (
                    <p className="text-xs text-gray-500 dark:text-slate-400">Checking siblings...</p>
                  ) : siblingRows.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-slate-400">no siblings</p>
                  ) : (
                    <div className="space-y-2">
                      {siblingRows.map((sib) => (
                        <button
                          key={sib.id}
                          type="button"
                          onClick={() => {
                            const q = new URLSearchParams();
                            q.set('class', sib.class);
                            q.set('section', sib.section);
                            q.set('student_id', sib.id);
                            if (currentAcademicYear) q.set('academic_year', currentAcademicYear);
                            router.push(`/dashboard/${schoolCode}/fees/v2/collection?${q.toString()}`);
                          }}
                          className="w-full rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2 text-left hover:border-blue-300 dark:hover:border-blue-600"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {sib.student_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">
                                {sib.roll_number?.trim() ? `Roll ${sib.roll_number} • ` : ''}
                                {sib.admission_no} • {sib.class}-{sib.section}
                              </p>
                            </div>
                            <p
                              className={`text-sm font-semibold tabular-nums ${
                                sib.due_for_selected_period > 0
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-green-600 dark:text-green-400'
                              }`}
                            >
                              {sib.due_for_selected_period > 0
                                ? formatCurrency(sib.due_for_selected_period)
                                : 'No due'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </Card>

                {/* Fee structures → receipt-style breakdown */}
                <div>
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
                              className="hidden rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-gradient-to-b from-white via-slate-50/80 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 shadow-[0_1px_0_rgba(15,23,42,0.06),0_12px_40px_-12px_rgba(15,23,42,0.15)] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)] overflow-hidden"
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
                                      <span className="font-mono">
                                        Roll {selectedStudent.roll_number?.trim() || '—'}
                                      </span>
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
                                <div className="flex flex-col gap-4 items-start">
                                  <div className="min-w-0 order-1">
                                    {/* Installments */}
                                    <div className="rounded-2xl border border-gray-200/80 dark:border-slate-700 bg-white/70 dark:bg-slate-900/20 p-3">
                                      <div className="flex items-center justify-between gap-3 mb-2">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Installments</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                                          Pay open installments; settled ones open as read-only receipt
                                        </p>
                                    </div>
                                      <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 tabular-nums">
                                        Selected: {activeFeeId ? '1' : '0'}
                                      </div>
                                    </div>

                                    <div className="max-h-44 overflow-y-auto pr-1 space-y-2">
                                      {expandedGroup.fees.map((fee) => {
                                        const settled = isInstallmentSettled(fee);
                                        const selected = activeFeeId === fee.id;

                                      return (
                                        <div
                                          key={fee.id}
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => handleInstallmentSelect(fee)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                              e.preventDefault();
                                              handleInstallmentSelect(fee);
                                            }
                                          }}
                                          className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                                            selected && settled
                                              ? 'border-emerald-400/90 bg-emerald-50/70 dark:border-emerald-700/80 dark:bg-emerald-950/25'
                                              : selected
                                              ? 'border-blue-400/80 bg-blue-50/60 dark:border-blue-700/80 dark:bg-blue-950/20'
                                              : 'border-gray-200/80 dark:border-slate-700 bg-white/60 dark:bg-slate-900/20 hover:border-gray-300/80 dark:hover:border-slate-600'
                                          }`}
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                              <p className="font-semibold text-gray-900 dark:text-white truncate">
                                                {fee.installment_display_label || fee.fee_structure?.name || 'Installment'}
                                              </p>
                                              <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                                                Due {fee.due_date ? formatDateShort(fee.due_date) : '—'} ·{' '}
                                                <span className="font-medium tabular-nums">
                                                  {settled ? 'Settled' : formatCurrency(fee.total_due)}
                                                </span>
                                                {settled && (
                                                  <span className="ml-1 text-emerald-700 dark:text-emerald-400 font-medium">
                                                    · view receipt
                                                  </span>
                                                )}
                                              </p>
                                            </div>

                                            <div className="shrink-0 mt-0.5">
                                              <span
                                                className={`inline-flex items-center justify-center w-5 h-5 rounded-full border ${
                                                  selected
                                                    ? settled
                                                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                                                      : 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
                                                    : 'border-gray-300 bg-white/60 text-gray-500'
                                                }`}
                                              >
                                                {selected ? '✓' : ''}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  </div>
                                  </div>

                                  <div className="min-w-0 order-2">
                                    {/* Receipt detail (only for active installment) */}
                                    {!activeFeeId && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-900/30 py-10 px-6 text-center"
                                      >
                                        <Receipt size={44} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                                        <p className="font-medium text-gray-700 dark:text-slate-300">
                                          Select an installment to preview receipt
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                                          Then you can add misc fees and discounts.
                                        </p>
                                      </motion.div>
                                    )}
                                    {expandedGroup.fees
                                      .filter((fee) =>
                                        activeFeeId ? fee.id === activeFeeId : false
                                      )
                                      .map((fee) => {
                                  const isPaid = isInstallmentSettled(fee);
                                  const allocated = allocations[fee.id] || 0;
                                  const lastPaidDate = lastPaymentDateByFeeId[fee.id];
                                  const isOverdue =
                                    !isPaid &&
                                    (fee.status === 'overdue' || new Date(fee.due_date) < new Date());
                                  const lines = fee.adjustment_lines ?? [];
                                  const manual = fee.installment_manual_lines ?? [];
                                  const heads = isPaid
                                    ? structureHeadAllocated(fee)
                                    : structureHeadAllocatedForReceipt(fee, allocated);
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
                                      {isPaid && (
                                        <div className="px-4 py-2.5 bg-emerald-100/90 dark:bg-emerald-900/40 border-b border-emerald-200 dark:border-emerald-800 text-sm text-emerald-900 dark:text-emerald-100">
                                          Fully paid — read-only preview. Use{' '}
                                          <span className="font-semibold">Previous paid receipts</span> below to
                                          reprint the official receipt.
                                        </div>
                                      )}
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
                                          {/* Amount allocation happens from the left Installments panel */}
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
                                            {manual.length > 0 && (
                                              <div className="mt-3">
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                                                  {MANUAL_LINES_SECTION_TITLE}
                                                </p>
                                                <ul className="rounded-lg border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-800">
                                                  {manual.map((ln) => (
                                                    <li
                                                      key={ln.id}
                                                      className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-sm text-gray-800 dark:text-slate-200"
                                                    >
                                                      <span className="min-w-0">
                                                        {manualLineReceiptLabel(ln)}
                                                      </span>
                                                      <span
                                                        className={`tabular-nums font-medium text-right shrink-0 ${
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

                                        {/* Receipt-scoped manual lines (added only for the active installment) */}
                                        {!isPaid && (
                                          <div className="rounded-xl border border-dashed border-gray-300/80 dark:border-slate-600 bg-gray-50/60 dark:bg-slate-900/20 px-3 py-3 mt-3">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-3">
                                              Add misc fee / discount (to this receipt)
                                            </p>

                                            {feeLineError ? (
                                              <div
                                                role="alert"
                                                className="mb-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/50 px-3 py-2.5 flex gap-2.5 items-start text-sm text-red-900 dark:text-red-100"
                                              >
                                                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                                                <p className="font-medium leading-snug">{feeLineError}</p>
                                              </div>
                                            ) : null}
                                            {!canAddFeeLines ? (
                                              <div
                                                className="mb-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/35 px-3 py-2.5 text-sm text-amber-950 dark:text-amber-50"
                                                aria-live="polite"
                                              >
                                                <p className="font-semibold">Select a fee collector first</p>
                                                <p className="text-xs mt-1 text-amber-900/85 dark:text-amber-100/85">
                                                  Use the payment section above to choose who is collecting. Misc and discount stay disabled until a collector is selected.
                                                </p>
                                              </div>
                                            ) : null}

                                            <div className="space-y-3">
                                              <div>
                                                <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 mb-2">Misc fee</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                  <Input
                                                    value={miscAddLabel}
                                                    onChange={(e) => setMiscAddLabel(e.target.value)}
                                                    placeholder="Label (e.g., Library)"
                                                    className="h-10"
                                                  />
                                                  <Input
                                                    type="number"
                                                    step={0.01}
                                                    value={miscAddAmount}
                                                    onChange={(e) => setMiscAddAmount(e.target.value)}
                                                    placeholder="Amount"
                                                    className="h-10"
                                                  />
                                                </div>
                                                <div className="mt-2 flex gap-2 items-center">
                                                  <Button
                                                    type="button"
                                                    disabled={lineSaving || !canAddFeeLines}
                                                    onClick={async () => {
                                                      if (!fee?.id) return;
                                                      // Handler implemented in component scope
                                                      await Promise.resolve(handleAddMiscLine(fee.id));
                                                    }}
                                                    className="h-9 text-sm font-semibold"
                                                  >
                                                    Add misc
                                                  </Button>
                                                </div>
                                              </div>

                                              <div className="pt-3 border-t border-gray-200/60 dark:border-slate-700/60">
                                                <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 mb-2">Discount</p>

                                                <div className="flex gap-2 items-center mb-2">
                                                  <select
                                                    value={discountAddMode}
                                                    onChange={(e) => setDiscountAddMode(e.target.value as 'percent' | 'flat')}
                                                    className="h-10 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm"
                                                  >
                                                    <option value="percent">%</option>
                                                    <option value="flat">Flat</option>
                                                  </select>

                                                  {discountAddMode === 'percent' ? (
                                                    <Input
                                                      type="number"
                                                      step={0.1}
                                                      value={discountAddPercent}
                                                      onChange={(e) => setDiscountAddPercent(e.target.value)}
                                                      placeholder="Discount %"
                                                      className="h-10"
                                                    />
                                                  ) : (
                                                    <Input
                                                      type="number"
                                                      step={0.01}
                                                      value={discountAddFlat}
                                                      onChange={(e) => setDiscountAddFlat(e.target.value)}
                                                      placeholder="Discount amount"
                                                      className="h-10"
                                                    />
                                                  )}
                                                </div>

                                                <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
                                                  Will be applied on Base amount.
                                                </p>

                                                <div className="flex gap-2 items-center">
                                                  <Button
                                                    type="button"
                                                    disabled={lineSaving || !canAddFeeLines}
                                                    onClick={async () => {
                                                      if (!fee?.id) return;
                                                      await Promise.resolve(handleAddDiscountLine(fee.id));
                                                    }}
                                                    className="h-9 text-sm font-semibold"
                                                  >
                                                    Add discount
                                                  </Button>
                                                  <div className="text-xs text-gray-600 dark:text-slate-300 tabular-nums">
                                                    Base: {formatCurrency(Number(fee.base_amount || 0))}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
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
                                              <span>After adjustments</span>
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
                                </div>
                              </div>
                            </motion.div>
                          );
                        })()}
                      </AnimatePresence>
                    </div>
                  </Card>
                </div>

                {/* Installments + Receipt preview (separate full-width layout) */}
                <div className="space-y-6">
                  {/* Installments box */}
                  <div>
                    <Card className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Installments</h3>
                          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                            Open installments for payment; settled = read-only receipt
                          </p>
                        </div>
                        <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 tabular-nums">
                          {activeSelectedFee ? 'Selected: 1' : 'Selected: 0'}
                        </div>
                      </div>

                      {!activeStructureGroup || activeStructureGroup.fees.length === 0 ? (
                        <div className="py-10 text-center text-gray-500 dark:text-slate-400">
                          <Receipt className="mx-auto mb-3 text-gray-300 dark:text-slate-600" size={42} />
                          <p className="font-medium">Select a fee structure above</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                          {activeStructureGroup.fees.map((fee) => {
                            const settled = isInstallmentSettled(fee);
                            const isSelected = activeFeeId === fee.id;
                            return (
                              <button
                                key={fee.id}
                                type="button"
                                onClick={() => handleInstallmentSelect(fee)}
                                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                                  isSelected && settled
                                    ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/25'
                                    : isSelected
                                    ? 'border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/20'
                                    : 'border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800/30 hover:border-gray-300 dark:hover:border-slate-600'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                                      {fee.installment_display_label || fee.fee_structure?.name || 'Installment'}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">
                                      Due {fee.due_date ? formatDateShort(fee.due_date) : '—'} ·{' '}
                                      <span className="font-medium tabular-nums">
                                        {settled ? 'Settled' : formatCurrency(Number(fee.total_due || 0))}
                                      </span>
                                      {settled && (
                                        <span className="ml-1 text-emerald-700 dark:text-emerald-400 font-medium">
                                          · view receipt
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="shrink-0 mt-0.5">
                                    <span
                                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full border ${
                                        isSelected
                                          ? settled
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                                            : 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
                                          : 'border-gray-300 bg-white/60 text-gray-500'
                                      }`}
                                    >
                                      {isSelected ? '✓' : ''}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* Receipt preview full width */}
                  <div>
                    <Card className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Receipt Preview</h3>
                          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                            Fee heads, transport, misc/discount and summary
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            if (!activeSelectedFee || isInstallmentSettled(activeSelectedFee)) return;
                            setReceiptModalOpen(true);
                          }}
                          disabled={
                            !activeSelectedFee ||
                            isInstallmentSettled(activeSelectedFee) ||
                            !selectedCollector ||
                            collecting
                          }
                          className="h-10"
                        >
                          <Receipt size={18} className="mr-2" />
                          Pay Now
                        </Button>
                      </div>

                      {!activeSelectedFee ? (
                        <div className="py-10 text-center text-gray-500 dark:text-slate-400">
                          <Receipt className="mx-auto mb-3 text-gray-300 dark:text-slate-600" size={44} />
                          <p className="font-medium">Select an installment to preview receipt</p>
                          <p className="text-sm mt-1">Then add misc fee / discount below.</p>
                        </div>
                      ) : (
                        (() => {
                          const fee = activeSelectedFee;
                          const allocated = allocations[fee.id] || 0;
                          const heads = isInstallmentSettled(fee)
                            ? structureHeadAllocated(fee)
                            : structureHeadAllocatedForReceipt(fee, allocated);
                          const manual = fee.installment_manual_lines ?? [];
                          const rules = fee.adjustment_lines ?? [];
                          const isPaid = isInstallmentSettled(fee);
                          const amountDuePreview = Math.max(0, Number(fee.total_due || 0) - allocated);
                          const totalPaidAfterAllocation =
                            Math.round((Number(fee.paid_amount || 0) + allocated) * 100) / 100;
                          return (
                            <div className="space-y-5">
                              {isPaid && (
                                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
                                  Fully paid — read-only preview. Use{' '}
                                  <span className="font-semibold">Previous paid receipts</span> below to reprint.
                                </div>
                              )}
                              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-600/95 to-indigo-600/95 text-white p-5">
                                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
                                    {activeStructureGroup?.name ?? 'Fee structure'}
                                  </p>
                                  <h4 className="text-2xl font-bold tracking-tight mt-1">
                                    {fee.installment_display_label || fee.fee_structure?.name || 'Installment'}
                                  </h4>
                                  <p className="text-sm text-white/90 mt-2">
                                    Due {fee.due_date ? formatDateShort(fee.due_date) : '—'}
                                  </p>
                                  <div className="text-right mt-3">
                                    {!isPaid && allocated > 0 ? (
                                      <>
                                        <p className="text-lg font-bold tabular-nums">{formatCurrency(allocated)}</p>
                                        <p className="text-xs text-white/80 mt-0.5">This receipt</p>
                                        <p className="text-sm font-semibold tabular-nums mt-1">
                                          Balance after: {formatCurrency(amountDuePreview)}
                                        </p>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-lg font-bold tabular-nums">
                                          {formatCurrency(Number(fee.total_due || 0))}
                                        </p>
                                        <p className="text-xs text-white/80 mt-0.5">
                                          {isPaid ? 'Settled' : `Due now ${formatCurrency(amountDuePreview)}`}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="p-4 bg-white dark:bg-slate-900/20">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                                    <div className="space-y-5">
                                      {/* Fee heads */}
                                      <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                                      {isPaid ? 'Fee heads (share of base)' : 'Fee heads (this receipt)'}
                                    </p>
                                    <div className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                                      <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 bg-gray-100 dark:bg-slate-800 text-xs font-semibold text-gray-600 dark:text-slate-300">
                                        <span>Head</span>
                                        <span className="text-right tabular-nums">Amount</span>
                                      </div>
                                      {heads.length === 0 ? (
                                        <div className="px-3 py-3 text-sm text-gray-500 dark:text-slate-400">No heads</div>
                                      ) : (
                                        heads.map((h, idx) => (
                                          <div
                                            key={`${h.name}-${idx}`}
                                            className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-sm border-t border-gray-100 dark:border-slate-800/60 text-gray-800 dark:text-slate-200"
                                          >
                                            <span className="min-w-0 pr-2">{h.name}</span>
                                            <span className="tabular-nums font-medium text-right">{formatCurrency(h.allocated)}</span>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                    {manual.length > 0 && (
                                      <div className="mt-3">
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                                          {MANUAL_LINES_SECTION_TITLE}
                                        </p>
                                        <ul className="rounded-lg border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-800">
                                          {manual.map((ln) => (
                                            <li key={ln.id} className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 text-sm">
                                              <span className="min-w-0">
                                                {ln.label}{' '}
                                                <span className="text-gray-500 text-xs">({ln.kind})</span>
                                              </span>
                                              <span
                                                className={`tabular-nums font-medium text-right ${
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
                                  </div>

                                  {/* Transport snapshot + rules (if any) */}
                                  {rules.length > 0 && (
                                    <div>
                                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                                        Rule adjustments
                                      </p>
                                      <ul className="rounded-lg border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-800">
                                        {rules.map((ln) => (
                                          <li key={ln.rule_id} className="flex justify-between gap-3 px-3 py-2 text-sm text-gray-800 dark:text-slate-200">
                                            <span className="min-w-0">{ln.label}</span>
                                            <span className={`tabular-nums font-medium ${ln.delta < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                              {ln.delta < 0 ? '−' : '+'}
                                              {formatCurrency(Math.abs(ln.delta))}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                    </div>

                                    <div className="space-y-5">
                                      {!isPaid && (
                                        <div className="rounded-xl border border-dashed border-gray-300 dark:border-slate-600 bg-gray-50/60 dark:bg-slate-900/20 p-4">
                                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-3">
                                            Add misc fee / discount (to this receipt)
                                          </p>

                                          {feeLineError ? (
                                            <div
                                              role="alert"
                                              className="mb-3 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/50 px-3 py-2.5 flex gap-2.5 items-start text-sm text-red-900 dark:text-red-100"
                                            >
                                              <AlertCircle className="shrink-0 mt-0.5" size={18} />
                                              <p className="font-medium leading-snug">{feeLineError}</p>
                                            </div>
                                          ) : null}
                                          {!canAddFeeLines ? (
                                            <div
                                              className="mb-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/35 px-3 py-2.5 text-sm text-amber-950 dark:text-amber-50"
                                              aria-live="polite"
                                            >
                                              <p className="font-semibold">Select a fee collector first</p>
                                              <p className="text-xs mt-1 text-amber-900/85 dark:text-amber-100/85">
                                                Use the payment section above to choose who is collecting. Misc and discount stay disabled until a collector is selected.
                                              </p>
                                            </div>
                                          ) : null}

                                      <div className="space-y-4">
                                        <div>
                                          <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 mb-2">Misc fee</p>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <Input
                                              value={miscAddLabel}
                                              onChange={(e) => setMiscAddLabel(e.target.value)}
                                              placeholder="Label (e.g., Library)"
                                              className="h-10"
                                            />
                                            <Input
                                              type="number"
                                              step={0.01}
                                              value={miscAddAmount}
                                              onChange={(e) => setMiscAddAmount(e.target.value)}
                                              placeholder="Amount"
                                              className="h-10"
                                            />
                                          </div>
                                          <div className="mt-2">
                                            <Button
                                              type="button"
                                              disabled={lineSaving || !canAddFeeLines}
                                              onClick={async () => {
                                                if (!fee?.id) return;
                                                await Promise.resolve(handleAddMiscLine(fee.id));
                                              }}
                                              className="h-9 text-sm font-semibold"
                                            >
                                              Add misc
                                            </Button>
                                          </div>
                                        </div>

                                        <div className="pt-3 border-t border-gray-200/60 dark:border-slate-700/60">
                                          <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 mb-2">Discount</p>
                                          <div className="flex gap-2 items-center mb-2">
                                            <select
                                              value={discountAddMode}
                                              onChange={(e) => setDiscountAddMode(e.target.value as 'percent' | 'flat')}
                                              className="h-10 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 text-sm"
                                            >
                                              <option value="percent">%</option>
                                              <option value="flat">Flat</option>
                                            </select>
                                            {discountAddMode === 'percent' ? (
                                              <Input
                                                type="number"
                                                step={0.1}
                                                value={discountAddPercent}
                                                onChange={(e) => setDiscountAddPercent(e.target.value)}
                                                placeholder="Discount %"
                                                className="h-10"
                                              />
                                            ) : (
                                              <Input
                                                type="number"
                                                step={0.01}
                                                value={discountAddFlat}
                                                onChange={(e) => setDiscountAddFlat(e.target.value)}
                                                placeholder="Discount amount"
                                                className="h-10"
                                              />
                                            )}
                                          </div>
                                          <Button
                                            type="button"
                                            disabled={lineSaving || !canAddFeeLines}
                                            onClick={async () => {
                                              if (!fee?.id) return;
                                              await Promise.resolve(handleAddDiscountLine(fee.id));
                                            }}
                                            className="h-9 text-sm font-semibold"
                                          >
                                            Add discount
                                          </Button>
                                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                                            Will be applied on Base amount.
                                          </p>
                                        </div>
                                      </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Summary */}
                                  <div className="rounded-xl bg-slate-100/90 dark:bg-slate-800/60 px-3 py-3 space-y-1.5 text-sm">
                                    <div className="flex justify-between gap-2 text-gray-700 dark:text-slate-300">
                                      <span>Base</span>
                                      <span className="tabular-nums font-medium">{formatCurrency(Number(fee.base_amount || 0))}</span>
                                    </div>
                                    <div className="flex justify-between gap-2 text-gray-700 dark:text-slate-300">
                                      <span>After adjustments</span>
                                      <span className="tabular-nums font-medium">
                                        {typeof fee.final_amount === 'number' ? formatCurrency(fee.final_amount) : formatCurrency(Number(fee.base_amount || 0))}
                                      </span>
                                    </div>
                                    <div className="flex justify-between gap-2 text-gray-700 dark:text-slate-300">
                                      <span>Previously paid</span>
                                      <span className="tabular-nums font-medium">
                                        {formatCurrency(Number(fee.paid_amount || 0))}
                                      </span>
                                    </div>
                                    <div className="flex justify-between gap-2 text-gray-700 dark:text-slate-300">
                                      <span>This receipt</span>
                                      <span className="tabular-nums font-medium">{formatCurrency(allocated)}</span>
                                    </div>
                                    <div className="flex justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-600 text-base font-bold text-gray-900 dark:text-white">
                                      <span>Total paid after this receipt</span>
                                      <span className="tabular-nums">{formatCurrency(totalPaidAfterAllocation)}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-slate-300">
                                      Balance remaining {formatCurrency(amountDuePreview)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </Card>
                  </div>
                </div>

                {/* Payment Details */}
                <div>
                  <Card className="p-5">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Payment Details</h3>
                    <div className="space-y-4">
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
                      {activeSelectedFee && !isInstallmentSettled(activeSelectedFee) && (
                        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 p-3 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                            Partial Payment
                          </p>
                          <p className="text-xs text-gray-600 dark:text-slate-300">
                            Due for selected installment {formatCurrency(Number(activeSelectedFee.total_due || 0))}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center">
                            <Input
                              type="number"
                              step={0.01}
                              min={0}
                              value={partialAmount}
                              onChange={(e) => handlePartialAmountChange(e.target.value)}
                              placeholder="Enter amount to collect"
                              className="h-10"
                            />
                            <div className="flex gap-2 sm:justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-10 whitespace-nowrap"
                                onClick={() => {
                                  const due = Math.round(Number(activeSelectedFee.total_due || 0) * 100) / 100;
                                  setPartialAmount(String(due));
                                  setAllocations(due > 0 ? { [activeSelectedFee.id]: due } : {});
                                  setError('');
                                }}
                              >
                                Full due
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={() => {
                          if (collecting) return;
                          if (activeSelectedFee && isInstallmentSettled(activeSelectedFee)) return;
                          setReceiptModalOpen(true);
                        }}
                        disabled={
                          collecting ||
                          totalAllocated === 0 ||
                          !selectedCollector ||
                          (!!activeSelectedFee && isInstallmentSettled(activeSelectedFee))
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
                            Preview receipt & collect
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                </div>
                
                {/* Previous paid receipts */}
                <div className="mt-6">
                  <Card className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Previous paid receipts
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                          Click a receipt to open the student fee statements.
                        </p>
                      </div>
                      <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 tabular-nums">
                        {recentPayments.length} total
                      </div>
                    </div>

                    {recentPayments.length === 0 ? (
                      <div className="py-8 text-center text-gray-500 dark:text-slate-400">
                        <Receipt className="mx-auto mb-3" size={42} />
                        <p className="font-medium">No receipts yet</p>
                        <p className="text-sm mt-1">Collect a payment to generate receipts.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-72 overflow-y-auto pr-1">
                        <table className="w-full text-sm min-w-[720px]">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-slate-900 text-gray-700 dark:text-slate-200">
                              <th className="px-3 py-3 text-left">Receipt</th>
                              <th className="px-3 py-3 text-left">Payment Date</th>
                              <th className="px-3 py-3 text-left">Mode</th>
                              <th className="px-3 py-3 text-right">Amount</th>
                              <th className="px-3 py-3 text-center w-28">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentPayments.map((p) => {
                              const receiptNo = p.receipt?.receipt_no || p.receipt_number || p.id;
                              const dateLabel = p.payment_date
                                ? new Date(p.payment_date).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '—';

                              return (
                                <tr
                                  key={p.id}
                                  className="border-t border-gray-200 dark:border-slate-800 hover:bg-gray-50/60 dark:hover:bg-slate-900/40 cursor-pointer"
                                  onClick={() => {
                                    const query = new URLSearchParams();
                                    query.set('student_id', selectedStudent.id);
                                    if (currentAcademicYear) query.set('academic_year', currentAcademicYear);
                                    router.push(`/dashboard/${schoolCode}/fees/statements?${query.toString()}`);
                                  }}
                                >
                                  <td className="px-3 py-3 font-semibold text-gray-900 dark:text-white">
                                    {receiptNo}
                                  </td>
                                  <td className="px-3 py-3 text-gray-700 dark:text-slate-200">{dateLabel}</td>
                                  <td className="px-3 py-3 text-gray-700 dark:text-slate-200">{p.payment_mode}</td>
                                  <td className="px-3 py-3 text-right font-semibold text-gray-900 dark:text-white tabular-nums">
                                    {formatCurrency(Number(p.amount || 0))}
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <Button type="button" size="sm" variant="outline" className="h-9 w-28">
                                      View
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </div>

              </div>
            )}
          </>
        )}

        {/* Receipt preview modal (before final collect) */}
        <AnimatePresence>
          {receiptModalOpen && selectedStudent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
            >
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xl overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-800 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">
                      Fee receipt preview
                    </p>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                      {selectedStudent.student_name} · Roll {selectedStudent.roll_number?.trim() || '—'} ·{' '}
                      {selectedStudent.admission_no}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                      {selectedStudent.class}-{selectedStudent.section} · Total to collect {formatCurrency(totalAllocated)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setReceiptModalOpen(false)}
                    className="h-10 w-10 p-0 rounded-xl shrink-0"
                  >
                    X
                  </Button>
                </div>

                <div className="px-5 py-4 max-h-[70vh] overflow-y-auto space-y-4">
                  {receiptSelectedFees.length === 0 ? (
                    <div className="text-center py-10">
                      <Receipt className="mx-auto mb-3 text-gray-300" />
                      <p className="font-medium text-gray-900 dark:text-white">No installments selected</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Select an installment above to preview the receipt first.
                      </p>
                    </div>
                  ) : (
                    receiptSelectedFees.map((fee) => {
                      const allocNow = allocations[fee.id] ?? 0;
                      const heads = isInstallmentSettled(fee)
                        ? structureHeadAllocated(fee)
                        : structureHeadAllocatedForReceipt(fee, allocNow);
                      const manual = fee.installment_manual_lines ?? [];
                      const rules = fee.adjustment_lines ?? [];
                      const isPaid = isInstallmentSettled(fee);
                      const amountDueAfter = Math.max(0, Number(fee.total_due || 0) - allocNow);
                      const totalPaidAfter = Math.round((Number(fee.paid_amount || 0) + allocNow) * 100) / 100;
                      return (
                        <div key={fee.id} className="rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                          <div className="px-4 py-3 bg-gradient-to-r from-blue-600/95 to-indigo-600/95 text-white flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/90">
                                {fee.installment_display_label || fee.fee_structure?.name || 'Installment'}
                              </p>
                              <p className="text-sm text-white/90 mt-1">
                                Due {fee.due_date ? formatDateShort(fee.due_date) : '—'}
                                {isPaid ? ' · Settled' : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold tabular-nums">{formatCurrency(allocations[fee.id] ?? 0)}</p>
                              <p className="text-xs text-white/80 mt-0.5">Allocated now</p>
                            </div>
                          </div>

                          <div className="p-4 bg-white dark:bg-slate-900/30">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                              <div className="space-y-3">
                                {(heads.length > 0 || fee.fee_source === 'transport') && (
                                  <div>
                                    {heads.length > 0 && (
                                      <>
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                                          {isPaid ? 'Fee heads (share of base)' : 'Fee heads (this receipt)'}
                                        </p>
                                        <div className="rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden">
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
                                              <span className="tabular-nums font-medium text-right">{formatCurrency(h.allocated)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </>
                                    )}

                                    {fee.fee_source === 'transport' && fee.transport_snapshot && (
                                      <div className="mt-4 text-sm text-gray-700 dark:text-slate-200">
                                        Transport snapshot shown in installment breakdown.
                                      </div>
                                    )}
                                  </div>
                                )}

                                {rules.length > 0 && (
                                  <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                                      Rule adjustments
                                    </p>
                                    <ul className="rounded-lg border border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-700">
                                      {rules.map((ln) => (
                                        <li key={ln.rule_id} className="flex justify-between gap-3 px-3 py-2 text-sm">
                                          <span className="min-w-0">{ln.label}</span>
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
                              </div>

                              <div className="space-y-3">
                                {manual.length > 0 && (
                                  <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                                      {MANUAL_LINES_SECTION_TITLE}
                                    </p>
                                    <ul className="rounded-lg border border-gray-200 dark:border-slate-800 divide-y divide-gray-100 dark:divide-slate-700">
                                      {manual.map((ln) => (
                                        <li key={ln.id} className="flex justify-between gap-3 px-3 py-2 text-sm">
                                          <span className="min-w-0">
                                            {ln.label} <span className="text-gray-500 text-xs">({ln.kind})</span>
                                          </span>
                                          <span
                                            className={`tabular-nums font-medium shrink-0 ${
                                              ln.amount < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
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
                              </div>
                            </div>

                            <div className="rounded-lg bg-slate-100/90 dark:bg-slate-800/60 px-3 py-3 space-y-1.5 text-sm">
                              <div className="flex justify-between gap-2 text-gray-700 dark:text-slate-300">
                                <span>Base</span>
                                <span className="tabular-nums font-medium">{formatCurrency(fee.base_amount)}</span>
                              </div>
                              {typeof fee.final_amount === 'number' && (
                                <div className="flex justify-between gap-2 text-gray-700 dark:text-slate-300">
                                  <span>After adjustments</span>
                                  <span className="tabular-nums font-medium">{formatCurrency(fee.final_amount)}</span>
                                </div>
                              )}
                              {fee.late_fee > 0 && (
                                <div className="flex justify-between gap-2 text-amber-800 dark:text-amber-200">
                                  <span>Late fee</span>
                                  <span className="tabular-nums font-semibold">+{formatCurrency(fee.late_fee)}</span>
                                </div>
                              )}
                              <div className="flex justify-between gap-2 text-gray-700 dark:text-slate-300">
                                <span>Previously paid</span>
                                <span className="tabular-nums font-medium">
                                  {formatCurrency(Number(fee.paid_amount || 0))}
                                </span>
                              </div>
                              <div className="flex justify-between gap-2 text-gray-700 dark:text-slate-300">
                                <span>This receipt</span>
                                <span className="tabular-nums font-medium">{formatCurrency(allocNow)}</span>
                              </div>
                              <div className="flex justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-600 text-base font-bold text-gray-900 dark:text-white">
                                <span>Total paid after this receipt</span>
                                <span className="tabular-nums">{formatCurrency(totalPaidAfter)}</span>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-slate-300">
                                Balance remaining {formatCurrency(amountDueAfter)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="px-5 py-4 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      Collector: <span className="font-medium text-gray-900 dark:text-white">{selectedCollector || '—'}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5">
                      Payment mode: <span className="font-medium">{paymentMode}</span>
                      {referenceNo.trim() ? ` · Ref: ${referenceNo.trim()}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setReceiptModalOpen(false)} className="h-10">
                      Back
                    </Button>
                    <Button
                      onClick={handleCollectPayment}
                      disabled={collecting || totalAllocated === 0 || !selectedCollector}
                      className="h-10 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {collecting ? 'Processing...' : 'Proceed & Collect'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Student list (only after class + section selected) */}
        {!selectedStudent && (
          <Card className="p-5">
            {!classFilter || !sectionFilter ? (
              <div className="py-10 text-center">
                <Users size={48} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                <p className="text-gray-700 dark:text-slate-200 font-semibold">Select Class and Section to view students</p>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
                  Pending dues will appear only for the selected class/section.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Students with pending dues</h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      Fee Due shows this calendar month&apos;s school fees only. Transport (separate mode) is in the Transport column.
                    </p>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-slate-400 shrink-0">
                    {filteredStudents.length} student(s)
                  </span>
                </div>
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-blue-600" />
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-slate-400 px-2">
                    <Users size={48} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                    <p className="font-medium text-gray-800 dark:text-slate-200">No pending students found</p>
                    <p className="text-sm mt-2 max-w-md mx-auto leading-relaxed">
                      Nothing matches your search for session{' '}
                      <span className="font-medium text-gray-700 dark:text-slate-300">{currentAcademicYear || '—'}</span>.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[1040px]">
                      <thead>
                        <tr className="bg-[#003D4C] text-white">
                          <th className="px-3 py-3 text-left w-10">#</th>
                          <th className="px-3 py-3 text-left w-20">Roll</th>
                          <th className="px-3 py-3 text-left">Student Name</th>
                          <th className="px-3 py-3 text-left">Admission Id</th>
                          <th className="px-3 py-3 text-left">Class</th>
                          <th className="px-3 py-3 text-right">Fee Due</th>
                          <th className="px-3 py-3 text-center min-w-[140px]">Transport</th>
                          <th className="px-3 py-3 text-left">Due Date</th>
                          <th className="px-3 py-3 text-center w-28">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student, i) => {
                          const tr = student.transport;
                          const transportHref = `/dashboard/${schoolCode}/transport/fees?class=${encodeURIComponent(student.class)}&section=${encodeURIComponent(student.section)}&search=${encodeURIComponent(student.admission_no)}`;
                          return (
                            <tr key={student.id} className="border-t border-gray-200 dark:border-slate-800 hover:bg-gray-50/50">
                              <td className="px-3 py-3 text-gray-600">{String(i + 1).padStart(2, '0')}</td>
                              <td className="px-3 py-3 font-mono text-gray-800">{student.roll_number?.trim() || '—'}</td>
                              <td className="px-3 py-3 font-medium text-gray-900">{student.student_name}</td>
                              <td className="px-3 py-3 font-mono text-gray-800">{student.admission_no}</td>
                              <td className="px-3 py-3 text-gray-800">
                                {student.class}-{student.section}
                              </td>
                              <td className="px-3 py-3 text-right font-semibold">
                                {student.academic_fee_status === 'CURRENT_CLEAR' ? (
                                  <span className="text-green-600 dark:text-green-400">Paid</span>
                                ) : student.academic_fee_status === 'NONE' ? (
                                  <span className="text-gray-400 dark:text-slate-500 font-normal">—</span>
                                ) : (
                                  <span className="text-red-600 dark:text-red-400">
                                    {formatCurrency(student.pending_amount)}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-gray-700 dark:text-slate-300 align-top text-center">
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  {!tr || tr.mode === 'NONE' ? (
                                    <span className="text-gray-400 dark:text-slate-500">—</span>
                                  ) : tr.mode === 'MERGED' ? (
                                    <span className="text-xs text-slate-500 dark:text-slate-400 text-center">
                                      In school fees
                                    </span>
                                  ) : tr.paid || tr.balance_due <= TRANSPORT_PAY_EPS ? (
                                    <span className="text-green-600 dark:text-green-400 font-semibold">Paid</span>
                                  ) : tr.expected > TRANSPORT_PAY_EPS && tr.balance_due > TRANSPORT_PAY_EPS ? (
                                    <button
                                      type="button"
                                      className="text-center text-sm text-blue-700 dark:text-blue-400 hover:underline font-medium tabular-nums"
                                      onClick={() => router.push(transportHref)}
                                    >
                                      {formatCurrency(tr.balance_due)}
                                      <span className="block text-[11px] font-normal text-slate-500 dark:text-slate-400">
                                        {tr.period_label}
                                      </span>
                                    </button>
                                  ) : (
                                    <span className="text-gray-400 dark:text-slate-500">—</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                                {student.academic_fee_status === 'CURRENT_CLEAR' ||
                                student.academic_fee_status === 'NONE' ||
                                !student.due_date
                                  ? '—'
                                  : new Date(student.due_date).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                    })}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-9 w-24"
                                  onClick={() => handleStudentSelect(student)}
                                >
                                  Select
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
