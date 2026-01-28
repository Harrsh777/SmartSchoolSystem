'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Award,
  Search,
  Eye,
  Download,
  ArrowLeft,
  FileImage,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import Image from 'next/image';

interface Certificate {
  id: string;
  student_id: string;
  student_name: string;
  student_class: string;
  student_section?: string;
  certificate_image_url: string;
  certificate_title?: string;
  submitted_at: string;
  submitted_by?: string;
}

export default function TeacherCertificatePage() {
  const [schoolCode, setSchoolCode] = useState<string | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStudents, setUploadStudents] = useState<
    Array<{ id: string; student_name: string; class: string; section?: string }>
  >([]);
  const [uploadStudentsLoading, setUploadStudentsLoading] = useState(false);
  const [uploadStudentsError, setUploadStudentsError] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      try {
        const teacherData = JSON.parse(storedTeacher);
        if (teacherData.school_code) {
          setSchoolCode(teacherData.school_code);
        }
      } catch (err) {
        console.error('Error parsing teacher session:', err);
      }
    }
  }, []);

  const loadUploadStudents = useCallback(async () => {
    if (!schoolCode || uploadStudentsLoading || uploadStudents.length > 0) return;

    try {
      setUploadStudentsLoading(true);
      setUploadStudentsError('');

      const storedTeacher = sessionStorage.getItem('teacher');
      if (!storedTeacher) {
        setUploadStudentsError('Teacher session not found. Please log in again.');
        return;
      }

      const teacherData = JSON.parse(storedTeacher);
      const params = new URLSearchParams({ school_code: teacherData.school_code });
      if (teacherData.id) params.append('teacher_id', teacherData.id);
      if (teacherData.staff_id) params.append('staff_id', teacherData.staff_id);

      const classesRes = await fetch(`/api/classes/teacher?${params.toString()}`);
      const classesJson = await classesRes.json();
      const classesData = classesRes.ok && classesJson.data
        ? (Array.isArray(classesJson.data) ? classesJson.data : [classesJson.data])
        : [];

      if (!classesData.length) {
        setUploadStudentsError('You are not assigned as class teacher to any class.');
        setUploadStudents([]);
        return;
      }

      // Fetch students for each class where this teacher is class teacher
      const allStudents: Array<{ id: string; student_name: string; class: string; section?: string }> = [];
      for (const cls of classesData) {
        const sp = new URLSearchParams({
          school_code: schoolCode,
          class: cls.class,
          status: 'active',
        });
        if (cls.section) sp.append('section', cls.section);
        const stuRes = await fetch(`/api/students?${sp.toString()}`);
        const stuJson = await stuRes.json();
        if (stuRes.ok && stuJson.data) {
          (stuJson.data as Array<{ id: string; student_name?: string; full_name?: string; class?: string; section?: string }>).forEach((s) => {
            if (!allStudents.some((st) => st.id === s.id)) {
              allStudents.push({
                id: s.id,
                student_name: s.student_name || s.full_name || 'Unknown',
                class: s.class ?? '',
                section: s.section ?? '',
              });
            }
          });
        }
      }

      allStudents.sort((a, b) => a.student_name.localeCompare(b.student_name));
      setUploadStudents(allStudents);
    } catch (err) {
      console.error('Error loading students for certificates:', err);
      setUploadStudentsError('Failed to load students for your class. Please try again.');
    } finally {
      setUploadStudentsLoading(false);
    }
  }, [schoolCode, uploadStudents.length, uploadStudentsLoading]);

  const fetchCertificates = useCallback(async () => {
    if (!schoolCode) return;
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/certificates/simple?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setCertificates(result.data);
      } else {
        setError(result.error || 'Failed to fetch certificates');
      }
    } catch (err) {
      console.error('Error fetching certificates:', err);
      setError('Failed to load certificates');
    } finally {
      setLoading(false);
    }
  }, [schoolCode]);

  useEffect(() => {
    if (schoolCode) {
      fetchCertificates();
    }
  }, [schoolCode, fetchCertificates]);

  const filteredCertificates = certificates.filter((cert) => {
    const q = searchQuery.toLowerCase();
    return (
      cert.student_name.toLowerCase().includes(q) ||
      cert.student_class.toLowerCase().includes(q) ||
      (cert.certificate_title || '').toLowerCase().includes(q)
    );
  });

  const stats = {
    total: certificates.length,
    thisMonth: certificates.filter((c) => {
      const certDate = new Date(c.submitted_at);
      const now = new Date();
      return certDate.getMonth() === now.getMonth() && certDate.getFullYear() === now.getFullYear();
    }).length,
    today: certificates.filter((c) => {
      const certDate = new Date(c.submitted_at).toISOString().split('T')[0];
      return certDate === new Date().toISOString().split('T')[0];
    }).length,
  };

  if (!schoolCode) {
    return (
      <div className="flex items-center justify-center py-16">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Award className="text-emerald-700" size={40} />
            <h1 className="text-2xl font-bold text-gray-900">Certificate Management</h1>
            <p className="text-sm text-gray-600">
              Unable to load your school details. Please ensure you are logged in as a teacher.
            </p>
            <Link href="/teacher/dashboard">
              <Button
                variant="outline"
                className="mt-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
              >
                <ArrowLeft size={16} className="mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-800">
              <Award className="text-white" size={28} />
            </div>
            Certificate Management
          </h1>
          <p className="text-gray-600">View and download certificates for your students</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => {
              setShowUploadModal(true);
              void loadUploadStudents();
            }}
          >
            Send Certificate
          </Button>
          <Link href="/teacher/dashboard">
            <Button
              variant="outline"
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            >
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm"
          >
            <div className="flex items-center gap-2">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Cards - dark green */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 bg-gradient-to-br from-emerald-700 to-emerald-800 text-white hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-default">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-2">Total Certificates</p>
                <p className="text-4xl font-bold">{stats.total}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <Award size={32} className="opacity-90" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-default">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-2">This Month</p>
                <p className="text-4xl font-bold">{stats.thisMonth}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <Calendar size={32} className="opacity-90" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-default">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-2">Today</p>
                <p className="text-4xl font-bold">{stats.today}</p>
              </div>
              <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                <CheckCircle2 size={32} className="opacity-90" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-4">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-emerald-700"
              size={20}
            />
            <Input
              type="text"
              placeholder="Search by student name, class, or certificate title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 border-2 border-gray-200 focus:border-emerald-600 rounded-xl transition-all"
            />
          </div>
        </Card>
      </motion.div>

      {/* Certificates List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-600 border-t-transparent"></div>
            <p className="text-emerald-700 font-medium">Loading certificates...</p>
          </div>
        </div>
      ) : filteredCertificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map((cert, index) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <Card className="p-5 hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-emerald-600/30 group">
                <div className="relative w-full h-52 mb-4 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-50 to-gray-100 border-2 border-emerald-100 group-hover:border-emerald-500 transition-colors">
                  {cert.certificate_image_url ? (
                    <Image
                      src={cert.certificate_image_url}
                      alt={cert.certificate_title || 'Certificate'}
                      fill
                      className="object-contain p-2"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileImage className="text-gray-400" size={48} />
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-gray-900">{cert.student_name}</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <p>
                        Class: {cert.student_class}
                        {cert.student_section ? `-${cert.student_section}` : ''}
                      </p>
                    </div>
                    {cert.certificate_title && (
                      <div className="flex items-center gap-2 mt-2">
                        <Award size={14} className="text-emerald-700" />
                        <p className="font-semibold text-emerald-700">
                          {cert.certificate_title}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <Calendar size={12} className="text-gray-400" />
                      <p className="text-gray-500">
                        {new Date(cert.submitted_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => window.open(cert.certificate_image_url, '_blank')}
                      className="flex-1 px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    >
                      <Eye size={16} />
                      View
                    </button>
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = cert.certificate_image_url;
                        link.download = `${cert.student_name}_certificate.jpg`;
                        link.click();
                      }}
                      className="flex-1 px-4 py-2.5 text-sm font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-all duration-300 flex items-center justify-center gap-2 border border-emerald-200"
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="p-16">
            <div className="text-center">
              <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 mb-6">
                <Award size={48} className="text-white" />
              </div>
              <p className="text-xl font-bold text-gray-900 mb-2">No certificates found</p>
              <p className="text-gray-600">
                Certificates issued by the school will appear here for your students.
              </p>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Upload certificate modal (for class teachers) */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center"
            onClick={() => setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Send Certificate</h2>
                  <p className="text-sm text-gray-500">
                    Upload a certificate image for a student in your class.
                  </p>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-sm font-medium"
                >
                  Close
                </button>
              </div>

              {uploadStudentsError && (
                <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {uploadStudentsError}
                </div>
              )}

              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!schoolCode) return;
                  if (!selectedStudentId) {
                    setUploadStudentsError('Please select a student.');
                    return;
                  }
                  if (!uploadFile) {
                    setUploadStudentsError('Please choose an image file for the certificate.');
                    return;
                  }
                  try {
                    setUploading(true);
                    setUploadStudentsError('');
                    const formData = new FormData();
                    formData.append('file', uploadFile);
                    formData.append('school_code', schoolCode);
                    formData.append('student_id', selectedStudentId);
                    if (uploadTitle.trim()) {
                      formData.append('certificate_title', uploadTitle.trim());
                    }
                    const res = await fetch('/api/certificates/simple/upload', {
                      method: 'POST',
                      body: formData,
                    });
                    const json = await res.json();
                    if (!res.ok) {
                      setUploadStudentsError(json.error || 'Failed to upload certificate');
                      return;
                    }
                    // Refresh list and close
                    await fetchCertificates();
                    setShowUploadModal(false);
                    setSelectedStudentId('');
                    setUploadTitle('');
                    setUploadFile(null);
                  } catch (err) {
                    console.error('Error uploading certificate:', err);
                    setUploadStudentsError('Unexpected error uploading certificate.');
                  } finally {
                    setUploading(false);
                  }
                }}
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Student
                  </label>
                  {uploadStudentsLoading ? (
                    <p className="text-sm text-gray-500">Loading students in your class...</p>
                  ) : uploadStudents.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No students found for your class teacher assignments.
                    </p>
                  ) : (
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">-- Select student --</option>
                      {uploadStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.student_name} ({s.class}
                          {s.section ? ` - ${s.section}` : ''})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Certificate Title (optional)
                  </label>
                  <Input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Best Performer, Sports Day Winner"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Certificate Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setUploadFile(file);
                    }}
                    className="w-full text-sm text-gray-700"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    JPG, PNG, or WEBP. Max 10MB.
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-gray-300 text-gray-700"
                    onClick={() => setShowUploadModal(false)}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={uploading || uploadStudentsLoading || uploadStudents.length === 0}
                  >
                    {uploading ? 'Uploading...' : 'Send Certificate'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

