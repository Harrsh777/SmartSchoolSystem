'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { mockNotices } from '@/lib/demoData';
import { MessageSquare, Bell, AlertCircle, Calendar, FileText, DollarSign, BookOpen } from 'lucide-react';

export default function CommunicationPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school } = use(params);
  const notices = mockNotices;

  const priorityColors = {
    'High': 'bg-red-100 text-red-800',
    'Medium': 'bg-yellow-100 text-yellow-800',
    'Low': 'bg-blue-100 text-blue-800',
  };

  // Category icons available for future use
  const categoryIcons: Record<string, any> = {
    'Examination': FileText,
    'Meeting': Calendar,
    'Event': Calendar,
    'Fee': DollarSign,
    'Library': BookOpen,
    'Holiday': Calendar,
  };

  const stats = {
    total: notices.length,
    active: notices.filter(n => n.status === 'Active').length,
    highPriority: notices.filter(n => n.priority === 'High').length,
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Communication Hub</h1>
            <p className="text-gray-600">Manage notices, announcements, and messages</p>
          </div>
          <button className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
            + New Notice
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-3 rounded-lg">
                <MessageSquare className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Notices</p>
                <p className="text-2xl font-bold text-black">{stats.total}</p>
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
              <div className="bg-green-500 p-3 rounded-lg">
                <Bell className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Notices</p>
                <p className="text-2xl font-bold text-black">{stats.active}</p>
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
              <div className="bg-red-500 p-3 rounded-lg">
                <AlertCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-black">{stats.highPriority}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Notices List */}
      <div className="space-y-4">
        {notices.map((notice, index) => (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
          >
            <Card hover>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-xl font-bold text-black">{notice.title}</h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      priorityColors[notice.priority as keyof typeof priorityColors]
                    }`}>
                      {notice.priority}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {notice.category}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">{notice.content}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar size={16} />
                      <span>
                        {new Date(notice.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      notice.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {notice.status}
                    </span>
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
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

