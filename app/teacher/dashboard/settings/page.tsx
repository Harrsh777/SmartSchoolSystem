'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { Settings, CheckCircle2 } from 'lucide-react';
import type { Staff } from '@/lib/supabase';

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
      const response = await fetch(`/api/staff/${teacher.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: teacher.school_code,
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

