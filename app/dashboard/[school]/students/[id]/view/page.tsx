'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, Building2, UsersRound } from 'lucide-react';
import type { Student } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

export default function ViewStudentPage({
  params,
}: {
  params: Promise<{ school: string; id: string }>;
}) {
  const { school: schoolCode, id: studentId } = use(params);
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [siblings, setSiblings] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, schoolCode]);

  useEffect(() => {
    if (!studentId || !schoolCode) return;
    fetch(`/api/students/${studentId}/siblings?school_code=${encodeURIComponent(schoolCode)}`)
      .then((res) => res.json())
      .then((json) => { if (json.data) setSiblings(json.data); })
      .catch(() => setSiblings([]));
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

  const formatDate = (dateString: unknown) => {
    const dateStr = getString(dateString);
    if (!dateStr) return 'Not provided';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const photoApiUrl = `/api/students/${studentId}/photo?school_code=${encodeURIComponent(schoolCode)}`;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
         
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
            {/* Student photo and name */}
            <div className="flex flex-col sm:flex-row items-center gap-4 pb-6 border-b border-gray-200">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-3xl font-bold relative shrink-0">
                <img
                  src={photoApiUrl}
                  alt={getString(student.student_name)}
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <span className="absolute inset-0 hidden w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800">
                  {getString(student.student_name).charAt(0).toUpperCase() || '?'}
                </span>
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold text-black">{getString(student.student_name) || 'N/A'}</h2>
                <p className="text-gray-600 mt-1">Admission: {getString(student.admission_no) || 'N/A'}</p>
              </div>
            </div>
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-bold text-black mb-6 flex items-center">
                <User size={24} className="mr-2" />
                Basic Information
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Admission Number</label>
                  <p className="text-lg font-medium text-black mt-1">{getString(student.admission_no) || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Student Name</label>
                  <p className="text-lg font-medium text-black mt-1">{getString(student.student_name) || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Class</label>
                  <p className="text-lg font-medium text-black mt-1">{getString(student.class) || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Section</label>
                  <p className="text-lg font-medium text-black mt-1">{getString(student.section) || 'N/A'}</p>
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
                  <p className="text-lg font-medium text-black mt-1">{getString(student.gender) || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Status</label>
                  {(() => {
                    const status = getString(student.status);
                    return (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                        status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : status === 'inactive'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {status || 'N/A'}
                      </span>
                    );
                  })()}
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Academic Year</label>
                  <p className="text-lg font-medium text-black mt-1">{getString(student.academic_year) || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Parent/Guardian Information */}
            {(() => {
              const parentName = getString(student.parent_name);
              const parentPhone = getString(student.parent_phone);
              const parentEmail = getString(student.parent_email);
              if (parentName || parentPhone || parentEmail) {
                return (
                  <div className="border-t border-gray-200 pt-8">
                    <h2 className="text-xl font-bold text-black mb-6 flex items-center">
                      <User size={24} className="mr-2" />
                      Parent/Guardian Information
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                      {parentName && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Parent Name</label>
                          <p className="text-lg font-medium text-black mt-1">{parentName}</p>
                        </div>
                      )}
                      {parentPhone && (
                        <div>
                          <label className="text-sm font-semibold text-gray-600 flex items-center">
                            <Phone size={16} className="mr-1" />
                            Parent Phone
                          </label>
                          <p className="text-lg font-medium text-black mt-1">{parentPhone}</p>
                        </div>
                      )}
                      {parentEmail && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-semibold text-gray-600 flex items-center">
                            <Mail size={16} className="mr-1" />
                            Parent Email
                          </label>
                          <p className="text-lg font-medium text-black mt-1">{parentEmail}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Siblings (matched by shared Father's/Mother's or Parent contact) */}
            {siblings.length > 0 && (
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-xl font-bold text-black mb-2 flex items-center">
                  <UsersRound size={24} className="mr-2" />
                  Siblings
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Matched by shared Father&apos;s contact, Mother&apos;s contact, or Parent/Guardian phone or email.
                </p>
                <ul className="space-y-2">
                  {siblings.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/${schoolCode}/students/${s.id}/view`)}
                        className="text-left w-full px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-between"
                      >
                        <span className="font-medium text-gray-900">{getString(s.student_name) || 'N/A'}</span>
                        <span className="text-sm text-gray-600">
                          {getString(s.class) || ''}{getString(s.section) ? ` · ${getString(s.section)}` : ''} · {getString(s.admission_no) || '—'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Address */}
            {(() => {
              const address = getString(student.address);
              if (address) {
                return (
                  <div className="border-t border-gray-200 pt-8">
                    <h2 className="text-xl font-bold text-black mb-6 flex items-center">
                      <MapPin size={24} className="mr-2" />
                      Address
                    </h2>
                    <p className="text-gray-700">{address}</p>
                  </div>
                );
              }
              return null;
            })()}

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
                    {formatDate(student.created_at)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-600">Last Updated</label>
                  <p className="text-lg font-medium text-black mt-1">
                    {formatDate(student.updated_at)}
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

