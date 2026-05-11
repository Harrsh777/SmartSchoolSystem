'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, CheckCircle, BookOpen, Search, AlertCircle } from 'lucide-react';

interface Student {
  id: string;
  admission_no: string;
  student_name: string;
  roll_number?: string;
  class: string;
  section: string;
}

interface ExamSubject {
  subject_id: string;
  subject_name: string;
  max_marks: number;
  pass_marks: number;
  weightage: number;
}

type MarkCell = {
  marks_obtained: number;
  absent: boolean;
  /** AB = absent, NA = not applicable, EXEMPT = exempt, ML = medical leave */
  entry_code: 'AB' | 'NA' | 'EXEMPT' | 'ML' | null;
  status?: 'draft' | 'submitted';
};

interface StudentMark {
  student_id: string;
  marks: Record<string, MarkCell>;
}

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
    class_id?: string;
    subject_id: string;
    subject: {
      id: string;
      name: string;
    };
    max_marks: number;
    pass_marks: number;
  }>;
}

interface TeachingAssignmentRow {
  class_id: string;
  class_name: string;
  section: string;
  subject_ids: string[];
  subjects?: Array<{ id: string; name: string }>;
}

export default function MarksEntryPage() {
  const searchParams = useSearchParams();
  const [teacher, setTeacher] = useState<Record<string, unknown> | null>(null);
  const [schoolCode, setSchoolCode] = useState('');
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [studentMarks, setStudentMarks] = useState<StudentMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locked, setLocked] = useState(false);
  const [teacherScope, setTeacherScope] = useState<string>('all');
  const [subjectIdsByClass, setSubjectIdsByClass] = useState<Record<string, string[]>>({});
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignmentRow[]>([]);
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  /** Avoid auto-save right after loading marks; enabled only after user edits a cell. */
  const userEditedMarksRef = useRef(false);

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      setSchoolCode(teacherData.school_code);
      
      // Check if exam_id is in URL params
      const examId = searchParams.get('exam_id');
      if (examId) {
        fetchExamById(teacherData.school_code, teacherData, examId);
      } else {
        fetchExams(teacherData.school_code, teacherData);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchExams = async (code: string, teacherRow: Record<string, unknown>) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({ school_code: code });
      if (teacherRow.id) queryParams.append('teacher_id', String(teacherRow.id));
      if (teacherRow.staff_id) queryParams.append('staff_id', String(teacherRow.staff_id));

      const response = await fetch(`/api/examinations/v2/teacher?${queryParams.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setTeacherScope(result.teacher_scope || 'all');
        setSubjectIdsByClass(result.subject_ids_by_class || {});
        setTeachingAssignments(result.teaching_assignments || []);
        const markableExams = (result.data as Exam[]).filter((exam: Exam) => {
          const s = String(exam.status || '').toLowerCase();
          return (
            s === 'upcoming' ||
            s === 'ongoing' ||
            s === 'active' ||
            s === 'completed'
          );
        });
        setExams(markableExams);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExamById = async (code: string, teacherRow: Record<string, unknown>, examId: string) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({ school_code: code });
      if (teacherRow.id) queryParams.append('teacher_id', String(teacherRow.id));
      if (teacherRow.staff_id) queryParams.append('staff_id', String(teacherRow.staff_id));

      const response = await fetch(`/api/examinations/v2/teacher?${queryParams.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setTeacherScope(result.teacher_scope || 'all');
        setSubjectIdsByClass(result.subject_ids_by_class || {});
        setTeachingAssignments(result.teaching_assignments || []);
        const exam = (result.data as Exam[]).find((e: Exam) => e.id === examId);
        if (exam) {
          await handleExamSelect(exam, teacherRow, result.teaching_assignments || []);
        }
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExamSelect = async (
    exam: Exam,
    teacherRow?: Record<string, unknown> | null,
    assignmentsOverride?: TeachingAssignmentRow[]
  ) => {
    setSelectedExam(exam);
    setSelectedClass('');
    setStudents([]);
    setSubjects([]);
    setStudentMarks([]);
    setLocked(false);
    userEditedMarksRef.current = false;

    const row = teacherRow ?? teacher;
    const assign = assignmentsOverride ?? teachingAssignments;
    const allowedClassIds = new Set(assign.length > 0 ? assign.map((t) => t.class_id) : []);

    if (exam.class_mappings && exam.class_mappings.length > 0) {
      const teacherClass = row ? await fetchTeacherClassFor(row) : null;
      if (teacherClass) {
        const matchingClass = exam.class_mappings.find(
          (cm) =>
            cm.class?.class === teacherClass.class &&
            cm.class?.section === teacherClass.section &&
            (allowedClassIds.size === 0 || allowedClassIds.has(cm.class_id))
        );
        if (matchingClass) {
          await handleClassSelect(exam, matchingClass.class_id);
          return;
        }
      }
    }
  };

  const fetchTeacherClassFor = async (teacherRow: Record<string, unknown>) => {
    try {
      const queryParams = new URLSearchParams({ school_code: schoolCode });
      if (teacherRow.id) queryParams.append('teacher_id', String(teacherRow.id));
      if (teacherRow.staff_id) queryParams.append('staff_id', String(teacherRow.staff_id));

      const response = await fetch(`/api/classes/teacher?${queryParams.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        const classesData = Array.isArray(result.data) ? result.data : [result.data];
        return classesData.length > 0 ? classesData[0] : null;
      }
    } catch (error) {
      console.error('Error fetching teacher class:', error);
    }
    return null;
  };

  const handleClassSelect = async (exam: Exam, classId: string) => {
    setSelectedClass(classId);
    
    try {
      // Get class details
      const classResponse = await fetch(`/api/classes?school_code=${schoolCode}&id=${classId}`);
      const classResult = await classResponse.json();
      
      if (!classResponse.ok || !classResult.data || classResult.data.length === 0) {
        alert('Class not found');
        return;
      }
      
      const classData = classResult.data[0];
      
      // Fetch students for this class
      const studentsResponse = await fetch(
        `/api/students?school_code=${schoolCode}&class=${classData.class}&section=${classData.section}&status=active`
      );
      const studentsResult = await studentsResponse.json();
      
      if (studentsResponse.ok && studentsResult.data) {
        setStudents(studentsResult.data);
        
        const mySubjectIds = subjectIdsByClass[classId];
        let forThisClass: Record<string, unknown>[] = [];
        if (teacherScope === 'timetable_empty') {
          forThisClass = [];
        } else if (Array.isArray(mySubjectIds) && mySubjectIds.length > 0) {
          forThisClass =
            exam.subject_mappings?.filter(
              (sm: Record<string, unknown>) =>
                sm.class_id === classId && mySubjectIds.includes(String(sm.subject_id))
            ) || [];
        } else {
          forThisClass =
            exam.subject_mappings?.filter((sm: Record<string, unknown>) => sm.class_id === classId) ||
            [];
        }

        const examSubjects: ExamSubject[] = forThisClass.map((sm: Record<string, unknown>) => ({
          subject_id: String(sm.subject_id ?? ''),
          subject_name: String((sm.subject as { name?: string })?.name ?? 'Unknown'),
          max_marks: Number(sm.max_marks ?? 100),
          pass_marks: Number(sm.pass_marks ?? 33),
          weightage: Number((sm as { weightage?: number }).weightage ?? 0),
        }));
        setSubjects(examSubjects);

        await loadExistingMarks(
          exam.id,
          studentsResult.data.map((s: Student) => s.id),
          examSubjects.map((s) => s.subject_id)
        );
      }
    } catch (error) {
      console.error('Error fetching class data:', error);
      alert('Failed to load class data');
    }
  };

  const parseEntryCode = (mark: Record<string, unknown>): MarkCell['entry_code'] => {
    const c = String(mark.marks_entry_code || '').toUpperCase();
    if (c === 'AB' || c === 'NA' || c === 'EXEMPT' || c === 'ML') return c;
    return null;
  };

  const loadExistingMarks = async (examId: string, studentIds: string[], teacherSubjectIds: string[]) => {
    userEditedMarksRef.current = false;
    try {
      const marksPromises = studentIds.map(async (studentId) => {
        const response = await fetch(
          `/api/examinations/marks?exam_id=${examId}&student_id=${studentId}`
        );
        const result = await response.json();

        if (response.ok && result.data) {
          const marks: Record<string, MarkCell> = {};
          (result.data as Record<string, unknown>[]).forEach((mark) => {
            const sid = String(mark.subject_id ?? '');
            if (!teacherSubjectIds.includes(sid)) return;
            const code = parseEntryCode(mark);
            const st = String(mark.status || 'draft') as 'draft' | 'submitted';
            marks[sid] = {
              marks_obtained: Number(mark.marks_obtained) || 0,
              absent: code === 'AB' || String(mark.remarks) === 'Absent',
              entry_code: code,
              status: st,
            };
          });
          return { student_id: studentId, marks };
        }
        return { student_id: studentId, marks: {} };
      });

      const marksResults = await Promise.all(marksPromises);
      setStudentMarks(marksResults);

      let allLocked = false;
      if (studentIds.length > 0 && teacherSubjectIds.length > 0) {
        allLocked = true;
        for (const sid of studentIds) {
          const row = marksResults.find((r) => r.student_id === sid);
          for (const subId of teacherSubjectIds) {
            const cell = row?.marks[subId];
            if (!cell || cell.status !== 'submitted') {
              allLocked = false;
              break;
            }
          }
          if (!allLocked) break;
        }
      }
      setLocked(allLocked);
    } catch (error) {
      console.error('Error loading existing marks:', error);
    }
  };

  const handleMarkChange = (studentId: string, subjectId: string, value: number) => {
    userEditedMarksRef.current = true;
    setStudentMarks((prev) => {
      const updated = [...prev];
      const studentIndex = updated.findIndex((sm) => sm.student_id === studentId);
      const cell: MarkCell = {
        marks_obtained: value,
        absent: false,
        entry_code: null,
        status: 'draft',
      };
      if (studentIndex >= 0) {
        updated[studentIndex] = {
          ...updated[studentIndex],
          marks: {
            ...updated[studentIndex].marks,
            [subjectId]: cell,
          },
        };
      } else {
        updated.push({
          student_id: studentId,
          marks: { [subjectId]: cell },
        });
      }
      return updated;
    });
  };

  const handleEntryKindChange = (
    studentId: string,
    subjectId: string,
    kind: 'numeric' | 'AB' | 'NA' | 'EXEMPT' | 'ML'
  ) => {
    userEditedMarksRef.current = true;
    setStudentMarks((prev) => {
      const updated = [...prev];
      const studentIndex = updated.findIndex((sm) => sm.student_id === studentId);
      const prevCell = studentIndex >= 0 ? updated[studentIndex].marks[subjectId] : undefined;
      const cell: MarkCell =
        kind === 'numeric'
          ? {
              marks_obtained: prevCell?.marks_obtained ?? 0,
              absent: false,
              entry_code: null,
              status: 'draft',
            }
          : {
              marks_obtained: 0,
              absent: kind === 'AB',
              entry_code: kind,
              status: 'draft',
            };
      if (studentIndex >= 0) {
        updated[studentIndex] = {
          ...updated[studentIndex],
          marks: { ...updated[studentIndex].marks, [subjectId]: cell },
        };
      } else {
        updated.push({ student_id: studentId, marks: { [subjectId]: cell } });
      }
      return updated;
    });
  };

  const buildBulkPayload = useCallback(() => {
    if (!subjects.length) return [];
    return studentMarks
      .map((studentMark) => {
        const submittedSubjects = subjects
          .map((subject) => {
            const cell = studentMark.marks[subject.subject_id];
            if (!cell) return null;
            const code = cell.entry_code;
            const hasNumeric = Number.isFinite(cell.marks_obtained) && cell.marks_obtained > 0;
            if (!code && !hasNumeric) return null;
            return {
              subject_id: subject.subject_id,
              max_marks: subject.max_marks,
              marks_obtained: code ? 0 : cell.marks_obtained,
              remarks:
                code === 'AB' || cell.absent
                  ? 'Absent'
                  : code === 'NA'
                    ? 'N/A'
                    : code === 'EXEMPT'
                      ? 'Exempt'
                      : code === 'ML'
                        ? 'Medical leave'
                        : null,
              marks_entry_code: code || undefined,
            };
          })
          .filter((row): row is NonNullable<typeof row> => Boolean(row));
        return {
          student_id: studentMark.student_id,
          subjects: submittedSubjects,
        };
      })
      .filter((row) => row.subjects.length > 0);
  }, [studentMarks, subjects]);

  const saveMarksBulk = useCallback(
    async (silent: boolean) => {
      if (!selectedExam || !selectedClass || !teacher?.id || !subjects.length) return false;
      try {
        if (!silent) setSaving(true);
        else setAutoSaveState('saving');
        const res = await fetch('/api/examinations/marks/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_code: schoolCode,
            exam_id: selectedExam.id,
            class_id: selectedClass,
            marks: buildBulkPayload(),
            entered_by: teacher.id,
            teacher_marks_scoped: true,
          }),
        });
        const ok = res.ok;
        if (!silent && ok) alert('Marks saved as draft successfully!');
        if (!silent && !ok) alert('Failed to save marks.');
        if (silent) setAutoSaveState(ok ? 'saved' : 'error');
        if (ok && silent) setTimeout(() => setAutoSaveState('idle'), 2000);
        return ok;
      } catch (e) {
        console.error(e);
        if (!silent) alert('Failed to save marks.');
        if (silent) setAutoSaveState('error');
        return false;
      } finally {
        if (!silent) setSaving(false);
      }
    },
    [buildBulkPayload, schoolCode, selectedClass, selectedExam, subjects.length, teacher]
  );

  useEffect(() => {
    if (!selectedExam || !selectedClass || locked || subjects.length === 0) return;
    if (!userEditedMarksRef.current) return;
    const t = setTimeout(() => {
      void saveMarksBulk(true);
    }, 2500);
    return () => clearTimeout(t);
  }, [studentMarks, selectedExam, selectedClass, locked, subjects, saveMarksBulk]);

  const handleSubmit = async () => {
    if (!selectedExam || !selectedClass || !teacher?.id) return;

    const scopedIds = subjects.map((s) => s.subject_id);
    const incomplete = studentMarks.some((sm) =>
      subjects.some((subject) => {
        const mark = sm.marks[subject.subject_id];
        if (mark?.entry_code) return false;
        return !mark || (mark.marks_obtained === 0 && !mark.absent);
      })
    );

    if (incomplete && !confirm('Some students have incomplete marks for your subjects. Submit anyway?')) {
      return;
    }

    try {
      setSubmitting(true);
      const saved = await saveMarksBulk(true);
      if (!saved) {
        alert('Could not save marks before submit.');
        return;
      }

      const res = await fetch('/api/examinations/marks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          exam_id: selectedExam.id,
          class_id: selectedClass,
          scoped_subject_ids: scopedIds,
          teacher_marks_scoped: true,
          entered_by: teacher.id,
        }),
      });
      const submitResult = await res.json();
      if (res.ok) {
        setLocked(true);
        await loadExistingMarks(
          selectedExam.id,
          studentMarks.map((s) => s.student_id),
          scopedIds
        );
        alert('Your subjects are submitted and locked for editing.');
      } else {
        alert(submitResult?.error || submitResult?.hint || 'Submit failed. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting marks:', error);
      alert('Failed to submit marks.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.admission_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marks Entry</h1>
          <p className="text-gray-600">Enter and manage examination marks for students</p>
        </div>
        <Link
          href="/teacher/dashboard/examinations/v2/bulk-upload"
          className="text-sm font-medium text-[#5A7A95] hover:underline whitespace-nowrap"
        >
          Bulk upload (Excel)
        </Link>
      </div>

      {teachingAssignments.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Your classes & subjects (from timetable)</h3>
          <ul className="text-sm text-gray-700 space-y-1.5">
            {teachingAssignments.map((t) => (
              <li key={t.class_id}>
                <span className="font-medium text-gray-900">
                  {t.class_name}
                  {t.section ? ` — ${t.section}` : ''}
                </span>
                <span className="text-gray-600">
                  {' '}
                  —{' '}
                  {t.subjects?.length
                    ? t.subjects.map((s) => s.name).join(', ')
                    : `${t.subject_ids.length} subject(s)`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Exam Selection */}
      {!selectedExam && (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Select Examination</h2>
          {exams.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">No active examinations found</p>
              <p className="text-gray-500 text-sm mt-2">
                Examinations will appear here once they are created and scheduled
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {exams.map((exam) => (
                <Card
                  key={exam.id}
                  className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => void handleExamSelect(exam)}
                >
                  <h3 className="font-bold text-gray-900 mb-2">{exam.exam_name}</h3>
                  <p className="text-sm text-gray-600 mb-1">{exam.academic_year}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(exam.start_date).toLocaleDateString()} - {new Date(exam.end_date).toLocaleDateString()}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Class Selection */}
      {selectedExam && !selectedClass && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Select Class</h2>
            <Button variant="outline" onClick={() => setSelectedExam(null)}>
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">{selectedExam.exam_name}</h3>
            {(() => {
              const all = selectedExam.class_mappings || [];
              const list =
                teachingAssignments.length === 0
                  ? all
                  : all.filter((cm) => teachingAssignments.some((t) => t.class_id === cm.class_id));
              if (list.length === 0) {
                return (
                  <p className="text-gray-600">
                    {all.length === 0
                      ? 'No classes mapped to this examination.'
                      : 'No classes in this exam match your timetable assignments.'}
                  </p>
                );
              }
              return (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {list.map((cm) => (
                    <button
                      key={cm.class_id}
                      type="button"
                      onClick={() => void handleClassSelect(selectedExam, cm.class_id)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-[#5A7A95] hover:bg-gray-50 transition-colors text-left"
                    >
                      <p className="font-semibold text-gray-900">
                        Class {cm.class?.class} - Section {cm.class?.section}
                      </p>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        </Card>
      )}

      {selectedExam && selectedClass && students.length > 0 && subjects.length === 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-2">{selectedExam.exam_name}</h2>
          <p className="text-gray-600 text-sm">
            This exam has no subjects you can enter marks for in this class (timetable scope or exam
            schema). If your timetable was updated, refresh this page.
          </p>
        </Card>
      )}

      {/* Marks Entry */}
      {selectedExam && selectedClass && students.length > 0 && subjects.length > 0 && (
        <>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedExam.exam_name}</h2>
                <p className="text-sm text-gray-600">
                  {students[0]?.class} - {students[0]?.section}
                </p>
                {!locked && autoSaveState !== 'idle' && (
                  <p className="text-xs text-gray-500 mt-1">
                    {autoSaveState === 'saving' && 'Saving draft…'}
                    {autoSaveState === 'saved' && 'Draft saved'}
                    {autoSaveState === 'error' && 'Auto-save failed — use Save Draft'}
                  </p>
                )}
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <Button variant="outline" onClick={() => setSelectedClass('')}>
                  <ArrowLeft size={18} className="mr-2" />
                  Back
                </Button>
                {!locked && (
                  <>
                    <Button onClick={handleSubmit} disabled={submitting}>
                      <CheckCircle size={18} className="mr-2" />
                      {submitting ? 'Submitting...' : 'Submit Marks'}
                    </Button>
                  </>
                )}
                {locked && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                    <CheckCircle size={18} />
                    <span className="font-semibold">Marks Locked</span>
                  </div>
                )}
              </div>
            </div>

            {locked && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="text-yellow-600" size={20} />
                <p className="text-yellow-800 text-sm">
                  Marks have been submitted and locked. You can view but cannot edit them.
                </p>
              </div>
            )}

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by name or admission number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A95] focus:border-transparent"
                />
              </div>
            </div>

            {/* Marks Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Roll No</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Student Name</th>
                    {subjects.map((subject) => (
                      <th key={subject.subject_id} className="text-center py-3 px-4 font-semibold text-gray-700">
                        <div>{subject.subject_name}</div>
                        <div className="text-xs font-normal text-gray-500">
                          Max: {subject.max_marks} | Pass: {subject.pass_marks}
                        </div>
                        <div className="text-[10px] font-normal text-gray-400 mt-0.5">Marks / status</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => {
                    const studentMark = studentMarks.find(sm => sm.student_id === student.id);
                    return (
                      <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-700">{student.roll_number || '-'}</td>
                        <td className="py-3 px-4 font-medium text-gray-900">{student.student_name}</td>
                        {subjects.map((subject) => {
                          const mark = studentMark?.marks[subject.subject_id];
                          const code = mark?.entry_code ?? null;
                          const marksObtained = mark?.marks_obtained ?? 0;
                          const cellLocked = locked || mark?.status === 'submitted';
                          const isSpecial = Boolean(code);
                          const percentage =
                            subject.max_marks > 0 ? (marksObtained / subject.max_marks) * 100 : 0;
                          const isPass = !isSpecial && marksObtained >= subject.pass_marks;
                          const selectValue = code ?? 'numeric';

                          return (
                            <td key={subject.subject_id} className="py-3 px-4 align-top">
                              <div className="flex flex-col items-center gap-1">
                                <select
                                  value={selectValue}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === 'numeric') {
                                      handleEntryKindChange(student.id, subject.subject_id, 'numeric');
                                    } else {
                                      handleEntryKindChange(
                                        student.id,
                                        subject.subject_id,
                                        v as 'AB' | 'NA' | 'EXEMPT' | 'ML'
                                      );
                                    }
                                  }}
                                  disabled={cellLocked}
                                  className="text-xs border border-gray-300 rounded px-1 py-1 max-w-[9rem] bg-white"
                                >
                                  <option value="numeric">Marks</option>
                                  <option value="AB">Absent (AB)</option>
                                  <option value="NA">N/A</option>
                                  <option value="EXEMPT">Exempt</option>
                                  <option value="ML">Medical leave (ML)</option>
                                </select>

                                {!isSpecial ? (
                                  <div className="flex items-center gap-1 justify-center flex-wrap">
                                    <input
                                      type="number"
                                      value={marksObtained}
                                      onChange={(e) => {
                                        if (!cellLocked) {
                                          handleMarkChange(
                                            student.id,
                                            subject.subject_id,
                                            parseInt(e.target.value, 10) || 0
                                          );
                                        }
                                      }}
                                      onBlur={(e) => {
                                        const value = parseInt(e.target.value, 10) || 0;
                                        if (value > subject.max_marks) {
                                          alert(`Marks cannot exceed ${subject.max_marks}`);
                                          handleMarkChange(student.id, subject.subject_id, subject.max_marks);
                                        }
                                      }}
                                      disabled={cellLocked}
                                      min={0}
                                      max={subject.max_marks}
                                      className={`w-20 px-2 py-1 border rounded text-center ${
                                        isPass ? 'border-green-500' : 'border-red-500'
                                      } ${cellLocked ? 'bg-gray-100' : ''}`}
                                    />
                                    <span className="text-sm text-gray-500">/ {subject.max_marks}</span>
                                  </div>
                                ) : (
                                  <div className="text-sm font-semibold text-gray-800 py-1 px-2 rounded bg-gray-100">
                                    {code}
                                  </div>
                                )}

                                <span
                                  className={`text-[10px] uppercase tracking-wide ${
                                    mark?.status === 'submitted' ? 'text-green-700' : 'text-amber-700'
                                  }`}
                                >
                                  {mark?.status === 'submitted' ? 'Submitted' : 'Draft'}
                                </span>

                                {!isSpecial && marksObtained > 0 && (
                                  <div className="text-xs text-center">
                                    <span className={isPass ? 'text-green-600' : 'text-red-600'}>
                                      {percentage.toFixed(1)}% {isPass ? '✓' : '✗'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
