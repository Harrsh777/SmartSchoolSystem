'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Award,
  Plus,
  Search,
  Eye,
  Download,
  ArrowLeft,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  FileImage,
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

interface Student {
  id: string;
  student_name: string;
  full_name?: string;
  admission_no?: string;
  roll_number?: string;
  class: string;
  section?: string;
}

interface Class {
  id: string;
  class: string;
  section?: string;
  academic_year: string;
}

export default function CertificateManagementPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [activeModule, setActiveModule] = useState<'dashboard' | 'new'>('dashboard');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Check URL hash on mount and when it changes
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#new') {
        setActiveModule('new');
      } else {
        setActiveModule('dashboard');
      }
    };

    // Check initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Fetch certificates
  const fetchCertificates = useCallback(async () => {
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
    if (activeModule === 'dashboard') {
      fetchCertificates();
    }
  }, [schoolCode, activeModule, fetchCertificates]);

  const filteredCertificates = certificates.filter((cert) => {
    const matchesSearch = 
      cert.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.student_class.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cert.certificate_title || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    total: certificates.length,
    thisMonth: certificates.filter(c => {
      const certDate = new Date(c.submitted_at);
      const now = new Date();
      return certDate.getMonth() === now.getMonth() && certDate.getFullYear() === now.getFullYear();
    }).length,
    today: certificates.filter(c => {
      const certDate = new Date(c.submitted_at).toISOString().split('T')[0];
      return certDate === new Date().toISOString().split('T')[0];
    }).length,
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Award className="text-orange-500" size={32} />
            Certificate Management
          </h1>
          <p className="text-gray-600">Manage and track student certificates</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg shadow-sm"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-green-600" size={20} />
              <p className="text-green-800 font-medium">{success}</p>
            </div>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-600" size={20} />
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Module Tabs */}
      <Card className="p-0">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveModule('dashboard')}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors border-b-2 ${
                activeModule === 'dashboard'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Award size={18} />
              Certificate Dashboard
            </button>
            <button
              onClick={() => setActiveModule('new')}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors border-b-2 ${
                activeModule === 'new'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Plus size={18} />
              New Certificate
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeModule === 'dashboard' && (
            <CertificateDashboard
              certificates={filteredCertificates}
              loading={loading}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              stats={stats}
            />
          )}

          {activeModule === 'new' && (
            <NewCertificate
              schoolCode={schoolCode}
              onSuccess={(message) => {
                setSuccess(message);
                setActiveModule('dashboard');
                setTimeout(() => setSuccess(''), 3000);
              }}
              onError={(message) => {
                setError(message);
                setTimeout(() => setError(''), 5000);
              }}
            />
          )}
        </div>
      </Card>
    </div>
  );
}

// Certificate Dashboard Component
function CertificateDashboard({
  certificates,
  loading,
  searchQuery,
  setSearchQuery,
  stats,
}: {
  certificates: Certificate[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  stats: { total: number; thisMonth: number; today: number };
}) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Total Certificates</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
            <Award size={32} className="opacity-80" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm mb-1">This Month</p>
              <p className="text-3xl font-bold">{stats.thisMonth}</p>
            </div>
            <Calendar size={32} className="opacity-80" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">Today</p>
              <p className="text-3xl font-bold">{stats.today}</p>
            </div>
            <CheckCircle2 size={32} className="opacity-80" />
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            type="text"
            placeholder="Search by student name, class, or certificate title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Certificates List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : certificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map((cert) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-4 hover:shadow-lg transition-shadow">
                <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden bg-gray-100">
                  {cert.certificate_image_url ? (
                    <Image
                      src={cert.certificate_image_url}
                      alt={cert.certificate_title || 'Certificate'}
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileImage className="text-gray-400" size={48} />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">{cert.student_name}</h3>
                  <div className="text-sm text-gray-600">
                    <p>Class: {cert.student_class}{cert.student_section ? `-${cert.student_section}` : ''}</p>
                    {cert.certificate_title && (
                      <p className="mt-1 font-medium">{cert.certificate_title}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Submitted: {new Date(cert.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => window.open(cert.certificate_image_url, '_blank')}
                      className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
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
                      className="flex-1 px-3 py-2 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
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
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <Award size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-semibold mb-2">No certificates found</p>
            <p>Start by creating a new certificate.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// New Certificate Component
function NewCertificate({
  schoolCode,
  onSuccess,
  onError,
}: {
  schoolCode: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [certificateImage, setCertificateImage] = useState<File | null>(null);
  const [certificateTitle, setCertificateTitle] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/classes?school_code=${schoolCode}`);
        const result = await response.json();
        if (response.ok && result.data) {
          setClasses(result.data);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
        onError('Failed to load classes');
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [schoolCode, onError]);

  // Fetch students when class and section are selected
  useEffect(() => {
    if (selectedClassName && selectedSection) {
      const fetchStudents = async () => {
        try {
          setLoading(true);
          const response = await fetch(
            `/api/students?school_code=${schoolCode}&class=${selectedClassName}&section=${selectedSection}`
          );
          const result = await response.json();
          if (response.ok && result.data) {
            setStudents(result.data);
          }
        } catch (err) {
          console.error('Error fetching students:', err);
          onError('Failed to load students');
        } finally {
          setLoading(false);
        }
      };
      fetchStudents();
    } else {
      setStudents([]);
      setSelectedStudent(null);
    }
  }, [selectedClassName, selectedSection, schoolCode, onError]);

  // Get unique class names and sections
  const uniqueClasses = Array.from(new Set(classes.map(c => c.class))).sort();
  const availableSections = selectedClassName
    ? Array.from(new Set(classes.filter(c => c.class === selectedClassName && c.section).map(c => c.section).filter(Boolean))).sort()
    : [];

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        onError('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        onError('Image size must be less than 10MB');
        return;
      }
      setCertificateImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedStudent) {
      onError('Please select a student');
      return;
    }
    if (!certificateImage) {
      onError('Please select a certificate image');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', certificateImage);
      formData.append('school_code', schoolCode);
      formData.append('student_id', selectedStudent.id);
      formData.append('certificate_title', certificateTitle);

      const response = await fetch('/api/certificates/simple/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        onSuccess('Certificate uploaded successfully!');
        // Reset form
        setSelectedClassName('');
        setSelectedSection('');
        setSelectedStudent(null);
        setCertificateImage(null);
        setCertificateTitle('');
        setPreviewUrl(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
      } else {
        onError(result.error || 'Failed to upload certificate');
      }
    } catch (err) {
      console.error('Error uploading certificate:', err);
      onError('Failed to upload certificate');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Class Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Class <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedClassName}
            onChange={(e) => {
              setSelectedClassName(e.target.value);
              setSelectedSection('');
              setSelectedStudent(null);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            disabled={loading}
          >
            <option value="">Select a class</option>
            {uniqueClasses.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
        </div>

        {/* Section Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Section <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedSection}
            onChange={(e) => {
              setSelectedSection(e.target.value);
              setSelectedStudent(null);
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            disabled={!selectedClassName || loading}
          >
            <option value="">Select a section</option>
            {availableSections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students List */}
      {selectedClassName && selectedSection && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Student</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : students.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {students.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={`p-4 text-left border-2 rounded-lg transition-colors ${
                    selectedStudent?.id === student.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedStudent?.id === student.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      <User size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {student.full_name || student.student_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {student.admission_no && `Adm: ${student.admission_no}`}
                        {student.roll_number && ` | Roll: ${student.roll_number}`}
                      </p>
                    </div>
                    {selectedStudent?.id === student.id && (
                      <CheckCircle2 className="text-orange-500" size={20} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>No students found for this class and section.</p>
            </div>
          )}
        </Card>
      )}

      {/* Certificate Upload */}
      {selectedStudent && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Upload Certificate for {selectedStudent.full_name || selectedStudent.student_name}
          </h3>
          
          <div className="space-y-4">
            {/* Certificate Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Certificate Title (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g., Academic Excellence Award"
                value={certificateTitle}
                onChange={(e) => setCertificateTitle(e.target.value)}
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Certificate Image <span className="text-red-500">*</span>
              </label>
              {previewUrl ? (
                <div className="relative">
                  <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-50">
                    <Image
                      src={previewUrl}
                      alt="Certificate preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setCertificateImage(null);
                      setPreviewUrl(null);
                      URL.revokeObjectURL(previewUrl);
                    }}
                    className="mt-2 px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                  >
                    <X size={16} />
                    Remove Image
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="certificate-upload"
                  />
                  <label
                    htmlFor="certificate-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="text-gray-400" size={32} />
                    <span className="text-sm text-gray-600">
                      Click to upload certificate image
                    </span>
                    <span className="text-xs text-gray-500">Max size: 10MB</span>
                  </label>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSubmit}
                disabled={!certificateImage || uploading}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} className="mr-2" />
                    Submit Certificate
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
