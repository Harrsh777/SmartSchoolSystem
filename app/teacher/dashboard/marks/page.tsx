'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { FileText, Save, CheckCircle, AlertCircle, GraduationCap } from 'lucide-react';

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

interface StudentMark {
  student_id: string;
  marks: Record<string, {
    marks_obtained: number;
    absent: boolean;
  }>;
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
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlExamApplied, setUrlExamApplied] = useState(false);

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
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeExams = (result.data as Exam[]).filter((exam) => {
          if (!exam.start_date) return false;
          const startDate = new Date(exam.start_date);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(exam.end_date);
          endDate.setHours(0, 0, 0, 0);
          return (exam.status === 'upcoming' || exam.status === 'ongoing' || exam.status === 'active') &&
            (today >= startDate && today <= endDate || today < startDate);
        });
        setExams(activeExams);
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

  const fetchTeacherClass = async () => {
    if (!teacher) return null;
    try {
      const queryParams = new URLSearchParams({
        school_code: schoolCode,
      });
      
      if (teacher.id) {
        queryParams.append('teacher_id', teacher.id as string);
      }
      if (teacher.staff_id) {
        queryParams.append('staff_id', teacher.staff_id as string);
      }
      
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

  const handleExamSelect = async (exam: Exam) => {
    setSelectedExam(exam);
    setSelectedClass('');
    setStudents([]);
    setSubjects([]);
    setStudentMarks([]);
    
    if (exam.class_mappings && exam.class_mappings.length > 0) {
      const teacherClass = await fetchTeacherClass();
      if (teacherClass) {
        const matchingClass = exam.class_mappings.find(cm => 
          cm.class?.class === teacherClass.class && cm.class?.section === teacherClass.section
        );
        if (matchingClass) {
          await handleClassSelect(exam, matchingClass.class_id);
        }
      }
    }
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

  const handleClassSelect = async (exam: Exam, classId: string) => {
    setSelectedClass(classId);
    
    try {
      const classResponse = await fetch(`/api/classes?school_code=${schoolCode}&id=${classId}`);
      const classResult = await classResponse.json();
      
      if (!classResponse.ok || !classResult.data || classResult.data.length === 0) {
        alert('Class not found');
        return;
      }
      
      const classData = classResult.data[0];
      
      const studentsResponse = await fetch(
        `/api/students?school_code=${schoolCode}&class=${classData.class}&section=${classData.section}&status=active`
      );
      const studentsResult = await studentsResponse.json();
      
      if (studentsResponse.ok && studentsResult.data) {
        setStudents(studentsResult.data);
        // Subject mappings may include class_id (filter to this class) or not (use all)
        const allMappings = exam.subject_mappings || [];
        const forThisClass = allMappings.filter((sm: Record<string, unknown>) => {
          const smClassId = sm.class_id;
          if (smClassId == null || smClassId === '') return true; // no class_id = applies to all classes
          return String(smClassId) === String(classId);
        });
        const mappingsToUse = forThisClass.length > 0 ? forThisClass : allMappings;

        const examSubjects: ExamSubject[] = mappingsToUse.map((sm: Record<string, unknown>) => ({
          subject_id: sm.subject_id as string,
          subject_name: (sm.subject as { name?: string })?.name || 'Unknown',
          max_marks: Number(sm.max_marks || 100),
          pass_marks: Number(sm.pass_marks || 33),
          weightage: Number(sm.weightage || 0),
        }));
        setSubjects(examSubjects);
        await loadExistingMarks(exam.id, studentsResult.data.map((s: Student) => s.id));
      }
    } catch (error) {
      console.error('Error fetching class data:', error);
      alert('Failed to load class data');
    }
  };

  const loadExistingMarks = async (examId: string, studentIds: string[]) => {
    try {
      const marksPromises = studentIds.map(async (studentId) => {
        const response = await fetch(
          `/api/examinations/marks?exam_id=${examId}&student_id=${studentId}`
        );
        const result = await response.json();
        
        if (response.ok && result.data) {
          const marks: Record<string, { marks_obtained: number; absent: boolean }> = {};
          result.data.forEach((mark: Record<string, unknown>) => {
            marks[mark.subject_id as string] = {
              marks_obtained: Number(mark.marks_obtained) || 0,
              absent: Boolean(mark.absent) || (String(mark.remarks) === 'Absent'),
            };
          });
          return { student_id: studentId, marks };
        }
        return { student_id: studentId, marks: {} };
      });
      
      const marksResults = await Promise.all(marksPromises);
      setStudentMarks(marksResults);
      
      if (studentIds.length > 0) {
        const checkResponse = await fetch(
          `/api/examinations/marks/status?exam_id=${examId}&student_id=${studentIds[0]}`
        );
        const checkResult = await checkResponse.json();
        if (checkResponse.ok && checkResult.data?.status === 'submitted') {
          setLocked(true);
        }
      }
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

  const handleSaveDraft = async () => {
    if (!selectedExam || !selectedClass || !teacher) return;
    
    try {
      setSaving(true);
      
      const savePromises = studentMarks.map(async (studentMark) => {
        const marksArray = subjects.map(subject => {
          const mark = studentMark.marks[subject.subject_id];
          return {
            subject_id: subject.subject_id,
            max_marks: subject.max_marks,
            marks_obtained: mark?.absent ? null : (mark?.marks_obtained || 0),
            remarks: mark?.absent ? 'Absent' : null,
          };
        });
        
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
          }),
        });
        
        return response.ok;
      });
      
      await Promise.all(savePromises);
      alert('Marks saved as draft successfully!');
    } catch (error) {
      console.error('Error saving marks:', error);
      alert('Failed to save marks. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedExam || !selectedClass || !teacher) return;
    
    const incomplete = studentMarks.some(sm => {
      return subjects.some(subject => {
        const mark = sm.marks[subject.subject_id];
        return !mark || (mark.marks_obtained === 0 && !mark.absent && mark.marks_obtained !== null);
      });
    });
    
    if (incomplete) {
      if (!confirm('Some students have incomplete marks. Do you want to submit anyway?')) {
        return;
      }
    }
    
    try {
      setSubmitting(true);
      
      const submitPromises = studentMarks.map(async (studentMark) => {
        const marksArray = subjects.map(subject => {
          const mark = studentMark.marks[subject.subject_id];
          return {
            subject_id: subject.subject_id,
            max_marks: subject.max_marks,
            marks_obtained: mark?.absent ? null : (mark?.marks_obtained || 0),
            remarks: mark?.absent ? 'Absent' : null,
          };
        });
        
        const saveResponse = await fetch('/api/examinations/marks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_code: schoolCode,
            exam_id: selectedExam.id,
            student_id: studentMark.student_id,
            class_id: selectedClass,
            marks: marksArray,
            entered_by: teacher.id,
          }),
        });
        
        if (saveResponse.ok) {
          const submitResponse = await fetch('/api/examinations/marks/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              school_code: schoolCode,
              exam_id: selectedExam.id,
              student_id: studentMark.student_id,
              class_id: selectedClass,
            }),
          });
          if (!submitResponse.ok) {
            const errBody = await submitResponse.json().catch(() => ({}));
            console.error('Submit marks failed:', submitResponse.status, errBody);
            return { ok: false, error: errBody.error || errBody.details || 'Submit failed' };
          }
          return { ok: true };
        }
        const errBody = await saveResponse.json().catch(() => ({}));
        console.error('Save marks failed:', saveResponse.status, errBody);
        return { ok: false, error: errBody.error || errBody.details || 'Save failed' };
      });
      
      const results = await Promise.all(submitPromises) as Array<{ ok: boolean; error?: string }>;
      const allOk = results.every(r => r?.ok === true);
      const firstFail = results.find(r => r?.ok === false);

      if (allOk) {
        setLocked(true);
        alert('Marks submitted successfully!');
        await loadExistingMarks(selectedExam.id, students.map(s => s.id));
      } else {
        alert(firstFail?.error ? `Submission failed: ${firstFail.error}` : 'Some marks failed to submit. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting marks:', error);
      alert('Failed to submit marks. Please try again.');
    } finally {
      setSubmitting(false);
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
              <p className="text-gray-600 dark:text-gray-400">Enter marks for your class students</p>
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
                disabled={locked || loading}
              >
                <option value="">-- Select Examination --</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.exam_name} ({exam.academic_year}) - {exam.status}
                  </option>
                ))}
              </select>
            </div>

            {selectedExam && selectedExam.class_mappings && selectedExam.class_mappings.length > 0 && !selectedClass && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    if (selectedExam) handleClassSelect(selectedExam, e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">-- Select Class --</option>
                  {selectedExam.class_mappings.map((cm) => (
                    <option key={cm.class_id} value={cm.class_id}>
                      {cm.class?.class} - {cm.class?.section}
                    </option>
                  ))}
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
                </div>
                {subjects.length === 0 && students.length > 0 && (
                  <p className="mt-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded p-2">
                    No subjects configured for this exam and class. Ask admin to add subject mappings in Examination → Edit Exam.
                  </p>
                )}
                {locked && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Marks have been submitted and are locked for editing.
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {selectedExam && selectedClass && students.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Students ({students.length})
                </h2>
                <Input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Student ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Student Name</th>
                      {subjects.map((subject) => (
                        <th key={subject.subject_id} className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                          {subject.subject_name}
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            (Max: {subject.max_marks})
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      const studentMark = studentMarks.find(sm => sm.student_id === student.id);
                      return (
                        <tr
                          key={student.id}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{student.admission_no}</td>
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{student.student_name}</td>
                          {subjects.map((subject) => {
                            const mark = studentMark?.marks[subject.subject_id];
                            const marksObtained = mark?.marks_obtained || 0;
                            const isAbsent = mark?.absent || false;
                            const percentage = subject.max_marks > 0 ? (marksObtained / subject.max_marks) * 100 : 0;
                            
                            return (
                              <td key={subject.subject_id} className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Input
                                    type="number"
                                    value={isAbsent ? '' : marksObtained}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      if (val >= 0 && val <= subject.max_marks) {
                                        handleMarkChange(student.id, subject.subject_id, val);
                                      }
                                    }}
                                    min={0}
                                    max={subject.max_marks}
                                    disabled={locked}
                                    placeholder={isAbsent ? 'Abs' : '0'}
                                    className={`w-20 text-center ${percentage >= 40 ? 'border-green-500' : percentage > 0 ? 'border-yellow-500' : 'border-gray-300'}`}
                                  />
                                  <button
                                    onClick={() => handleAbsentToggle(student.id, subject.subject_id)}
                                    disabled={locked}
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
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!locked && (
                <div className="mt-6 flex items-center justify-end gap-3">
                  <Button
                    onClick={handleSaveDraft}
                    disabled={saving || submitting}
                    variant="outline"
                    className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    <Save size={18} className="mr-2" />
                    {saving ? 'Saving...' : 'Save Draft'}
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={saving || submitting}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle size={18} className="mr-2" />
                    {submitting ? 'Submitting...' : 'Submit Marks'}
                  </Button>
                </div>
              )}
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
