'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { FileText, Download, Filter, TrendingUp } from 'lucide-react';
import type { Mark, Examination } from '@/lib/supabase';

interface MarkWithDetails extends Mark {
  student?: {
    id: string;
    admission_no: string;
    student_name: string;
    class: string;
    section: string;
    roll_number?: string;
  };
  examination?: {
    id: string;
    exam_name: string;
    academic_year: string;
  };
}

export default function MarksOverviewPage({
  params,
}: {
  params: Promise<{ school: string; examId: string }>;
}) {
  const { school: schoolCode, examId } = use(params);
  const router = useRouter();
  const [examination, setExamination] = useState<Examination | null>(null);
  const [marks, setMarks] = useState<MarkWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState<string>('all');
  const [classes, setClasses] = useState<string[]>([]);

  useEffect(() => {
    fetchExamination();
    fetchMarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, schoolCode]);

  useEffect(() => {
    if (marks.length > 0) {
      const uniqueClasses = Array.from(new Set(marks.map(m => m.student?.class).filter(Boolean))) as string[];
      setClasses(uniqueClasses.sort());
    }
  }, [marks]);

  const fetchExamination = async () => {
    try {
      const response = await fetch(`/api/examinations/${examId}?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setExamination(result.data);
      }
    } catch (err) {
      console.error('Error fetching examination:', err);
    }
  };

  const fetchMarks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/marks?school_code=${schoolCode}&exam_id=${examId}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setMarks(result.data);
      }
    } catch (err) {
      console.error('Error fetching marks:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMarks = classFilter === 'all' 
    ? marks 
    : marks.filter(m => m.student?.class === classFilter);

  const calculateStats = () => {
    const total = filteredMarks.length;
    const passed = filteredMarks.filter(m => (m.percentage || 0) >= 40).length;
    const failed = total - passed;
    const average = total > 0 
      ? filteredMarks.reduce((sum, m) => sum + (m.percentage || 0), 0) / total 
      : 0;

    return { total, passed, failed, average };
  };

  const stats = calculateStats();

  const exportToCSV = () => {
    const headers = ['Roll No', 'Admission No', 'Student Name', 'Class', 'Section', 'Marks Obtained', 'Max Marks', 'Percentage', 'Grade', 'Remarks'];
    const rows = filteredMarks.map(m => [
      m.student?.roll_number || '-',
      m.student?.admission_no || '-',
      m.student?.student_name || '-',
      m.student?.class || '-',
      m.student?.section || '-',
      m.marks_obtained,
      m.max_marks,
      (m.percentage || 0).toFixed(2),
      m.grade || '-',
      m.remarks || '-',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${examination?.exam_name || 'marks'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading marks...</p>
        </div>
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
            <button
              onClick={() => router.push(`/dashboard/${schoolCode}/examinations`)}
              className="text-gray-600 hover:text-black mb-2"
            >
              ← Back to Examinations
            </button>
            <h1 className="text-3xl font-bold text-black mb-2">
              {examination?.exam_name || 'Marks Overview'}
            </h1>
            <p className="text-gray-600">
              {examination?.academic_year} • {examination?.status}
            </p>
          </div>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Students</p>
              <p className="text-3xl font-bold text-black">{stats.total}</p>
            </div>
            <FileText className="text-indigo-600" size={32} />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Passed</p>
              <p className="text-3xl font-bold text-green-600">{stats.passed}</p>
            </div>
            <TrendingUp className="text-green-600" size={32} />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Failed</p>
              <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
            </div>
            <TrendingUp className="text-red-600" size={32} />
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Average %</p>
              <p className="text-3xl font-bold text-black">{stats.average.toFixed(1)}%</p>
            </div>
            <TrendingUp className="text-blue-600" size={32} />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <div className="flex items-center gap-4">
            <Filter className="text-gray-600" size={20} />
            <label className="text-sm font-medium text-gray-700">Filter by Class:</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Classes</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </Card>
      </motion.div>

      {/* Marks Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          {filteredMarks.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">No marks found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Roll No</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Admission No</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Student Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Class</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Section</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Marks</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Percentage</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Grade</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Entered By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMarks.map((mark) => {
                    const isPass = (mark.percentage || 0) >= 40;
                    return (
                      <tr
                        key={mark.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-gray-700">{mark.student?.roll_number || '-'}</td>
                        <td className="py-3 px-4 text-gray-700">{mark.student?.admission_no || '-'}</td>
                        <td className="py-3 px-4 font-medium text-black">{mark.student?.student_name || '-'}</td>
                        <td className="py-3 px-4 text-gray-700">{mark.student?.class || '-'}</td>
                        <td className="py-3 px-4 text-gray-700">{mark.student?.section || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={isPass ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {mark.marks_obtained} / {mark.max_marks}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={isPass ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            {(mark.percentage || 0).toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${
                            mark.grade === 'A+' || mark.grade === 'A' ? 'bg-green-100 text-green-800' :
                            mark.grade === 'B+' || mark.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                            mark.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                            mark.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {mark.grade || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700 text-sm">{mark.entered_by_name || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

