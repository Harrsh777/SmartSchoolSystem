'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  Search, 
  Download, 
  Filter, 
  Settings, 
  Edit, 
  User,
  Mail,
  Phone,
  GraduationCap,
  Eye,
  ChevronRight
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
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Helper to safely get string value
  const getString = (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  };

  useEffect(() => {
    fetchStudents();
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    setAcademicYear(`Apr ${currentYear} - Mar ${nextYear}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, selectedStatus]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/students?school_code=${schoolCode}&status=${selectedStatus}`);
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
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Student Directory
          </h1>
          <p className="text-gray-600 text-lg">Manage and view all students in your school</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
          >
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </Button>
          <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg">
            <Download size={18} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {statusTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedStatus(tab.id)}
            className={`px-6 py-3 rounded-xl font-semibold text-sm whitespace-nowrap transition-all duration-200 ${
              selectedStatus === tab.id
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              selectedStatus === tab.id ? 'bg-white/20' : 'bg-gray-100'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-6 bg-gradient-to-br from-white to-indigo-50/30 border-indigo-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Academic Year
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Select Year</option>
              <option value={`Apr ${new Date().getFullYear()} - Mar ${new Date().getFullYear() + 1}`}>
                Apr {new Date().getFullYear()} - Mar {new Date().getFullYear() + 1}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-100"
              disabled={!selectedClass}
            >
              <option value="">All Sections</option>
              {uniqueSections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Name, admission ID, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 rounded-xl border-gray-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-indigo-600">{filteredStudents.length}</span> students
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="text-indigo-600 border-indigo-300 hover:bg-indigo-50">
              <Filter size={16} className="mr-2" />
              More Filters
            </Button>
            <Button variant="outline" className="text-indigo-600 border-indigo-300 hover:bg-indigo-50">
              <Settings size={16} className="mr-2" />
              Settings
            </Button>
          </div>
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
                className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-indigo-300 group bg-gradient-to-br from-white to-indigo-50/20"
                onClick={() => handleStudentClick(student.id!)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                      {(() => {
                        const name = getString(student.student_name);
                        return name ? name.charAt(0).toUpperCase() : '?';
                      })()}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {getString(student.student_name) || 'N/A'}
                      </h3>
                      <p className="text-sm text-gray-500">#{getString(student.admission_no) || 'N/A'}</p>
                    </div>
                  </div>
                  <ChevronRight className="text-gray-400 group-hover:text-indigo-600 transition-colors" size={20} />
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <GraduationCap size={16} className="text-indigo-500" />
                    <span>Class {getString(student.class) || 'N/A'} - {getString(student.section) || 'N/A'}</span>
                  </div>
                  {!!student.roll_number && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User size={16} className="text-indigo-500" />
                      <span>Roll: {getString(student.roll_number)}</span>
                    </div>
                  )}
                  {!!student.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail size={16} className="text-indigo-500" />
                      <span className="truncate">{getString(student.email)}</span>
                    </div>
                  )}
                  {(!!student.father_contact || !!student.mother_contact) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={16} className="text-indigo-500" />
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
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-1"
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
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Student</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Admission ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Class</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <tr 
                      key={student.id} 
                      className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                      onClick={() => handleStudentClick(student.id!)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {(() => {
                              const name = getString(student.student_name);
                              return name ? name.charAt(0).toUpperCase() : '?';
                            })()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{getString(student.student_name) || 'N/A'}</div>
                            {!!student.email && (
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail size={12} />
                                {getString(student.email)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">{getString(student.admission_no) || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                          {(() => {
                            const className = getString(student.class) || 'N/A';
                            const section = getString(student.section) || 'N/A';
                            return `${className} - ${section}`;
                          })()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {(() => {
                            const fatherContact = getString(student.father_contact);
                            const motherContact = getString(student.mother_contact);
                            return fatherContact || motherContact || 'N/A';
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
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
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStudentClick(student.id!);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/${schoolCode}/students/edit/${student.id}`);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
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
