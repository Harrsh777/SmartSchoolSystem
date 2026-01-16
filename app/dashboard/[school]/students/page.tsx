'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Users, Search, Plus, Upload, HelpCircle } from 'lucide-react';
import type { Student } from '@/lib/supabase';
import StudentSetupGuide from '@/components/students/StudentSetupGuide';
import StudentsTutorial from '@/components/students/StudentsTutorial';

export default function StudentsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Helper to safely get string value
  const getString = (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  };

  useEffect(() => {
    // Check if setup guide has been completed
    const setupCompleted = localStorage.getItem('student_setup_completed');
    if (!setupCompleted) {
      setShowSetupGuide(true);
    }
    fetchStudents();
    
    // Check for query parameters from classes page
    const params = new URLSearchParams(window.location.search);
    const classParam = params.get('class');
    const sectionParam = params.get('section');
    // yearParam kept for potential future use
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const yearParam = params.get('year');
    
    if (classParam) {
      setClassFilter(classParam);
    }
    if (sectionParam) {
      setSearchQuery(prev => prev ? `${prev} ${sectionParam}` : sectionParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/students?school_code=${schoolCode}`);
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

  const filteredStudents = students.filter(student => {
    const studentName = getString(student.student_name).toLowerCase();
    const admissionNo = getString(student.admission_no).toLowerCase();
    const className = getString(student.class).toLowerCase();
    const query = searchQuery.toLowerCase();
    
    const matchesSearch = 
      studentName.includes(query) ||
      admissionNo.includes(query) ||
      className.includes(query);
    
    const studentClass = getString(student.class);
    const matchesClass = classFilter === 'all' || studentClass === classFilter;
    
    // Check URL params for additional filtering (from classes page)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const classParam = params.get('class');
      const sectionParam = params.get('section');
      const yearParam = params.get('year');
      
      if (classParam && studentClass !== classParam) return false;
      const studentSection = getString(student.section);
      if (sectionParam && studentSection !== sectionParam) return false;
      const studentYear = getString(student.academic_year);
      if (yearParam && studentYear !== yearParam) return false;
    }
    
    return matchesSearch && matchesClass;
  });

  const uniqueClasses: string[] = Array.from(
    new Set(students.map(s => getString(s.class)).filter(c => c.length > 0))
  ).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {showSetupGuide && (
        <StudentSetupGuide onComplete={() => setShowSetupGuide(false)} />
      )}

      {showTutorial && (
        <StudentsTutorial
          schoolCode={schoolCode}
          onClose={() => setShowTutorial(false)}
        />
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Students</h1>
            <p className="text-gray-600">Manage all student records and information</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowTutorial(true)}
            >
              <HelpCircle size={18} className="mr-2" />
              Tutorial
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/${schoolCode}/students/import`)}
            >
              <Upload size={18} className="mr-2" />
              Bulk Import
            </Button>
            <Button onClick={() => router.push(`/dashboard/${schoolCode}/students/add`)}>
              <Plus size={18} className="mr-2" />
              Add Student
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search students by name, admission number, or class..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
            <select 
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="all">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </Card>
      </motion.div>

      {/* Students List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 text-lg mb-2">No students found</p>
              <p className="text-gray-500 text-sm mb-6">
                {students.length === 0 
                  ? 'Get started by adding your first student'
                  : 'Try adjusting your search or filters'}
              </p>
              {students.length === 0 && (
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/dashboard/${schoolCode}/students/import`)}
                  >
                    <Upload size={18} className="mr-2" />
                    Bulk Import
                  </Button>
                  <Button onClick={() => router.push(`/dashboard/${schoolCode}/students/add`)}>
                    <Plus size={18} className="mr-2" />
                    Add Student
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Admission No</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Name</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Class</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Section</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, index) => (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4 font-medium text-black">{getString(student.admission_no) || 'N/A'}</td>
                      <td className="py-4 px-4 text-gray-700">{getString(student.student_name) || 'N/A'}</td>
                      <td className="py-4 px-4 text-gray-700">{getString(student.class) || 'N/A'}</td>
                      <td className="py-4 px-4 text-gray-700">{getString(student.section) || 'N/A'}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          (() => {
                            const status = getString(student.status);
                            return status === 'active' 
                              ? 'bg-green-100 text-green-800'
                              : status === 'inactive'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800';
                          })()
                        }`}>
                          {getString(student.status) || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => router.push(`/dashboard/${schoolCode}/students/${student.id}/view`)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View
                          </button>
                          <span className="text-gray-300">|</span>
                          <button 
                            onClick={() => router.push(`/dashboard/${schoolCode}/students/${student.id}/edit`)}
                            className="text-gray-600 hover:text-black text-sm font-medium"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Stats Summary */}
      {students.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-3 rounded-lg">
                <Users className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-black">{students.length}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <Users className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Students</p>
                <p className="text-2xl font-bold text-black">
                  {students.filter(s => getString(s.status) === 'active').length}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-purple-500 p-3 rounded-lg">
                <Users className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Classes</p>
                <p className="text-2xl font-bold text-black">{uniqueClasses.length}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

