'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  FileText, 
  Calendar, 
  Folder, 
  X, 
  Save,
  Edit,
  User,
  ArrowLeft,
  BookOpen,
  TrendingUp
} from 'lucide-react';

interface Student {
  id: string;
  student_name: string;
  admission_no: string;
  roll_number?: string | null;
  class: string;
  section?: string;
  status: 'green' | 'yellow' | 'red' | 'not_marked' | 'absent';
  remarks: string;
  copy_checking?: {
    id?: string;
    status?: string;
    remarks?: string;
    topic?: string;
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

export default function CopyCheckingPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [stats, setStats] = useState({
    class_work: { green: 0, yellow: 0, red: 0, not_marked: 0, absent: 0 },
    homework: { green: 0, yellow: 0, red: 0, not_marked: 0, absent: 0 },
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Filters
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [workType, setWorkType] = useState<'class_work' | 'homework'>('class_work');
  const [topic, setTopic] = useState('');
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  
  // Student records
  const [studentRecords, setStudentRecords] = useState<Record<string, { status: string; remarks: string }>>({});

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    // Extract unique academic years from classes
    if (classes.length > 0) {
      const uniqueYears: string[] = Array.from(new Set(classes.map(c => c.academic_year).filter((year): year is string => Boolean(year)))).sort().reverse();
      const academicYearsData: AcademicYear[] = uniqueYears.map(year => ({
        id: year,
        year_name: year,
        start_date: '',
        end_date: '',
        is_current: false,
      }));
      setAcademicYears(academicYearsData);
      if (uniqueYears.length > 0 && !selectedAcademicYear) {
        setSelectedAcademicYear(uniqueYears[0]);
      }
    }
  }, [classes, selectedAcademicYear]);

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
      // Find the first matching class ID for the selected class name
      const matchingClass = classes.find(
        c => c.class === selectedClassName && 
        (!selectedAcademicYear || c.academic_year === selectedAcademicYear)
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
  }, [selectedClassName, classes, selectedAcademicYear, updateSections]);

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
        class_work: { green: 0, yellow: 0, red: 0, not_marked: 0, absent: 0 },
        homework: { green: 0, yellow: 0, red: 0, not_marked: 0, absent: 0 },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, selectedSection, selectedSubjectId, selectedDate, workType, selectedAcademicYear]);


  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setClasses(result.data);
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
        const mappedSubjects = result.data.map((subj: SubjectApiData) => ({
          id: subj.id,
          subject_name: subj.name || subj.subject_name,
        }));
        setSubjects(mappedSubjects);
        // Clear selected subject if it's not in the new list
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
  }, [schoolCode, selectedClassId, selectedSubjectId]);

  const fetchStatsForOtherType = async () => {
    if (!selectedClassId || !selectedSubjectId || !selectedDate || !selectedAcademicYear) return;
    
    try {
      const otherType = workType === 'class_work' ? 'homework' : 'class_work';
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
        if (otherType === 'class_work') {
          setStats(prev => ({
            ...prev,
            class_work: result.statistics,
          }));
        } else {
          setStats(prev => ({
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
        setStudents(result.data);
        
        // Initialize student records
        const records: Record<string, { status: string; remarks: string }> = {};
        result.data.forEach((student: Student) => {
          records[student.id] = {
            status: student.status,
            remarks: student.remarks || '',
          };
        });
        setStudentRecords(records);
        
        // Update stats for current work type
        if (workType === 'class_work') {
          setStats(prev => ({
            ...prev,
            class_work: result.statistics || { green: 0, yellow: 0, red: 0, not_marked: 0, absent: 0 },
          }));
        } else {
          setStats(prev => ({
            ...prev,
            homework: result.statistics || { green: 0, yellow: 0, red: 0, not_marked: 0, absent: 0 },
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

  const handleStatusChange = (studentId: string, status: 'green' | 'yellow' | 'red' | 'not_marked' | 'absent') => {
    setStudentRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
        // Clear remarks if marking as absent
        remarks: status === 'absent' ? '' : (prev[studentId]?.remarks || ''),
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

  const handleSave = async () => {
    if (!selectedClassId || !selectedSubjectId || !selectedDate || !selectedAcademicYear) {
      setErrorMessage('Please select academic year, class, subject, and date');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');
      setSuccessMessage('');
      
      // Get current user (staff) from session
      const storedStaff = sessionStorage.getItem('staff');
      let markedBy = '';
      
      if (storedStaff) {
        try {
          const staffData = JSON.parse(storedStaff);
          markedBy = staffData.id;
        } catch {
          // Ignore parse error
        }
      }

      // If no staff in session (accessing from main dashboard), fetch default admin/principal
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
        status: record.status || 'not_marked',
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
      case 'green':
        return 'bg-green-500 text-white ring-2 ring-green-300 shadow-lg';
      case 'yellow':
        return 'bg-yellow-500 text-white ring-2 ring-yellow-300 shadow-lg';
      case 'red':
        return 'bg-red-500 text-white ring-2 ring-red-300 shadow-lg';
      case 'absent':
        return 'bg-orange-500 text-white ring-2 ring-orange-300 shadow-lg';
      default:
        return 'bg-gray-200 text-gray-500 hover:bg-gray-300';
    }
  };

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
          <p className="text-[#64748B]">Mark student classwork and homework with color-coded status</p>
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

      {/* Success/Error Messages */}
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
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800"
          >
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters Card */}
      <Card className="p-6 bg-gradient-to-br from-white to-indigo-50/30 border-indigo-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Academic Year */}
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2">
              <Calendar size={14} className="inline mr-1" />
              Academic Year <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => {
                setSelectedAcademicYear(e.target.value);
                setSelectedClassName('');
                setSelectedClassId('');
                setSelectedSection('');
                setSubjects([]);
                setSelectedSubjectId('');
              }}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent bg-white"
            >
              <option value="">Select Academic Year</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.year_name}>
                  {year.year_name}
                </option>
              ))}
            </select>
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
              CLASS WORK
            </h3>
            <TrendingUp className="text-[#3B82F6]" size={20} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-green-100 rounded-lg p-3 text-center border border-green-200">
              <div className="text-2xl font-bold text-green-700">{stats.class_work.green}</div>
              <div className="text-xs text-green-600 font-medium mt-1">COPY CHECKED</div>
            </div>
            <div className="bg-yellow-100 rounded-lg p-3 text-center border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700">{stats.class_work.yellow}</div>
              <div className="text-xs text-yellow-600 font-medium mt-1">HALF DONE</div>
            </div>
            <div className="bg-red-100 rounded-lg p-3 text-center border border-red-200">
              <div className="text-2xl font-bold text-red-700">{stats.class_work.red}</div>
              <div className="text-xs text-red-600 font-medium mt-1">INCOMPLETE</div>
            </div>
            <div className="bg-orange-100 rounded-lg p-3 text-center border border-orange-200">
              <div className="text-2xl font-bold text-orange-700">{stats.class_work.absent || 0}</div>
              <div className="text-xs text-orange-600 font-medium mt-1">ABSENT</div>
            </div>
            <div className="bg-gray-100 rounded-lg p-3 text-center border border-gray-200">
              <div className="text-2xl font-bold text-gray-700">{stats.class_work.not_marked}</div>
              <div className="text-xs text-gray-600 font-medium mt-1">NOT MARKED</div>
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-green-100 rounded-lg p-3 text-center border border-green-200">
              <div className="text-2xl font-bold text-green-700">{stats.homework.green}</div>
              <div className="text-xs text-green-600 font-medium mt-1">COPY CHECKED</div>
            </div>
            <div className="bg-yellow-100 rounded-lg p-3 text-center border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-700">{stats.homework.yellow}</div>
              <div className="text-xs text-yellow-600 font-medium mt-1">HALF DONE</div>
            </div>
            <div className="bg-red-100 rounded-lg p-3 text-center border border-red-200">
              <div className="text-2xl font-bold text-red-700">{stats.homework.red}</div>
              <div className="text-xs text-red-600 font-medium mt-1">INCOMPLETE</div>
            </div>
            <div className="bg-orange-100 rounded-lg p-3 text-center border border-orange-200">
              <div className="text-2xl font-bold text-orange-700">{stats.homework.absent || 0}</div>
              <div className="text-xs text-orange-600 font-medium mt-1">ABSENT</div>
            </div>
            <div className="bg-gray-100 rounded-lg p-3 text-center border border-gray-200">
              <div className="text-2xl font-bold text-gray-700">{stats.homework.not_marked}</div>
              <div className="text-xs text-gray-600 font-medium mt-1">NOT MARKED</div>
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
                onClick={() => setWorkType('class_work')}
                className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  workType === 'class_work'
                    ? 'bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white shadow-lg'
                    : 'bg-transparent text-gray-600 hover:text-[#1e3a8a]'
                }`}
              >
                CLASS WORK
              </button>
              <button
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
            <div className="flex-1 max-w-md w-full">
              <label className="block text-sm font-semibold text-[#0F172A] mb-2">Topic (Optional)</label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Enter topic/subject matter..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={!isEditingTopic}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => setIsEditingTopic(!isEditingTopic)}
                  className="bg-[#1e3a8a] hover:bg-[#3B82F6] text-white"
                >
                  <Edit size={16} className="mr-1" />
                  {isEditingTopic ? 'Done' : 'Edit'}
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedClassName('');
                setSelectedClassId('');
                setSelectedSection('');
                setSelectedSubjectId('');
                setStudents([]);
                setStudentRecords({});
              }}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <X size={18} className="mr-2" />
              Clear
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
                ? 'Please select academic year, class, subject, and date'
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
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                    Status
                    <div className="flex items-center justify-center gap-1 mt-1 text-[10px]">
                      <span className="w-4 h-4 rounded-full bg-green-500" title="Green"></span>
                      <span className="w-4 h-4 rounded-full bg-yellow-500" title="Yellow"></span>
                      <span className="w-4 h-4 rounded-full bg-red-500" title="Red"></span>
                      <span className="w-4 h-4 rounded-full bg-orange-500" title="Absent"></span>
                      <span className="w-4 h-4 rounded-full bg-gray-400" title="Not Marked"></span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student, index) => {
                  const record = studentRecords[student.id] || { status: 'not_marked', remarks: '' };
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
                            {student.student_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-[#0F172A]">{student.student_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-[#64748B] font-mono">
                        {student.admission_no}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-[#64748B]">
                        {student.roll_number || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleStatusChange(student.id, 'green')}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${getStatusColor(record.status === 'green' ? 'green' : 'not_marked')}`}
                            title="Copy Checked (Green)"
                          >
                            {record.status === 'green' ? 'G' : ''}
                          </button>
                          <button
                            onClick={() => handleStatusChange(student.id, 'yellow')}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${getStatusColor(record.status === 'yellow' ? 'yellow' : 'not_marked')}`}
                            title="Half Done (Yellow)"
                          >
                            {record.status === 'yellow' ? 'Y' : ''}
                          </button>
                          <button
                            onClick={() => handleStatusChange(student.id, 'red')}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${getStatusColor(record.status === 'red' ? 'red' : 'not_marked')}`}
                            title="Incomplete (Red)"
                          >
                            {record.status === 'red' ? 'R' : ''}
                          </button>
                          <button
                            onClick={() => handleStatusChange(student.id, 'absent')}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${getStatusColor(record.status === 'absent' ? 'absent' : 'not_marked')}`}
                            title="Absent"
                          >
                            {record.status === 'absent' ? 'A' : ''}
                          </button>
                          <button
                            onClick={() => handleStatusChange(student.id, 'not_marked')}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${getStatusColor(record.status === 'not_marked' ? 'not_marked' : 'not_marked')}`}
                            title="Not Marked"
                          >
                            {record.status === 'not_marked' ? 'N' : ''}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="text"
                          value={record.remarks}
                          onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                          placeholder={record.status === 'absent' ? 'Absent' : 'Add remarks...'}
                          disabled={record.status === 'absent'}
                          className={`w-full text-sm border-gray-300 focus:border-[#1e3a8a] focus:ring-[#1e3a8a] ${record.status === 'absent' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
