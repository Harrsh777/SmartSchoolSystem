'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
    FileText,
  BookOpen,
  Calendar,
  Loader2,
  ChevronRight,
  Users,
  CheckSquare,
  Square,
} from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

export default function ReportCardGeneratePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStructureId, setSelectedStructureId] = useState('');
  const [selectedTerms, setSelectedTerms] = useState<Set<string>>(new Set());
  const [selectedExamIds, setSelectedExamIds] = useState<Set<string>>(new Set());
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [classes, setClasses] = useState<Array<{ id: string; class: string; section: string }>>([]);
  const [exams, setExams] = useState<Array<{ id: string; exam_name: string; term_id?: string | null; academic_year?: string; class_mappings?: Array<{ class: { id: string; class: string; section: string } }> }>>([]);
  const [structures, setStructures] = useState<Array<{ id: string; name: string }>>([]);
  const [structureTerms, setStructureTerms] = useState<Array<{ id: string; name: string; serial?: number }>>([]);
  const [students, setStudents] = useState<
    Array<{
      id: string;
      student_name: string;
      admission_no: string;
      class: string;
      section: string;
      roll_number?: string | null;
      date_of_birth?: string | null;
      dob?: string | null;
      student_contact?: string | null;
      father_contact?: string | null;
    }>
  >([]);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; description?: string }>>([]);

  const sortStudentsByRoll = <
    T extends { roll_number?: string | null; student_name: string }
  >(list: T[]): T[] => {
    return [...list].sort((a, b) => {
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
  };

  const classOptions = [...new Set(classes.map((c) => c.class))].sort();
  const filteredClasses = selectedClass ? classes.filter((c) => c.class === selectedClass) : classes;
  const sectionOptions = [...new Set(filteredClasses.map((c) => c.section).filter(Boolean))].sort();

  const examsForClass = exams.filter((e) =>
    (e.class_mappings || []).some((m: { class?: { id: string; class: string; section: string } }) => {
      const mc = m.class;
      return mc && mc.class === selectedClass && mc.section === selectedSection;
    })
  );
  const termsForClass = structureTerms.filter((t) =>
    examsForClass.some((e) => String(e.term_id || '') === String(t.id))
  );
  const examsForSelectedTerms = examsForClass.filter((e) => selectedTerms.has(String(e.term_id || '')));
  const examsForSelectedTermIdsKey = examsForSelectedTerms
    .map((e) => e.id)
    .sort()
    .join('|');

  const formatDob = (raw: string | null | undefined): string => {
    const value = String(raw || '').trim();
    if (!value) return '—';
    const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-GB');
  };

  const resolveContact = (student: {
    student_contact?: string | null;
    father_contact?: string | null;
  }): string => {
    const primary = String(student.student_contact || '').trim();
    if (primary) return primary;
    const father = String(student.father_contact || '').trim();
    return father || '—';
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [examsRes, classesRes, templatesRes, structuresRes] = await Promise.all([
          fetch(`/api/examinations/v2/list?school_code=${schoolCode}`),
          fetch(`/api/classes?school_code=${schoolCode}`),
          fetch(`/api/report-card/templates?school_code=${schoolCode}`),
          fetch(`/api/term-structures?school_code=${schoolCode}`),
        ]);
        const examsJson = await examsRes.json();
        const classesJson = await classesRes.json();
        const templatesJson = await templatesRes.json();
        const structuresJson = await structuresRes.json();

        if (examsRes.ok && examsJson.data) setExams(examsJson.data);
        if (classesRes.ok && classesJson.data) setClasses(classesJson.data);
        if (templatesRes.ok && Array.isArray(templatesJson.data)) {
          setTemplates(
            templatesJson.data.map((t: { id: unknown; name?: unknown; description?: unknown }) => ({
              id: String(t.id ?? ''),
              name: String(t.name ?? 'Template'),
              description: t.description != null ? String(t.description) : undefined,
            }))
          );
        }
        if (structuresRes.ok && structuresJson.data) setStructures(structuresJson.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [schoolCode]);

  useEffect(() => {
    const loadStructureTerms = async () => {
      if (!selectedStructureId) {
        setStructureTerms([]);
        setSelectedTerms(new Set());
        setSelectedExamIds(new Set());
        return;
      }
      const res = await fetch(`/api/term-structures/${selectedStructureId}?school_code=${encodeURIComponent(schoolCode)}`);
      const json = await res.json();
      const terms = (json.data?.terms || []) as Array<{ id: string; name: string; serial?: number }>;
      setStructureTerms(terms);
      setSelectedTerms(new Set());
      setSelectedExamIds(new Set());
    };
    loadStructureTerms();
  }, [selectedStructureId, schoolCode]);

  useEffect(() => {
    setSelectedExamIds((prev) => {
      const allowed = new Set(examsForSelectedTerms.map((e) => e.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (allowed.has(id)) next.add(id);
      });
      if (next.size === prev.size) {
        let same = true;
        prev.forEach((id) => {
          if (!next.has(id)) same = false;
        });
        if (same) return prev;
      }
      return next;
    });
  }, [selectedTerms, selectedClass, selectedSection, examsForSelectedTermIdsKey]);

  useEffect(() => {
    if (step === 4 && (selectedClass || selectedSection)) {
      setLoading(true);
      const params = new URLSearchParams({ school_code: schoolCode });
      if (selectedClass) params.set('class', selectedClass);
      if (selectedSection) params.set('section', selectedSection);
      params.set('status', 'active');
      // Sort students by roll number for the selection list.
      params.set('sort_by', 'roll_number');
      params.set('sort_order', 'asc');
      fetch(`/api/students?${params}`)
        .then((r) => r.json())
        .then(async (res) => {
          if (!res.data) {
            setStudents([]);
            return;
          }
          const baseStudents = (res.data as Array<Record<string, unknown>>).map((s) => ({
            ...(s as object),
            id: String(s.id || ''),
            student_name: String(s.student_name || ''),
            admission_no: String(s.admission_no || ''),
            class: String(s.class || ''),
            section: String(s.section || ''),
            roll_number: (s.roll_number as string | null | undefined) ?? null,
            date_of_birth:
              (s.date_of_birth as string | null | undefined) ??
              (s.dob as string | null | undefined) ??
              (s.birth_date as string | null | undefined) ??
              (s.student_dob as string | null | undefined) ??
              null,
            dob:
              (s.dob as string | null | undefined) ??
              (s.date_of_birth as string | null | undefined) ??
              (s.birth_date as string | null | undefined) ??
              (s.student_dob as string | null | undefined) ??
              null,
            student_contact: (s.student_contact as string | null | undefined) ?? null,
            father_contact:
              (s.father_contact as string | null | undefined) ??
              (s.father_mobile as string | null | undefined) ??
              null,
          }));

          const needsDob = baseStudents.filter((s) => !String(s.date_of_birth || s.dob || '').trim());
          if (needsDob.length === 0) {
            setStudents(sortStudentsByRoll(baseStudents));
            return;
          }

          const detailRows = await Promise.all(
            needsDob.map(async (s) => {
              try {
                const detailRes = await fetch(
                  `/api/students/${encodeURIComponent(s.id)}?school_code=${encodeURIComponent(schoolCode)}`
                );
                const detailJson = await detailRes.json();
                const detail = detailJson?.data as Record<string, unknown> | undefined;
                const detailDob =
                  (detail?.date_of_birth as string | null | undefined) ??
                  (detail?.dob as string | null | undefined) ??
                  (detail?.birth_date as string | null | undefined) ??
                  (detail?.student_dob as string | null | undefined) ??
                  null;
                return [s.id, detailDob] as const;
              } catch {
                return [s.id, null] as const;
              }
            })
          );
          const dobById = new Map(detailRows);
          const enriched = baseStudents.map((s) => {
            const extraDob = dobById.get(s.id) ?? null;
            return {
              ...s,
              date_of_birth: s.date_of_birth || extraDob,
              dob: s.dob || extraDob,
            };
          });
          setStudents(sortStudentsByRoll(enriched));
        })
        .catch(() => setStudents([]))
        .finally(() => setLoading(false));
    }
  }, [schoolCode, step, selectedClass, selectedSection]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTerm = (id: string) => {
    setSelectedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExam = (id: string) => {
    setSelectedExamIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllStudents = () => {
    if (selectedStudents.size === students.length) setSelectedStudents(new Set());
    else setSelectedStudents(new Set(students.map((s) => s.id)));
  };

  const selectAllTerms = () => {
    if (selectedTerms.size === termsForClass.length) setSelectedTerms(new Set());
    else setSelectedTerms(new Set(termsForClass.map((t) => t.id)));
  };

  const selectAllExams = () => {
    if (selectedExamIds.size === examsForSelectedTerms.length) {
      setSelectedExamIds(new Set());
    } else {
      setSelectedExamIds(new Set(examsForSelectedTerms.map((e) => e.id)));
    }
  };

  const canProceedStep1 = selectedClass && selectedSection;
  const canProceedStep2 = selectedStructureId && selectedTerms.size > 0 && selectedExamIds.size > 0;
  const canGenerate = selectedStudents.size > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    const ids = Array.from(selectedExamIds);
    if (ids.length === 0) return;
    setGenerating(true);
    setSubmitMessage(null);
    try {
      const res = await fetch('/api/marks/report-card/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          exam_ids: ids,
          student_ids: Array.from(selectedStudents),
          ...(selectedTemplateId ? { template_id: selectedTemplateId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');

      // If at least one was generated, navigate to dashboard
      if (data.generated && data.generated.length > 0) {
        if (data.errors && data.errors.length > 0) {
          setSubmitMessage({
            type: 'error',
            text: `Generated ${data.generated.length} report card(s), but ${data.errors.length} failed. You can retry for remaining students.`,
          });
        } else {
          setSubmitMessage({
            type: 'success',
            text: `Generated ${data.generated.length} report card(s) successfully.`,
          });
        }
        router.refresh();
        setTimeout(() => {
          router.push(`/dashboard/${schoolCode}/report-card/dashboard`);
        }, 250);
      } else {
        throw new Error('No report cards were generated. ' + (data.errors?.[0]?.error || 'Unknown error'));
      }
    } catch (e) {
      setSubmitMessage({ type: 'error', text: (e as Error).message });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden pb-0 mb-0">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <FileText className="text-white" size={24} />
            </div>
            Generate Report Card
          </h1>
          <p className="text-gray-600">Select class, structure terms, and students to generate report cards from actual exam data.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push(`/dashboard/${schoolCode}/report-card/dashboard`)} className="border-[#1e3a8a] text-[#1e3a8a]">
            Dashboard
          </Button>
         
        </div>
      </motion.div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              step === s ? 'bg-[#1e3a8a] text-white' : step > s ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Step {s}
            {s < 4 && <ChevronRight size={18} />}
          </div>
        ))}
      </div>

      <Card className="overflow-x-hidden mb-0">
        {submitMessage ? (
          <div className={`mx-6 mt-6 rounded-lg border px-4 py-3 text-sm ${
            submitMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}>
            {submitMessage.text}
          </div>
        ) : null}
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pb-0">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen size={24} className="text-[#1e3a8a]" />
              Step 1: Select Class & Section
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Class</label>
                <select
                  value={selectedClass}
                  onChange={(e) => { setSelectedClass(e.target.value); setSelectedSection(''); }}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                >
                  <option value="">Select Class</option>
                  {classOptions.map((cls) => <option key={cls} value={cls}>{cls}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Section</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  disabled={!selectedClass}
                >
                  <option value="">Select Section</option>
                  {sectionOptions.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
                </select>
              </div>
            </div>
            <Button onClick={() => setStep(2)} disabled={!canProceedStep1 || loading} className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
              {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              Next: Select Structure & Terms
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pb-0">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar size={24} className="text-[#1e3a8a]" />
              Step 2: Select Structure & Term(s)
            </h2>
            <p className="text-sm text-gray-600">
              Pick a term structure first, then select one or more terms. All exams mapped under selected terms will be included.
            </p>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Step 1: Term Structure</label>
              <select
                value={selectedStructureId}
                onChange={(e) => {
                  setSelectedStructureId(e.target.value);
                  setSelectedTerms(new Set());
                  setSelectedExamIds(new Set());
                }}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              >
                <option value="">Select Structure</option>
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
              <div className="flex justify-between border-b pb-2 mb-2">
                <p className="text-sm font-semibold text-gray-700">Step 2: Select Term(s)</p>
                <button onClick={selectAllTerms} className="text-sm font-medium text-[#1e3a8a] hover:underline" disabled={!selectedStructureId}>
                  {selectedTerms.size === termsForClass.length && termsForClass.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-gray-500">{selectedTerms.size} of {termsForClass.length} selected</span>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                {termsForClass.map((term) => (
                  <label key={term.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                    {selectedTerms.has(term.id) ? <CheckSquare size={22} className="text-[#1e3a8a]" /> : <Square size={22} className="text-gray-400" />}
                    <span>{term.serial ? `${term.serial}. ` : ''}{term.name}</span>
                    <input type="checkbox" checked={selectedTerms.has(term.id)} onChange={() => toggleTerm(term.id)} className="sr-only" />
                  </label>
                ))}
                {!selectedStructureId && <div className="p-4 text-gray-500 text-center">Select a structure first</div>}
                {selectedStructureId && termsForClass.length === 0 && <div className="p-4 text-gray-500 text-center">No terms with exams for this class/section</div>}
              </div>
              </div>
              <div>
                <div className="flex justify-between border-b pb-2 mb-2">
                  <p className="text-sm font-semibold text-gray-700">Step 3: Select Exam(s)</p>
                  <button
                    onClick={selectAllExams}
                    className="text-sm font-medium text-[#1e3a8a] hover:underline"
                    disabled={examsForSelectedTerms.length === 0}
                  >
                    {selectedExamIds.size === examsForSelectedTerms.length && examsForSelectedTerms.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-sm text-gray-500">{selectedExamIds.size} of {examsForSelectedTerms.length} selected</span>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                  {examsForSelectedTerms.map((exam) => (
                    <label key={exam.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                      {selectedExamIds.has(exam.id) ? <CheckSquare size={22} className="text-[#1e3a8a]" /> : <Square size={22} className="text-gray-400" />}
                      <span>{exam.exam_name}</span>
                      <input type="checkbox" checked={selectedExamIds.has(exam.id)} onChange={() => toggleExam(exam.id)} className="sr-only" />
                    </label>
                  ))}
                  {!selectedStructureId && <div className="p-4 text-gray-500 text-center">Select a structure first</div>}
                  {selectedStructureId && selectedTerms.size === 0 && <div className="p-4 text-gray-500 text-center">Select one or more terms first</div>}
                  {selectedStructureId && selectedTerms.size > 0 && examsForSelectedTerms.length === 0 && <div className="p-4 text-gray-500 text-center">No exams found under selected term(s)</div>}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">Selected exams for print: {selectedExamIds.size}</p>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                Next: Select Template
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pb-0">
            <h2 className="text-xl font-bold text-gray-900">Step 3: Template</h2>
            <p className="text-sm text-gray-600">
              Choose which layout to use. Customize defaults under Report Card → Customize Template.
            </p>
            <div className="max-w-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">Report card template</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              >
                <option value="">Default (latest school template)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {templates.length === 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  No named templates in the list — generation will still use your school&apos;s default template from the database.
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => setStep(4)} className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                Next: Select Students
              </Button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users size={24} className="text-[#1e3a8a]" />
              Step 4: Select Student(s)
            </h2>
            <div className="flex justify-between border-b pb-2">
              <button onClick={selectAllStudents} className="text-sm font-medium text-[#1e3a8a] hover:underline">
                {selectedStudents.size === students.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-gray-500">{selectedStudents.size} of {students.length} selected</span>
            </div>
            <div className="max-h-[44vh] overflow-y-auto border rounded-lg divide-y">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 size={32} className="animate-spin mx-auto text-[#1e3a8a]" />
                  <p className="mt-2 text-gray-500">Loading students...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No students found.</div>
              ) : (
                students.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                    {selectedStudents.has(s.id) ? <CheckSquare size={22} className="text-[#1e3a8a]" /> : <Square size={22} className="text-gray-400" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium truncate">{s.student_name}</span>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-3 flex-wrap">
                        <span className="font-mono">{s.admission_no}</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="text-gray-400">Roll:</span>
                          <span className="font-mono">{s.roll_number || '—'}</span>
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <span className="text-gray-400">DOB:</span>
                          <span className="font-mono">{formatDob(s.date_of_birth || s.dob)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="text-gray-400">Contact:</span>
                          <span className="font-mono">{resolveContact(s)}</span>
                        </span>
                      </div>
                    </div>
                    <input type="checkbox" checked={selectedStudents.has(s.id)} onChange={() => toggleStudent(s.id)} className="sr-only" />
                  </label>
                ))
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(3)}>Back</Button>
              <Button onClick={handleGenerate} disabled={!canGenerate || generating} className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                {generating ? <><Loader2 size={18} className="animate-spin mr-2" />Generating...</> : selectedStudents.size > 1 ? <>Generate {selectedStudents.size} Report Cards</> : <>Generate Report Card</>}
              </Button>
            </div>
          </motion.div>
        )}
      </Card>
    </div>
  );
}
