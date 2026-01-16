'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { GraduationCap, Eye, EyeOff, AlertCircle, User, Lock, Lightbulb, Sparkles, Building2 } from 'lucide-react';

export default function StudentLoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    school_code: '',
    admission_no: '',
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
    
    if (!formData.admission_no.trim()) {
      errors.admission_no = 'Admission number is required';
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
      const response = await fetch('/api/auth/student/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Store session data
        sessionStorage.setItem('student', JSON.stringify(result.student));
        sessionStorage.setItem('role', 'student');
        
        // Store remember me preference
        if (rememberMe) {
          localStorage.setItem('rememberStudent', 'true');
        }
        
        // Redirect to student dashboard
        router.push('/student/dashboard');
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
        {/* Left Side - Educational Illustration */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="hidden lg:flex flex-col items-center justify-center relative h-full"
        >
          <div className="relative w-full max-w-md">
            {/* Main Student Character */}
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative z-10 flex flex-col items-center"
            >
              {/* Student Illustration */}
              <div className="relative mb-6">
                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center shadow-2xl shadow-[#6B9BB8]/30">
                  <GraduationCap className="text-white" size={80} />
                </div>
                {/* Floating elements */}
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-4 -right-4"
                >
                  <div className="w-12 h-12 rounded-full bg-yellow-400/80 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <Lightbulb className="text-yellow-600" size={24} />
                  </div>
                </motion.div>
                <motion.div
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute -bottom-4 -left-4"
                >
                  <div className="w-10 h-10 rounded-full bg-[#6B9BB8]/80 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <Sparkles className="text-white" size={20} />
                  </div>
                </motion.div>
              </div>

              {/* Books Stack */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-end gap-2 mb-4"
              >
                <div className="w-12 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-lg shadow-lg transform rotate-[-5deg]"></div>
                <div className="w-12 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg shadow-lg"></div>
                <div className="w-12 h-14 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-lg transform rotate-[5deg]"></div>
              </motion.div>

              {/* Blackboard */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="w-full max-w-xs bg-gradient-to-br from-[#567C8D] to-[#5A7A95] rounded-xl p-6 shadow-2xl border-4 border-[#6B9BB8]/30"
              >
                <div className="text-white font-mono space-y-2">
                  <div className="text-lg">2 + 2 = 4</div>
                  <div className="text-sm opacity-80">√9 = 3</div>
                  <div className="text-sm opacity-80">π ≈ 3.14</div>
                </div>
              </motion.div>

              {/* Science Beaker */}
              <motion.div
                initial={{ opacity: 0, rotate: -10 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ delay: 0.8 }}
                className="absolute top-1/4 right-0"
              >
                <div className="w-16 h-20 bg-white/90 backdrop-blur-sm rounded-b-lg border-2 border-[#6B9BB8] shadow-lg">
                  <div className="h-12 bg-gradient-to-t from-yellow-300 to-yellow-400 rounded-b-lg mt-1 mx-1"></div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Side - Sign In Form */}
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
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] text-white mb-4 shadow-lg shadow-[#6B9BB8]/30"
                >
                  <GraduationCap size={32} />
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent dark:text-white mb-2"
                >
                  SIGN IN
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-600 dark:text-gray-400 text-sm"
                >
                  Enter your credentials to access your student portal
                </motion.p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* School Code Field */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                      <div className="w-10 h-10 rounded-lg bg-[#F0F5F9] dark:bg-[#2F4156] flex items-center justify-center">
                        <Building2 className="text-[#5A7A95] dark:text-[#6B9BB8]" size={18} />
                      </div>
                    </div>
                    <Input
                      type="text"
                      value={formData.school_code}
                      onChange={(e) => handleChange('school_code', e.target.value.toUpperCase())}
                      placeholder="School Code"
                      required
                      className={`pl-14 pr-4 py-3.5 bg-white dark:bg-[#2F4156] border-2 rounded-xl text-navy dark:text-skyblue placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#6B9BB8] focus:ring-2 focus:ring-[#6B9BB8]/20 transition-all ${
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

                {/* Admission Number Field */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                      <div className="w-10 h-10 rounded-lg bg-[#F0F5F9] dark:bg-[#2F4156] flex items-center justify-center">
                        <User className="text-[#5A7A95] dark:text-[#6B9BB8]" size={18} />
                      </div>
                    </div>
                    <Input
                      type="text"
                      value={formData.admission_no}
                      onChange={(e) => handleChange('admission_no', e.target.value)}
                      placeholder="Admission Number"
                      required
                      className={`pl-14 pr-4 py-3.5 bg-white dark:bg-[#2F4156] border-2 rounded-xl text-navy dark:text-skyblue placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#6B9BB8] focus:ring-2 focus:ring-[#6B9BB8]/20 transition-all ${
                        fieldErrors.admission_no ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                  </div>
                  {fieldErrors.admission_no && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-red-600 dark:text-red-400 text-sm mt-1.5 flex items-center gap-1"
                    >
                      <AlertCircle size={14} />
                      {fieldErrors.admission_no}
                    </motion.p>
                  )}
                </motion.div>

                {/* Password Field */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
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
                      className={`pl-14 pr-12 py-3.5 bg-white dark:bg-[#2F4156] border-2 rounded-xl text-navy dark:text-skyblue placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#6B9BB8] focus:ring-2 focus:ring-[#6B9BB8]/20 transition-all ${
                        fieldErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-[#5A7A95] dark:hover:text-[#6B9BB8] transition-colors"
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
                  transition={{ delay: 0.8 }}
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
                  transition={{ delay: 0.9 }}
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
                      <span className="text-lg">LOGIN</span>
                    )}
                  </Button>
                </motion.div>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
