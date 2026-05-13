'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Award,
  ArrowLeft,
  Users,
  CheckSquare,
  Square,
  FileText,
  Search,
} from 'lucide-react';

interface Class {
  id: string;
  class: string;
  section?: string;
}

interface Student {
  id: string;
  student_name: string;
  admission_no: string;
  roll_number?: string | null;
  class: string;
  section?: string;
}

interface Template {
  id: string;
  name: string;
  type: string;
}

export default function ClasswiseCertificatesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchClasses = useCallback(async () => {
    try {
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setClasses(result.data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  }, [schoolCode]);

  const fetchTemplates = useCallback(async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/certificates/templates?school_code=${schoolCode}`);
      // const result = await response.json();
      // if (response.ok && result.data) {
      //   setTemplates(result.data);
      // }
      
      // Mock data for now
      setTemplates([
        { id: '1', name: 'Academic Excellence', type: 'ACHIEVEMENT' },
        { id: '2', name: 'Sports Participation', type: 'PARTICIPATION' },
        { id: '3', name: 'Course Completion', type: 'COMPLETION' },
      ]);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/students?school_code=${schoolCode}&class_id=${selectedClassId}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStudents(result.data);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolCode, selectedClassId]);

  useEffect(() => {
    fetchClasses();
    fetchTemplates();
  }, [fetchClasses, fetchTemplates]);

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents();
    } else {
      setStudents([]);
      setSelectedStudents(new Set());
    }
  }, [selectedClassId, fetchStudents]);

  const toggleStudent = (studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const toggleAllStudents = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId || selectedStudents.size === 0) {
      alert('Please select a template and at least one student');
      return;
    }

    try {
      // TODO: API call to generate certificates
      alert(`Generating ${selectedStudents.size} certificates...`);
      // Reset after generation
      setSelectedStudents(new Set());
    } catch (err) {
      console.error('Error generating certificates:', err);
      alert('Failed to generate certificates');
    }
  };

  const filteredStudents = students.filter(student =>
    student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.admission_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Award className="text-orange-500" size={32} />
            Class wise Student Certificates
          </h1>
          <p className="text-gray-600">Generate certificates for multiple students in a class</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedStudents(new Set());
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select a class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class} {cls.section ? `- ${cls.section}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Template
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select a template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Students List */}
      {selectedClassId ? (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Select Students ({selectedStudents.size} selected)
            </h3>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllStudents}
              >
                {selectedStudents.size === filteredStudents.length ? (
                  <>
                    <CheckSquare size={16} className="mr-2" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Square size={16} className="mr-2" />
                    Select All
                  </>
                )}
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : filteredStudents.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredStudents.map((student) => (
                <label
                  key={student.id}
                  className={`flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors ${
                    selectedStudents.has(student.id) ? 'bg-orange-50 border border-orange-200' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.has(student.id)}
                    onChange={() => toggleStudent(student.id)}
                    className="mr-3 w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{student.student_name}</p>
                    <p className="text-sm text-gray-600">
                      Admission No: {student.admission_no} | 
                      {student.roll_number && ` Roll No: ${student.roll_number}`} | 
                      Class: {student.class}{student.section ? `-${student.section}` : ''}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Users size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold mb-2">No students found</p>
              <p>No students match your search criteria.</p>
            </div>
          )}

          {selectedTemplateId && selectedStudents.size > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end">
              <Button
                onClick={handleGenerate}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <FileText size={18} className="mr-2" />
                Generate {selectedStudents.size} Certificate{selectedStudents.size > 1 ? 's' : ''}
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <Users size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold mb-2">Select a class to get started</p>
            <p>Choose a class and template to generate certificates for students.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

