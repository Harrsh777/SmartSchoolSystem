'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Save, X, CheckCircle, AlertCircle } from 'lucide-react';
import type { AcceptedSchool } from '@/lib/supabase';

export default function SchoolSettingsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [school, setSchool] = useState<AcceptedSchool | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<AcceptedSchool>>({
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
  });

  useEffect(() => {
    fetchSchoolData();
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
        setSchool(result.school);
        setFormData(result.school);
        sessionStorage.setItem('school', JSON.stringify(result.school));
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
      setIsEditing(false);
      setError('');
      setSuccess('');
    }
  };

  const handleChange = (field: keyof AcceptedSchool, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
          <h1 className="text-3xl font-bold text-black mb-2">School Information</h1>
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
            />
            <Input
              label="Affiliation"
              value={formData.affiliation || ''}
              onChange={(e) => handleChange('affiliation', e.target.value)}
              disabled={!isEditing}
            />
            <Input
              label="Established Year"
              value={formData.established_year || ''}
              onChange={(e) => handleChange('established_year', e.target.value)}
              disabled={!isEditing}
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
    </div>
  );
}
