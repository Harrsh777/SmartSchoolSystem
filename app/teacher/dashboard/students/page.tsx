'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { GraduationCap, Search } from 'lucide-react';
import type { Staff, Student } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

export default function AllStudentsPage() {
  // teacher kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [teacher, setTeacher] = useState<Staff | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      fetchStudents(teacherData);
    }
  }, []);

  const fetchStudents = async (teacherData: Staff) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/students?school_code=${teacherData.school_code}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStudents(result.data);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter((student) => {
    const query = searchQuery.toLowerCase();
    const studentName = getString(student.student_name).toLowerCase();
    const admissionNo = getString(student.admission_no).toLowerCase();
    const studentClass = getString(student.class).toLowerCase();
    const section = getString(student.section).toLowerCase();
    return (
      studentName.includes(query) ||
      admissionNo.includes(query) ||
      studentClass.includes(query) ||
      section.includes(query)
    );
  });

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
          <div className="p-2 bg-blue-100 rounded-lg">
            <GraduationCap className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Students</h1>
            <p className="text-gray-600">View all students in the school</p>
          </div>
        </div>
      </motion.div>

      <Card>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Search by name, admission number, class, or section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">
              {searchQuery ? 'No students found matching your search' : 'No students found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Admission No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Class</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Section</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Parent Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.map((student, index) => {
                  const studentId = getString(student.id) || `student-${index}`;
                  const admissionNo = getString(student.admission_no);
                  const studentName = getString(student.student_name);
                  const studentClass = getString(student.class);
                  const section = getString(student.section);
                  const parentName = getString(student.parent_name);
                  return (
                    <tr key={studentId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{admissionNo || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{studentName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{studentClass || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{section || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{parentName || 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

