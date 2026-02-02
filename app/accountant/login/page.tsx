'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { IndianRupee, ArrowLeft, Lock, Building2, User } from 'lucide-react';
import Link from 'next/link';

export default function AccountantLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    school_code: '',
    staff_id: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/accountant/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        // Store accountant data in sessionStorage
        sessionStorage.setItem('accountant', JSON.stringify(result.data.staff));
        sessionStorage.setItem('school', JSON.stringify(result.data.school));
        sessionStorage.setItem('role', 'accountant');
        
        // Redirect to accountant dashboard
        router.push('/accountant/dashboard');
      } else {
        setError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Go back</span>
        </Link>

        <Card className="p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
              <IndianRupee className="text-indigo-600" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Accountant Login</h1>
            <p className="text-gray-600">Access your fees management dashboard</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Building2 size={16} />
                School Code
              </label>
              <Input
                type="text"
                value={formData.school_code}
                onChange={(e) => setFormData({ ...formData, school_code: e.target.value.toUpperCase() })}
                placeholder="SCH001"
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User size={16} />
                Staff ID
              </label>
              <Input
                type="text"
                value={formData.staff_id}
                onChange={(e) => setFormData({ ...formData, staff_id: e.target.value.toUpperCase() })}
                placeholder="ACC001"
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Lock size={16} />
                Password
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter your password"
                required
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600">
              Secure School ERP Platform
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

