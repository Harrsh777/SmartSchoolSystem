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
  Calendar,
  UserX,
  UserCheck,
  Home,
  Users,
  Loader2,
  X
} from 'lucide-react';
import type { Student } from '@/lib/supabase';

type StudentStatus = 'active' | 'deactivated' | 'transferred' | 'alumni' | 'deleted';

interface InstituteHouse {
  id: string;
  house_name: string;
  house_color: string | null;
  description: string | null;
}

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
  const [houses, setHouses] = useState<InstituteHouse[]>([]);
  const [updatingHouseId, setUpdatingHouseId] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportClass, setExportClass] = useState('');
  const [exportSection, setExportSection] = useState('');
  const [exportColumns, setExportColumns] = useState<string[]>([
    'admission_no', 'student_name', 'class', 'section', 'house', 'roll_number', 'email', 'status',
  ]);
  const [exporting, setExporting] = useState(false);

  /** Columns that can be included in the Excel export */
  const EXPORT_COLUMN_OPTIONS: { key: string; label: string }[] = [
    { key: 'admission_no', label: 'Admission No' },
    { key: 'student_name', label: 'Student Name' },
    { key: 'class', label: 'Class' },
    { key: 'section', label: 'Section' },
    { key: 'academic_year', label: 'Academic Year' },
    { key: 'roll_number', label: 'Roll No' },
    { key: 'house', label: 'House' },
    { key: 'gender', label: 'Gender' },
    { key: 'date_of_birth', label: 'Date of Birth' },
    { key: 'email', label: 'Email' },
    { key: 'student_contact', label: 'Student Contact' },
    { key: 'father_name', label: 'Father Name' },
    { key: 'father_contact', label: 'Father Contact' },
    { key: 'mother_name', label: 'Mother Name' },
    { key: 'mother_contact', label: 'Mother Contact' },
    { key: 'address', label: 'Address' },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'pincode', label: 'Pincode' },
    { key: 'blood_group', label: 'Blood Group' },
    { key: 'status', label: 'Status' },
    { key: 'date_of_admission', label: 'Date of Admission' },
    { key: 'religion', label: 'Religion' },
    { key: 'category', label: 'Category' },
    { key: 'aadhaar_number', label: 'Aadhaar No' },
    { key: 'rfid', label: 'RFID' },
    { key: 'transport_type', label: 'Transport Type' },
    { key: 'created_at', label: 'Created At' },
  ];

  // Helper to safely get string value
  const getString = (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  };

  // Resolve student photo URL (DB may use photo_url, profile_photo_url, or image_url)
  const getStudentPhotoUrl = (s: Student & { profile_photo_url?: string; image_url?: string }): string => {
    const url = s.photo_url ?? s.profile_photo_url ?? s.image_url;
    return typeof url === 'string' && url.trim() !== '' ? url.trim() : '';
  };

  // Resolve avatar/cover color from student's house (default dark blue when no house)
  const DEFAULT_AVATAR_COLOR = '#1e3a8a';
  const getHouseColorForStudent = (houseName: unknown): string => {
    const name = typeof houseName === 'string' ? houseName.trim() : '';
    if (!name) return DEFAULT_AVATAR_COLOR;
    const house = houses.find((h) => (h.house_name || '').trim() === name);
    const color = house?.house_color;
    return typeof color === 'string' && color.trim() !== '' ? color.trim() : DEFAULT_AVATAR_COLOR;
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

  const fetchHouses = useCallback(async () => {
    try {
      const res = await fetch(`/api/institute/houses?school_code=${schoolCode}`);
      const data = await res.json();
      if (res.ok && data.data) setHouses(data.data);
    } catch (err) {
      console.error('Error fetching houses:', err);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchHouses();
  }, [fetchHouses]);

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

  const handleToggleStatus = async (e: React.MouseEvent, studentId: string, currentStatus: string) => {
    e.stopPropagation();
    const newStatus = getString(currentStatus) === 'active' ? 'deactivated' : 'active';
    if (!confirm(`Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this student?`)) return;
    try {
      const res = await fetch(`/api/students/${studentId}?school_code=${schoolCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        fetchStudents();
      } else {
        alert(data.error || 'Failed to update student status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update student status');
    }
  };

  const updateStudentHouse = async (e: React.ChangeEvent<HTMLSelectElement>, studentId: string) => {
    e.stopPropagation();
    const houseName = e.target.value;
    setUpdatingHouseId(studentId);
    try {
      const res = await fetch(`/api/students/${studentId}?school_code=${schoolCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ house: houseName || null }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setStudents((prev) =>
          prev.map((s) => (s.id === studentId ? { ...s, house: houseName || null } : s))
        );
      } else {
        alert(data.error || 'Failed to update house');
      }
    } catch (err) {
      console.error('Error updating house:', err);
      alert('Failed to update house');
    } finally {
      setUpdatingHouseId(null);
    }
  };

  const openExportModal = () => {
    setExportClass(selectedClass);
    setExportSection(selectedSection);
    setExportModalOpen(true);
  };

  const exportSectionOptions = exportClass
    ? Array.from(
        new Set(
          students
            .filter((s) => getString(s.class) === exportClass)
            .map((s) => getString(s.section))
            .filter((s) => s.length > 0)
        )
      ).sort()
    : Array.from(new Set(students.map((s) => getString(s.section)).filter((s) => s.length > 0))).sort();

  const handleExportExcel = async () => {
    if (exportColumns.length === 0) {
      alert('Select at least one column to export.');
      return;
    }
    setExporting(true);
    try {
      const params = new URLSearchParams({
        school_code: schoolCode,
        status: selectedStatus,
        columns: exportColumns.join(','),
      });
      if (exportClass) params.set('class', exportClass);
      if (exportSection) params.set('section', exportSection);
      if (academicYear) params.set('academic_year', academicYear);

      const res = await fetch(`/api/download/students?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Export failed');
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition && /filename="?([^"]+)"?/.exec(disposition);
      const filename = match ? match[1] : `students_${schoolCode}_${new Date().toISOString().split('T')[0]}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      setExportModalOpen(false);
    } catch (err) {
      console.error('Export error:', err);
      alert(err instanceof Error ? err.message : 'Failed to download Excel.');
    } finally {
      setExporting(false);
    }
  };

  const toggleExportColumn = (key: string) => {
    setExportColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAllExportColumns = () => setExportColumns(EXPORT_COLUMN_OPTIONS.map((c) => c.key));
  const clearAllExportColumns = () => setExportColumns([]);

  return (
    <div className="space-y-4">
      {/* Header - year and Grid on left, Export on right */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-blue-900 mb-0.5">
              Student Directory
            </h1>
            <p className="text-gray-600 text-sm">Manage and view all students in your school</p>
          </div>
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
        </div>
        <Button size="sm" className="bg-blue-800 hover:bg-blue-900 text-white" onClick={openExportModal}>
          <Download size={16} className="mr-1.5" />
          Export
        </Button>
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
                <option key={cls} value={cls}>{cls}</option>
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

        <div className="pt-3 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-blue-800">{filteredStudents.length}</span> students
          </p>
        </div>
      </Card>

      {/* Export to Excel Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !exporting && setExportModalOpen(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Download size={20} className="text-blue-800" />
                Export to Excel
              </h3>
              <button type="button" onClick={() => !exporting && setExportModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <p className="text-sm text-gray-600">Choose class, section, and columns to include in the download.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Class</label>
                  <select
                    value={exportClass}
                    onChange={(e) => {
                      setExportClass(e.target.value);
                      setExportSection('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-sm"
                  >
                    <option value="">All Classes</option>
                    {uniqueClasses.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Section</label>
                  <select
                    value={exportSection}
                    onChange={(e) => setExportSection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 bg-white text-sm"
                  >
                    <option value="">All Sections</option>
                    {exportSectionOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-700">Columns to export</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={selectAllExportColumns} className="text-xs text-blue-800 hover:underline font-medium">Select all</button>
                    <button type="button" onClick={clearAllExportColumns} className="text-xs text-gray-500 hover:underline font-medium">Clear</button>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXPORT_COLUMN_OPTIONS.map((col) => (
                    <label key={col.key} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={exportColumns.includes(col.key)}
                        onChange={() => toggleExportColumn(col.key)}
                        className="rounded border-gray-300 text-blue-800 focus:ring-blue-700"
                      />
                      <span className="text-gray-700">{col.label}</span>
                    </label>
                  ))}
                </div>
                {exportColumns.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Select at least one column.</p>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="outline" onClick={() => !exporting && setExportModalOpen(false)} disabled={exporting}>
                Cancel
              </Button>
              <Button
                onClick={handleExportExcel}
                disabled={exporting || exportColumns.length === 0}
                className="bg-blue-800 hover:bg-blue-900 text-white"
              >
                {exporting ? <Loader2 size={18} className="animate-spin mr-1" /> : <Download size={18} className="mr-1" />}
                {exporting ? 'Exporting...' : 'Download Excel'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Students Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStudents.map((student, index) => {
            const photoUrl = getStudentPhotoUrl(student);
            const avatarColor = getHouseColorForStudent(student.house);
            return (
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
                    <div
                      className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-white text-xl font-bold shadow-lg relative"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {photoUrl ? (
                        <>
                          <img
                            src={photoUrl}
                            alt={getString(student.student_name)}
                            className="absolute inset-0 w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                              if (fallback) {
                                (fallback as HTMLElement).style.display = 'flex';
                                (fallback as HTMLElement).style.backgroundColor = avatarColor;
                              }
                            }}
                          />
                          <span className="absolute inset-0 hidden w-full h-full flex items-center justify-center" style={{ backgroundColor: avatarColor }}>
                            {getString(student.student_name).charAt(0).toUpperCase() || '?'}
                          </span>
                        </>
                      ) : (
                        getString(student.student_name).charAt(0).toUpperCase() || '?'
                      )}
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
                  {houses.length > 0 && (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Home size={16} className="text-blue-700 shrink-0" />
                      {updatingHouseId === student.id ? (
                        <Loader2 size={16} className="animate-spin text-blue-800" />
                      ) : (
                        <select
                          value={getString(student.house) || ''}
                          onChange={(e) => updateStudentHouse(e, student.id!)}
                          className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white flex-1 min-w-0 focus:ring-2 focus:ring-blue-700"
                        >
                          <option value="">No house</option>
                          {houses.map((h) => (
                            <option key={h.id} value={h.house_name}>{h.house_name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
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
                  <div className="flex items-center gap-1">
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
                    {getString(student.status) === 'active' ? (
                      <button
                        onClick={(e) => handleToggleStatus(e, student.id!, getString(student.status))}
                        className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg"
                        title="Deactivate"
                      >
                        <UserX size={16} />
                      </button>
                    ) : (
                      (getString(student.status) === 'deactivated' || getString(student.status) === 'inactive') && (
                        <button
                          onClick={(e) => handleToggleStatus(e, student.id!, getString(student.status))}
                          className="p-1.5 text-green-700 hover:bg-green-100 rounded-lg"
                          title="Activate"
                        >
                          <UserCheck size={16} />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
            );
          })}
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
                  {houses.length > 0 && (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase">House</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => {
                    const photoUrl = getStudentPhotoUrl(student);
                    const avatarColor = getHouseColorForStudent(student.house);
                    return (
                    <tr 
                      key={student.id} 
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                      onClick={() => handleStudentClick(student.id!)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white text-sm font-bold relative"
                            style={{ backgroundColor: avatarColor }}
                          >
                            {photoUrl ? (
                              <>
                                <img
                                  src={photoUrl}
                                  alt={getString(student.student_name)}
                                  className="absolute inset-0 w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                                    if (fallback) {
                                      (fallback as HTMLElement).style.display = 'flex';
                                      (fallback as HTMLElement).style.backgroundColor = avatarColor;
                                    }
                                  }}
                                />
                                <span className="absolute inset-0 hidden w-full h-full flex items-center justify-center" style={{ backgroundColor: avatarColor }}>
                                  {getString(student.student_name).charAt(0).toUpperCase() || '?'}
                                </span>
                              </>
                            ) : (
                              getString(student.student_name).charAt(0).toUpperCase() || '?'
                            )}
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
                      {houses.length > 0 && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {updatingHouseId === student.id ? (
                            <Loader2 size={18} className="animate-spin text-blue-800" />
                          ) : (
                            <select
                              value={getString(student.house) || ''}
                              onChange={(e) => updateStudentHouse(e, student.id!)}
                              className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white min-w-[100px] focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
                            >
                              <option value="">No house</option>
                              {houses.map((h) => (
                                <option key={h.id} value={h.house_name}>{h.house_name}</option>
                              ))}
                            </select>
                          )}
                        </td>
                      )}
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
                              router.push(`/dashboard/${schoolCode}/students/${student.id}/edit`);
                            }}
                            className="p-1.5 text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          {getString(student.status) === 'active' ? (
                            <button
                              onClick={(e) => handleToggleStatus(e, student.id!, getString(student.status))}
                              className="p-1.5 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                              title="Deactivate"
                            >
                              <UserX size={16} />
                            </button>
                          ) : (
                            (getString(student.status) === 'deactivated' || getString(student.status) === 'inactive') && (
                              <button
                                onClick={(e) => handleToggleStatus(e, student.id!, getString(student.status))}
                                className="p-1.5 text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                                title="Activate"
                              >
                                <UserCheck size={16} />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={houses.length > 0 ? 7 : 6} className="px-6 py-8 text-center">
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
