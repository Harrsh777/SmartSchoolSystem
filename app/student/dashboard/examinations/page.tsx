'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { FileText, Calendar, Clock } from 'lucide-react';
import type { Student } from '@/lib/supabase';

export default function ExaminationsPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      fetchExams(studentData);
    }
  }, []);

  const fetchExams = async (studentData: Student) => {
    try {
      const response = await fetch(
        `/api/examinations?school_code=${studentData.school_code}`
      );
      const result = await response.json();
      if (response.ok && result.data) {
        const today = new Date();
        const upcoming = result.data.filter((exam: any) => 
          new Date(exam.start_date) >= today
        );
        setExams(upcoming);
      }
    } catch (err) {
      console.error('Error fetching exams:', err);
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

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Examinations</h1>
          <p className="text-gray-600">View your upcoming exam schedules</p>
        </div>
      </motion.div>

      {exams.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FileText className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 text-lg">No upcoming examinations</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <Card key={exam.id} hover>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-black mb-2">{exam.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Start Date</p>
                        <p className="font-medium text-black">
                          {new Date(exam.start_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">End Date</p>
                        <p className="font-medium text-black">
                          {new Date(exam.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Academic Year</p>
                      <p className="font-medium text-black">{exam.academic_year}</p>
                    </div>
                  </div>
                  {exam.description && (
                    <p className="text-sm text-gray-600 mt-4">{exam.description}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  exam.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {exam.status || 'upcoming'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

