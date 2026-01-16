'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  ArrowLeft,
  RefreshCw,
  Users,
  BarChart3,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Award,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface StudentMark {
  id: string;
  student_id: string;
  exam_id: string;
  total_marks: number;
  total_max_marks: number;
  percentage: number;
  grade: string;
  result_status: string;
  student: {
    id: string;
    student_name: string;
    full_name?: string;
    admission_no: string;
    roll_number: string;
    class: string;
    section: string;
    photo_url?: string;
  };
  exam: {
    id: string;
    exam_name: string;
    name?: string;
    academic_year: string;
    start_date: string;
    end_date: string;
  };
  subject_marks?: Array<{
    id: string;
    subject_id: string;
    marks_obtained: number;
    max_marks: number;
    percentage: number;
    grade: string;
    subject: {
      id: string;
      name: string;
      color: string;
    };
  }>;
}

interface Analytics {
  total_students: number;
  passed: number;
  failed: number;
  average_percentage: number;
  toppers: Array<{
    student_name: string;
    percentage: number;
    grade: string;
  }>;
}

export default function MarksDashboardPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [marks, setMarks] = useState<StudentMark[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [classes, setClasses] = useState<Array<{ id: string; class: string; section?: string }>>([]);
  const [examinations, setExaminations] = useState<Array<{ id: string; exam_name: string; name?: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [sections, setSections] = useState<string[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    class_id: '',
    section: '',
    exam_id: '',
    subject_id: '',
    search: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch initial data
  useEffect(() => {
    fetchClasses();
    fetchExaminations();
    fetchSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  // Fetch marks when filters change
  useEffect(() => {
    if (filters.exam_id) {
      fetchMarks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, schoolCode]);

  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setClasses(result.data);
        // Extract unique sections
        const sectionsArray = (result.data as Array<{ section?: string }>)
          .map((c) => c.section)
          .filter((s): s is string => typeof s === 'string' && s.length > 0);
        const uniqueSections: string[] = [...new Set(sectionsArray)];
        setSections(uniqueSections.sort());
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchExaminations = async () => {
    try {
      const response = await fetch(`/api/examinations?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setExaminations(result.data);
      }
    } catch (err) {
      console.error('Error fetching examinations:', err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch(`/api/subjects?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setSubjects(result.data);
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  const fetchMarks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        school_code: schoolCode,
        ...(filters.exam_id && { exam_id: filters.exam_id }),
        ...(filters.class_id && { class_id: filters.class_id }),
        ...(filters.section && { section: filters.section }),
        ...(filters.subject_id && { subject_id: filters.subject_id }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/marks/view?${params}`);
      const result = await response.json();

      if (response.ok) {
        setMarks(result.data || []);
        setAnalytics(result.analytics || null);
      } else {
        console.error('Error fetching marks:', result.error);
      }
    } catch (err) {
      console.error('Error fetching marks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered and paginated marks
  const filteredMarks = useMemo(() => {
    return marks;
  }, [marks]);

  const paginatedMarks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMarks.slice(start, start + itemsPerPage);
  }, [filteredMarks, currentPage]);

  const totalPages = Math.ceil(filteredMarks.length / itemsPerPage);

  // Get grade color
  const getGradeColor = (grade: string) => {
    if (grade?.includes('A+') || grade?.includes('A')) return 'text-green-600 font-semibold';
    if (grade?.includes('B')) return 'text-blue-600 font-semibold';
    if (grade?.includes('C')) return 'text-yellow-600 font-semibold';
    if (grade?.includes('D')) return 'text-orange-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  // Download handlers
  const handleDownloadReportCard = async (studentId: string, examId: string) => {
    try {
      const response = await fetch(`/api/marks/report-card?school_code=${schoolCode}&student_id=${studentId}&exam_id=${examId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_card_${studentId}_${examId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error downloading report card:', err);
      alert('Failed to download report card');
    }
  };

  const handleBulkDownload = async () => {
    if (!filters.exam_id) {
      alert('Please select an examination first');
      return;
    }

    try {
      const params = new URLSearchParams({
        school_code: schoolCode,
        exam_id: filters.exam_id,
        ...(filters.class_id && { class_id: filters.class_id }),
        ...(filters.section && { section: filters.section }),
      });

      const response = await fetch(`/api/marks/bulk-download?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_cards_${filters.exam_id}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error downloading bulk report cards:', err);
      alert('Failed to download report cards');
    }
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams({
        school_code: schoolCode,
        ...(filters.exam_id && { exam_id: filters.exam_id }),
        ...(filters.class_id && { class_id: filters.class_id }),
        ...(filters.section && { section: filters.section }),
      });

      const response = await fetch(`/api/marks/export?${params}&format=excel`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `marks_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert('Failed to export to Excel');
    }
  };

  // Chart data
  const gradeDistribution = useMemo(() => {
    const gradeCounts: Record<string, number> = {};
    marks.forEach((mark) => {
      const grade = mark.grade || 'N/A';
      gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
    });
    return Object.entries(gradeCounts).map(([name, value]) => ({ name, value }));
  }, [marks]);

  const subjectPerformance = useMemo(() => {
    const subjectData: Record<string, { total: number; count: number }> = {};
    marks.forEach((mark) => {
      mark.subject_marks?.forEach((sm) => {
        if (!subjectData[sm.subject.name]) {
          subjectData[sm.subject.name] = { total: 0, count: 0 };
        }
        subjectData[sm.subject.name].total += sm.percentage || 0;
        subjectData[sm.subject.name].count += 1;
      });
    });
    return Object.entries(subjectData).map(([name, data]) => ({
      name,
      average: data.count > 0 ? data.total / data.count : 0,
    }));
  }, [marks]);


  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <FileText className="text-orange-500" size={32} />
            Marks Management
          </h1>
          <p className="text-gray-600">View, analyze, and download student marks and report cards</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </div>

      {/* Filters - Sticky */}
      <Card className="sticky top-0 z-10 shadow-md">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="text-orange-500" size={20} />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Examination */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Examination <span className="text-red-500">*</span>
              </label>
              <select
                value={filters.exam_id}
                onChange={(e) => setFilters({ ...filters, exam_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="">Select Examination</option>
                {examinations.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.exam_name || exam.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Class */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
              <select
                value={filters.class_id}
                onChange={(e) => {
                  setFilters({ ...filters, class_id: e.target.value, section: '' });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class} {cls.section ? `- ${cls.section}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
              <select
                value={filters.section}
                onChange={(e) => setFilters({ ...filters, section: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={!filters.class_id}
              >
                <option value="">All Sections</option>
                {sections.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <select
                value={filters.subject_id}
                onChange={(e) => setFilters({ ...filters, subject_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Subjects</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="text"
                  placeholder="Name or Roll No."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <Button
              onClick={fetchMarks}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <RefreshCw size={18} className="mr-2" />
              Apply Filters
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleExportExcel}
                disabled={!filters.exam_id || marks.length === 0}
              >
                <FileSpreadsheet size={18} className="mr-2" />
                Export Excel
              </Button>
              <Button
                variant="outline"
                onClick={handleBulkDownload}
                disabled={!filters.exam_id || marks.length === 0}
              >
                <Download size={18} className="mr-2" />
                Download All Report Cards
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm mb-1">Total Students</p>
                <p className="text-3xl font-bold">{analytics.total_students}</p>
              </div>
              <Users className="text-blue-200" size={32} />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm mb-1">Passed</p>
                <p className="text-3xl font-bold">{analytics.passed}</p>
              </div>
              <CheckCircle2 className="text-green-200" size={32} />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-red-500 to-red-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm mb-1">Failed</p>
                <p className="text-3xl font-bold">{analytics.failed}</p>
              </div>
              <XCircle className="text-red-200" size={32} />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm mb-1">Average %</p>
                <p className="text-3xl font-bold">{analytics.average_percentage.toFixed(1)}%</p>
              </div>
              <TrendingUp className="text-purple-200" size={32} />
            </div>
          </Card>
        </div>
      )}

      {/* Charts */}
      {marks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grade Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="text-orange-500" size={20} />
              Grade Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gradeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Subject Performance */}
          {subjectPerformance.length > 0 && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="text-orange-500" size={20} />
                Subject Average Performance
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={subjectPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="average" stroke="#f97316" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}

      {/* Toppers */}
      {analytics && analytics.toppers.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="text-orange-500" size={20} />
            Top Performers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {analytics.toppers.map((topper, idx) => (
              <div key={idx} className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-orange-200">
                <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center mx-auto mb-2 font-bold text-lg">
                  {idx + 1}
                </div>
                <p className="font-semibold text-gray-900">{topper.student_name}</p>
                <p className="text-orange-600 font-bold">{topper.percentage.toFixed(1)}%</p>
                <p className="text-sm text-gray-600">{topper.grade}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Marks Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <GraduationCap className="text-orange-500" size={20} />
            Student Marks ({filteredMarks.length} students)
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="animate-spin text-orange-500 mx-auto mb-4" size={32} />
            <p className="text-gray-600">Loading marks...</p>
          </div>
        ) : filteredMarks.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="text-gray-400 mx-auto mb-4" size={48} />
            <p className="text-gray-600">No marks found. Please apply filters to view marks.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Roll No.</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Class</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Subject Marks</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">%</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Grade</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMarks.map((mark) => {
                    const isPass = (mark.percentage || 0) >= 40;
                    return (
                      <motion.tr
                        key={mark.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-700">{mark.student?.roll_number || '-'}</td>
                        <td className="px-4 py-3 font-medium text-black">{mark.student?.student_name || mark.student?.full_name || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{mark.student?.class || '-'} {mark.student?.section ? `- ${mark.student.section}` : ''}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {mark.subject_marks?.slice(0, 3).map((sm) => (
                              <span
                                key={sm.id}
                                className="px-2 py-1 text-xs rounded"
                                style={{ backgroundColor: `${sm.subject.color}20`, color: sm.subject.color }}
                              >
                                {sm.subject.name}: {sm.marks_obtained}/{sm.max_marks}
                              </span>
                            ))}
                            {mark.subject_marks && mark.subject_marks.length > 3 && (
                              <span className="px-2 py-1 text-xs text-gray-600">+{mark.subject_marks.length - 3} more</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">
                            {mark.total_marks || 0} / {mark.total_max_marks || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${isPass ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(mark.percentage || 0, 100)}%` }}
                              />
                            </div>
                            <span className={`font-semibold ${isPass ? 'text-green-600' : 'text-red-600'}`}>
                              {(mark.percentage || 0).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={getGradeColor(mark.grade || 'N/A')}>
                            {mark.grade || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${isPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {isPass ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/dashboard/${schoolCode}/marks/${mark.student_id}?exam_id=${mark.exam_id}`)}
                            >
                              <Eye size={14} className="mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadReportCard(mark.student_id, mark.exam_id)}
                            >
                              <Download size={14} className="mr-1" />
                              PDF
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredMarks.length)} of {filteredMarks.length} students
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
