'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { FileText, Calendar, ArrowRight } from 'lucide-react';

interface Exam {
  id: string;
  exam_name: string;
  academic_year?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  subject_mappings?: Array<{
    subject_id: string;
    subject_name?: string;
    teacher_name?: string;
    max_marks?: number | null;
    pass_marks?: number | null;
  }>;
  total_max_marks?: number;
  total_pass_marks?: number;
}

export default function TeacherExaminationsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      fetchExams(teacherData);
    } else {
      setLoading(false);
    }
  }, []);

  const dateFormat = (dateStr: string | undefined) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
      : '—';

  const sortedExams = useMemo(() => {
    return [...exams].sort((a, b) => {
      const aStart = a.start_date ? new Date(a.start_date).getTime() : 0;
      const bStart = b.start_date ? new Date(b.start_date).getTime() : 0;
      return aStart - bStart;
    });
  }, [exams]);

  const fetchExams = async (teacherData: { school_code?: string; id?: string; staff_id?: string }) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('school_code', teacherData.school_code || '');
      if (teacherData.id) params.set('teacher_id', teacherData.id);
      if (teacherData.staff_id) params.set('staff_id', teacherData.staff_id);

      const response = await fetch(`/api/examinations/v2/teacher?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        const list = (result.data as Exam[]).filter(
          (e) => e.status === 'upcoming' || e.status === 'ongoing' || e.status === 'active' || e.status === 'completed'
        );
        setExams(list);
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent mx-auto mb-4" />
          <p className="text-emerald-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <FileText className="text-emerald-700 dark:text-emerald-400" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Examinations</h1>
              <p className="text-gray-600 dark:text-gray-400">View your upcoming exam schedules</p>
            </div>
          </div>
        </motion.div>

        {exams.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <FileText className="mx-auto mb-4 text-gray-400 dark:text-gray-500" size={48} />
              <p className="text-gray-600 dark:text-gray-400 text-lg">No examinations found</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                Examinations for your class(es) will appear here once they are created.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-5">
            {sortedExams.map((exam, index) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                            {exam.exam_name}
                          </h2>
                          <span
                            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium capitalize ${
                              exam.status === 'ongoing'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                : exam.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400'
                            }`}
                          >
                            {exam.status || 'upcoming'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                          <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-gray-400 dark:text-gray-500 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Start Date</p>
                              <p className="font-medium text-gray-900 dark:text-white">{dateFormat(exam.start_date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar size={18} className="text-gray-400 dark:text-gray-500 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">End Date</p>
                              <p className="font-medium text-gray-900 dark:text-white">{dateFormat(exam.end_date)}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Academic Year</p>
                            <p className="font-medium text-gray-900 dark:text-white">{exam.academic_year || '—'}</p>
                          </div>
                        </div>

                        {Array.isArray(exam.subject_mappings) && exam.subject_mappings.length > 0 && (
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 overflow-hidden">
                            <h4 className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
                              Subjects &amp; passing marks
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-gray-100/80 dark:bg-gray-800/80 text-left text-gray-600 dark:text-gray-400">
                                    <th className="py-3 px-4 font-semibold">Subject</th>
                                    <th className="py-3 px-4 font-semibold">Teacher</th>
                                    <th className="py-3 px-4 font-semibold text-right">Max marks</th>
                                    <th className="py-3 px-4 font-semibold text-right">Pass marks</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {exam.subject_mappings.map((sm, idx) => (
                                    <tr
                                      key={sm.subject_id ?? idx}
                                      className="border-t border-gray-100 dark:border-gray-700/80"
                                    >
                                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                                        {sm.subject_name ?? '—'}
                                      </td>
                                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                                        {sm.teacher_name ?? '—'}
                                      </td>
                                      <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                                        {sm.max_marks != null ? String(sm.max_marks) : '—'}
                                      </td>
                                      <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                                        {sm.pass_marks != null ? String(sm.pass_marks) : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-6 text-sm bg-gray-100/50 dark:bg-gray-800/30">
                              {exam.total_max_marks != null && (
                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                                  Total max marks: {String(exam.total_max_marks)}
                                </span>
                              )}
                              {exam.total_pass_marks != null && (
                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                                  Total pass marks: {String(exam.total_pass_marks)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 flex sm:flex-col gap-2">
                        <Button
                          onClick={() => router.push(`/teacher/dashboard/marks?exam_id=${exam.id}`)}
                          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Enter Marks
                          <ArrowRight size={16} className="ml-2" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
