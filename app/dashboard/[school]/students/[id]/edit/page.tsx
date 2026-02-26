'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, Camera, Loader2, X } from 'lucide-react';
import type { Student } from '@/lib/supabase';

export default function EditStudentPage({
  params,
}: {
  params: Promise<{ school: string; id: string }>;
}) {
  const { school: schoolCode, id: studentId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const toDateInput = (v: unknown) => {
    if (!v) return '';
    const s = typeof v === 'string' ? v : String(v);
    return s.slice(0, 10);
  };

  const [formData, setFormData] = useState<Record<string, string>>({
    admission_no: '',
    student_name: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    class: '',
    section: '',
    date_of_birth: '',
    gender: '',
    status: 'active',
    academic_year: '',
    roll_number: '',
    email: '',
    student_contact: '',
    blood_group: '',
    father_name: '',
    father_occupation: '',
    father_contact: '',
    mother_name: '',
    mother_occupation: '',
    mother_contact: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    date_of_admission: '',
    last_class: '',
    last_school_name: '',
    last_school_percentage: '',
    last_school_result: '',
    medium: '',
    schooling_type: '',
    religion: '',
    category: '',
    nationality: '',
    house: '',
    transport_type: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoLoadError, setPhotoLoadError] = useState(false);

  useEffect(() => {
    fetchStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, schoolCode]);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/students/${studentId}?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setStudent(result.data);
        const d = result.data as Record<string, unknown>;
        const str = (v: unknown) => (v != null && v !== '' ? String(v) : '');
        setFormData({
          admission_no: str(d.admission_no),
          student_name: str(d.student_name),
          first_name: str(d.first_name),
          last_name: str(d.last_name),
          middle_name: str(d.middle_name),
          class: str(d.class),
          section: str(d.section),
          date_of_birth: toDateInput(d.date_of_birth),
          gender: str(d.gender),
          status: str(d.status) || 'active',
          academic_year: str(d.academic_year),
          roll_number: str(d.roll_number),
          email: str(d.email),
          student_contact: str(d.student_contact),
          blood_group: str(d.blood_group),
          father_name: str(d.father_name),
          father_occupation: str(d.father_occupation),
          father_contact: str(d.father_contact),
          mother_name: str(d.mother_name),
          mother_occupation: str(d.mother_occupation),
          mother_contact: str(d.mother_contact),
          parent_name: str(d.parent_name),
          parent_phone: str(d.parent_phone),
          parent_email: str(d.parent_email),
          address: str(d.address),
          city: str(d.city),
          state: str(d.state),
          pincode: str(d.pincode),
          landmark: str(d.landmark),
          date_of_admission: toDateInput(d.date_of_admission),
          last_class: str(d.last_class),
          last_school_name: str(d.last_school_name),
          last_school_percentage: d.last_school_percentage != null ? String(d.last_school_percentage) : '',
          last_school_result: str(d.last_school_result),
          medium: str(d.medium),
          schooling_type: str(d.schooling_type),
          religion: str(d.religion),
          category: str(d.category),
          nationality: str(d.nationality),
          house: str(d.house),
          transport_type: str(d.transport_type),
        });
        setPhotoPreview((d.photo_url as string) || null);
        setPhotoLoadError(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/students/${studentId}?school_code=${encodeURIComponent(schoolCode)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, school_code: schoolCode }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Student updated successfully.');
        fetchStudent();
      } else {
        const msg = result.details ? `${result.error}: ${result.details}` : (result.error || 'Failed to update student');
        alert(msg);
      }
    } catch (error) {
      console.error('Error updating student:', error);
      alert('Failed to update student. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG or GIF).');
      return;
    }
    setPhotoFile(file);
    setPhotoLoadError(false);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadPhoto = async () => {
    if (!photoFile || !studentId) return;
    setPhotoUploading(true);
    try {
      const form = new FormData();
      form.append('file', photoFile);
      form.append('school_code', schoolCode);
      form.append('student_id', studentId);
      const res = await fetch('/api/students/photos/individual', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (res.ok && data.data?.public_url) {
        setPhotoPreview(data.data.public_url);
        setPhotoFile(null);
        setPhotoLoadError(false);
        setStudent(prev => prev ? { ...prev, photo_url: data.data.public_url } : null);
        alert('Photo updated successfully.');
      } else {
        alert(data.error || 'Failed to upload photo');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload photo.');
    } finally {
      setPhotoUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading student...</p>
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
        
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Edit Student</h1>
            <p className="text-gray-600">Update student information</p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo upload */}
            <div className="flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center border-2 border-gray-300 shrink-0 relative">
                  <img
                    src={photoPreview?.startsWith('data:') ? photoPreview : `/api/students/${studentId}/photo?school_code=${encodeURIComponent(schoolCode)}`}
                    alt="Student"
                    className="absolute inset-0 w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    style={{ display: photoLoadError ? 'none' : undefined }}
                    onError={() => setPhotoLoadError(true)}
                  />
                  {photoLoadError && (
                    <span className="absolute inset-0 flex w-full h-full items-center justify-center bg-gray-200">
                      <Camera className="text-gray-400" size={32} />
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    id="student-photo-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  <label
                    htmlFor="student-photo-upload"
                    className="inline-block px-4 py-2 bg-[#1e3a8a] text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-[#2563eb]"
                  >
                    {photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </label>
                  {photoFile && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 truncate max-w-[140px]">{photoFile.name}</span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleUploadPhoto}
                        disabled={photoUploading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {photoUploading ? (
                          <>
                            <Loader2 size={14} className="animate-spin mr-1" />
                            Uploading...
                          </>
                        ) : (
                          'Upload'
                        )}
                      </Button>
                      <button
                        type="button"
                        onClick={() => { setPhotoFile(null); setPhotoPreview(student?.photo_url || null); setPhotoLoadError(false); }}
                        className="p-1 text-gray-500 hover:text-red-600"
                        aria-label="Clear"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Basic Information</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Admission Number <span className="text-red-500">*</span></label>
                  <Input type="text" value={formData.admission_no} onChange={(e) => handleChange('admission_no', e.target.value)} required placeholder="e.g., 133" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Student Name <span className="text-red-500">*</span></label>
                  <Input type="text" value={formData.student_name} onChange={(e) => handleChange('student_name', e.target.value)} required placeholder="Full name" />
                </div>
              
              
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Class <span className="text-red-500">*</span></label>
                  <Input type="text" value={formData.class} onChange={(e) => handleChange('class', e.target.value)} required placeholder="e.g., CLASS-3" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Section <span className="text-red-500">*</span></label>
                  <Input type="text" value={formData.section} onChange={(e) => handleChange('section', e.target.value)} required placeholder="e.g., A" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                  <Input type="date" value={formData.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                  <select value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black">
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                  <select value={formData.status} onChange={(e) => handleChange('status', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black">
                    <option value="active">Active</option>
                    <option value="deactivated">Deactivated</option>
                    <option value="inactive">Inactive</option>
                    <option value="transferred">Transferred</option>
                    <option value="alumni">Alumni</option>
                    <option value="graduated">Graduated</option>
                    <option value="deleted">Deleted</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Year</label>
                  <Input type="text" value={formData.academic_year} onChange={(e) => handleChange('academic_year', e.target.value)} placeholder="e.g., 2024-25" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Roll Number</label>
                  <Input type="text" value={formData.roll_number} onChange={(e) => handleChange('roll_number', e.target.value)} placeholder="Roll no" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Student Email</label>
                  <Input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="student@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Student Contact</label>
                  <Input type="tel" value={formData.student_contact} onChange={(e) => handleChange('student_contact', e.target.value)} placeholder="Phone" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Blood Group</label>
                  <select value={formData.blood_group} onChange={(e) => handleChange('blood_group', e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black">
                    <option value="">Select</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Father */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Father&apos;s Details</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Father&apos;s Name <span className="text-red-500">*</span></label>
                  <Input type="text" value={formData.father_name} onChange={(e) => handleChange('father_name', e.target.value)} required placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Father&apos;s Occupation</label>
                  <Input type="text" value={formData.father_occupation} onChange={(e) => handleChange('father_occupation', e.target.value)} placeholder="Occupation" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Father&apos;s Contact Number <span className="text-red-500">*</span></label>
                  <Input type="tel" value={formData.father_contact} onChange={(e) => handleChange('father_contact', e.target.value)} required placeholder="e.g., 1234567895" />
                </div>
              </div>
            </div>

            {/* Mother */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Mother&apos;s Details</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mother&apos;s Name</label>
                  <Input type="text" value={formData.mother_name} onChange={(e) => handleChange('mother_name', e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mother&apos;s Occupation</label>
                  <Input type="text" value={formData.mother_occupation} onChange={(e) => handleChange('mother_occupation', e.target.value)} placeholder="Occupation" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mother&apos;s Contact Number</label>
                  <Input type="tel" value={formData.mother_contact} onChange={(e) => handleChange('mother_contact', e.target.value)} placeholder="Phone" />
                </div>
              </div>
            </div>

            {/* Parent/Guardian (optional) */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Parent/Guardian (optional)</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Parent/Guardian Name</label>
                  <Input type="text" value={formData.parent_name} onChange={(e) => handleChange('parent_name', e.target.value)} placeholder="Other parent/guardian" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Parent Phone</label>
                  <Input type="tel" value={formData.parent_phone} onChange={(e) => handleChange('parent_phone', e.target.value)} placeholder="Other contact" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Parent Email</label>
                  <Input type="email" value={formData.parent_email} onChange={(e) => handleChange('parent_email', e.target.value)} placeholder="email@example.com" />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Address</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                  <textarea value={formData.address} onChange={(e) => handleChange('address', e.target.value)} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black" placeholder="e.g., 61, Rampuram, Shyam Nagar" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                  <Input type="text" value={formData.city} onChange={(e) => handleChange('city', e.target.value)} placeholder="City" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                  <Input type="text" value={formData.state} onChange={(e) => handleChange('state', e.target.value)} placeholder="State" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Pincode</label>
                  <Input type="text" value={formData.pincode} onChange={(e) => handleChange('pincode', e.target.value)} placeholder="Pincode" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Landmark</label>
                  <Input type="text" value={formData.landmark} onChange={(e) => handleChange('landmark', e.target.value)} placeholder="Landmark" />
                </div>
              </div>
            </div>

            {/* Previous school / Academic */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Previous School / Academic</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Admission</label>
                  <Input type="date" value={formData.date_of_admission} onChange={(e) => handleChange('date_of_admission', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Last Class</label>
                  <Input type="text" value={formData.last_class} onChange={(e) => handleChange('last_class', e.target.value)} placeholder="e.g., CLASS-2" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Last School Name</label>
                  <Input type="text" value={formData.last_school_name} onChange={(e) => handleChange('last_school_name', e.target.value)} placeholder="School name" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Last School Percentage</label>
                  <Input type="text" inputMode="decimal" value={formData.last_school_percentage} onChange={(e) => handleChange('last_school_percentage', e.target.value)} placeholder="e.g., 85.5" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Last School Result</label>
                  <Input type="text" value={formData.last_school_result} onChange={(e) => handleChange('last_school_result', e.target.value)} placeholder="Result" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Medium</label>
                  <Input type="text" value={formData.medium} onChange={(e) => handleChange('medium', e.target.value)} placeholder="e.g., English" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Schooling Type</label>
                  <Input type="text" value={formData.schooling_type} onChange={(e) => handleChange('schooling_type', e.target.value)} placeholder="e.g., Regular" />
                </div>
              </div>
            </div>

            {/* Additional */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Additional Information</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Religion</label>
                  <Input type="text" value={formData.religion} onChange={(e) => handleChange('religion', e.target.value)} placeholder="Religion" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <Input type="text" value={formData.category} onChange={(e) => handleChange('category', e.target.value)} placeholder="Category" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nationality</label>
                  <Input type="text" value={formData.nationality} onChange={(e) => handleChange('nationality', e.target.value)} placeholder="e.g., Indian" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">House</label>
                  <Input type="text" value={formData.house} onChange={(e) => handleChange('house', e.target.value)} placeholder="House name" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Transport Type</label>
                  <Input type="text" value={formData.transport_type} onChange={(e) => handleChange('transport_type', e.target.value)} placeholder="e.g., Bus" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/${schoolCode}/students/${studentId}/view`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

