'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import FloatingLabelInput from '@/components/auth/FloatingLabelInput';
import { 
  GraduationCap, 
  User, 
  Lock, 
  ArrowRight, 
  Sparkles, 
  BookOpen,
  Trophy,
  Shield,
  Clock,
  Award
} from 'lucide-react';

export default function StudentLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    school_code: '',
    admission_no: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!formData.school_code.trim()) errors.school_code = 'Required';
    if (!formData.admission_no.trim()) errors.admission_no = 'Required';
    if (!formData.password) errors.password = 'Required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await fetch('/api/auth/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        sessionStorage.setItem('student', JSON.stringify(result.student));
        sessionStorage.setItem('role', 'student');
        router.push('/student/dashboard');
      } else {
        setError(result.error || 'Invalid credentials.');
      }
    } catch {
      setError('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: BookOpen, title: 'Courses', description: '500+ items' },
    { icon: Clock, title: '24/7 Access', description: 'Learn anytime' },
    { icon: Award, title: 'Certificates', description: 'Earn badges' },
    { icon: Shield, title: 'Secure', description: 'Data protected' },
  ];

  return (
    // Reduced padding from p-4 to p-2 or p-4 and items-center to keep it tight
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-[#87CEEB] via-[#00000] to-[#87CEEB]">
      
      {/* Background Orbs - Reduced opacity and size */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
        <div className="absolute top-10 left-[10%] w-72 h-72 bg-blue-400/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-10 right-[10%] w-72 h-72 bg-cyan-400/10 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          
          {/* Left Side - Hero (Condensed) */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:flex flex-col space-y-4 px-4"
          >
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#5A7A95]/10 backdrop-blur-md rounded-full border border-[#5A7A95]/20">
                <Sparkles className="w-4 h-4 text-[#5A7A95]" />
                <span className="text-[#5A7A95] text-xs font-bold uppercase tracking-wider">Learning Portal</span>
              </div>

              <h1 className="text-6xl font-bold text-[#1e293b] leading-tight">
                Empower Your
                <span className="block text-[#5A7A95]">Journey</span>
              </h1>

              <p className="text-base text-[#475569] max-w-md">
                Access your education, track progress, and achieve academic goals.
              </p>
            </div>

            {/* Compact Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-[#5A7A95]/10 shadow-sm">
                <div className="flex items-center gap-2">
                  <Trophy className="text-[#5A7A95]" size={18} />
                  <p className="text-xl font-bold text-[#1e293b]">15K+</p>
                </div>
                <p className="text-[#64748b] text-xs font-medium">Active Students</p>
              </div>
              <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-[#5A7A95]/10 shadow-sm">
                <div className="flex items-center gap-2">
                  <BookOpen className="text-[#5A7A95]" size={18} />
                  <p className="text-xl font-bold text-[#1e293b]">500+</p>
                </div>
                <p className="text-[#64748b] text-xs font-medium">Courses</p>
              </div>
            </div>

            {/* Slim Features Grid */}
            <div className="grid grid-cols-2 gap-3">
              {features.map((feature) => (
                <div key={feature.title} className="bg-white/40 rounded-lg p-3 border border-white/20 flex items-center gap-3">
                  <feature.icon className="w-5 h-5 text-[#5A7A95] flex-shrink-0" />
                  <div>
                    <h3 className="text-[#1e293b] text-xs font-bold">{feature.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Side - Login Form (Condensed) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-[400px] mx-auto"
          >
            <div className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-xl overflow-hidden border border-[#5A7A95]/10">
              
              {/* Header - Reduced padding from p-8 to p-5 */}
              <div className="relative bg-[#5A7A95]/5 p-5 text-center border-b border-[#5A7A95]/10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#5A7A95] mb-2 shadow-lg"
                >
                  <GraduationCap className="text-white" size={28} />
                </motion.div>
                <h2 className="text-xl font-bold text-[#1e293b]">Student Portal</h2>
                <p className="text-[#64748b] text-xs">Sign in to your dashboard</p>
              </div>

              {/* Form Body - Reduced padding from p-8/10 to p-6 */}
              <div className="p-6">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs text-center"
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <FloatingLabelInput
                    id="school_code"
                    label="School Code"
                    type="text"
                    value={formData.school_code}
                    onChange={(value) => setFormData({ ...formData, school_code: value })}
                    error={fieldErrors.school_code}
                    icon={<GraduationCap size={18} />}
                  />

                  <FloatingLabelInput
                    id="admission_no"
                    label="Student ID"
                    type="text"
                    value={formData.admission_no}
                    onChange={(value) => setFormData({ ...formData, admission_no: value })}
                    error={fieldErrors.admission_no}
                    icon={<User size={18} />}
                  />

                  <FloatingLabelInput
                    id="password"
                    label="Password"
                    type="password"
                    value={formData.password}
                    onChange={(value) => setFormData({ ...formData, password: value })}
                    error={fieldErrors.password}
                    icon={<Lock size={18} />}
                    showPasswordToggle
                  />

                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-[#5A7A95]" />
                      <span className="text-[#64748b]">Remember</span>
                    </label>
                    <Link href="/forgot-password" className="text-[#5A7A95] font-semibold">
                      Forgot?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#5A7A95] text-white font-bold rounded-xl shadow-md hover:bg-[#4a667d] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? "Signing In..." : "Sign In"}
                    {!loading && <ArrowRight size={18} />}
                  </button>
                </form>

                <div className="mt-5 pt-5 border-t border-gray-100 text-center space-y-3">
                  <Link href="/login" className="text-xs text-[#64748b] hover:text-[#5A7A95] flex items-center justify-center gap-1">
                    <span>← Back to roles</span>
                  </Link>
                  <p className="text-[10px] text-gray-400">
                    By signing in, you agree to our Terms & Privacy.
                  </p>
                </div>
              </div>
            </div>

            {/* Slim Trust Badges */}
            <div className="mt-4 flex items-center justify-center gap-4 text-gray-500 text-[10px] uppercase tracking-widest font-bold opacity-60">
              <div className="flex items-center gap-1"><Shield size={12} /> SECURE</div>
              <div className="flex items-center gap-1"><Lock size={12} /> ENCRYPTED</div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}