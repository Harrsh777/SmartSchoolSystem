'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { getSchoolBySlug } from '@/lib/demoData';

export default function SettingsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school } = use(params);
  const schoolData = getSchoolBySlug(school);

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-black mb-2">Settings</h1>
        <p className="text-gray-600">Manage your school settings and preferences</p>
      </motion.div>

      {/* School Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <h2 className="text-xl font-bold text-black mb-6">School Information</h2>
          <div className="space-y-5">
            <Input
              label="School Name"
              defaultValue={schoolData?.name || ''}
              placeholder="Enter school name"
            />
            <Input
              label="School Email"
              type="email"
              defaultValue={schoolData?.email || ''}
              placeholder="school@example.com"
            />
            <Input
              label="School Address"
              defaultValue={schoolData?.address || ''}
              placeholder="Enter school address"
            />
            <div className="pt-4">
              <Button variant="primary">Save Changes</Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Account Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <h2 className="text-xl font-bold text-black mb-6">Account Settings</h2>
          <div className="space-y-5">
            <Input
              label="Change Password"
              type="password"
              placeholder="Enter new password"
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="Confirm new password"
            />
            <div className="pt-4">
              <Button variant="primary">Update Password</Button>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <h2 className="text-xl font-bold text-black mb-6">Preferences</h2>
          <div className="space-y-4">
            <label className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5 rounded border-gray-300" />
              <span className="text-gray-700">Email notifications for new students</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5 rounded border-gray-300" defaultChecked />
              <span className="text-gray-700">SMS notifications for attendance</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" className="w-5 h-5 rounded border-gray-300" defaultChecked />
              <span className="text-gray-700">Weekly reports via email</span>
            </label>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

