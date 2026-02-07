'use client';

import { use, useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { ArrowLeft, Camera, Upload, X, Video } from 'lucide-react';

interface FormErrors {
  [key: string]: string;
}

export default function AddStudentPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [classes, setClasses] = useState<Array<{ id: string; class: string; section: string; academic_year: string }>>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [, setCreatedStudentId] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [formData, setFormData] = useState({
    // Required fields
    admission_no: '',
    student_name: '',
    class: '',
    section: '',
    academic_year: '',
    // Personal Details
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    email: '',
    student_contact: '',
    // Address
    address: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    // Academic
    roll_number: '',
    date_of_admission: '',
    last_class: '',
    last_school_name: '',
    last_school_percentage: '',
    last_school_result: '',
    medium: '',
    schooling_type: '',
    // Identification
    aadhaar_number: '',
    rfid: '',
    pen_no: '',
    apaar_no: '',
    sr_no: '',
    // Parent/Guardian - Father (First, Middle, Last)
    father_first_name: '',
    father_middle_name: '',
    father_last_name: '',
    father_occupation: '',
    father_contact: '',
    // Mother (First, Middle, Last)
    mother_first_name: '',
    mother_middle_name: '',
    mother_last_name: '',
    mother_occupation: '',
    mother_contact: '',
    // Guardian (First, Middle, Last)
    guardian_first_name: '',
    guardian_middle_name: '',
    guardian_last_name: '',
    parent_name: '',
    parent_phone: '',
    staff_relation: '',
    // Other
    religion: '',
    category: '',
    nationality: 'Indian',
    house: '',
    transport_type: '',
    rte: false,
    new_admission: true,
  });

  const ageAsOfToday = useMemo(() => {
    if (!formData.date_of_birth) return null;
    const dob = new Date(formData.date_of_birth);
    const today = new Date();
    if (dob > today) return null;
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }, [formData.date_of_birth]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoadingClasses(true);
        const res = await fetch(`/api/classes?school_code=${schoolCode}`);
        const result = await res.json();
        if (res.ok && result.data) {
          setClasses(result.data);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, [schoolCode]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.admission_no.trim()) {
      newErrors.admission_no = 'Admission number is required';
    }
    const fullNameFromParts = [formData.first_name, formData.middle_name, formData.last_name].filter(Boolean).join(' ').trim();
    if (!formData.student_name.trim() && !fullNameFromParts) {
      newErrors.student_name = 'Student name or First/Middle/Last name is required';
    }
    if (!formData.class.trim()) {
      newErrors.class = 'Class is required';
    }
    if (!formData.section.trim()) {
      newErrors.section = 'Section is required';
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation (10 digits)
    if (formData.student_contact && !/^\d{10}$/.test(formData.student_contact.replace(/\D/g, ''))) {
      newErrors.student_contact = 'Please enter a valid 10-digit phone number';
    }
    if (formData.father_contact && !/^\d{10}$/.test(formData.father_contact.replace(/\D/g, ''))) {
      newErrors.father_contact = 'Please enter a valid 10-digit phone number';
    }
    if (formData.mother_contact && !/^\d{10}$/.test(formData.mother_contact.replace(/\D/g, ''))) {
      newErrors.mother_contact = 'Please enter a valid 10-digit phone number';
    }
    if (formData.parent_phone && !/^\d{10}$/.test(formData.parent_phone.replace(/\D/g, ''))) {
      newErrors.parent_phone = 'Please enter a valid 10-digit phone number';
    }

    // Aadhaar validation (12 digits)
    if (formData.aadhaar_number && !/^\d{12}$/.test(formData.aadhaar_number.replace(/\D/g, ''))) {
      newErrors.aadhaar_number = 'Aadhaar number must be 12 digits';
    }

    // Pincode validation (6 digits)
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode.replace(/\D/g, ''))) {
      newErrors.pincode = 'Pincode must be 6 digits';
    }

    // Percentage validation (0-100)
    if (formData.last_school_percentage) {
      const percentage = parseFloat(formData.last_school_percentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        newErrors.last_school_percentage = 'Percentage must be between 0 and 100';
      }
    }

    // Date validations
    if (formData.date_of_birth) {
      const dob = new Date(formData.date_of_birth);
      const today = new Date();
      if (dob > today) {
        newErrors.date_of_birth = 'Date of birth cannot be in the future';
      }
    }
    if (formData.date_of_admission) {
      const doa = new Date(formData.date_of_admission);
      const today = new Date();
      if (doa > today) {
        newErrors.date_of_admission = 'Date of admission cannot be in the future';
      }
    }

    // Gender validation
    if (formData.gender && !['Male', 'Female', 'Other', 'male', 'female', 'other'].includes(formData.gender)) {
      newErrors.gender = 'Please select a valid gender';
    }

    // Blood group validation
    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (formData.blood_group && !validBloodGroups.includes(formData.blood_group)) {
      newErrors.blood_group = 'Please select a valid blood group';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Clean phone numbers (remove non-digits)
      const cleanPhone = (phone: string) => phone ? phone.replace(/\D/g, '') : '';
      const cleanAadhaar = (aadhaar: string) => aadhaar ? aadhaar.replace(/\D/g, '') : '';
      const cleanPincode = (pincode: string) => pincode ? pincode.replace(/\D/g, '') : '';

      const fullName = [formData.first_name, formData.middle_name, formData.last_name].filter(Boolean).join(' ').trim();
      const fatherName = [formData.father_first_name, formData.father_middle_name, formData.father_last_name].filter(Boolean).join(' ').trim();
      const motherName = [formData.mother_first_name, formData.mother_middle_name, formData.mother_last_name].filter(Boolean).join(' ').trim();
      const guardianName = [formData.guardian_first_name, formData.guardian_middle_name, formData.guardian_last_name].filter(Boolean).join(' ').trim();

      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          admission_no: formData.admission_no.trim(),
          student_name: formData.student_name.trim() || fullName || formData.admission_no,
          class: formData.class.trim(),
          section: formData.section.trim(),
          academic_year: formData.academic_year || new Date().getFullYear().toString(),
          first_name: formData.first_name.trim() || null,
          middle_name: formData.middle_name.trim() || null,
          last_name: formData.last_name.trim() || null,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          blood_group: formData.blood_group || null,
          email: formData.email.trim() || null,
          student_contact: cleanPhone(formData.student_contact) || null,
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          pincode: cleanPincode(formData.pincode) || null,
          landmark: formData.landmark.trim() || null,
          roll_number: formData.roll_number.trim() || null,
          date_of_admission: formData.date_of_admission || null,
          last_class: formData.last_class.trim() || null,
          last_school_name: formData.last_school_name.trim() || null,
          last_school_percentage: formData.last_school_percentage ? parseFloat(formData.last_school_percentage) : null,
          last_school_result: formData.last_school_result.trim() || null,
          medium: formData.medium.trim() || null,
          schooling_type: formData.schooling_type.trim() || null,
          aadhaar_number: cleanAadhaar(formData.aadhaar_number) || null,
          rfid: formData.rfid.trim() || null,
          pen_no: formData.pen_no.trim() || null,
          apaar_no: formData.apaar_no.trim() || null,
          sr_no: formData.sr_no.trim() || null,
          parent_name: guardianName || formData.parent_name.trim() || null,
          parent_phone: cleanPhone(formData.parent_phone) || null,
          father_name: fatherName || null,
          father_occupation: formData.father_occupation.trim() || null,
          father_contact: cleanPhone(formData.father_contact) || null,
          mother_name: motherName || null,
          mother_occupation: formData.mother_occupation.trim() || null,
          mother_contact: cleanPhone(formData.mother_contact) || null,
          staff_relation: formData.staff_relation.trim() || null,
          religion: formData.religion.trim() || null,
          category: formData.category.trim() || null,
          nationality: formData.nationality.trim() || 'Indian',
          house: formData.house.trim() || null,
          transport_type: formData.transport_type.trim() || null,
          rte: formData.rte,
          new_admission: formData.new_admission,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        const studentId = result.data?.id;
        if (studentId) {
          setCreatedStudentId(studentId);
          
          // If photo was selected, upload it
          if (photoFile) {
            await handlePhotoUpload(studentId);
          } else {
            router.push(`/dashboard/${schoolCode}/students`);
          }
        } else {
          router.push(`/dashboard/${schoolCode}/students`);
        }
      } else {
        alert(result.error || 'Failed to add student');
      }
    } catch (error) {
      console.error('Error adding student:', error);
      alert('Failed to add student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const uniqueClassNames = useMemo(
    () => Array.from(new Set(classes.map((c) => c.class).filter(Boolean))).sort(),
    [classes]
  );
  const sectionsForSelectedClass = useMemo(
    () =>
      formData.class
        ? Array.from(
            new Set(
              classes.filter((c) => c.class === formData.class).map((c) => c.section).filter((s) => s != null)
            )
          ).sort()
        : [],
    [classes, formData.class]
  );

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, class: value, section: '', academic_year: '' }));
  };
  const handleSectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const section = e.target.value;
    const match = classes.find((c) => c.class === formData.class && c.section === section);
    setFormData(prev => ({
      ...prev,
      section,
      academic_year: match?.academic_year || prev.academic_year,
    }));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(null);
    // Reset file input
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handlePhotoUpload = async (studentId: string) => {
    if (!photoFile || !studentId) return;

    setUploadingPhoto(true);
    try {
      // Get current admin's staff_id for authentication
      const storedStaff = sessionStorage.getItem('staff');
      const headers: Record<string, string> = {};
      if (storedStaff) {
        try {
          const staffData = JSON.parse(storedStaff);
          if (staffData.staff_id) {
            headers['x-staff-id'] = staffData.staff_id;
          }
        } catch {
          // Ignore parse errors
        }
      }

      const formData = new FormData();
      formData.append('file', photoFile);
      formData.append('school_code', schoolCode);
      formData.append('student_id', studentId);

      const response = await fetch('/api/students/photos/individual', {
        method: 'POST',
        headers,
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.data) {
        // Photo uploaded successfully, redirect to students page
        router.push(`/dashboard/${schoolCode}/students`);
      } else {
        // Student created but photo upload failed
        alert(result.error || 'Student created but photo upload failed');
        router.push(`/dashboard/${schoolCode}/students`);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      // Student created but photo upload failed
      alert('Student created but photo upload failed. You can upload the photo later by editing the student.');
      router.push(`/dashboard/${schoolCode}/students`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Camera: start/stop stream when modal opens/closes
  useEffect(() => {
    if (!showCamera) return;
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera error:', err);
        alert('Could not access camera. Please allow camera permission.');
        setShowCamera(false);
      }
    };
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      streamRef.current = null;
    };
  }, [showCamera]);

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(blob));
        setShowCamera(false);
      },
      'image/jpeg',
      0.92
    );
  };

  const closeCamera = () => {
    setShowCamera(false);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)]">
      {/* Compact Header */}
      <div className="flex items-center justify-between flex-shrink-0 py-2">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/${schoolCode}/students`)}
          >
            <ArrowLeft size={18} className="mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-black">Add Student</h1>
            <p className="text-sm text-gray-600">Add a new student to your school</p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 min-h-0 flex flex-col"
      >
        <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
            <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 space-y-6 py-2">
            {/* Profile Photo Section */}
            <div>
              <h2 className="text-xl font-bold text-black mb-4 pb-2 border-b border-gray-200">
                Profile Photo
              </h2>
              <div className="flex items-start gap-6">
                <div className="relative">
                  {photoPreview ? (
                    <div className="relative">
                      <Image
                        src={photoPreview}
                        alt="Profile preview"
                        width={128}
                        height={128}
                        className="w-32 h-32 rounded-lg object-cover border-2 border-gray-200"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                      <Camera className="text-gray-400" size={32} />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    id="photo-upload"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                  <label htmlFor="photo-upload">
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white mr-2"
                    >
                      <Upload size={18} className="mr-2" />
                      {photoPreview ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCamera(true)}
                    className="border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                  >
                    <Video size={18} className="mr-2" />
                    Take Photo
                  </Button>
                  <p className="text-sm text-gray-500 mt-2">
                    Upload image or take a live photo • JPG, PNG, GIF • Max 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Camera modal */}
            {showCamera && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Take Photo</h3>
                    <button type="button" onClick={closeCamera} className="p-1 rounded hover:bg-gray-100">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="p-4">
                    <div className="relative bg-black rounded-lg overflow-hidden aspect-[4/3]">
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <div className="flex gap-3 mt-4">
                      <Button type="button" onClick={handleCapturePhoto} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                        Capture
                      </Button>
                      <Button type="button" variant="outline" onClick={closeCamera}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Required Information */}
            <div>
              <h2 className="text-xl font-bold text-black mb-4 pb-2 border-b border-gray-200">
                Required Information
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Admission Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.admission_no}
                    onChange={(e) => handleChange('admission_no', e.target.value)}
                    error={errors.admission_no}
                    required
                    placeholder="e.g., STU001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Student Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.student_name}
                    onChange={(e) => handleChange('student_name', e.target.value)}
                    error={errors.student_name}
                    required
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Class <span className="text-red-500">*</span>
                  </label>
                  {classes.length > 0 ? (
                    <select
                      value={formData.class}
                      onChange={handleClassChange}
                      required
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black ${
                        errors.class ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={loadingClasses}
                    >
                      <option value="">Select Class</option>
                      {uniqueClassNames.map((cls) => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type="text"
                      value={formData.class}
                      onChange={(e) => handleChange('class', e.target.value)}
                      error={errors.class}
                      required
                      placeholder="Class e.g., 10"
                    />
                  )}
                  {errors.class && <p className="mt-1 text-sm text-red-500">{errors.class}</p>}
                  {loadingClasses && <p className="mt-1 text-xs text-gray-500">Loading classes...</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Section <span className="text-red-500">*</span>
                  </label>
                  {classes.length > 0 ? (
                    <select
                      value={formData.section}
                      onChange={handleSectionChange}
                      required
                      disabled={!formData.class || loadingClasses}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black ${
                        errors.section ? 'border-red-500' : 'border-gray-300'
                      } disabled:opacity-50`}
                    >
                      <option value="">Select Section</option>
                      {sectionsForSelectedClass.map((sec) => (
                        <option key={sec} value={sec}>{sec}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type="text"
                      value={formData.section}
                      onChange={(e) => handleChange('section', e.target.value)}
                      error={errors.section}
                      required
                      placeholder="Section e.g., A"
                    />
                  )}
                  {errors.section && <p className="mt-1 text-sm text-red-500">{errors.section}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Roll Number
                  </label>
                  <Input
                    type="text"
                    value={formData.roll_number}
                    onChange={(e) => handleChange('roll_number', e.target.value)}
                    error={errors.roll_number}
                    placeholder="Roll number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date of Admission
                  </label>
                  <Input
                    type="date"
                    value={formData.date_of_admission}
                    onChange={(e) => handleChange('date_of_admission', e.target.value)}
                    error={errors.date_of_admission}
                  />
                </div>
              </div>
            </div>

            {/* Personal Details */}
            <div>
              <h2 className="text-xl font-bold text-black mb-4 pb-2 border-b border-gray-200">
                Personal Details
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    First Name
                  </label>
                  <Input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Middle Name
                  </label>
                  <Input
                    type="text"
                    value={formData.middle_name}
                    onChange={(e) => handleChange('middle_name', e.target.value)}
                    placeholder="Middle name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Last Name
                  </label>
                  <Input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    placeholder="Last name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleChange('date_of_birth', e.target.value)}
                    error={errors.date_of_birth}
                  />
                </div>
                {ageAsOfToday !== null && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Age as of today
                    </label>
                    <p className="px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-700">
                      {ageAsOfToday} {ageAsOfToday === 1 ? 'year' : 'years'}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleChange('gender', e.target.value)}
                    className={`w-full px-4 py-2 border ${errors.gender ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-black`}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.gender && <p className="mt-1 text-sm text-red-500">{errors.gender}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Blood Group
                  </label>
                  <select
                    value={formData.blood_group}
                    onChange={(e) => handleChange('blood_group', e.target.value)}
                    className={`w-full px-4 py-2 border ${errors.blood_group ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-black`}
                  >
                    <option value="">Select blood group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                  {errors.blood_group && <p className="mt-1 text-sm text-red-500">{errors.blood_group}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    error={errors.email}
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Student Contact
                  </label>
                  <Input
                    type="tel"
                    value={formData.student_contact}
                    onChange={(e) => handleChange('student_contact', e.target.value)}
                    error={errors.student_contact}
                    placeholder="10-digit phone number"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h2 className="text-xl font-bold text-black mb-4 pb-2 border-b border-gray-200">
                Address
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Address
                  </label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Full address"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City
                  </label>
                  <Input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    State
                  </label>
                  <Input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="State"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pincode
                  </label>
                  <Input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => handleChange('pincode', e.target.value)}
                    error={errors.pincode}
                    placeholder="6-digit pincode"
                    maxLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Landmark
                  </label>
                  <Input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => handleChange('landmark', e.target.value)}
                    placeholder="Landmark (e.g. near temple)"
                  />
                </div>
              </div>
            </div>

            {/* Identification */}
            <div>
              <h2 className="text-xl font-bold text-black mb-4 pb-2 border-b border-gray-200">
                Identification
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    1. Aadhaar Number
                  </label>
                  <Input
                    type="text"
                    value={formData.aadhaar_number}
                    onChange={(e) => handleChange('aadhaar_number', e.target.value)}
                    error={errors.aadhaar_number}
                    placeholder="12-digit Aadhaar number"
                    maxLength={12}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    2. RFID
                  </label>
                  <Input
                    type="text"
                    value={formData.rfid}
                    onChange={(e) => handleChange('rfid', e.target.value)}
                    placeholder="RFID number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    3. PEN Number
                  </label>
                  <Input
                    type="text"
                    value={formData.pen_no}
                    onChange={(e) => handleChange('pen_no', e.target.value)}
                    placeholder="PEN number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    4. APAAR Number
                  </label>
                  <Input
                    type="text"
                    value={formData.apaar_no}
                    onChange={(e) => handleChange('apaar_no', e.target.value)}
                    placeholder="APAAR number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    5. Serial Number
                  </label>
                  <Input
                    type="text"
                    value={formData.sr_no}
                    onChange={(e) => handleChange('sr_no', e.target.value)}
                    placeholder="Serial number"
                  />
                </div>
              </div>
            </div>

            {/* Parent/Guardian Information */}
            <div>
              <h2 className="text-xl font-bold text-black mb-4 pb-2 border-b border-gray-200">
                Parent/Guardian Information
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Father — First, Middle, Last */}
                <div className="md:col-span-2 text-sm font-semibold text-gray-700 mb-1">Father</div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Father First Name</label>
                  <Input
                    type="text"
                    value={formData.father_first_name}
                    onChange={(e) => handleChange('father_first_name', e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Father Middle Name</label>
                  <Input
                    type="text"
                    value={formData.father_middle_name}
                    onChange={(e) => handleChange('father_middle_name', e.target.value)}
                    placeholder="Middle name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Father Last Name</label>
                  <Input
                    type="text"
                    value={formData.father_last_name}
                    onChange={(e) => handleChange('father_last_name', e.target.value)}
                    placeholder="Last name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Father Occupation</label>
                  <Input
                    type="text"
                    value={formData.father_occupation}
                    onChange={(e) => handleChange('father_occupation', e.target.value)}
                    placeholder="Occupation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Father Contact</label>
                  <Input
                    type="tel"
                    value={formData.father_contact}
                    onChange={(e) => handleChange('father_contact', e.target.value)}
                    error={errors.father_contact}
                    placeholder="10-digit phone"
                    maxLength={10}
                  />
                </div>

                {/* Mother — First, Middle, Last */}
                <div className="md:col-span-2 text-sm font-semibold text-gray-700 mb-1 mt-2">Mother</div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Mother First Name</label>
                  <Input
                    type="text"
                    value={formData.mother_first_name}
                    onChange={(e) => handleChange('mother_first_name', e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Mother Middle Name</label>
                  <Input
                    type="text"
                    value={formData.mother_middle_name}
                    onChange={(e) => handleChange('mother_middle_name', e.target.value)}
                    placeholder="Middle name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Mother Last Name</label>
                  <Input
                    type="text"
                    value={formData.mother_last_name}
                    onChange={(e) => handleChange('mother_last_name', e.target.value)}
                    placeholder="Last name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Mother Occupation</label>
                  <Input
                    type="text"
                    value={formData.mother_occupation}
                    onChange={(e) => handleChange('mother_occupation', e.target.value)}
                    placeholder="Occupation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Mother Contact</label>
                  <Input
                    type="tel"
                    value={formData.mother_contact}
                    onChange={(e) => handleChange('mother_contact', e.target.value)}
                    error={errors.mother_contact}
                    placeholder="10-digit phone"
                    maxLength={10}
                  />
                </div>

                {/* Guardian — First, Middle, Last */}
                <div className="md:col-span-2 text-sm font-semibold text-gray-700 mb-1 mt-2">Guardian</div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Guardian First Name</label>
                  <Input
                    type="text"
                    value={formData.guardian_first_name}
                    onChange={(e) => handleChange('guardian_first_name', e.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Guardian Middle Name</label>
                  <Input
                    type="text"
                    value={formData.guardian_middle_name}
                    onChange={(e) => handleChange('guardian_middle_name', e.target.value)}
                    placeholder="Middle name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Guardian Last Name</label>
                  <Input
                    type="text"
                    value={formData.guardian_last_name}
                    onChange={(e) => handleChange('guardian_last_name', e.target.value)}
                    placeholder="Last name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Parent/Guardian Phone</label>
                  <Input
                    type="tel"
                    value={formData.parent_phone}
                    onChange={(e) => handleChange('parent_phone', e.target.value)}
                    error={errors.parent_phone}
                    placeholder="10-digit phone"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Staff Relation</label>
                  <Input
                    type="text"
                    value={formData.staff_relation}
                    onChange={(e) => handleChange('staff_relation', e.target.value)}
                    placeholder="If related to staff"
                  />
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div>
              <h2 className="text-xl font-bold text-black mb-4 pb-2 border-b border-gray-200">
                Academic Information
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Last Class
                  </label>
                  <Input
                    type="text"
                    value={formData.last_class}
                    onChange={(e) => handleChange('last_class', e.target.value)}
                    placeholder="Previous class"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Last School Name
                  </label>
                  <Input
                    type="text"
                    value={formData.last_school_name}
                    onChange={(e) => handleChange('last_school_name', e.target.value)}
                    placeholder="Previous school name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Last School Percentage
                  </label>
                  <Input
                    type="number"
                    value={formData.last_school_percentage}
                    onChange={(e) => handleChange('last_school_percentage', e.target.value)}
                    error={errors.last_school_percentage}
                    placeholder="0-100"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Last School Result
                  </label>
                  <Input
                    type="text"
                    value={formData.last_school_result}
                    onChange={(e) => handleChange('last_school_result', e.target.value)}
                    placeholder="Result (e.g., Pass, Distinction)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Medium
                  </label>
                  <Input
                    type="text"
                    value={formData.medium}
                    onChange={(e) => handleChange('medium', e.target.value)}
                    placeholder="e.g., English, Hindi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Schooling Type
                  </label>
                  <Input
                    type="text"
                    value={formData.schooling_type}
                    onChange={(e) => handleChange('schooling_type', e.target.value)}
                    placeholder="e.g., Regular, Distance"
                  />
                </div>
              </div>
            </div>

            {/* Other Information */}
            <div>
              <h2 className="text-xl font-bold text-black mb-4 pb-2 border-b border-gray-200">
                Other Information
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Religion
                  </label>
                  <Input
                    type="text"
                    value={formData.religion}
                    onChange={(e) => handleChange('religion', e.target.value)}
                    placeholder="Religion"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category
                  </label>
                  <Input
                    type="text"
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    placeholder="Category"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nationality
                  </label>
                  <Input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => handleChange('nationality', e.target.value)}
                    placeholder="Nationality"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    House
                  </label>
                  <Input
                    type="text"
                    value={formData.house}
                    onChange={(e) => handleChange('house', e.target.value)}
                    placeholder="House name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Transport Type
                  </label>
                  <Input
                    type="text"
                    value={formData.transport_type}
                    onChange={(e) => handleChange('transport_type', e.target.value)}
                    placeholder="e.g., Bus, Private"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.rte}
                      onChange={(e) => handleChange('rte', e.target.checked)}
                      className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                    />
                    <span className="text-sm font-semibold text-gray-700">RTE (Right to Education)</span>
                  </label>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.new_admission}
                      onChange={(e) => handleChange('new_admission', e.target.checked)}
                      className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                    />
                    <span className="text-sm font-semibold text-gray-700">New Admission</span>
                  </label>
                </div>
              </div>
            </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200 flex-shrink-0 bg-white sticky bottom-0 z-10">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/${schoolCode}/students`)}
                disabled={loading || uploadingPhoto}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || uploadingPhoto}>
                {uploadingPhoto ? 'Uploading Photo...' : loading ? 'Adding...' : 'Add Student'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
