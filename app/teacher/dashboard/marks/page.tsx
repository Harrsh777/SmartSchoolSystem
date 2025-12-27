'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { FileText, Save, CheckCircle, AlertCircle, GraduationCap } from 'lucide-react';
import type { Examination, Mark } from '@/lib/supabase';

interface StudentWithMark {
  id: string;
  admission_no: string;
  student_name: string;
  class: string;
  section: string;
  roll_number?: string;
  mark: Mark | null;
}

interface TeacherData {
  id: string;
  school_code: string;
  [key: string]: unknown;
}

export default function MarksEntryPage() {
  const [teacher, setTeacher] = useState<TeacherData | null>(null);
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [examinations, setExaminations] = useState<Examination[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [students, setStudents] = useState<StudentWithMark[]>([]);
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [marks, setMarks] = useState<Record<string, { marks_obtained: number; remarks?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      setSchoolCode(teacherData.school_code);
      fetchTeacherClass(teacherData);
      fetchExaminations(teacherData.school_code);
    }
  }, []);

  useEffect(() => {
    if (selectedExam && classId && schoolCode) {
      fetchStudentsWithMarks();
    }
  }, [selectedExam, classId, schoolCode, fetchStudentsWithMarks]);

  const fetchTeacherClass = async (teacherData: TeacherData) => {
    try {
      const response = await fetch(`/api/classes/teacher?school_code=${teacherData.school_code}&teacher_id=${teacherData.id}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setClassId(result.data.id);
      }
    } catch (err) {
      console.error('Error fetching teacher class:', err);
    }
  };

  const fetchExaminations = async (schoolCode: string) => {
    try {
      const response = await fetch(`/api/examinations?school_code=${schoolCode}&status=ongoing`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setExaminations(result.data);
      }
    } catch (err) {
      console.error('Error fetching examinations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsWithMarks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/marks/class?exam_id=${selectedExam}&class_id=${classId}&school_code=${schoolCode}`
      );
      const result = await response.json();
      
      if (response.ok && result.data) {
        setStudents(result.data);
        // Initialize marks state
        const marksState: Record<string, { marks_obtained: number; remarks?: string }> = {};
        result.data.forEach((student: StudentWithMark) => {
          if (student.mark) {
            marksState[student.id] = {
              marks_obtained: student.mark.marks_obtained,
              remarks: student.mark.remarks || '',
            };
            setMaxMarks(student.mark.max_marks);
          } else {
            marksState[student.id] = {
              marks_obtained: 0,
              remarks: '',
            };
          }
        });
        setMarks(marksState);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedExam, classId, schoolCode]);

  const handleMarksChange = (studentId: string, field: 'marks_obtained' | 'remarks', value: string | number) => {
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
    setSaved(false);
  };

  const handleSubmit = async () => {
    if (!selectedExam || !classId || !schoolCode || !teacher) {
      alert('Missing required information');
      return;
    }

    // Validation
    const errors: string[] = [];
    Object.entries(marks).forEach(([studentId, markData]) => {
      if (markData.marks_obtained < 0) {
        errors.push(`Marks for ${students.find(s => s.id === studentId)?.student_name} cannot be negative`);
      }
      if (markData.marks_obtained > maxMarks) {
        errors.push(`Marks for ${students.find(s => s.id === studentId)?.student_name} cannot exceed ${maxMarks}`);
      }
    });

    if (errors.length > 0) {
      alert(errors.join('\n'));
      return;
    }

    setSubmitting(true);
    try {
      const marksArray = students.map(student => ({
        student_id: student.id,
        admission_no: student.admission_no,
        max_marks: maxMarks,
        marks_obtained: marks[student.id]?.marks_obtained || 0,
        remarks: marks[student.id]?.remarks || '',
      }));

      const response = await fetch('/api/marks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: selectedExam,
          class_id: classId,
          school_code: schoolCode,
          entered_by: teacher.id,
          marks: marksArray,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        fetchStudentsWithMarks(); // Refresh to get calculated grades
      } else {
        alert(result.error || 'Failed to save marks');
      }
    } catch (error) {
      console.error('Error saving marks:', error);
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedExamData = examinations.find(e => e.id === selectedExam);
  const isExamCompleted = selectedExamData?.status === 'completed';

  if (loading && !classId) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!classId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md">
          <div className="text-center">
            <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Class Assigned</h3>
            <p className="text-gray-600">
              You are not assigned as a class teacher. Please contact the principal to be assigned to a class.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Marks Entry</h1>
            <p className="text-gray-600">Enter marks for your class students</p>
          </div>
          {saved && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={20} />
              <span className="font-medium">Marks saved successfully!</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Exam Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Examination
              </label>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isExamCompleted}
              >
                <option value="">-- Select Examination --</option>
                {examinations.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.exam_name} ({exam.academic_year}) - {exam.status}
                  </option>
                ))}
              </select>
            </div>

            {selectedExamData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="text-blue-600" size={20} />
                  <h3 className="font-semibold text-blue-900">{selectedExamData.exam_name}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Academic Year:</span>
                    <span className="ml-2 font-medium">{selectedExamData.academic_year}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className={`ml-2 font-medium ${
                      selectedExamData.status === 'ongoing' ? 'text-yellow-600' : 
                      selectedExamData.status === 'completed' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {selectedExamData.status}
                    </span>
                  </div>
                </div>
                {isExamCompleted && (
                  <p className="mt-2 text-sm text-gray-600">
                    This examination is completed. Marks are read-only.
                  </p>
                )}
              </div>
            )}

            {selectedExam && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Marks
                </label>
                <Input
                  type="number"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(parseInt(e.target.value) || 100)}
                  min={1}
                  disabled={isExamCompleted}
                  className="w-32"
                />
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Marks Table */}
      {selectedExam && students.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Roll No</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Student Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Marks Obtained</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Grade</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const studentMark = marks[student.id];
                    const percentage = studentMark?.marks_obtained 
                      ? (studentMark.marks_obtained / maxMarks) * 100 
                      : 0;
                    const grade = student.mark?.grade || 
                      (percentage >= 90 ? 'A+' :
                       percentage >= 80 ? 'A' :
                       percentage >= 70 ? 'B+' :
                       percentage >= 60 ? 'B' :
                       percentage >= 50 ? 'C' :
                       percentage >= 40 ? 'D' : 'F');

                    return (
                      <tr
                        key={student.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-gray-700">{student.roll_number || '-'}</td>
                        <td className="py-3 px-4 font-medium text-black">{student.student_name}</td>
                        <td className="py-3 px-4">
                          <Input
                            type="number"
                            value={studentMark?.marks_obtained || 0}
                            onChange={(e) => handleMarksChange(student.id, 'marks_obtained', parseInt(e.target.value) || 0)}
                            min={0}
                            max={maxMarks}
                            disabled={isExamCompleted}
                            className={`w-24 ${percentage >= 40 ? 'border-green-500' : 'border-red-500'}`}
                          />
                          <span className="ml-2 text-sm text-gray-600">/ {maxMarks}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${
                            grade === 'A+' || grade === 'A' ? 'bg-green-100 text-green-800' :
                            grade === 'B+' || grade === 'B' ? 'bg-blue-100 text-blue-800' :
                            grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                            grade === 'D' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {grade}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Input
                            type="text"
                            value={studentMark?.remarks || ''}
                            onChange={(e) => handleMarksChange(student.id, 'remarks', e.target.value)}
                            placeholder="Optional"
                            disabled={isExamCompleted}
                            className="w-48"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!isExamCompleted && (
              <div className="mt-6 flex items-center justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  <Save size={18} className="mr-2" />
                  {submitting ? 'Saving...' : 'Save Marks'}
                </Button>
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {selectedExam && students.length === 0 && !loading && (
        <Card>
          <div className="text-center py-12">
            <GraduationCap className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">No students found in your class</p>
          </div>
        </Card>
      )}
    </div>
  );
}

