'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, Plus, Calendar, Edit, Trash2 } from 'lucide-react';
import ScheduleTable from '@/components/examinations/ScheduleTable';
import AddScheduleModal from '@/components/examinations/AddScheduleModal';
import EditScheduleModal from '@/components/examinations/EditScheduleModal';
import type { Exam, ExamSchedule } from '@/lib/supabase';

export default function ExamSchedulePage({
  params,
}: {
  params: Promise<{ school: string; examId: string }>;
}) {
  const { school: schoolCode, examId } = use(params);
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ExamSchedule | null>(null);
  const [classFilter, setClassFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  useEffect(() => {
    fetchExam();
    fetchSchedules();
  }, [examId, schoolCode]);

  const fetchExam = async () => {
    try {
      const response = await fetch(`/api/examinations/${examId}?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setExam(result.data);
      } else {
        router.push(`/dashboard/${schoolCode}/examinations`);
      }
    } catch (err) {
      console.error('Error fetching exam:', err);
      router.push(`/dashboard/${schoolCode}/examinations`);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await fetch(`/api/examinations/${examId}/schedules?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setSchedules(result.data);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (schedule: ExamSchedule) => {
    setSelectedSchedule(schedule);
    setShowEditModal(true);
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/examinations/${examId}/schedules/${scheduleId}?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        fetchSchedules();
      } else {
        alert(result.error || 'Failed to delete schedule');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule. Please try again.');
    }
  };

  const filteredSchedules = schedules.filter(schedule => {
    const matchesClass = classFilter === 'all' || schedule.class === classFilter;
    const matchesSection = sectionFilter === 'all' || schedule.section === sectionFilter;
    
    let matchesDate = true;
    if (dateFilter.start) {
      const scheduleDate = new Date(schedule.exam_date);
      const filterStart = new Date(dateFilter.start);
      if (scheduleDate < filterStart) matchesDate = false;
    }
    if (dateFilter.end) {
      const scheduleDate = new Date(schedule.exam_date);
      const filterEnd = new Date(dateFilter.end);
      if (scheduleDate > filterEnd) matchesDate = false;
    }
    
    return matchesClass && matchesSection && matchesDate;
  });

  const uniqueClasses = Array.from(new Set(schedules.map(s => s.class))).sort();
  const uniqueSections = classFilter !== 'all' 
    ? Array.from(new Set(schedules.filter(s => s.class === classFilter).map(s => s.section))).sort()
    : Array.from(new Set(schedules.map(s => s.section))).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading schedule...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg mb-4">Exam not found</p>
          <Button onClick={() => router.push(`/dashboard/${schoolCode}/examinations`)}>
            Back to Examinations
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
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
            <h1 className="text-3xl font-bold text-black mb-2">
              {exam.name} — {exam.academic_year}
            </h1>
            <p className="text-gray-600">Schedule exams class-wise and subject-wise</p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={18} className="mr-2" />
          Add Schedule
        </Button>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Class</label>
              <select
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setSectionFilter('all');
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="all">All Classes</option>
                {uniqueClasses.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Section</label>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="all">All Sections</option>
                {uniqueSections.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={dateFilter.start}
                onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={dateFilter.end}
                onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Schedule Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ScheduleTable
          schedules={filteredSchedules}
          exam={exam}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </motion.div>

      {/* Modals */}
      {showAddModal && (
        <AddScheduleModal
          schoolCode={schoolCode}
          examId={examId}
          exam={exam}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchSchedules();
          }}
        />
      )}

      {showEditModal && selectedSchedule && (
        <EditScheduleModal
          schoolCode={schoolCode}
          examId={examId}
          exam={exam}
          schedule={selectedSchedule}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSchedule(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedSchedule(null);
            fetchSchedules();
          }}
        />
      )}
    </div>
  );
}

