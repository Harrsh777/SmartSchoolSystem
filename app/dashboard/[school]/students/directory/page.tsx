'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  Search, 
  Download, 
  Edit, 
  User,
  Mail,
  Phone,
  GraduationCap,
  Eye,
  ChevronRight,
  Calendar
} from 'lucide-react';
import type { Student } from '@/lib/supabase';

type StudentStatus = 'active' | 'deactivated' | 'transferred' | 'alumni' | 'deleted';

export default function StudentDirectoryPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StudentStatus>('active');
  const [academicYear, setAcademicYear] = useState('');
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Helper to safely get string value
  const getString = (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  };

  const fetchAcademicYears = useCallback(async () => {
    try {
      const response = await fetch(`/api/classes/academic-years?school_code=${schoolCode}`);
      if (response.ok) {
        const result = await response.json();
        const years = result.data || result.academicYears || [];
        setAcademicYears(Array.isArray(years) ? years : []);
        // Set current year as default if available (only on initial load)
        const currentYear = new Date().getFullYear();
        const defaultYear = (Array.isArray(years) ? years : []).find((y: string) => String(y).includes(String(currentYear))) || (Array.isArray(years) ? years[0] : '');
        if (!academicYear && defaultYear) {
          setAcademicYear(defaultYear);
        }
      }
    } catch (err) {
      console.error('Error fetching academic years:', err);
    }
  }, [schoolCode, academicYear]);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, selectedStatus, academicYear]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      let url = `/api/students?school_code=${schoolCode}&status=${selectedStatus}`;
      if (academicYear) {
        url += `&academic_year=${encodeURIComponent(academicYear)}`;
      }
      const response = await fetch(url);
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
    const query = searchQuery.toLowerCase();
    const studentName = getString(student.student_name).toLowerCase();
    const admissionNo = getString(student.admission_no).toLowerCase();
    const email = getString(student.email).toLowerCase();
    const matchesSearch = 
      studentName.includes(query) ||
      admissionNo.includes(query) ||
      email.includes(query);

    const studentClass = getString(student.class);
    const studentSection = getString(student.section);
    const matchesClass = !selectedClass || studentClass === selectedClass;
    const matchesSection = !selectedSection || studentSection === selectedSection;

    return matchesSearch && matchesClass && matchesSection;
  });

  const handleStudentClick = (studentId: string) => {
    router.push(`/dashboard/${schoolCode}/students/${studentId}`);
  };

  const statusTabs: Array<{ id: StudentStatus; label: string; count: number }> = [
    { id: 'active', label: 'Active', count: students.filter(s => getString(s.status) === 'active').length },
    { id: 'deactivated', label: 'Deactivated', count: students.filter(s => {
      const status = getString(s.status);
      return status === 'inactive' || status === 'deactivated';
    }).length },
    { id: 'transferred', label: 'Transferred', count: students.filter(s => getString(s.status) === 'transferred').length },
    { id: 'alumni', label: 'Alumni', count: students.filter(s => {
      const status = getString(s.status);
      return status === 'graduated' || status === 'alumni';
    }).length },
  ];

  const uniqueClasses: string[] = Array.from(
    new Set(students.map(s => getString(s.class)).filter(c => c.length > 0))
  ).sort();
  const uniqueSections: string[] = selectedClass
    ? Array.from(
        new Set(
          students
            .filter(s => getString(s.class) === selectedClass)
            .map(s => getString(s.section))
            .filter(s => s.length > 0)
        )
      ).sort()
    : Array.from(
        new Set(students.map(s => getString(s.section)).filter(s => s.length > 0))
      ).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-800 mx-auto mb-3"></div>
          <p className="text-gray-600 text-sm font-medium">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header - compact */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-blue-900 mb-0.5">
            Student Directory
          </h1>
          <p className="text-gray-600 text-sm">Manage and view all students in your school</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-blue-800" />
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="px-3 py-1.5 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-blue-800 font-medium"
            >
              <option value="">All Years</option>
              {academicYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="border-blue-200 text-blue-800 hover:bg-blue-50 text-sm"
          >
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </Button>
          <Button size="sm" className="bg-blue-800 hover:bg-blue-900 text-white">
            <Download size={16} className="mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedStatus(tab.id)}
            className={`px-4 py-2 rounded-lg font-semibold text-xs whitespace-nowrap transition-all ${
              selectedStatus === tab.id
                ? 'bg-blue-800 text-white shadow'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
              selectedStatus === tab.id ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white border-blue-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white disabled:bg-gray-100"
              disabled={!selectedClass}
            >
              <option value="">All Sections</option>
              {uniqueSections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Name, admission ID, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm rounded-lg border-gray-300 focus:ring-2 focus:ring-blue-700"
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-blue-800">{filteredStudents.length}</span> students
          </p>
        </div>
      </Card>

      {/* Students Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStudents.map((student, index) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-200 group bg-gradient-to-br from-white to-blue-50/20"
                onClick={() => handleStudentClick(student.id!)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-blue-800 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                      {(() => {
                        const name = getString(student.student_name);
                        return name ? name.charAt(0).toUpperCase() : '?';
                      })()}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-800 transition-colors">
                        {getString(student.student_name) || 'N/A'}
                      </h3>
                      <p className="text-sm text-gray-500">#{getString(student.admission_no) || 'N/A'}</p>
                    </div>
                  </div>
                  <ChevronRight className="text-gray-400 group-hover:text-blue-800 transition-colors" size={20} />
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <GraduationCap size={16} className="text-blue-700" />
                    <span>Class {getString(student.class) || 'N/A'} - {getString(student.section) || 'N/A'}</span>
                  </div>
                  {!!student.roll_number && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User size={16} className="text-blue-700" />
                      <span>Roll: {getString(student.roll_number)}</span>
                    </div>
                  )}
                  {!!student.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail size={16} className="text-blue-700" />
                      <span className="truncate">{getString(student.email)}</span>
                    </div>
                  )}
                  {(!!student.father_contact || !!student.mother_contact) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={16} className="text-blue-700" />
                      <span>{getString(student.father_contact) || getString(student.mother_contact)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    (() => {
                      const status = getString(student.status);
                      return status === 'active' 
                        ? 'bg-green-100 text-green-700'
                        : status === 'inactive' || status === 'deactivated'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700';
                    })()
                  }`}>
                    {(() => {
                      const status = getString(student.status);
                      return status ? status.toUpperCase() : 'ACTIVE';
                    })()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStudentClick(student.id!);
                    }}
                    className="px-4 py-1.5 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors text-sm font-medium flex items-center gap-1"
                  >
                    <Eye size={14} />
                    View
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden border-blue-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Admission ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr 
                      key={student.id} 
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                      onClick={() => handleStudentClick(student.id!)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-800 flex items-center justify-center text-white text-sm font-bold">
                            {(() => {
                              const name = getString(student.student_name);
                              return name ? name.charAt(0).toUpperCase() : '?';
                            })()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{getString(student.student_name) || 'N/A'}</div>
                            {!!student.email && (
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Mail size={12} />
                                {getString(student.email)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium">{getString(student.admission_no) || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                          {(() => {
                            const className = getString(student.class) || 'N/A';
                            const section = getString(student.section) || 'N/A';
                            return `${className} - ${section}`;
                          })()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {(() => {
                          const fatherContact = getString(student.father_contact);
                          const motherContact = getString(student.mother_contact);
                          return fatherContact || motherContact || 'N/A';
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          (() => {
                            const status = getString(student.status);
                            return status === 'active' 
                              ? 'bg-green-100 text-green-700'
                              : status === 'inactive' || status === 'deactivated'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700';
                          })()
                        }`}>
                          {(() => {
                            const status = getString(student.status);
                            return status ? status.toUpperCase() : 'ACTIVE';
                          })()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStudentClick(student.id!);
                            }}
                            className="p-1.5 text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/${schoolCode}/students/edit/${student.id}`);
                            }}
                            className="p-1.5 text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <User className="text-gray-400" size={48} />
                        <p className="text-gray-600 font-medium">No students found</p>
                        <p className="text-gray-500 text-sm">Try adjusting your filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
