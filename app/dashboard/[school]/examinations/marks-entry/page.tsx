'use client';

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  ArrowLeft, 
  Search,
  ArrowUpDown,
  FileText,
  Users,
  BookOpen,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import {
  calculatePercentage,
  getGradeFromPercentage,
  getGradeColor,
  getPassStatusColor,
} from '@/lib/grade-calculator';

interface Student {
  id: string;
  admission_no: string;
  student_name: string;
  roll_number?: string;
}

interface Subject {
  id: string;
  name: string;
  max_marks: number;
}

interface ClassOption {
  class: string;
  sections: string[];
}

interface Exam {
  id: string;
  name: string;
  class_id: string;
  term_id?: string | null;
  exam_subjects: Array<{
    id: string;
    subject_id: string;
    max_marks: number;
    subject: {
      id: string;
      name: string;
      color: string;
    };
  }>;
}

interface ExistingMark {
  subject_id: string;
  marks_obtained: number;
  max_marks: number;
}

interface TermOption {
  id: string;
  name: string;
  serial?: number;
  structure_id?: string | null;
}

function normClassLabel(v: unknown): string {
  return String(v ?? '').trim();
}

function classSectionLabelsMatch(
  row: { class?: unknown; section?: unknown },
  className: string,
  section: string
): boolean {
  return (
    normClassLabel(row.class).toLowerCase() === normClassLabel(className).toLowerCase() &&
    normClassLabel(row.section).toLowerCase() === normClassLabel(section).toLowerCase()
  );
}

function buildMatchingClassIds(
  rows: { id: unknown; class: string; section: string }[],
  className: string,
  section: string
): Set<string> {
  const set = new Set<string>();
  for (const r of rows) {
    if (classSectionLabelsMatch(r, className, section)) {
      set.add(String(r.id));
    }
  }
  return set;
}

function classMappingMatchesSelection(
  cm: Record<string, unknown>,
  matchingClassIds: Set<string>,
  className: string,
  section: string
): boolean {
  if (matchingClassIds.has(String(cm.class_id))) return true;
  const nested = cm.class as { class?: unknown; section?: unknown } | undefined;
  if (nested && classSectionLabelsMatch(nested, className, section)) return true;
  return false;
}

type MarksTableSort = 'name_asc' | 'name_desc' | 'roll_asc' | 'roll_desc';

function compareRollNumbers(a: string | undefined, b: string | undefined, ascending: boolean): number {
  const sa = String(a ?? '').trim();
  const sb = String(b ?? '').trim();
  const emptyA = !sa;
  const emptyB = !sb;
  if (emptyA && emptyB) return 0;
  if (emptyA) return ascending ? 1 : -1;
  if (emptyB) return ascending ? -1 : 1;
  const cmp = sa.localeCompare(sb, undefined, { numeric: true, sensitivity: 'base' });
  if (cmp !== 0) return ascending ? cmp : -cmp;
  return 0;
}

function resolveExamClassIdForSelection(
  classMappings: Record<string, unknown>[],
  matchingClassIds: Set<string>,
  className: string,
  section: string,
  fallbackClassId: string
): string {
  for (const cm of classMappings) {
    if (matchingClassIds.has(String(cm.class_id))) return String(cm.class_id);
  }
  for (const cm of classMappings) {
    const nested = cm.class as { class?: unknown; section?: unknown } | undefined;
    if (nested && classSectionLabelsMatch(nested, className, section)) {
      return String(cm.class_id);
    }
  }
  return fallbackClassId;
}

export default function MarksEntryPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedStructure, setSelectedStructure] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [terms, setTerms] = useState<TermOption[]>([]);
  const [structures, setStructures] = useState<Array<{ id: string; name: string }>>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [marks, setMarks] = useState<Record<string, Record<string, number>>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [marksTableSort, setMarksTableSort] = useState<MarksTableSort>('name_asc');
  const [showTotals, setShowTotals] = useState(true);

  // Fetch classes and sections
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoadingStudents(true);
        const response = await fetch(`/api/examinations/classes?school_code=${schoolCode}`);
        const result = await response.json();
        if (response.ok && result.data) {
          setClasses(result.data);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchClasses();
  }, [schoolCode]);

  useEffect(() => {
    const fetchStructures = async () => {
      try {
        const res = await fetch(`/api/term-structures?school_code=${schoolCode}`);
        const data = await res.json();
        if (res.ok && Array.isArray(data.data)) setStructures(data.data);
      } catch {
        setStructures([]);
      }
    };
    fetchStructures();
  }, [schoolCode]);

  // Update sections when class changes
  useEffect(() => {
    if (selectedClass) {
      const classData = classes.find(c => c.class === selectedClass);
      if (classData) {
        if (!classData.sections.includes(selectedSection)) {
          setSelectedSection('');
        }
      } else {
        setSelectedSection('');
      }
    } else {
      setSelectedSection('');
    }
  }, [selectedClass, classes, selectedSection]);

  // Fetch exams when class and section are selected
  useEffect(() => {
    if (selectedClass && selectedSection) {
      fetchClassIdAndExams();
    } else {
      setExams([]);
      setSelectedExam('');
      setSelectedClassId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedSection]);

  // Fetch students and subjects when exam is selected
  useEffect(() => {
    if (selectedExam && selectedClassId) {
      fetchStudentsAndSubjects();
    } else {
      setStudents([]);
      setSubjects([]);
      setMarks({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam, selectedClassId]);

  const fetchClassIdAndExams = useCallback(async () => {
    if (!selectedClass || !selectedSection) return;
    try {
      // First, get the class ID
      const classesRes = await fetch(`/api/classes?school_code=${schoolCode}`);
      const classesData = await classesRes.json();
      if (!classesRes.ok || !classesData.data) {
        return;
      }

      const classRows = classesData.data as { id: string; class: string; section: string }[];
      const classItem = classRows.find((c) =>
        classSectionLabelsMatch(c, selectedClass, selectedSection)
      );
      if (!classItem || !classItem.id) {
        return;
      }

      const matchingClassIds = buildMatchingClassIds(classRows, selectedClass, selectedSection);
      const fallbackClassId = String(classItem.id);
      setSelectedClassId(fallbackClassId);
      setError(''); // Clear previous errors

      const termRes = await fetch(
        `/api/terms?school_code=${schoolCode}&class_id=${encodeURIComponent(fallbackClassId)}&section=${encodeURIComponent(selectedSection)}`
      );
      const termData = await termRes.json();
      if (termRes.ok && Array.isArray(termData.data)) {
        setTerms(termData.data);
      } else {
        setTerms([]);
      }

      // Then fetch exams for this class using the new v2 API
      const response = await fetch(`/api/examinations/v2/list?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (!response.ok) {
        setError(result.error || 'Failed to load examinations. Please try again.');
        setExams([]);
        console.error('API error:', result);
        return;
      }
      
      if (!result.data || !Array.isArray(result.data)) {
        setError('Invalid response from server');
        setExams([]);
        return;
      }

      const examsForClass = (result.data as Record<string, unknown>[]).filter((exam: Record<string, unknown>) => {
        const classMappings = exam.class_mappings as Record<string, unknown>[] | undefined;
        if (classMappings && Array.isArray(classMappings) && classMappings.length > 0) {
          return classMappings.some((cm) =>
            classMappingMatchesSelection(cm, matchingClassIds, selectedClass, selectedSection)
          );
        }
        const rootClassId = exam.class_id != null ? String(exam.class_id) : '';
        return Boolean(rootClassId && matchingClassIds.has(rootClassId));
      });

      const transformedExams: Exam[] = examsForClass.map((exam: Record<string, unknown>): Exam => {
        const classMappings = (exam.class_mappings as Record<string, unknown>[] | undefined) || [];
        const resolvedClassId =
          classMappings.length > 0
            ? resolveExamClassIdForSelection(
                classMappings,
                matchingClassIds,
                selectedClass,
                selectedSection,
                fallbackClassId
              )
            : exam.class_id != null
              ? String(exam.class_id)
              : fallbackClassId;

        const subjectMappings = exam.subject_mappings as Record<string, unknown>[] | undefined;
        const classSubjectMappings = subjectMappings?.filter((sm: Record<string, unknown>) => {
          return String(sm.class_id) === String(resolvedClassId);
        }) || [];

        return {
          id: exam.id as string,
          name: (exam.exam_name as string) || (exam.name as string),
          class_id: resolvedClassId,
          term_id: exam.term_id ? String(exam.term_id) : null,
          exam_subjects: classSubjectMappings.map((sm: Record<string, unknown>): Exam['exam_subjects'][0] => {
            const subjectId = String(sm.subject_id || '');
            const subject = sm.subject as Record<string, unknown> | null | undefined;
            return {
              id: subjectId,
              subject_id: subjectId,
              max_marks: Number(sm.max_marks || 100),
              subject: subject ? {
                id: String(subject.id || subjectId),
                name: String(subject.name || 'Unknown'),
                color: String(subject.color || '#000000'),
              } : {
                id: subjectId,
                name: 'Unknown',
                color: '#000000',
              },
            };
          }),
        };
      });

      setExams(transformedExams);
      if (transformedExams.length === 0) {
        setError(`No examinations found for ${selectedClass}-${selectedSection}. Please create an examination first.`);
      } else {
        setError(''); // Clear any previous errors
      }
    } catch (err) {
      console.error('Error fetching class ID and exams:', err);
    }
  }, [schoolCode, selectedClass, selectedSection]);

  const fetchStudentsAndSubjects = useCallback(async () => {
    if (!selectedClass || !selectedSection || !selectedExam || !selectedClassId) return;
    
    try {
      setLoadingStudents(true);
      setError('');

      // Fetch exam details to get subjects using v2 API
      const examRes = await fetch(`/api/examinations/v2/list?school_code=${schoolCode}`);
      const examData = await examRes.json();
      if (!examRes.ok || !examData.data) {
        setError('Failed to fetch exam details');
        return;
      }

      // Find the specific exam
      const exam = (examData.data as Record<string, unknown>[]).find((e: Record<string, unknown>) => e.id === selectedExam);
      if (!exam) {
        setError('Examination not found');
        return;
      }

      // Get subjects for this exam and class
      const subjectMappings = exam.subject_mappings as Record<string, unknown>[] | undefined;
      const examSubjectsForClass = subjectMappings?.filter(() => {
        // Check if this subject mapping is for the selected class
        const classMappings = exam.class_mappings as Record<string, unknown>[] | undefined;
        const classMapping = classMappings?.find((cm: Record<string, unknown>) => cm.class_id === selectedClassId);
        return classMapping !== undefined;
      }) || [];

      if (examSubjectsForClass.length === 0) {
        setError('No subjects found for this exam and class');
        return;
      }

      // Set subjects from exam
      const examSubjects: Subject[] = examSubjectsForClass.map((sm: Record<string, unknown>): Subject => {
        const subject = sm.subject as Record<string, unknown> | null | undefined;
        return {
          id: String(sm.subject_id || ''),
          name: subject ? String(subject.name || 'Unknown') : 'Unknown',
          max_marks: Number(sm.max_marks || 100),
        };
      });
      setSubjects(examSubjects);

      // Fetch students
      const studentsRes = await fetch(
        `/api/students?school_code=${schoolCode}&class=${encodeURIComponent(selectedClass)}&section=${encodeURIComponent(selectedSection)}&status=active`
      );
      const studentsData = await studentsRes.json();
      if (!studentsRes.ok || !studentsData.data) {
        setError('Failed to fetch students');
        return;
      }

      setStudents(studentsData.data || []);

      // Load existing marks for all students
      const existingMarksPromises = (studentsData.data || []).map(async (student: Student) => {
        try {
          const marksRes = await fetch(
            `/api/examinations/marks?exam_id=${selectedExam}&student_id=${student.id}`
          );
          const marksData = await marksRes.json();
          if (marksRes.ok && marksData.data && marksData.data.length > 0) {
            const studentMarks: Record<string, number> = {};
            marksData.data.forEach((m: ExistingMark) => {
              studentMarks[m.subject_id] = m.marks_obtained;
            });
            return { studentId: student.id, marks: studentMarks };
          }
        } catch (err) {
          console.error(`Error fetching marks for student ${student.id}:`, err);
        }
        return { studentId: student.id, marks: {} };
      });

      const existingMarksResults = await Promise.all(existingMarksPromises);
      const marksState: Record<string, Record<string, number>> = {};
      existingMarksResults.forEach(({ studentId, marks: studentMarks }) => {
        marksState[studentId] = studentMarks;
      });
      setMarks(marksState);
    } catch (err) {
      console.error('Error fetching students and subjects:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedClass, selectedSection, selectedExam, selectedClassId, schoolCode]);

  const handleMarksChange = (studentId: string, subjectId: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectId]: numValue,
      },
    }));
  };

  const handleSave = async (): Promise<boolean> => {
    if (!selectedClass || !selectedSection || !selectedExam || !selectedClassId) {
      setError('Please select class, section, and examination');
      return false;
    }

    if (students.length === 0) {
      setError('No students found');
      return false;
    }

    if (subjects.length === 0) {
      setError('No subjects found for this exam');
      return false;
    }

    // Get user ID from session storage (supports staff, principal, admin)
    let enteredBy: string | null = null;
    const role = sessionStorage.getItem('role');
    const storedSchool = sessionStorage.getItem('school');
    
    console.log('Checking session storage for user:', { role, hasSchool: !!storedSchool });
    
    // Try staff first
    const storedStaff = sessionStorage.getItem('staff');
    if (storedStaff) {
      try {
        const staffData = JSON.parse(storedStaff);
        enteredBy = staffData.id || null;
        console.log('Found staff ID:', enteredBy);
      } catch {
        // Ignore parse errors
      }
    }
    
    // If no staff, try teacher
    if (!enteredBy) {
      const storedTeacher = sessionStorage.getItem('teacher');
      if (storedTeacher) {
        try {
          const teacherData = JSON.parse(storedTeacher);
          enteredBy = teacherData.id || null;
          console.log('Found teacher ID:', enteredBy);
        } catch {
          // Ignore parse errors
        }
      }
    }
    
    // If no staff/teacher, check if principal/admin
    // Principals can be identified by:
    // 1. role === 'principal' or 'admin' in sessionStorage
    // 2. Having 'school' in sessionStorage (principal login stores school data)
    // 3. Being on the /dashboard/[school]/ path (principal dashboard)
    if (!enteredBy && storedSchool) {
      try {
        const schoolData = JSON.parse(storedSchool);
        // Try to get principal_id if available
        enteredBy = schoolData.principal_id || null;
        console.log('Principal/Admin - enteredBy from school data:', enteredBy);
        // If still null, that's okay - principals can save marks without staff ID
        // The API should handle null entered_by for principals
      } catch {
        // Ignore parse errors
      }
    }

    // Determine if user is principal/admin:
    // 1. Check role in sessionStorage
    // 2. Check if school data exists (principal login stores this)
    // 3. User is on principal dashboard path (/dashboard/[school]/)
    const isPrincipalOrAdmin = 
      role === 'principal' || 
      role === 'admin' || 
      !!storedSchool; // If school data exists, user is likely a principal
    
    console.log('Final check:', { 
      enteredBy, 
      role, 
      hasSchool: !!storedSchool,
      isPrincipalOrAdmin 
    });
    
    if (!enteredBy && !isPrincipalOrAdmin) {
      console.error('Access denied - no enteredBy and not principal/admin. Role:', role, 'Has school:', !!storedSchool);
      setError('Please log in to save marks');
      return false;
    }
    
    console.log('Access granted - proceeding with save. enteredBy:', enteredBy || 'null (principal/admin)');

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Prepare bulk marks data
      const bulkMarks = students.map((student) => {
        const studentMarks = marks[student.id] || {};
        return {
          student_id: student.id,
          subjects: subjects.map((subject) => ({
            subject_id: subject.id,
            max_marks: subject.max_marks,
            marks_obtained: studentMarks[subject.id] || 0,
            remarks: '',
          })),
        };
      });

      // Use bulk API for efficiency
      const response = await fetch('/api/examinations/marks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          exam_id: selectedExam,
          class_id: selectedClassId,
          marks: bulkMarks,
          entered_by: enteredBy,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const savedCount = result.summary?.total_students || students.length;
        setSuccess(`Marks saved successfully for ${savedCount} student(s)!`);
        setTimeout(() => {
          setSuccess('');
          fetchStudentsAndSubjects();
        }, 2000);
        return true;
      } else {
        const errorMsg = result.error || 'Failed to save marks';
        const details = result.errors ? `\n\nErrors: ${result.errors.slice(0, 3).map((e: { error: string }) => e.error).join('; ')}` : '';
        setError(`${errorMsg}${details}`);
        return false;
      }
    } catch (err) {
      console.error('Error saving marks:', err);
      setError('Failed to save marks. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Calculate student totals and grades
  const calculateStudentStats = (studentId: string) => {
    const studentMarks = marks[studentId] || {};
    let totalObtained = 0;
    let totalMax = 0;

    subjects.forEach((subject) => {
      const marksObtained = studentMarks[subject.id] || 0;
      totalObtained += marksObtained;
      totalMax += subject.max_marks;
    });

    const percentage = totalMax > 0 ? calculatePercentage(totalObtained, totalMax) : 0;
    const grade = getGradeFromPercentage(percentage);
    const isPass = percentage >= 40;

    return { totalObtained, totalMax, percentage, grade, isPass };
  };

  const handleSubmitForReview = async () => {
    if (!selectedClass || !selectedSection || !selectedExam || !selectedClassId) {
      setError('Please select class, section, and examination');
      return;
    }

    if (students.length === 0) {
      setError('No students found');
      return;
    }

    if (subjects.length === 0) {
      setError('No subjects found for this exam');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // First save all marks as draft
      const saved = await handleSave();
      
      if (!saved) {
        setSubmitting(false);
        return;
      }

      // Wait a bit for save to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Then submit for review
      const response = await fetch('/api/examinations/marks/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          exam_id: selectedExam,
          class_id: selectedClassId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(`Marks submitted for review successfully! ${result.submitted_count || 0} marks submitted.`);
        setTimeout(() => {
          setSuccess('');
          fetchStudentsAndSubjects();
        }, 3000);
      } else {
        setError(result.error || result.hint || 'Failed to submit marks for review');
      }
    } catch (err) {
      console.error('Error submitting marks:', err);
      setError('Failed to submit marks for review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = students.filter(
      (student) =>
        student.student_name.toLowerCase().includes(q) ||
        student.admission_no.toLowerCase().includes(q)
    );
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (marksTableSort === 'roll_asc' || marksTableSort === 'roll_desc') {
        const rc = compareRollNumbers(
          a.roll_number,
          b.roll_number,
          marksTableSort === 'roll_asc'
        );
        if (rc !== 0) return rc;
      }
      const na = (a.student_name || '').toLowerCase();
      const nb = (b.student_name || '').toLowerCase();
      let nameCmp = na.localeCompare(nb, undefined, { sensitivity: 'base' });
      if (marksTableSort === 'name_desc') nameCmp = -nameCmp;
      if (nameCmp !== 0) return nameCmp;
      return String(a.admission_no).localeCompare(String(b.admission_no), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
    return sorted;
  }, [students, searchQuery, marksTableSort]);

  // Get sections for selected class
  const availableSections = selectedClass
    ? (classes.find(c => c.class === selectedClass)?.sections || [])
    : [];

  const visibleExams = exams.filter((exam) => {
    if (selectedStructure) {
      const allowedTermIds = new Set(
        terms.filter((t) => String(t.structure_id || '') === selectedStructure).map((t) => t.id)
      );
      if (exam.term_id && !allowedTermIds.has(String(exam.term_id))) return false;
    }
    if (selectedTerm === 'unassigned') return !exam.term_id;
    if (selectedTerm) return String(exam.term_id || '') === selectedTerm;
    return true;
  });
  const visibleTerms = selectedStructure
    ? terms.filter((t) => String(t.structure_id || '') === selectedStructure)
    : terms;

  return (
    <div className="min-h-screen bg-[#F5EFEB] dark:bg-[#0f172a]">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/${schoolCode}/examinations`)}
                className="border-[#5A7A95]/30 text-[#5A7A95] hover:bg-[#5A7A95]/10"
              >
                <ArrowLeft size={18} className="mr-2" />
                Back
              </Button>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center shadow-lg">
                <FileText className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marks Entry</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Enter and manage examination marks for {schoolCode}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Error/Success Messages */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3"
          >
            <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
            <p className="text-green-800 dark:text-green-300 text-sm">{success}</p>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="font-semibold text-red-800 dark:text-red-300 mb-1">Error</p>
                <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-line">{error}</p>
              </div>
            </div>
            <button onClick={() => setError('')} className="text-red-600 dark:text-red-400 hover:text-red-800 flex-shrink-0">
              <X size={18} />
            </button>
          </motion.div>
        )}

        {/* Filters */}
        <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <BookOpen size={14} className="inline mr-1" />
                Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection('');
                  setSelectedExam('');
                  setSelectedClassId('');
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8]"
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.class} value={cls.class}>{cls.class}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Section
              </label>
              <select
                value={selectedSection}
                onChange={(e) => {
                  setSelectedSection(e.target.value);
                  setSelectedExam('');
                  setSelectedClassId('');
                  setExams([]);
                }}
                disabled={!selectedClass}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
              >
                <option value="">Select Section</option>
                {availableSections.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Structure
              </label>
              <select
                value={selectedStructure}
                onChange={(e) => {
                  setSelectedStructure(e.target.value);
                  setSelectedTerm('');
                  setSelectedExam('');
                }}
                disabled={!selectedClass || !selectedSection}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
              >
                <option value="">All Structures</option>
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Term
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => {
                  setSelectedTerm(e.target.value);
                  setSelectedExam('');
                }}
                disabled={!selectedClass || !selectedSection}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
              >
                <option value="">All Terms</option>
                <option value="unassigned">No Term Assigned</option>
                {visibleTerms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.serial ? `${term.serial}. ` : ''}{term.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Examination
              </label>
              <select
                value={selectedExam}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedExam(id);
                  const ex = visibleExams.find((x) => x.id === id);
                  if (ex?.class_id) setSelectedClassId(ex.class_id);
                }}
                disabled={!selectedClass || !selectedSection}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
              >
                <option value="">Select Exam</option>
                {visibleExams.map(exam => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}{!exam.term_id ? ' (No Term Assigned)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || !selectedClass || !selectedSection || !selectedExam || students.length === 0}
                variant="outline"
                className="flex-1 border-[#5A7A95]/30 text-[#5A7A95] hover:bg-[#5A7A95]/10"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    Save as Draft
                  </>
                )}
              </Button>
              <Button
                onClick={handleSubmitForReview}
                disabled={saving || submitting || !selectedClass || !selectedSection || !selectedExam || students.length === 0}
                className="flex-1 bg-[#5A7A95] hover:bg-[#4a6a85] disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FileText size={18} className="mr-2" />
                    Submit for Review
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Loading State */}
        {loadingStudents && (
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 size={32} className="animate-spin text-[#5A7A95] mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Loading students and marks...</p>
              </div>
            </div>
          </Card>
        )}

        {/* Search and Toggle */}
        {students.length > 0 && !loadingStudents && (
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by student name or admission number..."
                  className="pl-10 w-full"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <ArrowUpDown size={16} className="text-[#5A7A95] shrink-0" aria-hidden />
                  <label htmlFor="marks-sort" className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    Sort
                  </label>
                  <select
                    id="marks-sort"
                    value={marksTableSort}
                    onChange={(e) => setMarksTableSort(e.target.value as MarksTableSort)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] min-w-[200px]"
                  >
                    <option value="name_asc">Student name (A–Z)</option>
                    <option value="name_desc">Student name (Z–A)</option>
                    <option value="roll_asc">Roll number (low → high)</option>
                    <option value="roll_desc">Roll number (high → low)</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer sm:pl-2 sm:border-l sm:border-gray-200 dark:sm:border-gray-600">
                  <input
                    type="checkbox"
                    checked={showTotals}
                    onChange={(e) => setShowTotals(e.target.checked)}
                    className="w-4 h-4 text-[#5A7A95] focus:ring-[#5A7A95] rounded"
                  />
                  Show Totals
                </label>
              </div>
            </div>
          </Card>
        )}

        {/* Marks Table */}
        {students.length > 0 && subjects.length > 0 && !loadingStudents && (
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase sticky left-0 bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] z-10">Roll</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase sticky left-[60px] bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] z-10">Adm No</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase sticky left-[140px] bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] z-10 min-w-[150px]">Student Name</th>
                    {subjects.map(subject => (
                      <th key={subject.id} className="px-3 py-3 text-center text-xs font-bold uppercase min-w-[120px]">
                        <div className="font-bold">{subject.name}</div>
                        <div className="text-xs font-normal opacity-90 mt-1">Max: {subject.max_marks}</div>
                      </th>
                    ))}
                    {showTotals && (
                      <>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase bg-[#5A7A95]/20">Total</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase bg-[#5A7A95]/20">%</th>
                        <th className="px-3 py-3 text-center text-xs font-bold uppercase bg-[#5A7A95]/20">Grade</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayStudents.map((student, index) => {
                    const stats = calculateStudentStats(student.id);
                    return (
                      <motion.tr
                        key={student.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`hover:bg-[#5A7A95]/5 dark:hover:bg-[#6B9BB8]/10 transition-colors ${stats.isPass ? '' : 'bg-red-50/50 dark:bg-red-900/10'}`}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-[#1e293b] z-10">
                          {student.roll_number || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono sticky left-[60px] bg-white dark:bg-[#1e293b] z-10">
                          {student.admission_no}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white sticky left-[140px] bg-white dark:bg-[#1e293b] z-10 min-w-[150px]">
                          {student.student_name}
                        </td>
                        {subjects.map(subject => {
                          const marksObtained = marks[student.id]?.[subject.id] || 0;
                          const percentage = calculatePercentage(marksObtained, subject.max_marks);
                          const grade = getGradeFromPercentage(percentage);
                          const isPass = percentage >= 40;
                          const isBorderline = percentage >= 35 && percentage < 40;
                          
                          return (
                            <td key={subject.id} className="px-3 py-3">
                              <div className="flex flex-col items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  max={subject.max_marks}
                                  step="0.01"
                                  value={marksObtained || ''}
                                  onChange={(e) => handleMarksChange(student.id, subject.id, e.target.value)}
                                  placeholder="0"
                                  className={`w-20 text-center text-sm font-medium ${
                                    isPass 
                                      ? 'border-green-500 focus:ring-green-500' 
                                      : isBorderline
                                      ? 'border-yellow-500 focus:ring-yellow-500'
                                      : 'border-red-500 focus:ring-red-500'
                                  }`}
                                />
                                <div className="flex items-center gap-1 text-xs">
                                  <span className={`font-semibold ${getGradeColor(grade)}`}>
                                    {grade}
                                  </span>
                                  <span className="text-gray-500 dark:text-gray-400">
                                    ({percentage.toFixed(1)}%)
                                  </span>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                        {showTotals && (
                          <>
                            <td className="px-3 py-3 text-center bg-gray-50 dark:bg-gray-800/50">
                              <div className="font-bold text-gray-900 dark:text-white">
                                {stats.totalObtained} / {stats.totalMax}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center bg-gray-50 dark:bg-gray-800/50">
                              <div className={`font-bold ${stats.isPass ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {stats.percentage.toFixed(1)}%
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center bg-gray-50 dark:bg-gray-800/50">
                              <div className={`font-bold text-lg ${getGradeColor(stats.grade)}`}>
                                {stats.grade}
                              </div>
                              <div className={`text-xs px-2 py-0.5 rounded-full mt-1 ${getPassStatusColor(stats.isPass ? 'pass' : 'fail')}`}>
                                {stats.isPass ? 'Pass' : 'Fail'}
                              </div>
                            </td>
                          </>
                        )}
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!loadingStudents && (!selectedClass || !selectedSection || !selectedExam) && (
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50">
            <div className="text-center py-12">
              <FileText size={64} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ready to Enter Marks</h3>
              <p className="text-gray-600 dark:text-gray-400">Select class, section, and examination to start entering marks</p>
            </div>
          </Card>
        )}

        {!loadingStudents && selectedClass && selectedSection && selectedExam && students.length === 0 && (
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50">
            <div className="text-center py-12">
              <Users size={64} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Students Found</h3>
              <p className="text-gray-600 dark:text-gray-400">No students found for {selectedClass}-{selectedSection}</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
