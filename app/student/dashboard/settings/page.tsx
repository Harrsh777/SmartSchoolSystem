'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { Settings, CheckCircle2, Camera, Upload, X, Key, Eye, EyeOff, MapPin, Calendar, GraduationCap, User } from 'lucide-react';
import type { Student } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

export default function StudentSettingsPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [settingsData, setSettingsData] = useState({
    phone: '',
    email: '',
    address: '',
  });
  const [settingsChanged, setSettingsChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const storedStudent = sessionStorage.getItem('student');
    if (storedStudent) {
      const studentData = JSON.parse(storedStudent);
      setStudent(studentData);
      setSettingsData({
        phone: studentData.phone || '',
        email: studentData.email || '',
        address: studentData.address || '',
      });
      // Set photo preview if exists
      if (studentData.photo_url) {
        setPhotoPreview(studentData.photo_url);
      }
    }
  }, []);

  useEffect(() => {
    if (student) {
      const changed = 
        settingsData.phone !== (student.phone || '') ||
        settingsData.email !== (student.email || '') ||
        settingsData.address !== (student.address || '');
      setSettingsChanged(changed);
    }
  }, [settingsData, student]);

  const handleSave = async () => {
    if (!student || !settingsChanged) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const studentId = getString(student.id);
      const schoolCode = getString(student.school_code);
      
      if (!studentId || !schoolCode) {
        alert('Missing required information');
        setSaving(false);
        return;
      }
      
      const response = await fetch(`/api/students/${studentId}?school_code=${schoolCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: settingsData.phone,
          email: settingsData.email,
          address: settingsData.address,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        const updatedStudent = { ...student, ...result.data };
        sessionStorage.setItem('student', JSON.stringify(updatedStudent));
        setStudent(updatedStudent);
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
    if (!photoFile || !student) return;

    setUploadingPhoto(true);
    try {
      const schoolCode = getString(student.school_code);
      const studentId = getString(student.id);
      
      if (!schoolCode || !studentId) {
        alert('Missing required information');
        setUploadingPhoto(false);
        return;
      }
      
      const formData = new FormData();
      formData.append('file', photoFile);
      formData.append('school_code', schoolCode);
      formData.append('student_id', studentId);

      const response = await fetch('/api/students/photo', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.data) {
        // Update student state with new photo URL
        const photoUrl = result.data.photo_url || result.data.public_url;
        const updatedStudent = { ...student, photo_url: photoUrl };
        sessionStorage.setItem('student', JSON.stringify(updatedStudent));
        setStudent(updatedStudent);
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

  const handleChangePassword = async () => {
    if (!student) return;

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New password and confirm password do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setChangingPassword(true);
    setPasswordError('');
    setPasswordSuccess(false);

    try {
      const studentId = getString(student.id);
      const schoolCode = getString(student.school_code);
      
      if (!studentId || !schoolCode) {
        setPasswordError('Missing required information');
        setChangingPassword(false);
        return;
      }

      const response = await fetch('/api/students/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admission_no: getString(student.admission_no),
          school_code: schoolCode,
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setPasswordSuccess(true);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setTimeout(() => {
          setPasswordSuccess(false);
        }, 5000);
      } else {
        setPasswordError(result.error || 'Failed to change password');
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError('Failed to change password. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (!student) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const studentName = getString(student.student_name);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="text-primary" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Manage your profile and preferences</p>
          </div>
        </div>
      </motion.div>

      {/* Profile Photo Section */}
      <Card className="glass-card soft-shadow">
        <div className="space-y-6">
          <div className="pb-6 border-b border-input">
            <label className="block text-sm font-semibold text-foreground mb-4">
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
                      className="w-32 h-32 rounded-lg object-cover border-2 border-input"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-lg bg-muted border-2 border-input flex items-center justify-center">
                    <Camera className="text-muted-foreground" size={32} />
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
                  className="inline-block px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium cursor-pointer transition-colors mb-2"
                >
                  <Upload size={16} className="inline mr-2" />
                  {photoPreview ? 'Change Photo' : 'Upload Photo'}
                </label>
                {photoFile && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-2">{photoFile.name}</p>
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
                <p className="text-xs text-muted-foreground mt-2">Max 5MB. Supported: JPG, PNG, GIF</p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <User size={20} />
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Student Name</p>
                <p className="font-medium text-foreground">{studentName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Admission Number</p>
                <p className="font-medium text-foreground font-mono">{getString(student.admission_no) || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <GraduationCap size={14} />
                  Class & Section
                </p>
                <p className="font-medium text-foreground">
                  {getString(student.class) || 'N/A'} - {getString(student.section) || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Academic Year</p>
                <p className="font-medium text-foreground">{getString(student.academic_year) || 'N/A'}</p>
              </div>
              {getString(student.gender) && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Gender</p>
                  <p className="font-medium text-foreground">{getString(student.gender)}</p>
                </div>
              )}
              {getString(student.date_of_birth) && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar size={14} />
                    Date of Birth
                  </p>
                  <p className="font-medium text-foreground">
                    {new Date(getString(student.date_of_birth)).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Editable Fields */}
          <div className="pt-6 border-t border-input space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Phone</label>
              <Input
                type="tel"
                value={settingsData.phone}
                onChange={(e) => setSettingsData({ ...settingsData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Email</label>
              <Input
                type="email"
                value={settingsData.email}
                onChange={(e) => setSettingsData({ ...settingsData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                <MapPin size={14} />
                Address
              </label>
              <Textarea
                value={settingsData.address}
                onChange={(e) => setSettingsData({ ...settingsData, address: e.target.value })}
                placeholder="Enter address"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-input">
              <div>
                {saveSuccess && (
                  <div className="flex items-center gap-2 text-emerald-600">
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
        </div>
      </Card>

      {/* Change Password Section */}
      <Card className="glass-card soft-shadow">
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-input">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Key className="text-primary" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Change Password</h2>
              <p className="text-sm text-muted-foreground">Update your account password</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Current Password
            </label>
            <div className="relative">
              <Input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, currentPassword: e.target.value });
                  setPasswordError('');
                }}
                placeholder="Enter current password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              New Password
            </label>
            <div className="relative">
              <Input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, newPassword: e.target.value });
                  setPasswordError('');
                }}
                placeholder="Enter new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <Input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                  setPasswordError('');
                }}
                placeholder="Confirm new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {passwordError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={18} />
                <span className="text-sm font-medium">Password changed successfully!</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end pt-4 border-t border-input">
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
