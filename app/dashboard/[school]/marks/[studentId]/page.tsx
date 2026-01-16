'use client';

import { use, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  Download,
  Printer,
  FileText,
  BookOpen,
  Calendar,
  User,
  GraduationCap,
} from 'lucide-react';

export default function StudentReportPage({
  params,
}: {
  params: Promise<{ school: string; studentId: string }>;
}) {
  const { school: schoolCode, studentId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = searchParams.get('exam_id');

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<{
    id: string;
    student_name?: string;
    full_name?: string;
    admission_no?: string;
    class?: string;
    section?: string;
    roll_number?: string;
  } | null>(null);
  const [exam, setExam] = useState<{
    id: string;
    exam_name?: string;
    name?: string;
    academic_year?: string;
    start_date?: string;
    end_date?: string;
  } | null>(null);
  const [marks, setMarks] = useState<Array<{
    id: string;
    subject_id: string;
    subject_name?: string;
    subject?: {
      name?: string;
    };
    marks_obtained: number;
    max_marks: number;
    percentage?: number;
    grade?: string;
    remarks?: string;
  }>>([]);
  const [summary, setSummary] = useState<{
    total_marks: number;
    total_max_marks?: number;
    obtained_marks: number;
    percentage?: number;
    grade: string;
  } | null>(null);

  useEffect(() => {
    if (examId) {
      fetchReportData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, examId, schoolCode]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Fetch student details
      const studentRes = await fetch(`/api/students?school_code=${schoolCode}&student_id=${studentId}`);
      const studentData = await studentRes.json();
      if (studentRes.ok && studentData.data && studentData.data.length > 0) {
        setStudent(studentData.data[0]);
      }

      // Fetch exam details
      const examRes = await fetch(`/api/examinations/${examId}`);
      const examData = await examRes.json();
      if (examRes.ok && examData.data) {
        setExam(examData.data);
      }

      // Fetch marks
      const marksRes = await fetch(`/api/examinations/marks?exam_id=${examId}&student_id=${studentId}`);
      const marksData = await marksRes.json();
      if (marksRes.ok && marksData.data) {
        setMarks(marksData.data);
      }

      // Fetch summary
      const summaryRes = await fetch(`/api/examinations/summary?exam_id=${examId}&student_id=${studentId}`);
      const summaryData = await summaryRes.json();
      if (summaryRes.ok && summaryData.data) {
        setSummary(summaryData.data);
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/marks/report-card?school_code=${schoolCode}&student_id=${studentId}&exam_id=${examId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_card_${student?.student_name || studentId}_${exam?.exam_name || examId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
      alert('Failed to download report card');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (!student || !exam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Report data not found</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft size={18} className="mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const isPass = (summary?.percentage || 0) >= 40;

  return (
    <div className="space-y-6 pb-20 print:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <FileText className="text-orange-500" size={32} />
            Student Report Card
          </h1>
          <p className="text-gray-600">{student.student_name || student.full_name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer size={18} className="mr-2" />
            Print
          </Button>
          <Button onClick={handleDownloadPDF} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Download size={18} className="mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Report Card */}
      <Card className="p-8 print:shadow-none print:border-2">
        {/* School Header */}
        <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">REPORT CARD</h2>
          <p className="text-lg text-gray-700">{exam.exam_name || exam.name}</p>
          <p className="text-sm text-gray-600 mt-2">
            Academic Year: {exam.academic_year || 'N/A'}
          </p>
        </div>

        {/* Student Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="text-orange-500" size={20} />
              <span className="font-semibold text-gray-700">Student Name:</span>
              <span className="text-gray-900">{student.student_name || student.full_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="text-orange-500" size={20} />
              <span className="font-semibold text-gray-700">Class:</span>
              <span className="text-gray-900">{student.class || 'N/A'} {student.section ? `- ${student.section}` : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Roll Number:</span>
              <span className="text-gray-900">{student.roll_number || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Admission No:</span>
              <span className="text-gray-900">{student.admission_no || 'N/A'}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="text-orange-500" size={20} />
              <span className="font-semibold text-gray-700">Exam Date:</span>
              <span className="text-gray-900">
                {exam.start_date ? new Date(exam.start_date).toLocaleDateString() : 'N/A'}
                {exam.end_date && exam.end_date !== exam.start_date && ` - ${new Date(exam.end_date).toLocaleDateString()}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="text-orange-500" size={20} />
              <span className="font-semibold text-gray-700">Total Subjects:</span>
              <span className="text-gray-900">{marks.length}</span>
            </div>
          </div>
        </div>

        {/* Marks Table */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Subject-wise Marks</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">Subject</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Max Marks</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Marks Obtained</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Percentage</th>
                  <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-700">Grade</th>
                  <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {marks.map((mark, idx) => {
                  const percentage = mark.max_marks > 0 ? (mark.marks_obtained / mark.max_marks) * 100 : 0;
                  const isSubjectPass = percentage >= 40;
                  return (
                    <motion.tr
                      key={mark.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={isSubjectPass ? 'bg-green-50' : 'bg-red-50'}
                    >
                      <td className="border border-gray-300 px-4 py-3 font-medium text-gray-900">
                        {mark.subject?.name || mark.subject_name || 'N/A'}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center text-gray-700">
                        {mark.max_marks}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">
                        {mark.marks_obtained}
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className={isSubjectPass ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {percentage.toFixed(2)}%
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-center">
                        <span className={isSubjectPass ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {mark.grade || 'N/A'}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-3 text-gray-600">
                        {mark.remarks || '-'}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="text-center">
                <p className="text-blue-100 text-sm mb-2">Total Marks</p>
                <p className="text-3xl font-bold">
                  {summary.total_marks || 0} / {summary.total_max_marks || 0}
                </p>
              </div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <div className="text-center">
                <p className="text-purple-100 text-sm mb-2">Percentage</p>
                <p className="text-3xl font-bold">{summary.percentage?.toFixed(2) || 0}%</p>
              </div>
            </Card>
            <Card className={`p-6 text-white ${isPass ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
              <div className="text-center">
                <p className="text-white/80 text-sm mb-2">Grade</p>
                <p className="text-3xl font-bold">{summary.grade || 'N/A'}</p>
                <p className="text-sm mt-2">{isPass ? 'PASS' : 'FAIL'}</p>
              </div>
            </Card>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 pt-8 border-t-2 border-gray-300">
          <div className="text-center">
            <div className="border-t-2 border-gray-400 pt-2 mt-16">
              <p className="font-semibold text-gray-700">Class Teacher</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-gray-400 pt-2 mt-16">
              <p className="font-semibold text-gray-700">Principal</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-gray-400 pt-2 mt-16">
              <p className="font-semibold text-gray-700">Date</p>
              <p className="text-gray-600 mt-2">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
