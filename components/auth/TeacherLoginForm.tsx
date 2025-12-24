'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { UserCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function TeacherLoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    school_code: '',
    staff_id: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.school_code.trim()) {
      errors.school_code = 'School code is required';
    }
    
    if (!formData.staff_id.trim()) {
      errors.staff_id = 'Staff ID is required';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/teacher/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store session data
        sessionStorage.setItem('teacher', JSON.stringify(result.teacher));
        sessionStorage.setItem('role', 'teacher');
        
        // Redirect to teacher dashboard
        router.push('/teacher/dashboard');
      } else {
        setError(result.error || 'Invalid credentials. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    if (error) setError('');
  };

  return (
    <div className="p-8">
      <div className="text-center mb-8">
        <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-400 text-white mb-4">
          <UserCheck size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Teacher Login</h2>
        <p className="text-gray-600">Enter your credentials to access your portal</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            School Code <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={formData.school_code}
            onChange={(e) => handleChange('school_code', e.target.value.toUpperCase())}
            placeholder="Enter school code"
            required
            className={fieldErrors.school_code ? 'border-red-500' : ''}
          />
          {fieldErrors.school_code && (
            <p className="text-red-600 text-sm mt-1">{fieldErrors.school_code}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Staff ID <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={formData.staff_id}
            onChange={(e) => handleChange('staff_id', e.target.value)}
            placeholder="Enter staff ID"
            required
            className={fieldErrors.staff_id ? 'border-red-500' : ''}
          />
          {fieldErrors.staff_id && (
            <p className="text-red-600 text-sm mt-1">{fieldErrors.staff_id}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Enter password"
              required
              className={`pr-10 ${fieldErrors.password ? 'border-red-500' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-red-600 text-sm mt-1">{fieldErrors.password}</p>
          )}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <AlertCircle size={20} />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>
    </div>
  );
}

