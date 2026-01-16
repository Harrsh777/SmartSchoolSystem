'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, User, CheckCircle, Clock, Search } from 'lucide-react';
import { getString } from '@/lib/type-utils';

interface Student {
  id: string;
  admission_no: string;
  student_name: string;
  class: string;
  section: string;
}

interface ExamSummary {
  exam_id: string;
  student_id: string;
  total_marks: number;
  total_max_marks: number;
  percentage: number;
}

export default function ExamMarkEntryPage({
  params,
}: {
  params: Promise<{ examId: string }>;
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
    exam_subjects?: Array<{ id: string; subject_id: string; max_marks: number; subject: { id: string; name: string; color: string } }>;
    [key: string]: unknown;
  }

  const { examId } = use(params);
  const router = useRouter();
  // teacher kept for potential future use
  const [, setTeacher] = useState<TeacherData | null>(null);
  const [exam, setExam] = useState<ExamData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [summaries, setSummaries] = useState<Record<string, ExamSummary>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      fetchData(teacherData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const fetchData = async (teacherData: TeacherData) => {
    try {
      setLoading(true);

      const schoolCode = getString(teacherData.school_code);
      const teacherId = getString(teacherData.id);
      if (!schoolCode || !teacherId) {
        setLoading(false);
        return;
      }

      // Fetch exam details
      const examResponse = await fetch(
        `/api/examinations/${examId}?school_code=${schoolCode}`
      );
      const examResult = await examResponse.json();

      if (examResponse.ok && examResult.data) {
        setExam(examResult.data);

        // Fetch assigned class
        const queryParams = new URLSearchParams({
          school_code: schoolCode,
          teacher_id: teacherId,
        });
        const staffId = getString(teacherData.staff_id);
        if (staffId) {
          queryParams.append('staff_id', staffId);
        }

        const classResponse = await fetch(`/api/classes/teacher?${queryParams.toString()}`);
        const classResult = await classResponse.json();

        if (classResponse.ok && classResult.data) {
          // Fetch students for this class
          const studentsResponse = await fetch(
            `/api/students?school_code=${schoolCode}&class=${classResult.data.class}&section=${classResult.data.section}&status=active`
          );
          const studentsResult = await studentsResponse.json();

          if (studentsResponse.ok && studentsResult.data) {
            setStudents(studentsResult.data);

            // Fetch summaries for all students
            const summariesMap: Record<string, ExamSummary> = {};
            await Promise.all(
              studentsResult.data.map(async (student: Student) => {
                const summaryResponse = await fetch(
                  `/api/examinations/summary?school_code=${schoolCode}&exam_id=${examId}&student_id=${student.id}`
                );
                const summaryResult = await summaryResponse.json();
                if (summaryResponse.ok && summaryResult.data) {
                  summariesMap[student.id] = summaryResult.data;
                }
              })
            );
            setSummaries(summariesMap);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (studentId: string): 'completed' | 'pending' => {
    const summary = summaries[studentId];
    if (summary && summary.total_marks > 0) {
      return 'completed';
    }
    return 'pending';
  };

  const filteredStudents = students.filter((student) =>
    student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.admission_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  if (!exam) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Examination not found</p>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/teacher/examinations')}
          className="mt-4"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Examinations
        </Button>
      </div>
    );
  }

  const completedCount = students.filter((s) => getStatus(s.id) === 'completed').length;
  const pendingCount = students.filter((s) => getStatus(s.id) === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/teacher/examinations')}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">{getString(exam.name) || 'Examination'}</h1>
            {exam.class && typeof exam.class === 'object' && 'class' in exam.class && 'section' in exam.class ? (
              <p className="text-gray-600">
                Class {(exam.class as { class: string; section: string }).class} - Section {(exam.class as { class: string; section: string }).section}
              </p>
            ) : (
              <p className="text-gray-500 text-sm">Class information not available</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Students</p>
              <p className="text-2xl font-bold text-black">{students.length}</p>
            </div>
            <User className="text-gray-400" size={32} />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </div>
            <CheckCircle className="text-green-400" size={32} />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
            </div>
            <Clock className="text-orange-400" size={32} />
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name or admission number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
          />
        </div>
      </Card>

      {/* Students List */}
      <Card>
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <User className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">No students found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Admission No</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Total Marks</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Percentage</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const status = getStatus(student.id);
                  const summary = summaries[student.id];
                  return (
                    <tr
                      key={student.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4 font-medium text-black">{student.student_name}</td>
                      <td className="py-4 px-4 text-gray-700">{student.admission_no}</td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {status === 'completed' ? (
                            <>
                              <CheckCircle size={14} className="mr-1" />
                              Completed
                            </>
                          ) : (
                            <>
                              <Clock size={14} className="mr-1" />
                              Pending
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-700">
                        {summary
                          ? `${summary.total_marks} / ${summary.total_max_marks}`
                          : '-'}
                      </td>
                      <td className="py-4 px-4 text-gray-700">
                        {summary ? `${summary.percentage}%` : '-'}
                      </td>
                      <td className="py-4 px-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            router.push(
                              `/dashboard/teacher/examinations/${examId}/student/${student.id}`
                            )
                          }
                        >
                          {status === 'completed' ? 'Edit Marks' : 'Enter Marks'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

