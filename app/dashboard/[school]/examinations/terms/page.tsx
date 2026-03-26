'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

type ClassRow = { id: string; class: string; section: string };
type EditorRow = { serial: number; name: string };
type TermExamRow = { serial: number; exam_name: string };
type EditorTerm = { serial: number; name: string; exams: TermExamRow[] };
type Structure = { id: string; name: string; created_at?: string };

export default function TermsPage({ params }: { params: Promise<{ school: string }> }) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [structures, setStructures] = useState<Structure[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState('');
  const [newStructureName, setNewStructureName] = useState('');
  const [rows, setRows] = useState<EditorTerm[]>([{ serial: 1, name: '', exams: [{ serial: 1, exam_name: '' }] }]);
  const [saving, setSaving] = useState(false);
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
            ? (t.exams || []).map((e: any) => ({ serial: Number(e.serial || 1), exam_name: String(e.exam_name || '') }))
            : [{ serial: 1, exam_name: '' }],
      }));
      setRows(termRows.length > 0 ? termRows : [{ serial: 1, name: '', exams: [{ serial: 1, exam_name: '' }] }]);
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
    setRows((prev) => [...prev, { serial: prev.length + 1, name: '', exams: [{ serial: 1, exam_name: '' }] }]);
  const removeRow = (index: number) => setRows((prev) => prev.filter((_, i) => i !== index));
  const updateRow = (index: number, patch: Partial<EditorTerm>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const addExamRow = (termIndex: number) =>
    setRows((prev) =>
      prev.map((t, i) =>
        i === termIndex
          ? { ...t, exams: [...t.exams, { serial: t.exams.length + 1, exam_name: '' }] }
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
    setSaving(true);
    setMsg('');
    try {
      const mappings = selectedSectionRows.map((r) => ({ class_id: r.id, section: r.section }));
      const termsPayload = cleanRows.map((t) => ({
        serial: t.serial,
        name: t.name,
        exams: (t.exams || []).filter((e) => String(e.exam_name || '').trim()),
      }));
      const res = await fetch(`/api/term-structures/${selectedStructureId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          mappings,
          terms: termsPayload,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || 'Failed to save structure');
        return;
      }
      setMsg('Structure saved successfully');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-slate-50/50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add Term Structure</h1>
          <p className="text-sm text-slate-600">Build exam flow by structure, terms, and template examinations.</p>
        </div>
        <Button onClick={() => router.push(`/dashboard/${schoolCode}/examinations/dashboard`)}>Back</Button>
      </div>

      <Card className="p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          {stepItems.map((s) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id as 1 | 2 | 3 | 4)}
              className={`text-left px-3 py-3 rounded-xl text-sm border transition ${
                step === s.id
                  ? 'bg-[#5A7A95] text-white border-[#5A7A95] shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-[#5A7A95]/50'
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

      {step === 1 && (
        <Card className="p-4 md:p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Create / Select Structure</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              className="border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#5A7A95]/30 focus:outline-none"
              placeholder="e.g., Senior Student Structure"
              value={newStructureName}
              onChange={(e) => setNewStructureName(e.target.value)}
            />
            <Button onClick={createStructure} disabled={saving || !newStructureName.trim()}>
              Create Structure
            </Button>
            <select
              className="border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#5A7A95]/30 focus:outline-none"
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
        </Card>
      )}

      {step === 2 && (
        <Card className="p-4 md:p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-900">Map Classes & Sections</h2>
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
        <Card className="p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Add Terms</h2>
            <Button variant="outline" onClick={addRow}>Add Term</Button>
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
        <Card className="p-4 md:p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Add Examinations Under Terms</h2>
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
                    className="col-span-8 border border-slate-300 rounded-lg px-2 py-2"
                    value={ex.exam_name}
                    onChange={(e) => updateExamRow(index, examIndex, { exam_name: e.target.value })}
                    placeholder="Exam Name (e.g., First Term, Mid Term)"
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

      <Card className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border border-slate-200">
        <div className="text-sm text-slate-700">
          <span className="font-semibold">{selectedStructureId ? 'Structure selected' : 'No structure selected'}</span>
          <span className="mx-2 text-slate-400">•</span>
          <span>{selectedSectionRows.length} mapped section(s)</span>
        </div>
        <Button onClick={applyTerms} disabled={saving}>
          {saving ? 'Saving...' : 'Save Structure'}
        </Button>
      </Card>

      {selectedSectionRows.length > 0 ? (
        <Card className="p-4">
          <h3 className="font-semibold text-slate-900 mb-2">Selected Sections</h3>
          <div className="flex flex-wrap gap-2">
            {selectedSectionRows.map((r) => (
              <span key={r.id} className="px-2.5 py-1 rounded-full text-xs bg-[#5A7A95]/10 text-[#35536b] border border-[#5A7A95]/20">
                {r.class}-{r.section}
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="p-4 md:p-5">
        <h3 className="font-semibold mb-3 text-slate-900">Saved Structures</h3>
        <div className="space-y-2">
          {structures.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedStructureId(s.id);
                setStep(2);
              }}
              className={`w-full text-left px-3 py-2.5 border rounded-xl transition ${
                selectedStructureId === s.id
                  ? 'border-[#5A7A95] bg-[#5A7A95]/8 text-slate-900'
                  : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
              }`}
            >
              {s.name}
            </button>
          ))}
          {structures.length === 0 ? <p className="text-sm text-gray-500">No structures yet.</p> : null}
        </div>
      </Card>
    </div>
  );
}

