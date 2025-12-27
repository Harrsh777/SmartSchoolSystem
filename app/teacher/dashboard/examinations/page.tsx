'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { FileText, BookOpen, ArrowRight } from 'lucide-react';

interface Staff {
  id: string;
  school_code: string;
  staff_id: string;
}

interface Class {
  id: string;
  class: string;
  section: string;
  academic_year: string;
}

interface Exam {
  id: string;
  name: string;
  exam_type: string | null;
  total_max_marks: number;
  created_at: string;
  class: Class;
  exam_subjects: Array<{
    id: string;
    subject_id: string;
    max_marks: number;
    subject: {
      id: string;
      name: string;
      color: string;
    };
  }>;
  subjects_count: number;
}

export default function ExaminationsPage() {
  const router = useRouter();
  // teacher kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [teacher, setTeacher] = useState<Staff | null>(null);
  const [assignedClass, setAssignedClass] = useState<Class | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      fetchClassAndExams(teacherData);
    }
  }, []);

  const fetchClassAndExams = async (teacherData: Staff) => {
    try {
      setLoading(true);
      
      // Fetch assigned class
      const queryParams = new URLSearchParams({
        school_code: teacherData.school_code,
        teacher_id: teacherData.id,
      });
      if (teacherData.staff_id) {
        queryParams.append('staff_id', teacherData.staff_id);
      }
      
      const classResponse = await fetch(`/api/classes/teacher?${queryParams.toString()}`);
      const classResult = await classResponse.json();
      
      if (classResponse.ok && classResult.data) {
        setAssignedClass(classResult.data);
        
        // Fetch exams for this class
        const examsResponse = await fetch(
          `/api/examinations?school_code=${teacherData.school_code}&class_id=${classResult.data.id}`
        );
        const examsResult = await examsResponse.json();
        
        if (examsResponse.ok && examsResult.data) {
          setExams(examsResult.data);
        }
      } else {
        // Teacher is not assigned to any class
        setAssignedClass(null);
      }
    } catch (err) {
      console.error('Error fetching class and exams:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!assignedClass) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="text-blue-600" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Examinations</h1>
              <p className="text-gray-600">View and enter marks for examinations</p>
            </div>
          </div>
        </motion.div>

        <Card>
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg mb-2">No Class Assigned</p>
            <p className="text-gray-500 text-sm">
              You are not assigned as a class teacher. Please contact the principal to get assigned to a class.
            </p>
          </div>
        </Card>
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
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Examinations</h1>
            <p className="text-gray-600">
              Class {assignedClass.class} - Section {assignedClass.section} ({assignedClass.academic_year})
            </p>
          </div>
        </div>
      </motion.div>

      {exams.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">No examinations found for your class</p>
            <p className="text-gray-500 text-sm mt-2">
              Examinations will appear here once the principal creates them for your class.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <Card key={exam.id} hover>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{exam.name}</h3>
                  {exam.exam_type && (
                    <p className="text-sm text-gray-600">{exam.exam_type}</p>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <BookOpen size={16} className="text-gray-500" />
                    <span>{exam.subjects_count} Subject{exam.subjects_count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="text-gray-700">
                    <span className="font-semibold">Total Max Marks:</span> {exam.total_max_marks}
                  </div>
                  <div className="text-gray-500 text-xs">
                    Created {new Date(exam.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <Button
                    onClick={() => router.push(`/dashboard/teacher/examinations/${exam.id}`)}
                    className="w-full"
                  >
                    Mark Entry
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
