'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, Save, CheckCircle } from 'lucide-react';

interface ExamSubject {
  id: string;
  subject_id: string;
  max_marks: number;
  subject: {
    id: string;
    name: string;
    color: string;
  };
}

interface Mark {
  subject_id: string;
  max_marks: number;
  marks_obtained: string;
  remarks: string;
}

export default function StudentMarkEntryPage({
  params,
}: {
  params: Promise<{ examId: string; studentId: string }>;
}) {
  interface TeacherData {
    id: string;
    school_code: string;
    [key: string]: unknown;
  }

  interface ExamData {
    id: string;
    name: string;
    class?: {
      id: string;
      class: string;
      section: string;
    } | null;
    exam_subjects?: Array<{ id: string; subject_id: string; max_marks: number }>;
    [key: string]: unknown;
  }

  interface StudentData {
    id: string;
    admission_no: string;
    student_name: string;
    [key: string]: unknown;
  }

  const { examId, studentId } = use(params);
  const router = useRouter();
  // teacher kept for potential future use
  const [teacher] = useState<TeacherData | null>(null);
  const [exam, setExam] = useState<ExamData | null>(null);
  const [student, setStudent] = useState<StudentData | null>(null);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      fetchData(teacherData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, studentId]);

  const fetchData = async (teacherData: TeacherData) => {
    try {
      setLoading(true);

      // Fetch exam details
      const examResponse = await fetch(
        `/api/examinations/${examId}?school_code=${teacherData.school_code}`
      );
      const examResult = await examResponse.json();

      if (examResponse.ok && examResult.data) {
        setExam(examResult.data);
        setSubjects(examResult.data.exam_subjects || []);

        // Initialize marks object
        const initialMarks: Record<string, Mark> = {};
        examResult.data.exam_subjects.forEach((es: ExamSubject) => {
          initialMarks[es.subject_id] = {
            subject_id: es.subject_id,
            max_marks: es.max_marks,
            marks_obtained: '',
            remarks: '',
          };
        });
        setMarks(initialMarks);
      }

      // Fetch student details
      const studentResponse = await fetch(
        `/api/students/${studentId}?school_code=${teacherData.school_code}`
      );
      const studentResult = await studentResponse.json();

      if (studentResponse.ok && studentResult.data) {
        setStudent(studentResult.data);
      }

      // Fetch existing marks
      const marksResponse = await fetch(
        `/api/examinations/marks?exam_id=${examId}&student_id=${studentId}`
      );
      const marksResult = await marksResponse.json();

      if (marksResponse.ok && marksResult.data && marksResult.data.length > 0) {
        interface MarkData {
          subject_id: string;
          max_marks: number;
          marks_obtained: number;
          remarks?: string | null;
          [key: string]: unknown;
        }
        const existingMarks: Record<string, Mark> = { ...marks };
        marksResult.data.forEach((m: MarkData) => {
          existingMarks[m.subject_id] = {
            subject_id: m.subject_id,
            max_marks: m.max_marks,
            marks_obtained: m.marks_obtained.toString(),
            remarks: m.remarks || '',
          };
        });
        setMarks(existingMarks);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (subjectId: string, field: 'marks_obtained' | 'remarks', value: string) => {
    setMarks((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [field]: value,
      },
    }));

    // Clear error for this field
    if (errors[`${subjectId}_${field}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`${subjectId}_${field}`];
        return newErrors;
      });
    }
  };

  const validateMarks = (): boolean => {
    const newErrors: Record<string, string> = {};

    subjects.forEach((es) => {
      const mark = marks[es.subject_id];
      if (!mark || !mark.marks_obtained || mark.marks_obtained.trim() === '') {
        newErrors[`${es.subject_id}_marks_obtained`] = 'Marks are required';
      } else {
        const marksObtained = parseInt(mark.marks_obtained);
        if (isNaN(marksObtained) || marksObtained < 0) {
          newErrors[`${es.subject_id}_marks_obtained`] = 'Marks must be a valid number >= 0';
        } else if (marksObtained > es.max_marks) {
          newErrors[`${es.subject_id}_marks_obtained`] = `Marks cannot exceed ${es.max_marks}`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateMarks()) {
      return;
    }

    setSaving(true);

    try {
      // Get class ID from exam
      if (!exam.class || !exam.class.id) {
        alert('Class information is missing for this examination. Please contact administrator.');
        setSaving(false);
        return;
      }
      const classId = exam.class.id;

      const marksArray = subjects.map((es) => ({
        subject_id: es.subject_id,
        max_marks: es.max_marks,
        marks_obtained: parseInt(marks[es.subject_id].marks_obtained) || 0,
        remarks: marks[es.subject_id].remarks || null,
      }));

      const response = await fetch('/api/examinations/marks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: teacher.school_code,
          exam_id: examId,
          student_id: studentId,
          class_id: classId,
          marks: marksArray,
          entered_by: teacher.id,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Marks saved successfully!');
        router.push(`/dashboard/teacher/examinations/${examId}`);
      } else {
        alert(result.error || 'Failed to save marks');
      }
    } catch (error) {
      console.error('Error saving marks:', error);
      alert('Failed to save marks. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!exam || !student) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Data not found</p>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/teacher/examinations/${examId}`)}
          className="mt-4"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </div>
    );
  }

  const totalMarks = subjects.reduce((sum, es) => {
    const mark = marks[es.subject_id];
    return sum + (mark && mark.marks_obtained ? parseInt(mark.marks_obtained) || 0 : 0);
  }, 0);
  const totalMaxMarks = subjects.reduce((sum, es) => sum + es.max_marks, 0);
  const percentage = totalMaxMarks > 0 ? ((totalMarks / totalMaxMarks) * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/teacher/examinations/${examId}`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Enter Marks</h1>
            <p className="text-gray-600">
              {exam.name} - {student.student_name} ({student.admission_no})
            </p>
          </div>
        </div>
      </motion.div>

      {/* Marks Entry Form */}
      <Card>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-black mb-4">Subject-wise Marks</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Subject</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Max Marks</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Marks Obtained</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((es) => {
                    const mark = marks[es.subject_id] || {
                      subject_id: es.subject_id,
                      max_marks: es.max_marks,
                      marks_obtained: '',
                      remarks: '',
                    };
                    const errorKey = `${es.subject_id}_marks_obtained`;
                    return (
                      <tr key={es.subject_id} className="border-b border-gray-100">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: es.subject.color || '#6366f1' }}
                            />
                            <span className="font-medium text-black">{es.subject.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-700">{es.max_marks}</td>
                        <td className="py-4 px-4">
                          <Input
                            type="number"
                            min="0"
                            max={es.max_marks}
                            value={mark.marks_obtained}
                            onChange={(e) =>
                              handleMarkChange(es.subject_id, 'marks_obtained', e.target.value)
                            }
                            error={errors[errorKey]}
                            className="w-32"
                            required
                          />
                        </td>
                        <td className="py-4 px-4">
                          <input
                            type="text"
                            value={mark.remarks}
                            onChange={(e) =>
                              handleMarkChange(es.subject_id, 'remarks', e.target.value)
                            }
                            placeholder="Optional remarks"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Marks</p>
                <p className="text-2xl font-bold text-black">
                  {totalMarks} / {totalMaxMarks}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Percentage</p>
                <p className="text-2xl font-bold text-black">{percentage}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-600" size={24} />
                  <span className="font-semibold text-green-600">Ready to Save</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Sticky Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-10">
        <div className="max-w-7xl mx-auto flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/teacher/examinations/${examId}`)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                Save Marks
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

