'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { ArrowLeft, Camera, Upload, X } from 'lucide-react';

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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [, setCreatedStudentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    // Required fields
    admission_no: '',
    student_name: '',
    class: '',
    section: '',
    
    // Personal Details
    first_name: '',
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
    
    // Parent/Guardian
    parent_name: '',
    parent_phone: '',
    father_name: '',
    father_occupation: '',
    father_contact: '',
    mother_name: '',
    mother_occupation: '',
    mother_contact: '',
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

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.admission_no.trim()) {
      newErrors.admission_no = 'Admission number is required';
    }
    if (!formData.student_name.trim()) {
      newErrors.student_name = 'Student name is required';
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

      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          admission_no: formData.admission_no.trim(),
          student_name: formData.student_name.trim(),
          class: formData.class.trim(),
          section: formData.section.trim(),
          first_name: formData.first_name.trim() || null,
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
          parent_name: formData.parent_name.trim() || null,
          parent_phone: cleanPhone(formData.parent_phone) || null,
          father_name: formData.father_name.trim() || null,
          father_occupation: formData.father_occupation.trim() || null,
          father_contact: cleanPhone(formData.father_contact) || null,
          mother_name: formData.mother_name.trim() || null,
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

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/students`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Add Student</h1>
            <p className="text-gray-600">Add a new student to your school</p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="flex flex-col overflow-hidden" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 space-y-8 pb-4" style={{ maxHeight: 'calc(100vh - 260px)' }}>
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
                      className="cursor-pointer border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
                    >
                      <Upload size={18} className="mr-2" />
                      {photoPreview ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                  </label>
                  <p className="text-sm text-gray-500 mt-2">
                    Supported: JPG, PNG, GIF • Max 5MB
                  </p>
                </div>
              </div>
            </div>

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
                  <Input
                    type="text"
                    value={formData.class}
                    onChange={(e) => handleChange('class', e.target.value)}
                    error={errors.class}
                    required
                    placeholder="e.g., 10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Section <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.section}
                    onChange={(e) => handleChange('section', e.target.value)}
                    error={errors.section}
                    required
                    placeholder="e.g., A"
                  />
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
                    Aadhaar Number
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
                    RFID
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
                    PEN Number
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
                    APAAR Number
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
                    Serial Number
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
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Parent/Guardian Name
                  </label>
                  <Input
                    type="text"
                    value={formData.parent_name}
                    onChange={(e) => handleChange('parent_name', e.target.value)}
                    placeholder="Parent/Guardian name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Parent Phone
                  </label>
                  <Input
                    type="tel"
                    value={formData.parent_phone}
                    onChange={(e) => handleChange('parent_phone', e.target.value)}
                    error={errors.parent_phone}
                    placeholder="10-digit phone number"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Father Name
                  </label>
                  <Input
                    type="text"
                    value={formData.father_name}
                    onChange={(e) => handleChange('father_name', e.target.value)}
                    placeholder="Father's name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Father Occupation
                  </label>
                  <Input
                    type="text"
                    value={formData.father_occupation}
                    onChange={(e) => handleChange('father_occupation', e.target.value)}
                    placeholder="Father's occupation"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Father Contact
                  </label>
                  <Input
                    type="tel"
                    value={formData.father_contact}
                    onChange={(e) => handleChange('father_contact', e.target.value)}
                    error={errors.father_contact}
                    placeholder="10-digit phone number"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mother Name
                  </label>
                  <Input
                    type="text"
                    value={formData.mother_name}
                    onChange={(e) => handleChange('mother_name', e.target.value)}
                    placeholder="Mother's name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mother Occupation
                  </label>
                  <Input
                    type="text"
                    value={formData.mother_occupation}
                    onChange={(e) => handleChange('mother_occupation', e.target.value)}
                    placeholder="Mother's occupation"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mother Contact
                  </label>
                  <Input
                    type="tel"
                    value={formData.mother_contact}
                    onChange={(e) => handleChange('mother_contact', e.target.value)}
                    error={errors.mother_contact}
                    placeholder="10-digit phone number"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Staff Relation
                  </label>
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
