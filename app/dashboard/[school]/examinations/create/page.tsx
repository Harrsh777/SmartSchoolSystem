'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, ArrowRight, Check, Calendar, BookOpen, FileText, Save, Clock } from 'lucide-react';

type ScheduleTimeStep = 15 | 30 | 45;

function buildTimeSlotOptions(step: ScheduleTimeStep): string[] {
  const opts: string[] = [];
  for (let h = 0; h < 24; h++) {
    const minutes = step === 15 ? [0, 15, 30, 45] : step === 30 ? [0, 30] : [0, 45];
    for (const m of minutes) {
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
}

function formatTimeLabel(hhmm: string): string {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return hhmm || '—';
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function ScheduleTimeSelect({
  value,
  onChange,
  options,
  placeholder = 'Select time',
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const list = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5A7A95]/30 focus:border-[#5A7A95]/50 transition-colors hover:border-gray-400"
    >
      <option value="">{placeholder}</option>
      {list.map((t) => (
        <option key={t} value={t}>
          {formatTimeLabel(t)}
        </option>
      ))}
    </select>
  );
}

interface ClassData {
  id: string;
  class: string;
  section: string;
  academic_year?: string;
}

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface SelectedClass {
  classId: string;
  className: string;
  sections: string[];
}

interface MappedExamSubject {
  subject_id: string;
  subject_name: string;
  max_marks: number;
  pass_marks: number;
  /** When set, pass_marks is derived from max_marks × pass_percent (user can still use marks-only by leaving this empty). */
  pass_percent: number | null;
}

interface ClassSubject {
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjects: MappedExamSubject[];
}

function passMarksFromPercent(maxMarks: number, percent: number): number {
  if (!Number.isFinite(maxMarks) || maxMarks < 1) return 0;
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  const p = Math.min(100, Math.max(0, percent));
  const raw = Math.round((maxMarks * p) / 100);
  return Math.min(Math.max(0, raw), maxMarks - 1);
}

interface ExamSchedule {
  classId: string;
  sectionId: string;
  subjectId: string;
  exam_date: string;
  start_time: string;
  end_time: string;
}

interface TermOption {
  id: string;
  name: string;
  class_id: string;
  section: string;
  academic_year?: string;
  serial?: number;
  exams?: Array<{ id?: string; exam_name: string; serial?: number }>;
}
interface TermStructureOption {
  id: string;
  name: string;
}
interface StructureMapping {
  class_id: string;
  section: string;
}

function addDaysISO(base: string, offset: number): string {
  if (!base) return '';
  const d = new Date(base);
  if (Number.isNaN(d.getTime())) return base;
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export default function CreateExaminationPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [structures, setStructures] = useState<TermStructureOption[]>([]);
  const [selectedStructureId, setSelectedStructureId] = useState('');
  const [selectedTemplateExam, setSelectedTemplateExam] = useState('');
  const [structureMappings, setStructureMappings] = useState<StructureMapping[]>([]);

  // Step 1: Exam Metadata
  const [examMetadata, setExamMetadata] = useState({
    exam_name: '',
    academic_year: '',
    start_date: '',
    end_date: '',
    description: '',
  });

  // Step 2: Class Mapping
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<SelectedClass[]>([]);

  // Step 3: Subject Mapping — subjects allowed per class-section (from class_subjects)
  const [subjectsBySectionId, setSubjectsBySectionId] = useState<Record<string, Subject[]>>({});
  const [step3SubjectsLoading, setStep3SubjectsLoading] = useState(false);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);

  // Step 4: Schedule
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
  const [scheduleTimeStep, setScheduleTimeStep] = useState<ScheduleTimeStep>(15);
  const [bulkScheduleStart, setBulkScheduleStart] = useState('');
  const [bulkScheduleEnd, setBulkScheduleEnd] = useState('');

  const scheduleTimeOptions = useMemo(
    () => buildTimeSlotOptions(scheduleTimeStep),
    [scheduleTimeStep]
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  // createdExamId removed - not used
  // const [createdExamId, setCreatedExamId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const classesRes = await fetch(`/api/classes?school_code=${schoolCode}`);
      const classesData = await classesRes.json();

      if (classesRes.ok && classesData.data) {
        setClasses(classesData.data);
      }

      const sRes = await fetch(`/api/term-structures?school_code=${schoolCode}`);
      const sJson = await sRes.json();
      if (sRes.ok && Array.isArray(sJson.data)) {
        setStructures(sJson.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadStructureDetail = async () => {
      if (!selectedStructureId) {
        setTerms([]);
        setSelectedTermId('');
        setStructureMappings([]);
        setSelectedClasses([]);
        return;
      }
      const res = await fetch(
        `/api/term-structures/${selectedStructureId}?school_code=${encodeURIComponent(schoolCode)}`
      );
      const json = await res.json();
      const t = (json.data?.terms || []) as TermOption[];
      const mappings = (json.data?.mappings || []) as Array<{ class_id: string; section: string }>;
      setStructureMappings(mappings.map((m) => ({ class_id: String(m.class_id), section: String(m.section || '') })));
      setTerms(t);
      if (selectedTermId && !t.some((x) => x.id === selectedTermId)) setSelectedTermId('');

      // Auto-prepare mapped class/sections from structure mappings.
      const mappedRows = mappings
        .map((m) => classes.find((c) => String(c.id) === String(m.class_id) && String(c.section) === String(m.section || '')))
        .filter(Boolean) as ClassData[];
      const grouped = new Map<string, { className: string; sections: string[] }>();
      mappedRows.forEach((row) => {
        if (!grouped.has(row.class)) grouped.set(row.class, { className: row.class, sections: [] });
        const g = grouped.get(row.class)!;
        if (!g.sections.includes(String(row.id))) g.sections.push(String(row.id));
      });
      const autoSelected = Array.from(grouped.values()).map((g) => ({
        classId: g.sections[0] || '',
        className: g.className,
        sections: g.sections,
      }));
      setSelectedClasses(autoSelected);
    };
    loadStructureDetail();
  }, [selectedStructureId, schoolCode, selectedTermId, classes]);

  useEffect(() => {
    if (!selectedTermId) {
      setSelectedTemplateExam('');
      setExamMetadata((prev) => ({ ...prev, academic_year: '', exam_name: '' }));
      return;
    }
    const term = terms.find((t) => t.id === selectedTermId);
    if (!term) {
      setSelectedTemplateExam('');
      setExamMetadata((prev) => ({ ...prev, academic_year: '', exam_name: '' }));
      return;
    }
    const firstExam = term.exams && term.exams.length > 0 ? term.exams[0].exam_name : '';
    setSelectedTemplateExam(firstExam || '');
    setExamMetadata((prev) => ({
      ...prev,
      academic_year: String(term.academic_year || '').trim(),
      exam_name: String(firstExam || '').trim(),
    }));
  }, [selectedTermId, terms]);

  const sectionIdsForStep3 = useMemo(
    () => [...new Set(classSubjects.map((c) => c.sectionId))].sort(),
    [classSubjects]
  );
  const sectionIdsForStep3Key = sectionIdsForStep3.join(',');

  useEffect(() => {
    if (currentStep !== 3 || sectionIdsForStep3.length === 0) {
      return;
    }
    let cancelled = false;
    setStep3SubjectsLoading(true);
    Promise.all(
      sectionIdsForStep3.map(async (sectionId) => {
        const res = await fetch(
          `/api/timetable/subjects?school_code=${encodeURIComponent(schoolCode)}&class_id=${encodeURIComponent(sectionId)}`
        );
        const json = await res.json();
        if (!res.ok || !Array.isArray(json.data)) {
          return [sectionId, [] as Subject[]] as const;
        }
        return [sectionId, json.data as Subject[]] as const;
      })
    )
      .then((entries) => {
        if (!cancelled) {
          setSubjectsBySectionId(Object.fromEntries(entries));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setStep3SubjectsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentStep, schoolCode, sectionIdsForStep3Key]);

  // Step 1: Validate and Save Metadata
  const handleStep1Next = () => {
    const newErrors: Record<string, string> = {};
    
    if (!selectedStructureId) {
      newErrors.exam_name = 'Please select a term structure first';
    }
    if (!selectedTermId) {
      newErrors.exam_name = 'Please select a term';
    }
    if (!selectedTemplateExam || !examMetadata.exam_name.trim()) {
      newErrors.exam_name = 'Please select an examination template from Select Term flow';
    }
    if (!examMetadata.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    if (!examMetadata.end_date) {
      newErrors.end_date = 'End date is required';
    }
    if (examMetadata.start_date && examMetadata.end_date) {
      const start = new Date(examMetadata.start_date);
      const end = new Date(examMetadata.end_date);
      if (end < start) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      handleStep2Next();
    }
  };

  // Step 2: Class Selection
  const handleClassToggle = (classId: string, className: string) => {
    setSelectedClasses(prev => {
      const existing = prev.find(c => c.classId === classId);
      if (existing) {
        return prev.filter(c => c.classId !== classId);
      } else {
        // Get all sections for this class
        const classSections = classes
          .filter(c => c.id === classId)
          .map(c => ({ id: c.id, name: c.section }));
        
        return [...prev, {
          classId,
          className,
          sections: classSections.map(s => s.id),
        }];
      }
    });
  };

  const handleSectionToggle = (classId: string, sectionId: string) => {
    setSelectedClasses(prev => prev.map(c => {
      if (c.classId === classId) {
        const sections = c.sections.includes(sectionId)
          ? c.sections.filter(s => s !== sectionId)
          : [...c.sections, sectionId];
        return { ...c, sections };
      }
      return c;
    }));
  };

  const handleStep2Next = () => {
    if (selectedClasses.length === 0) {
      setErrors({ class_selection: 'No mapped class/section found in selected structure' });
      return;
    }
    
    // Initialize class subjects for step 3
    const newClassSubjects: ClassSubject[] = [];
    selectedClasses.forEach(selectedClass => {
      selectedClass.sections.forEach(sectionId => {
        const section = classes.find(c => c.id === sectionId);
        if (section) {
          newClassSubjects.push({
            classId: selectedClass.classId,
            className: selectedClass.className,
            sectionId: section.id,
            sectionName: section.section,
            subjects: [],
          });
        }
      });
    });
    setClassSubjects(newClassSubjects);
    setCurrentStep(3);
  };

  // Step 3: Subject Mapping
  const handleSubjectAdd = (classSubjectIndex: number, subjectId: string) => {
    setClassSubjects((prev) => {
      const cs = prev[classSubjectIndex];
      if (!cs) return prev;
      const pool = subjectsBySectionId[cs.sectionId] ?? [];
      const subject = pool.find((s) => s.id === subjectId);
      if (!subject) return prev;
      return prev.map((row, idx) => {
        if (idx !== classSubjectIndex) return row;
        if (row.subjects.some((s) => s.subject_id === subjectId)) return row;
        return {
          ...row,
          subjects: [
            ...row.subjects,
            {
              subject_id: subjectId,
              subject_name: subject.name,
              max_marks: 100,
              pass_marks: 33,
              pass_percent: null,
            },
          ],
        };
      });
    });
  };

  const handleSelectAllSubjects = (classSubjectIndex: number) => {
    setClassSubjects(prev => prev.map((cs, idx) => {
      if (idx === classSubjectIndex) {
        const pool = subjectsBySectionId[cs.sectionId] ?? [];
        const availableSubjects = pool.filter(
          (s) => !cs.subjects.find((existing) => existing.subject_id === s.id)
        );
        
        // Add all available subjects with default values
        const newSubjects = availableSubjects.map(subject => ({
          subject_id: subject.id,
          subject_name: subject.name,
          max_marks: 100,
          pass_marks: 33,
          pass_percent: null,
        }));
        
        return {
          ...cs,
          subjects: [...cs.subjects, ...newSubjects],
        };
      }
      return cs;
    }));
  };

  const handleSubjectRemove = (classSubjectIndex: number, subjectIndex: number) => {
    setClassSubjects(prev => prev.map((cs, idx) => {
      if (idx === classSubjectIndex) {
        return {
          ...cs,
          subjects: cs.subjects.filter((_, sIdx) => sIdx !== subjectIndex),
        };
      }
      return cs;
    }));
  };

  const handleSubjectChange = (
    classSubjectIndex: number,
    subjectIndex: number,
    field: 'max_marks' | 'pass_marks',
    value: number
  ) => {
    setClassSubjects((prev) =>
      prev.map((cs, idx) => {
        if (idx !== classSubjectIndex) return cs;
        return {
          ...cs,
          subjects: cs.subjects.map((s, sIdx) => {
            if (sIdx !== subjectIndex) return s;
            if (field === 'pass_marks') {
              return { ...s, pass_marks: value, pass_percent: null };
            }
            const max_marks = value;
            let pass_marks = s.pass_marks;
            if (s.pass_percent != null && s.pass_percent > 0) {
              pass_marks = passMarksFromPercent(max_marks, s.pass_percent);
            } else if (pass_marks >= max_marks) {
              pass_marks = Math.max(0, max_marks - 1);
            }
            return { ...s, max_marks, pass_marks };
          }),
        };
      })
    );
  };

  const handleSubjectPassPercentChange = (
    classSubjectIndex: number,
    subjectIndex: number,
    raw: string
  ) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      setClassSubjects((prev) =>
        prev.map((cs, idx) => {
          if (idx !== classSubjectIndex) return cs;
          return {
            ...cs,
            subjects: cs.subjects.map((s, sIdx) =>
              sIdx === subjectIndex ? { ...s, pass_percent: null } : s
            ),
          };
        })
      );
      return;
    }
    const pct = parseFloat(trimmed.replace(/,/g, '.'));
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return;
    setClassSubjects((prev) =>
      prev.map((cs, idx) => {
        if (idx !== classSubjectIndex) return cs;
        return {
          ...cs,
          subjects: cs.subjects.map((s, sIdx) => {
            if (sIdx !== subjectIndex) return s;
            return {
              ...s,
              pass_percent: pct,
              pass_marks: passMarksFromPercent(s.max_marks, pct),
            };
          }),
        };
      })
    );
  };

  const handleApplyPassPercentToAllInSection = (
    classSubjectIndex: number,
    pct: number | null | undefined
  ) => {
    const safePct = typeof pct === 'number' ? pct : NaN;
    if (!Number.isFinite(safePct) || safePct <= 0 || safePct > 100) {
      setErrors({
        marks: 'Enter a valid pass percentage in the first row (between 1 and 100) to apply to all subjects.',
      });
      return;
    }

    setErrors((e) => {
      const next = { ...e };
      delete next.marks;
      return next;
    });

    setClassSubjects((prev) =>
      prev.map((cs, idx) => {
        if (idx !== classSubjectIndex) return cs;
        return {
          ...cs,
          subjects: cs.subjects.map((s) => ({
            ...s,
            pass_percent: safePct,
            pass_marks: passMarksFromPercent(s.max_marks, safePct),
          })),
        };
      })
    );
  };

  /** Copy max marks and pass marks from the first subject row to all others in this class/section. */
  const handleApplyFirstRowMarksToAll = (classSubjectIndex: number) => {
    setClassSubjects(prev => prev.map((cs, idx) => {
      if (idx !== classSubjectIndex || cs.subjects.length < 2) return cs;
      const first = cs.subjects[0];
      return {
        ...cs,
        subjects: cs.subjects.map((s) => ({
          ...s,
          max_marks: first.max_marks,
          pass_marks:
            first.pass_percent != null && first.pass_percent > 0
              ? passMarksFromPercent(first.max_marks, first.pass_percent)
              : first.pass_marks,
          pass_percent: first.pass_percent,
        })),
      };
    }));
  };

  const handleStep3Next = () => {
    const unassignedClass = classSubjects.find(
      (cs) => (subjectsBySectionId[cs.sectionId]?.length ?? 0) === 0
    );
    if (unassignedClass) {
      setErrors({
        subjects: `No subjects assigned to Class ${unassignedClass.className} - Section ${unassignedClass.sectionName}. Map subjects to this class in Add/Modify Classes, then try again.`,
      });
      return;
    }

    const hasEmpty = classSubjects.some((cs) => cs.subjects.length === 0);
    if (hasEmpty) {
      setErrors({ subjects: 'All classes must have at least one subject mapped for this exam' });
      return;
    }

    // Validate max marks > pass marks
    const invalidMarks = classSubjects.some(cs =>
      cs.subjects.some(s => s.pass_marks >= s.max_marks)
    );
    if (invalidMarks) {
      setErrors({ marks: 'Pass marks must be less than max marks' });
      return;
    }

    // Initialize schedules for step 4
    const newSchedules: ExamSchedule[] = [];
    classSubjects.forEach(cs => {
      cs.subjects.forEach(subject => {
        newSchedules.push({
          classId: cs.classId,
          sectionId: cs.sectionId,
          subjectId: subject.subject_id,
          exam_date: '',
          start_time: '',
          end_time: '',
        });
      });
    });
    setExamSchedules(newSchedules);
    setCurrentStep(4);
  };

  // Step 4: Schedule
  const handleScheduleChange = (
    index: number,
    field: 'exam_date' | 'start_time' | 'end_time',
    value: string
  ) => {
    setExamSchedules(prev => prev.map((s, idx) => {
      if (idx === index) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const handleApplyTimesToAllSchedules = () => {
    const start = bulkScheduleStart.trim();
    const end = bulkScheduleEnd.trim();
    if (!start || !end) {
      setErrors({ schedule: 'Choose both start and end time before applying to all exams.' });
      return;
    }
    if (start >= end) {
      setErrors({ schedule: 'End time must be after start time.' });
      return;
    }
    setErrors((e) => {
      const next = { ...e };
      delete next.schedule;
      return next;
    });
    setExamSchedules((prev) => prev.map((s) => ({ ...s, start_time: start, end_time: end })));
  };

  const handleAutoFillSequentialDatesFromFirst = () => {
    if (!examSchedules.length) return;
    const first = examSchedules[0];
    if (!first.exam_date) {
      setErrors({ schedule: 'Pick a date on the first exam row before auto-filling the rest.' });
      return;
    }
    setErrors((e) => {
      const next = { ...e };
      delete next.schedule;
      return next;
    });
    setExamSchedules((prev) =>
      prev.map((s, idx) => ({
        ...s,
        exam_date: addDaysISO(first.exam_date, idx),
      }))
    );
  };

  const handleStep4Submit = async () => {
    // Validate all schedules
    const incomplete = examSchedules.some(s => !s.exam_date || !s.start_time || !s.end_time);
    if (incomplete) {
      setErrors({ schedule: 'Please complete all exam schedules' });
      return;
    }

    // Validate time
    const invalidTime = examSchedules.some(s => {
      if (!s.start_time || !s.end_time) return false;
      return s.start_time >= s.end_time;
    });
    if (invalidTime) {
      setErrors({ schedule: 'End time must be after start time' });
      return;
    }

    // Prevent overlapping schedules for same class-section and date.
    const byKey = new Map<string, Array<{ start: string; end: string }>>();
    for (const s of examSchedules) {
      const key = `${s.sectionId}|${s.exam_date}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push({ start: s.start_time, end: s.end_time });
    }
    for (const [, slots] of byKey) {
      const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].start < sorted[i - 1].end) {
          setErrors({ schedule: 'Schedule conflict: overlapping exam times found for same class-section/date' });
          return;
        }
      }
    }

    // Term is required for this flow.
    if (!selectedTermId) {
      setErrors({ schedule: 'Please select a term before creating examination' });
      return;
    }

    try {
      setSaving(true);
      setErrors({});

      // Get current user
      const currentUser = sessionStorage.getItem('staff');
      let createdBy = null;
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser);
          createdBy = userData.id;
        } catch {
          // Ignore
        }
      }

      // Create exam via API
      const response = await fetch('/api/examinations/v2/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          exam_name: examMetadata.exam_name,
          academic_year: examMetadata.academic_year,
          start_date: examMetadata.start_date,
          end_date: examMetadata.end_date,
          description: examMetadata.description || null,
          term_id: selectedTermId || null,
          class_mappings: selectedClasses,
          class_subjects: classSubjects.map((cs) => ({
            ...cs,
            subjects: cs.subjects.map((s) => ({
              subject_id: s.subject_id,
              subject_name: s.subject_name,
              max_marks: s.max_marks,
              pass_marks: s.pass_marks,
            })),
          })),
          schedules: examSchedules,
          created_by: createdBy,
        }),
      });

      // Be resilient: if API returns non-JSON (e.g. Next error page), show it instead of logging {}
      const raw = await response.text();
      let result: Record<string, unknown> = {};
      try {
        result = raw ? JSON.parse(raw) : {};
      } catch {
        result = { error: raw || `Request failed with status ${response.status}` };
      }

      if (response.ok && result.data) {
        const data = result.data as { class_mappings_count?: number; subject_mappings_count?: number; schedules_count?: number };
        console.log('Examination created:', result.data);
        alert(`Examination created successfully! Created ${data.class_mappings_count || 0} class mappings, ${data.subject_mappings_count || 0} subject mappings, and ${data.schedules_count || 0} schedules.`);
        router.push(`/dashboard/${schoolCode}/examinations/dashboard`);
      } else {
        const errorMessage = String(result.error ?? 'Failed to create examination');
        const errorDetails = result.details ? `\nDetails: ${String(result.details)}` : '';
        const errorHint = result.hint ? `\nHint: ${String(result.hint)}` : '';
        console.error('Examination creation failed:', result);
        alert(`${errorMessage}${errorDetails}${errorHint}`);
        setErrors({ submit: errorMessage });
      }
    } catch (error) {
      console.error('Error creating examination:', error);
      setErrors({ submit: 'Failed to create examination. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { number: 1, title: 'Exam Details', icon: FileText },
    { number: 3, title: 'Map Subjects', icon: BookOpen },
    { number: 4, title: 'Schedule Exams', icon: Calendar },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5A7A95] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#5A7A95] font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
       
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Examination</h1>
          <p className="text-gray-600">Follow the steps to create a new examination</p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;
            
            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-[#5A7A95] text-white'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={24} />
                    ) : (
                      <StepIcon size={24} />
                    )}
                  </div>
                  <p className={`mt-2 text-sm font-medium ${
                    isActive ? 'text-[#5A7A95]' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6">
            {/* Step 1: Exam Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Exam Details</h2>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <label className="block text-sm font-semibold text-slate-800 mb-1">
                    Select Term
                  </label>
                  <p className="text-xs text-slate-600 mb-3">
                    Structure → Term → Examination. Exam name is auto-filled from the selected examination.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-600">Step 1: Select Structure</p>
                      <select
                        value={selectedStructureId}
                        onChange={(e) => {
                          setSelectedStructureId(e.target.value);
                          setSelectedTermId('');
                          setSelectedTemplateExam('');
                          setExamMetadata((prev) => ({ ...prev, exam_name: '', academic_year: '' }));
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="">Choose term structure</option>
                        {structures.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-600">Step 2: Select Term</p>
                      <select
                        value={selectedTermId}
                        onChange={(e) => {
                          setSelectedTermId(e.target.value);
                          setSelectedTemplateExam('');
                          setExamMetadata((prev) => ({ ...prev, exam_name: '' }));
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                        disabled={!selectedStructureId}
                      >
                        <option value="">
                          {selectedStructureId ? 'Choose term' : 'Select structure first'}
                        </option>
                        {terms.map((term) => (
                          <option key={term.id} value={term.id}>
                            {term.serial ? `${term.serial}. ` : ''}
                            {term.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-600">Step 3: Select Examination</p>
                      <select
                        value={selectedTemplateExam}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSelectedTemplateExam(v);
                          if (v) setExamMetadata((prev) => ({ ...prev, exam_name: v }));
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                        disabled={!selectedTermId}
                      >
                        <option value="">
                          {selectedTermId ? 'Choose examination template' : 'Select term first'}
                        </option>
                        {(terms.find((t) => t.id === selectedTermId)?.exams || []).map((ex, idx) => (
                          <option key={`${ex.exam_name}-${idx}`} value={ex.exam_name}>
                            {ex.serial ? `${ex.serial}. ` : ''}
                            {ex.exam_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {examMetadata.academic_year ? (
                    <p className="mt-3 text-xs text-slate-500">
                      Academic Year: <span className="font-medium text-slate-700">{examMetadata.academic_year}</span> (auto from selected term)
                    </p>
                  ) : null}
                </div>

                {errors.exam_name && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                    <p className="text-sm text-red-700">{errors.exam_name}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={examMetadata.start_date}
                      onChange={(e) => setExamMetadata(prev => ({ ...prev, start_date: e.target.value }))}
                      className={errors.start_date ? 'border-red-500' : ''}
                    />
                    {errors.start_date && (
                      <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={examMetadata.end_date}
                      onChange={(e) => setExamMetadata(prev => ({ ...prev, end_date: e.target.value }))}
                      className={errors.end_date ? 'border-red-500' : ''}
                    />
                    {errors.end_date && (
                      <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={examMetadata.description}
                    onChange={(e) => setExamMetadata(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Add any additional information about this examination"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A95] focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleStep1Next}>
                    Next: Map Subjects
                   
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Map Classes */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Classes & Sections</h2>
                
                {errors.class_selection && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">{errors.class_selection}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {Array.from(new Set(classes.map(c => c.class))).map(className => {
                    const classItems = classes.filter(c => c.class === className);
                    const selectedClass = selectedClasses.find(sc => sc.className === className);
                    
                    return (
                      <div key={className} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!selectedClass}
                              onChange={() => handleClassToggle(
                                classItems[0].id,
                                className
                              )}
                              className="w-5 h-5 text-[#5A7A95] rounded focus:ring-[#5A7A95]"
                            />
                            <span className="text-lg font-semibold text-gray-900">
                              Class {className}
                            </span>
                          </label>
                        </div>
                        
                        {selectedClass && (
                          <div className="ml-7 mt-3 space-y-2">
                            <p className="text-sm text-gray-600 mb-2">Select Sections:</p>
                            <div className="flex flex-wrap gap-2">
                              {classItems.map(section => (
                                <label
                                  key={section.id}
                                  className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedClass.sections.includes(section.id)}
                                    onChange={() => handleSectionToggle(selectedClass.classId, section.id)}
                                    className="w-4 h-4 text-[#5A7A95] rounded focus:ring-[#5A7A95]"
                                  />
                                  <span className="text-sm text-gray-700">Section {section.section}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft size={18} className="mr-2" />
                    Previous
                  </Button>
                  <Button onClick={handleStep2Next}>
                    Next: Map Subjects
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Map Subjects */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Map Subjects & Marks</h2>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  Set <span className="font-medium text-gray-800">max marks</span> for each subject. For passing criteria,
                  either enter <span className="font-medium text-gray-800">pass marks</span> directly, or use an optional{' '}
                  <span className="font-medium text-gray-800">pass %</span> — pass marks are calculated as a rounded
                  percentage of max marks (capped below max). Clear the % field to edit pass marks manually. Use{' '}
                  <span className="font-medium text-gray-800">Apply to all</span> to set one percentage for every subject
                  in that class-section (each subject still uses its own max).
                </p>
                
                {(errors.subjects || errors.marks) && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">{errors.subjects || errors.marks}</p>
                  </div>
                )}

                {step3SubjectsLoading && (
                  <div className="flex items-center gap-3 text-[#5A7A95]">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#5A7A95] border-t-transparent" />
                    <span className="text-sm font-medium">Loading subjects for your classes…</span>
                  </div>
                )}

                <div className="space-y-6">
                  {classSubjects.map((cs, csIndex) => {
                    const pool = subjectsBySectionId[cs.sectionId] ?? [];
                    const notYetAdded = pool.filter((s) => !cs.subjects.find((sub) => sub.subject_id === s.id));
                    const hasClassSubjects = pool.length > 0;

                    return (
                    <div key={`${cs.classId}-${cs.sectionId}`} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Class {cs.className} - Section {cs.sectionName}
                      </h3>
                      
                      <div className="mb-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Add Subject
                          </label>
                          <div className="flex flex-wrap items-center gap-2">
                            {cs.subjects.length >= 2 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleApplyFirstRowMarksToAll(csIndex)}
                                className="text-xs"
                                title="Copy max marks, pass marks, and pass % from the first row to all subjects below"
                              >
                                Same for everyone
                              </Button>
                            )}
                            {hasClassSubjects && notYetAdded.length > 0 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleSelectAllSubjects(csIndex)}
                                className="text-xs"
                              >
                                Select All Subjects
                              </Button>
                            )}
                          </div>
                        </div>
                        {!step3SubjectsLoading && !hasClassSubjects && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            <p className="font-medium">No subjects assigned to this class</p>
                            <p className="mt-1 text-amber-800/90">
                              Map subjects to Class {cs.className} — Section {cs.sectionName} under{' '}
                              <span className="font-medium">Add/Modify Classes</span> before you can include them in this examination.
                            </p>
                          </div>
                        )}
                        <select
                          disabled={step3SubjectsLoading || !hasClassSubjects || notYetAdded.length === 0}
                          onChange={(e) => {
                            if (e.target.value) {
                              handleSubjectAdd(csIndex, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A95] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                        >
                          <option value="">
                            {step3SubjectsLoading
                              ? 'Loading…'
                              : !hasClassSubjects
                                ? 'No subjects assigned to this class'
                                : notYetAdded.length === 0
                                  ? 'All assigned subjects added'
                                  : 'Select a subject...'}
                          </option>
                          {notYetAdded.map((subject) => (
                            <option key={subject.id} value={subject.id}>
                              {subject.name}
                            </option>
                          ))}
                        </select>
                        {hasClassSubjects && notYetAdded.length === 0 && cs.subjects.length > 0 && (
                          <p className="mt-2 text-sm text-gray-500">All subjects assigned to this class have been added</p>
                        )}
                      </div>

                      {cs.subjects.length > 0 && (
                        <div className="space-y-3">
                          {cs.subjects.map((subject, sIndex) => (
                            <div
                              key={subject.subject_id}
                              className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-medium text-gray-900">{subject.subject_name}</span>
                                <button
                                  onClick={() => handleSubjectRemove(csIndex, sIndex)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Max marks</label>
                                  <Input
                                    type="number"
                                    value={subject.max_marks}
                                    onChange={(e) =>
                                      handleSubjectChange(
                                        csIndex,
                                        sIndex,
                                        'max_marks',
                                        parseInt(e.target.value, 10) || 0
                                      )
                                    }
                                    min={1}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">
                                    Pass % <span className="text-gray-400 font-normal">(optional)</span>
                                  </label>
                                  <div className="flex flex-wrap items-end gap-2">
                                    <Input
                                      type="number"
                                      placeholder="— use pass marks"
                                      min={0}
                                      max={100}
                                      step={0.5}
                                      value={subject.pass_percent ?? ''}
                                      onChange={(e) =>
                                        handleSubjectPassPercentChange(csIndex, sIndex, e.target.value)
                                      }
                                      className="max-w-[120px]"
                                    />
                                    {cs.subjects.length >= 2 && sIndex === 0 && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                        disabled={!subject.pass_percent || subject.pass_percent <= 0}
                                        onClick={() =>
                                          handleApplyPassPercentToAllInSection(csIndex, subject.pass_percent)
                                        }
                                        title="Copy pass % from this first subject to all other subjects in this class-section"
                                      >
                                        Apply to all
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">
                                    Pass marks
                                    {subject.pass_percent != null && subject.pass_percent > 0 ? (
                                      <span className="text-gray-400 font-normal"> (from %)</span>
                                    ) : null}
                                  </label>
                                  <Input
                                    type="number"
                                    readOnly={subject.pass_percent != null && subject.pass_percent > 0}
                                    className={
                                      subject.pass_percent != null && subject.pass_percent > 0
                                        ? 'bg-gray-100 cursor-not-allowed'
                                        : ''
                                    }
                                    value={subject.pass_marks}
                                    onChange={(e) =>
                                      handleSubjectChange(
                                        csIndex,
                                        sIndex,
                                        'pass_marks',
                                        parseInt(e.target.value, 10) || 0
                                      )
                                    }
                                    min={0}
                                    max={Math.max(0, subject.max_marks - 1)}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft size={18} className="mr-2" />
                    Previous
                  </Button>
                  <Button onClick={handleStep3Next} disabled={step3SubjectsLoading}>
                    Next: Schedule Exams
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Schedule */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Schedule Examinations</h2>
                    <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                      Times use the slot interval you pick (every 15, 30, or 45 minutes). Use{' '}
                      <span className="font-medium text-gray-800">Apply to all</span> when every paper shares the same
                      slot, then adjust individual rows if needed.
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#5A7A95]/10 text-[#5A7A95]">
                      <Clock className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Time slot interval</p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Dropdown lists only these minute marks within each hour.
                        </p>
                        <div className="mt-3 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                          {([15, 30, 45] as const).map((step) => (
                            <button
                              key={step}
                              type="button"
                              onClick={() => setScheduleTimeStep(step)}
                              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                                scheduleTimeStep === step
                                  ? 'bg-[#5A7A95] text-white shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              Every {step} min
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="h-px bg-slate-200" />

                      <div>
                        <p className="text-sm font-semibold text-slate-800 mb-3">Apply same times to every exam</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                          <div className="sm:col-span-1 lg:col-span-3">
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Start time</label>
                            <ScheduleTimeSelect
                              value={bulkScheduleStart}
                              onChange={setBulkScheduleStart}
                              options={scheduleTimeOptions}
                              placeholder="Start"
                            />
                          </div>
                          <div className="sm:col-span-1 lg:col-span-3">
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">End time</label>
                            <ScheduleTimeSelect
                              value={bulkScheduleEnd}
                              onChange={setBulkScheduleEnd}
                              options={scheduleTimeOptions}
                              placeholder="End"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-2 lg:col-span-6">
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleApplyTimesToAllSchedules}
                              className="shrink-0 px-3 py-1 text-xs"
                            >
                              Apply to all rows
                            </Button>
                          
                            {examSchedules.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAutoFillSequentialDatesFromFirst}
                                className="shrink-0 px-3 py-1 text-xs"
                                title="Starting from the first exam date, fill each subsequent exam with the next calendar date"
                              >
                                Fill sequential dates
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {errors.schedule && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">{errors.schedule}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {examSchedules.map((schedule, index) => {
                    const classSubject = classSubjects.find(
                      cs => cs.classId === schedule.classId && cs.sectionId === schedule.sectionId
                    );
                    const subject = classSubject?.subjects.find(s => s.subject_id === schedule.subjectId);
                    const prev = examSchedules[index - 1];
                    const showSectionDivider =
                      index > 0 && (prev.sectionId !== schedule.sectionId || prev.classId !== schedule.classId);

                    return (
                      <div key={index} className="space-y-2">
                        {showSectionDivider && (
                          <div className="flex items-center gap-3 pt-2">
                            <div className="h-px flex-1 bg-slate-200" />
                            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                              {classSubject?.className} · Section {classSubject?.sectionName}
                            </span>
                            <div className="h-px flex-1 bg-slate-200" />
                          </div>
                        )}
                        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          {/* Left: subject + class */}
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-[#5A7A95]/10 text-[#5A7A95] flex items-center justify-center flex-shrink-0">
                              <BookOpen className="h-5 w-5" aria-hidden />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {subject?.subject_name || 'Subject'}
                              </p>
                              <p className="text-xs text-slate-500">
                                Class {classSubject?.className} · Section {classSubject?.sectionName}
                              </p>
                            </div>
                          </div>

                          {/* Right: date + time */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full md:max-w-xl">
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-medium text-slate-500 tracking-wide">
                                EXAM DATE
                              </span>
                              <div className="relative">
                                <Input
                                  type="date"
                                  value={schedule.exam_date}
                                  onChange={(e) => handleScheduleChange(index, 'exam_date', e.target.value)}
                                  className="pl-3 pr-9 text-sm rounded-lg border-slate-200 focus:border-[#5A7A95] focus:ring-[#5A7A95]/20"
                                />
                                <Calendar className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-medium text-slate-500 tracking-wide">
                                START TIME
                              </span>
                              <div className="relative">
                                <ScheduleTimeSelect
                                  value={schedule.start_time}
                                  onChange={(v) => handleScheduleChange(index, 'start_time', v)}
                                  options={scheduleTimeOptions}
                                  placeholder="Start"
                                />
                                <Clock className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-medium text-slate-500 tracking-wide">
                                END TIME
                              </span>
                              <div className="relative">
                                <ScheduleTimeSelect
                                  value={schedule.end_time}
                                  onChange={(v) => handleScheduleChange(index, 'end_time', v)}
                                  options={scheduleTimeOptions}
                                  placeholder="End"
                                />
                                <Clock className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setCurrentStep(3)}>
                    <ArrowLeft size={18} className="mr-2" />
                    Previous
                  </Button>
                  <Button onClick={handleStep4Submit} disabled={saving}>
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save size={18} className="mr-2" />
                        Create Examination
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
