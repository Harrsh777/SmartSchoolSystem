'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  ArrowLeft, 
  Search,
  FileText,
  Users,
  BookOpen,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

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
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [marks, setMarks] = useState<Record<string, Record<string, number>>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

      const classItem = classesData.data.find((c: { class: string; section: string }) => 
        c.class === selectedClass && c.section === selectedSection
      );
      if (!classItem || !classItem.id) {
        return;
      }

      const classId = classItem.id;
      setSelectedClassId(classId);

      // Then fetch exams for this class
      const response = await fetch(`/api/examinations?school_code=${schoolCode}&class_id=${classId}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setExams(result.data);
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

      // Fetch exam details to get subjects
      const examRes = await fetch(`/api/examinations/${selectedExam}?school_code=${schoolCode}`);
      const examData = await examRes.json();
      if (!examRes.ok || !examData.data) {
        setError('Failed to fetch exam details');
        return;
      }

      const exam: Exam = examData.data;
      if (!exam.exam_subjects || exam.exam_subjects.length === 0) {
        setError('No subjects found for this exam');
        return;
      }

      // Set subjects from exam
      const examSubjects: Subject[] = exam.exam_subjects.map((es) => ({
        id: es.subject_id,
        name: es.subject.name,
        max_marks: es.max_marks,
      }));
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

  const handleSave = async () => {
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

    // Get staff ID from session storage
    const storedStaff = sessionStorage.getItem('staff');
    let enteredBy: string | null = null;
    if (storedStaff) {
      try {
        const staffData = JSON.parse(storedStaff);
        enteredBy = staffData.id || null;
      } catch {
        // Ignore parse errors
      }
    }

    if (!enteredBy) {
      setError('Please log in to save marks');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Save marks for each student
      for (const student of students) {
        const studentMarks = marks[student.id] || {};
        const marksArray = subjects.map((subject) => ({
          subject_id: subject.id,
          max_marks: subject.max_marks,
          marks_obtained: studentMarks[subject.id] || 0,
          remarks: '',
        }));

        try {
          const response = await fetch('/api/examinations/marks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              school_code: schoolCode,
              exam_id: selectedExam,
              student_id: student.id,
              class_id: selectedClassId,
              marks: marksArray,
              entered_by: enteredBy,
            }),
          });

          const result = await response.json();
          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            errors.push(`${student.student_name}: ${result.error || 'Failed to save marks'}`);
          }
        } catch (err) {
          errorCount++;
          errors.push(`${student.student_name}: Failed to save marks`);
          console.error(`Error saving marks for student ${student.id}:`, err);
        }
      }

      if (errorCount === 0) {
        setSuccess(`Marks saved successfully for all ${successCount} student(s)!`);
        setTimeout(() => {
          setSuccess('');
          // Optionally refresh the data
          fetchStudentsAndSubjects();
        }, 3000);
      } else if (successCount > 0) {
        setError(`Saved marks for ${successCount} student(s), but ${errorCount} failed. ${errors.slice(0, 3).join('; ')}`);
      } else {
        setError(`Failed to save marks for all students. ${errors.slice(0, 3).join('; ')}`);
      }
    } catch (err) {
      console.error('Error saving marks:', err);
      setError('Failed to save marks. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.admission_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get sections for selected class
  const availableSections = selectedClass
    ? (classes.find(c => c.class === selectedClass)?.sections || [])
    : [];

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <FileText className="text-white" size={24} />
            </div>
            Marks Entry
          </h1>
          <p className="text-gray-600">Enter and manage examination marks</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/examinations`)}
          className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Error/Success Messages */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        </Card>
      )}
      {success && (
        <Card className="bg-green-50 border-green-200">
          <div className="flex items-center gap-3 text-green-800">
            <CheckCircle size={20} />
            <p>{success}</p>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
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
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls.class} value={cls.class}>{cls.class}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setSelectedExam('');
              }}
              disabled={!selectedClass}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Section</option>
              {availableSections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Examination
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              disabled={!selectedClass || !selectedSection}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Exam</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>{exam.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleSave}
              disabled={saving || !selectedClass || !selectedSection || !selectedExam || students.length === 0}
              className="w-full bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Save All Marks
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {loadingStudents && (
        <Card>
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-[#1e3a8a] mr-3" />
            <p className="text-gray-600">Loading students and marks...</p>
          </div>
        </Card>
      )}

      {/* Search */}
      {students.length > 0 && !loadingStudents && (
        <Card>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or admission number..."
              className="pl-10"
            />
          </div>
        </Card>
      )}

      {/* Marks Table */}
      {students.length > 0 && subjects.length > 0 && !loadingStudents && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Roll No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Admission No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                  {subjects.map(subject => (
                    <th key={subject.id} className="px-4 py-3 text-center text-sm font-semibold">
                      {subject.name}
                      <div className="text-xs font-normal opacity-90">(Max: {subject.max_marks})</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student, index) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {student.roll_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {student.admission_no}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {student.student_name}
                    </td>
                    {subjects.map(subject => (
                      <td key={subject.id} className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          max={subject.max_marks}
                          value={marks[student.id]?.[subject.id] || ''}
                          onChange={(e) => handleMarksChange(student.id, subject.id, e.target.value)}
                          placeholder="0"
                          className="w-20 text-center"
                        />
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!loadingStudents && (!selectedClass || !selectedSection || !selectedExam) && (
        <Card>
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">Select class, section, and examination to enter marks</p>
          </div>
        </Card>
      )}

      {!loadingStudents && selectedClass && selectedSection && selectedExam && students.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <Users size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">No students found for this class and section</p>
          </div>
        </Card>
      )}
    </div>
  );
}
