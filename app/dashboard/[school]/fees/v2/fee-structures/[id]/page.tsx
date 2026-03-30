'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  ArrowLeft,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit2,
  Save,
  CalendarDays,
  GraduationCap,
  Layers,
  IndianRupee,
  User,
  UserCheck,
  Clock,
  ClipboardCopy,
  Receipt,
  CalendarRange,
} from 'lucide-react';

interface StaffLite {
  id?: string;
  full_name?: string | null;
  staff_id?: string | null;
}

interface FeePlan {
  id: string;
  frequency: string;
  start_month: number;
  end_month: number;
  payment_due_day: number | null;
  is_active: boolean;
}

interface FeeStructureItem {
  id: string;
  fee_head_id: string;
  amount: number;
  fee_head?: {
    id: string;
    name: string;
    description: string | null;
    is_optional: boolean;
  };
}

interface FeeStructure {
  id: string;
  name: string;
  class_name: string;
  section: string | null;
  academic_year: string | null;
  start_month: number;
  end_month: number;
  frequency: string;
  frequency_mode?: string | null;
  payment_due_day?: number | null;
  late_fee_type: string | null;
  late_fee_value: number;
  grace_period_days: number;
  is_active: boolean;
  activated_at: string | null;
  session_archived?: boolean | null;
  items?: FeeStructureItem[];
  plans?: FeePlan[];
  created_at: string;
  created_by_staff?: StaffLite | null;
  activated_by_staff?: StaffLite | null;
  fees_generated?: boolean;
  fees_generated_at?: string | null;
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

function formatInr(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getMonthName(monthNumber: number) {
  return MONTHS.find((m) => m.value === monthNumber)?.label || `Month ${monthNumber}`;
}

export default function FeeStructureDetailPage({
  params,
}: {
  params: Promise<{ school: string; id: string }>;
}) {
  const { school: schoolCode, id: structureId } = use(params);
  const router = useRouter();
  const [structure, setStructure] = useState<FeeStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingLateFee, setEditingLateFee] = useState(false);
  const [lateFeeType, setLateFeeType] = useState('');
  const [lateFeeValue, setLateFeeValue] = useState('');
  const [gracePeriodDays, setGracePeriodDays] = useState(0);
  const [savingLateFee, setSavingLateFee] = useState(false);
  const [lateFeeError, setLateFeeError] = useState('');
  const [lateFeeSuccess, setLateFeeSuccess] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    fetchStructure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureId, schoolCode]);

  const fetchStructure = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/v2/fees/fee-structures/${structureId}?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok) {
        setStructure(result.data);
        const s = result.data as FeeStructure;
        setLateFeeType(s.late_fee_type || '');
        setLateFeeValue(s.late_fee_value != null ? String(s.late_fee_value) : '');
        setGracePeriodDays(s.grace_period_days ?? 0);
      } else {
        setError(result.error || 'Failed to fetch fee structure');
      }
    } catch (err) {
      setError('Failed to load fee structure');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = useMemo(
    () => structure?.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0,
    [structure?.items]
  );

  const displayPlans = useMemo(() => {
    if (!structure) return [];
    if (structure.plans && structure.plans.length > 0) return structure.plans;
    return [
      {
        id: 'default',
        frequency: structure.frequency,
        start_month: structure.start_month,
        end_month: structure.end_month,
        payment_due_day: structure.payment_due_day ?? null,
        is_active: true,
      },
    ];
  }, [structure]);

  const frequencyModeLabel = useMemo(() => {
    if (!structure) return '';
    const m = String(structure.frequency_mode || 'single').toLowerCase();
    return m === 'multiple' ? 'Multiple schedules' : 'Single schedule';
  }, [structure]);

  const handleSaveLateFee = async () => {
    if (!structure) return;
    setSavingLateFee(true);
    setLateFeeError('');
    setLateFeeSuccess('');
    try {
      const res = await fetch(`/api/v2/fees/fee-structures/${structureId}?school_code=${schoolCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          late_fee_type: lateFeeType.trim() || null,
          late_fee_value: lateFeeValue ? parseFloat(lateFeeValue) : 0,
          grace_period_days: gracePeriodDays,
        }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setStructure({ ...structure, ...data.data });
        setEditingLateFee(false);
        setLateFeeSuccess('Late fee settings saved.');
        setTimeout(() => setLateFeeSuccess(''), 3000);
      } else {
        setLateFeeError(data.error || 'Failed to save late fee');
      }
    } catch {
      setLateFeeError('Failed to save late fee');
    } finally {
      setSavingLateFee(false);
    }
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(structureId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (error || !structure) {
    return (
      <div className="space-y-6 p-6 max-w-5xl mx-auto">
        <Button variant="outline" onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/fee-structures`)}>
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <Card>
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{error || 'Fee structure not found'}</p>
          </div>
        </Card>
      </div>
    );
  }

  const dueDayDefault = structure.payment_due_day != null ? structure.payment_due_day : 15;

  return (
    <div className="min-h-screen bg-slate-50/90 dark:bg-slate-950 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-start gap-4">
          <Button variant="outline" onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/fee-structures`)}>
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </motion.div>

        {structure.session_archived ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-amber-300/80 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-4 py-3 flex gap-3 text-amber-950 dark:text-amber-100"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Session archived</p>
              <p className="text-sm opacity-90 mt-0.5">
                This structure belongs to a past session. It may be hidden from active fee generation flows.
              </p>
            </div>
          </motion.div>
        ) : null}

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden shadow-lg shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900"
        >
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 text-white px-6 py-8 sm:px-10 sm:py-10">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/95">
                    <Receipt className="w-3.5 h-3.5" />
                    Fee structure
                  </span>
                  {structure.is_active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/40 px-2.5 py-0.5 text-xs font-medium">
                      <CheckCircle size={12} />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 text-white/90 ring-1 ring-white/20 px-2.5 py-0.5 text-xs font-medium">
                      <XCircle size={12} />
                      Inactive
                    </span>
                  )}
                  {structure.fees_generated ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white/95">
                      <CalendarDays size={12} />
                      Fees generated
                      {structure.fees_generated_at ? (
                        <span className="opacity-80">
                          · {new Date(structure.fees_generated_at).toLocaleDateString('en-IN')}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-start gap-3">
                  <FileText className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 opacity-90 mt-1" />
                  <span className="leading-snug">{structure.name}</span>
                </h1>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/90">
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 opacity-80" />
                    <span className="font-medium">{structure.class_name}</span>
                  </span>
                  <span className="text-white/50 hidden sm:inline">|</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="w-4 h-4 opacity-80" />
                    Section{' '}
                    <span className="font-medium">{structure.section?.trim() ? structure.section : '—'}</span>
                  </span>
                  {structure.academic_year ? (
                    <>
                      <span className="text-white/50 hidden sm:inline">|</span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarRange className="w-4 h-4 opacity-80" />
                        {structure.academic_year}
                      </span>
                    </>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={copyId}
                  className="inline-flex items-center gap-2 text-xs text-white/75 hover:text-white transition-colors font-mono bg-white/10 rounded-lg px-2 py-1"
                >
                  ID {structureId.slice(0, 8)}…
                  <ClipboardCopy className="w-3.5 h-3.5" />
                  {copiedId ? <span className="text-emerald-200">Copied</span> : null}
                </button>
              </div>
              <div className="shrink-0 rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 px-6 py-5 text-right min-w-[200px]">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-1">Total (composition)</p>
                <p className="text-3xl sm:text-4xl font-bold tabular-nums tracking-tight">{formatInr(totalAmount)}</p>
                <p className="text-xs text-white/75 mt-2">{frequencyModeLabel}</p>
              </div>
            </div>
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-200/80 dark:divide-slate-700 bg-slate-50/80 dark:bg-slate-800/40">
            <div className="p-4 sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Frequency</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{structure.frequency}</p>
            </div>
            <div className="p-4 sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Default due day</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {dueDayDefault}
                <span className="text-slate-500 dark:text-slate-400 font-normal"> of month</span>
              </p>
            </div>
            <div className="p-4 sm:p-5 col-span-2 lg:col-span-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Billing period</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {getMonthName(structure.start_month)} → {getMonthName(structure.end_month)}
              </p>
            </div>
            <div className="p-4 sm:p-5 col-span-2 lg:col-span-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Fee heads</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{structure.items?.length ?? 0} line items</p>
            </div>
          </div>
        </motion.div>

        {structure.is_active ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/90 dark:bg-amber-950/25 text-amber-950 dark:text-amber-100 px-4 py-3 flex items-start gap-3"
          >
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              This fee structure is <strong>active</strong>. You can only edit <strong>Late fee</strong> rules here. For name, class,
              composition, or schedules, deactivate the structure first (from the list), then edit or recreate.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/90 dark:bg-blue-950/25 text-blue-950 dark:text-blue-100 px-4 py-3 flex items-start gap-3"
          >
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              Structure is <strong>inactive</strong>. Full edits (where supported by the API) are available from the edit flow; late
              fee can always be adjusted below.
            </p>
          </motion.div>
        )}

        {/* Class & section — explicit split */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-slate-200/80 dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Class & session
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Where this structure applies</p>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Class</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">{structure.class_name}</p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Section</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {structure.section?.trim() ? structure.section : <span className="text-slate-400 font-normal">All / not set</span>}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Academic year</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {structure.academic_year?.trim() ? structure.academic_year : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Activated</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {structure.activated_at
                    ? new Date(structure.activated_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—'}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Plans / schedules */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="border-slate-200/80 dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Billing schedules
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {String(structure.frequency_mode || '').toLowerCase() === 'multiple'
                  ? 'Multiple frequencies (e.g. monthly and quarterly) each have their own window and due day.'
                  : 'Single frequency for this structure.'}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-3">Frequency</th>
                    <th className="px-6 py-3">Period (months)</th>
                    <th className="px-6 py-3">Due day</th>
                    <th className="px-6 py-3">Plan status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-3.5 font-medium text-slate-900 dark:text-white capitalize">{plan.frequency}</td>
                      <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300">
                        {getMonthName(plan.start_month)} — {getMonthName(plan.end_month)}
                      </td>
                      <td className="px-6 py-3.5 tabular-nums text-slate-700 dark:text-slate-200">
                        {plan.payment_due_day != null ? `${plan.payment_due_day}` : dueDayDefault}
                        <span className="text-slate-400 dark:text-slate-500 text-xs ml-1">of month</span>
                      </td>
                      <td className="px-6 py-3.5">
                        {plan.is_active ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 text-xs font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 text-xs font-medium">
                            Inactive
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        {/* Fee composition table */}
        {structure.items && structure.items.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-slate-200/80 dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Fee composition
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Head-wise amounts that make up this structure</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <th className="px-6 py-3">Fee head</th>
                      <th className="px-6 py-3 hidden md:table-cell">Description</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3 text-right">Share</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {structure.items.map((item) => {
                      const amt = item.amount || 0;
                      const pct = totalAmount > 0 ? Math.round((amt / totalAmount) * 1000) / 10 : 0;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-900 dark:text-white">{item.fee_head?.name || 'Unknown'}</p>
                            {item.fee_head?.description ? (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 md:hidden">{item.fee_head.description}</p>
                            ) : null}
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-md hidden md:table-cell">
                            {item.fee_head?.description || '—'}
                          </td>
                          <td className="px-6 py-4">
                            {item.fee_head?.is_optional ? (
                              <span className="inline-flex rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 px-2 py-0.5 text-xs font-medium">
                                Optional
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 text-xs font-medium">
                                Core
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right tabular-nums text-slate-600 dark:text-slate-300">{pct}%</td>
                          <td className="px-6 py-4 text-right font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                            {formatInr(amt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-indigo-50/80 dark:bg-indigo-950/30 font-bold text-slate-900 dark:text-white">
                      <td colSpan={3} className="px-6 py-4 text-right text-sm uppercase tracking-wide">
                        Total
                      </td>
                      <td className="px-6 py-4 text-right tabular-nums text-slate-600 dark:text-slate-300">100%</td>
                      <td className="px-6 py-4 text-right text-lg tabular-nums text-indigo-700 dark:text-indigo-300">
                        {formatInr(totalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </motion.div>
        ) : null}

        {/* Late fee */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Card className="border-slate-200/80 dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Late fee policy</h2>
              {!editingLateFee ? (
                <Button variant="outline" size="sm" onClick={() => setEditingLateFee(true)}>
                  <Edit2 size={16} className="mr-1" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingLateFee(false);
                      setLateFeeError('');
                      setLateFeeSuccess('');
                      setLateFeeType(structure.late_fee_type || '');
                      setLateFeeValue(structure.late_fee_value != null ? String(structure.late_fee_value) : '');
                      setGracePeriodDays(structure.grace_period_days ?? 0);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveLateFee} disabled={savingLateFee}>
                    {savingLateFee ? <Loader2 size={16} className="animate-spin mr-1" /> : <Save size={16} className="mr-1" />}
                    Save
                  </Button>
                </div>
              )}
            </div>
            <div className="p-6">
              {lateFeeError && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{lateFeeError}</p>}
              {lateFeeSuccess && <p className="text-sm text-green-600 dark:text-green-400 mb-3">{lateFeeSuccess}</p>}
              {editingLateFee ? (
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Late fee type</label>
                    <select
                      value={lateFeeType}
                      onChange={(e) => setLateFeeType(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">No late fee</option>
                      <option value="flat">Flat amount</option>
                      <option value="per_day">Per day</option>
                      <option value="percentage">Percentage (of base per day)</option>
                    </select>
                  </div>
                  {lateFeeType ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          {lateFeeType === 'percentage' ? 'Percentage (%)' : 'Late fee value (₹)'}
                        </label>
                        <Input
                          type="number"
                          value={lateFeeValue}
                          onChange={(e) => setLateFeeValue(e.target.value)}
                          placeholder={lateFeeType === 'percentage' ? 'e.g. 0.5' : 'e.g. 50'}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Grace period (days)</label>
                        <Input
                          type="number"
                          value={gracePeriodDays}
                          onChange={(e) => setGracePeriodDays(parseInt(e.target.value, 10) || 0)}
                          min="0"
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              ) : structure.late_fee_type ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-5">
                  <div>
                    <p className="text-xs font-semibold text-amber-900/80 dark:text-amber-200/80 uppercase tracking-wide mb-1">Type</p>
                    <p className="text-lg font-semibold text-amber-950 dark:text-amber-100 capitalize">{structure.late_fee_type}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-900/80 dark:text-amber-200/80 uppercase tracking-wide mb-1">Value</p>
                    <p className="text-lg font-semibold text-amber-950 dark:text-amber-100">
                      {structure.late_fee_type === 'percentage'
                        ? `${structure.late_fee_value}%`
                        : formatInr(Number(structure.late_fee_value || 0))}
                      {structure.late_fee_type === 'per_day' && <span className="text-sm font-normal"> / day</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-amber-900/80 dark:text-amber-200/80 uppercase tracking-wide mb-1">Grace</p>
                    <p className="text-lg font-semibold text-amber-950 dark:text-amber-100">{structure.grace_period_days} days</p>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 py-2">No late fee configured. Click Edit to add.</p>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Audit */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <Card className="border-slate-200/80 dark:border-slate-700 dark:bg-slate-900">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                Activity
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-3">
                <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2.5 h-fit">
                  <User className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Created</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">
                    {new Date(structure.created_at).toLocaleString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {structure.created_by_staff?.full_name ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {structure.created_by_staff.full_name}
                      {structure.created_by_staff.staff_id ? (
                        <span className="text-xs text-slate-400">({structure.created_by_staff.staff_id})</span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Creator not recorded</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2.5 h-fit">
                  <UserCheck className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Activated</p>
                  {structure.activated_at ? (
                    <>
                      <p className="text-sm font-medium text-slate-900 dark:text-white mt-1">
                        {new Date(structure.activated_at).toLocaleString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {structure.activated_by_staff?.full_name ? (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5" />
                          {structure.activated_by_staff.full_name}
                          {structure.activated_by_staff.staff_id ? (
                            <span className="text-xs text-slate-400">({structure.activated_by_staff.staff_id})</span>
                          ) : null}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Activated by not recorded</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Not activated yet</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
