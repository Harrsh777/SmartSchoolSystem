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
} from 'lucide-react';

interface StudentFee {
  id: string;
  due_month: string;
  due_date: string;
  base_amount: number;
  paid_amount: number;
  adjustment_amount: number;
  balance_due: number;
  late_fee: number;
  total_due: number;
  status: string;
  fee_structure: {
    name: string;
    late_fee_type?: string;
    late_fee_value?: number;
    grace_period_days?: number;
  };
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

  const fetchPendingStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      let url = `/api/v2/fees/students/pending?school_code=${schoolCode}&limit=300`;
      if (classFilter) url += `&class=${encodeURIComponent(classFilter)}`;
      if (sectionFilter) url += `&section=${encodeURIComponent(sectionFilter)}`;
      if (currentAcademicYear) url += `&academic_year=${encodeURIComponent(currentAcademicYear)}`;
      const response = await fetch(url);
      const result = await response.json();
      if (response.ok) setPendingStudents(result.data || []);
      else setError(result.error || 'Failed to load students with pending fees');
    } catch (err) {
      console.error(err);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [schoolCode, classFilter, sectionFilter, currentAcademicYear]);

  useEffect(() => {
    if (currentAcademicYear) fetchPendingStudents();
  }, [fetchPendingStudents, currentAcademicYear]);

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

  const uniqueClasses = useMemo(
    () =>
      Array.from(new Set(pendingStudents.map((s) => s.class))).sort((a, b) => {
        const numA = parseInt(a) || 0;
        const numB = parseInt(b) || 0;
        return numA - numB;
      }),
    [pendingStudents]
  );
  const uniqueSections = useMemo(
    () =>
      classFilter
        ? Array.from(
            new Set(pendingStudents.filter((s) => s.class === classFilter).map((s) => s.section))
          ).sort()
        : [],
    [classFilter, pendingStudents]
  );

  const handleStudentSelect = async (student: PendingStudent) => {
    setSelectedStudent(student);
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

  const totalDue = studentFees.reduce((sum, f) => sum + f.total_due, 0);
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/dashboard`)}
            >
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Student</h2>
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="text"
                  placeholder="Search by Name or Student ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setClassFilter('')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !classFilter
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  All Classes
                </button>
                {uniqueClasses.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setClassFilter(c)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      classFilter === c
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
                <select
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm min-w-[120px]"
                  disabled={!classFilter}
                >
                  <option value="">Sections</option>
                  {uniqueSections.map((s) => (
                    <option key={s} value={s}>{s}</option>
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
                  <span className="text-xs font-medium uppercase tracking-wide">Total Due</span>
                </div>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">
                  {feesLoading ? '—' : formatCurrency(totalDue)}
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
                {/* Fee Breakdown */}
                <div className="lg:col-span-2">
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Fee Breakdown</h3>
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
                        <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-sm font-medium text-gray-700 dark:text-slate-300">
                          Session: {currentAcademicYear}
                        </span>
                      )}
                    </div>
                    <div className="space-y-3 max-h-[420px] overflow-y-auto">
                      {studentFees.map((fee) => {
                        const isPaid = fee.total_due <= 0 || fee.status === 'paid';
                        const allocated = allocations[fee.id] || 0;
                        const lastPaidDate = lastPaymentDateByFeeId[fee.id];
                        const isOverdue =
                          !isPaid && (fee.status === 'overdue' || new Date(fee.due_date) < new Date());

                        if (isPaid) {
                          return (
                            <div
                              key={fee.id}
                              className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30"
                            >
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                                  <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                                    {fee.fee_structure?.name || 'Fee'}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-slate-400">
                                    {lastPaidDate
                                      ? `Paid on ${formatDate(lastPaidDate)}`
                                      : 'Paid'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-green-600 dark:text-green-400">₹0.00</p>
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                  Full Paid ({formatCurrency(fee.paid_amount)})
                                </p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={fee.id}
                            className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                              allocated > 0
                                ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20'
                                : isOverdue
                                ? 'border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/20'
                                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/30'
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center shrink-0">
                                <Clock size={20} className="text-orange-600 dark:text-orange-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white truncate">
                                  {fee.fee_structure?.name || 'Fee'}
                                </p>
                                <p className="text-sm text-orange-600 dark:text-orange-400">
                                  PENDING • Due {formatDateShort(fee.due_date)}
                                </p>
                                {fee.late_fee > 0 && (
                                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                                    + {formatCurrency(fee.late_fee)} late fee
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <p className="font-bold text-gray-900 dark:text-white">
                                {formatCurrency(fee.total_due)}
                              </p>
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => handleAllocationChange(fee.id, fee.total_due)}
                              >
                                Pay Full
                              </Button>
                            </div>
                          </div>
                        );
                      })}
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
                          Total Due {formatCurrency(totalDue)}
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
              <div className="text-center py-12 text-gray-500">
                <Users size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No students with pending dues</p>
                <p className="text-sm mt-1">
                  {searchQuery || classFilter || sectionFilter ? 'Try different filters.' : 'All clear for this session.'}
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
      </main>
    </div>
  );
}
