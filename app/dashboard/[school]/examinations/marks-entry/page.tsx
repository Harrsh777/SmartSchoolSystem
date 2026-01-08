'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  ArrowLeft, 
  Search,
  FileText,
  Users,
  BookOpen,
  Save,
  Download,
  Filter,
  Loader2
} from 'lucide-react';

interface Student {
  id: string;
  admission_no: string;
  student_name: string;
  roll_number?: string;
}

interface Subject {
  id: string;
  name: string;
  max_marks: number;
}

interface MarksData {
  student_id: string;
  subject_id: string;
  marks_obtained: number;
  remarks?: string;
}

export default function MarksEntryPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [marks, setMarks] = useState<Record<string, Record<string, number>>>({});
  const [remarks, setRemarks] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data
  const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'C', 'D'];
  const exams = [
    { id: '1', name: 'Unit Test 1', academic_year: '2024-2025' },
    { id: '2', name: 'Mid Term Exam', academic_year: '2024-2025' },
    { id: '3', name: 'Unit Test 2', academic_year: '2024-2025' },
  ];

  const mockStudents: Student[] = [
    { id: '1', admission_no: 'STU001', student_name: 'John Doe', roll_number: '1' },
    { id: '2', admission_no: 'STU002', student_name: 'Jane Smith', roll_number: '2' },
    { id: '3', admission_no: 'STU003', student_name: 'Bob Johnson', roll_number: '3' },
  ];

  const mockSubjects: Subject[] = [
    { id: '1', name: 'Mathematics', max_marks: 100 },
    { id: '2', name: 'Science', max_marks: 100 },
    { id: '3', name: 'English', max_marks: 100 },
    { id: '4', name: 'Social Studies', max_marks: 100 },
  ];

  useEffect(() => {
    if (selectedClass && selectedSection) {
      // TODO: Fetch students and subjects
      setStudents(mockStudents);
      setSubjects(mockSubjects);
    }
  }, [selectedClass, selectedSection]);

  const handleMarksChange = (studentId: string, subjectId: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectId]: numValue,
      },
    }));
  };

  const handleRemarksChange = (studentId: string, subjectId: string, value: string) => {
    setRemarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectId]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // TODO: Implement API call
    setTimeout(() => {
      setSaving(false);
      alert('Marks saved successfully!');
    }, 1000);
  };

  const filteredStudents = students.filter(student =>
    student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.admission_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <FileText className="text-white" size={24} />
            </div>
            Marks Entry
          </h1>
          <p className="text-gray-600">Enter and manage examination marks</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/examinations`)}
          className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <BookOpen size={14} className="inline mr-1" />
              Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">Select Section</option>
              {sections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Examination
            </label>
            <select
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">Select Exam</option>
              {exams.map(exam => (
                <option key={exam.id} value={exam.id}>{exam.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">All Subjects</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleSave}
              disabled={saving || !selectedClass || !selectedSection || !selectedExam}
              className="w-full bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2" />
                  Save Marks
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Search */}
      {students.length > 0 && (
        <Card>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or admission number..."
              className="pl-10"
            />
          </div>
        </Card>
      )}

      {/* Marks Table */}
      {students.length > 0 && subjects.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Roll No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Admission No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Student Name</th>
                  {subjects.map(subject => (
                    <th key={subject.id} className="px-4 py-3 text-center text-sm font-semibold">
                      {subject.name}
                      <div className="text-xs font-normal opacity-90">(Max: {subject.max_marks})</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStudents.map((student, index) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {student.roll_number || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {student.admission_no}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {student.student_name}
                    </td>
                    {subjects.map(subject => (
                      <td key={subject.id} className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          max={subject.max_marks}
                          value={marks[student.id]?.[subject.id] || ''}
                          onChange={(e) => handleMarksChange(student.id, subject.id, e.target.value)}
                          placeholder="0"
                          className="w-20 text-center"
                        />
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {(!selectedClass || !selectedSection || !selectedExam) && (
        <Card>
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">Select class, section, and examination to enter marks</p>
          </div>
        </Card>
      )}
    </div>
  );
}



