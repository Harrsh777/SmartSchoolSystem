'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { FileText, Calendar, Award } from 'lucide-react';
import type { Student, Examination, Mark } from '@/lib/supabase';

export default function ExaminationsPage() {
  // student kept for potential future use
  const [, setStudent] = useState<Student | null>(null);
  const [exams, setExams] = useState<Examination[]>([]);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchExams(studentData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchExams = async (studentData: Student) => {
    try {
      const response = await fetch(
        `/api/examinations/v2/student?school_code=${studentData.school_code}&student_id=${studentData.id}`
      );
      const result = await response.json();
      if (response.ok && result.data) {
        // Filter to show upcoming and ongoing exams
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeExams = result.data.filter((exam: Examination) => {
          if (!exam.start_date) return false;
          const startDate = new Date(exam.start_date);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(exam.end_date || exam.start_date);
          endDate.setHours(0, 0, 0, 0);
          return (exam.status === 'upcoming' || exam.status === 'ongoing' || !exam.status) && 
                 (today >= startDate && today <= endDate || today < startDate);
        });
        setExams(activeExams);
        // Fetch marks for this student
        fetchMarks(studentData);
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarks = async (studentData: Student) => {
    try {
      const response = await fetch(
        `/api/marks?school_code=${studentData.school_code}&student_id=${studentData.id}`
      );
      const result = await response.json();
      if (response.ok && result.data) {
        const marksMap: Record<string, Mark> = {};
        result.data.forEach((mark: Mark) => {
          marksMap[mark.exam_id] = mark;
        });
        setMarks(marksMap);
      }
    } catch (err) {
      console.error('Error fetching marks:', err);
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

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Examinations</h1>
          <p className="text-gray-600">View your upcoming exam schedules</p>
        </div>
      </motion.div>

      {exams.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 text-lg">No upcoming examinations</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => {
            const mark = marks[exam.id!];
            const isPass = mark ? (mark.percentage || 0) >= 40 : false;
            
            return (
              <Card key={exam.id} hover>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-black">{exam.exam_name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        exam.status === 'ongoing' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : exam.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {exam.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">Start Date</p>
                          <p className="font-medium text-black">
                            {exam.start_date ? new Date(exam.start_date).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-600">End Date</p>
                          <p className="font-medium text-black">
                            {exam.end_date ? new Date(exam.end_date).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Academic Year</p>
                        <p className="font-medium text-black">{exam.academic_year}</p>
                      </div>
                    </div>

                    {/* Subjects, teachers, total / passing marks */}
                    {Array.isArray(exam.subject_mappings) && exam.subject_mappings.length > 0 && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-3">Subjects &amp; passing marks</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 text-left text-gray-600">
                                <th className="pb-2 pr-4">Subject</th>
                                <th className="pb-2 pr-4">Teacher</th>
                                <th className="pb-2 pr-4">Max marks</th>
                                <th className="pb-2">Pass marks</th>
                              </tr>
                            </thead>
                            <tbody>
                              {exam.subject_mappings.map((sm: { subject_id?: string; subject_name?: string; teacher_name?: string; max_marks?: number; pass_marks?: number }, idx: number) => (
                                <tr key={sm.subject_id ?? idx} className="border-b border-gray-100">
                                  <td className="py-2 pr-4 font-medium text-black">
                                    {typeof sm.subject_name === "string" && sm.subject_name.length > 0 ? sm.subject_name : '—'}
                                  </td>
                                  <td className="py-2 pr-4 text-gray-700">
                                    {typeof sm.teacher_name === "string" && sm.teacher_name.length > 0 ? sm.teacher_name : '—'}
                                  </td>
                                  <td className="py-2 pr-4 text-gray-700">
                                    {sm.max_marks != null ? String(sm.max_marks) : '—'}
                                  </td>
                                  <td className="py-2 text-gray-700">
                                    {sm.pass_marks != null ? String(sm.pass_marks) : '—'}
                                  </td>
                                </tr>
                              ))}
                             
                            </tbody>
                          </table>
                        </div>
                        {(exam.total_max_marks != null || exam.total_pass_marks != null) && (
                          <div className="mt-3 pt-3 border-t border-gray-200 flex gap-6 text-sm">
                            {exam.total_max_marks != null && (
                              <span className="text-gray-700"><strong>Total max marks:</strong> {String(exam.total_max_marks)}</span>
                            )}
                            {exam.total_pass_marks != null && (
                              <span className="text-gray-700"><strong>Total pass marks:</strong> {String(exam.total_pass_marks)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Marks Display */}
                    {typeof mark === "object" && mark !== null && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <Award className={isPass ? 'text-green-600' : 'text-red-600'} size={20} />
                          <h4 className="font-semibold text-gray-900">Your Results</h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Marks Obtained</p>
                            <p className={`text-lg font-bold ${isPass ? 'text-green-600' : 'text-red-600'}`}>
                              {/* Safely access marks_obtained and max_marks */}
                              {'marks_obtained' in mark && 'max_marks' in mark ? (
                                <>
                                  {mark.marks_obtained} / {mark.max_marks}
                                </>
                              ) : (
                                'N/A'
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Percentage</p>
                            <p className={`text-lg font-bold ${isPass ? 'text-green-600' : 'text-red-600'}`}>
                              {'percentage' in mark && typeof mark.percentage === 'number'
                                ? mark.percentage.toFixed(2)
                                : "0.00"
                              }%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Grade</p>
                            <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${
                              'grade' in mark && (
                                mark.grade === 'A+' || mark.grade === 'A'
                                  ? 'bg-green-100 text-green-800'
                                  : mark.grade === 'B+' || mark.grade === 'B'
                                  ? 'bg-blue-100 text-blue-800'
                                  : mark.grade === 'C'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : mark.grade === 'D'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-red-100 text-red-800'
                              )
                            }`}>
                              {'grade' in mark ? mark.grade : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Status</p>
                            <p className={`text-sm font-medium ${isPass ? 'text-green-600' : 'text-red-600'}`}>
                              {isPass ? 'Passed' : 'Failed'}
                            </p>
                          </div>
                        </div>
                        {'remarks' in mark && mark.remarks && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-600">Remarks:</p>
                            <p className="text-sm text-gray-900">{mark.remarks}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {typeof exam.description === "string" && exam.description.length > 0 && (
                      <p className="text-sm text-gray-600 mt-4">{exam.description}</p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

