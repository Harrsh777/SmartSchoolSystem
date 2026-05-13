'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Award,
  ArrowLeft,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  User,
  BookOpen,
  FileImage,
  Send,
  Info,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import Image from 'next/image';

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

export default function NewCertificatePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/classes?school_code=${schoolCode}`);
        const result = await response.json();
        if (response.ok && result.data) {
          setClasses(result.data);
        } else {
          setError('Failed to load classes');
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
        setError('Failed to load classes');
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [schoolCode]);

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
          } else {
            setError('Failed to load students');
          }
        } catch (err) {
          console.error('Error fetching students:', err);
          setError('Failed to load students');
        } finally {
          setLoading(false);
        }
      };
      fetchStudents();
    } else {
      setStudents([]);
      setSelectedStudent(null);
    }
  }, [selectedClassName, selectedSection, schoolCode]);

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
        setError('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size must be less than 10MB');
        return;
      }
      setCertificateImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setError('');
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!selectedStudent) {
      setError('Please select a student');
      return;
    }
    if (!certificateImage) {
      setError('Please select a certificate image');
      return;
    }

    try {
      setUploading(true);
      setError('');
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
        setSuccess('Certificate uploaded successfully!');
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
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push(`/dashboard/${schoolCode}/certificates/dashboard`);
        }, 2000);
      } else {
        setError(result.error || 'Failed to upload certificate');
      }
    } catch (err) {
      console.error('Error uploading certificate:', err);
      setError('Failed to upload certificate');
    } finally {
      setUploading(false);
    }
  };

  // Determine current step for progress indicator
  const getCurrentStep = () => {
    if (!selectedClassName || !selectedSection) return 1;
    if (!selectedStudent) return 2;
    if (!certificateImage) return 3;
    return 4;
  };

  const currentStep = getCurrentStep();
  const totalSteps = 4;

  const steps = [
    { id: 1, title: 'Select Class & Section', icon: BookOpen, completed: selectedClassName && selectedSection },
    { id: 2, title: 'Choose Student', icon: User, completed: selectedStudent !== null },
    { id: 3, title: 'Upload Certificate', icon: FileImage, completed: certificateImage !== null },
    { id: 4, title: 'Submit', icon: Send, completed: false },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] shadow-lg">
              <Award className="text-white" size={28} />
            </div>
            New Certificate
          </h1>
          <p className="text-gray-600">Upload a new certificate for a student</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowGuide(!showGuide)}
            className="border-[#5A7A95] dark:border-[#6B9BB8] text-[#5A7A95] dark:text-[#6B9BB8] hover:bg-[#5A7A95]/10 dark:hover:bg-[#6B9BB8]/10"
          >
            <HelpCircle size={18} className="mr-2" />
            {showGuide ? 'Hide Guide' : 'Show Guide'}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </motion.div>

      {/* Progress Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6 bg-gradient-to-r from-[#F0F5F9] to-white dark:from-[#1e293b] dark:to-[#0f172a] border-2 border-[#5A7A95]/20 dark:border-[#6B9BB8]/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8]">
                <Info className="text-white" size={18} />
              </div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Progress: Step {currentStep} of {totalSteps}
              </span>
            </div>
            <span className="text-sm font-bold text-[#5A7A95] dark:text-[#6B9BB8]">
              {Math.round((currentStep / totalSteps) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] rounded-full"
            />
          </div>
          <div className="flex items-center justify-between mt-4">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = step.completed;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                        isCompleted
                          ? 'bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] border-[#5A7A95] text-white shadow-lg'
                          : isActive
                          ? 'bg-[#5A7A95]/20 dark:bg-[#6B9BB8]/20 border-[#5A7A95] dark:border-[#6B9BB8] text-[#5A7A95] dark:text-[#6B9BB8]'
                          : 'bg-gray-100 dark:bg-[#2F4156] border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <StepIcon size={20} />
                      )}
                    </motion.div>
                    <span className={`mt-2 text-xs font-medium text-center ${
                      isActive || isCompleted
                        ? 'text-[#5A7A95] dark:text-[#6B9BB8]'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <ChevronRight 
                      className={`mx-2 ${isCompleted ? 'text-[#5A7A95] dark:text-[#6B9BB8]' : 'text-gray-300 dark:text-gray-600'}`} 
                      size={20} 
                    />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Step-by-Step Guide */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 bg-gradient-to-br from-[#5A7A95]/5 via-[#6B9BB8]/5 to-transparent border-2 border-[#5A7A95]/20 dark:border-[#6B9BB8]/20">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] flex-shrink-0">
                  <HelpCircle className="text-white" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    How to Upload a Certificate
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        1
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white mb-1">Select Class & Section</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Choose the class and section from the dropdown menus. This will help filter the students.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        2
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white mb-1">Choose a Student</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Select the student from the list who will receive this certificate. Click on a student card to select them.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        3
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white mb-1">Add Certificate Details</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Optionally add a certificate title (e.g., &quot;Academic Excellence Award&quot;). Then upload the certificate image file (JPG, PNG, max 10MB).
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        4
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white mb-1">Submit Certificate</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Review the preview and click &quot;Submit Certificate&quot; to upload. You&apos;ll be redirected to the dashboard once successful.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Form */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto space-y-6"
      >
        {/* Step 1: Class & Section Selection */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-[#5A7A95]/30 dark:hover:border-[#6B9BB8]/30 transition-all shadow-lg hover:shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-xl ${selectedClassName && selectedSection ? 'bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8]' : 'bg-gray-200 dark:bg-[#2F4156]'}`}>
                <BookOpen className={selectedClassName && selectedSection ? 'text-white' : 'text-gray-400'} size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Step 1: Select Class & Section</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Choose the class and section to filter students</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Class Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Select Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedClassName}
                  onChange={(e) => {
                    setSelectedClassName(e.target.value);
                    setSelectedSection('');
                    setSelectedStudent(null);
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] focus:border-transparent transition-all bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white hover:border-[#5A7A95]/50 dark:hover:border-[#6B9BB8]/50"
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
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Select Section <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => {
                    setSelectedSection(e.target.value);
                    setSelectedStudent(null);
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] focus:border-transparent transition-all bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white hover:border-[#5A7A95]/50 dark:hover:border-[#6B9BB8]/50"
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
          </Card>
        </motion.div>

        {/* Step 2: Students List */}
        {selectedClassName && selectedSection && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-[#5A7A95]/30 dark:hover:border-[#6B9BB8]/30 transition-all shadow-lg hover:shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-xl ${selectedStudent ? 'bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8]' : 'bg-gray-200 dark:bg-[#2F4156]'}`}>
                  <User className={selectedStudent ? 'text-white' : 'text-gray-400'} size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Step 2: Choose Student</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Select the student who will receive this certificate</p>
                </div>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#5A7A95] border-t-transparent"></div>
                    <p className="text-[#5A7A95] dark:text-[#6B9BB8] text-sm font-medium">Loading students...</p>
                  </div>
                </div>
              ) : students.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto custom-scrollbar">
                  {students.map((student) => (
                    <motion.button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-4 text-left border-2 rounded-xl transition-all duration-300 ${
                        selectedStudent?.id === student.id
                          ? 'border-[#5A7A95] dark:border-[#6B9BB8] bg-gradient-to-r from-[#5A7A95]/10 to-[#6B9BB8]/10 dark:from-[#5A7A95]/20 dark:to-[#6B9BB8]/20 shadow-md'
                          : 'border-gray-200 dark:border-gray-700 hover:border-[#5A7A95]/50 dark:hover:border-[#6B9BB8]/50 hover:bg-[#F0F5F9] dark:hover:bg-[#2F4156]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                          selectedStudent?.id === student.id
                            ? 'bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] text-white shadow-lg'
                            : 'bg-gray-200 dark:bg-[#2F4156] text-gray-600 dark:text-gray-400'
                        }`}>
                          <User size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {student.full_name || student.student_name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {student.admission_no && `Adm: ${student.admission_no}`}
                            {student.roll_number && ` | Roll: ${student.roll_number}`}
                          </p>
                        </div>
                        {selectedStudent?.id === student.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="p-1 rounded-full bg-[#5A7A95] dark:bg-[#6B9BB8]"
                          >
                            <CheckCircle2 className="text-white" size={20} />
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                  <User size={48} className="mx-auto mb-3 text-gray-400" />
                  <p className="font-medium">No students found for this class and section.</p>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Step 3 & 4: Certificate Upload */}
        {selectedStudent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-[#5A7A95]/30 dark:hover:border-[#6B9BB8]/30 transition-all shadow-lg hover:shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-2 rounded-xl ${certificateImage ? 'bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8]' : 'bg-gray-200 dark:bg-[#2F4156]'}`}>
                  <FileImage className={certificateImage ? 'text-white' : 'text-gray-400'} size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Step 3: Upload Certificate
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    For {selectedStudent.full_name || selectedStudent.student_name}
                  </p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Certificate Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Certificate Title (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g., Academic Excellence Award"
                    value={certificateTitle}
                    onChange={(e) => setCertificateTitle(e.target.value)}
                    className="border-2 border-gray-200 dark:border-gray-700 focus:border-[#5A7A95] dark:focus:border-[#6B9BB8] rounded-xl"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Certificate Image <span className="text-red-500">*</span>
                  </label>
                  {previewUrl ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative"
                    >
                      <div className="relative w-full h-80 rounded-xl overflow-hidden border-2 border-[#5A7A95] dark:border-[#6B9BB8] bg-gradient-to-br from-[#F0F5F9] to-gray-50 dark:from-[#1e293b] dark:to-[#0f172a] shadow-lg">
                        <Image
                          src={previewUrl}
                          alt="Certificate preview"
                          fill
                          className="object-contain p-4"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setCertificateImage(null);
                          setPreviewUrl(null);
                          URL.revokeObjectURL(previewUrl);
                        }}
                        className="mt-3 px-4 py-2 text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center gap-2 border border-red-200 dark:border-red-800"
                      >
                        <X size={16} />
                        Remove Image
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-12 text-center bg-gradient-to-br from-[#F0F5F9] to-white dark:from-[#1e293b] dark:to-[#0f172a] hover:border-[#5A7A95] dark:hover:border-[#6B9BB8] transition-all cursor-pointer"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        id="certificate-upload"
                      />
                      <label
                        htmlFor="certificate-upload"
                        className="cursor-pointer flex flex-col items-center gap-3"
                      >
                        <div className="p-4 rounded-full bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8]">
                          <Upload className="text-white" size={32} />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Click to upload certificate image
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Max size: 10MB</span>
                      </label>
                    </motion.div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Send size={16} />
                      <span>Step 4: Submit your certificate</span>
                    </div>
                    <Button
                      onClick={handleSubmit}
                      disabled={!certificateImage || uploading}
                      className="bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] hover:from-[#567C8D] hover:to-[#5A7A95] text-white px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Send size={18} className="mr-2" />
                          Submit Certificate
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
