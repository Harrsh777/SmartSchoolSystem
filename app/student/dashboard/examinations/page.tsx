'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { FileText, Calendar, Award, Download } from 'lucide-react';
import type { Student, Examination, Mark } from '@/lib/supabase';

interface ExamScheduleItem {
  id?: string;
  exam_date?: string;
  start_time?: string;
  end_time?: string;
  subject?: string;
}

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
        // Show all exams (upcoming, ongoing, and previous). Sort: upcoming/ongoing first, then by start_date desc
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const all = (result.data as Examination[]).filter((exam: Examination) => exam.start_date);
        const sorted = [...all].sort((a, b) => {
          const endA = new Date(a.end_date || a.start_date!).getTime();
          const endB = new Date(b.end_date || b.start_date!).getTime();
          const aPast = endA < today.getTime();
          const bPast = endB < today.getTime();
          if (aPast !== bPast) return aPast ? 1 : -1; // upcoming/ongoing first
          return endB - endA; // then by end date descending (most recent first within same group)
        });
        setExams(sorted);
        fetchMarks(studentData);
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const getExamDisplayStatus = (exam: Examination): 'upcoming' | 'ongoing' | 'completed' => {
    const status = (exam as { status?: string }).status;
    if (status === 'upcoming' || status === 'ongoing' || status === 'completed') return status;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = exam.start_date ? new Date(exam.start_date) : null;
    const end = exam.end_date ? new Date(exam.end_date) : (exam.start_date ? new Date(exam.start_date) : null);
    if (!end) return 'upcoming';
    end.setHours(23, 59, 59, 999);
    if (end < today) return 'completed';
    if (start && start.setHours(0, 0, 0, 0) && start > today) return 'upcoming';
    return 'ongoing';
  };

  const getScheduleForSubject = (exam: Examination, subjectName: string, index: number): ExamScheduleItem | null => {
    const schedules = (exam as { schedules?: ExamScheduleItem[] }).schedules;
    if (!schedules || schedules.length === 0) return null;
    const byName = schedules.find((s) => s.subject && String(s.subject).trim().toLowerCase() === String(subjectName).trim().toLowerCase());
    if (byName) return byName;
    return schedules[index] ?? schedules[0] ?? null;
  };

  const renderExamCard = (
    exam: Examination,
    marksMap: Record<string, Mark>,
    getSched: (exam: Examination, subjectName: string, index: number) => ExamScheduleItem | null,
    getStatus: (exam: Examination) => 'upcoming' | 'ongoing' | 'completed',
    downloadDateSheetFn: (exam: Examination) => void
  ) => {
    const mark = marksMap[exam.id!];
    const isPass = mark ? ((mark as { percentage?: number }).percentage ?? 0) >= 40 : false;
    const displayStatus = getStatus(exam);
    const statusLabel = displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1);
    return (
      <Card key={exam.id} hover>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              {exam.start_date && (
                <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                  {new Date(exam.start_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}
                  {exam.end_date && exam.end_date !== exam.start_date
                    ? ` – ${new Date(exam.end_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}`
                    : ''}
                </span>
              )}
              <h3 className="text-xl font-bold text-black">{exam.exam_name}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                displayStatus === 'ongoing'
                  ? 'bg-yellow-100 text-yellow-800'
                  : displayStatus === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {statusLabel}
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
            {Array.isArray(exam.subject_mappings) && exam.subject_mappings.length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Subjects &amp; passing marks</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-600">
                        <th className="pb-2 pr-4">Subject</th>
                        <th className="pb-2 pr-4">Date</th>
                        <th className="pb-2 pr-4">Teacher</th>
                        <th className="pb-2 pr-4">Max marks</th>
                        <th className="pb-2">Pass marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exam.subject_mappings.map((sm: { subject_id?: string; subject_name?: string; teacher_name?: string; max_marks?: number; pass_marks?: number }, idx: number) => {
                        const subjName = typeof sm.subject_name === 'string' && sm.subject_name.length > 0 ? sm.subject_name : '—';
                        const schedule = getSched(exam, subjName, idx);
                        const dateDisplay = schedule?.exam_date
                          ? new Date(schedule.exam_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                          : exam.start_date ? new Date(exam.start_date).toLocaleDateString('en-US') : '—';
                        const timeDisplay = schedule?.start_time && schedule?.end_time ? `${schedule.start_time} - ${schedule.end_time}` : '';
                        return (
                          <tr key={sm.subject_id ?? idx} className="border-b border-gray-100">
                            <td className="py-2 pr-4 font-medium text-black">{subjName}</td>
                            <td className="py-2 pr-4 text-gray-700">
                              <span className="block">{dateDisplay}</span>
                              {timeDisplay && <span className="block text-xs text-gray-500">{timeDisplay}</span>}
                            </td>
                            <td className="py-2 pr-4 text-gray-700">{typeof sm.teacher_name === 'string' && sm.teacher_name.length > 0 ? sm.teacher_name : '—'}</td>
                            <td className="py-2 pr-4 text-gray-700">{sm.max_marks != null ? String(sm.max_marks) : '—'}</td>
                            <td className="py-2 text-gray-700">{sm.pass_marks != null ? String(sm.pass_marks) : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {(exam.total_max_marks != null || exam.total_pass_marks != null) && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex gap-6 text-sm">
                    {exam.total_max_marks != null && <span className="text-gray-700"><strong>Total max marks:</strong> {String(exam.total_max_marks)}</span>}
                    {exam.total_pass_marks != null && <span className="text-gray-700"><strong>Total pass marks:</strong> {String(exam.total_pass_marks)}</span>}
                  </div>
                )}
              </div>
            )}
            {typeof mark === 'object' && mark !== null && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Award className={isPass ? 'text-green-600' : 'text-red-600'} size={20} />
                  <h4 className="font-semibold text-gray-900">Your Results</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Marks Obtained</p>
                    <p className={`text-lg font-bold ${isPass ? 'text-green-600' : 'text-red-600'}`}>
                      {'marks_obtained' in mark && 'max_marks' in mark ? <>{mark.marks_obtained} / {mark.max_marks}</> : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Percentage</p>
                    <p className={`text-lg font-bold ${isPass ? 'text-green-600' : 'text-red-600'}`}>
                      {'percentage' in mark && typeof (mark as { percentage?: number }).percentage === 'number' ? (mark as { percentage: number }).percentage.toFixed(2) : '0.00'}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Grade</p>
                    <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${
                      'grade' in mark && (
                        (mark as { grade?: string }).grade === 'A+' || (mark as { grade?: string }).grade === 'A' ? 'bg-green-100 text-green-800'
                        : (mark as { grade?: string }).grade === 'B+' || (mark as { grade?: string }).grade === 'B' ? 'bg-blue-100 text-blue-800'
                        : (mark as { grade?: string }).grade === 'C' ? 'bg-yellow-100 text-yellow-800'
                        : (mark as { grade?: string }).grade === 'D' ? 'bg-orange-100 text-orange-800'
                        : 'bg-red-100 text-red-800'
                      )
                    }`}>
                      {'grade' in mark ? (mark as { grade?: string }).grade : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <p className={`text-sm font-medium ${isPass ? 'text-green-600' : 'text-red-600'}`}>{isPass ? 'Passed' : 'Failed'}</p>
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
            {typeof exam.description === 'string' && exam.description.length > 0 && (
              <p className="text-sm text-gray-600 mt-4">{exam.description}</p>
            )}
          </div>
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => downloadDateSheetFn(exam)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download size={18} />
              Download date sheet
            </button>
          </div>
        </div>
      </Card>
    );
  };

  const downloadDateSheet = (exam: Examination) => {
    const subjectMappings = Array.isArray(exam.subject_mappings) ? exam.subject_mappings : [];
    const rows = subjectMappings.map((sm: { subject_name?: string; teacher_name?: string; max_marks?: number; pass_marks?: number }, idx: number) => {
      const subjName = typeof sm.subject_name === 'string' ? sm.subject_name : '—';
      const schedule = getScheduleForSubject(exam, subjName, idx);
      const dateStr = schedule?.exam_date ? new Date(schedule.exam_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : (exam.start_date ? new Date(exam.start_date).toLocaleDateString('en-US') : '—');
      const timeStr = schedule?.start_time && schedule?.end_time ? `${schedule.start_time} - ${schedule.end_time}` : '—';
      return { subject: subjName, date: dateStr, time: timeStr, max_marks: sm.max_marks ?? '—', pass_marks: sm.pass_marks ?? '—' };
    });
    const examName = (exam.exam_name || 'Exam').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Date Sheet - ${examName}</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 700px; margin: 24px auto; padding: 0 16px; }
h1 { font-size: 1.5rem; margin-bottom: 4px; }
.meta { color: #666; font-size: 0.875rem; margin-bottom: 20px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
th { background: #f5f5f5; font-weight: 600; }
</style>
</head>
<body>
<h1>${examName}</h1>
<div class="meta">Academic Year: ${exam.academic_year || '—'} &nbsp;|&nbsp; Start: ${exam.start_date ? new Date(exam.start_date).toLocaleDateString('en-US') : '—'} &nbsp;|&nbsp; End: ${exam.end_date ? new Date(exam.end_date).toLocaleDateString('en-US') : '—'}</div>
<table>
<thead><tr><th>Subject</th><th>Date</th><th>Time</th><th>Max Marks</th><th>Pass Marks</th></tr></thead>
<tbody>
${rows.map((r) => `<tr><td>${r.subject}</td><td>${r.date}</td><td>${r.time}</td><td>${r.max_marks}</td><td>${r.pass_marks}</td></tr>`).join('\n')}
</tbody>
</table>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Date_Sheet_${(exam.exam_name || 'Exam').replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
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
          <p className="text-gray-600">View your exam schedules and results (upcoming and previous)</p>
        </div>
      </motion.div>

      {exams.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 text-lg">No examinations found</p>
            <p className="text-gray-500 text-sm mt-1">Exams for your class will appear here once they are created.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const upcomingOngoing = exams.filter((e) => {
              const end = new Date(e.end_date || e.start_date || 0);
              end.setHours(23, 59, 59, 999);
              return end >= today;
            });
            const previous = exams.filter((e) => {
              const end = new Date(e.end_date || e.start_date || 0);
              end.setHours(23, 59, 59, 999);
              return end < today;
            });
            return (
              <>
                {upcomingOngoing.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-black mb-3">Upcoming & ongoing</h2>
                    <div className="space-y-4">
                      {upcomingOngoing.map((exam) => renderExamCard(exam, marks, getScheduleForSubject, getExamDisplayStatus, downloadDateSheet))}
                    </div>
                  </div>
                )}
                {previous.length > 0 && (
                  <div className={upcomingOngoing.length > 0 ? 'mt-8' : ''}>
                    <h2 className="text-lg font-semibold text-black mb-3">Previous examinations</h2>
                    <div className="space-y-4">
                      {previous.map((exam) => renderExamCard(exam, marks, getScheduleForSubject, getExamDisplayStatus, downloadDateSheet))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
