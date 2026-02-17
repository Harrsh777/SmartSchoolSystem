'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import FloatingLabelInput from '@/components/auth/FloatingLabelInput';
import { Shield, Lock, Building2, ArrowRight, AlertTriangle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    school_code: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.school_code.trim()) {
      errors.school_code = 'Admin ID is required';
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      const loggedIn = response.ok && result.success;
      await fetch('/api/auth/log-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: result.school?.id ?? null,
          name: result.school?.school_name ?? formData.school_code ?? 'Unknown',
          role: 'School Admin',
          loginType: 'school',
          status: loggedIn ? 'success' : 'failed',
        }),
      }).catch(() => {});

      if (loggedIn) {
        sessionStorage.setItem('school', JSON.stringify(result.school));
        sessionStorage.setItem('role', 'admin');
        sessionStorage.setItem('admin_authenticated', '1');
        router.push(`/dashboard/${result.school.school_code}`);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#808080] via-[#F0F5F9] to-[#808080] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Security Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.05) 75%, rgba(255, 255, 255, 0.05) 76%, transparent 77%, transparent),
            linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.05) 75%, rgba(255, 255, 255, 0.05) 76%, transparent 77%, transparent)
          `,
          backgroundSize: '50px 50px',
        }} />
      </div>

      {/* Subtle Glow Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 md:p-10 border border-[#5A7A95]/20"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] mb-4 shadow-lg shadow-[#5A7A95]/30"
            >
              <Shield className="text-white" size={32} />
            </motion.div>
            <h1 className="text-3xl font-bold text-[#1e293b] mb-2">
              Administrator Access
            </h1>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-full">
              <Lock size={14} className="text-red-600" />
              <span className="text-xs font-semibold text-red-600">Protected System</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"
            >
              <AlertTriangle size={18} />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <FloatingLabelInput
              id="school_code"
              label="Admin ID"
              type="text"
              value={formData.school_code}
              onChange={(value) => setFormData({ ...formData, school_code: value })}
              error={fieldErrors.school_code}
              icon={<Building2 size={20} />}
              placeholder="Enter your admin ID"
            />

            <FloatingLabelInput
              id="password"
              label="Secure PIN / Password"
              type="password"
              value={formData.password}
              onChange={(value) => setFormData({ ...formData, password: value })}
              error={fieldErrors.password}
              icon={<Lock size={20} />}
              placeholder="Enter your secure password"
              showPasswordToggle
            />

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] text-white font-semibold rounded-xl shadow-lg shadow-[#5A7A95]/30 hover:shadow-xl hover:shadow-[#5A7A95]/40 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <motion.div
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <span>Authorizing...</span>
                </>
              ) : (
                <>
                  <span>Authorize Access</span>
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="text-sm text-[#64748b] hover:text-[#5A7A95] transition-colors"
            >
              ← Back to role selection
            </Link>
          </div>

          {/* Security Notice */}
          <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
            <p className="text-xs text-[#64748b] text-center">
              This is a secure administrative system. All access attempts are logged and monitored.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
