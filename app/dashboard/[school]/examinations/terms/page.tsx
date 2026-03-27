'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

type ClassRow = { id: string; class: string; section: string };
type EditorRow = { serial: number; name: string };
type TermExamRow = { serial: number; exam_name: string; weightage: number };
type EditorTerm = { serial: number; name: string; exams: TermExamRow[] };
type Structure = { id: string; name: string; created_at?: string };
type AcademicYearOption = { year_name?: string; is_current?: boolean };

export default function TermsPage({ params }: { params: Promise<{ school: string }> }) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [structures, setStructures] = useState<Structure[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState('');
  const [newStructureName, setNewStructureName] = useState('');
  const [rows, setRows] = useState<EditorTerm[]>([{ serial: 1, name: '', exams: [{ serial: 1, exam_name: '', weightage: 0 }] }]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingStructureId, setDeletingStructureId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const stepItems = [
    { id: 1 as const, title: 'Structure Name', subtitle: 'Create or select' },
    { id: 2 as const, title: 'Map Classes & Sections', subtitle: 'Choose targets' },
    { id: 3 as const, title: 'Add Terms', subtitle: 'Define term list' },
    { id: 4 as const, title: 'Add Examinations', subtitle: 'Set templates' },
  ];

  useEffect(() => {
    const run = async () => {
      const cRes = await fetch(`/api/classes?school_code=${schoolCode}`);
      const cJson = await cRes.json();
      setClasses((cJson.data || []) as ClassRow[]);
      const sRes = await fetch(`/api/term-structures?school_code=${schoolCode}`);
      const sJson = await sRes.json();
      const list = (sJson.data || []) as Structure[];
      setStructures(list);
      if (list.length > 0) setSelectedStructureId(list[0].id);

      const ayRes = await fetch(`/api/academic-year-management/years?school_code=${encodeURIComponent(schoolCode)}`);
      const ayJson = await ayRes.json();
      if (ayRes.ok && Array.isArray(ayJson.data)) {
        const options = (ayJson.data as AcademicYearOption[])
          .map((r) => String(r.year_name || '').trim())
          .filter(Boolean);
        setAcademicYears(options);
        const current = (ayJson.data as AcademicYearOption[]).find((r) => r.is_current && r.year_name)?.year_name;
        if (current) {
          setSelectedAcademicYear(String(current));
        } else if (options.length > 0) {
          setSelectedAcademicYear(options[0]);
        }
      }
    };
    run();
  }, [schoolCode]);

  useEffect(() => {
    const loadStructure = async () => {
      if (!selectedStructureId) return;
      const res = await fetch(
        `/api/term-structures/${selectedStructureId}?school_code=${encodeURIComponent(schoolCode)}`
      );
      const json = await res.json();
      const detail = json.data;
      if (!detail) return;

      const selected = new Set<string>();
      for (const m of detail.mappings || []) {
        const row = classes.find((c) => c.id === String(m.class_id) && c.section === String(m.section || ''));
        if (row) selected.add(row.id);
      }
      setSelectedSections(selected);

      const termRows: EditorTerm[] = (detail.terms || []).map((t: any) => ({
        serial: Number(t.serial || 1),
        name: String(t.name || ''),
        exams:
          (t.exams || []).length > 0
            ? (t.exams || []).map((e: any) => ({
                serial: Number(e.serial || 1),
                exam_name: String(e.exam_name || ''),
                weightage: Number(e.weightage || 0),
              }))
            : [{ serial: 1, exam_name: '', weightage: 0 }],
      }));
      setRows(termRows.length > 0 ? termRows : [{ serial: 1, name: '', exams: [{ serial: 1, exam_name: '', weightage: 0 }] }]);
      const loadedAcademicYear = String(detail.terms?.[0]?.academic_year || '').trim();
      if (loadedAcademicYear) setSelectedAcademicYear(loadedAcademicYear);
    };
    loadStructure();
  }, [selectedStructureId, schoolCode, classes]);

  const groupedClasses = useMemo(() => {
    const map = new Map<string, ClassRow[]>();
    for (const row of classes) {
      const key = row.class;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries()).map(([className, sections]) => ({ className, sections }));
  }, [classes]);

  const selectedSectionRows = useMemo(
    () => classes.filter((c) => selectedSections.has(c.id)),
    [classes, selectedSections]
  );

  const toggleSection = async (row: ClassRow) => {
    const next = new Set(selectedSections);
    if (next.has(row.id)) {
      next.delete(row.id);
    } else {
      next.add(row.id);
    }
    setSelectedSections(next);
  };

  const addRow = () =>
    setRows((prev) => [...prev, { serial: prev.length + 1, name: '', exams: [{ serial: 1, exam_name: '', weightage: 0 }] }]);
  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));
  const updateRow = (index: number, patch: Partial<EditorTerm>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const addExamRow = (termIndex: number) =>
    setRows((prev) =>
      prev.map((t, i) =>
        i === termIndex
          ? { ...t, exams: [...t.exams, { serial: t.exams.length + 1, exam_name: '', weightage: 0 }] }
          : t
      )
    );
  const removeExamRow = (termIndex: number, examIndex: number) =>
    setRows((prev) =>
      prev.map((t, i) =>
        i === termIndex ? { ...t, exams: t.exams.filter((_, ei) => ei !== examIndex) } : t
      )
    );
  const updateExamRow = (termIndex: number, examIndex: number, patch: Partial<TermExamRow>) =>
    setRows((prev) =>
      prev.map((t, i) =>
        i === termIndex
          ? {
              ...t,
              exams: t.exams.map((e, ei) => (ei === examIndex ? { ...e, ...patch } : e)),
            }
          : t
      )
    );
  const totalStructureWeightage = useMemo(
    () =>
      rows.reduce(
        (acc, t) =>
          acc +
          (t.exams || []).reduce(
            (sum, ex) => sum + (String(ex.exam_name || '').trim() ? Number(ex.weightage || 0) : 0),
            0
          ),
        0
      ),
    [rows]
  );
  const selectedStructure = useMemo(
    () => structures.find((s) => s.id === selectedStructureId) || null,
    [structures, selectedStructureId]
  );

  const createStructure = async () => {
    if (!newStructureName.trim()) return;
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/term-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_code: schoolCode, name: newStructureName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || 'Failed to create structure');
        return;
      }
      setStructures((prev) => [json.data as Structure, ...prev]);
      setSelectedStructureId(String(json.data.id));
      setNewStructureName('');
      setMsg('Structure created successfully');
      setStep(2);
    } finally {
      setSaving(false);
    }
  };

  const applyTerms = async () => {
    if (!selectedStructureId) {
      setMsg('Please create/select a structure first');
      return;
    }
    if (selectedSectionRows.length === 0) {
      setMsg('Please select at least one class section');
      return;
    }
    const cleanRows = rows.filter((r) => String(r.name).trim() && Number(r.serial) > 0);
    if (cleanRows.length === 0) {
      setMsg('Please add at least one valid term row');
      return;
    }
    const invalidExamWeightage = cleanRows.some((t) =>
      (t.exams || []).some((e) => String(e.exam_name || '').trim() && Number(e.weightage || 0) < 0)
    );
    if (invalidExamWeightage) {
      setMsg('Exam weightage cannot be negative');
      return;
    }
    if (Math.abs(totalStructureWeightage - 100) > 0.0001) {
      setMsg(`Total exam weightage must be exactly 100%. Current: ${totalStructureWeightage.toFixed(2)}%`);
      return;
    }

    setSaving(true);
    setMsg('');
    try {
      const mappings = selectedSectionRows.map((r) => ({ class_id: r.id, section: r.section }));
      const termsPayload = cleanRows.map((t) => ({
        serial: t.serial,
        name: t.name,
        academic_year: selectedAcademicYear,
        exams: (t.exams || [])
          .filter((e) => String(e.exam_name || '').trim())
          .map((e) => ({
            serial: Number(e.serial || 1),
            exam_name: String(e.exam_name || '').trim(),
            weightage: Number(e.weightage || 0),
          })),
      }));
      const res = await fetch(`/api/term-structures/${selectedStructureId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          academic_year: selectedAcademicYear,
          mappings,
          terms: termsPayload,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const details = json?.details ? ` (${json.details})` : '';
        setMsg((json.error || 'Failed to save structure') + details);
        return;
      }
      setMsg('Structure saved successfully');
    } finally {
      setSaving(false);
    }
  };

  const deleteStructure = async (structureId: string, structureName: string) => {
    const warning = `Delete structure "${structureName}"?\n\nThis will remove mapped sections, terms, and template exams under it.\n\nThis action is blocked if real examinations are already linked.`;
    if (!confirm(warning)) return;
    setDeletingStructureId(structureId);
    setMsg('');
    try {
      const res = await fetch(
        `/api/term-structures/${structureId}?school_code=${encodeURIComponent(schoolCode)}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || 'Failed to delete structure');
        return;
      }
      const next = structures.filter((s) => s.id !== structureId);
      setStructures(next);
      if (selectedStructureId === structureId) {
        setSelectedStructureId(next[0]?.id || '');
        setSelectedSections(new Set());
        setRows([{ serial: 1, name: '', exams: [{ serial: 1, exam_name: '', weightage: 0 }] }]);
        setStep(1);
      }
      setMsg('Structure deleted successfully');
    } finally {
      setDeletingStructureId(null);
    }
  };

  const goToNextStep = () => {
    if (step === 1 && !selectedStructureId) {
      setMsg('Please create or select a structure before moving to next step');
      return;
    }
    if (step === 1 && !selectedAcademicYear.trim()) {
      setMsg('Please select an academic year before moving to next step');
      return;
    }
    if (step === 2 && selectedSectionRows.length === 0) {
      setMsg('Please map at least one class-section before moving to next step');
      return;
    }
    if (step === 3) {
      const validTerms = rows.filter((r) => String(r.name).trim() && Number(r.serial) > 0);
      if (validTerms.length === 0) {
        setMsg('Please add at least one valid term before moving to next step');
        return;
      }
    }
    setMsg('');
    setStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev));
  };

  const goToPrevStep = () => {
    setMsg('');
    setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev));
  };

  return (
    <div className="space-y-6 p-6 bg-[#f5f1fb] min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Term Structure</h1>
          <p className="text-sm text-slate-600">Build exam flow by structure, terms, and template examinations.</p>
        </div>
        <Button onClick={() => router.push(`/dashboard/${schoolCode}/examinations/dashboard`)}>Back</Button>
      </div>

      <Card className="p-4 md:p-5 rounded-2xl border border-violet-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          {stepItems.map((s) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id as 1 | 2 | 3 | 4)}
              className={`text-left px-3 py-3 rounded-xl text-sm border transition ${
                step === s.id
                  ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300'
              }`}
            >
              <p className="font-semibold">Step {s.id}: {s.title}</p>
              <p className={`text-xs ${step === s.id ? 'text-slate-100' : 'text-slate-500'}`}>{s.subtitle}</p>
            </button>
          ))}
        </div>
      </Card>

      {msg ? (
        <Card className={`p-3 border ${msg.toLowerCase().includes('success') || msg.toLowerCase().includes('created') ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <p className={`text-sm font-medium ${msg.toLowerCase().includes('success') || msg.toLowerCase().includes('created') ? 'text-emerald-800' : 'text-amber-800'}`}>{msg}</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
      {step === 1 && (
        <Card className="p-4 md:p-6 space-y-4 rounded-2xl border border-violet-100">
          <h2 className="font-semibold text-slate-900 text-xl">Create / Select Structure</h2>
          <p className="text-sm text-slate-600">Create a new structure or continue editing an existing one.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-300 focus:outline-none"
              placeholder="e.g., Senior Student Structure"
              value={newStructureName}
              onChange={(e) => setNewStructureName(e.target.value)}
            />
            <Button onClick={createStructure} disabled={saving || !newStructureName.trim()} className="bg-violet-600 hover:bg-violet-700 text-white">
              Create Structure
            </Button>
            <select
              className="border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-300 focus:outline-none"
              value={selectedStructureId}
              onChange={(e) => setSelectedStructureId(e.target.value)}
            >
              <option value="">Select Existing Structure</option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="max-w-md">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Academic Year <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-violet-300 focus:outline-none"
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
            >
              <option value="">Select academic year</option>
              {academicYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">This year will be applied to all terms in this structure.</p>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-4 md:p-6 rounded-2xl border border-violet-100">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-900 text-xl">Map Classes & Sections</h2>
            <p className="text-sm text-slate-600 mt-1">Select all class-section combinations this structure applies to.</p>
          </div>
          <div className="space-y-3 max-h-[540px] overflow-auto pr-1">
            {groupedClasses.map((group) => (
              <div key={group.className} className="border border-slate-200 rounded-xl p-3 bg-white">
                <p className="font-semibold mb-2 text-slate-900">{group.className}</p>
                <div className="flex flex-wrap gap-3">
                  {group.sections.map((sectionRow) => (
                    <label key={sectionRow.id} className="inline-flex items-center gap-2 text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selectedSections.has(sectionRow.id)}
                        onChange={() => toggleSection(sectionRow)}
                      />
                      <span>Section {sectionRow.section}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-4 md:p-6 space-y-3 rounded-2xl border border-violet-100">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-xl">Add Terms</h2>
            <Button variant="outline" onClick={addRow}>+ Add Term</Button>
          </div>
          {rows.map((row, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center border border-slate-200 rounded-xl p-2 bg-white">
              <input
                type="number"
                min={1}
                className="col-span-2 border border-slate-300 rounded-lg px-2 py-2"
                value={row.serial}
                onChange={(e) => updateRow(index, { serial: Number(e.target.value || 1) })}
                placeholder="Serial"
              />
              <input
                className="col-span-8 border border-slate-300 rounded-lg px-2 py-2"
                value={row.name}
                onChange={(e) => updateRow(index, { name: e.target.value })}
                placeholder="Term Name (e.g., TERM 1, FA-1)"
              />
              <Button className="col-span-2" variant="outline" onClick={() => removeRow(index)}>
                Delete
              </Button>
            </div>
          ))}
        </Card>
      )}

      {step === 4 && (
        <Card className="p-4 md:p-6 space-y-4 rounded-2xl border border-violet-100">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900 text-xl">Add Examinations Under Terms</h2>
            <span
              className={`text-xs px-2 py-1 rounded-full border ${
                Math.abs(totalStructureWeightage - 100) <= 0.0001
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              Total Weightage: {totalStructureWeightage.toFixed(2)}%
            </span>
          </div>
          {rows.map((row, index) => (
            <div key={index} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-white">
              <p className="font-semibold text-slate-800">{row.serial}. {row.name || 'Untitled Term'}</p>
              {(row.exams || []).map((ex, examIndex) => (
                <div key={examIndex} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="number"
                    min={1}
                    className="col-span-2 border border-slate-300 rounded-lg px-2 py-2"
                    value={ex.serial}
                    onChange={(e) => updateExamRow(index, examIndex, { serial: Number(e.target.value || 1) })}
                    placeholder="S"
                  />
                  <input
                    className="col-span-6 border border-slate-300 rounded-lg px-2 py-2"
                    value={ex.exam_name}
                    onChange={(e) => updateExamRow(index, examIndex, { exam_name: e.target.value })}
                    placeholder="Exam Name (e.g., First Term, Mid Term)"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    className="col-span-2 border border-slate-300 rounded-lg px-2 py-2"
                    value={ex.weightage}
                    onChange={(e) => updateExamRow(index, examIndex, { weightage: Number(e.target.value || 0) })}
                    placeholder="%"
                  />
                  <Button className="col-span-2" variant="outline" onClick={() => removeExamRow(index, examIndex)}>
                    Del
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={() => addExamRow(index)}>
                Add Examination
              </Button>
            </div>
          ))}
        </Card>
      )}
        </div>

        <div className="space-y-4">
          <Card className="p-4 rounded-2xl border border-violet-200">
            <p className="text-xs uppercase tracking-wide text-violet-700 font-semibold mb-2">Selection Summary</p>
            <p className="text-sm text-slate-600">Structure selected</p>
            <p className="font-semibold text-slate-900 mt-1">{selectedStructure?.name || 'None'}</p>
            <p className="text-sm text-slate-600 mt-3">Academic year</p>
            <p className="font-semibold text-slate-900 mt-1">{selectedAcademicYear || 'Not selected'}</p>
            <p className="text-sm text-slate-600 mt-3">{selectedSectionRows.length} mapped section(s)</p>
            {selectedSectionRows.length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedSectionRows.slice(0, 6).map((r) => (
                  <span key={r.id} className="px-2 py-0.5 rounded-full text-xs bg-violet-50 text-violet-700 border border-violet-200">
                    {r.class}-{r.section}
                  </span>
                ))}
              </div>
            ) : null}
          </Card>

          <Card className="p-4 md:p-5 rounded-2xl border border-violet-100">
            <h3 className="font-semibold mb-3 text-slate-900">Saved Structures</h3>
            <div className="space-y-2">
              {structures.map((s) => (
                <div
                  key={s.id}
                  className={`w-full px-3 py-2.5 border rounded-xl transition flex items-center justify-between gap-3 ${
                    selectedStructureId === s.id
                      ? 'border-violet-400 bg-violet-50 text-slate-900'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <button
                    onClick={() => {
                      setSelectedStructureId(s.id);
                      setStep(2);
                    }}
                    className="text-left flex-1"
                  >
                    {s.name}
                  </button>
                  <Button
                    variant="outline"
                    onClick={() => deleteStructure(s.id, s.name)}
                    disabled={deletingStructureId === s.id}
                  >
                    {deletingStructureId === s.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              ))}
              {structures.length === 0 ? <p className="text-sm text-gray-500">No structures yet.</p> : null}
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-4 md:p-5 rounded-2xl border border-violet-100">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={goToPrevStep} disabled={step === 1}>
            Back
          </Button>
          {step < 4 ? (
            <Button onClick={goToNextStep} className="bg-violet-600 hover:bg-violet-700 text-white">
              Save & Continue
            </Button>
          ) : (
            <Button onClick={applyTerms} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
              {saving ? 'Saving...' : 'Save Structure'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

