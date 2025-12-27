'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { ArrowLeft } from 'lucide-react';

interface FormErrors {
  [key: string]: string;
}

export default function AddStaffPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    // Required fields
    staff_id: '',
    full_name: '',
    role: '',
    department: '',
    designation: '',
    phone: '',
    date_of_joining: '',
    
    // Personal Information
    dob: '',
    gender: '',
    adhar_no: '',
    blood_group: '',
    religion: '',
    category: '',
    nationality: 'Indian',
    
    // Contact Information
    email: '',
    contact1: '',
    contact2: '',
    address: '',
    
    // Employment Information
    employee_code: '',
    employment_type: '',
    dop: '',
    short_code: '',
    rfid: '',
    uuid: '',
    
    // Educational Information
    qualification: '',
    experience_years: '',
    alma_mater: '',
    major: '',
    
    // Additional Information
    website: '',
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.staff_id.trim()) {
      newErrors.staff_id = 'Staff ID is required';
    }
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    if (!formData.role.trim()) {
      newErrors.role = 'Role is required';
    }
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }
    if (!formData.designation.trim()) {
      newErrors.designation = 'Designation is required';
    }
    if (!formData.phone.trim() && !formData.contact1.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.date_of_joining) {
      newErrors.date_of_joining = 'Date of joining is required';
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation (10 digits)
    const phoneToValidate = formData.phone || formData.contact1;
    if (phoneToValidate && !/^\d{10}$/.test(phoneToValidate.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    if (formData.contact2 && !/^\d{10}$/.test(formData.contact2.replace(/\D/g, ''))) {
      newErrors.contact2 = 'Please enter a valid 10-digit phone number';
    }

    // Aadhaar validation (12 digits)
    if (formData.adhar_no && !/^\d{12}$/.test(formData.adhar_no.replace(/\D/g, ''))) {
      newErrors.adhar_no = 'Aadhaar number must be 12 digits';
    }

    // Experience validation
    if (formData.experience_years) {
      const experience = parseFloat(formData.experience_years);
      if (isNaN(experience) || experience < 0) {
        newErrors.experience_years = 'Experience must be a positive number';
      }
    }

    // Date validations
    if (formData.dob) {
      const dob = new Date(formData.dob);
      const today = new Date();
      if (dob > today) {
        newErrors.dob = 'Date of birth cannot be in the future';
      }
    }
    if (formData.date_of_joining) {
      const doj = new Date(formData.date_of_joining);
      const today = new Date();
      if (doj > today) {
        newErrors.date_of_joining = 'Date of joining cannot be in the future';
      }
    }
    if (formData.dop) {
      const dop = new Date(formData.dop);
      const today = new Date();
      if (dop > today) {
        newErrors.dop = 'Date of promotion cannot be in the future';
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
      // Clean phone numbers and aadhaar
      const cleanPhone = (phone: string) => phone ? phone.replace(/\D/g, '') : '';
      const cleanAadhaar = (aadhaar: string) => aadhaar ? aadhaar.replace(/\D/g, '') : '';

      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          staff_id: formData.staff_id.trim(),
          full_name: formData.full_name.trim(),
          role: formData.role.trim(),
          department: formData.department.trim(),
          designation: formData.designation.trim(),
          phone: cleanPhone(formData.phone || formData.contact1) || null,
          date_of_joining: formData.date_of_joining,
          dob: formData.dob || null,
          gender: formData.gender || null,
          adhar_no: cleanAadhaar(formData.adhar_no) || null,
          blood_group: formData.blood_group || null,
          religion: formData.religion.trim() || null,
          category: formData.category.trim() || null,
          nationality: formData.nationality.trim() || 'Indian',
          email: formData.email.trim() || null,
          contact1: cleanPhone(formData.contact1 || formData.phone) || null,
          contact2: cleanPhone(formData.contact2) || null,
          address: formData.address.trim() || null,
          employee_code: formData.employee_code.trim() || formData.staff_id.trim() || null,
          employment_type: formData.employment_type.trim() || null,
          dop: formData.dop || null,
          short_code: formData.short_code.trim() || null,
          rfid: formData.rfid.trim() || null,
          uuid: formData.uuid.trim() || null,
          qualification: formData.qualification.trim() || null,
          experience_years: formData.experience_years ? parseFloat(formData.experience_years) : null,
          alma_mater: formData.alma_mater.trim() || null,
          major: formData.major.trim() || null,
          website: formData.website.trim() || null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        router.push(`/dashboard/${schoolCode}/staff`);
      } else {
        alert(result.error || 'Failed to add staff');
      }
    } catch (error) {
      console.error('Error adding staff:', error);
      alert('Failed to add staff. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch subjects for designation dropdown
    const fetchSubjects = async () => {
      try {
        const response = await fetch(`/api/timetable/subjects?school_code=${schoolCode}`);
        const result = await response.json();
        if (response.ok && result.data) {
          setSubjects(result.data);
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
      }
    };
    fetchSubjects();
  }, [schoolCode]);

  const handleChange = (field: string, value: string) => {
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

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/staff`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Add Staff</h1>
            <p className="text-gray-600">Add a new staff member to your school</p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 min-h-0"
      >
        <Card className="flex flex-col max-h-[calc(100vh-100px)] overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto pr-2 space-y-8 min-h-0">
              {/* Required Information */}
              <div>
                <h2 className="text-xl font-bold text-black mb-4 pb-2 border-b border-gray-200">
                  Required Information
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Staff ID <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.staff_id}
                      onChange={(e) => handleChange('staff_id', e.target.value)}
                      error={errors.staff_id}
                      required
                      placeholder="e.g., STF001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => handleChange('full_name', e.target.value)}
                      error={errors.full_name}
                      required
                      placeholder="Full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.role}
                      onChange={(e) => handleChange('role', e.target.value)}
                      error={errors.role}
                      required
                      placeholder="e.g., Teacher, Principal"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.department}
                      onChange={(e) => handleChange('department', e.target.value)}
                      error={errors.department}
                      required
                      placeholder="e.g., Mathematics, Administration"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Designation (Subject) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.designation}
                      onChange={(e) => handleChange('designation', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${
                        errors.designation ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    >
                      <option value="">Select a subject</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.name}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                    {errors.designation && (
                      <p className="mt-1 text-sm text-red-500">{errors.designation}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      error={errors.phone}
                      required
                      placeholder="10-digit phone number"
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date of Joining <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={formData.date_of_joining}
                      onChange={(e) => handleChange('date_of_joining', e.target.value)}
                      error={errors.date_of_joining}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Employment Type
                    </label>
                    <select
                      value={formData.employment_type}
                      onChange={(e) => handleChange('employment_type', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="">Select type</option>
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Temporary">Temporary</option>
                    </select>
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
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => handleChange('dob', e.target.value)}
                      error={errors.dob}
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
                      Aadhaar Number
                    </label>
                    <Input
                      type="text"
                      value={formData.adhar_no}
                      onChange={(e) => handleChange('adhar_no', e.target.value)}
                      error={errors.adhar_no}
                      placeholder="12-digit Aadhaar number"
                      maxLength={12}
                    />
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
                      placeholder="e.g., General, SC, ST, OBC"
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
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h2 className="text-xl font-bold text-black mb-4 pb-2 border-b border-gray-200">
                  Contact Information
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
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
                      Primary Contact
                    </label>
                    <Input
                      type="tel"
                      value={formData.contact1}
                      onChange={(e) => handleChange('contact1', e.target.value)}
                      placeholder="10-digit phone number"
                      maxLength={10}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Secondary Contact
                    </label>
                    <Input
                      type="tel"
                      value={formData.contact2}
                      onChange={(e) => handleChange('contact2', e.target.value)}
                      error={errors.contact2}
                      placeholder="10-digit phone number"
                      maxLength={10}
                    />
                  </div>

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
                </div>
              </div>

              {/* Employment Information */}
              <div>
                <h2 className="text-xl font-bold text-black mb-4 pb-2 border-b border-gray-200">
                  Employment Information
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Employee Code
                    </label>
                    <Input
                      type="text"
                      value={formData.employee_code}
                      onChange={(e) => handleChange('employee_code', e.target.value)}
                      placeholder="Employee code (defaults to Staff ID)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date of Promotion
                    </label>
                    <Input
                      type="date"
                      value={formData.dop}
                      onChange={(e) => handleChange('dop', e.target.value)}
                      error={errors.dop}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Short Code
                    </label>
                    <Input
                      type="text"
                      value={formData.short_code}
                      onChange={(e) => handleChange('short_code', e.target.value)}
                      placeholder="Short identifier"
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
                      placeholder="RFID card number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      UUID
                    </label>
                    <Input
                      type="text"
                      value={formData.uuid}
                      onChange={(e) => handleChange('uuid', e.target.value)}
                      placeholder="Additional UUID identifier"
                    />
                  </div>
                </div>
              </div>

              {/* Educational Information */}
              <div>
                <h2 className="text-xl font-bold text-black mb-4 pb-2 border-b border-gray-200">
                  Educational Information
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Qualification
                    </label>
                    <Input
                      type="text"
                      value={formData.qualification}
                      onChange={(e) => handleChange('qualification', e.target.value)}
                      placeholder="e.g., B.Ed, M.Sc"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Experience (Years)
                    </label>
                    <Input
                      type="number"
                      value={formData.experience_years}
                      onChange={(e) => handleChange('experience_years', e.target.value)}
                      error={errors.experience_years}
                      placeholder="Years of experience"
                      min="0"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Alma Mater
                    </label>
                    <Input
                      type="text"
                      value={formData.alma_mater}
                      onChange={(e) => handleChange('alma_mater', e.target.value)}
                      placeholder="University/Institution"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Major/Specialization
                    </label>
                    <Input
                      type="text"
                      value={formData.major}
                      onChange={(e) => handleChange('major', e.target.value)}
                      placeholder="Subject specialization"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Website
                    </label>
                    <Input
                      type="url"
                      value={formData.website}
                      onChange={(e) => handleChange('website', e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/${schoolCode}/staff`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Staff'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

