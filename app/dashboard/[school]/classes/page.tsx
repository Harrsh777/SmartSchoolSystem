'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { mockClasses } from '@/lib/demoData';
import { BookOpen, Users, MapPin } from 'lucide-react';

export default function ClassesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  use(params); // school param available if needed
  const classes = mockClasses;

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Classes</h1>
            <p className="text-gray-600">Manage all classes and sections</p>
          </div>
          <button className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
            + Add Class
          </button>
        </div>
      </motion.div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((classItem, index) => (
          <motion.div
            key={classItem.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card hover>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-black mb-1">{classItem.name}</h3>
                  <p className="text-sm text-gray-600">Grade {classItem.grade} - Section {classItem.section}</p>
                </div>
                <div className="bg-blue-500 p-3 rounded-lg">
                  <BookOpen className="text-white" size={24} />
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Users size={18} />
                    <span className="text-sm">Students</span>
                  </div>
                  <span className="font-semibold text-black">{classItem.students}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <span className="text-sm">Class Teacher</span>
                  </div>
                  <span className="font-medium text-black text-sm">{classItem.teacher}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin size={18} />
                    <span className="text-sm">Room</span>
                  </div>
                  <span className="font-medium text-black">{classItem.room}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-2">
                <button className="flex-1 px-3 py-2 text-sm bg-black text-white hover:bg-gray-800 rounded-lg transition-colors">
                  View Details
                </button>
                <button className="px-3 py-2 text-sm border-2 border-gray-300 hover:border-black rounded-lg transition-colors">
                  Edit
                </button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Card>
          <div className="flex items-center space-x-4">
            <div className="bg-blue-500 p-3 rounded-lg">
              <BookOpen className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Classes</p>
              <p className="text-2xl font-bold text-black">{classes.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center space-x-4">
            <div className="bg-green-500 p-3 rounded-lg">
              <Users className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-black">{classes.reduce((sum, c) => sum + c.students, 0)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center space-x-4">
            <div className="bg-purple-500 p-3 rounded-lg">
              <BookOpen className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Class Size</p>
              <p className="text-2xl font-bold text-black">
                {Math.round(classes.reduce((sum, c) => sum + c.students, 0) / classes.length)}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

