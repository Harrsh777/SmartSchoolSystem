'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { User, MapPin, Calendar, GraduationCap } from 'lucide-react';
import type { Student } from '@/lib/supabase';

export default function PersonalInfoPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      setLoading(false);
    }
  }, []);

  if (loading || !student) {
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
          <h1 className="text-3xl font-bold text-black mb-2">Personal Information</h1>
          <p className="text-gray-600">Your personal details and academic information</p>
        </div>
      </motion.div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Student Name</p>
            <p className="text-lg font-semibold text-black">{student.student_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Admission Number</p>
            <p className="text-lg font-semibold text-black font-mono">{student.admission_no}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
              <GraduationCap size={14} />
              Class & Section
            </p>
            <p className="text-lg font-semibold text-black">{student.class} - {student.section}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Academic Year</p>
            <p className="text-lg font-semibold text-black">{student.academic_year}</p>
          </div>
          {student.gender && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Gender</p>
              <p className="text-lg font-semibold text-black">{student.gender}</p>
            </div>
          )}
          {student.date_of_birth && (
            <div>
              <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                <Calendar size={14} />
                Date of Birth
              </p>
              <p className="text-lg font-semibold text-black">
                {new Date(student.date_of_birth).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}
          {student.address && (
            <div className="md:col-span-2">
              <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                <MapPin size={14} />
                Address
              </p>
              <p className="text-lg font-semibold text-black">{student.address}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600 mb-1">Status</p>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {student.status || 'active'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

