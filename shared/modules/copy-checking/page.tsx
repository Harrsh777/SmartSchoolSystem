'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  FileText,
  Calendar,
  Folder,
  Save,
  Edit,
  User,
  ArrowLeft,
  BookOpen,
  TrendingUp
} from 'lucide-react';
import {
  emptyCopyCheckingStats,
  type CopyCheckingStatus,
  type CopyCheckingStats,
} from '@/lib/copy-checking-normalize';
import { getSessionStaffOrTeacherProfile } from '@/lib/teacher-portal-client';

interface Student {
  id: string;
  student_name: string;
  first_name?: string | null;
  last_name?: string | null;
  admission_no: string;
  roll_number?: string | null;
  class: string;
  section?: string;
  status: CopyCheckingStatus;
  remarks: string;
  copy_checking?: {
    id?: string;
    status?: string;
    remarks?: string;
    topic?: string;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
  };
}

interface Class {
  id: string;
  class: string;
  section?: string;
  academic_year?: string;
}

interface Subject {
  id: string;
  subject_name: string;
}

interface AcademicYear {
  id: string;
  year_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface CopyCheckingPageProps {
  /** When set (e.g. by teacher dashboard wrapper), used instead of route params */
  schoolCodeOverride?: string;
  /** When set (e.g. teacher dashboard), only these class IDs are shown in the class list */
  allowedClassIds?: string[];
  /** When set (e.g. subject teacher), only these subject IDs are shown for every class (legacy; prefer teachingSubjectsByClassId) */
  allowedSubjectIds?: string[];
  /** Class IDs where the staff is class teacher — full subject list for that class */
  classTeacherClassIds?: string[];
  /** Timetable: class_id → subject IDs the staff teaches (subject-teacher scope for non–class-teacher classes) */
  teachingSubjectsByClassId?: Record<string, string[]>;
  /** Teacher portal: enforce timetable / class-teacher scope on save */
  teacherCopyScoped?: boolean;
}

export default function CopyCheckingPage({
  schoolCodeOverride,
  allowedClassIds,
  allowedSubjectIds,
  classTeacherClassIds,
  teachingSubjectsByClassId,
  teacherCopyScoped,
}: CopyCheckingPageProps = {}) {
  const params = useParams();
  const schoolCode = schoolCodeOverride ?? (params?.school as string) ?? '';
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [stats, setStats] = useState<{
    classwork: CopyCheckingStats;
    homework: CopyCheckingStats;
  }>({
    classwork: emptyCopyCheckingStats(),
    homework: emptyCopyCheckingStats(),
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [academicYearsError, setAcademicYearsError] = useState('');
  
  // Filters
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [workType, setWorkType] = useState<'classwork' | 'homework'>('classwork');
  const [topic, setTopic] = useState('');
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  
  // Student records
  const [studentRecords, setStudentRecords] = useState<Record<string, { status: string; remarks: string }>>({});

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, allowedClassIds]);

  const copyCheckInitialClassAuto = useRef(false);
  useEffect(() => {
    copyCheckInitialClassAuto.current = false;
  }, [selectedAcademicYear]);

  // Auto-select class when only one option exists (once per academic year load)
  useEffect(() => {
    if (!selectedAcademicYear || selectedClassName || copyCheckInitialClassAuto.current) return;
    const yearClasses = classes.filter(
      (c) => !selectedAcademicYear || c.academic_year === selectedAcademicYear
    );
    const names = [...new Set(yearClasses.map((c) => c.class).filter(Boolean))].sort();
    if (names.length === 1) {
      copyCheckInitialClassAuto.current = true;
      setSelectedClassName(names[0] as string);
    }
  }, [classes, selectedAcademicYear, selectedClassName]);

  useEffect(() => {
    if (!selectedClassName || selectedSection || availableSections.length !== 1) return;
    setSelectedSection(availableSections[0] as string);
  }, [selectedClassName, availableSections, selectedSection]);

  // Academic years from Academic Year Management (`academic_years`); default = current year from same module
  useEffect(() => {
    if (!schoolCode) return;
    let cancelled = false;
    setAcademicYearsError('');
    (async () => {
      try {
        const yearsRes = await fetch(
          `/api/academic-year-management/years?school_code=${encodeURIComponent(schoolCode)}`
        );
        const yearsJson = await yearsRes.json();
        if (cancelled) return;

        if (!yearsRes.ok) {
          setAcademicYears([]);
          setSelectedAcademicYear('');
          setAcademicYearsError(
            typeof yearsJson?.error === 'string'
              ? yearsJson.error
              : 'Could not load academic years.'
          );
          return;
        }

        const raw = Array.isArray(yearsJson.data) ? yearsJson.data : [];
        const list: AcademicYear[] = raw.map((row: Record<string, unknown>) => ({
          id: String(row.id ?? row.year_name ?? ''),
          year_name: String(row.year_name ?? '').trim(),
          start_date: row.start_date != null ? String(row.start_date) : '',
          end_date: row.end_date != null ? String(row.end_date) : '',
          is_current: Boolean(row.is_current),
        })).filter((y: { year_name: string | any[]; }) => y.year_name.length > 0);

        setAcademicYears(list);

        if (list.length === 0) {
          setSelectedAcademicYear('');
          setAcademicYearsError(
            'No academic years defined. Add them in Academic Year Management first.'
          );
          return;
        }

        let defaultYearName = '';
        try {
          const curRes = await fetch(
            `/api/schools/current-academic-year?school_code=${encodeURIComponent(schoolCode)}`
          );
          const curJson = await curRes.json();
          if (curRes.ok) {
            defaultYearName = String(
              curJson.current_academic_year ?? curJson.data ?? ''
            ).trim();
          }
        } catch {
          /* non-fatal */
        }

        const names = new Set(list.map((y) => y.year_name));
        const fromCurrentFlag = list.find((y) => y.is_current)?.year_name ?? '';

        const chosen =
          defaultYearName && names.has(defaultYearName)
            ? defaultYearName
            : fromCurrentFlag && names.has(fromCurrentFlag)
              ? fromCurrentFlag
              : list[0].year_name;

        if (cancelled) return;
        setSelectedAcademicYear(chosen);
      } catch {
        if (cancelled) return;
        setAcademicYears([]);
        setSelectedAcademicYear('');
        setAcademicYearsError('Could not load academic years.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolCode]);

  const updateSections = useCallback(() => {
    if (selectedClassName) {
      const sections = classes
        .filter(c => 
          c.class === selectedClassName && 
          (!selectedAcademicYear || c.academic_year === selectedAcademicYear) &&
          c.section
        )
        .map(c => c.section!)
        .filter((section, index, self) => self.indexOf(section) === index)
        .sort();
      setAvailableSections(sections);
    } else {
      setAvailableSections([]);
    }
  }, [selectedClassName, classes, selectedAcademicYear]);

  useEffect(() => {
    if (selectedClassName) {
      // Find class ID matching class name + section (if selected) + academic year so API gets correct class_id
      const matchingClass = classes.find(
        c => c.class === selectedClassName &&
        (!selectedAcademicYear || c.academic_year === selectedAcademicYear) &&
        (!selectedSection || (c.section && c.section === selectedSection))
      );
      if (matchingClass) {
        setSelectedClassId(matchingClass.id);
      } else {
        setSelectedClassId('');
      }
      updateSections();
    } else {
      setSelectedClassId('');
      setAvailableSections([]);
      setSelectedSection('');
      setSubjects([]);
      setSelectedSubjectId('');
    }
  }, [selectedClassName, selectedSection, classes, selectedAcademicYear, updateSections]);

  useEffect(() => {
    if (selectedClassId) {
      fetchClassSubjects();
    } else {
      setSubjects([]);
      setSelectedSubjectId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedClassId && selectedSubjectId && selectedDate && selectedAcademicYear) {
      fetchStudents();
    } else {
      setStudents([]);
      setStudentRecords({});
      setStats({
        classwork: emptyCopyCheckingStats(),
        homework: emptyCopyCheckingStats(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, selectedSection, selectedSubjectId, selectedDate, workType, selectedAcademicYear]);


  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        let list = result.data as Class[];
        if (allowedClassIds && allowedClassIds.length > 0) {
          const allowedSet = new Set(allowedClassIds.map((id) => String(id).trim()));
          list = list.filter((c) => c?.id != null && allowedSet.has(String(c.id).trim()));
        }
        setClasses(list);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      setErrorMessage('Failed to load classes. Please refresh the page.');
    }
  };

  const fetchClassSubjects = useCallback(async () => {
    if (!selectedClassId) {
      setSubjects([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/classes/${selectedClassId}/subjects?school_code=${schoolCode}`
      );
      const result = await response.json();
      
      interface SubjectApiData {
        id: string;
        name?: string;
        subject_name?: string;
      }

      if (response.ok && result.data) {
        let mappedSubjects = result.data.map((subj: SubjectApiData) => ({
          id: subj.id,
          subject_name: subj.name || subj.subject_name,
        }));

        const ctSet = new Set((classTeacherClassIds || []).map((id) => String(id).trim()));
        const isCtForClass = ctSet.has(String(selectedClassId).trim());
        let subjectFilter: string[] | null = null;
        if (!isCtForClass && teachingSubjectsByClassId && Object.keys(teachingSubjectsByClassId).length > 0) {
          subjectFilter = teachingSubjectsByClassId[String(selectedClassId)] || [];
        } else if (!isCtForClass && allowedSubjectIds && allowedSubjectIds.length > 0) {
          subjectFilter = allowedSubjectIds;
        }

        if (subjectFilter != null) {
          const allow = new Set(subjectFilter.map(String));
          mappedSubjects = mappedSubjects.filter((s: { id: string }) => allow.has(String(s.id)));
        }

        setSubjects(mappedSubjects);
        if (selectedSubjectId && !mappedSubjects.find((s: Subject) => s.id === selectedSubjectId)) {
          setSelectedSubjectId('');
        }
      } else {
        setSubjects([]);
        setSelectedSubjectId('');
      }
    } catch (err) {
      console.error('Error fetching class subjects:', err);
      setSubjects([]);
      setSelectedSubjectId('');
    }
  }, [
    schoolCode,
    selectedClassId,
    selectedSubjectId,
    allowedSubjectIds,
    classTeacherClassIds,
    teachingSubjectsByClassId,
  ]);

  const fetchStatsForOtherType = async () => {
    if (!selectedClassId || !selectedSubjectId || !selectedDate || !selectedAcademicYear) return;
    
    try {
      const otherType = workType === 'classwork' ? 'homework' : 'classwork';
      const params = new URLSearchParams({
        school_code: schoolCode,
        class_id: selectedClassId,
        subject_id: selectedSubjectId,
        work_date: selectedDate,
        work_type: otherType,
        academic_year: selectedAcademicYear,
      });
      
      if (selectedSection) {
        params.append('section', selectedSection);
      }

      const response = await fetch(`/api/copy-checking?${params}`);
      const result = await response.json();

      if (response.ok && result.statistics) {
        if (otherType === 'classwork') {
          setStats((prev) => ({
            ...prev,
            classwork: result.statistics,
          }));
        } else {
          setStats((prev) => ({
            ...prev,
            homework: result.statistics,
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching stats for other type:', err);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const params = new URLSearchParams({
        school_code: schoolCode,
        class_id: selectedClassId,
        subject_id: selectedSubjectId,
        work_date: selectedDate,
        work_type: workType,
        academic_year: selectedAcademicYear,
      });
      
      if (selectedSection) {
        params.append('section', selectedSection);
      }

      const response = await fetch(`/api/copy-checking?${params}`);
      const result = await response.json();

      if (response.ok && result.data) {
        const rawList = result.data as Student[];
        const sorted = [...rawList].sort((a, b) => {
          const ra = String(a.roll_number ?? '').trim();
          const rb = String(b.roll_number ?? '').trim();
          const byRoll = ra.localeCompare(rb, undefined, { numeric: true });
          if (byRoll !== 0) return byRoll;
          const na = String(a.student_name ?? '').trim();
          const nb = String(b.student_name ?? '').trim();
          return na.localeCompare(nb);
        });
        setStudents(sorted);

        // Initialize student records
        const records: Record<string, { status: string; remarks: string }> = {};
        sorted.forEach((student: Student) => {
          records[student.id] = {
            status: student.status,
            remarks: student.remarks || '',
          };
        });
        setStudentRecords(records);
        
        if (workType === 'classwork') {
          setStats((prev) => ({
            ...prev,
            classwork: result.statistics || emptyCopyCheckingStats(),
          }));
        } else {
          setStats((prev) => ({
            ...prev,
            homework: result.statistics || emptyCopyCheckingStats(),
          }));
        }
        
        // Set topic
        if (result.topic) {
          setTopic(result.topic);
          setIsEditingTopic(false);
        } else {
          setTopic('');
          setIsEditingTopic(true);
        }
        
        // Fetch stats for the other work type
        fetchStatsForOtherType();
      } else {
        setErrorMessage(result.error || 'Failed to load students');
        setStudents([]);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setErrorMessage('Failed to load students. Please try again.');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: CopyCheckingStatus) => {
    setStudentRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        remarks: prev[studentId]?.remarks || '',
      },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setStudentRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleBulkStatusChange = (status: CopyCheckingStatus) => {
    if (students.length === 0) return;
    setStudentRecords((prev) => {
      const next = { ...prev };
      students.forEach((student) => {
        next[student.id] = {
          status,
          remarks: prev[student.id]?.remarks || '',
        };
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedClassId || !selectedSubjectId || !selectedDate || !selectedAcademicYear) {
      setErrorMessage('Please select class, subject, and date (academic year is set automatically).');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      setSuccessMessage('');
      
      const sessionProfile = getSessionStaffOrTeacherProfile();
      let markedBy = sessionProfile?.id || '';

      if (!markedBy) {
        try {
          const response = await fetch(`/api/staff?school_code=${schoolCode}`);
          const result = await response.json();
          if (response.ok && result.data && Array.isArray(result.data) && result.data.length > 0) {
            // Try to find principal or admin first
            const principal = result.data.find((s: { role?: string; id: string }) => 
              s.role && (
                s.role.toLowerCase().includes('principal') || 
                s.role.toLowerCase().includes('admin')
              )
            );
            // If no principal/admin, use the first staff member
            const defaultStaff = principal || result.data[0];
            if (defaultStaff && defaultStaff.id) {
              markedBy = defaultStaff.id;
            } else {
              setErrorMessage('Unable to create copy checking record. No valid staff found for this school.');
              return;
            }
          } else {
            setErrorMessage('Unable to create copy checking record. No staff found for this school.');
            return;
          }
        } catch (err) {
          console.error('Error fetching default staff:', err);
          setErrorMessage('Unable to create copy checking record. Please try again.');
          return;
        }
      }

      // Final validation - ensure we have valid value before proceeding
      if (!markedBy) {
        setErrorMessage('Unable to create copy checking record. Staff information is missing.');
        return;
      }

      const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

      const records = Object.entries(studentRecords).map(([studentId, record]) => ({
        student_id: studentId,
        status: record.status || 'not_checked',
        remarks: record.remarks || '',
      }));

      const response = await fetch('/api/copy-checking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          academic_year: selectedAcademicYear,
          class_id: selectedClassId,
          section: selectedSection || null,
          subject_id: selectedSubjectId,
          subject_name: selectedSubject?.subject_name || '',
          work_date: selectedDate,
          work_type: workType,
          topic: topic || null,
          records,
          marked_by: markedBy,
          teacher_copy_scoped: Boolean(teacherCopyScoped),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccessMessage(`Copy checking records saved successfully! ${records.length} students marked.`);
        setIsEditingTopic(false);
        setTimeout(() => setSuccessMessage(''), 5000);
        fetchStudents(); // Refresh data
      } else {
        setErrorMessage(result.error || 'Failed to save records');
      }
    } catch (err) {
      console.error('Error saving copy checking:', err);
      setErrorMessage('Failed to save copy checking records. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked':
        return 'bg-green-500 text-white ring-2 ring-green-300 shadow-lg';
      case 'late':
        return 'bg-amber-500 text-white ring-2 ring-amber-300 shadow-lg';
      case 'missing':
        return 'bg-red-500 text-white ring-2 ring-red-300 shadow-lg';
      case 'not_checked':
        return 'bg-gray-200 text-gray-500 hover:bg-gray-300';
      default:
        return 'bg-gray-200 text-gray-500 hover:bg-gray-300';
    }
  };

  const formatDateTime = (raw: string | null | undefined) => {
    if (!raw) return '-';
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return '-';
    return dt.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const ctSetForHint = new Set((classTeacherClassIds || []).map((id) => String(id).trim()));
  const isCtForSelected =
    Boolean(selectedClassId) && ctSetForHint.has(String(selectedClassId).trim());
  const subjectScopeHint =
    teacherCopyScoped && selectedClassId
      ? isCtForSelected
        ? 'Class teacher: you can mark all subjects for this class.'
        : 'Subject teacher: only subjects on your timetable for this class are listed.'
      : '';

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A] mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <FileText className="text-white" size={24} />
            </div>
            Copy Checking
          </h1>
          <p className="text-[#64748B]">
            Classwork and homework — statuses: not reviewed, completed, missing, late
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}`)}
          className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Success Message */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800"
          >
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters Card */}
      <Card className="p-6 bg-gradient-to-br from-white to-indigo-50/30 border-indigo-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Academic Year — current year only (no manual selection) */}
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2">
              <Calendar size={14} className="inline mr-1" />
              Academic Year
            </label>
            <div className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl bg-slate-50 text-[#0F172A] font-medium">
              {selectedAcademicYear
                ? `${selectedAcademicYear}${
                    academicYears.some((y) => y.year_name === selectedAcademicYear && y.is_current)
                      ? ' (current)'
                      : ''
                  }`
                : academicYearsError
                  ? '—'
                  : 'Loading...'}
            </div>
            {academicYearsError ? (
              <p className="mt-1.5 text-xs text-amber-800">{academicYearsError}</p>
            ) : null}
          </div>

          {/* Class */}
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2">
              <Folder size={14} className="inline mr-1" />
              Class <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedClassName}
              onChange={(e) => {
                setSelectedClassName(e.target.value);
                setSelectedSection('');
              }}
              disabled={!selectedAcademicYear}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Class</option>
              {Array.from(new Set(
                classes
                  .filter(c => !selectedAcademicYear || c.academic_year === selectedAcademicYear)
                  .map(c => c.class)
              )).sort().map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2">
              <Folder size={14} className="inline mr-1" />
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!selectedClassName}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent bg-white disabled:bg-gray-100"
            >
              <option value="">All Sections</option>
              {availableSections.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2">
              <BookOpen size={14} className="inline mr-1" />
              Subject <span className="text-red-500">*</span>
            </label>
            {!selectedClassName ? (
              <select
                disabled
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl bg-gray-100 cursor-not-allowed"
              >
                <option value="">Select Class First</option>
              </select>
            ) : subjects.length === 0 ? (
              <div className="w-full px-4 py-3 border-2 border-yellow-300 rounded-xl bg-yellow-50">
                <p className="text-sm text-yellow-800 mb-2 font-medium">No subjects assigned to this class</p>
                <p className="text-xs text-yellow-700 mb-3">First assign subjects to this class, then you can mark homework/classwork here.</p>
                <Button
                  size="sm"
                  onClick={() => router.push(`/dashboard/${schoolCode}/classes/modify`)}
                  className="w-full bg-[#2F6FED] hover:bg-[#1E3A8A] text-white"
                >
                  Go to Modify Classes
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent bg-white"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.subject_name}
                    </option>
                  ))}
                </select>
                {subjectScopeHint ? (
                  <p className="text-xs text-[#64748B]">{subjectScopeHint}</p>
                ) : null}
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2">
              <Calendar size={14} className="inline mr-1" />
              Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
            />
          </div>
        </div>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-[#1e3a8a] flex items-center gap-2">
              <BookOpen size={20} />
              CLASSWORK
            </h3>
            <TrendingUp className="text-[#3B82F6]" size={20} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-100 rounded-lg p-3 text-center border border-gray-200">
              <div className="text-2xl font-bold text-gray-700">{stats.classwork.not_checked}</div>
              <div className="text-xs text-gray-600 font-medium mt-1">NOT REVIEWED</div>
            </div>
            <div className="bg-green-100 rounded-lg p-3 text-center border border-green-200">
              <div className="text-2xl font-bold text-green-700">{stats.classwork.checked}</div>
              <div className="text-xs text-green-600 font-medium mt-1">COMPLETED</div>
            </div>
            <div className="bg-red-100 rounded-lg p-3 text-center border border-red-200">
              <div className="text-2xl font-bold text-red-700">{stats.classwork.missing}</div>
              <div className="text-xs text-red-600 font-medium mt-1">MISSING</div>
            </div>
            <div className="bg-amber-100 rounded-lg p-3 text-center border border-amber-200">
              <div className="text-2xl font-bold text-amber-800">{stats.classwork.late}</div>
              <div className="text-xs text-amber-700 font-medium mt-1">LATE</div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-purple-800 flex items-center gap-2">
              <BookOpen size={20} />
              HOMEWORK
            </h3>
            <TrendingUp className="text-purple-600" size={20} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-100 rounded-lg p-3 text-center border border-gray-200">
              <div className="text-2xl font-bold text-gray-700">{stats.homework.not_checked}</div>
              <div className="text-xs text-gray-600 font-medium mt-1">NOT REVIEWED</div>
            </div>
            <div className="bg-green-100 rounded-lg p-3 text-center border border-green-200">
              <div className="text-2xl font-bold text-green-700">{stats.homework.checked}</div>
              <div className="text-xs text-green-600 font-medium mt-1">COMPLETED</div>
            </div>
            <div className="bg-red-100 rounded-lg p-3 text-center border border-red-200">
              <div className="text-2xl font-bold text-red-700">{stats.homework.missing}</div>
              <div className="text-xs text-red-600 font-medium mt-1">MISSING</div>
            </div>
            <div className="bg-amber-100 rounded-lg p-3 text-center border border-amber-200">
              <div className="text-2xl font-bold text-amber-800">{stats.homework.late}</div>
              <div className="text-xs text-amber-700 font-medium mt-1">LATE</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Work Type Toggle and Topic */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1">
            {/* Work Type Toggle */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setWorkType('classwork')}
                className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  workType === 'classwork'
                    ? 'bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white shadow-lg'
                    : 'bg-transparent text-gray-600 hover:text-[#1e3a8a]'
                }`}
              >
                CLASSWORK
              </button>
              <button
                type="button"
                onClick={() => setWorkType('homework')}
                className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  workType === 'homework'
                    ? 'bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white shadow-lg'
                    : 'bg-transparent text-gray-600 hover:text-[#1e3a8a]'
                }`}
              >
                HOMEWORK
              </button>
            </div>

            {/* Topic Input */}
            
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleBulkStatusChange('not_checked')}
              disabled={students.length === 0}
              className="border-gray-300 text-gray-700 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Uncheck All
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleBulkStatusChange('checked')}
              disabled={students.length === 0}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check All
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !selectedClassId || !selectedSubjectId || !selectedDate || students.length === 0}
              className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm"
          >
            {errorMessage}
          </motion.div>
        )}
      </Card>

      {/* Students Table */}
      <Card className="p-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a] mx-auto mb-4"></div>
            <p className="text-[#64748B]">Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <User size={48} className="mx-auto mb-4 text-[#64748B]" />
            <p className="text-lg font-semibold text-[#0F172A] mb-2">No students found</p>
            <p className="text-sm text-[#64748B]">
              {!selectedClassId || !selectedSubjectId || !selectedDate || !selectedAcademicYear
                ? 'Please select class, subject, and date'
                : 'No students match the selected criteria'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Student Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Admission ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Roll Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Last Updated</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                    Status
                    <div className="flex items-center justify-center gap-1 mt-1 text-[10px] text-[#64748B] font-normal normal-case">
                      <span title="Not reviewed">—</span>
                      <span className="w-3 h-3 rounded-full bg-green-500" title="Completed" />
                      <span className="w-3 h-3 rounded-full bg-red-500" title="Missing" />
                      <span className="w-3 h-3 rounded-full bg-amber-500" title="Late" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student, index) => {
                  const record = studentRecords[student.id] || { status: 'not_checked' as CopyCheckingStatus, remarks: '' };
                  return (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-indigo-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-[#64748B] font-mono">
                        {String(index + 1).padStart(2, '0')}.
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center text-white font-semibold text-sm">
                            {(student.student_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-[#0F172A]">
                            {(() => {
                              const s = student as Student & { first_name?: string; last_name?: string };
                              const fromParts = `${String(s.first_name ?? '').trim()} ${String(s.last_name ?? '').trim()}`.trim();
                              return String(s.student_name ?? '').trim() || fromParts || '—';
                            })()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-[#64748B] font-mono">
                        {student.admission_no}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-[#64748B]">
                        {student.roll_number || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-[#64748B]">
                        {formatDateTime(
                          student.copy_checking?.updated_at as string | undefined
                            ?? student.copy_checking?.created_at as string | undefined
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'not_checked')}
                            className={
                              record.status === 'not_checked'
                                ? `${getStatusColor('not_checked')} min-w-[2.25rem] h-9 px-2 rounded-lg text-xs font-bold`
                                : 'min-w-[2.25rem] h-9 px-2 rounded-lg text-xs font-bold bg-gray-100 text-gray-400 border border-gray-200'
                            }
                            title="Not reviewed"
                          >
                            —
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'checked')}
                            className={
                              record.status === 'checked'
                                ? `${getStatusColor('checked')} min-w-[2.25rem] h-9 px-2 rounded-lg text-xs font-bold`
                                : 'min-w-[2.25rem] h-9 px-2 rounded-lg text-xs font-bold bg-gray-100 text-gray-400 border border-gray-200'
                            }
                            title="Completed (checked)"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'missing')}
                            className={
                              record.status === 'missing'
                                ? `${getStatusColor('missing')} min-w-[2.25rem] h-9 px-2 rounded-lg text-xs font-bold`
                                : 'min-w-[2.25rem] h-9 px-2 rounded-lg text-xs font-bold bg-gray-100 text-gray-400 border border-gray-200'
                            }
                            title="Not submitted (missing)"
                          >
                            ✗
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'late')}
                            className={
                              record.status === 'late'
                                ? `${getStatusColor('late')} min-w-[2.25rem] h-9 px-2 rounded-lg text-xs font-bold`
                                : 'min-w-[2.25rem] h-9 px-2 rounded-lg text-xs font-bold bg-gray-100 text-gray-400 border border-gray-200'
                            }
                            title="Submitted late"
                          >
                            L
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="text"
                          value={record.remarks}
                          onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                          placeholder="Add remarks..."
                          className="w-full text-sm border-gray-300 focus:border-[#1e3a8a] focus:ring-[#1e3a8a]"
                        />
                      </td>
                    </motion.tr>
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
