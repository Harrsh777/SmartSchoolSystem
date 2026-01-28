'use client';

import { useState, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { 
  UserCheck, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Users, 
  Filter,
  X,
  Loader2,
  GraduationCap
} from 'lucide-react';
import type { Staff, Class } from '@/lib/supabase';

interface Student {
  id: string;
  student_name: string;
  admission_no: string;
  roll_number?: string;
  class: string;
  section: string;
}

interface ClassWithDetails extends Class {
  student_count?: number;
  class_teacher?: {
    full_name?: string;
    staff_id?: string;
  };
}

export default function ClassesPage() {
  const [teacher, setTeacher] = useState<Staff | null>(null);
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [studentsByClass, setStudentsByClass] = useState<Map<string, Student[]>>(new Map());
  const [loadingStudents, setLoadingStudents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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

  const fetchStudentsForClass = async (classItem: ClassWithDetails) => {
    if (!teacher?.school_code) return;
    
    const classKey = `${classItem.id}`;
    
    // If already loaded, don't fetch again
    if (studentsByClass.has(classKey)) {
      return;
    }

    try {
      setLoadingStudents(prev => new Set(prev).add(classKey));
      const response = await fetch(
        `/api/students?school_code=${teacher.school_code}&class=${classItem.class}&section=${classItem.section}&academic_year=${classItem.academic_year}`
      );
      const result = await response.json();
      
      if (response.ok && result.data) {
        setStudentsByClass(prev => {
          const newMap = new Map(prev);
          newMap.set(classKey, result.data || []);
          return newMap;
        });
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoadingStudents(prev => {
        const newSet = new Set(prev);
        newSet.delete(classKey);
        return newSet;
      });
    }
  };

  const toggleClassExpansion = (classItem: ClassWithDetails) => {
    const classKey = `${classItem.id}`;
    const newExpanded = new Set(expandedClasses);
    
    if (newExpanded.has(classKey)) {
      newExpanded.delete(classKey);
    } else {
      newExpanded.add(classKey);
      fetchStudentsForClass(classItem);
    }
    
    setExpandedClasses(newExpanded);
  };

  // Get unique values for filters
  const uniqueClasses = Array.from(new Set(classes.map(c => c.class))).sort();
  const uniqueSections = Array.from(new Set(classes.map(c => c.section))).sort();
  const uniqueYears = Array.from(new Set(classes.map(c => c.academic_year))).sort();

  // Filter classes
  const filteredClasses = classes.filter(cls => {
    const matchesSearch = 
      !searchQuery ||
      cls.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cls.class_teacher?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClass = !filterClass || cls.class === filterClass;
    const matchesSection = !filterSection || cls.section === filterSection;
    const matchesYear = !filterYear || cls.academic_year === filterYear;

    return matchesSearch && matchesClass && matchesSection && matchesYear;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading classes...</p>
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
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <UserCheck className="text-indigo-600 dark:text-indigo-400" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Classes</h1>
            <p className="text-gray-600 dark:text-gray-400">View all classes in the school</p>
          </div>
        </div>
      </motion.div>

      <Card className="p-6">
        {/* Search and Filter Bar */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Search by class, section, or teacher name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Filter size={18} />
              <span>Filters</span>
              {(filterClass || filterSection || filterYear) && (
                <span className="ml-1 px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                  {[filterClass, filterSection, filterYear].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Filter Dropdowns */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {/* Class Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Class
                  </label>
                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Classes</option>
                    {uniqueClasses.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                {/* Section Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Section
                  </label>
                  <select
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Sections</option>
                    {uniqueSections.map(section => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>

                {/* Academic Year Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Academic Year
                  </label>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">All Years</option>
                    {uniqueYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {/* Clear Filters Button */}
                {(filterClass || filterSection || filterYear) && (
                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      onClick={() => {
                        setFilterClass('');
                        setFilterSection('');
                        setFilterYear('');
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                      <X size={16} />
                      Clear Filters
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredClasses.length} of {classes.length} classes
        </div>

        {/* Classes Table */}
        {filteredClasses.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No classes found</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              {searchQuery || filterClass || filterSection || filterYear
                ? 'Try adjusting your search or filters'
                : 'No classes available in the school'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white w-12"></th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Class</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Section</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Academic Year</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Students</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Class Teacher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredClasses.map((cls) => {
                  const isExpanded = expandedClasses.has(`${cls.id}`);
                  const students = studentsByClass.get(`${cls.id}`) || [];
                  const isLoading = loadingStudents.has(`${cls.id}`);

                  return (
                    <Fragment key={cls.id}>
                      <tr
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                        onClick={() => toggleClassExpansion(cls)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center w-8 h-8">
                            {isExpanded ? (
                              <ChevronDown className="text-indigo-600 dark:text-indigo-400" size={20} />
                            ) : (
                              <ChevronRight className="text-gray-400 dark:text-gray-500" size={20} />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {cls.class}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                            {cls.section}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {cls.academic_year}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Users className="text-gray-400 dark:text-gray-500" size={16} />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {cls.student_count || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {cls.class_teacher?.full_name || 'Not assigned'}
                          </span>
                        </td>
                      </tr>
                      
                      {/* Expanded Students Row */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-indigo-50/50 dark:bg-indigo-900/10"
                          >
                            <td colSpan={6} className="px-4 py-4">
                              {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400 mr-2" />
                                  <span className="text-sm text-gray-600 dark:text-gray-400">Loading students...</span>
                                </div>
                              ) : students.length === 0 ? (
                                <div className="text-center py-8">
                                  <GraduationCap className="mx-auto text-gray-400 dark:text-gray-500 mb-2" size={32} />
                                  <p className="text-sm text-gray-600 dark:text-gray-400">No students in this class</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                    Students ({students.length})
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {students.map((student) => (
                                      <motion.div
                                        key={student.id}
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                                      >
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                                          <GraduationCap className="text-indigo-600 dark:text-indigo-400" size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {student.student_name}
                                          </p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {student.admission_no}
                                            {student.roll_number && ` • Roll: ${student.roll_number}`}
                                          </p>
                                        </div>
                                      </motion.div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </Fragment>
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

