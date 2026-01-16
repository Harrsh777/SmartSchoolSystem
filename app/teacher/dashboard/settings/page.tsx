'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { Settings, CheckCircle2, Camera, Upload, X } from 'lucide-react';
import type { Staff } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

export default function SettingsPage() {
  // router kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const router = useRouter();
  const [teacher, setTeacher] = useState<Staff | null>(null);
  const [settingsData, setSettingsData] = useState({
    phone: '',
    email: '',
    address: '',
    qualification: '',
    experience_years: 0,
  });
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      setSettingsData({
        phone: teacherData.phone || '',
        email: teacherData.email || '',
        address: teacherData.address || '',
        qualification: teacherData.qualification || '',
        experience_years: teacherData.experience_years || 0,
      });
      // Set photo preview if exists
      if (teacherData.photo_url) {
        setPhotoPreview(teacherData.photo_url);
      }
    }
  }, []);

  useEffect(() => {
    if (teacher) {
      const changed = 
        settingsData.phone !== (teacher.phone || '') ||
        settingsData.email !== (teacher.email || '') ||
        settingsData.address !== (teacher.address || '') ||
        settingsData.qualification !== (teacher.qualification || '') ||
        settingsData.experience_years !== (teacher.experience_years || 0);
      setSettingsChanged(changed);
    }
  }, [settingsData, teacher]);

  const handleSave = async () => {
    if (!teacher || !settingsChanged) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const teacherId = getString(teacher.id);
      const schoolCode = getString(teacher.school_code);
      
      if (!teacherId || !schoolCode) {
        alert('Missing required information');
        setSaving(false);
        return;
      }
      
      const response = await fetch(`/api/staff/${teacherId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          phone: settingsData.phone,
          email: settingsData.email,
          address: settingsData.address,
          qualification: settingsData.qualification,
          experience_years: settingsData.experience_years,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        const updatedTeacher = { ...teacher, ...result.data };
        sessionStorage.setItem('teacher', JSON.stringify(updatedTeacher));
        setTeacher(updatedTeacher);
        setSettingsChanged(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(result.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
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
    if (!photoFile || !teacher) return;

    setUploadingPhoto(true);
    try {
      const schoolCode = getString(teacher.school_code);
      const staffId = getString(teacher.id);
      
      if (!schoolCode || !staffId) {
        alert('Missing required information');
        setUploadingPhoto(false);
        return;
      }
      
      const formData = new FormData();
      formData.append('file', photoFile);
      formData.append('school_code', schoolCode);
      formData.append('staff_id', staffId);

      const response = await fetch('/api/staff/photos/self', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.data) {
        // Update teacher state with new photo URL
        const updatedTeacher = { ...teacher, photo_url: result.data.public_url };
        sessionStorage.setItem('teacher', JSON.stringify(updatedTeacher));
        setTeacher(updatedTeacher);
        setPhotoFile(null);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
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

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Settings className="text-gray-600" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your profile and preferences</p>
          </div>
        </div>
      </motion.div>

      <Card>
        <div className="space-y-6">
          {/* Profile Photo Section */}
          <div className="pb-6 border-b border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              Profile Photo
            </label>
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
            <Input
              type="tel"
              value={settingsData.phone}
              onChange={(e) => setSettingsData({ ...settingsData, phone: e.target.value })}
              placeholder="Enter phone number"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <Input
              type="email"
              value={settingsData.email}
              onChange={(e) => setSettingsData({ ...settingsData, email: e.target.value })}
              placeholder="Enter email address"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
            <Textarea
              value={settingsData.address}
              onChange={(e) => setSettingsData({ ...settingsData, address: e.target.value })}
              placeholder="Enter address"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Qualification</label>
            <Input
              type="text"
              value={settingsData.qualification}
              onChange={(e) => setSettingsData({ ...settingsData, qualification: e.target.value })}
              placeholder="Enter qualification"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Experience (Years)</label>
            <Input
              type="number"
              value={settingsData.experience_years}
              onChange={(e) => setSettingsData({ ...settingsData, experience_years: parseInt(e.target.value) || 0 })}
              placeholder="Enter years of experience"
              min="0"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div>
              {saveSuccess && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-medium">Settings saved successfully!</span>
                </div>
              )}
            </div>
            <Button
              onClick={handleSave}
              disabled={!settingsChanged || saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

