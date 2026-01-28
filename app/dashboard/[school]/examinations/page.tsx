'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ModuleGuideButton from '@/components/ModuleGuideButton';
import { 
  Plus, 
  Trash2, 
  BookOpen, 
  Users, 
  FileText, 
  GraduationCap,
  BarChart3
} from 'lucide-react';

interface Exam {
  id: string;
  name: string;
  exam_type: string | null;
  total_max_marks: number;
  created_at: string;
  class: {
    id: string;
    class: string;
    section: string;
    academic_year: string;
  } | null;
  created_by_staff: {
    id: string;
    full_name: string;
    staff_id: string;
  } | null;
  exam_subjects: Array<{
    id: string;
    subject_id: string;
    max_marks: number;
    subject: {
      id: string;
      name: string;
      color: string;
    };
  }>;
  subjects_count: number;
}

export default function ExaminationsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!confirm('Are you sure you want to delete this exam? This will delete all associated marks. This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/examinations/${examId}?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        fetchExams();
        alert('Examination deleted successfully');
      } else {
        alert(result.error || 'Failed to delete exam');
      }
    } catch (error) {
      console.error('Error deleting exam:', error);
      alert('Failed to delete exam. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5A7A95] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#5A7A95] dark:text-[#6B9BB8] font-medium">Loading examinations...</p>
        </div>
      </div>
    );
  }

  const examinationSections = [
    {
      id: 'dashboard',
      title: 'Examination Dashboard',
      description: 'View all examinations - previous, ongoing, and upcoming',
      icon: BarChart3,
      path: `/dashboard/${schoolCode}/examinations/dashboard`,
      color: 'from-[#5A7A95] to-[#6B9BB8]',
    },
    {
      id: 'create',
      title: 'Create Examination',
      description: 'Create new examinations with class mapping, subjects, and schedules',
      icon: Plus,
      path: `/dashboard/${schoolCode}/examinations/create`,
      color: 'from-[#6B9BB8] to-[#7DB5D3]',
    },
    {
      id: 'grade-scale',
      title: 'Grade Scale',
      description: 'Configure grade scales and grading systems',
      icon: GraduationCap,
      path: `/dashboard/${schoolCode}/examinations/grade-scale`,
      color: 'from-[#567C8D] to-[#5A7A95]',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white mb-2 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8]">
                <FileText className="text-white" size={28} />
              </div>
              Examinations
            </h1>
            <p className="text-gray-600">Manage examinations, marks, and reports</p>
          </div>
          <ModuleGuideButton />
        </div>
      </motion.div>

      {/* Examination Sections Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {examinationSections.map((section, index) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <motion.div
                  whileHover={{ y: -5, scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 border-transparent hover:border-[#5A7A95]/30 dark:hover:border-[#6B9BB8]/30"
                    onClick={() => router.push(section.path)}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-4 rounded-xl bg-gradient-to-br ${section.color} shadow-lg group-hover:scale-110 transition-transform`}
                      >
                        <Icon className="text-white" size={28} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-[#5A7A95] dark:group-hover:text-[#6B9BB8] transition-colors">
                          {section.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                          {section.description}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group-hover:border-[#5A7A95] dark:group-hover:border-[#6B9BB8] group-hover:text-[#5A7A95] dark:group-hover:text-[#6B9BB8]"
                        >
                          Open →
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Existing Examinations Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-black">Created Examinations</h2>
          <Button onClick={() => router.push(`/dashboard/${schoolCode}/examinations/create`)}>
            <Plus size={18} className="mr-2" />
            Create New
          </Button>
        </div>

        {/* Exams Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
              <p className="text-gray-600">Loading examinations...</p>
            </div>
          </div>
        ) : exams.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 text-lg mb-2">No examinations found</p>
              <p className="text-gray-500 text-sm mb-6">
                Create your first examination to get started
              </p>
              <Button onClick={() => router.push(`/dashboard/${schoolCode}/examinations/create`)}>
                <Plus size={18} className="mr-2" />
                Create Examination
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {exams.map((exam) => (
              <Card key={exam.id} hover>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-black mb-1">{exam.name}</h3>
                    {exam.exam_type && (
                      <p className="text-sm text-gray-600">{exam.exam_type}</p>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    {exam.class ? (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Users size={16} className="text-gray-500" />
                        <span>
                          Class {exam.class.class} - Section {exam.class.section}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <Users size={16} />
                        <span>Class information not available</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-700">
                      <BookOpen size={16} className="text-gray-500" />
                      <span>{exam.subjects_count} Subject{exam.subjects_count !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="text-gray-700">
                      <span className="font-semibold">Total Max Marks:</span> {exam.total_max_marks}
                    </div>
                    {exam.created_by_staff ? (
                      <div className="text-gray-600 text-xs">
                        Created by {exam.created_by_staff.full_name}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-xs">
                        Creator information not available
                      </div>
                    )}
                    <div className="text-gray-500 text-xs">
                      {new Date(exam.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/${schoolCode}/examinations/${exam.id}/marks`)}
                      className="flex-1"
                    >
                      View Marks
                    </Button>
                    <button
                      onClick={() => handleDelete(exam.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

