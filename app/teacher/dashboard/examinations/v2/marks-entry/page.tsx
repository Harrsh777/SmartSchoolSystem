'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, Save, CheckCircle, BookOpen, Search, AlertCircle } from 'lucide-react';

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
  const [teacherScope, setTeacherScope] = useState<'class_teacher' | 'subject_teacher'>('class_teacher');
  const [subjectIdsByClass, setSubjectIdsByClass] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      setSchoolCode(teacherData.school_code);
      
      // Check if exam_id is in URL params
      const examId = searchParams.get('exam_id');
      if (examId) {
        fetchExamById(teacherData.school_code, teacherData.id, examId);
      } else {
        fetchExams(teacherData.school_code);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchExams = async (schoolCode: string) => {
    try {
      setLoading(true);
      if (!teacher) return;
      
      const queryParams = new URLSearchParams({
        school_code: schoolCode,
      });
      
      if (teacher.id) {
        queryParams.append('teacher_id', String(teacher.id));
      }
      if (teacher.staff_id) {
        queryParams.append('staff_id', String(teacher.staff_id));
      }
      
      const response = await fetch(`/api/examinations/v2/teacher?${queryParams.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setTeacherScope(result.teacher_scope || 'class_teacher');
        setSubjectIdsByClass(result.subject_ids_by_class || {});
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeExams = (result.data as Exam[]).filter((exam: Exam) => {
          if (!exam.start_date) return false;
          const startDate = new Date(exam.start_date);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(exam.end_date);
          endDate.setHours(0, 0, 0, 0);
          return (exam.status === 'upcoming' || exam.status === 'ongoing' || exam.status === 'active') &&
            (today >= startDate && today <= endDate || today < startDate);
        });
        setExams(activeExams);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExamById = async (schoolCode: string, teacherId: string, examId: string) => {
    try {
      setLoading(true);
      if (!teacher) return;
      
      const queryParams = new URLSearchParams({
        school_code: schoolCode,
      });
      
      if (teacherId) {
        queryParams.append('teacher_id', teacherId);
      }
      if (teacher.staff_id) {
        queryParams.append('staff_id', String(teacher.staff_id));
      }
      
      const response = await fetch(`/api/examinations/v2/teacher?${queryParams.toString()}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setTeacherScope(result.teacher_scope || 'class_teacher');
        setSubjectIdsByClass(result.subject_ids_by_class || {});
        const exam = (result.data as Exam[]).find((e: Exam) => e.id === examId);
        if (exam) {
          await handleExamSelect(exam);
        }
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExamSelect = async (exam: Exam) => {
    setSelectedExam(exam);
    setSelectedClass('');
    setStudents([]);
    setSubjects([]);
    setStudentMarks([]);
    
    // Get classes for this exam
    if (exam.class_mappings && exam.class_mappings.length > 0) {
      // If teacher is class teacher, auto-select their class
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

  const fetchTeacherClass = async () => {
    if (!teacher) return null;
    try {
      const queryParams = new URLSearchParams({
        school_code: schoolCode,
      });
      
      if (teacher.id) {
        queryParams.append('teacher_id', String(teacher.id));
      }
      if (teacher.staff_id) {
        queryParams.append('staff_id', String(teacher.staff_id));
      }
      
      const response = await fetch(`/api/classes/teacher?${queryParams.toString()}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        // Handle both array and single class responses
        const classesData = Array.isArray(result.data) ? result.data : [result.data];
        // Return the first class if multiple classes exist
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
        
        // Get subjects for this exam and class (subject_mappings include class_id); restrict to teacher's subjects if subject teacher
        const forThisClass = exam.subject_mappings?.filter((sm: Record<string, unknown>) => {
          const isForThisClass = sm.class_id === classId;
          if (!isForThisClass) return false;
          const mySubjectIds = subjectIdsByClass[classId];
          if (teacherScope === 'subject_teacher' && Array.isArray(mySubjectIds) && mySubjectIds.length > 0) {
            return mySubjectIds.includes(String(sm.subject_id));
          }
          return true;
        }) || [];
        const examSubjects: ExamSubject[] = forThisClass.map((sm: Record<string, unknown>) => ({
          subject_id: String(sm.subject_id ?? ''),
          subject_name: String((sm.subject as { name?: string })?.name ?? 'Unknown'),
          max_marks: Number(sm.max_marks ?? 100),
          pass_marks: Number(sm.pass_marks ?? 33),
          weightage: Number(sm.weightage ?? 0),
        }));
        setSubjects(examSubjects);
        
        // Load existing marks
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
      
      // Check if exam is locked (check first student's marks status)
      if (studentIds.length > 0) {
        const checkResponse = await fetch(
          `/api/examinations/marks/status?exam_id=${examId}&student_id=${studentIds[0]}`
        );
        const checkResult = await checkResponse.json();
        if (checkResponse.ok && checkResult.data?.locked) {
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
      
      // Save marks for all students
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
    
    // Validate all students have marks (allow absent students)
    const incomplete = studentMarks.some(sm => {
      return subjects.some(subject => {
        const mark = sm.marks[subject.subject_id];
        // Incomplete if no mark entry at all, or if marks are 0 and not marked absent
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
      
      // Save and lock marks
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
        
        // Save marks
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
          // Submit marks (lock them)
          const submitResponse = await fetch('/api/examinations/marks/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              school_code: schoolCode,
              exam_id: selectedExam.id,
              student_id: studentMark.student_id,
            }),
          });
          
          return submitResponse.ok;
        }
        
        return false;
      });
      
      const results = await Promise.all(submitPromises);
      
      if (results.every(r => r)) {
        setLocked(true);
        alert('Marks submitted and locked successfully!');
      } else {
        alert('Some marks failed to submit. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting marks:', error);
      alert('Failed to submit marks. Please try again.');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marks Entry</h1>
          <p className="text-gray-600">Enter and manage examination marks for students</p>
        </div>
      </div>

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
                  onClick={() => handleExamSelect(exam)}
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
            {selectedExam.class_mappings && selectedExam.class_mappings.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {selectedExam.class_mappings.map((cm) => (
                  <button
                    key={cm.class_id}
                    onClick={() => handleClassSelect(selectedExam, cm.class_id)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-[#5A7A95] hover:bg-gray-50 transition-colors text-left"
                  >
                    <p className="font-semibold text-gray-900">
                      Class {cm.class?.class} - Section {cm.class?.section}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No classes mapped to this examination</p>
            )}
          </div>
        </Card>
      )}

      {/* Marks Entry */}
      {selectedExam && selectedClass && students.length > 0 && (
        <>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedExam.exam_name}</h2>
                <p className="text-sm text-gray-600">
                  {students[0]?.class} - {students[0]?.section}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedClass('')}>
                  <ArrowLeft size={18} className="mr-2" />
                  Back
                </Button>
                {!locked && (
                  <>
                    <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
                      <Save size={18} className="mr-2" />
                      {saving ? 'Saving...' : 'Save Draft'}
                    </Button>
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
                          const marksObtained = mark?.marks_obtained || 0;
                          const isAbsent = mark?.absent || false;
                          const percentage = subject.max_marks > 0 
                            ? (marksObtained / subject.max_marks) * 100 
                            : 0;
                          const isPass = marksObtained >= subject.pass_marks;
                          
                          return (
                            <td key={subject.subject_id} className="py-3 px-4">
                              <div className="flex items-center gap-2 justify-center">
                                <input
                                  type="number"
                                  value={isAbsent ? '' : marksObtained}
                                  onChange={(e) => {
                                    if (!locked) {
                                      handleMarkChange(student.id, subject.subject_id, parseInt(e.target.value) || 0);
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    if (value > subject.max_marks) {
                                      alert(`Marks cannot exceed ${subject.max_marks}`);
                                      handleMarkChange(student.id, subject.subject_id, subject.max_marks);
                                    }
                                  }}
                                  disabled={locked || isAbsent}
                                  min="0"
                                  max={subject.max_marks}
                                  className={`w-20 px-2 py-1 border rounded text-center ${
                                    isAbsent 
                                      ? 'bg-gray-100 text-gray-500' 
                                      : isPass 
                                      ? 'border-green-500' 
                                      : 'border-red-500'
                                  } ${locked ? 'bg-gray-100' : ''}`}
                                  placeholder={isAbsent ? 'Absent' : '0'}
                                />
                                <span className="text-sm text-gray-500">/ {subject.max_marks}</span>
                                <button
                                  onClick={() => !locked && handleAbsentToggle(student.id, subject.subject_id)}
                                  disabled={locked}
                                  className={`ml-2 px-2 py-1 text-xs rounded ${
                                    isAbsent
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  } ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                  title={isAbsent ? 'Mark as Present' : 'Mark as Absent'}
                                >
                                  {isAbsent ? 'Absent' : 'A'}
                                </button>
                              </div>
                              {!isAbsent && marksObtained > 0 && (
                                <div className="text-xs text-center mt-1">
                                  <span className={isPass ? 'text-green-600' : 'text-red-600'}>
                                    {percentage.toFixed(1)}% {isPass ? '✓' : '✗'}
                                  </span>
                                </div>
                              )}
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
