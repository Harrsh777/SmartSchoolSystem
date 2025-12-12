'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { mockExams } from '@/lib/demoData';
import { FileText, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function ExamsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  use(params); // school param available if needed
  const exams = mockExams;

  const statusColors = {
    'Upcoming': 'bg-blue-100 text-blue-800',
    'Scheduled': 'bg-yellow-100 text-yellow-800',
    'Completed': 'bg-green-100 text-green-800',
  };

  const statusIcons = {
    'Upcoming': AlertCircle,
    'Scheduled': Calendar,
    'Completed': CheckCircle,
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Examinations</h1>
            <p className="text-gray-600">Manage and track all examinations</p>
          </div>
          <button className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
            + Schedule Exam
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-3 rounded-lg">
                <FileText className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Exams</p>
                <p className="text-2xl font-bold text-black">{exams.length}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-yellow-500 p-3 rounded-lg">
                <Calendar className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-black">{exams.filter(e => e.status === 'Upcoming').length}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <CheckCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-black">{exams.filter(e => e.status === 'Completed').length}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-purple-500 p-3 rounded-lg">
                <Clock className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-black">{exams.filter(e => e.status === 'Scheduled').length}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Exams List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <h2 className="text-xl font-bold text-black mb-6">All Examinations</h2>
          <div className="space-y-4">
            {exams.map((exam, index) => {
              const StatusIcon = statusIcons[exam.status as keyof typeof statusIcons];
              return (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="p-6 border border-gray-200 rounded-lg hover:border-black transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-bold text-black">{exam.name}</h3>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          statusColors[exam.status as keyof typeof statusColors]
                        }`}>
                          <StatusIcon size={14} className="mr-1" />
                          {exam.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Subject</p>
                          <p className="font-medium text-black">{exam.subject}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Class</p>
                          <p className="font-medium text-black">{exam.class}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Date & Time</p>
                          <p className="font-medium text-black">
                            {new Date(exam.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {exam.time}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Duration</p>
                          <p className="font-medium text-black">{exam.duration}</p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex space-x-2">
                      <button className="px-4 py-2 text-sm border-2 border-gray-300 hover:border-black rounded-lg transition-colors">
                        Edit
                      </button>
                      <button className="px-4 py-2 text-sm bg-black text-white hover:bg-gray-800 rounded-lg transition-colors">
                        View
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

