'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { saveSchool, createSchoolSlug, getSchoolByEmail, type School } from '@/lib/demoData';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolAddress: '',
    schoolEmail: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Check if email already exists
    if (getSchoolByEmail(formData.schoolEmail)) {
      setError('An account with this email already exists');
      return;
    }

    // Create school object
    const slug = createSchoolSlug(formData.schoolName);
    const newSchool: School = {
      id: slug,
      name: formData.schoolName,
      email: formData.schoolEmail,
      address: formData.schoolAddress,
      setupCompleted: false,
    };

    // Save to localStorage (demo only)
    saveSchool(newSchool);

    // Redirect to dashboard
    router.push(`/dashboard/${slug}`);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-black mb-2">
              EduFlow<span className="text-gray-600">360</span>
            </h1>
          </Link>
          <p className="text-gray-600">Create your school account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="School Name"
              type="text"
              value={formData.schoolName}
              onChange={(e) => handleChange('schoolName', e.target.value)}
              placeholder="ABC International School"
              required
            />

            <Input
              label="School Address"
              type="text"
              value={formData.schoolAddress}
              onChange={(e) => handleChange('schoolAddress', e.target.value)}
              placeholder="123 Main Street, City, State"
              required
            />

            <Input
              label="School Email"
              type="email"
              value={formData.schoolEmail}
              onChange={(e) => handleChange('schoolEmail', e.target.value)}
              placeholder="admin@school.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Create a password"
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder="Confirm your password"
              required
            />

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full">
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-black font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

