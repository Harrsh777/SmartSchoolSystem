'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, GraduationCap, Building2 } from 'lucide-react';
import type { Student } from '@/lib/supabase';

export default function ViewStudentPage({
  params,
}: {
  params: Promise<{ school: string; id: string }>;
}) {
  const { school: schoolCode, id: studentId } = use(params);
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudent();
  }, [studentId, schoolCode]);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/students/${studentId}?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setStudent(result.data);
      } else {
        router.push(`/dashboard/${schoolCode}/students`);
      }
    } catch (err) {
      console.error('Error fetching student:', err);
      router.push(`/dashboard/${schoolCode}/students`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading student details...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg mb-4">Student not found</p>
          <Button onClick={() => router.push(`/dashboard/${schoolCode}/students`)}>
            Back to Students
          </Button>
        </div>
      </Card>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not provided';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/students`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Student Details</h1>
            <p className="text-gray-600">View complete student information</p>
          </div>
        </div>
        <Button onClick={() => router.push(`/dashboard/${schoolCode}/students/${studentId}/edit`)}>
          Edit Student
        </Button>
      </div>

      {/* Student Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <div className="space-y-8">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-bold text-black mb-6 flex items-center">
                <User size={24} className="mr-2" />
                Basic Information
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Admission Number</label>
                  <p className="text-lg font-medium text-black mt-1">{student.admission_no}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Student Name</label>
                  <p className="text-lg font-medium text-black mt-1">{student.student_name}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Class</label>
                  <p className="text-lg font-medium text-black mt-1">{student.class}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Section</label>
                  <p className="text-lg font-medium text-black mt-1">{student.section}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600 flex items-center">
                    <Calendar size={16} className="mr-1" />
                    Date of Birth
                  </label>
                  <p className="text-lg font-medium text-black mt-1">{formatDate(student.date_of_birth)}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Gender</label>
                  <p className="text-lg font-medium text-black mt-1">{student.gender || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Status</label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                    student.status === 'active' 
                      ? 'bg-green-100 text-green-800'
                      : student.status === 'inactive'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {student.status}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Academic Year</label>
                  <p className="text-lg font-medium text-black mt-1">{student.academic_year}</p>
                </div>
              </div>
            </div>

            {/* Parent/Guardian Information */}
            {(student.parent_name || student.parent_phone || student.parent_email) && (
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-xl font-bold text-black mb-6 flex items-center">
                  <User size={24} className="mr-2" />
                  Parent/Guardian Information
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {student.parent_name && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600">Parent Name</label>
                      <p className="text-lg font-medium text-black mt-1">{student.parent_name}</p>
                    </div>
                  )}
                  {student.parent_phone && (
                    <div>
                      <label className="text-sm font-semibold text-gray-600 flex items-center">
                        <Phone size={16} className="mr-1" />
                        Parent Phone
                      </label>
                      <p className="text-lg font-medium text-black mt-1">{student.parent_phone}</p>
                    </div>
                  )}
                  {student.parent_email && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-gray-600 flex items-center">
                        <Mail size={16} className="mr-1" />
                        Parent Email
                      </label>
                      <p className="text-lg font-medium text-black mt-1">{student.parent_email}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Address */}
            {student.address && (
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-xl font-bold text-black mb-6 flex items-center">
                  <MapPin size={24} className="mr-2" />
                  Address
                </h2>
                <p className="text-gray-700">{student.address}</p>
              </div>
            )}

            {/* Additional Information */}
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-bold text-black mb-6 flex items-center">
                <Building2 size={24} className="mr-2" />
                Additional Information
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Created At</label>
                  <p className="text-lg font-medium text-black mt-1">
                    {student.created_at ? formatDate(student.created_at) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Last Updated</label>
                  <p className="text-lg font-medium text-black mt-1">
                    {student.updated_at ? formatDate(student.updated_at) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

