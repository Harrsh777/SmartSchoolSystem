'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { MapPin, Calendar, GraduationCap } from 'lucide-react';
import type { Student } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

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
        {(() => {
          const studentName = getString(student.student_name);
          const admissionNo = getString(student.admission_no);
          const studentClass = getString(student.class);
          const section = getString(student.section);
          const academicYear = getString(student.academic_year);
          const gender = getString(student.gender);
          const dateOfBirth = getString(student.date_of_birth);
          const address = getString(student.address);
          const status = getString(student.status);
          
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Student Name</p>
                <p className="text-lg font-semibold text-black">{studentName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Admission Number</p>
                <p className="text-lg font-semibold text-black font-mono">{admissionNo || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                  <GraduationCap size={14} />
                  Class & Section
                </p>
                <p className="text-lg font-semibold text-black">{studentClass || 'N/A'} - {section || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Academic Year</p>
                <p className="text-lg font-semibold text-black">{academicYear || 'N/A'}</p>
              </div>
              {gender.length > 0 ? (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Gender</p>
                  <p className="text-lg font-semibold text-black">{gender}</p>
                </div>
              ) : null}
              {dateOfBirth.length > 0 ? (
                <div>
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <Calendar size={14} />
                    Date of Birth
                  </p>
                  <p className="text-lg font-semibold text-black">
                    {new Date(dateOfBirth).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              ) : null}
              {address.length > 0 ? (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                    <MapPin size={14} />
                    Address
                  </p>
                  <p className="text-lg font-semibold text-black">{address}</p>
                </div>
              ) : null}
              <div>
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {status.length > 0 ? status : 'active'}
                </span>
              </div>
            </div>
          );
        })()}
      </Card>
    </div>
  );
}

