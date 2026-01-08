'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Save, X, CheckCircle, AlertCircle, Upload, Image as ImageIcon, Building2, Edit2, Plus, Trash2, Clock } from 'lucide-react';
import type { AcceptedSchool } from '@/lib/supabase';

export default function InstituteInfoPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [school, setSchool] = useState<AcceptedSchool | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Working days state
  const [workingDays, setWorkingDays] = useState<Array<{
    id?: string;
    day_name: string;
    start_time: string | null;
    end_time: string | null;
    is_working_day: boolean;
  }>>([]);
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
  const [savingDays, setSavingDays] = useState(false);
  
  // Houses state
  const [houses, setHouses] = useState<Array<{
    id: string;
    house_name: string;
    house_color: string;
    description?: string;
  }>>([]);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [editingHouse, setEditingHouse] = useState<{ id: string; house_name: string; house_color: string; description?: string } | null>(null);
  const [newHouseName, setNewHouseName] = useState('');
  const [newHouseColor, setNewHouseColor] = useState('#6366f1');
  const [newHouseDescription, setNewHouseDescription] = useState('');
  const [savingHouse, setSavingHouse] = useState(false);
  
  const [formData, setFormData] = useState<Partial<AcceptedSchool & { logo_url?: string }>>({
    school_name: '',
    school_code: '',
    school_address: '',
    city: '',
    state: '',
    zip_code: '',
    country: '',
    school_email: '',
    school_phone: '',
    principal_name: '',
    principal_email: '',
    principal_phone: '',
    established_year: '',
    school_type: '',
    affiliation: '',
    logo_url: '',
  });

  useEffect(() => {
    fetchSchoolData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (schoolCode) {
      fetchWorkingDays();
      fetchHouses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchSchoolData = async () => {
    try {
      setLoading(true);
      // Get from sessionStorage first
      const storedSchool = sessionStorage.getItem('school');
      if (storedSchool) {
        const schoolData = JSON.parse(storedSchool);
        if (schoolData.school_code === schoolCode) {
          setSchool(schoolData);
          setFormData(schoolData);
          if (schoolData.logo_url) {
            setLogoPreview(schoolData.logo_url);
          }
          setLoading(false);
          return;
        }
      }

      // If not in sessionStorage, fetch from API
      const response = await fetch(`/api/schools/accepted`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        const schoolData = result.data.find((s: AcceptedSchool) => s.school_code === schoolCode);
        if (schoolData) {
          setSchool(schoolData);
          setFormData(schoolData);
          if (schoolData.logo_url) {
            setLogoPreview(schoolData.logo_url);
          }
          sessionStorage.setItem('school', JSON.stringify(schoolData));
        } else {
          setError('School not found');
        }
      }
    } catch (err) {
      console.error('Error fetching school:', err);
      setError('Failed to load school information');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingLogo(true);
      setError('');

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('school_code', schoolCode);

      // Upload to API
      const response = await fetch('/api/schools/upload-logo', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.data?.logo_url) {
        const logoUrl = result.data.logo_url;
        setLogoPreview(logoUrl);
        setFormData(prev => ({ ...prev, logo_url: logoUrl }));
        
        // Update school data in state and sessionStorage
        if (school) {
          const updatedSchool = { ...school, logo_url: logoUrl };
          setSchool(updatedSchool);
          sessionStorage.setItem('school', JSON.stringify(updatedSchool));
        }
        
        setSuccess('Logo uploaded successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        // Show detailed error message
        const errorMessage = result.details 
          ? `${result.error || 'Failed to upload logo'}: ${result.details}`
          : result.error || 'Failed to upload logo';
        setError(errorMessage);
        console.error('Upload error:', result);
      }
    } catch (err) {
      console.error('Error uploading logo:', err);
      setError('Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!school?.id) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/schools/${school.id}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        const updatedSchool = result.data || result.school;
        setSchool(updatedSchool);
        setFormData(updatedSchool);
        if (updatedSchool.logo_url) {
          setLogoPreview(updatedSchool.logo_url);
        }
        sessionStorage.setItem('school', JSON.stringify(updatedSchool));
        setIsEditing(false);
        setSuccess('School information updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to update school information');
      }
    } catch (err) {
      console.error('Error updating school:', err);
      setError('An error occurred while updating');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (school) {
      setFormData(school);
      if (school.logo_url) {
        setLogoPreview(school.logo_url);
      } else {
        setLogoPreview(null);
      }
      setIsEditing(false);
      setError('');
      setSuccess('');
    }
  };

  const handleChange = (field: keyof AcceptedSchool, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Working Days Functions
  const fetchWorkingDays = async () => {
    try {
      const response = await fetch(`/api/institute/working-days?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setWorkingDays(result.data);
      }
    } catch (err) {
      console.error('Error fetching working days:', err);
    }
  };

  const handleDayTimeChange = (index: number, field: 'start_time' | 'end_time', value: string) => {
    const updated = [...workingDays];
    updated[index] = { ...updated[index], [field]: value || null };
    setWorkingDays(updated);
  };

  const handleWorkingDayToggle = (index: number) => {
    const updated = [...workingDays];
    updated[index] = { 
      ...updated[index], 
      is_working_day: !updated[index].is_working_day,
      // Clear times if marking as non-working day
      start_time: !updated[index].is_working_day ? updated[index].start_time : null,
      end_time: !updated[index].is_working_day ? updated[index].end_time : null,
    };
    setWorkingDays(updated);
  };

  const handleSaveWorkingDays = async () => {
    try {
      setSavingDays(true);
      const response = await fetch('/api/institute/working-days', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          working_days: workingDays,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setSuccess('Working days updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
        setEditingDayIndex(null);
        fetchWorkingDays();
      } else {
        setError(result.error || 'Failed to update working days');
      }
    } catch (err) {
      console.error('Error saving working days:', err);
      setError('Failed to save working days');
    } finally {
      setSavingDays(false);
    }
  };

  // Houses Functions
  const fetchHouses = async () => {
    try {
      const response = await fetch(`/api/institute/houses?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setHouses(result.data);
      }
    } catch (err) {
      console.error('Error fetching houses:', err);
    }
  };

  const handleAddHouse = () => {
    setEditingHouse(null);
    setNewHouseName('');
    setNewHouseColor('#6366f1');
    setNewHouseDescription('');
    setShowHouseModal(true);
  };

  const handleEditHouse = (house: typeof houses[0]) => {
    setEditingHouse({
      id: house.id,
      house_name: house.house_name,
      house_color: house.house_color,
      description: house.description || '',
    });
    setNewHouseName(house.house_name);
    setNewHouseColor(house.house_color);
    setNewHouseDescription(house.description || '');
    setShowHouseModal(true);
  };

  const handleSaveHouse = async () => {
    if (!newHouseName.trim()) {
      setError('House name is required');
      return;
    }

    try {
      setSavingHouse(true);
      setError('');

      if (editingHouse) {
        // Update existing house
        const response = await fetch(`/api/institute/houses/${editingHouse.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            house_name: newHouseName.trim(),
            house_color: newHouseColor,
            description: newHouseDescription.trim() || null,
          }),
        });

        const result = await response.json();
        
        if (response.ok) {
          setSuccess('House updated successfully!');
          setTimeout(() => setSuccess(''), 3000);
          setShowHouseModal(false);
          fetchHouses();
        } else {
          setError(result.error || 'Failed to update house');
        }
      } else {
        // Create new house
        const response = await fetch('/api/institute/houses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            school_code: schoolCode,
            house_name: newHouseName.trim(),
            house_color: newHouseColor,
            description: newHouseDescription.trim() || null,
          }),
        });

        const result = await response.json();
        
        if (response.ok) {
          setSuccess('House added successfully!');
          setTimeout(() => setSuccess(''), 3000);
          setShowHouseModal(false);
          fetchHouses();
        } else {
          setError(result.error || 'Failed to create house');
        }
      }
    } catch (err) {
      console.error('Error saving house:', err);
      setError('Failed to save house');
    } finally {
      setSavingHouse(false);
    }
  };

  const handleDeleteHouse = async (houseId: string) => {
    if (!confirm('Are you sure you want to delete this house?')) return;

    try {
      const response = await fetch(`/api/institute/houses/${houseId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (response.ok) {
        setSuccess('House deleted successfully!');
        setTimeout(() => setSuccess(''), 3000);
        fetchHouses();
      } else {
        setError(result.error || 'Failed to delete house');
      }
    } catch (err) {
      console.error('Error deleting house:', err);
      setError('Failed to delete house');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading school information...</p>
        </div>
      </div>
    );
  }

  if (error && !school) {
    return (
      <Card>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
          <p className="text-gray-600 text-lg">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push('/login')}
          >
            Back to Login
          </Button>
        </div>
      </Card>
    );
  }

  if (!school) return null;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Institute Information</h1>
          <p className="text-gray-600">Manage your school details and information</p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            Edit Information
          </Button>
        ) : (
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleCancel}>
              <X size={18} className="mr-2" />
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              <Save size={18} className="mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </motion.div>

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center space-x-2"
        >
          <CheckCircle size={20} />
          <span>{success}</span>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center space-x-2"
        >
          <AlertCircle size={20} />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Logo Upload Section */}
      <Card>
        <h2 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
          <Building2 size={24} />
          School Logo
        </h2>
        <div className="flex items-center gap-6">
          <div className="flex-shrink-0">
            {logoPreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreview}
                  alt="School Logo"
                  className="w-32 h-32 object-contain border-2 border-gray-200 rounded-lg p-2 bg-white"
                />
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to remove the logo?')) {
                      try {
                        setUploadingLogo(true);
                        // Update form data to remove logo
                        setLogoPreview(null);
                        setFormData(prev => ({ ...prev, logo_url: '' }));
                        // Optionally, you can also update the database here
                        // by calling an API to clear the logo_url
                        if (school?.id) {
                          const response = await fetch(`/api/schools/${school.id}/update`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ logo_url: null }),
                          });
                          if (response.ok) {
                            const result = await response.json();
                            const updatedSchool = result.data || result.school;
                            setSchool(updatedSchool);
                            sessionStorage.setItem('school', JSON.stringify(updatedSchool));
                            setSuccess('Logo removed successfully!');
                            setTimeout(() => setSuccess(''), 3000);
                          }
                        }
                      } catch (err) {
                        console.error('Error removing logo:', err);
                        setError('Failed to remove logo');
                      } finally {
                        setUploadingLogo(false);
                      }
                    }
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  title="Remove logo"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                <ImageIcon className="text-gray-400" size={32} />
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2">
              Upload your school logo (Max 5MB, PNG/JPG/JPEG)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              disabled={uploadingLogo}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
            >
              {uploadingLogo ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={18} className="mr-2" />
                  {logoPreview ? 'Change Logo' : 'Upload Logo'}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* School Basic Information */}
        <Card>
          <h2 className="text-xl font-bold text-black mb-6">School Information</h2>
          <div className="space-y-4">
            <Input
              label="School Name"
              value={formData.school_name || ''}
              onChange={(e) => handleChange('school_name', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="School Code"
              value={formData.school_code || ''}
              disabled
              className="bg-gray-100"
            />
            <Input
              label="School Type"
              value={formData.school_type || ''}
              onChange={(e) => handleChange('school_type', e.target.value)}
              disabled={!isEditing}
              placeholder="e.g., Public, Private, Government"
            />
            <Input
              label="Affiliation"
              value={formData.affiliation || ''}
              onChange={(e) => handleChange('affiliation', e.target.value)}
              disabled={!isEditing}
              placeholder="e.g., CBSE, ICSE, State Board"
            />
            <Input
              label="Established Year"
              value={formData.established_year || ''}
              onChange={(e) => handleChange('established_year', e.target.value)}
              disabled={!isEditing}
              placeholder="e.g., 1990"
            />
          </div>
        </Card>

        {/* Address Information */}
        <Card>
          <h2 className="text-xl font-bold text-black mb-6">Address Information</h2>
          <div className="space-y-4">
            <Input
              label="School Address"
              value={formData.school_address || ''}
              onChange={(e) => handleChange('school_address', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="City"
              value={formData.city || ''}
              onChange={(e) => handleChange('city', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="State"
              value={formData.state || ''}
              onChange={(e) => handleChange('state', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="Zip Code"
              value={formData.zip_code || ''}
              onChange={(e) => handleChange('zip_code', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="Country"
              value={formData.country || ''}
              onChange={(e) => handleChange('country', e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </Card>

        {/* Contact Information */}
        <Card>
          <h2 className="text-xl font-bold text-black mb-6">Contact Information</h2>
          <div className="space-y-4">
            <Input
              label="School Email"
              type="email"
              value={formData.school_email || ''}
              onChange={(e) => handleChange('school_email', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="School Phone"
              type="tel"
              value={formData.school_phone || ''}
              onChange={(e) => handleChange('school_phone', e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </Card>

        {/* Principal Information */}
        <Card>
          <h2 className="text-xl font-bold text-black mb-6">Principal Information</h2>
          <div className="space-y-4">
            <Input
              label="Principal Name"
              value={formData.principal_name || ''}
              onChange={(e) => handleChange('principal_name', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="Principal Email"
              type="email"
              value={formData.principal_email || ''}
              onChange={(e) => handleChange('principal_email', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="Principal Phone"
              type="tel"
              value={formData.principal_phone || ''}
              onChange={(e) => handleChange('principal_phone', e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </Card>
      </div>

      {/* Working Days and Houses Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Institute Days and Time */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-black flex items-center gap-2">
              <Clock size={24} />
              Institute Days and Time
            </h2>
            <button
              onClick={() => {
                if (editingDayIndex === null) {
                  setEditingDayIndex(-1); // Enable editing mode
                } else {
                  setEditingDayIndex(null);
                }
              }}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Edit working days"
            >
              <Edit2 size={18} className="text-orange-500" />
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-teal-600 text-white">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Day</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Working Day</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Start Time</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">End Time</th>
                </tr>
              </thead>
              <tbody>
                {workingDays.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      Loading days...
                    </td>
                  </tr>
                ) : (
                  workingDays.map((day, index) => (
                    <tr key={day.day_name} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {day.day_name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingDayIndex === -1 ? (
                          <input
                            type="checkbox"
                            checked={day.is_working_day !== false}
                            onChange={() => handleWorkingDayToggle(index)}
                            className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                          />
                        ) : (
                          <span className={`inline-block w-5 h-5 rounded-full ${day.is_working_day !== false ? 'bg-green-500' : 'bg-gray-300'}`} />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingDayIndex === -1 ? (
                          <input
                            type="time"
                            value={day.start_time || ''}
                            onChange={(e) => handleDayTimeChange(index, 'start_time', e.target.value)}
                            disabled={day.is_working_day === false}
                            className={`w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                              day.is_working_day === false ? 'bg-gray-100 cursor-not-allowed opacity-50' : ''
                            }`}
                          />
                        ) : (
                          <span className="text-sm text-gray-600">
                            {day.start_time ? day.start_time : '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingDayIndex === -1 ? (
                          <input
                            type="time"
                            value={day.end_time || ''}
                            onChange={(e) => handleDayTimeChange(index, 'end_time', e.target.value)}
                            disabled={day.is_working_day === false}
                            className={`w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                              day.is_working_day === false ? 'bg-gray-100 cursor-not-allowed opacity-50' : ''
                            }`}
                          />
                        ) : (
                          <span className="text-sm text-gray-600">
                            {day.end_time ? day.end_time : '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {editingDayIndex === -1 && (
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingDayIndex(null);
                  fetchWorkingDays(); // Reset changes
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveWorkingDays}
                disabled={savingDays}
              >
                {savingDays ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </Card>

        {/* Institute Houses */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-black">Update Institute&apos;s Houses</h2>
            </div>
            
            <Button
              onClick={handleAddHouse}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus size={18} className="mr-2" />
              ADD HOUSES
            </Button>

            {houses.length > 0 && (
              <div className="mt-6 space-y-3">
                {houses.map((house) => (
                  <motion.div
                    key={house.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: house.house_color }}
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{house.house_name}</p>
                        {house.description && (
                          <p className="text-xs text-gray-500">{house.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditHouse(house)}
                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Edit house"
                      >
                        <Edit2 size={16} className="text-blue-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteHouse(house.id)}
                        className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Delete house"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {houses.length === 0 && (
              <p className="text-sm text-gray-500 mt-4">No houses added yet. Click &quot;ADD HOUSES&quot; to create one.</p>
            )}
          </Card>
        </div>
      </div>

      {/* House Modal */}
      {showHouseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {editingHouse ? 'Edit House' : 'Add New House'}
              </h3>
              <button
                onClick={() => setShowHouseModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  House Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newHouseName}
                  onChange={(e) => setNewHouseName(e.target.value)}
                  placeholder="e.g., Red House, Blue House"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  House Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newHouseColor}
                    onChange={(e) => setNewHouseColor(e.target.value)}
                    className="w-16 h-10 rounded-lg border border-gray-300 cursor-pointer"
                  />
                  <Input
                    value={newHouseColor}
                    onChange={(e) => setNewHouseColor(e.target.value)}
                    placeholder="#6366f1"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newHouseDescription}
                  onChange={(e) => setNewHouseDescription(e.target.value)}
                  placeholder="Enter house description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowHouseModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveHouse}
                disabled={savingHouse || !newHouseName.trim()}
              >
                {savingHouse ? 'Saving...' : editingHouse ? 'Update House' : 'Add House'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

