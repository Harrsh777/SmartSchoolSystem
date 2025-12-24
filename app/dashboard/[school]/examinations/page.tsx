'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, Calendar, Edit, Trash2, Eye } from 'lucide-react';
import CreateExamModal from '@/components/examinations/CreateExamModal';
import type { Exam } from '@/lib/supabase';

interface ExamWithCount extends Exam {
  schedule_count?: number;
}

export default function ExaminationsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [exams, setExams] = useState<ExamWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchExams();
  }, [schoolCode]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/examinations?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setExams(result.data);
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/examinations/${examId}?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        fetchExams();
      } else {
        alert(result.error || 'Failed to delete exam');
      }
    } catch (error) {
      console.error('Error deleting exam:', error);
      alert('Failed to delete exam. Please try again.');
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endDate = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startDate} - ${endDate}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading examinations...</p>
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
            <h1 className="text-3xl font-bold text-black mb-2">Examinations</h1>
            <p className="text-gray-600">Schedule exams and manage timetables</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={18} className="mr-2" />
            Create New Exam
          </Button>
        </div>
      </motion.div>

      {/* Exams Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          {exams.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 text-lg mb-2">No examinations found</p>
              <p className="text-gray-500 text-sm mb-6">
                Create your first exam to get started
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus size={18} className="mr-2" />
                Create New Exam
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Exam Name</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Academic Year</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Date Range</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Schedules</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => (
                    <tr
                      key={exam.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4 font-medium text-black">{exam.name}</td>
                      <td className="py-4 px-4 text-gray-700">{exam.academic_year}</td>
                      <td className="py-4 px-4 text-gray-700">
                        {formatDateRange(exam.start_date, exam.end_date)}
                      </td>
                      <td className="py-4 px-4 text-gray-700">
                        {exam.schedule_count || 0} schedule(s)
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          exam.status === 'scheduled' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {exam.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/${schoolCode}/examinations/${exam.id}/schedule`)}
                            className="text-blue-600 hover:text-blue-800"
                            title="View Schedule"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => {
                              // Edit functionality can be added later
                              alert('Edit functionality coming soon');
                            }}
                            className="text-gray-600 hover:text-black"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(exam.id!)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                            disabled={(exam.schedule_count || 0) > 0}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Create Exam Modal */}
      {showCreateModal && (
        <CreateExamModal
          schoolCode={schoolCode}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchExams();
          }}
        />
      )}
    </div>
  );
}

