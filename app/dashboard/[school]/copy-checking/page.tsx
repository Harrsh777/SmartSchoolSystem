'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  FileText, 
  Calendar, 
  Folder, 
  Download, 
  X, 
  Save,
  Edit,
  User,
  ArrowLeft
} from 'lucide-react';

interface Student {
  id: string;
  student_name: string;
  admission_no: string;
  roll_number?: string | null;
  class: string;
  section?: string;
  status: 'green' | 'yellow' | 'red' | 'not_marked';
  remarks: string;
  copy_checking?: any;
}

interface Class {
  id: string;
  class: string;
  section?: string;
}

interface Subject {
  id: string;
  subject_name: string;
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
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState({
    class_work: { green: 0, yellow: 0, red: 0, not_marked: 0 },
    homework: { green: 0, yellow: 0, red: 0, not_marked: 0 },
  });
  
  // Filters
  const [academicYear, setAcademicYear] = useState('');
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
    fetchSubjects();
    fetchAcademicYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (selectedClassId && selectedSubjectId && selectedDate) {
      fetchStudents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, selectedSubjectId, selectedDate, workType, schoolCode]);

  const fetchAcademicYears = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;
      setAcademicYear(`Apr ${currentYear} - Mar ${nextYear}`);
    } catch (err) {
      console.error('Error setting academic year:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setClasses(result.data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await fetch(`/api/timetable/subjects?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        // Map subjects to match expected format
        const mappedSubjects = result.data.map((subj: any) => ({
          id: subj.id,
          subject_name: subj.name || subj.subject_name,
        }));
        setSubjects(mappedSubjects);
      }
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  const fetchStatsForOtherType = async () => {
    if (!selectedClassId || !selectedSubjectId || !selectedDate) return;
    
    try {
      const otherType = workType === 'class_work' ? 'homework' : 'class_work';
      const params = new URLSearchParams({
        school_code: schoolCode,
        class_id: selectedClassId,
        subject_id: selectedSubjectId,
        work_date: selectedDate,
        work_type: otherType,
      });

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
      const params = new URLSearchParams({
        school_code: schoolCode,
        class_id: selectedClassId,
        subject_id: selectedSubjectId,
        work_date: selectedDate,
        work_type: workType,
      });

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
            class_work: result.statistics || { green: 0, yellow: 0, red: 0, not_marked: 0 },
          }));
        } else {
          setStats(prev => ({
            ...prev,
            homework: result.statistics || { green: 0, yellow: 0, red: 0, not_marked: 0 },
          }));
        }
        
        // Set topic
        if (result.topic) {
          setTopic(result.topic);
        }
        
        // Fetch stats for the other work type
        fetchStatsForOtherType();
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId: string, status: 'green' | 'yellow' | 'red' | 'not_marked') => {
    setStudentRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
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
    if (!selectedClassId || !selectedSubjectId || !selectedDate) {
      alert('Please select class, subject, and date');
      return;
    }

    try {
      setSaving(true);
      
      // Get current user (staff) from session
      const storedSchool = sessionStorage.getItem('school');
      const storedTeacher = sessionStorage.getItem('teacher');
      let markedBy = '';
      
      if (storedTeacher) {
        const teacher = JSON.parse(storedTeacher);
        markedBy = teacher.id;
      } else if (storedSchool) {
        // For admin/principal, use a default or fetch from API
        const response = await fetch(`/api/staff?school_code=${schoolCode}&limit=1`);
        const result = await response.json();
        if (response.ok && result.data && result.data.length > 0) {
          markedBy = result.data[0].id;
        }
      }

      if (!markedBy) {
        alert('Unable to identify user. Please login again.');
        return;
      }

      const selectedClass = classes.find(c => c.id === selectedClassId);
      const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

      const records = Object.entries(studentRecords).map(([studentId, record]) => ({
        student_id: studentId,
        status: record.status,
        remarks: record.remarks,
      }));

      const response = await fetch('/api/copy-checking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          academic_year: academicYear,
          class_id: selectedClassId,
          section: selectedSection || selectedClass?.section || null,
          subject_id: selectedSubjectId,
          subject_name: selectedSubject?.subject_name || selectedSubject?.name || '',
          work_date: selectedDate,
          work_type: workType,
          topic: topic || null,
          records,
          marked_by: markedBy,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Copy checking records saved successfully!');
        setIsEditingTopic(false);
        fetchStudents(); // Refresh data
      } else {
        alert(`Error: ${result.error || 'Failed to save records'}`);
      }
    } catch (err) {
      console.error('Error saving copy checking:', err);
      alert('Failed to save copy checking records');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    // TODO: Implement download functionality
    alert('Download functionality will be implemented');
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const sections = selectedClass ? [selectedClass.section].filter(Boolean) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <FileText size={32} />
            Copy Checking
          </h1>
          <p className="text-gray-600">Mark student classwork and homework</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-gray-400" size={20} />
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select Academic Year</option>
              <option value={academicYear}>{academicYear}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Folder className="text-gray-400" size={20} />
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                const cls = classes.find(c => c.id === e.target.value);
                setSelectedSection(cls?.section || '');
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Folder className="text-gray-400" size={20} />
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select Section</option>
              {sections.map((section) => (
                <option key={section} value={section}>
                  {section}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Folder className="text-gray-400" size={20} />
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select Subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.subject_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1"
            />
            <Calendar className="text-gray-400" size={20} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleDownload}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Download size={18} className="mr-2" />
            DOWNLOAD
          </Button>
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">CLASS WORK</h3>
            <div className="flex flex-wrap gap-4">
              <span className="text-green-600 font-medium">GREEN : {stats.class_work.green}</span>
              <span className="text-yellow-600 font-medium">YELLOW : {stats.class_work.yellow}</span>
              <span className="text-red-600 font-medium">RED : {stats.class_work.red}</span>
              <span className="text-gray-600 font-medium">NOT MARKED : {stats.class_work.not_marked}</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">HOMEWORK</h3>
            <div className="flex flex-wrap gap-4">
              <span className="text-green-600 font-medium">GREEN : {stats.homework.green}</span>
              <span className="text-yellow-600 font-medium">YELLOW : {stats.homework.yellow}</span>
              <span className="text-red-600 font-medium">RED : {stats.homework.red}</span>
              <span className="text-gray-600 font-medium">NOT MARKED : {stats.homework.not_marked}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Work Type Toggle and Topic */}
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setWorkType('class_work')}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  workType === 'class_work'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-black border border-gray-300'
                }`}
              >
                CLASS WORK
              </button>
              <button
                onClick={() => setWorkType('homework')}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  workType === 'homework'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white text-black border border-gray-300'
                }`}
              >
                HOMEWORK
              </button>
            </div>

            <div className="flex-1 max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Type here..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={!isEditingTopic}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => setIsEditingTopic(!isEditingTopic)}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <Edit size={16} className="mr-1" />
                  EDIT
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/${schoolCode}`)}
              className="bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
            >
              <X size={18} className="mr-2" />
              CANCEL
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Save size={18} className="mr-2" />
              {saving ? 'SAVING...' : 'SAVE'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Students Table */}
      <Card>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <User size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold text-gray-900 mb-2">No students found</p>
            <p className="text-sm text-gray-600">Please select class, section, subject, and date</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-teal-600 text-white">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Student Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Admission ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Roll Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Class</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Section</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Status
                    <div className="flex items-center gap-1 mt-1">
                      <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">G</span>
                      <span className="w-5 h-5 rounded-full bg-yellow-500 text-white text-xs flex items-center justify-center">Y</span>
                      <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">R</span>
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
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{String(index + 1).padStart(2, '0')}.</span>
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User size={16} className="text-gray-500" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{student.student_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {student.admission_no}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {student.roll_number || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {student.class}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {student.section || '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStatusChange(student.id, 'green')}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                              record.status === 'green'
                                ? 'bg-green-500 text-white ring-2 ring-green-300'
                                : 'bg-gray-200 text-gray-500 hover:bg-green-100'
                            }`}
                          >
                            G
                          </button>
                          <button
                            onClick={() => handleStatusChange(student.id, 'yellow')}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                              record.status === 'yellow'
                                ? 'bg-yellow-500 text-white ring-2 ring-yellow-300'
                                : 'bg-gray-200 text-gray-500 hover:bg-yellow-100'
                            }`}
                          >
                            Y
                          </button>
                          <button
                            onClick={() => handleStatusChange(student.id, 'red')}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                              record.status === 'red'
                                ? 'bg-red-500 text-white ring-2 ring-red-300'
                                : 'bg-gray-200 text-gray-500 hover:bg-red-100'
                            }`}
                          >
                            R
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="text"
                          value={record.remarks}
                          onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                          placeholder="Add remarks..."
                          className="w-full text-sm"
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

