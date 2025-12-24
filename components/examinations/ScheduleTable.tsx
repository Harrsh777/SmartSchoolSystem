'use client';

import Card from '@/components/ui/Card';
import { Calendar, Edit, Trash2 } from 'lucide-react';
import type { Exam, ExamSchedule } from '@/lib/supabase';

interface ScheduleTableProps {
  schedules: ExamSchedule[];
  exam: Exam;
  onEdit: (schedule: ExamSchedule) => void;
  onDelete: (scheduleId: string) => void;
}

export default function ScheduleTable({
  schedules,
  exam,
  onEdit,
  onDelete,
}: ScheduleTableProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (schedules.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 text-lg mb-2">No schedules found</p>
          <p className="text-gray-500 text-sm">
            Add your first exam schedule to get started
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-4 px-4 font-semibold text-gray-700">Date</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-700">Class</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-700">Section</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-700">Subject</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-700">Time</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-700">Room</th>
              <th className="text-left py-4 px-4 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule) => (
              <tr
                key={schedule.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-700">{formatDate(schedule.exam_date)}</span>
                  </div>
                </td>
                <td className="py-4 px-4 font-medium text-black">{schedule.class}</td>
                <td className="py-4 px-4 text-gray-700">{schedule.section}</td>
                <td className="py-4 px-4 text-gray-700">{schedule.subject}</td>
                <td className="py-4 px-4 text-gray-700">
                  {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                </td>
                <td className="py-4 px-4 text-gray-700">{schedule.room || '-'}</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(schedule)}
                      className="text-gray-600 hover:text-black"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => onDelete(schedule.id!)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
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
    </Card>
  );
}

