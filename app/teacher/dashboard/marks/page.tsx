'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { FileText, Save, AlertCircle, GraduationCap } from 'lucide-react';
import { dedupeExamSubjectMappings } from '@/lib/exam-subject-mappings';

interface Student {
  id: string;
  admission_no: string;
  student_name: string;
  roll_number?: string;
  class: string;
  section: string;
}

interface ExamSubject {
  mapping_id?: string | null;
  subject_id: string;
  subject_name: string;
  max_marks: number;
  pass_marks: number;
  weightage: number;
}

interface StudentMark {
  student_id: string;
  marks: Record<string, {
    marks_obtained: number;
    absent: boolean;
  }>;
}

type AccessMode = 'class_teacher' | 'subject_teacher';

type ClassPickOption = {
  value: string;
  classId: string;
  mode: AccessMode;
  label: string;
  group: 'class_teacher' | 'subject_teacher';
};

interface Exam {
  id: string;
  exam_name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  status: string;
  class_mappings?: Array<{
    class_id: string;
    class: {
      id: string;
      class: string;
      section: string;
    };
  }>;
  subject_mappings?: Array<{
    id?: string;
    class_id: string;
    subject_id: string;
    subject: {
      id: string;
      name: string;
    };
    max_marks: number;
    pass_marks: number;
  }>;
}

type TeachingAssignment = {
  class_id: string;
  class_name: string;
  section: string;
  subject_ids: string[];
};

export default function MarksEntryPage() {
  const searchParams = useSearchParams();
  const examIdFromUrl = searchParams.get('exam_id');
  const [teacher, setTeacher] = useState<Record<string, unknown> | null>(null);
  const [schoolCode, setSchoolCode] = useState('');
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [studentMarks, setStudentMarks] = useState<StudentMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [columnLastEditor, setColumnLastEditor] = useState<
    Record<string, { full_name: string; staff_id: string; at: string }>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [urlExamApplied, setUrlExamApplied] = useState(false);
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([]);
  const [classTeacherClassIds, setClassTeacherClassIds] = useState<Set<string>>(new Set());
  const [accessMode, setAccessMode] = useState<AccessMode | null>(null);
  const [classPickOptions, setClassPickOptions] = useState<ClassPickOption[]>([]);
  const [selectedClassKey, setSelectedClassKey] = useState('');
  const [selectedClassSectionLabel, setSelectedClassSectionLabel] = useState('');
  const [classPickMessage, setClassPickMessage] = useState<string | null>(null);
  /** One subject at a time in the grid; set after class load (auto if only one subject). */
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [marksLastUpdatedBySubject, setMarksLastUpdatedBySubject] = useState<Record<string, string>>({});

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      setSchoolCode(teacherData.school_code);
      fetchExams(teacherData.school_code, teacherData);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchExams = async (schoolCode: string, teacherInfo: Record<string, unknown>) => {
    try {
      setLoading(true);
      setTeachingAssignments([]);
      setClassTeacherClassIds(new Set());

      const queryParams = new URLSearchParams({
        school_code: schoolCode,
      });
      
      if (teacherInfo.id) {
        queryParams.append('teacher_id', teacherInfo.id as string);
      }
      if (teacherInfo.staff_id) {
        queryParams.append('staff_id', teacherInfo.staff_id as string);
      }
      
      const response = await fetch(`/api/examinations/v2/teacher?${queryParams.toString()}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        const assignments = (result.teaching_assignments || []) as TeachingAssignment[];
        setTeachingAssignments(assignments);
        setClassTeacherClassIds(new Set((result.class_teacher_class_ids || []) as string[]));
        // Same status filter as /teacher/dashboard/examinations — do not hide exams that are past end_date
        // (status may still be "upcoming", or teachers enter marks after the window).
        const markableExams = (result.data as Exam[]).filter((exam) => {
          const s = String(exam.status || '').toLowerCase();
          return (
            s === 'upcoming' ||
            s === 'ongoing' ||
            s === 'active' ||
            s === 'completed'
          );
        });
        setExams(markableExams);
      } else {
        setError(result.error || 'Failed to fetch examinations');
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      setError('Failed to load examinations');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherClassRowIds = async (): Promise<string[]> => {
    if (!teacher) return [];
    try {
      const queryParams = new URLSearchParams({
        school_code: schoolCode,
        array: 'true',
      });
      if (teacher.id) queryParams.append('teacher_id', teacher.id as string);
      if (teacher.staff_id) queryParams.append('staff_id', teacher.staff_id as string);
      const response = await fetch(`/api/classes/teacher?${queryParams.toString()}`);
      const result = await response.json();
      if (!response.ok || !result.data) return [];
      const classesData = Array.isArray(result.data) ? result.data : [result.data];
      return classesData.filter(Boolean).map((c: { id: string }) => c.id);
    } catch (error) {
      console.error('Error fetching teacher classes:', error);
      return [];
    }
  };

  const parseClassPickValue = (value: string): { mode: AccessMode; classId: string } | null => {
    if (!value.includes(':')) return null;
    const i = value.indexOf(':');
    const modeRaw = value.slice(0, i);
    const classId = value.slice(i + 1);
    if (modeRaw === 'class_teacher') return { mode: 'class_teacher', classId };
    if (modeRaw === 'subject_teacher') return { mode: 'subject_teacher', classId };
    return null;
  };

  const handleExamSelect = async (exam: Exam) => {
    setSelectedExam(exam);
    setSelectedClass('');
    setSelectedClassKey('');
    setAccessMode(null);
    setStudents([]);
    setSubjects([]);
    setStudentMarks([]);
    setColumnLastEditor({});
    setClassPickMessage(null);
    setClassPickOptions([]);
    setSelectedClassSectionLabel('');
    setSelectedSubjectId('');
    setMarksLastUpdatedBySubject({});

    const examClassIds = (exam.class_mappings || [])
      .map((cm) => String(cm.class_id))
      .filter(Boolean);

    if (examClassIds.length === 0) {
      setClassPickMessage('This examination has no class sections mapped.');
      return;
    }
    const effectiveCtSet = new Set(classTeacherClassIds);

    // Get unique class IDs from timetable assignments that match exam classes
    const timetableClassIds = Array.from(
      new Set(
        teachingAssignments
          .filter((ta) => examClassIds.includes(ta.class_id))
          .map((ta) => ta.class_id)
      )
    );
    let ctInExam = examClassIds.filter((id) => effectiveCtSet.has(id));
    let stOnlyInExam = timetableClassIds.filter((id) => !effectiveCtSet.has(id));

    if (ctInExam.length === 0 && stOnlyInExam.length === 0) {
      const fetchedCt = await fetchTeacherClassRowIds();
      fetchedCt.forEach((id) => effectiveCtSet.add(id));
      ctInExam = examClassIds.filter((id) => effectiveCtSet.has(id));
      stOnlyInExam = timetableClassIds.filter((id) => !effectiveCtSet.has(id));
    }

    const allowedUnion = [...new Set([...ctInExam, ...stOnlyInExam])];

    if (allowedUnion.length === 0) {
      setClassPickMessage(
        'No class on this exam matches your timetable or class-teacher assignment. Contact the admin if this is wrong.'
      );
      return;
    }

    const cmById = new Map((exam.class_mappings || []).map((cm) => [cm.class_id, cm]));
    const labelFor = (cid: string) => {
      const cm = cmById.get(cid);
      return cm ? `${cm.class?.class}-${cm.class?.section}` : cid;
    };

    const options: ClassPickOption[] = [];
    for (const cid of ctInExam) {
      options.push({
        value: `class_teacher:${cid}`,
        classId: cid,
        mode: 'class_teacher',
        group: 'class_teacher',
        label: `${labelFor(cid)} — class teacher (all subjects)`,
      });
    }
    for (const cid of stOnlyInExam) {
      options.push({
        value: `subject_teacher:${cid}`,
        classId: cid,
        mode: 'subject_teacher',
        group: 'subject_teacher',
        label: `${labelFor(cid)} — subject teacher (your subjects only)`,
      });
    }
    setClassPickOptions(options);

    if (allowedUnion.length === 1) {
      const onlyId = allowedUnion[0];
      const mode: AccessMode = ctInExam.includes(onlyId) ? 'class_teacher' : 'subject_teacher';
      setSelectedClassKey(mode === 'class_teacher' ? `class_teacher:${onlyId}` : `subject_teacher:${onlyId}`);
      await handleClassSelect(exam, onlyId, mode);
      return;
    }

    setClassPickMessage(
      ctInExam.length > 0 && stOnlyInExam.length > 0
        ? 'Choose a class: class-teacher sections have full subject access; other sections are limited to your timetable subjects.'
        : 'Select the class section you are entering marks for.'
    );
  };

  // When opened with ?exam_id=..., auto-select that exam once exams are loaded
  useEffect(() => {
    if (!examIdFromUrl || exams.length === 0 || urlExamApplied) return;
    const exam = exams.find((e) => e.id === examIdFromUrl);
    if (exam) {
      handleExamSelect(exam);
      setUrlExamApplied(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply URL exam once when list loads
  }, [exams, examIdFromUrl, urlExamApplied]);

  const mapRowsToExamSubjects = (rows: Record<string, unknown>[]): ExamSubject[] =>
    dedupeExamSubjectMappings(rows).map((sm: Record<string, unknown>) => ({
      mapping_id: sm.id != null ? String(sm.id) : null,
      subject_id: sm.subject_id as string,
      subject_name: (sm.subject as { name?: string })?.name || 'Unknown',
      max_marks: Number(sm.max_marks || 100),
      pass_marks: Number(sm.pass_marks || 33),
      weightage: Number(sm.weightage || 0),
    }));

  const handleClassSelect = async (exam: Exam, classId: string, mode: AccessMode) => {
    setSelectedClass(classId);
    setAccessMode(mode);
    setSelectedClassSectionLabel('');
    setSelectedSubjectId('');
    setMarksLastUpdatedBySubject({});

    try {
      const classResponse = await fetch(`/api/classes?school_code=${schoolCode}&id=${classId}`);
      const classResult = await classResponse.json();

      if (!classResponse.ok || !classResult.data || classResult.data.length === 0) {
        alert('Class not found');
        return;
      }

      const classData = classResult.data[0];
      setSelectedClassSectionLabel(
        `${String(classData.class ?? '')} - ${String(classData.section ?? '')}`.trim() || '—'
      );

      const studentsResponse = await fetch(
        `/api/students?school_code=${schoolCode}&class=${classData.class}&section=${classData.section}&status=active`
      );
      const studentsResult = await studentsResponse.json();

      if (!studentsResponse.ok || !studentsResult.data) {
        setStudents([]);
        return;
      }

      setStudents(studentsResult.data);

      let examSubjects: ExamSubject[] = [];

      if (mode === 'class_teacher') {
        const mapParams = new URLSearchParams({
          school_code: schoolCode,
          class_id: classId,
        });
        const classMapRes = await fetch(
          `/api/examinations/${encodeURIComponent(exam.id)}/class-mappings?${mapParams.toString()}`
        );
        const classMapJson = await classMapRes.json();
        if (classMapRes.ok && Array.isArray(classMapJson.data) && classMapJson.data.length > 0) {
          examSubjects = mapRowsToExamSubjects(classMapJson.data as Record<string, unknown>[]);
        }
        if (examSubjects.length === 0) {
          const detailRes = await fetch(
            `/api/examinations/${encodeURIComponent(exam.id)}?school_code=${encodeURIComponent(schoolCode)}`
          );
          const detailJson = await detailRes.json();
          if (detailRes.ok && detailJson.data?.subject_mappings?.length) {
            const raw = detailJson.data.subject_mappings as Record<string, unknown>[];
            const forThisClass = raw.filter((sm) => {
              const smClassId = sm.class_id;
              if (smClassId == null || smClassId === '') return true;
              return String(smClassId) === String(classId);
            });
            const pool = forThisClass.length > 0 ? forThisClass : raw;
            examSubjects = mapRowsToExamSubjects(pool);
          }
        }
        if (examSubjects.length === 0) {
          const allMappings = exam.subject_mappings || [];
          const forThisClass = allMappings.filter((sm: Record<string, unknown>) => {
            const smClassId = sm.class_id;
            if (smClassId == null || smClassId === '') return true;
            return String(smClassId) === String(classId);
          });
          const mappingsToUse = dedupeExamSubjectMappings(
            (forThisClass.length > 0 ? forThisClass : allMappings) as Record<string, unknown>[]
          );
          examSubjects = mapRowsToExamSubjects(mappingsToUse as Record<string, unknown>[]);
        }
      } else {
        const allMappings = exam.subject_mappings || [];
        const forThisClass = allMappings.filter((sm: Record<string, unknown>) => {
          const smClassId = sm.class_id;
          if (smClassId == null || smClassId === '') return true;
          return String(smClassId) === String(classId);
        });
        const mappingsToUse = dedupeExamSubjectMappings(
          (forThisClass.length > 0 ? forThisClass : allMappings) as Record<string, unknown>[]
        );
        const ta = teachingAssignments.find((t) => t.class_id === classId);
        const allowed = new Set(ta?.subject_ids || []);
        const filtered = mappingsToUse.filter((sm) => allowed.has(String(sm.subject_id ?? '')));
        examSubjects = mapRowsToExamSubjects(filtered as Record<string, unknown>[]);
      }

      setSubjects(examSubjects);
      setSelectedSubjectId(examSubjects.length === 1 ? examSubjects[0].subject_id : '');
      await loadExistingMarks(exam.id, studentsResult.data.map((s: Student) => s.id));
    } catch (error) {
      console.error('Error fetching class data:', error);
      alert('Failed to load class data');
    }
  };

  const parseRowTime = (row: Record<string, unknown>): number => {
    const u = row.updated_at != null ? new Date(String(row.updated_at)).getTime() : NaN;
    const c = row.created_at != null ? new Date(String(row.created_at)).getTime() : NaN;
    return Math.max(!Number.isNaN(u) ? u : 0, !Number.isNaN(c) ? c : 0);
  };

  const normalizeEnteredByStaff = (
    raw: unknown
  ): { full_name: string; staff_id: string } | null => {
    if (!raw) return null;
    const row = Array.isArray(raw) ? raw[0] : raw;
    if (!row || typeof row !== 'object') return null;
    const o = row as Record<string, unknown>;
    const full_name = String(o.full_name ?? '').trim() || 'Unknown';
    const staff_id = String(o.staff_id ?? o.id ?? '').trim();
    return { full_name, staff_id };
  };

  const loadExistingMarks = async (examId: string, studentIds: string[]) => {
    try {
      type EditorAcc = { t: number; full_name: string; staff_id: string; at: string };
      const marksPromises = studentIds.map(async (studentId) => {
        const response = await fetch(
          `/api/examinations/marks?exam_id=${examId}&student_id=${studentId}`
        );
        const result = await response.json();

        const localSubjT: Record<string, number> = {};
        const localBest: Record<string, EditorAcc> = {};
        if (response.ok && result.data) {
          const rows = result.data as Record<string, unknown>[];
          for (const mark of rows) {
            const t = parseRowTime(mark);
            const subj = String(mark.subject_id ?? '');
            if (subj && t > 0) {
              localSubjT[subj] = Math.max(localSubjT[subj] ?? 0, t);
            }
            if (!subj) continue;
            const ed = normalizeEnteredByStaff(mark.entered_by_staff);
            const atIso = String(mark.updated_at ?? mark.created_at ?? '');
            if (ed && (!localBest[subj] || t > localBest[subj].t)) {
              localBest[subj] = {
                t,
                full_name: ed.full_name,
                staff_id: ed.staff_id,
                at: atIso,
              };
            }
          }
          const marks: Record<string, { marks_obtained: number; absent: boolean }> = {};
          rows.forEach((mark) => {
            marks[mark.subject_id as string] = {
              marks_obtained: Number(mark.marks_obtained) || 0,
              absent: Boolean(mark.absent) || (String(mark.remarks) === 'Absent'),
            };
          });
          return {
            student_id: studentId,
            marks,
            localSubjT,
            localBest,
          };
        }
        return {
          student_id: studentId,
          marks: {},
          localSubjT: {},
          localBest: {},
        };
      });

      const fetched = await Promise.all(marksPromises);
      const latestMsBySubject: Record<string, number> = {};
      const bestEditor: Record<string, EditorAcc> = {};

      for (const r of fetched) {
        for (const [k, v] of Object.entries(r.localSubjT)) {
          latestMsBySubject[k] = Math.max(latestMsBySubject[k] ?? 0, v);
        }
        for (const [subj, v] of Object.entries(r.localBest)) {
          if (!bestEditor[subj] || v.t > bestEditor[subj].t) bestEditor[subj] = v;
        }
      }

      const marksResults = fetched.map(({ student_id, marks }) => ({ student_id, marks }));
      setStudentMarks(marksResults);
      const bySub: Record<string, string> = {};
      for (const [sid, ms] of Object.entries(latestMsBySubject)) {
        if (ms > 0) bySub[sid] = new Date(ms).toISOString();
      }
      setMarksLastUpdatedBySubject(bySub);
      const colMap: Record<string, { full_name: string; staff_id: string; at: string }> = {};
      for (const [subj, v] of Object.entries(bestEditor)) {
        colMap[subj] = { full_name: v.full_name, staff_id: v.staff_id, at: v.at };
      }
      setColumnLastEditor(colMap);
    } catch (error) {
      console.error('Error loading existing marks:', error);
    }
  };

  const handleMarkChange = (studentId: string, subjectId: string, value: number) => {
    setStudentMarks(prev => {
      const updated = [...prev];
      const studentIndex = updated.findIndex(sm => sm.student_id === studentId);
      
      if (studentIndex >= 0) {
        updated[studentIndex] = {
          ...updated[studentIndex],
          marks: {
            ...updated[studentIndex].marks,
            [subjectId]: {
              marks_obtained: value,
              absent: false,
            },
          },
        };
      } else {
        updated.push({
          student_id: studentId,
          marks: {
            [subjectId]: {
              marks_obtained: value,
              absent: false,
            },
          },
        });
      }
      
      return updated;
    });
  };

  const handleAbsentToggle = (studentId: string, subjectId: string) => {
    setStudentMarks(prev => {
      const updated = [...prev];
      const studentIndex = updated.findIndex(sm => sm.student_id === studentId);
      
      if (studentIndex >= 0) {
        const currentMark = updated[studentIndex].marks[subjectId];
        updated[studentIndex] = {
          ...updated[studentIndex],
          marks: {
            ...updated[studentIndex].marks,
            [subjectId]: {
              marks_obtained: currentMark?.marks_obtained || 0,
              absent: !currentMark?.absent,
            },
          },
        };
      } else {
        updated.push({
          student_id: studentId,
          marks: {
            [subjectId]: {
              marks_obtained: 0,
              absent: true,
            },
          },
        });
      }
      
      return updated;
    });
  };

  const handleSaveMarks = async () => {
    if (!selectedExam || !selectedClass || !teacher) return;
    if (!selectedSubjectId) {
      alert('Please select a subject first.');
      return;
    }
    const subject = subjects.find((s) => s.subject_id === selectedSubjectId);
    if (!subject) {
      alert('Selected subject is not available for this class.');
      return;
    }

    try {
      setSaving(true);

      const savePromises = studentMarks.map(async (studentMark) => {
        const mark = studentMark.marks[subject.subject_id];
        const marksArray = [
          {
            subject_id: subject.subject_id,
            max_marks: subject.max_marks,
            marks_obtained: mark?.absent ? null : (mark?.marks_obtained || 0),
            remarks: mark?.absent ? 'Absent' : null,
          },
        ];
        
        const response = await fetch('/api/examinations/marks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_code: schoolCode,
            exam_id: selectedExam.id,
            student_id: studentMark.student_id,
            class_id: selectedClass,
            marks: marksArray,
            entered_by: teacher.id,
            teacher_marks_scoped: true,
          }),
        });
        
        return response.ok;
      });
      
      const outcomes = await Promise.all(savePromises);
      const allOk = outcomes.every(Boolean);
      if (allOk) {
        await loadExistingMarks(selectedExam.id, students.map((s) => s.id));
        alert('Marks saved successfully.');
      } else {
        alert('Some rows failed to save. Please try again.');
      }
    } catch (error) {
      console.error('Error saving marks:', error);
      alert('Failed to save marks. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(student => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      student.student_name.toLowerCase().includes(query) ||
      student.admission_no.toLowerCase().includes(query) ||
      (student.roll_number || '').toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-emerald-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <GraduationCap className="text-emerald-700 dark:text-emerald-400" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marks Entry</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Choose examination, class/section, and one subject, then enter marks for that subject only.
                Class teachers see all exam subjects for their section; subject teachers see timetable subjects only.
                Co-teachers can both edit — last editor is shown for the subject you are editing.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
              <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Examination
              </label>
              <select
                value={selectedExam?.id || ''}
                onChange={(e) => {
                  const exam = exams.find(ex => ex.id === e.target.value);
                  if (exam) handleExamSelect(exam);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={loading}
              >
                <option value="">-- Select Examination --</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.exam_name} ({exam.academic_year}) - {exam.status}
                  </option>
                ))}
              </select>
            </div>

            {classPickMessage && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                {classPickMessage}
              </div>
            )}

            {selectedExam && classPickOptions.length > 1 && !selectedClass && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select class &amp; access
                </label>
                <select
                  value={selectedClassKey}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedClassKey(v);
                    const parsed = parseClassPickValue(v);
                    if (selectedExam && parsed) {
                      void handleClassSelect(selectedExam, parsed.classId, parsed.mode);
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">-- Select class --</option>
                  {classPickOptions.some((o) => o.group === 'class_teacher') && (
                    <optgroup label="Class teacher (all subjects)">
                      {classPickOptions
                        .filter((o) => o.group === 'class_teacher')
                        .map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  {classPickOptions.some((o) => o.group === 'subject_teacher') && (
                    <optgroup label="Subject teacher (timetable subjects only)">
                      {classPickOptions
                        .filter((o) => o.group === 'subject_teacher')
                        .map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}

            {selectedExam && selectedClass && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="text-emerald-700 dark:text-emerald-400" size={20} />
                  <h3 className="font-semibold text-emerald-900 dark:text-emerald-300">{selectedExam.exam_name}</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div className="sm:col-span-2 lg:col-span-4">
                    <span className="text-gray-600 dark:text-gray-400">Class &amp; section:</span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                      {selectedClassSectionLabel || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Academic Year:</span>
                    <span className="ml-2 font-medium">{selectedExam.academic_year}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span
                      className={`ml-2 font-medium ${
                        selectedExam.status === 'ongoing'
                          ? 'text-yellow-600'
                          : selectedExam.status === 'completed'
                          ? 'text-emerald-700'
                          : 'text-emerald-600'
                      }`}
                    >
                      {selectedExam.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Subjects:</span>
                    <span className="ml-2 font-medium">{subjects.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Students:</span>
                    <span className="ml-2 font-medium">{students.length}</span>
                  </div>
                  {accessMode && (
                    <div className="sm:col-span-2 lg:col-span-4">
                      <span className="text-gray-600 dark:text-gray-400">Access:</span>
                      <span className="ml-2 font-medium text-emerald-800 dark:text-emerald-200">
                        {accessMode === 'class_teacher'
                          ? 'Class teacher — all subjects for this section'
                          : 'Subject teacher — your assigned subjects only'}
                      </span>
                    </div>
                  )}
                  {selectedSubjectId ? (
                    <div className="sm:col-span-2 lg:col-span-4">
                      <span className="text-gray-600 dark:text-gray-400">Max marks (this subject):</span>
                      <span className="ml-2 font-medium">
                        {subjects.find((s) => s.subject_id === selectedSubjectId)?.max_marks ?? '—'}
                      </span>
                    </div>
                  ) : subjects.length > 0 ? (
                    <div className="sm:col-span-2 lg:col-span-4 text-sm text-gray-600 dark:text-gray-400">
                      Select a subject below to enter marks (one subject at a time).
                    </div>
                  ) : null}
                  <div className="sm:col-span-2 lg:col-span-4 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/50 mt-1">
                    <span className="text-gray-600 dark:text-gray-400">Last saved (this subject):</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {selectedSubjectId && marksLastUpdatedBySubject[selectedSubjectId]
                        ? new Date(marksLastUpdatedBySubject[selectedSubjectId]).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </span>
                    <span className="block sm:inline sm:ml-2 text-xs text-gray-500 dark:text-gray-400 mt-1 sm:mt-0">
                      You can edit and save marks any time.
                    </span>
                  </div>
                </div>
                {subjects.length === 0 && students.length > 0 && (
                  <p className="mt-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded p-2">
                    No subjects configured for this exam and class. Ask admin to add subject mappings in Examination → Edit Exam.
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {selectedExam && selectedClass && students.length > 0 && subjects.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select subject
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Marks are entered for one subject at a time. Switch subject here to edit another.
              </p>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">-- Select subject --</option>
                {subjects.map((s) => (
                  <option key={s.subject_id} value={s.subject_id}>
                    {s.subject_name} (Max {s.max_marks})
                  </option>
                ))}
              </select>
            </Card>
          </motion.div>
        )}

        {selectedExam && selectedClass && students.length > 0 && selectedSubjectId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              {(() => {
                const subject = subjects.find((s) => s.subject_id === selectedSubjectId);
                if (!subject) {
                  return (
                    <p className="text-center text-amber-700 dark:text-amber-400 py-8 text-sm">
                      This subject is no longer in the list. Reselect class or subject.
                    </p>
                  );
                }
                const lastEd = columnLastEditor[subject.subject_id];
                const lastLine =
                  lastEd && (lastEd.full_name || lastEd.staff_id)
                    ? `Last edit: ${lastEd.full_name}${lastEd.staff_id ? ` (${lastEd.staff_id})` : ''}${
                        lastEd.at
                          ? ` · ${new Date(lastEd.at).toLocaleString(undefined, {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}`
                          : ''
                      }`
                    : null;
                return (
                  <>
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Students ({students.length}) — {subject.subject_name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Max marks: {subject.max_marks}
                          {lastLine ? ` · ${lastLine}` : ''}
                        </p>
                      </div>
                      <Input
                        type="text"
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full sm:w-64"
                      />
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                              Student ID
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                              Student Name
                            </th>
                            <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 align-top">
                              <div>{subject.subject_name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-normal">
                                (Max: {subject.max_marks})
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.map((student) => {
                            const studentMark = studentMarks.find((sm) => sm.student_id === student.id);
                            const mark = studentMark?.marks[subject.subject_id];
                            const marksObtained = mark?.marks_obtained || 0;
                            const isAbsent = mark?.absent || false;
                            const percentage =
                              subject.max_marks > 0 ? (marksObtained / subject.max_marks) * 100 : 0;

                            return (
                              <tr
                                key={student.id}
                                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                              >
                                <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                                  {student.admission_no}
                                </td>
                                <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                                  {student.student_name}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <Input
                                      type="number"
                                      value={isAbsent ? '' : marksObtained}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10) || 0;
                                        if (val >= 0 && val <= subject.max_marks) {
                                          handleMarkChange(student.id, subject.subject_id, val);
                                        }
                                      }}
                                      min={0}
                                      max={subject.max_marks}
                                      placeholder={isAbsent ? 'Abs' : '0'}
                                      className={`w-20 text-center ${
                                        percentage >= 40
                                          ? 'border-green-500'
                                          : percentage > 0
                                            ? 'border-yellow-500'
                                            : 'border-gray-300'
                                      }`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAbsentToggle(student.id, subject.subject_id)}
                                      className={`px-2 py-1 text-xs rounded ${
                                        isAbsent
                                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200'
                                      }`}
                                    >
                                      Abs
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {marksLastUpdatedBySubject[selectedSubjectId]
                          ? `Latest save for this subject: ${new Date(marksLastUpdatedBySubject[selectedSubjectId]).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}.`
                          : 'Enter marks and click Save to store them for this subject.'}
                      </p>
                      <Button
                        onClick={handleSaveMarks}
                        disabled={saving}
                        className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shrink-0"
                      >
                        <Save size={18} className="mr-2" />
                        {saving ? 'Saving...' : 'Save marks'}
                      </Button>
                    </div>
                  </>
                );
              })()}
            </Card>
          </motion.div>
        )}

        {selectedExam && selectedClass && students.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <GraduationCap className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={48} />
              <p className="text-gray-600 dark:text-gray-400">No students found in this class for this examination</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
