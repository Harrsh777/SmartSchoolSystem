'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, Calendar, BookOpen, Users, FileText, Clock, Trash2, BarChart3 } from 'lucide-react';

interface Exam {
  id: string;
  exam_name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  status: string;
  description?: string;
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
    max_marks: number;
    pass_marks: number;
  }>;
}

export default function ExaminationDetailPage({
  params,
}: {
  params: Promise<{ school: string; examId: string }>;
}) {
  const { school: schoolCode, examId } = use(params);
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, schoolCode]);

  const fetchExam = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/examinations/v2/list?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        const foundExam = result.data.find((e: Exam) => e.id === examId);
        if (foundExam) {
          setExam(foundExam);
        }
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this examination? This will delete all associated marks and schedules. This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      const response = await fetch(`/api/examinations/${examId}?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        alert('Examination deleted successfully');
        router.push(`/dashboard/${schoolCode}/examinations/dashboard`);
      } else {
        alert(result.error || 'Failed to delete examination');
      }
    } catch (error) {
      console.error('Error deleting exam:', error);
      alert('Failed to delete examination. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      upcoming: 'bg-blue-100 text-blue-800',
      ongoing: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5A7A95] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#5A7A95] font-medium">Loading examination details...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push(`/dashboard/${schoolCode}/examinations/dashboard`)}>
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Examination Not Found</h1>
        </div>
        <Card>
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg mb-2">Examination not found</p>
            <p className="text-gray-500 text-sm">
              The examination you&apos;re looking for doesn&apos;t exist or has been deleted.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const classesCount = exam.class_mappings?.length || 0;
  const subjectsCount = exam.subject_mappings?.length || 0;
  const totalMaxMarks = exam.subject_mappings?.reduce((sum, sm) => sum + (sm.max_marks || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push(`/dashboard/${schoolCode}/examinations/dashboard`)}>
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{exam.exam_name}</h1>
            <p className="text-gray-600">{exam.academic_year}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(exam.status)}
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 size={18} className="mr-2" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <p className="text-2xl font-bold text-gray-900">{exam.status || 'N/A'}</p>
            </div>
            <BarChart3 className="text-gray-400" size={32} />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Classes</p>
              <p className="text-2xl font-bold text-gray-900">{classesCount}</p>
            </div>
            <Users className="text-gray-400" size={32} />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Subjects</p>
              <p className="text-2xl font-bold text-gray-900">{subjectsCount}</p>
            </div>
            <BookOpen className="text-gray-400" size={32} />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Max Marks</p>
              <p className="text-2xl font-bold text-gray-900">{totalMaxMarks}</p>
            </div>
            <FileText className="text-gray-400" size={32} />
          </div>
        </Card>
      </div>

      {/* Dates */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Examination Dates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="text-gray-400" size={20} />
            <div>
              <p className="text-sm text-gray-600">Start Date</p>
              <p className="font-semibold text-gray-900">
                {exam.start_date ? new Date(exam.start_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }) : 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="text-gray-400" size={20} />
            <div>
              <p className="text-sm text-gray-600">End Date</p>
              <p className="font-semibold text-gray-900">
                {exam.end_date ? new Date(exam.end_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Classes */}
      {exam.class_mappings && exam.class_mappings.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Mapped Classes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {exam.class_mappings.map((cm) => (
              <div
                key={cm.class_id}
                className="p-4 border border-gray-200 rounded-lg hover:border-[#5A7A95] transition-colors"
              >
                <p className="font-semibold text-gray-900">
                  Class {cm.class?.class} - Section {cm.class?.section}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Subjects */}
      {exam.subject_mappings && exam.subject_mappings.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Subjects & Marks</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Subject</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Max Marks</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Pass Marks</th>
                </tr>
              </thead>
              <tbody>
                {exam.subject_mappings.map((sm) => (
                  <tr key={sm.subject_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {sm.subject?.name || 'Unknown'}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-700">{sm.max_marks || 0}</td>
                    <td className="py-3 px-4 text-center text-gray-700">{sm.pass_marks || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Description */}
      {exam.description && (
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{exam.description}</p>
        </Card>
      )}

      {/* Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => router.push(`/dashboard/${schoolCode}/examinations/${examId}/schedule`)}
          >
            <Clock size={18} className="mr-2" />
            View Schedule
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/examinations/${examId}/marks`)}
          >
            <BarChart3 size={18} className="mr-2" />
            View Marks
          </Button>
        </div>
      </Card>
    </div>
  );
}
