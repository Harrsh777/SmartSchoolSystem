'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Loader2,
  X,
  CheckCircle2,
} from 'lucide-react';

interface StudentMarkGroup {
  student_id: string;
  student: {
    id: string;
    student_name: string;
    admission_no: string;
    roll_number?: string;
  };
  exam_id: string;
  class_id: string;
  status: string;
  marks: Array<{
    id: string;
    subject_id: string;
    marks_obtained: number;
    max_marks: number;
    percentage: number;
    grade: string;
    passing_status: 'pass' | 'fail';
    subject: {
      id: string;
      name: string;
      color: string;
    };
  }>;
  total_marks: number;
  total_max_marks: number;
}

export default function MarksApprovalPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendingMarks, setPendingMarks] = useState<StudentMarkGroup[]>([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [exams, setExams] = useState<Array<{ id: string; name: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; class: string; section?: string }>>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    fetchExams();
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (selectedExam && selectedClass) {
      fetchPendingMarks();
    } else {
      setPendingMarks([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExam, selectedClass, schoolCode]);

  const fetchExams = async () => {
    try {
      const response = await fetch(`/api/examinations?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setExams(result.data);
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setClasses(result.data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchPendingMarks = async () => {
    if (!selectedExam || !selectedClass) return;

    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/examinations/marks/approve?school_code=${schoolCode}&exam_id=${selectedExam}&class_id=${selectedClass}`
      );
      const result = await response.json();

      if (response.ok) {
        setPendingMarks(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch pending marks');
      }
    } catch (err) {
      console.error('Error fetching pending marks:', err);
      setError('Failed to fetch pending marks');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedExam || !selectedClass) {
      setError('Please select exam and class');
      return;
    }

    // Get staff ID from session
    const storedStaff = sessionStorage.getItem('staff');
    let approvedBy: string | null = null;
    if (storedStaff) {
      try {
        const staffData = JSON.parse(storedStaff);
        approvedBy = staffData.id || null;
      } catch {
        // Ignore parse errors
      }
    }

    if (!approvedBy) {
      setError('Please log in to approve marks');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/examinations/marks/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          exam_id: selectedExam,
          class_id: selectedClass,
          action: 'approve',
          approved_by: approvedBy,
          remarks: remarks || null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(`Marks approved successfully for ${result.updated_count || 0} student(s)!`);
        setRemarks('');
        setTimeout(() => {
          setSuccess('');
          fetchPendingMarks();
        }, 3000);
      } else {
        setError(result.error || 'Failed to approve marks');
      }
    } catch (err) {
      console.error('Error approving marks:', err);
      setError('Failed to approve marks. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedExam || !selectedClass) {
      setError('Please select exam and class');
      return;
    }

    // Get staff ID from session
    const storedStaff = sessionStorage.getItem('staff');
    let approvedBy: string | null = null;
    if (storedStaff) {
      try {
        const staffData = JSON.parse(storedStaff);
        approvedBy = staffData.id || null;
      } catch {
        // Ignore parse errors
      }
    }

    if (!approvedBy) {
      setError('Please log in to reject marks');
      return;
    }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/examinations/marks/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          exam_id: selectedExam,
          class_id: selectedClass,
          action: 'reject',
          approved_by: approvedBy,
          remarks: remarks || null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(`Marks rejected. ${result.updated_count || 0} student(s) marked for correction.`);
        setRemarks('');
        setTimeout(() => {
          setSuccess('');
          fetchPendingMarks();
        }, 3000);
      } else {
        setError(result.error || 'Failed to reject marks');
      }
    } catch (err) {
      console.error('Error rejecting marks:', err);
      setError('Failed to reject marks. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const filteredMarks = pendingMarks.filter((group) => {
    const name = group.student?.student_name?.toLowerCase() || '';
    const admission = group.student?.admission_no?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || admission.includes(query);
  });

  const selectedStudentData = selectedStudent
    ? pendingMarks.find((g) => g.student_id === selectedStudent)
    : null;

  const totalPercentage = selectedStudentData
    ? selectedStudentData.total_max_marks > 0
      ? ((selectedStudentData.total_marks / selectedStudentData.total_max_marks) * 100).toFixed(2)
      : '0'
    : '0';

  return (
    <div className="min-h-screen bg-[#F5EFEB] dark:bg-[#0f172a]">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/${schoolCode}/examinations`)}
                className="border-[#5A7A95]/30 text-[#5A7A95] hover:bg-[#5A7A95]/10"
              >
                <ArrowLeft size={18} className="mr-2" />
                Back
              </Button>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center shadow-lg">
                <CheckCircle className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marks Approval</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Review and approve marks submissions for {schoolCode}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Success/Error Messages */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3"
          >
            <CheckCircle2 className="text-green-600 dark:text-green-400" size={20} />
            <p className="text-green-800 dark:text-green-300 text-sm">{success}</p>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="font-semibold text-red-800 dark:text-red-300 mb-1">Error</p>
                <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-line">{error}</p>
              </div>
            </div>
            <button onClick={() => setError('')} className="text-red-600 dark:text-red-400 hover:text-red-800 flex-shrink-0">
              <X size={18} />
            </button>
          </motion.div>
        )}

        {/* Filters */}
        <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Examination *
              </label>
              <select
                value={selectedExam}
                onChange={(e) => {
                  setSelectedExam(e.target.value);
                  setSelectedClass('');
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8]"
              >
                <option value="">Select Examination</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Class *
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                disabled={!selectedExam}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class} {cls.section ? `- ${cls.section}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={handleApprove}
                disabled={processing || !selectedExam || !selectedClass || pendingMarks.length === 0}
                className="flex-1 bg-[#5A7A95] hover:bg-[#4a6a85] text-white disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} className="mr-2" />
                    Approve All
                  </>
                )}
              </Button>
              <Button
                onClick={handleReject}
                disabled={processing || !selectedExam || !selectedClass || pendingMarks.length === 0}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle size={18} className="mr-2" />
                    Reject All
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Remarks (Optional)
            </label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add remarks or notes..."
              className="w-full"
            />
          </div>
        </Card>

        {/* Pending Marks List */}
        {loading ? (
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50">
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-[#5A7A95] mr-3" />
              <p className="text-gray-600 dark:text-gray-400">Loading pending marks...</p>
            </div>
          </Card>
        ) : filteredMarks.length === 0 ? (
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50">
            <div className="text-center py-12">
              <CheckCircle size={64} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Pending Marks</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {selectedExam && selectedClass
                  ? 'All marks for this exam and class have been approved.'
                  : 'Select an examination and class to view pending marks.'}
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* Search */}
            <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/50 p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by student name or admission number..."
                  className="pl-10 w-full"
                />
              </div>
            </Card>

            {/* Student Marks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMarks.map((group) => {
                const percentage =
                  group.total_max_marks > 0
                    ? ((group.total_marks / group.total_max_marks) * 100).toFixed(1)
                    : '0';
                const isSelected = selectedStudent === group.student_id;

                return (
                  <Card
                    key={group.student_id}
                    className={`bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#5A7A95] ring-2 ring-[#5A7A95]/20'
                        : 'border-white/60 dark:border-gray-700/50 hover:border-[#5A7A95]/50'
                    }`}
                    onClick={() => setSelectedStudent(isSelected ? null : group.student_id)}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {group.student?.student_name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {group.student?.admission_no} • Roll: {group.student?.roll_number || 'N/A'}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            group.status === 'submitted'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          }`}
                        >
                          {group.status === 'submitted' ? 'Submitted' : 'Correction Required'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Marks</p>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {group.total_marks} / {group.total_max_marks}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Percentage</p>
                          <p className="text-xl font-bold text-[#5A7A95] dark:text-[#6B9BB8]">{percentage}%</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {group.marks.slice(0, 3).map((mark) => (
                          <span
                            key={mark.id}
                            className="px-2 py-1 text-xs rounded"
                            style={{
                              backgroundColor: `${mark.subject.color}20`,
                              color: mark.subject.color,
                            }}
                          >
                            {mark.subject.name}: {mark.marks_obtained}/{mark.max_marks} ({mark.grade})
                          </span>
                        ))}
                        {group.marks.length > 3 && (
                          <span className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400">
                            +{group.marks.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Selected Student Details */}
            {selectedStudentData && (
              <Card className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-lg border border-[#5A7A95] ring-2 ring-[#5A7A95]/20">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Detailed Marks - {selectedStudentData.student?.student_name}
                    </h3>
                    <button
                      onClick={() => setSelectedStudent(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] text-white">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-bold uppercase">Subject</th>
                          <th className="px-4 py-2 text-center text-xs font-bold uppercase">Marks Obtained</th>
                          <th className="px-4 py-2 text-center text-xs font-bold uppercase">Max Marks</th>
                          <th className="px-4 py-2 text-center text-xs font-bold uppercase">Percentage</th>
                          <th className="px-4 py-2 text-center text-xs font-bold uppercase">Grade</th>
                          <th className="px-4 py-2 text-center text-xs font-bold uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {selectedStudentData.marks.map((mark) => (
                          <tr key={mark.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              {mark.subject.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-white">
                              {mark.marks_obtained}
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400">
                              {mark.max_marks}
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-white">
                              {mark.percentage.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-sm text-center font-semibold text-[#5A7A95] dark:text-[#6B9BB8]">
                              {mark.grade}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  mark.passing_status === 'pass'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                }`}
                              >
                                {mark.passing_status === 'pass' ? 'Pass' : 'Fail'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">Total</td>
                          <td className="px-4 py-3 text-sm text-center font-bold text-gray-900 dark:text-white">
                            {selectedStudentData.total_marks}
                          </td>
                          <td className="px-4 py-3 text-sm text-center font-bold text-gray-900 dark:text-white">
                            {selectedStudentData.total_max_marks}
                          </td>
                          <td className="px-4 py-3 text-sm text-center font-bold text-[#5A7A95] dark:text-[#6B9BB8]">
                            {totalPercentage}%
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
