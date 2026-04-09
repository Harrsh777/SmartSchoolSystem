'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Users,
  SlidersHorizontal,
} from 'lucide-react';

type InstallmentRow = {
  fee_structure_id: string;
  fee_plan_id?: string;
  frequency?: 'monthly' | 'quarterly' | 'yearly' | string;
  due_month: string;
  due_date: string;
  structure_name: string;
  academic_year: string;
  is_active: boolean;
  sample_student_fee_id: string;
  student_fee_ids: string[];
  base_amount: number;
  paid_installment_count: number;
  unpaid_installment_count: number;
  /** Present when row comes from fee structure schedule only (no student_fees rows yet) */
  from_structure_only?: boolean;
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
  class_fee_lines_available?: boolean;
  migration_hint?: string;
  load_error?: string;
};

type StudentPlanRow = {
  id: string;
  student_name: string;
  admission_no: string;
  roll_number: string;
  is_rte?: boolean;
  fee_plan_id: string | null;
};

type FrequencyPlan = {
  id: string;
  frequency: 'monthly' | 'quarterly' | 'yearly';
};

function installmentKey(inst: Pick<InstallmentRow, 'fee_structure_id' | 'due_month' | 'fee_plan_id' | 'frequency'>) {
  return `${inst.fee_structure_id}::${inst.fee_plan_id || inst.frequency || 'base'}::${inst.due_month}`;
}

export default function ClassWiseFeesPage({
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
  const [classes, setClasses] = useState<string[]>([]);
  const [classRows, setClassRows] = useState<Array<{ class?: string; section?: string }>>([]);

  const [studentCount, setStudentCount] = useState(0);
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [expandedFrequencyGroup, setExpandedFrequencyGroup] = useState<string | null>(null);
  const [lineDetail, setLineDetail] = useState<Record<string, LineDetail>>({});
  const [lineLoading, setLineLoading] = useState<string | null>(null);
  const [newLineLabel, setNewLineLabel] = useState('');
  const [newLineAmount, setNewLineAmount] = useState('');
  const [newLineKind, setNewLineKind] = useState<'misc' | 'discount'>('misc');
  const [savingLine, setSavingLine] = useState(false);
  const [structureId, setStructureId] = useState('');
  const [structureName, setStructureName] = useState('');
  const [frequencyMode, setFrequencyMode] = useState<'single' | 'multiple'>('single');
  const [plans, setPlans] = useState<FrequencyPlan[]>([]);
  const [studentPlans, setStudentPlans] = useState<StudentPlanRow[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [,setSavingPlans] = useState(false);
  const [savingRte, setSavingRte] = useState(false);
  const [showRteSelection, setShowRteSelection] = useState(false);
  const [generating, setGenerating] = useState(false);

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

  const loadInstallments = useCallback(async () => {
    if (!className || !section || !academicYear) {
      setInstallments([]);
      setStudentCount(0);
      return;
    }
    setLoadingList(true);
    setExpandedKey(null);
    setLineDetail({});
    try {
      const q = new URLSearchParams({
        school_code: schoolCode,
        class: className,
        section,
        academic_year: academicYear,
      });
      const res = await fetch(`/api/v2/fees/class-section/installments?${q}`);
      const data = await res.json();
      if (res.ok && data.data) {
        setStudentCount(Number(data.data.student_count || 0));
        setInstallments(Array.isArray(data.data.installments) ? data.data.installments : []);
      } else {
        setInstallments([]);
        setStudentCount(0);
      }
    } catch {
      setInstallments([]);
      setStudentCount(0);
    } finally {
      setLoadingList(false);
    }
  }, [schoolCode, className, section, academicYear]);

  const loadStudentPlans = useCallback(async () => {
    if (!className || !section || !academicYear) {
      setStructureId('');
      setStructureName('');
      setPlans([]);
      setStudentPlans([]);
      return;
    }
    setLoadingPlans(true);
    try {
      const q = new URLSearchParams({
        school_code: schoolCode,
        class: className,
        section,
        academic_year: academicYear,
      });
      const res = await fetch(`/api/v2/fees/class-section/student-plans?${q}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.data) {
        setStructureId('');
        setStructureName('');
        setPlans([]);
        setStudentPlans([]);
        return;
      }
      setStructureId(String(data.data.structure?.id || ''));
      setStructureName(String(data.data.structure?.name || ''));
      setFrequencyMode(String(data.data.structure?.frequency_mode || 'single') === 'multiple' ? 'multiple' : 'single');
      setPlans(Array.isArray(data.data.plans) ? data.data.plans : []);
      setStudentPlans(Array.isArray(data.data.students) ? data.data.students : []);
    } finally {
      setLoadingPlans(false);
    }
  }, [schoolCode, className, section, academicYear]);

  useEffect(() => {
    fetchYears();
    fetchClasses();
  }, [fetchYears, fetchClasses]);

  useEffect(() => {
    loadInstallments();
  }, [loadInstallments]);
  useEffect(() => {
    loadStudentPlans();
  }, [loadStudentPlans]);

  useEffect(() => {
    setNewLineLabel('');
    setNewLineAmount('');
    setNewLineKind('misc');
  }, [expandedKey]);

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

  const toggleInstallment = async (inst: InstallmentRow) => {
    const key = installmentKey(inst);
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key);
    if (lineDetail[key]) return;
    setLineLoading(key);
    try {
      const q = new URLSearchParams({
        school_code: schoolCode,
        class: className,
        section,
        fee_structure_id: inst.fee_structure_id,
        due_month: inst.due_month,
        academic_year: academicYear,
      });
      const res = await fetch(`/api/v2/fees/class-section/lines?${q}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.data) {
        setLineDetail((prev) => ({
          ...prev,
          [key]: {
            structure_components: data.data.structure_components || [],
            manual_lines: data.data.manual_lines || [],
            editable: data.data.editable !== false,
            class_fee_lines_available: data.data.class_fee_lines_available !== false,
            migration_hint: typeof data.data.migration_hint === 'string' ? data.data.migration_hint : undefined,
          },
        }));
      } else {
        setLineDetail((prev) => ({
          ...prev,
          [key]: {
            structure_components: [],
            manual_lines: [],
            editable: false,
            class_fee_lines_available: false,
            load_error:
              typeof data?.error === 'string'
                ? data.error
                : `Could not load installment details (${res.status})`,
          },
        }));
      }
    } finally {
      setLineLoading(null);
    }
  };

  const refreshLines = async (inst: InstallmentRow) => {
    const key = installmentKey(inst);
    const q = new URLSearchParams({
      school_code: schoolCode,
      class: className,
      section,
      fee_structure_id: inst.fee_structure_id,
      due_month: inst.due_month,
      academic_year: academicYear,
    });
    const res = await fetch(`/api/v2/fees/class-section/lines?${q}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.data) {
      setLineDetail((prev) => ({
        ...prev,
        [key]: {
          structure_components: data.data.structure_components || [],
          manual_lines: data.data.manual_lines || [],
          editable: data.data.editable !== false,
          class_fee_lines_available: data.data.class_fee_lines_available !== false,
          migration_hint: typeof data.data.migration_hint === 'string' ? data.data.migration_hint : undefined,
        },
      }));
    }
  };

  const addClassLine = async (inst: InstallmentRow) => {
    if (!newLineLabel.trim() || !newLineAmount) return;
    const kindAdded = newLineKind;
    setSavingLine(true);
    try {
      const res = await fetch('/api/v2/fees/class-section/lines', {
        method: 'POST',
        headers: staffHeaders(),
        body: JSON.stringify({
          school_code: schoolCode,
          class_name: className,
          section,
          academic_year: academicYear,
          fee_structure_id: inst.fee_structure_id,
          due_month: inst.due_month,
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
          ? 'Discount added for this class and section for this installment.'
          : 'Misc fee added for this class and section for this installment.'
      );
      await refreshLines(inst);
    } finally {
      setSavingLine(false);
    }
  };

  const removeClassLine = async (inst: InstallmentRow, lineId: string) => {
    if (!confirm('Remove this class-wide line? It will stop applying to every student in this class and section.')) return;
    const res = await fetch(
      `/api/v2/fees/class-section/lines/${lineId}?school_code=${encodeURIComponent(schoolCode)}`,
      { method: 'DELETE', headers: staffHeaders() }
    );
    if (!res.ok) {
      alert('Failed to remove');
      return;
    }
    await refreshLines(inst);
  };

  const formatMoney = (n: number) =>
    `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const updateStudentPlan = (studentId: string, feePlanId: string) => {
    setStudentPlans((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, fee_plan_id: feePlanId || null } : s))
    );
  };

  const toggleStudentRte = (studentId: string, isChecked: boolean) => {
    setStudentPlans((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, is_rte: isChecked } : s))
    );
  };

  
  const allFrequenciesSelected =
    frequencyMode === 'single' || (studentPlans.length > 0 && studentPlans.every((s) => !!s.fee_plan_id));

  const saveAssignments = async (opts?: { silent?: boolean }) => {
    if (!structureId) return false;
    setSavingPlans(true);
    try {
      const assignments = studentPlans
        .filter((s) => !!s.fee_plan_id)
        .map((s) => ({ student_id: s.id, fee_plan_id: s.fee_plan_id as string }));
      const res = await fetch('/api/v2/fees/class-section/student-plans', {
        method: 'POST',
        headers: staffHeaders(),
        body: JSON.stringify({
          school_code: schoolCode,
          class_name: className,
          section,
          academic_year: academicYear,
          fee_structure_id: structureId,
          assignments,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || 'Failed to save assignments';
        if (!opts?.silent) alert(msg);
        else alert(`Could not save student frequency assignments: ${msg}`);
        return false;
      }
      if (!opts?.silent) alert('Frequency assignments saved.');
      return true;
    } finally {
      setSavingPlans(false);
    }
  };

  const saveRteGroup = async () => {
    if (!className || !section) return;
    setSavingRte(true);
    try {
      const rteStudentIds = studentPlans.filter((s) => Boolean(s.is_rte)).map((s) => s.id);
      const res = await fetch('/api/v2/fees/class-section/rte', {
        method: 'POST',
        headers: staffHeaders(),
        body: JSON.stringify({
          school_code: schoolCode,
          class_name: className,
          section,
          rte_student_ids: rteStudentIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || 'Failed to save RTE group');
        return;
      }
      alert(`RTE group saved. ${Number(data?.data?.rte_count || rteStudentIds.length)} students marked as RTE.`);
      await loadStudentPlans();
    } finally {
      setSavingRte(false);
    }
  };

  const generateFees = async () => {
    if (!structureId) return;
    setGenerating(true);
    try {
      if (frequencyMode === 'multiple') {
        if (!allFrequenciesSelected) {
          alert('Please select frequency for all students before generating fees.');
          return;
        }
        const saved = await saveAssignments({ silent: true });
        if (!saved) return;
      }
      const res = await fetch('/api/v2/fees/class-section/generate', {
        method: 'POST',
        headers: staffHeaders(),
        body: JSON.stringify({
          school_code: schoolCode,
          class_name: className,
          section,
          academic_year: academicYear,
          fee_structure_id: structureId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || 'Failed to generate installments');
        return;
      }
      alert(`Generated ${Number(data?.data?.generated_installments || 0)} installments.`);
      await loadInstallments();
    } finally {
      setGenerating(false);
    }
  };

  const sortedStudentPlans = useMemo(() => {
    const list = [...studentPlans];
    list.sort((a, b) => {
      const ra = String(a.roll_number || '').trim();
      const rb = String(b.roll_number || '').trim();
      if (!ra && !rb) return a.student_name.localeCompare(b.student_name, undefined, { sensitivity: 'base' });
      if (!ra) return 1;
      if (!rb) return -1;
      const cmp = ra.localeCompare(rb, undefined, { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return cmp;
      return a.student_name.localeCompare(b.student_name, undefined, { sensitivity: 'base' });
    });
    return list;
  }, [studentPlans]);

  const frequencyOrder = (f: string) => {
    const v = String(f || '').toLowerCase();
    if (v === 'quarterly') return 0;
    if (v === 'monthly') return 1;
    if (v === 'yearly') return 2;
    return 9;
  };

  const normalizedFrequency = (inst: InstallmentRow): string => {
    const fromField = String(inst.frequency || '').toLowerCase();
    if (fromField) return fromField;
    const n = String(inst.structure_name || '').toLowerCase();
    if (n.includes('quarter')) return 'quarterly';
    if (n.includes('month')) return 'monthly';
    if (n.includes('year')) return 'yearly';
    return 'other';
  };

  const installmentsByFrequency = useMemo(() => {
    const map = new Map<string, InstallmentRow[]>();
    for (const inst of installments) {
      const f = normalizedFrequency(inst);
      const arr = map.get(f) || [];
      arr.push(inst);
      map.set(f, arr);
    }
    const groups = Array.from(map.entries())
      .map(([frequency, rows]) => ({
        frequency,
        rows: [...rows].sort((a, b) => new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime()),
      }))
      .sort((a, b) => frequencyOrder(a.frequency) - frequencyOrder(b.frequency));
    return groups;
  }, [installments]);

  const planIdByFrequency = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of plans) {
      if (!m.has(p.frequency)) m.set(p.frequency, p.id);
    }
    return m;
  }, [plans]);

  const applyFrequencyToAll = (frequency: 'monthly' | 'quarterly' | 'yearly') => {
    const planId = planIdByFrequency.get(frequency);
    if (!planId) return;
    setStudentPlans((prev) => prev.map((s) => ({ ...s, fee_plan_id: planId })));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            
            <h1 className="text-2xl font-bold text-gray-900 mt-3 flex items-center gap-2">
              <SlidersHorizontal className="w-7 h-7 text-teal-700" />
              Class-wise fees
            </h1>
            <p className="text-gray-600 text-sm">
              Misc and discount lines apply to <strong>every student</strong> in the selected class and section for
              each installment (same totals as Student-wise fees, shared across the class).
            </p>
          </div>
        </div>

        <Card className="p-4 md:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Academic year</label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
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
                <option value="">Select class</option>
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
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select section</option>
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {className && section && academicYear && (
            <div className="flex flex-col gap-1 text-sm text-gray-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-700 shrink-0" />
                <span>
                  <strong>{studentCount}</strong> students in {className} — {section} · {academicYear}
                </span>
              </div>
              {studentCount === 0 && (
                <p className="text-xs text-teal-900/80 pl-6">
                  If you have fee structures for this class, installments still appear below. Add students to the roster
                  (matching class/section) and generate student fees so collections and totals update per student.
                </p>
              )}
            </div>
          )}
        </Card>

        {className && section && academicYear && (
          <Card className="p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Student frequency assignment</h2>
                <p className="text-xs text-gray-600">
                  {structureName ? `${structureName}` : 'No structure found'} {frequencyMode === 'multiple' ? '· Select frequency per student before generation.' : '· Single frequency applies to all students.'}
                </p>
              </div>
            </div>
            {loadingPlans ? (
              <div className="text-sm text-gray-500">Loading students…</div>
            ) : (
              <>
                {!structureId && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Fee structure not found for selected class-section-session. Students are listed below; create/assign
                    a fee structure to enable fee generation.
                  </div>
                )}
                <div className="max-h-[32rem] overflow-auto rounded border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-2">Student</th>
                        <th className="text-left px-2 py-2">Admission</th>
                        <th className="text-left px-2 py-2">Roll</th>
                        <th className="text-left px-2 py-2">Frequency</th>
                        {showRteSelection && <th className="text-left px-2 py-2">RTE</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedStudentPlans.map((s) => (
                        <tr key={s.id} className="border-t border-gray-100">
                          <td className="px-2 py-2">{s.student_name}</td>
                          <td className="px-2 py-2">{s.admission_no || '—'}</td>
                          <td className="px-2 py-2">{s.roll_number || '—'}</td>
                          <td className="px-2 py-2">
                            {frequencyMode === 'single' ? (
                              <span className="text-xs text-gray-600 capitalize">{plans[0]?.frequency || 'single'}</span>
                            ) : (
                              <select
                                value={s.fee_plan_id || ''}
                                onChange={(e) => updateStudentPlan(s.id, e.target.value)}
                                className="rounded border border-gray-300 px-2 py-1 text-xs"
                              >
                                <option value="">Select</option>
                                {plans.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.frequency}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          {showRteSelection && (
                            <td className="px-2 py-2">
                              <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={Boolean(s.is_rte)}
                                  onChange={(e) => toggleStudentRte(s.id, e.target.checked)}
                                />
                                <span>RTE</span>
                              </label>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {frequencyMode === 'multiple' && (
                  <div className="flex flex-wrap items-center gap-2 rounded border border-gray-200 bg-gray-50 px-2 py-2">
                    <span className="text-xs font-medium text-gray-700">Set all students:</span>
                    {(['monthly', 'quarterly', 'yearly'] as const).map((f) =>
                      planIdByFrequency.has(f) ? (
                        <Button key={f} type="button" size="sm" onClick={() => applyFrequencyToAll(f)}>
                          All {f}
                        </Button>
                      ) : null
                    )}
                    <span className="ml-auto text-xs text-gray-600">
                      Selected {studentPlans.filter((s) => !!s.fee_plan_id).length} / {studentPlans.length}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRteSelection((v) => !v)}
                  >
                    {showRteSelection ? 'Hide RTE Selection' : 'Show RTE Selection'}
                  </Button>
                  {showRteSelection && (
                    <Button type="button" onClick={saveRteGroup} disabled={savingRte}>
                      {savingRte ? 'Saving RTE…' : 'Save RTE Group'}
                    </Button>
                  )}
                  {structureId && (frequencyMode === 'single' || allFrequenciesSelected) ? (
                    <Button onClick={generateFees} disabled={generating}>
                      {generating ? 'Generating…' : 'Generate Fees for Students'}
                    </Button>
                  ) : structureId ? (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                      Select frequency for every student to enable fee generation.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-600 bg-gray-100 border border-gray-200 rounded px-2 py-1.5">
                      Create a fee structure first to generate fees for this class-section.
                    </p>
                  )}
                </div>
              </>
            )}
          </Card>
        )}

        {!className || !section || !academicYear ? (
          <Card className="p-8 text-center text-gray-500">
            Choose academic year, class, and section to load active installments.
          </Card>
        ) : loadingList ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-teal-700" />
          </div>
        ) : installments.length === 0 ? (
          <Card className="p-8 text-center border-2 border-amber-200 bg-amber-50/50">
            <p className="text-gray-800 font-medium mb-2">No active installments for this class-section</p>
            <p className="text-sm text-gray-600 mb-4">
              Generate student fees from fee structures assigned to this class, or check the academic year.
            </p>
            <Button onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/fee-structures`)}>
              Fee structures
            </Button>
          </Card>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50/80 px-3 py-2 border-b border-teal-100">
              <h2 className="text-sm font-bold text-gray-900">Installments for this class</h2>
              <p className="text-[11px] text-teal-900/80">
                Expand an installment to edit fee components view and class-wide misc / discount lines
              </p>
            </div>
            <div className="p-2 space-y-2">
              {installmentsByFrequency.map((group) => {
                const gKey = group.frequency;
                const gOpen = expandedFrequencyGroup === gKey;
                return (
                  <div key={gKey} className="rounded-lg border border-indigo-100 bg-indigo-50/40 overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-indigo-50"
                      onClick={() => setExpandedFrequencyGroup(gOpen ? null : gKey)}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-indigo-950 capitalize">
                          {group.frequency} fees
                        </p>
                        <p className="text-[11px] text-indigo-800/80">{group.rows.length} installments</p>
                      </div>
                      {gOpen ? (
                        <ChevronUp className="w-4 h-4 text-indigo-700 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-indigo-700 shrink-0" />
                      )}
                    </button>

                    {gOpen && (
                      <div className="p-2 space-y-1.5 border-t border-indigo-100">
                        {group.rows.map((inst, idx) => {
                          const key = installmentKey(inst);
                          const open = expandedKey === key;
                          const detail = lineDetail[key];
                          const loadingLines = lineLoading === key;
                          const hasGeneratedFees = inst.student_fee_ids.length > 0;
                          const allPaid = hasGeneratedFees && inst.unpaid_installment_count === 0;
                          const structureOnly = Boolean(inst.from_structure_only) || !hasGeneratedFees;

                          return (
                            <div key={key} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                              <button
                                type="button"
                                onClick={() => toggleInstallment(inst)}
                                className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-gray-50"
                              >
                                <span className="text-gray-400 text-xs w-6 tabular-nums shrink-0">
                                  {String(idx + 1).padStart(2, '0')}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {inst.structure_name} · {inst.due_month || '—'}
                                  </p>
                                  <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                                    <span className="tabular-nums">Base {formatMoney(inst.base_amount)}</span>
                                    <span className="text-gray-400 mx-1">·</span>
                                    <span className="text-gray-500">{formatDate(inst.due_date)}</span>
                                    <span className="text-gray-400 mx-1">·</span>
                                    <span>
                                      {hasGeneratedFees
                                        ? `Paid ${inst.paid_installment_count} / ${inst.student_fee_ids.length} students`
                                        : 'Student fees not generated yet'}
                                    </span>
                                  </p>
                                </div>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                    !hasGeneratedFees
                                      ? 'bg-sky-100 text-sky-900'
                                      : allPaid
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-orange-100 text-orange-800'
                                  }`}
                                >
                                  {!hasGeneratedFees ? 'Structure' : allPaid ? 'All paid' : 'Open'}
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
                                  ) : detail?.load_error ? (
                                    <div className="rounded-md border border-red-200 bg-red-50 px-2 py-2 text-sm text-red-800">
                                      {detail.load_error}
                                    </div>
                                  ) : detail ? (
                                    <>
                                      {detail.class_fee_lines_available === false && detail.migration_hint && (
                                        <div className="rounded-md border border-amber-300 bg-amber-50 px-2 py-2 text-[11px] text-amber-950">
                                          <strong>Class-wide lines are disabled</strong> until the database table exists.{' '}
                                          {detail.migration_hint}
                                        </div>
                                      )}
                                      <div className="rounded-md border border-teal-200 bg-teal-50/60 px-2 py-1.5 text-[11px] text-teal-900">
                                        {structureOnly ? (
                                          <>
                                            <strong>No student fee rows yet</strong> for this installment. You can still add
                                            class-wide lines; they apply to every student once fees are generated for this
                                            structure and month.
                                          </>
                                        ) : (
                                          <>
                                            Lines you add here apply to <strong>all {studentCount} students</strong> for this
                                            installment (same as editing each student in Student-wise fees).
                                          </>
                                        )}
                                      </div>
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
                                            Class misc / discounts
                                          </p>
                                          <p className="text-[10px] text-gray-500 mb-1">
                                            Shown on every student&apos;s fee record for this installment.
                                          </p>
                                          {detail.manual_lines.length === 0 ? (
                                            <p className="text-xs text-gray-400 py-2">No class lines yet</p>
                                          ) : (
                                            <ul className="text-xs space-y-0.5">
                                              {detail.manual_lines.map((ln) => (
                                                <li key={ln.id} className="flex justify-between items-center gap-2">
                                                  <span className="text-gray-800 truncate">
                                                    {ln.label}{' '}
                                                    <span className="text-gray-500">({ln.kind})</span>
                                                  </span>
                                                  <span className="flex items-center gap-2 shrink-0">
                                                    <span className={ln.amount < 0 ? 'text-green-600' : 'text-red-600'}>
                                                      {ln.amount < 0 ? '−' : '+'}
                                                      {formatMoney(Math.abs(ln.amount))}
                                                    </span>
                                                    {detail.editable && (
                                                      <button
                                                        type="button"
                                                        className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-100"
                                                        onClick={() => removeClassLine(inst, ln.id)}
                                                      >
                                                        Remove
                                                      </button>
                                                    )}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                          {!detail.editable && detail.manual_lines.length > 0 && (
                                            <p className="mt-1 text-[10px] text-amber-700">
                                              Removal is disabled after all student invoices in this installment are fully paid.
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      {detail.editable && detail.class_fee_lines_available !== false && (
                                        <div className="flex flex-wrap items-center gap-2 rounded-md border border-orange-200 bg-white px-2 py-2">
                                          <span className="text-xs font-semibold text-gray-700 shrink-0">Add class line</span>
                                          <select
                                            value={newLineKind}
                                            onChange={(e) => setNewLineKind(e.target.value as 'misc' | 'discount')}
                                            className="border border-gray-200 rounded px-2 py-1 text-xs h-8"
                                          >
                                            <option value="misc">Misc +</option>
                                            <option value="discount">Discount −</option>
                                          </select>
                                          <Input
                                            placeholder="Label"
                                            value={newLineLabel}
                                            onChange={(e) => setNewLineLabel(e.target.value)}
                                            className="h-8 text-sm min-w-[160px] flex-1 max-w-[260px]"
                                          />
                                          <div className="h-8 w-28 border border-gray-300 rounded px-2 flex items-center gap-1 bg-white">
                                            <span className="text-xs text-gray-500">₹</span>
                                            <input
                                              type="number"
                                              placeholder="Amount"
                                              value={newLineAmount}
                                              onChange={(e) => setNewLineAmount(e.target.value)}
                                              className="w-full border-0 p-0 text-sm focus:outline-none bg-transparent"
                                            />
                                          </div>
                                          <Button
                                            type="button"
                                            size="sm"
                                            disabled={savingLine}
                                            onClick={() => addClassLine(inst)}
                                            className="h-8 text-xs px-3 bg-orange-600 hover:bg-orange-700 shrink-0"
                                          >
                                            {savingLine ? '…' : 'Save'}
                                          </Button>
                                        </div>
                                      )}

                                      {!detail.editable && (
                                        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
                                          Every student has paid this installment — you cannot add class lines until there is at
                                          least one unpaid fee row.
                                        </p>
                                      )}
                                    </>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
