'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
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
type ExamMode = 'single' | 'multiple';

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
  const [examMode, setExamMode] = useState<ExamMode>('single');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedExams, setSelectedExams] = useState<Set<string>>(new Set());
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [classes, setClasses] = useState<Array<{ id: string; class: string; section: string }>>([]);
  const [exams, setExams] = useState<Array<{ id: string; exam_name: string; academic_year?: string; class_mappings?: Array<{ class: { id: string; class: string; section: string } }> }>>([]);
  const [students, setStudents] = useState<Array<{ id: string; student_name: string; admission_no: string; class: string; section: string }>>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; description?: string }>>([]);

  const classOptions = [...new Set(classes.map((c) => c.class))].sort();
  const filteredClasses = selectedClass ? classes.filter((c) => c.class === selectedClass) : classes;
  const sectionOptions = [...new Set(filteredClasses.map((c) => c.section).filter(Boolean))].sort();

  const examsForClass = exams.filter((e) =>
    (e.class_mappings || []).some((m: { class?: { id: string; class: string; section: string } }) => {
      const mc = m.class;
      return mc && mc.class === selectedClass && mc.section === selectedSection;
    })
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [examsRes, classesRes, templatesRes] = await Promise.all([
          fetch(`/api/examinations/v2/list?school_code=${schoolCode}`),
          fetch(`/api/classes?school_code=${schoolCode}`),
          fetch(`/api/report-card/templates?school_code=${schoolCode}`),
        ]);
        const examsJson = await examsRes.json();
        const classesJson = await classesRes.json();
        const templatesJson = await templatesRes.json();

        if (examsRes.ok && examsJson.data) setExams(examsJson.data);
        if (classesRes.ok && classesJson.data) setClasses(classesJson.data);
        if (templatesRes.ok && templatesJson.data) setTemplates(templatesJson.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [schoolCode]);

  useEffect(() => {
    if (step === 4 && (selectedClass || selectedSection)) {
      setLoading(true);
      const params = new URLSearchParams({ school_code: schoolCode });
      if (selectedClass) params.set('class', selectedClass);
      if (selectedSection) params.set('section', selectedSection);
      params.set('status', 'active');
      fetch(`/api/students?${params}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.data) setStudents(res.data);
          else setStudents([]);
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

  const toggleExam = (id: string) => {
    setSelectedExams((prev) => {
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

  const selectAllExams = () => {
    if (selectedExams.size === examsForClass.length) setSelectedExams(new Set());
    else setSelectedExams(new Set(examsForClass.map((e) => e.id)));
  };

  const canProceedStep1 = selectedClass && selectedSection;
  const canProceedStep2 = examMode === 'single' ? selectedExam : selectedExams.size > 0;
  const canGenerate = selectedStudents.size > 0;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    const ids = examMode === 'single' ? (selectedExam ? [selectedExam] : []) : Array.from(selectedExams);
    if (ids.length === 0) return;
    setGenerating(true);
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
      
      // Check if there were any errors during generation
      if (data.errors && data.errors.length > 0) {
        const errorMessages = data.errors.map((e: { student_id: string; error: string }) => e.error).join(', ');
        alert(`Some report cards failed to generate: ${errorMessages}`);
      }
      
      // If at least one was generated, navigate to dashboard
      if (data.generated && data.generated.length > 0) {
        router.push(`/dashboard/${schoolCode}/report-card/dashboard`);
      } else {
        throw new Error('No report cards were generated. ' + (data.errors?.[0]?.error || 'Unknown error'));
      }
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <FileText className="text-white" size={24} />
            </div>
            Generate Report Card
          </h1>
          <p className="text-gray-600">Select class, exam(s), and students. Combine Half Yearly + Final for term-wise report.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push(`/dashboard/${schoolCode}/report-card/dashboard`)} className="border-[#1e3a8a] text-[#1e3a8a]">
            Dashboard
          </Button>
          <Button variant="outline" onClick={() => router.push(`/dashboard/${schoolCode}/report-card`)} className="border-[#1e3a8a] text-[#1e3a8a]">
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </motion.div>

      <div className="flex gap-2 mb-6 flex-wrap">
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

      <Card>
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
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
              Next: Select Exam(s)
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar size={24} className="text-[#1e3a8a]" />
              Step 2: Select Examination(s)
            </h2>
            <p className="text-sm text-gray-600">
              Choose single exam or multiple (e.g. Half Yearly + Final) to combine into one report card.
            </p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={examMode === 'single'} onChange={() => { setExamMode('single'); setSelectedExams(new Set()); }} />
                <span>Single Exam</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={examMode === 'multiple'} onChange={() => { setExamMode('multiple'); setSelectedExam(''); }} />
                <span>Multiple Exams (Combine)</span>
              </label>
            </div>

            {examMode === 'single' ? (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Examination</label>
                <select
                  value={selectedExam}
                  onChange={(e) => setSelectedExam(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                >
                  <option value="">Select Examination</option>
                  {examsForClass.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.exam_name} {exam.academic_year ? `(${exam.academic_year})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <div className="flex justify-between border-b pb-2 mb-2">
                  <button onClick={selectAllExams} className="text-sm font-medium text-[#1e3a8a] hover:underline">
                    {selectedExams.size === examsForClass.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-sm text-gray-500">{selectedExams.size} of {examsForClass.length} selected</span>
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                  {examsForClass.map((exam) => (
                    <label key={exam.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                      {selectedExams.has(exam.id) ? <CheckSquare size={22} className="text-[#1e3a8a]" /> : <Square size={22} className="text-gray-400" />}
                      <span>{exam.exam_name} {exam.academic_year ? `(${exam.academic_year})` : ''}</span>
                      <input type="checkbox" checked={selectedExams.has(exam.id)} onChange={() => toggleExam(exam.id)} className="sr-only" />
                    </label>
                  ))}
                  {examsForClass.length === 0 && <div className="p-4 text-gray-500 text-center">No exams for this class/section</div>}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                Next: Select Template
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Step 3: Select Template</h2>
            <p className="text-sm text-gray-600">Choose a report card template. Customize in Report Card → Customize Template.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`block p-4 border-2 rounded-lg cursor-pointer ${selectedTemplateId === '' ? 'border-[#1e3a8a] bg-blue-50' : 'border-gray-200'}`}>
                <input type="radio" name="template" checked={selectedTemplateId === ''} onChange={() => setSelectedTemplateId('')} className="sr-only" />
                <div className="font-semibold">Default (School Template)</div>
                <div className="text-sm text-gray-500">Uses school&apos;s configured template or Standard CBSE</div>
              </label>
              {templates.map((t) => (
                <label key={t.id} className={`block p-4 border-2 rounded-lg cursor-pointer ${selectedTemplateId === t.id ? 'border-[#1e3a8a] bg-blue-50' : 'border-gray-200'}`}>
                  <input type="radio" name="template" checked={selectedTemplateId === t.id} onChange={() => setSelectedTemplateId(t.id)} className="sr-only" />
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-gray-500">{t.description || ''}</div>
                </label>
              ))}
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
            <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
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
                    <span className="font-medium">{s.student_name}</span>
                    <span className="text-sm text-gray-500">({s.admission_no})</span>
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
