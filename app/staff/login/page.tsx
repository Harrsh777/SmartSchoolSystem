'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import FloatingLabelInput from '@/components/auth/FloatingLabelInput';
import { 
  UserCheck, 
  Mail, 
  Lock, 
  ArrowRight, 
  Shield,
  Award,
  BookOpen,
  Star,
  GraduationCap,
  Target
} from 'lucide-react';

export default function StaffLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    school_code: '',
    staff_id: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rememberMe, setRememberMe] = useState(false);
  // focusedField and setFocusedField removed - not used

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
      const payload = {
        school_code: formData.school_code.trim(),
        staff_id: formData.staff_id.trim(),
        password: formData.password,
      };
      const response = await fetch('/api/auth/teacher/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        sessionStorage.setItem('teacher', JSON.stringify(result.teacher));
        sessionStorage.setItem('role', 'teacher');
        
        if (rememberMe) {
          localStorage.setItem('rememberStaff', 'true');
        }
        
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

  const professionalQuotes = [
    { text: "Empowering minds, shaping futures", icon: <GraduationCap className="w-5 h-5" /> },
    { text: "Education is the passport to the future", icon: <BookOpen className="w-5 h-5" /> },
    { text: "Teaching: where passion meets purpose", icon: <Star className="w-5 h-5" /> },
    { text: "Inspire, educate, transform", icon: <Target className="w-5 h-5" /> },
  ];

  const [currentQuote] = useState(() => 
    professionalQuotes[Math.floor(Math.random() * professionalQuotes.length)]
  );



  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-cyan-600 to-emerald-600">
        {/* Sophisticated Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Professional Educators Image */}
        <div className="absolute inset-0 flex items-center justify-center opacity-15">
          <motion.img
            src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&h=800&fit=crop&q=80"
            alt="Professional educators"
            className="w-full h-full object-cover"
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.15 }}
            transition={{ duration: 1.5 }}
          />
        </div>
      </div>

      {/* Animated Geometric Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating orbs with professional colors */}
        <motion.div
          className="absolute top-20 left-[10%] w-96 h-96 bg-white/10 rounded-full blur-3xl"
          animate={{
            y: [0, 60, 0],
            x: [0, 40, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-20 right-[10%] w-[500px] h-[500px] bg-cyan-300/10 rounded-full blur-3xl"
          animate={{
            y: [0, -60, 0],
            x: [0, -40, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-300/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.4, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

       
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Professional Welcome Section */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="hidden lg:flex flex-col space-y-10 px-8"
          >
            {/* Hero Image Section */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=800&h=600&fit=crop&q=80"
                  alt="Professional educators collaborating"
                  className="w-full h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-teal-900/90 via-teal-900/50 to-transparent" />
                
                {/* Overlay Content */}
                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-6 h-6 text-cyan-300" />
                      <span className="text-sm font-semibold text-cyan-200 uppercase tracking-wide">
                        Faculty Portal
                      </span>
                    </div>
                    <h1 className="text-5xl font-bold mb-3 leading-tight">
                      Welcome Back,
                      <br />
                      <span className="text-cyan-300">Educator</span>
                    </h1>
                    <p className="text-xl text-teal-100 font-medium">
                      Your impact continues here
                    </p>
                  </motion.div>
                </div>
              </div>

              {/* Floating Stats Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-2xl p-6 backdrop-blur-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Award className="text-white" size={28} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">95%</p>
                    <p className="text-sm text-gray-600">Success Rate</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Professional Quote Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="bg-white/95 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/50"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0 relative">
                  {currentQuote.icon}
                  <motion.div
                    className="absolute inset-0 bg-teal-400/20 rounded-xl"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <div>
                  <p className="text-sm text-teal-600 font-semibold mb-1 uppercase tracking-wide">
                    Professional Insight
                  </p>
                  <p className="text-2xl font-bold text-gray-900 leading-relaxed">
                    {currentQuote.text}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="grid grid-cols-3 gap-4"
            >
           
            </motion.div>

            {/* Feature Pills */}
            
          </motion.div>

          {/* Right Side - Login Form */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className="w-full max-w-md mx-auto lg:mx-0"
          >
            <motion.div
              className="bg-white rounded-3xl shadow-2xl overflow-hidden"
              whileHover={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
              transition={{ duration: 0.3 }}
            >
              {/* Form Header with Professional Gradient */}
              <div className="bg-gradient-to-br from-teal-600 via-cyan-600 to-emerald-600 p-8 text-center relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/10 rounded-full"
                  animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                />
                
                <div className="relative z-10">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm mb-4 shadow-lg border-2 border-white/30"
                  >
                    <UserCheck className="text-white" size={40} />
                  </motion.div>
                  
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Faculty Portal
                  </h2>
                  <p className="text-teal-50 text-sm font-medium">
                    Secure access for educators and administrators
                  </p>
                </div>
              </div>

              {/* Form Body */}
              <div className="p-8 md:p-10">
                {/* Error Message */}
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                        <p className="text-red-700 text-sm font-medium">{error}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <FloatingLabelInput
                      id="school_code"
                      label="Institution Code"
                      type="text"
                      value={formData.school_code}
                      onChange={(value) => setFormData({ ...formData, school_code: value })}
                      error={fieldErrors.school_code}
                      icon={<Shield size={20} />}
                      placeholder="e.g., INST2024"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <FloatingLabelInput
                      id="staff_id"
                      label="Staff ID / Official Email"
                      type="text"
                      value={formData.staff_id}
                      onChange={(value) => setFormData({ ...formData, staff_id: value })}
                      error={fieldErrors.staff_id}
                      icon={<Mail size={20} />}
                      placeholder="e.g., staff@institution.edu"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <FloatingLabelInput
                      id="password"
                      label="Password"
                      type="password"
                      value={formData.password}
                      onChange={(value) => setFormData({ ...formData, password: value })}
                      error={fieldErrors.password}
                      icon={<Lock size={20} />}
                      placeholder="Enter your secure password"
                      showPasswordToggle
                    />
                  </motion.div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="text-gray-600 group-hover:text-teal-600 transition-colors font-medium">
                        Remember this device
                      </span>
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-teal-600 hover:text-teal-700 font-semibold transition-colors"
                    >
                      Forgot Password?
                    </Link>
                  </div>

                 

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="w-full py-4 px-6 bg-gradient-to-r from-teal-600 via-cyan-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                  >
                    {/* Button Shimmer Effect */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    />
                    
                    <span className="relative z-10 flex items-center gap-3">
                      {loading ? (
                        <>
                          <motion.div
                            className="w-5 h-5 border-3 border-white border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                          />
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <span>Access Faculty Dashboard</span>
                          <ArrowRight 
                            size={20} 
                            className="group-hover:translate-x-1 transition-transform" 
                          />
                        </>
                      )}
                    </span>
                  </motion.button>
                </form>

                {/* Divider */}
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500 font-medium">
                      Need assistance?
                    </span>
                  </div>
                </div>

                {/* Footer Links */}
                <div className="text-center space-y-3">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-teal-600 font-medium transition-colors group"
                  >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span>
                    <span>Back to role selection</span>
                  </Link>
                  
                  <p className="text-xs text-gray-500">
                    By signing in, you agree to our{' '}
                    <Link href="/terms" className="text-teal-600 hover:underline">
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-teal-600 hover:underline">
                      Privacy Policy
                    </Link>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Support Card Below Form */}
           
          </motion.div>
        </div>
      </div>

      {/* Decorative Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 120" className="w-full h-auto">
          <path
            fill="rgba(255, 255, 255, 0.1)"
            d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
          />
        </svg>
      </div>
    </div>
  );
}