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
            <h1 className="text-3xl font-bold text-black dark:text-white mb-2 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8]">
                <Users className="text-white" size={28} />
              </div>
              Students
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage all student records and information</p>
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
              className="px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] focus:border-transparent transition-all hover:border-[#5A7A95]/50 dark:hover:border-[#6B9BB8]/50"
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
                  <tr className="border-b-2 border-[#5A7A95]/20 dark:border-[#6B9BB8]/20 bg-gradient-to-r from-[#F0F5F9] to-white dark:from-[#1e293b] dark:to-[#2F4156]">
                    <th className="text-left py-4 px-4 font-semibold text-[#5A7A95] dark:text-[#6B9BB8]">Admission No</th>
                    <th className="text-left py-4 px-4 font-semibold text-[#5A7A95] dark:text-[#6B9BB8]">Name</th>
                    <th className="text-left py-4 px-4 font-semibold text-[#5A7A95] dark:text-[#6B9BB8]">Class</th>
                    <th className="text-left py-4 px-4 font-semibold text-[#5A7A95] dark:text-[#6B9BB8]">Section</th>
                    <th className="text-left py-4 px-4 font-semibold text-[#5A7A95] dark:text-[#6B9BB8]">Status</th>
                    <th className="text-left py-4 px-4 font-semibold text-[#5A7A95] dark:text-[#6B9BB8]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, index) => (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-[#F0F5F9] dark:hover:bg-[#2F4156] transition-colors"
                    >
                      <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">{getString(student.admission_no) || 'N/A'}</td>
                      <td className="py-4 px-4 text-gray-700 dark:text-gray-300">{getString(student.student_name) || 'N/A'}</td>
                      <td className="py-4 px-4 text-gray-700 dark:text-gray-300">{getString(student.class) || 'N/A'}</td>
                      <td className="py-4 px-4 text-gray-700 dark:text-gray-300">{getString(student.section) || 'N/A'}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          (() => {
                            const status = getString(student.status);
                            return status === 'active' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : status === 'inactive'
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                              : 'bg-[#5A7A95]/10 dark:bg-[#6B9BB8]/20 text-[#5A7A95] dark:text-[#6B9BB8]';
                          })()
                        }`}>
                          {getString(student.status) || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => router.push(`/dashboard/${schoolCode}/students/${student.id}/view`)}
                            className="text-[#5A7A95] dark:text-[#6B9BB8] hover:text-[#6B9BB8] dark:hover:text-[#7DB5D3] text-sm font-medium transition-colors"
                          >
                            View
                          </button>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <button 
                            onClick={() => router.push(`/dashboard/${schoolCode}/students/${student.id}/edit`)}
                            className="text-gray-600 dark:text-gray-400 hover:text-[#5A7A95] dark:hover:text-[#6B9BB8] text-sm font-medium transition-colors"
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
          >
            <Card className="p-6 bg-gradient-to-br from-[#5A7A95] to-[#567C8D] text-white hover:shadow-xl transition-all">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                  <Users className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-sm text-[#C8D9E6]">Total Students</p>
                  <p className="text-3xl font-bold text-white">{students.length}</p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.05 }}
          >
            <Card className="p-6 bg-gradient-to-br from-[#6B9BB8] to-[#5A7A95] text-white hover:shadow-xl transition-all">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                  <Users className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-sm text-[#C8D9E6]">Active Students</p>
                  <p className="text-3xl font-bold text-white">
                    {students.filter(s => getString(s.status) === 'active').length}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.05 }}
          >
            <Card className="p-6 bg-gradient-to-br from-[#567C8D] to-[#6B9BB8] text-white hover:shadow-xl transition-all">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                  <Users className="text-white" size={24} />
                </div>
                <div>
                  <p className="text-sm text-[#C8D9E6]">Classes</p>
                  <p className="text-3xl font-bold text-white">{uniqueClasses.length}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

