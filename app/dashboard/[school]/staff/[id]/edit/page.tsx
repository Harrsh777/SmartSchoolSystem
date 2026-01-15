'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, Camera, Upload, X } from 'lucide-react';
import type { Staff } from '@/lib/supabase';

export default function EditStaffPage({
  params,
}: {
  params: Promise<{ school: string; id: string }>;
}) {
  const { school: schoolCode, id: staffId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: '',
    full_name: '',
    role: '',
    department: '',
    designation: '',
    email: '',
    phone: '',
    date_of_joining: '',
    employment_type: '',
    qualification: '',
    experience_years: '',
    gender: '',
    address: '',
  });

  useEffect(() => {
    fetchStaff();
    fetchSubjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, schoolCode]);

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

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/staff/${staffId}?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setStaff(result.data);
        setFormData({
          staff_id: result.data.staff_id || '',
          full_name: result.data.full_name || '',
          role: result.data.role || '',
          department: result.data.department || '',
          designation: result.data.designation || '',
          email: result.data.email || '',
          phone: result.data.phone || '',
          date_of_joining: result.data.date_of_joining || '',
          employment_type: result.data.employment_type || '',
          qualification: result.data.qualification || '',
          experience_years: result.data.experience_years?.toString() || '',
          gender: result.data.gender || '',
          address: result.data.address || '',
        });
        // Set photo preview if exists
        if (result.data.photo_url) {
          setPhotoPreview(result.data.photo_url);
        }
      } else {
        router.push(`/dashboard/${schoolCode}/staff`);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
      router.push(`/dashboard/${schoolCode}/staff`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/staff/${staffId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...formData,
          experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        router.push(`/dashboard/${schoolCode}/staff/${staffId}/view`);
      } else {
        alert(result.error || 'Failed to update staff');
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      alert('Failed to update staff. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    // Reset file input
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile || !staffId) return;

    setUploadingPhoto(true);
    try {
      // Get current admin's staff_id for authentication
      const storedStaff = sessionStorage.getItem('staff');
      let uploadedByStaffId = '';
      if (storedStaff) {
        try {
          const staffData = JSON.parse(storedStaff);
          uploadedByStaffId = staffData.staff_id || '';
        } catch {
          // Ignore parse errors
        }
      }

      const formData = new FormData();
      formData.append('file', photoFile);
      formData.append('school_code', schoolCode);
      formData.append('staff_id', staffId);
      if (uploadedByStaffId) {
        formData.append('uploaded_by_staff_id', uploadedByStaffId);
      }

      const response = await fetch('/api/staff/photos/individual', {
        method: 'POST',
        headers: uploadedByStaffId ? {
          'x-staff-id': uploadedByStaffId,
        } : {},
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.data) {
        // Update staff state with new photo URL
        if (staff) {
          setStaff({ ...staff, photo_url: result.data.public_url });
        }
        setPhotoFile(null);
        alert('Photo uploaded successfully!');
      } else {
        alert(result.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading staff...</p>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg mb-4">Staff member not found</p>
          <Button onClick={() => router.push(`/dashboard/${schoolCode}/staff`)}>
            Back to Staff
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/staff/${staffId}/view`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Edit Staff</h1>
            <p className="text-gray-600">Update staff information</p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Photo Section */}
            <div className="pb-6 border-b border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Profile Photo
              </label>
              <div className="flex items-start gap-6">
                <div className="relative">
                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Profile preview"
                        className="w-32 h-32 rounded-lg object-cover border-2 border-gray-200"
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
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium cursor-pointer transition-colors mb-2"
                  >
                    <Upload size={16} className="inline mr-2" />
                    {photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </label>
                  {photoFile && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-2">{photoFile.name}</p>
                      <Button
                        type="button"
                        onClick={handlePhotoUpload}
                        disabled={uploadingPhoto}
                        size="sm"
                      >
                        {uploadingPhoto ? 'Uploading...' : 'Save Photo'}
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Max 5MB. Supported: JPG, PNG, GIF</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Staff ID <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.staff_id}
                  onChange={(e) => handleChange('staff_id', e.target.value)}
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
                  required
                  placeholder="e.g., Principal, Teacher"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Department
                </label>
                <Input
                  type="text"
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  placeholder="Department name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Designation (Subject)
                </label>
                <select
                  value={formData.designation || ''}
                  onChange={(e) => handleChange('designation', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="">Select a subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.name}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  required
                  placeholder="Phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="email@example.com"
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
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Qualification
                </label>
                <Input
                  type="text"
                  value={formData.qualification}
                  onChange={(e) => handleChange('qualification', e.target.value)}
                  placeholder="Educational qualification"
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
                  placeholder="Years of experience"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Full address"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/${schoolCode}/staff/${staffId}/view`)}
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

