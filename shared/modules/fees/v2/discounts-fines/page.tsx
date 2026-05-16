'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  AlertCircle,
  ArrowLeft,
  CheckSquare,
  Loader2,
  Percent,
  IndianRupee,
  Square,
  Tag,
} from 'lucide-react';
import type { BulkChargeType, BulkValueMode } from '@/lib/fees/bulk-adjustment-math';

type StudentRow = {
  id: string;
  student_name: string;
  admission_no: string;
  roll_number: string;
  gender: string | null;
  category: string | null;
  year_of_joining: number | null;
  is_rte: boolean;
};

type InstallmentRow = {
  fee_structure_id: string;
  due_month: string;
  due_date: string;
  structure_name: string;
  installment_display_label?: string;
};

type PreviewRow = {
  student_id: string;
  student_name: string;
  admission_no: string;
  roll_number: string;
  due_month: string;
  student_fee_id: string | null;
  proposed_line_amount: number;
  proposed_label: string;
  projected_balance_due: number;
  ok: boolean;
  error: string | null;
};

function staffHeaders(): HeadersInit {
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
}

export default function DiscountsFinesPage({
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

  const [genderFilter, setGenderFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [admissionYearFilter, setAdmissionYearFilter] = useState('');
  const [rteFilter, setRteFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'roll'>('name');

  const [filterOptions, setFilterOptions] = useState<{
    genders: string[];
    categories: string[];
    admission_years: number[];
  }>({ genders: [], categories: [], admission_years: [] });

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [structureId, setStructureId] = useState('');
  const [structureName, setStructureName] = useState('');
  const [installments, setInstallments] = useState<InstallmentRow[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(() => new Set());
  const [loadingStructure, setLoadingStructure] = useState(false);

  const [chargeType, setChargeType] = useState<BulkChargeType>('discount');
  const [valueMode, setValueMode] = useState<BulkValueMode>('percent');
  const [value, setValue] = useState('');
  const [label, setLabel] = useState('');

  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewSummary, setPreviewSummary] = useState<{ ok: number; failed: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

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
        setClasses(
          Array.from(new Set(raw.map((c) => c.class).filter(Boolean))).sort() as string[]
        );
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
      if (String(r.class ?? '').trim() === className.trim() && r.section?.trim()) {
        set.add(String(r.section).trim());
      }
    }
    return Array.from(set).sort();
  }, [className, classRows]);

  const loadStudents = useCallback(async () => {
    if (!className || !section) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    setSelectedIds(new Set());
    try {
      const q = new URLSearchParams({
        school_code: schoolCode,
        class: className,
        section,
      });
      if (genderFilter) q.set('gender', genderFilter);
      if (categoryFilter) q.set('category', categoryFilter);
      if (admissionYearFilter) q.set('admission_year', admissionYearFilter);
      if (rteFilter) q.set('rte', rteFilter);
      q.set('sort', sortBy);

      const res = await fetch(`/api/v2/fees/discounts-fines/students?${q}`);
      const data = await res.json();
      if (res.ok && data.data) {
        setStudents(data.data.students || []);
        setFilterOptions(
          data.data.filter_options || { genders: [], categories: [], admission_years: [] }
        );
      } else {
        setStudents([]);
        setMessage({ type: 'err', text: data.error || 'Failed to load students' });
      }
    } catch {
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, [schoolCode, className, section, genderFilter, categoryFilter, admissionYearFilter, rteFilter, sortBy]);

  const loadStructureAndInstallments = useCallback(async () => {
    if (!className || !section || !academicYear) {
      setStructureId('');
      setInstallments([]);
      return;
    }
    setLoadingStructure(true);
    setSelectedMonths(new Set());
    try {
      const plansQ = new URLSearchParams({
        school_code: schoolCode,
        class: className,
        section,
        academic_year: academicYear,
      });
      const plansRes = await fetch(`/api/v2/fees/class-section/student-plans?${plansQ}`);
      const plansData = await plansRes.json();
      const sid = plansData?.data?.fee_structure?.id
        ? String(plansData.data.fee_structure.id)
        : '';
      const sname = plansData?.data?.fee_structure?.name
        ? String(plansData.data.fee_structure.name)
        : '';
      setStructureId(sid);
      setStructureName(sname);

      if (!sid) {
        setInstallments([]);
        return;
      }

      const instQ = new URLSearchParams({
        school_code: schoolCode,
        class: className,
        section,
        academic_year: academicYear,
      });
      const instRes = await fetch(`/api/v2/fees/class-section/installments?${instQ}`);
      const instData = await instRes.json();
      const list = (instData?.data?.installments || []) as InstallmentRow[];
      const forStructure = list.filter((i) => String(i.fee_structure_id) === sid);
      setInstallments(forStructure);
    } catch {
      setStructureId('');
      setInstallments([]);
    } finally {
      setLoadingStructure(false);
    }
  }, [schoolCode, className, section, academicYear]);

  useEffect(() => {
    fetchYears();
    fetchClasses();
  }, [fetchYears, fetchClasses]);

  useEffect(() => {
    if (className && section) loadStudents();
  }, [className, section, loadStudents]);

  useEffect(() => {
    if (className && section && academicYear) loadStructureAndInstallments();
  }, [className, section, academicYear, loadStructureAndInstallments]);

  const allSelected = students.length > 0 && selectedIds.size === students.length;
  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(students.map((s) => s.id)));
  };

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMonth = (dm: string) => {
    setSelectedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(dm)) next.delete(dm);
      else next.add(dm);
      return next;
    });
  };

  const formatMoney = (n: number) =>
    `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const canPreview =
    selectedIds.size > 0 &&
    structureId &&
    selectedMonths.size > 0 &&
    value.trim() !== '';

  const runPreview = async () => {
    if (!canPreview) return;
    setPreviewLoading(true);
    setMessage(null);
    setPreviewRows([]);
    setPreviewSummary(null);
    try {
      const res = await fetch('/api/v2/fees/discounts-fines/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          class_name: className,
          section,
          student_ids: [...selectedIds],
          fee_structure_id: structureId,
          due_months: [...selectedMonths],
          charge_type: chargeType,
          value_mode: valueMode,
          value: parseFloat(value),
          label: label.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'err', text: data.error || 'Preview failed' });
        return;
      }
      setPreviewRows(data.data?.rows || []);
      setPreviewSummary(data.data?.summary || null);
    } catch {
      setMessage({ type: 'err', text: 'Preview failed' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const runApply = async () => {
    if (!previewSummary || previewSummary.ok === 0) {
      setMessage({ type: 'err', text: 'Run preview first — no valid rows to apply' });
      return;
    }
    if (!confirm(`Apply to ${previewSummary.ok} student-installment row(s)?`)) return;
    setApplying(true);
    setMessage(null);
    try {
      const res = await fetch('/api/v2/fees/discounts-fines/apply', {
        method: 'POST',
        headers: staffHeaders(),
        body: JSON.stringify({
          school_code: schoolCode,
          class_name: className,
          section,
          student_ids: [...selectedIds],
          fee_structure_id: structureId,
          due_months: [...selectedMonths],
          charge_type: chargeType,
          value_mode: valueMode,
          value: parseFloat(value),
          label: label.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'err', text: data.error || 'Apply failed' });
        return;
      }
      setMessage({
        type: 'ok',
        text: `Applied ${data.data?.applied ?? 0} adjustment(s). Skipped ${data.data?.skipped ?? 0}. Visible on Collect Payment and receipts for selected students.`,
      });
      setPreviewRows([]);
      setPreviewSummary(null);
    } catch {
      setMessage({ type: 'err', text: 'Apply failed' });
    } finally {
      setApplying(false);
    }
  };

  const chargeTypeLabel =
    chargeType === 'discount'
      ? 'Discount'
      : chargeType === 'fine'
        ? 'Fine'
        : 'Additional charge';

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => router.push(`/dashboard/${schoolCode}/fees`)}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Fees
            </button>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Tag className="w-7 h-7 text-violet-700" />
              Discounts &amp; Fines
            </h1>
            <p className="text-sm text-gray-600 mt-1 max-w-2xl">
              Apply bulk discounts, fines, or additional charges to selected students and installments.
              Lines appear on <strong>Collect Payment</strong> and payment receipts for those students only.
              Multiple discounts on the same installment are <strong>additive</strong> (each saved as a separate line).
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              message.type === 'ok'
                ? 'bg-green-50 border-green-200 text-green-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {message.text}
          </div>
        )}

        <Card className="p-4 md:p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">1 · Class &amp; section</h2>
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
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
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
        </Card>

        {className && section && (
          <Card className="p-4 md:p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">2 · Filter &amp; select students</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase">Gender</label>
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                >
                  <option value="">All</option>
                  {filterOptions.genders.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase">Caste / category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                >
                  <option value="">All</option>
                  {filterOptions.categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase">Year of joining</label>
                <select
                  value={admissionYearFilter}
                  onChange={(e) => setAdmissionYearFilter(e.target.value)}
                  className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                >
                  <option value="">All</option>
                  {filterOptions.admission_years.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase">RTE group</label>
                <select
                  value={rteFilter}
                  onChange={(e) => setRteFilter(e.target.value)}
                  className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                >
                  <option value="">All</option>
                  <option value="yes">RTE only</option>
                  <option value="no">Non-RTE</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase">Sort</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'roll')}
                  className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                >
                  <option value="name">Alphabetical</option>
                  <option value="roll">Roll number</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button type="button" size="sm" variant="outline" onClick={toggleAll} className="w-full text-xs">
                  {allSelected ? 'Clear all' : 'Select all'}
                </Button>
              </div>
            </div>

            {loadingStudents ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-violet-700" />
              </div>
            ) : students.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No students match these filters.</p>
            ) : (
              <div className="max-h-72 overflow-auto rounded border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="w-10 px-2 py-2" />
                      <th className="text-left px-2 py-2">Name</th>
                      <th className="text-left px-2 py-2">Roll</th>
                      <th className="text-left px-2 py-2 hidden sm:table-cell">Gender</th>
                      <th className="text-left px-2 py-2 hidden md:table-cell">Category</th>
                      <th className="text-left px-2 py-2">RTE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const on = selectedIds.has(s.id);
                      return (
                        <tr
                          key={s.id}
                          className={`border-t border-gray-100 cursor-pointer ${on ? 'bg-violet-50' : ''}`}
                          onClick={() => toggleStudent(s.id)}
                        >
                          <td className="px-2 py-2">
                            {on ? (
                              <CheckSquare className="w-4 h-4 text-violet-700" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400" />
                            )}
                          </td>
                          <td className="px-2 py-2 font-medium">{s.student_name}</td>
                          <td className="px-2 py-2 text-gray-600">{s.roll_number || '—'}</td>
                          <td className="px-2 py-2 text-gray-600 hidden sm:table-cell">{s.gender || '—'}</td>
                          <td className="px-2 py-2 text-gray-600 hidden md:table-cell">{s.category || '—'}</td>
                          <td className="px-2 py-2">{s.is_rte ? 'Yes' : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-gray-600">
              <strong>{selectedIds.size}</strong> of {students.length} students selected
            </p>
          </Card>
        )}

        {className && section && selectedIds.size > 0 && (
          <Card className="p-4 md:p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
              3 · Active fee structure &amp; installments
            </h2>
            {loadingStructure ? (
              <Loader2 className="w-6 h-6 animate-spin text-violet-700" />
            ) : !structureId ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 flex gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                No active fee structure for this class, section, and academic year. Create or activate one under Fee
                Structures.
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-800">
                  Active structure: <strong>{structureName}</strong>
                </p>
                <p className="text-xs text-gray-600">Select one or more installments:</p>
                <div className="flex flex-wrap gap-2">
                  {installments.map((inst) => {
                    const on = selectedMonths.has(inst.due_month);
                    return (
                      <button
                        key={inst.due_month}
                        type="button"
                        onClick={() => toggleMonth(inst.due_month)}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                          on
                            ? 'border-violet-500 bg-violet-100 text-violet-900'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-violet-300'
                        }`}
                      >
                        {inst.installment_display_label || inst.due_month}
                        <span className="block text-[10px] font-normal text-gray-500 mt-0.5">
                          {new Date(inst.due_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {installments.length === 0 && (
                  <p className="text-sm text-gray-500">No installments on this structure yet.</p>
                )}
              </>
            )}
          </Card>
        )}

        {selectedIds.size > 0 && structureId && selectedMonths.size > 0 && (
          <Card className="p-4 md:p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">4 · Adjustment</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Type</label>
                <select
                  value={chargeType}
                  onChange={(e) => setChargeType(e.target.value as BulkChargeType)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="discount">Bulk discount</option>
                  <option value="fine">Bulk fine</option>
                  <option value="additional_charge">Bulk additional charge</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">Format</label>
                <select
                  value={valueMode}
                  onChange={(e) => setValueMode(e.target.value as BulkValueMode)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="absolute">Absolute amount (₹)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase">
                  {valueMode === 'percent' ? 'Value (%)' : 'Value (₹)'}
                </label>
                <div className="mt-1 flex items-center gap-2">
                  {valueMode === 'percent' ? (
                    <Percent className="w-4 h-4 text-gray-400 shrink-0" />
                  ) : (
                    <IndianRupee className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                  <Input
                    type="number"
                    min={0}
                    max={valueMode === 'percent' ? 100 : undefined}
                    step={valueMode === 'percent' ? 0.01 : 1}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={valueMode === 'percent' ? 'e.g. 10' : 'e.g. 500'}
                    className="flex-1"
                  />
                </div>
                {chargeType === 'discount' && valueMode === 'percent' && (
                  <p className="text-[10px] text-gray-500 mt-1">Max 100%. Cannot exceed installment total.</p>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Label (optional)</label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={`Default: ${chargeTypeLabel}`}
                className="mt-1"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={runPreview} disabled={!canPreview || previewLoading}>
                {previewLoading ? 'Previewing…' : 'Preview impact'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={runApply}
                disabled={applying || !previewSummary || previewSummary.ok === 0}
              >
                {applying ? 'Applying…' : 'Apply to selected students'}
              </Button>
            </div>
          </Card>
        )}

        {previewRows.length > 0 && (
          <Card className="p-4 md:p-5 space-y-3">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Preview</h2>
            {previewSummary && (
              <p className="text-sm text-gray-700">
                <span className="text-green-700 font-semibold">{previewSummary.ok} OK</span>
                {previewSummary.failed > 0 && (
                  <>
                    {' '}
                    · <span className="text-red-700 font-semibold">{previewSummary.failed} failed</span>
                  </>
                )}
              </p>
            )}
            <div className="max-h-80 overflow-auto rounded border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-2">Student</th>
                    <th className="text-left px-2 py-2">Installment</th>
                    <th className="text-right px-2 py-2">Line</th>
                    <th className="text-right px-2 py-2">Balance after</th>
                    <th className="text-left px-2 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={`${r.student_id}-${r.due_month}-${i}`} className="border-t border-gray-100">
                      <td className="px-2 py-1.5">{r.student_name}</td>
                      <td className="px-2 py-1.5">{r.due_month}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {r.proposed_line_amount < 0 ? '−' : '+'}
                        {formatMoney(Math.abs(r.proposed_line_amount))}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {formatMoney(r.projected_balance_due)}
                      </td>
                      <td className="px-2 py-1.5">
                        {r.ok ? (
                          <span className="text-green-700">OK</span>
                        ) : (
                          <span className="text-red-700" title={r.error || ''}>
                            {r.error || 'Error'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
