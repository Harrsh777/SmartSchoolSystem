'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, Calendar, Clock, BookOpen, Users, FileText, Search } from 'lucide-react';

interface Exam {
  id: string;
  exam_name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  description?: string;
  created_at: string;
  class_mappings?: Array<{
    class_id: string;
    class: {
      id: string;
      class: string;
      section: string;
    };
  }>;
  subject_mappings?: Array<{
    subject_id: string;
    subject: {
      id: string;
      name: string;
    };
  }>;
}

export default function ExaminationDashboardPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/examinations/v2/list?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setExams(result.data);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExamStatus = (exam: Exam): 'upcoming' | 'ongoing' | 'completed' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(exam.start_date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(exam.end_date);
    endDate.setHours(0, 0, 0, 0);

    if (today < startDate) {
      return 'upcoming';
    } else if (today >= startDate && today <= endDate) {
      return 'ongoing';
    } else {
      return 'completed';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ongoing':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredExams = exams.filter(exam => {
    // Filter by status
    if (filter !== 'all') {
      const examStatus = getExamStatus(exam);
      if (filter !== examStatus) return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        exam.exam_name.toLowerCase().includes(query) ||
        exam.academic_year.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const upcomingExams = exams.filter(e => getExamStatus(e) === 'upcoming');
  const ongoingExams = exams.filter(e => getExamStatus(e) === 'ongoing');
  const completedExams = exams.filter(e => getExamStatus(e) === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5A7A95] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#5A7A95] font-medium">Loading examinations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/examinations`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Examination Dashboard</h1>
            <p className="text-gray-600">View all examinations - previous, ongoing, and upcoming</p>
          </div>
        </div>
        <Button onClick={() => router.push(`/dashboard/${schoolCode}/examinations/create`)}>
          <FileText size={18} className="mr-2" />
          Create New Exam
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Exams</p>
              <p className="text-3xl font-bold text-gray-900">{exams.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Upcoming</p>
              <p className="text-3xl font-bold text-blue-600">{upcomingExams.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Ongoing</p>
              <p className="text-3xl font-bold text-green-600">{ongoingExams.length}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Clock className="text-green-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-3xl font-bold text-gray-600">{completedExams.length}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <BookOpen className="text-gray-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by exam name or academic year..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5A7A95] focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {(['all', 'upcoming', 'ongoing', 'completed'] as const).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === filterOption
                    ? 'bg-[#5A7A95] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Exams List */}
      {filteredExams.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg mb-2">No examinations found</p>
            <p className="text-gray-500 text-sm mb-6">
              {searchQuery || filter !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'Create your first examination to get started'}
            </p>
            {!searchQuery && filter === 'all' && (
              <Button onClick={() => router.push(`/dashboard/${schoolCode}/examinations/create`)}>
                <FileText size={18} className="mr-2" />
                Create Examination
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => {
            const examStatus = getExamStatus(exam);
            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/dashboard/${schoolCode}/examinations/${exam.id}`)}>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{exam.exam_name}</h3>
                        <p className="text-sm text-gray-600">{exam.academic_year}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(examStatus)}`}>
                        {examStatus.charAt(0).toUpperCase() + examStatus.slice(1)}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar size={16} className="text-gray-500" />
                        <span>
                          {new Date(exam.start_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })} - {new Date(exam.end_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      {exam.class_mappings && exam.class_mappings.length > 0 && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Users size={16} className="text-gray-500" />
                          <span>
                            {exam.class_mappings.length} Class{exam.class_mappings.length !== 1 ? 'es' : ''}
                          </span>
                        </div>
                      )}

                      {exam.subject_mappings && exam.subject_mappings.length > 0 && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <BookOpen size={16} className="text-gray-500" />
                          <span>
                            {exam.subject_mappings.length} Subject{exam.subject_mappings.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/${schoolCode}/examinations/${exam.id}`);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
