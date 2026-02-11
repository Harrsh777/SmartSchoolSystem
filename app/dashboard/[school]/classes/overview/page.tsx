'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import {
  BookOpen,
  Columns,
  Filter,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  RefreshCw,
} from 'lucide-react';
import AssignTeacherModal from '@/components/classes/AssignTeacherModal';
import AssignSubjectsModal from '@/components/classes/AssignSubjectsModal';

interface ClassOverviewData {
  id: string;
  class: string;
  section: string;
  academic_year: string;
  class_teacher: {
    id: string;
    full_name: string;
    staff_id: string;
  } | null;
  total_subjects: number;
  has_timetable: boolean;
  old_admissions: number;
  new_admissions: number;
  active_students: number;
  deactivated_students: number;
  total_students: number;
}

interface Totals {
  old_admissions: number;
  new_admissions: number;
  active_students: number;
  deactivated_students: number;
  total_students: number;
}

export default function ClassOverviewPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [classes, setClasses] = useState<ClassOverviewData[]>([]);
  const [totals, setTotals] = useState<Totals>({
    old_admissions: 0,
    new_admissions: 0,
    active_students: 0,
    deactivated_students: 0,
    total_students: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editingTeacher, setEditingTeacher] = useState<{ classId: string; currentTeacher: { id: string; full_name: string; staff_id: string } | null } | null>(null);
  const [assigningSubjects, setAssigningSubjects] = useState<{ classId: string; className: string; section: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(22);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [loadingAcademicYears, setLoadingAcademicYears] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        setLoadingAcademicYears(true);
        const res = await fetch(`/api/classes/academic-years?school_code=${schoolCode}`);
        const data = await res.json();
        if (res.ok && data.data?.length) {
          setAcademicYears(data.data);
          setSelectedAcademicYear(data.data[0] || '');
        }
      } catch (err) {
        console.error('Error fetching academic years:', err);
      } finally {
        setLoadingAcademicYears(false);
      }
    };
    fetchAcademicYears();
  }, [schoolCode]);

  useEffect(() => {
    fetchClassOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, selectedAcademicYear]);

  const fetchClassOverview = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ school_code: schoolCode });
      if (selectedAcademicYear) params.set('academic_year', selectedAcademicYear);
      const response = await fetch(`/api/classes/overview?${params}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setClasses(result.data);
        if (result.totals) {
          setTotals(result.totals);
        }
      }
    } catch (err) {
      console.error('Error fetching class overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDoubleClickTeacher = (classItem: ClassOverviewData) => {
    setEditingTeacher({
      classId: classItem.id,
      currentTeacher: classItem.class_teacher,
    });
  };

  const handleTeacherAssigned = () => {
    setEditingTeacher(null);
    fetchClassOverview();
  };

  const handleViewTimetable = (classItem: ClassOverviewData) => {
    const params = new URLSearchParams({
      class_id: classItem.id,
      class: classItem.class,
      section: classItem.section,
    });
    router.push(`/dashboard/${schoolCode}/timetable/class?${params.toString()}`);
  };

  const handleAssignSubjects = (classItem: ClassOverviewData) => {
    setAssigningSubjects({
      classId: classItem.id,
      className: classItem.class,
      section: classItem.section,
    });
  };

  const handleSubjectsAssigned = () => {
    setAssigningSubjects(null);
    fetchClassOverview();
  };

  const handleExport = () => {
    const escapeCsv = (val: unknown) => {
      const s = String(val ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const headers = ['#', 'Class', 'Section', 'Academic Year', 'Class Teacher', 'Subjects', 'Timetable', 'Old', 'New', 'Active', 'Inactive', 'Total'];
    const rows = filteredClasses.map((cls, i) => [
      i + 1,
      cls.class,
      cls.section,
      cls.academic_year,
      cls.class_teacher?.full_name ?? '',
      cls.total_subjects,
      cls.has_timetable ? 'Yes' : 'No',
      cls.old_admissions,
      cls.new_admissions,
      cls.active_students,
      cls.deactivated_students,
      cls.total_students,
    ].map(escapeCsv).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `class-overview-${selectedAcademicYear || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const syncClassesFromStudents = async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);
      const response = await fetch('/api/classes/sync-from-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_code: schoolCode }),
      });
      const result = await response.json();
      if (response.ok && result.created !== undefined) {
        setSyncMessage(result.message ?? (result.created > 0 ? `Created ${result.created} class(es) from students.` : 'All classes are already in sync.'));
        if (result.created > 0) await fetchClassOverview();
      } else {
        setSyncMessage(result.error ?? 'Sync failed.');
      }
    } catch (err) {
      console.error('Error syncing classes from students:', err);
      setSyncMessage('Failed to sync classes.');
    } finally {
      setSyncing(false);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const uniqueClasses = new Set(classes.map(c => c.class));
    const uniqueSections = new Set(classes.map(c => `${c.class}-${c.section}`));
    const classesWithTimetable = classes.filter(c => c.has_timetable).length;
    const classesWithTeachers = classes.filter(c => c.class_teacher !== null).length;
    
    return {
      totalClasses: uniqueClasses.size,
      totalSections: uniqueSections.size,
      classesWithTimetable,
      classesWithTeachers,
    };
  }, [classes]);

  // Filter and search
  const filteredClasses = useMemo(() => {
    return classes.filter(classItem => {
      const matchesSearch = searchQuery === '' || 
        classItem.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
        classItem.section.toLowerCase().includes(searchQuery.toLowerCase()) ||
        classItem.class_teacher?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${classItem.class} ${classItem.section}`.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesClassFilter = filterClass === '' || classItem.class === filterClass;
      const matchesSectionFilter = filterSection === '' || classItem.section === filterSection;
      
      return matchesSearch && matchesClassFilter && matchesSectionFilter;
    });
  }, [classes, searchQuery, filterClass, filterSection]);

  // Get unique classes and sections for filters
  const uniqueClasses = useMemo(() => {
    return Array.from(new Set(classes.map(c => c.class))).sort();
  }, [classes]);

  const uniqueSections = useMemo(() => {
    return Array.from(new Set(classes.map(c => c.section))).sort();
  }, [classes]);

  // Pagination
  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClasses = filteredClasses.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterClass, filterSection]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a] mx-auto mb-4"></div>
          <p className="text-[#64748B]">Loading class overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-[#1e3a8a] mb-2 flex items-center gap-3">
            <BookOpen size={32} className="text-[#2F6FED]" />
            Class Overview
          </h1>
          <p className="text-[#64748B]">View all classes with their statistics and timetables</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={syncClassesFromStudents}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#E1E1DB] rounded-lg bg-white text-[#0F172A] text-sm font-medium hover:bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync from students'}
          </button>
          <label className="text-sm font-medium text-[#64748B]">Academic Year:</label>
          <select
            value={selectedAcademicYear}
            onChange={(e) => setSelectedAcademicYear(e.target.value)}
            disabled={loadingAcademicYears}
            className="px-4 py-2.5 border border-[#E1E1DB] rounded-lg bg-white text-[#0F172A] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:border-transparent disabled:opacity-60"
          >
            <option value="">All Years</option>
            {academicYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        {syncMessage && (
          <p className="w-full mt-2 text-sm text-[#64748B]">{syncMessage}</p>
        )}
      </motion.div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#FFFFFF] rounded-xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#E1E1DB]"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#64748B] mb-1">Total Classes</p>
              <p className="text-2xl font-bold text-[#1e3a8a]">{stats.totalClasses}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-[#EAF1FF] flex items-center justify-center">
              <BookOpen className="text-[#2F6FED]" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#FFFFFF] rounded-xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#E1E1DB]"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#64748B] mb-1">Total Sections</p>
              <p className="text-2xl font-bold text-[#1e3a8a]">{stats.totalSections}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-[#EAF1FF] flex items-center justify-center">
              <Columns className="text-[#2F6FED]" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#FFFFFF] rounded-xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#E1E1DB]"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#64748B] mb-1">With Timetable</p>
              <p className="text-2xl font-bold text-[#1e3a8a]">{stats.classesWithTimetable}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-[#EAF1FF] flex items-center justify-center">
              <Eye className="text-[#2F6FED]" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#FFFFFF] rounded-xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-[#E1E1DB]"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#64748B] mb-1">With Teachers</p>
              <p className="text-2xl font-bold text-[#1e3a8a]">{stats.classesWithTeachers}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-[#EAF1FF] flex items-center justify-center">
              <BookOpen className="text-[#2F6FED]" size={24} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search and Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#64748B]" size={18} />
              <input
                type="text"
                placeholder="Search by class, section, or teacher name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E1E1DB] rounded-lg text-[#0F172A] placeholder-[#64748B] text-sm focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#64748B] hover:text-[#1e3a8a]"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                showFilters || filterClass || filterSection
                  ? 'bg-[#60A5FA] text-[#FFFFFF]'
                  : 'bg-[#EAF1FF] text-[#2F6FED] hover:bg-[#DBEAFE]'
              }`}
            >
              <Filter size={18} />
              FILTERS
              {(filterClass || filterSection) && (
                <span className="ml-1 px-2 py-0.5 bg-[#FFFFFF]/20 rounded-full text-xs">
                  {[filterClass, filterSection].filter(Boolean).length}
                </span>
              )}
            </button>
            
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#64748B] bg-[#F8FAFC] hover:bg-[#E5E7EB] rounded-lg transition-all"
            >
              <Download size={18} />
              EXPORT
            </button>
          </div>
        </div>

        {/* Filter Dropdown */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-[#E1E1DB]"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#1e3a8a] mb-2">Filter by Class</label>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FFFFFF] border border-[#E1E1DB] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:border-transparent"
                >
                  <option value="">All Classes</option>
                  {uniqueClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-[#1e3a8a] mb-2">Filter by Section</label>
                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#FFFFFF] border border-[#E1E1DB] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:border-transparent"
                >
                  <option value="">All Sections</option>
                  {uniqueSections.map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {(filterClass || filterSection) && (
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => {
                    setFilterClass('');
                    setFilterSection('');
                  }}
                  className="text-sm text-[#2F6FED] hover:text-[#1e3a8a] font-medium"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </motion.div>
        )}
        
        <p className="text-xs text-[#64748B] mt-4">
          * Class teacher can be assigned or changed by double-clicking on the class teacher cell
        </p>
      </Card>

      {/* Classes Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#2F6FED] text-white">
              <tr>
                <th className="px-2 py-3 text-left text-[10px] font-semibold uppercase tracking-wider w-10">#</th>
                <th className="px-2 py-3 text-left text-[10px] font-semibold uppercase tracking-wider">Class</th>
                <th className="px-2 py-3 text-left text-[10px] font-semibold uppercase tracking-wider">Sec</th>
                <th className="px-2 py-3 text-left text-[10px] font-semibold uppercase tracking-wider">Class Teacher</th>
                <th className="px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wider">Subjects</th>
                <th className="px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wider">Timetable</th>
                <th className="px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wider">Old</th>
                <th className="px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wider">New</th>
                <th className="px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wider">Active</th>
                <th className="px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wider">Inactive</th>
                <th className="px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-[#FFFFFF] divide-y divide-[#E1E1DB]">
              {paginatedClasses.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-[#64748B] text-sm">
                    {searchQuery || filterClass || filterSection
                      ? 'No classes found matching your filters'
                      : 'No classes found'}
                  </td>
                </tr>
              ) : (
                <>
                  {paginatedClasses.map((classItem, index) => (
                    <tr key={classItem.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-2 py-2.5 whitespace-nowrap">
                        <span className="text-xs font-medium text-[#64748B]">
                          {(startIndex + index + 1).toString().padStart(2, '0')}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap">
                        <span className="text-xs font-semibold text-[#1e3a8a]">
                          {classItem.class}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap">
                        <span className="text-xs font-semibold text-[#2F6FED]">
                          {classItem.section}
                        </span>
                      </td>
                      <td
                        className="px-2 py-2.5 whitespace-nowrap cursor-pointer hover:bg-[#EAF1FF] transition-colors max-w-[120px] truncate"
                        onDoubleClick={() => handleDoubleClickTeacher(classItem)}
                        title={classItem.class_teacher?.full_name || 'Double-click to assign class teacher'}
                      >
                        <span className="text-xs text-[#0F172A]">
                          {classItem.class_teacher?.full_name || '-'}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-xs font-semibold text-[#2F6FED]">
                            {classItem.total_subjects}
                          </span>
                          <button
                            onClick={() => handleAssignSubjects(classItem)}
                            className="text-[10px] text-[#F97316] hover:text-[#EA580C] font-medium transition-colors"
                            title="Assign subjects to this class"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap text-center">
                        {classItem.has_timetable ? (
                          <button
                            onClick={() => handleViewTimetable(classItem)}
                            className="text-xs text-[#2F6FED] hover:text-[#1e3a8a] font-medium flex items-center justify-center gap-0.5 transition-colors"
                          >
                            <Eye size={12} />
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-[#64748B]">-</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap text-center">
                        <span className="text-xs text-[#0F172A]">{classItem.old_admissions}</span>
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap text-center">
                        <span className="text-xs text-[#0F172A]">{classItem.new_admissions}</span>
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap text-center">
                        <span className="text-xs font-semibold text-[#2F6FED]">
                          {classItem.active_students}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap text-center">
                        <span className="text-xs text-[#0F172A]">{classItem.deactivated_students}</span>
                      </td>
                      <td className="px-2 py-2.5 whitespace-nowrap text-center">
                        <span className="text-xs font-semibold text-[#1e3a8a]">
                          {classItem.total_students}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Total Row */}
                  <tr className="bg-[#F8FAFC] font-semibold border-t-2 border-[#E1E1DB]">
                    <td className="px-2 py-2.5 whitespace-nowrap">
                      <span className="text-xs text-[#1e3a8a]">Total</span>
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap"></td>
                    <td className="px-2 py-2.5 whitespace-nowrap"></td>
                    <td className="px-2 py-2.5 whitespace-nowrap"></td>
                    <td className="px-2 py-2.5 whitespace-nowrap"></td>
                    <td className="px-2 py-2.5 whitespace-nowrap"></td>
                    <td className="px-2 py-2.5 whitespace-nowrap text-center">
                      <span className="text-xs text-[#0F172A]">{totals.old_admissions}</span>
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap text-center">
                      <span className="text-xs text-[#0F172A]">{totals.new_admissions}</span>
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap text-center">
                      <span className="text-xs font-semibold text-[#2F6FED]">
                        {totals.active_students}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap text-center">
                      <span className="text-xs text-[#0F172A]">{totals.deactivated_students}</span>
                    </td>
                    <td className="px-2 py-2.5 whitespace-nowrap text-center">
                      <span className="text-xs font-semibold text-[#1e3a8a]">
                        {totals.total_students}
                      </span>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredClasses.length > itemsPerPage && (
          <div className="px-3 py-3 border-t border-[#E1E1DB] flex items-center justify-between bg-[#FFFFFF]">
            <div className="text-xs text-[#64748B]">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredClasses.length)} of {filteredClasses.length} classes
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-[#E1E1DB] hover:bg-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[#64748B] hover:text-[#1e3a8a]"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-[#64748B] px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-[#E1E1DB] hover:bg-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[#64748B] hover:text-[#1e3a8a]"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Assign Teacher Modal */}
      {editingTeacher && (
        <AssignTeacherModal
          schoolCode={schoolCode}
          classId={editingTeacher.classId}
          currentTeacher={editingTeacher.currentTeacher}
          onClose={() => setEditingTeacher(null)}
          onSuccess={handleTeacherAssigned}
        />
      )}

      {/* Assign Subjects Modal */}
      {assigningSubjects && (
        <AssignSubjectsModal
          schoolCode={schoolCode}
          classId={assigningSubjects.classId}
          className={assigningSubjects.className}
          section={assigningSubjects.section}
          onClose={() => setAssigningSubjects(null)}
          onSuccess={handleSubjectsAssigned}
        />
      )}
    </div>
  );
}
