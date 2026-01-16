'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { UserCheck, Eye, EyeOff, AlertCircle, Building2, User, Lock, BookOpen, Lightbulb, Sparkles, Award, ClipboardList, PenTool } from 'lucide-react';

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
  const [rememberMe, setRememberMe] = useState(false);

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
        
        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('rememberTeacher', 'true');
        }
        
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
    <div className="min-h-screen bg-gradient-to-br from-[#F5EFEB] via-[#F0F5F9] to-[#EBF2F7] dark:bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Blob Gradients */}
      <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-300/30 via-blue-300/30 to-cyan-300/30 rounded-full mix-blend-multiply filter blur-[80px] opacity-50 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-teal-300/25 via-green-300/25 to-emerald-300/25 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-pink-300/20 via-rose-300/20 to-orange-300/20 rounded-full mix-blend-multiply filter blur-[90px] opacity-35 animate-pulse" style={{ animationDelay: '4s' }}></div>

      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">
        {/* Left Side - Teacher Professional Illustration */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="hidden lg:flex flex-col items-center justify-center relative h-full"
        >
          <div className="relative w-full max-w-md">
            {/* Main Teacher Character */}
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative z-10"
            >
              {/* Teacher Figure */}
              <div className="relative mb-8 flex justify-center">
                {/* Professional Teacher Character */}
                <div className="relative">
                  {/* Head */}
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#C8D9E6] to-[#F5EFEB] flex items-center justify-center shadow-2xl relative z-20 mb-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] flex items-center justify-center">
                      <UserCheck className="text-white" size={40} />
                    </div>
                  </div>
                  
                  {/* Teaching Attire/Torso */}
                  <div className="absolute top-24 left-1/2 -translate-x-1/2 w-40 h-32 bg-gradient-to-br from-[#567C8D] to-[#5A7A95] rounded-2xl shadow-xl border-4 border-[#6B9BB8]/30">
                    {/* Teaching Badge/Clipboard */}
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-10 bg-white rounded-lg shadow-lg border-2 border-[#6B9BB8] flex items-center justify-center"
                    >
                      <ClipboardList className="text-[#5A7A95]" size={16} />
                    </motion.div>
                  </div>

                  {/* Floating Teaching Elements */}
                  <motion.div
                    animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-4 -left-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center shadow-lg">
                      <BookOpen className="text-white" size={24} />
                    </div>
                  </motion.div>

                  <motion.div
                    animate={{ y: [0, 10, 0], rotate: [0, -5, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="absolute -top-4 -right-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-yellow-400/80 backdrop-blur-sm flex items-center justify-center shadow-lg">
                      <Lightbulb className="text-yellow-600" size={20} />
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Teaching Setup */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="relative mt-8"
              >
                {/* Chalkboard */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="w-full max-w-xs mx-auto bg-gradient-to-br from-[#567C8D] to-[#5A7A95] rounded-xl p-6 shadow-2xl border-4 border-[#6B9BB8]/30 mb-6"
                >
                  <div className="text-white font-mono space-y-2">
                    <div className="text-lg flex items-center gap-2">
                      <span>ABC</span>
                      <motion.span
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="inline-block w-1 h-5 bg-white"
                      />
                    </div>
                    <div className="text-sm opacity-80">1 + 1 = 2</div>
                    <div className="text-sm opacity-80 flex items-center gap-1">
                      <PenTool size={12} />
                      <span>Teaching...</span>
                    </div>
                  </div>
                </motion.div>

                {/* Books and Teaching Materials */}
                <div className="flex items-end justify-center gap-3 mb-4">
                  <motion.div
                    animate={{ rotate: [0, 2, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-10 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-lg shadow-lg"
                  ></motion.div>
                  <motion.div
                    animate={{ rotate: [0, -2, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    className="w-10 h-18 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg shadow-lg"
                  ></motion.div>
                  <motion.div
                    animate={{ rotate: [0, 2, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                    className="w-10 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg shadow-lg"
                  ></motion.div>
                </div>

                {/* Award/Recognition Icon */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                  className="absolute -right-8 top-1/2 -translate-y-1/2"
                >
                  <div className="w-20 h-20 bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-sm rounded-xl shadow-xl border-2 border-[#6B9BB8]/30 flex items-center justify-center">
                    <Award className="text-[#5A7A95] dark:text-[#6B9BB8]" size={32} />
                  </div>
                </motion.div>

                {/* Sparkles/Stars */}
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 }}
                  className="absolute -left-8 bottom-8"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-[#6B9BB8] to-[#7DB5D3] rounded-xl shadow-xl flex items-center justify-center">
                    <Sparkles className="text-white" size={28} />
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full"
        >
          <div className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 dark:border-gray-700/50 p-8 md:p-10 relative overflow-hidden">
            {/* Decorative background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#6B9BB8]/5 via-[#7DB5D3]/5 to-transparent pointer-events-none"></div>
            
            <div className="relative z-10">
              {/* Header */}
              <div className="mb-8">
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent dark:text-white mb-2"
                >
                  Login
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-gray-600 dark:text-gray-400 text-sm"
                >
                  Access your staff portal
                </motion.p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* School Code Field */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="relative">
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                      <div className="w-10 h-10 rounded-lg bg-[#F0F5F9] dark:bg-[#2F4156] flex items-center justify-center">
                        <Building2 className="text-[#5A7A95] dark:text-[#6B9BB8]" size={18} />
                      </div>
                    </div>
                    <Input
                      type="text"
                      value={formData.school_code}
                      onChange={(e) => handleChange('school_code', e.target.value.toUpperCase())}
                      placeholder="school"
                      required
                      className={`pr-14 pl-4 py-3.5 bg-white dark:bg-[#2F4156] border-2 rounded-xl text-navy dark:text-skyblue placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#6B9BB8] focus:ring-2 focus:ring-[#6B9BB8]/20 transition-all ${
                        fieldErrors.school_code ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                  </div>
                  {fieldErrors.school_code && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-red-600 dark:text-red-400 text-sm mt-1.5 flex items-center gap-1"
                    >
                      <AlertCircle size={14} />
                      {fieldErrors.school_code}
                    </motion.p>
                  )}
                </motion.div>

                {/* Staff ID Field */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="relative">
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                      <div className="w-10 h-10 rounded-lg bg-[#F0F5F9] dark:bg-[#2F4156] flex items-center justify-center">
                        <User className="text-[#5A7A95] dark:text-[#6B9BB8]" size={18} />
                      </div>
                    </div>
                    <Input
                      type="text"
                      value={formData.staff_id}
                      onChange={(e) => handleChange('staff_id', e.target.value)}
                      placeholder="Staff ID"
                      required
                      className={`pr-14 pl-4 py-3.5 bg-white dark:bg-[#2F4156] border-2 rounded-xl text-navy dark:text-skyblue placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#6B9BB8] focus:ring-2 focus:ring-[#6B9BB8]/20 transition-all ${
                        fieldErrors.staff_id ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                  </div>
                  {fieldErrors.staff_id && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-red-600 dark:text-red-400 text-sm mt-1.5 flex items-center gap-1"
                    >
                      <AlertCircle size={14} />
                      {fieldErrors.staff_id}
                    </motion.p>
                  )}
                </motion.div>

                {/* Password Field */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="relative">
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                      <div className="w-10 h-10 rounded-lg bg-[#F0F5F9] dark:bg-[#2F4156] flex items-center justify-center">
                        <Lock className="text-[#5A7A95] dark:text-[#6B9BB8]" size={18} />
                      </div>
                    </div>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder="Password"
                      required
                      className={`pr-14 pl-4 py-3.5 bg-white dark:bg-[#2F4156] border-2 rounded-xl text-navy dark:text-skyblue placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#6B9BB8] focus:ring-2 focus:ring-[#6B9BB8]/20 transition-all ${
                        fieldErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-16 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-[#5A7A95] dark:hover:text-[#6B9BB8] transition-colors z-20"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-red-600 dark:text-red-400 text-sm mt-1.5 flex items-center gap-1"
                    >
                      <AlertCircle size={14} />
                      {fieldErrors.password}
                    </motion.p>
                  )}
                </motion.div>

                {/* Remember Me & Forgot Password */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="flex items-center justify-between"
                >
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#5A7A95] dark:text-[#6B9BB8] focus:ring-2 focus:ring-[#6B9BB8]/20 cursor-pointer"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-[#5A7A95] dark:group-hover:text-[#6B9BB8] transition-colors">
                      Remember Me
                    </span>
                  </label>
                  <button
                    type="button"
                    className="text-sm text-[#5A7A95] dark:text-[#6B9BB8] hover:text-[#6B9BB8] dark:hover:text-[#7DB5D3] font-medium transition-colors"
                  >
                    Forgot Password?
                  </button>
                </motion.div>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2"
                    >
                      <AlertCircle size={20} />
                      <span className="text-sm font-medium">{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Login Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] hover:from-[#6B9BB8] hover:via-[#7DB5D3] hover:to-[#8FC7E1] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#6B9BB8]/30 hover:shadow-[#6B9BB8]/50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <span className="text-lg">Login</span>
                    )}
                  </Button>
                </motion.div>
              </form>

              {/* Signup Link */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="mt-8 text-center"
              >
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Don&apos;t have account?{' '}
                  <Link
                    href="/signup"
                    className="text-[#5A7A95] dark:text-[#6B9BB8] hover:text-[#6B9BB8] dark:hover:text-[#7DB5D3] font-semibold underline transition-colors"
                  >
                    Let&apos;s Get Started For Free
                  </Link>
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
