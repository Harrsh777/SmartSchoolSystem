'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { mockAttendance } from '@/lib/demoData';
import { Calendar, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

export default function AttendancePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school } = use(params);
  const attendance = mockAttendance;

  const overallStats = {
    totalPresent: attendance.reduce((sum, a) => sum + a.present, 0),
    totalAbsent: attendance.reduce((sum, a) => sum + a.absent, 0),
    averagePercentage: Math.round(attendance.reduce((sum, a) => sum + a.percentage, 0) / attendance.length),
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Attendance</h1>
            <p className="text-gray-600">Track and manage student attendance records</p>
          </div>
          <button className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
            Mark Attendance
          </button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <CheckCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Present</p>
                <p className="text-2xl font-bold text-black">{overallStats.totalPresent}</p>
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
              <div className="bg-red-500 p-3 rounded-lg">
                <XCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Absent</p>
                <p className="text-2xl font-bold text-black">{overallStats.totalAbsent}</p>
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
              <div className="bg-blue-500 p-3 rounded-lg">
                <TrendingUp className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Attendance</p>
                <p className="text-2xl font-bold text-black">{overallStats.averagePercentage}%</p>
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
                <Calendar className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Records Today</p>
                <p className="text-2xl font-bold text-black">{attendance.filter(a => a.date === '2024-01-15').length}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Attendance Records */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <h2 className="text-xl font-bold text-black mb-6">Recent Attendance Records</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Class</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Present</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Absent</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Percentage</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record, index) => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      {new Date(record.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="py-4 px-4 font-medium text-black">{record.class}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        {record.present}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        {record.absent}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        record.percentage >= 90 ? 'bg-green-100 text-green-800' :
                        record.percentage >= 75 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {record.percentage}%
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        View Details
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

