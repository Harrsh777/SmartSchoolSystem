'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { 
  ArrowLeft, 
  Save, 
  Edit2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap,
  FileText,
  Users,
  Award,
  Shield,
  X,
  Check
} from 'lucide-react';
import type { Student } from '@/lib/supabase';

interface FormErrors {
  [key: string]: string;
}

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ school: string; id: string }>;
}) {
  const { school: schoolCode, id: studentId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  
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
    academic_year: '',
    
    // Identification
    aadhaar_number: '',
    rfid: '',
    pen_no: '',
    apaar_no: '',
    sr_no: '',
    
    // Parent/Guardian
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
    status: 'active' as 'active' | 'inactive' | 'graduated' | 'transferred',
  });

  useEffect(() => {
    fetchStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, schoolCode]);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/students/${studentId}?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        const studentData = result.data;
        setStudent(studentData);
        
        // Populate form data
        setFormData({
          admission_no: studentData.admission_no || '',
          student_name: studentData.student_name || '',
          class: studentData.class || '',
          section: studentData.section || '',
          first_name: studentData.first_name || '',
          last_name: studentData.last_name || '',
          date_of_birth: studentData.date_of_birth || '',
          gender: studentData.gender || '',
          blood_group: studentData.blood_group || '',
          email: studentData.email || '',
          student_contact: studentData.student_contact || '',
          address: studentData.address || '',
          city: studentData.city || '',
          state: studentData.state || '',
          pincode: studentData.pincode || '',
          roll_number: studentData.roll_number || '',
          date_of_admission: studentData.date_of_admission || '',
          last_class: studentData.last_class || '',
          last_school_name: studentData.last_school_name || '',
          last_school_percentage: studentData.last_school_percentage?.toString() || '',
          last_school_result: studentData.last_school_result || '',
          medium: studentData.medium || '',
          schooling_type: studentData.schooling_type || '',
          academic_year: studentData.academic_year || '',
          aadhaar_number: studentData.aadhaar_number || '',
          rfid: studentData.rfid || '',
          pen_no: studentData.pen_no || '',
          apaar_no: studentData.apaar_no || '',
          sr_no: studentData.sr_no || '',
          father_name: studentData.father_name || '',
          father_occupation: studentData.father_occupation || '',
          father_contact: studentData.father_contact || '',
          mother_name: studentData.mother_name || '',
          mother_occupation: studentData.mother_occupation || '',
          mother_contact: studentData.mother_contact || '',
          staff_relation: studentData.staff_relation || '',
          religion: studentData.religion || '',
          category: studentData.category || '',
          nationality: studentData.nationality || 'Indian',
          house: studentData.house || '',
          transport_type: studentData.transport_type || '',
          rte: studentData.rte || false,
          new_admission: studentData.new_admission !== undefined ? studentData.new_admission : true,
          status: studentData.status || 'active',
        });
      } else {
        setError(result.error || 'Failed to load student');
      }
    } catch (err) {
      console.error('Error fetching student:', err);
      setError('Failed to load student information');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      setError('Please fix the errors before saving');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const updateData = {
        ...formData,
        last_school_percentage: formData.last_school_percentage ? parseFloat(formData.last_school_percentage) : null,
      };

      const response = await fetch(`/api/students/${studentId}?school_code=${schoolCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Student information updated successfully!');
        setEditing(false);
        fetchStudent(); // Refresh data
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to update student');
      }
    } catch (err) {
      console.error('Error saving student:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading student information...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600 text-lg">Student not found</p>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft size={18} className="mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const FieldSection = ({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) => (
    <Card className="p-6 mb-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Icon size={20} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="border-gray-300"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {student.student_name}
            </h1>
            <p className="text-gray-600 mt-1">Admission #: {student.admission_no}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {editing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  fetchStudent(); // Reset form
                }}
                className="border-gray-300"
              >
                <X size={18} className="mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
              >
                <Save size={18} className="mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setEditing(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
            >
              <Edit2 size={18} className="mr-2" />
              Edit Information
            </Button>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700"
        >
          <Check size={20} />
          <span>{success}</span>
        </motion.div>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700"
        >
          <X size={20} />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Student Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
          <div className="text-center mb-6">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-5xl font-bold mx-auto mb-4 shadow-lg">
              {student.student_name?.[0]?.toUpperCase() || '?'}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{student.student_name}</h2>
            <p className="text-gray-600">Admission #{student.admission_no}</p>
            <span className={`inline-block mt-3 px-4 py-1 rounded-full text-sm font-semibold ${
              student.status === 'active' 
                ? 'bg-green-100 text-green-700'
                : student.status === 'inactive' || student.status === 'deactivated'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {student.status?.toUpperCase() || 'ACTIVE'}
            </span>
          </div>
          <div className="space-y-3 pt-6 border-t border-indigo-200">
            <div className="flex items-center gap-3 text-gray-700">
              <GraduationCap size={18} className="text-indigo-600" />
              <span>Class {student.class} - Section {student.section}</span>
            </div>
            {student.roll_number && (
              <div className="flex items-center gap-3 text-gray-700">
                <User size={18} className="text-indigo-600" />
                <span>Roll Number: {student.roll_number}</span>
              </div>
            )}
            {student.email && (
              <div className="flex items-center gap-3 text-gray-700">
                <Mail size={18} className="text-indigo-600" />
                <span className="truncate">{student.email}</span>
              </div>
            )}
            {student.student_contact && (
              <div className="flex items-center gap-3 text-gray-700">
                <Phone size={18} className="text-indigo-600" />
                <span>{student.student_contact}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Required Information */}
          <FieldSection title="Required Information" icon={FileText}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Admission Number <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.admission_no}
                  onChange={(e) => handleChange('admission_no', e.target.value)}
                  error={errors.admission_no}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
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
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
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
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
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
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
            </div>
          </FieldSection>

          {/* Personal Details */}
          <FieldSection title="Personal Details" icon={User}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                <Input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                <Input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleChange('date_of_birth', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  disabled={!editing}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${!editing ? 'bg-gray-50' : ''}`}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Blood Group</label>
                <Input
                  type="text"
                  value={formData.blood_group}
                  onChange={(e) => handleChange('blood_group', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                  placeholder="e.g., A+, B+, O+"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Student Contact</label>
                <Input
                  type="tel"
                  value={formData.student_contact}
                  onChange={(e) => handleChange('student_contact', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
            </div>
          </FieldSection>

          {/* Address Information */}
          <FieldSection title="Address Information" icon={MapPin}>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                <Input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                <Input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pincode</label>
                <Input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
            </div>
          </FieldSection>

          {/* Academic Information */}
          <FieldSection title="Academic Information" icon={GraduationCap}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Roll Number</label>
                <Input
                  type="text"
                  value={formData.roll_number}
                  onChange={(e) => handleChange('roll_number', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Admission</label>
                <Input
                  type="date"
                  value={formData.date_of_admission}
                  onChange={(e) => handleChange('date_of_admission', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Year</label>
                <Input
                  type="text"
                  value={formData.academic_year}
                  onChange={(e) => handleChange('academic_year', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Last Class</label>
                <Input
                  type="text"
                  value={formData.last_class}
                  onChange={(e) => handleChange('last_class', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Last School Name</label>
                <Input
                  type="text"
                  value={formData.last_school_name}
                  onChange={(e) => handleChange('last_school_name', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Last School Percentage</label>
                <Input
                  type="number"
                  value={formData.last_school_percentage}
                  onChange={(e) => handleChange('last_school_percentage', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Last School Result</label>
                <Input
                  type="text"
                  value={formData.last_school_result}
                  onChange={(e) => handleChange('last_school_result', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Medium</label>
                <Input
                  type="text"
                  value={formData.medium}
                  onChange={(e) => handleChange('medium', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Schooling Type</label>
                <Input
                  type="text"
                  value={formData.schooling_type}
                  onChange={(e) => handleChange('schooling_type', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
            </div>
          </FieldSection>

          {/* Identification */}
          <FieldSection title="Identification" icon={Shield}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Aadhaar Number</label>
                <Input
                  type="text"
                  value={formData.aadhaar_number}
                  onChange={(e) => handleChange('aadhaar_number', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">RFID</label>
                <Input
                  type="text"
                  value={formData.rfid}
                  onChange={(e) => handleChange('rfid', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">PEN Number</label>
                <Input
                  type="text"
                  value={formData.pen_no}
                  onChange={(e) => handleChange('pen_no', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">APAAR Number</label>
                <Input
                  type="text"
                  value={formData.apaar_no}
                  onChange={(e) => handleChange('apaar_no', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">SR Number</label>
                <Input
                  type="text"
                  value={formData.sr_no}
                  onChange={(e) => handleChange('sr_no', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
            </div>
          </FieldSection>

          {/* Parent/Guardian Information */}
          <FieldSection title="Parent/Guardian Information" icon={Users}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Father Name</label>
                <Input
                  type="text"
                  value={formData.father_name}
                  onChange={(e) => handleChange('father_name', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Father Occupation</label>
                <Input
                  type="text"
                  value={formData.father_occupation}
                  onChange={(e) => handleChange('father_occupation', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Father Contact</label>
                <Input
                  type="tel"
                  value={formData.father_contact}
                  onChange={(e) => handleChange('father_contact', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mother Name</label>
                <Input
                  type="text"
                  value={formData.mother_name}
                  onChange={(e) => handleChange('mother_name', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mother Occupation</label>
                <Input
                  type="text"
                  value={formData.mother_occupation}
                  onChange={(e) => handleChange('mother_occupation', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mother Contact</label>
                <Input
                  type="tel"
                  value={formData.mother_contact}
                  onChange={(e) => handleChange('mother_contact', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Staff Relation</label>
                <Input
                  type="text"
                  value={formData.staff_relation}
                  onChange={(e) => handleChange('staff_relation', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
            </div>
          </FieldSection>

          {/* Other Information */}
          <FieldSection title="Other Information" icon={Award}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Religion</label>
                <Input
                  type="text"
                  value={formData.religion}
                  onChange={(e) => handleChange('religion', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <Input
                  type="text"
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nationality</label>
                <Input
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => handleChange('nationality', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">House</label>
                <Input
                  type="text"
                  value={formData.house}
                  onChange={(e) => handleChange('house', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Transport Type</label>
                <Input
                  type="text"
                  value={formData.transport_type}
                  onChange={(e) => handleChange('transport_type', e.target.value)}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  disabled={!editing}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${!editing ? 'bg-gray-50' : ''}`}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="graduated">Graduated</option>
                  <option value="transferred">Transferred</option>
                </select>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.rte}
                    onChange={(e) => handleChange('rte', e.target.checked)}
                    disabled={!editing}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
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
                    disabled={!editing}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">New Admission</span>
                </label>
              </div>
            </div>
          </FieldSection>
        </div>
      </div>
    </div>
  );
}

