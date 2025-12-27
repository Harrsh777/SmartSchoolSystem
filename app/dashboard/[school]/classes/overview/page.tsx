'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { Search, BookOpen, Users, User } from 'lucide-react';
import type { ClassWithDetails } from '@/lib/supabase';

export default function ClassOverviewPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setClasses(result.data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(cls => {
    const searchLower = searchQuery.toLowerCase();
    return (
      cls.class.toLowerCase().includes(searchLower) ||
      cls.section.toLowerCase().includes(searchLower) ||
      cls.academic_year.toLowerCase().includes(searchLower) ||
      (cls.class_teacher?.full_name.toLowerCase().includes(searchLower) || false)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <BookOpen size={32} />
            Class Overview
          </h1>
          <p className="text-gray-600">View all classes and their assigned class teachers</p>
        </div>
      </motion.div>

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            type="text"
            placeholder="Search classes by class, section, year, or teacher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Classes Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-teal-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Class</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Section</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Academic Year</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Students</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Class Teacher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredClasses.length > 0 ? (
                filteredClasses.map((classItem) => (
                  <tr key={classItem.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{classItem.class}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{classItem.section}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{classItem.academic_year}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Users size={16} />
                        {classItem.student_count || 0}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {classItem.class_teacher ? (
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-gray-400" />
                          <span className="text-gray-700">{classItem.class_teacher.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Not assigned</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No classes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

