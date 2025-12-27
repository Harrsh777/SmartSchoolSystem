'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { UserCheck } from 'lucide-react';
import type { Staff, Class } from '@/lib/supabase';

export default function ClassesPage() {
  // teacher kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [teacher, setTeacher] = useState<Staff | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      fetchClasses(teacherData);
    }
  }, []);

  const fetchClasses = async (teacherData: Staff) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/classes?school_code=${teacherData.school_code}`);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <UserCheck className="text-indigo-600" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
            <p className="text-gray-600">View all classes in the school</p>
          </div>
        </div>
      </motion.div>

      <Card>
        {classes.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">No classes found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Class</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Section</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Academic Year</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Students</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Class Teacher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {classes.map((cls) => (
                  <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{cls.class}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{cls.section}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{cls.academic_year}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {(cls as Class & { student_count?: number }).student_count || 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {(cls as Class & { class_teacher?: { full_name?: string } }).class_teacher?.full_name || 'Not assigned'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

