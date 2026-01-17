'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { BarChart3, Calendar, BookOpen, TrendingUp, Filter, Search, CheckCircle2 } from 'lucide-react';
import type { Student } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

interface SubjectMark {
  id: string;
  subject_id: string;
  subject_name: string;
  subject_color: string | null;
  marks_obtained: number;
  max_marks: number;
  percentage: number;
  grade: string | null;
  status: string | null;
  remarks: string | null;
  created_at: string;
}

interface ExamMarks {
  exam_id: string;
  exam_name: string;
  exam_type: string | null;
  start_date: string | null;
  end_date: string | null;
  academic_year: string | null;
  subjects: SubjectMark[];
  total_marks: number;
  total_max_marks: number;
  overall_percentage: number;
  overall_grade: string;
}

export default function StudentMarksPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [examMarks, setExamMarks] = useState<ExamMarks[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | string>('all');

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchMarks(studentData);
    }
  }, []);

  const fetchMarks = async (studentData: Student) => {
    try {
      setLoading(true);
      const schoolCode = getString(studentData.school_code);
      const studentId = getString(studentData.id);
      
      if (!schoolCode || !studentId) {
        setLoading(false);
        return;
      }

      const response = await fetch(
        `/api/student/marks?school_code=${schoolCode}&student_id=${studentId}`
      );

      const result = await response.json();

      if (response.ok && result.data) {
        setExamMarks(result.data || []);
      } else {
        console.error('Error fetching marks:', result.error);
        setExamMarks([]);
      }
    } catch (error) {
      console.error('Error fetching marks:', error);
      setExamMarks([]);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string | null) => {
    if (!grade) return 'bg-gray-100 text-gray-700';
    const gradeUpper = grade.toUpperCase();
    if (gradeUpper.includes('A+') || gradeUpper === 'A') {
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    } else if (gradeUpper === 'B') {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    } else if (gradeUpper === 'C') {
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    } else if (gradeUpper === 'D') {
      return 'bg-orange-100 text-orange-700 border-orange-200';
    } else {
      return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-emerald-600';
    if (percentage >= 80) return 'text-emerald-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const filteredExams = examMarks.filter(exam => {
    // Search filter
    if (searchTerm && !exam.exam_name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    // Type filter
    if (filterType !== 'all' && exam.exam_type !== filterType) {
      return false;
    }
    return true;
  });

  // Get unique exam types for filter
  const examTypes = Array.from(new Set(examMarks.map(e => e.exam_type).filter(Boolean)));

  // Calculate statistics
  const stats = {
    total_exams: examMarks.length,
    total_subjects: examMarks.reduce((sum, exam) => sum + exam.subjects.length, 0),
    average_percentage: examMarks.length > 0
      ? Math.round(examMarks.reduce((sum, exam) => sum + exam.overall_percentage, 0) / examMarks.length)
      : 0,
  };

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading marks...</p>
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
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BarChart3 className="text-primary" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Marks</h1>
            <p className="text-muted-foreground">View all your examination marks and grades</p>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card soft-shadow p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Examinations</p>
          <p className="text-2xl font-bold text-foreground">{stats.total_exams}</p>
        </Card>
        <Card className="glass-card soft-shadow p-4 border-l-4 border-blue-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Subjects</p>
          <p className="text-2xl font-bold text-blue-600">{stats.total_subjects}</p>
        </Card>
        <Card className="glass-card soft-shadow p-4 border-l-4 border-emerald-500">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Average Percentage</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.average_percentage}%</p>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="glass-card soft-shadow">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search by examination name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted border border-input rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-muted-foreground" size={18} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-muted border border-input rounded-lg text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="all">All Types</option>
              {examTypes
                .filter((type): type is string => typeof type === "string")
                .map((type) => (
                  <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Examinations List */}
      {filteredExams.length === 0 ? (
        <Card className="glass-card soft-shadow">
          <div className="text-center py-12">
            <BarChart3 className="mx-auto mb-4 text-muted-foreground" size={48} />
            <p className="text-muted-foreground text-lg">No marks found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {examMarks.length === 0 
                ? 'Your examination marks will appear here once they are entered by teachers.'
                : 'No examinations match your search criteria.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredExams.map((exam) => (
            <motion.div
              key={exam.exam_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card soft-shadow hover:shadow-md transition-all">
                {/* Exam Header */}
                <div className="border-b border-input pb-4 mb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-bold text-foreground">{exam.exam_name}</h2>
                        {exam.exam_type && (
                          <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                            {exam.exam_type}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {exam.start_date && (
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>Start: {new Date(exam.start_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}</span>
                          </div>
                        )}
                        {exam.end_date && (
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>End: {new Date(exam.end_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}</span>
                          </div>
                        )}
                        {exam.academic_year && (
                          <span>Academic Year: {exam.academic_year}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="mb-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Overall</p>
                        <p className={`text-2xl font-bold ${getPercentageColor(exam.overall_percentage)}`}>
                          {exam.overall_percentage}%
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold border-2 ${getGradeColor(exam.overall_grade)}`}>
                        {exam.overall_grade}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-muted-foreground" />
                      <span className="text-muted-foreground">Total: </span>
                      <span className="font-semibold text-foreground">
                        {exam.total_marks} / {exam.total_max_marks}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="text-muted-foreground" />
                      <span className="text-muted-foreground">Subjects: </span>
                      <span className="font-semibold text-foreground">{exam.subjects.length}</span>
                    </div>
                  </div>
                </div>

                {/* Subjects Marks Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-input">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Subject</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Marks Obtained</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Max Marks</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Percentage</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Grade</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-input">
                      {exam.subjects.map((subject) => (
                        <tr key={subject.id} className="hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {subject.subject_color && (
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: subject.subject_color }}
                                />
                              )}
                              <span className="font-medium text-foreground">{subject.subject_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-foreground">
                            {subject.marks_obtained}
                          </td>
                          <td className="py-3 px-4 text-center text-muted-foreground">
                            {subject.max_marks}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-semibold ${getPercentageColor(subject.percentage)}`}>
                              {subject.percentage}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {subject.grade && (
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getGradeColor(subject.grade)}`}>
                                {subject.grade}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {subject.status === 'approved' ? (
                              <span className="flex items-center justify-center gap-1 text-emerald-600 text-xs font-medium">
                                <CheckCircle2 size={14} />
                                Approved
                              </span>
                            ) : subject.status === 'submitted' ? (
                              <span className="text-blue-600 text-xs font-medium">Submitted</span>
                            ) : subject.status === 'correction_required' ? (
                              <span className="text-orange-600 text-xs font-medium">Correction Required</span>
                            ) : (
                              <span className="text-gray-600 text-xs font-medium">Draft</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Remarks if any */}
                {exam.subjects.some(s => s.remarks) && (
                  <div className="mt-4 pt-4 border-t border-input">
                    <h3 className="text-sm font-semibold text-foreground mb-2">Remarks</h3>
                    <div className="space-y-2">
                      {exam.subjects.filter(s => s.remarks).map((subject) => (
                        <div key={subject.id} className="p-2 bg-muted rounded-lg">
                          <p className="text-xs font-medium text-muted-foreground mb-1">{subject.subject_name}:</p>
                          <p className="text-sm text-foreground">{subject.remarks}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
