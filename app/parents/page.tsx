'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  User,
  Calendar,
  BookOpen,
  DollarSign,
  FileText,
  Award,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Phone,
  Mail,
} from 'lucide-react';

interface Student {
  id: string;
  student_name?: string;
  admission_no?: string;
  class?: string;
  section?: string;
  email?: string;
  phone?: string;
  school_code?: string;
  academic_year?: string;
  father_name?: string;
  mother_name?: string;
  father_contact?: string;
  mother_contact?: string;
  parent_email?: string;
  parent_phone?: string;
  admission_date?: string;
  blood_group?: string;
  address?: string;
  [key: string]: unknown;
}

interface AttendanceRecord {
  attendance_date: string;
  status: 'present' | 'absent' | 'late';
  [key: string]: unknown;
}

interface Mark {
  id: string;
  subject?: { name?: string };
  examinations?: { exam_name?: string; end_date?: string };
  marks_obtained?: number;
  max_marks?: number;
  percentage?: number;
  grade?: string;
  [key: string]: unknown;
}

interface Fee {
  id: string;
  fee_structure?: { name?: string };
  total_amount?: number;
  due_month?: string;
  status?: 'paid' | 'pending' | 'overdue';
  paid_date?: string;
  receipt_number?: string;
  [key: string]: unknown;
}

interface Exam {
  id: string;
  exam_name?: string;
  name?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  exam_subjects?: Array<{ subject?: { name?: string } }>;
  [key: string]: unknown;
}

interface ReportCard {
  term?: string;
  academic_year?: string;
  overall_percentage?: number;
  overall_grade?: string;
  rank?: number;
  total_students?: number;
  subjects?: Array<{
    subject?: string;
    marks_obtained?: number;
    max_marks?: number;
    percentage?: number;
    grade?: string;
  }>;
  attendance?: {
    total_days?: number;
    present_days?: number;
    absent_days?: number;
    percentage?: number;
  };
}

export default function ParentDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'child' | 'attendance' | 'marks' | 'fees' | 'exams' | 'report'>('overview');
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [marksLoading, setMarksLoading] = useState(false);
  const [fees, setFees] = useState<Fee[]>([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [reportCard, setReportCard] = useState<ReportCard | null>(null);
  const [reportCardLoading, setReportCardLoading] = useState(false);
  const [classId, setClassId] = useState<string | null>(null);

  useEffect(() => {
    // Get student from session (parent would have child's info)
    // For now, we'll get it from sessionStorage or query params
    const storedStudent = sessionStorage.getItem('student');
    if (!storedStudent) {
      router.push('/login');
      return;
    }

    try {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchAllData(studentData);
    } catch (err) {
      console.error('Error parsing student data:', err);
      router.push('/login');
    }
  }, [router]);

  const fetchAllData = async (studentData: Student) => {
    setLoading(true);
    await Promise.all([
      fetchAttendance(studentData),
      fetchMarks(studentData),
      fetchFees(studentData),
      fetchExams(studentData),
      fetchReportCard(studentData),
    ]);
    setLoading(false);
  };

  const fetchAttendance = async (studentData: Student) => {
    if (!studentData.id || !studentData.school_code) return;
    
    try {
      setAttendanceLoading(true);
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];

      const response = await fetch(
        `/api/attendance/student?school_code=${studentData.school_code}&student_id=${studentData.id}&start_date=${startDate}&end_date=${endDate}`
      );
      const result = await response.json();
      
      if (response.ok && result.data) {
        setAttendance(result.data);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const fetchMarks = async (studentData: Student) => {
    if (!studentData.id || !studentData.school_code) return;
    
    try {
      setMarksLoading(true);
      const response = await fetch(
        `/api/marks?school_code=${studentData.school_code}&student_id=${studentData.id}`
      );
      const result = await response.json();
      
      if (response.ok && result.data) {
        setMarks(result.data);
      }
    } catch (err) {
      console.error('Error fetching marks:', err);
    } finally {
      setMarksLoading(false);
    }
  };

  const fetchFees = async (studentData: Student) => {
    if (!studentData.id || !studentData.school_code) return;
    
    try {
      setFeesLoading(true);
      const response = await fetch(
        `/api/v2/fees/students/${studentData.id}/fees?school_code=${studentData.school_code}`
      );
      const result = await response.json();
      
      if (response.ok && result.data) {
        setFees(result.data);
      }
    } catch (err) {
      console.error('Error fetching fees:', err);
    } finally {
      setFeesLoading(false);
    }
  };

  const fetchExams = async (studentData: Student) => {
    if (!studentData.school_code) return;
    
    try {
      setExamsLoading(true);
      const response = await fetch(
        `/api/examinations?school_code=${studentData.school_code}${classId ? `&class_id=${classId}` : ''}`
      );
      const result = await response.json();
      
      if (response.ok && result.data) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming = result.data.filter((exam: Exam) => {
          if (!exam.start_date) return false;
          const examDate = new Date(exam.start_date);
          examDate.setHours(0, 0, 0, 0);
          return examDate >= today;
        });
        setExams(upcoming);
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setExamsLoading(false);
    }
  };

  const fetchReportCard = async (studentData: Student) => {
    if (!studentData.id || !studentData.school_code) return;
    
    try {
      setReportCardLoading(true);
      const response = await fetch(
        `/api/marks/view?school_code=${studentData.school_code}&student_id=${studentData.id}`
      );
      const result = await response.json();
      
      if (response.ok && result.data && result.data.length > 0) {
        const latestExam = result.data[0];
        setReportCard({
          term: latestExam.exam?.exam_name || 'Term',
          academic_year: latestExam.exam?.academic_year || studentData.academic_year,
          overall_percentage: latestExam.overall_percentage || 0,
          overall_grade: latestExam.overall_grade || 'N/A',
          rank: latestExam.rank || 0,
          total_students: latestExam.total_students || 0,
          subjects: latestExam.subject_marks || [],
          attendance: {
            total_days: 180,
            present_days: attendance.filter(a => a.status === 'present').length,
            absent_days: attendance.filter(a => a.status === 'absent').length,
            percentage: attendance.length > 0 
              ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)
              : 0,
          },
        });
      }
    } catch (err) {
      console.error('Error fetching report card:', err);
    } finally {
      setReportCardLoading(false);
    }
  };

  // Get class ID when student data is available
  useEffect(() => {
    if (student?.class && student?.section && student?.academic_year && student?.school_code) {
      fetch(`/api/classes?school_code=${student.school_code}&class=${student.class}&section=${student.section}&academic_year=${student.academic_year}`)
        .then(res => res.json())
        .then(result => {
          if (result.data && result.data.length > 0) {
            setClassId(result.data[0].id);
          }
        })
        .catch(err => console.error('Error fetching class ID:', err));
    }
  }, [student]);

  // Re-fetch exams when classId is available
  useEffect(() => {
    if (student && classId) {
      fetchExams(student);
    }
  }, [classId, student]);

  if (loading || !student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const attendanceStats = {
    total: attendance.length,
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length,
    percentage: attendance.length > 0 
      ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)
      : 0,
  };

  const feeStats = {
    total: fees.reduce((sum, f) => sum + (f.total_amount || 0), 0),
    paid: fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + (f.total_amount || 0), 0),
    pending: fees.filter(f => f.status === 'pending' || f.status === 'overdue').reduce((sum, f) => sum + (f.total_amount || 0), 0),
  };

  const upcomingExams = exams.slice(0, 3);

  // Get parent name from student data
  const parentName = student.father_name || student.mother_name || 'Parent';
  const parentEmail = student.parent_email || student.father_contact || student.mother_contact || '';
  const parentPhone = student.parent_phone || student.father_contact || student.mother_contact || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent dark:text-white">
              EduCore
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Parent Portal</span>
              <Link href="/" className="text-sm text-gray-600 hover:text-black">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Parent & Child Info Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <div className="flex items-center space-x-6 mb-4 md:mb-0">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold backdrop-blur-sm">
                  {parentName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Welcome, {parentName}</h1>
                  <p className="text-emerald-100">Parent of {student.student_name || 'Student'}</p>
                  {(parentEmail || parentPhone) && (
                    <div className="flex items-center space-x-4 mt-2 text-sm text-emerald-100">
                      {parentEmail && (
                        <div className="flex items-center space-x-1">
                          <Mail size={16} />
                          <span>{parentEmail}</span>
                        </div>
                      )}
                      {parentPhone && (
                        <div className="flex items-center space-x-1">
                          <Phone size={16} />
                          <span>{parentPhone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <p className="text-sm text-emerald-100 mb-2">Child&apos;s Information</p>
                <p className="text-xl font-bold">{student.student_name || 'Student'}</p>
                <p className="text-sm text-emerald-100">Class {student.class || 'N/A'}-{student.section || 'N/A'} | Admission No: {student.admission_no || 'N/A'}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card hover>
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <CheckCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Attendance</p>
                <p className="text-2xl font-bold text-black">{attendanceStats.percentage}%</p>
              </div>
            </div>
          </Card>
          <Card hover>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-3 rounded-lg">
                <Award className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Overall Grade</p>
                <p className="text-2xl font-bold text-black">{reportCard?.overall_grade || 'N/A'}</p>
              </div>
            </div>
          </Card>
          <Card hover>
            <div className="flex items-center space-x-4">
              <div className="bg-red-500 p-3 rounded-lg">
                <DollarSign className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending Fees</p>
                <p className="text-2xl font-bold text-black">₹{(feeStats.pending / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </Card>
          <Card hover>
            <div className="flex items-center space-x-4">
              <div className="bg-orange-500 p-3 rounded-lg">
                <FileText className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Upcoming Exams</p>
                <p className="text-2xl font-bold text-black">{upcomingExams.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'child', label: 'Child Info', icon: User },
            { id: 'attendance', label: 'Attendance', icon: Calendar },
            { id: 'marks', label: 'Marks', icon: Award },
            { id: 'fees', label: 'Fees', icon: DollarSign },
            { id: 'exams', label: 'Exams', icon: FileText },
            { id: 'report', label: 'Report Card', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'child' | 'attendance' | 'marks' | 'fees' | 'exams' | 'report')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Recent Attendance */}
            <Card>
              <h2 className="text-xl font-bold text-black mb-4">Recent Attendance</h2>
              {attendanceLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading attendance...</p>
                </div>
              ) : attendance.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <p>No attendance records found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {attendance.slice(-5).map((record, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {record.status === 'present' && <CheckCircle className="text-green-500" size={20} />}
                        {record.status === 'absent' && <XCircle className="text-red-500" size={20} />}
                        {record.status === 'late' && <AlertCircle className="text-yellow-500" size={20} />}
                        <span className="font-medium text-black">
                          {new Date(record.attendance_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                        record.status === 'present' ? 'bg-green-100 text-green-800' :
                        record.status === 'absent' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Recent Marks */}
            <Card>
              <h2 className="text-xl font-bold text-black mb-4">Recent Marks</h2>
              {marksLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading marks...</p>
                </div>
              ) : marks.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <p>No marks available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {marks.slice(-3).map((mark) => (
                    <div key={mark.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-black">{mark.subject?.name || 'Subject'}</h3>
                          <p className="text-sm text-gray-600">{mark.examinations?.exam_name || 'Exam'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-black">{mark.marks_obtained || 0} / {mark.max_marks || 0}</p>
                          <p className="text-sm text-gray-600">Grade: {mark.grade || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Upcoming Exams */}
            <Card>
              <h2 className="text-xl font-bold text-black mb-4">Upcoming Exams</h2>
              {examsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Loading exams...</p>
                </div>
              ) : upcomingExams.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <p>No upcoming exams</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingExams.map((exam) => (
                    <div key={exam.id} className="p-4 border border-gray-200 rounded-lg hover:border-black transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-black">{exam.exam_name || exam.name || 'Exam'}</h3>
                          {exam.exam_subjects && exam.exam_subjects.length > 0 && (
                            <p className="text-sm text-gray-600 mt-1">
                              {exam.exam_subjects.map((s: { subject?: { name?: string } }) => s.subject?.name).filter(Boolean).join(', ')}
                            </p>
                          )}
                          {exam.start_date && (
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                              <span>{new Date(exam.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              {exam.end_date && exam.end_date !== exam.start_date && (
                                <span>- {new Date(exam.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize">
                          {exam.status || 'upcoming'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Fee Summary */}
            <Card>
              <h2 className="text-xl font-bold text-black mb-4">Fee Summary</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-black">₹{(feeStats.total / 1000).toFixed(0)}K</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-green-600">₹{(feeStats.paid / 1000).toFixed(0)}K</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-red-600">₹{(feeStats.pending / 1000).toFixed(0)}K</p>
                </div>
              </div>
              <Button variant="primary" className="w-full">
                View All Fees
              </Button>
            </Card>
          </div>
        )}

        {activeTab === 'child' && (
          <Card>
            <h2 className="text-2xl font-bold text-black mb-6">Child&apos;s Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Full Name</label>
                  <p className="text-lg font-semibold text-black">{student.student_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Admission Number</label>
                  <p className="text-lg font-semibold text-black">{student.admission_no || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Class & Section</label>
                  <p className="text-lg font-semibold text-black">Class {student.class || 'N/A'}-{student.section || 'N/A'}</p>
                </div>
                {student.admission_date && (
                  <div>
                    <label className="text-sm text-gray-600">Admission Date</label>
                    <p className="text-lg font-semibold text-black">
                      {new Date(student.admission_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {student.email && (
                  <div>
                    <label className="text-sm text-gray-600">Email</label>
                    <p className="text-lg font-semibold text-black">{student.email}</p>
                  </div>
                )}
                {student.phone && (
                  <div>
                    <label className="text-sm text-gray-600">Phone</label>
                    <p className="text-lg font-semibold text-black">{student.phone}</p>
                  </div>
                )}
                {student.blood_group && (
                  <div>
                    <label className="text-sm text-gray-600">Blood Group</label>
                    <p className="text-lg font-semibold text-black">{student.blood_group}</p>
                  </div>
                )}
                {student.address && (
                  <div>
                    <label className="text-sm text-gray-600">Address</label>
                    <p className="text-lg font-semibold text-black">{student.address}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'attendance' && (
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">Attendance Records</h2>
              <div className="text-right">
                <p className="text-sm text-gray-600">Overall Attendance</p>
                <p className="text-2xl font-bold text-black">{attendanceStats.percentage}%</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Present</p>
                <p className="text-2xl font-bold text-green-600">{attendanceStats.present}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Absent</p>
                <p className="text-2xl font-bold text-red-600">{attendanceStats.absent}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Late</p>
                <p className="text-2xl font-bold text-yellow-600">{attendanceStats.late}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceLoading ? (
                    <tr>
                      <td colSpan={2} className="py-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
                        <p className="text-gray-600">Loading attendance...</p>
                      </td>
                    </tr>
                  ) : attendance.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-gray-600">
                        <p>No attendance records found</p>
                      </td>
                    </tr>
                  ) : (
                    attendance.map((record, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          {new Date(record.attendance_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                            record.status === 'present' ? 'bg-green-100 text-green-800' :
                            record.status === 'absent' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'marks' && (
          <Card>
            <h2 className="text-2xl font-bold text-black mb-6">Marks & Grades</h2>
            {marksLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading marks...</p>
              </div>
            ) : marks.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <p>No marks available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {marks.map((mark) => (
                  <div key={mark.id} className="p-6 border border-gray-200 rounded-lg hover:border-black transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-black">{mark.subject?.name || 'Subject'}</h3>
                        <p className="text-sm text-gray-600 mt-1">{mark.examinations?.exam_name || 'Exam'}</p>
                        <div className="flex items-center space-x-6 mt-4">
                          <div>
                            <p className="text-sm text-gray-600">Marks</p>
                            <p className="text-xl font-bold text-black">{mark.marks_obtained || 0} / {mark.max_marks || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Percentage</p>
                            <p className="text-xl font-bold text-black">{mark.percentage || 0}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Grade</p>
                            <p className="text-xl font-bold text-black">{mark.grade || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      {mark.examinations?.end_date && (
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Date</p>
                          <p className="text-sm font-medium text-black">
                            {new Date(mark.examinations.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'fees' && (
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">Fee Records</h2>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Pending</p>
                <p className="text-2xl font-bold text-red-600">₹{feeStats.pending.toLocaleString()}</p>
              </div>
            </div>
            {feesLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading fees...</p>
              </div>
            ) : fees.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <p>No fee records found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {fees.map((fee) => (
                  <div key={fee.id} className="p-6 border border-gray-200 rounded-lg hover:border-black transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-black">{fee.fee_structure?.name || 'Fee'}</h3>
                        <p className="text-2xl font-bold text-black mt-2">₹{(fee.total_amount || 0).toLocaleString()}</p>
                        <div className="flex items-center space-x-6 mt-4 text-sm">
                          {fee.due_month && (
                            <div>
                              <p className="text-gray-600">Due Month</p>
                              <p className="font-medium text-black">{fee.due_month}</p>
                            </div>
                          )}
                          {fee.paid_date && (
                            <div>
                              <p className="text-gray-600">Paid Date</p>
                              <p className="font-medium text-green-600">
                                {new Date(fee.paid_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          )}
                          {fee.receipt_number && (
                            <div>
                              <p className="text-gray-600">Receipt No</p>
                              <p className="font-medium text-black">{fee.receipt_number}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${
                          fee.status === 'paid' ? 'bg-green-100 text-green-800' :
                          fee.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {fee.status}
                        </span>
                        {(fee.status === 'pending' || fee.status === 'overdue') && (
                          <Button variant="primary" size="sm" className="mt-3 w-full">
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'exams' && (
          <Card>
            <h2 className="text-2xl font-bold text-black mb-6">Exam Schedule</h2>
            {examsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading exams...</p>
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <p>No exams scheduled</p>
              </div>
            ) : (
              <div className="space-y-4">
                {exams.map((exam) => (
                  <div key={exam.id} className="p-6 border border-gray-200 rounded-lg hover:border-black transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-black">{exam.exam_name || exam.name || 'Exam'}</h3>
                        {exam.exam_subjects && exam.exam_subjects.length > 0 && (
                          <p className="text-sm text-gray-600 mt-1">
                            Subjects: {exam.exam_subjects.map((s: { subject?: { name?: string } }) => s.subject?.name).filter(Boolean).join(', ')}
                          </p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          {exam.start_date && (
                            <div>
                              <p className="text-sm text-gray-600">Start Date</p>
                              <p className="font-medium text-black">
                                {new Date(exam.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          )}
                          {exam.end_date && (
                            <div>
                              <p className="text-sm text-gray-600">End Date</p>
                              <p className="font-medium text-black">
                                {new Date(exam.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${
                        exam.status === 'upcoming' || !exam.status ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {exam.status || 'upcoming'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'report' && (
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-black">Report Card</h2>
                {reportCard && (
                  <p className="text-gray-600 mt-1">{reportCard.term || 'Term'} - {reportCard.academic_year || student.academic_year}</p>
                )}
              </div>
              <Button variant="outline">
                <Download size={18} className="mr-2" />
                Download PDF
              </Button>
            </div>

            {reportCardLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading report card...</p>
              </div>
            ) : !reportCard ? (
              <div className="text-center py-12 text-gray-600">
                <p>No report card available</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-6 rounded-xl">
                    <p className="text-sm opacity-90">Overall Percentage</p>
                    <p className="text-4xl font-bold mt-2">{reportCard.overall_percentage || 0}%</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 rounded-xl">
                    <p className="text-sm opacity-90">Overall Grade</p>
                    <p className="text-4xl font-bold mt-2">{reportCard.overall_grade || 'N/A'}</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-6 rounded-xl">
                    <p className="text-sm opacity-90">Class Rank</p>
                    <p className="text-4xl font-bold mt-2">#{reportCard.rank || 'N/A'} {reportCard.total_students ? `/ ${reportCard.total_students}` : ''}</p>
                  </div>
                </div>

                {reportCard.subjects && reportCard.subjects.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-black mb-4">Subject-wise Performance</h3>
                    <div className="space-y-3">
                      {reportCard.subjects.map((subject, index) => (
                        <div key={index} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-black">{subject.subject || 'Subject'}</h4>
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                              {subject.grade || 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-gray-600">Marks: {subject.marks_obtained || 0} / {subject.max_marks || 0}</span>
                            <span className="text-gray-600">Percentage: {subject.percentage || 0}%</span>
                          </div>
                          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                              style={{ width: `${subject.percentage || 0}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportCard.attendance && (
                  <div>
                    <h3 className="text-xl font-bold text-black mb-4">Attendance Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Total Days</p>
                        <p className="text-2xl font-bold text-black">{reportCard.attendance.total_days || 0}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Present</p>
                        <p className="text-2xl font-bold text-green-600">{reportCard.attendance.present_days || 0}</p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-gray-600">Absent</p>
                        <p className="text-2xl font-bold text-red-600">{reportCard.attendance.absent_days || 0}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-gray-600">Percentage</p>
                        <p className="text-2xl font-bold text-blue-600">{reportCard.attendance.percentage || 0}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

