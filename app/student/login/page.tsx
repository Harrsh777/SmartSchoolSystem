'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import FloatingLabelInput from '@/components/auth/FloatingLabelInput';
import { updateActivity } from '@/hooks/useSessionTimeout';

// Clear stale session timer when student lands on login so after login we get a fresh 20 min
const STUDENT_ACTIVITY_KEY = 'lastActivity_student';
import { 
  GraduationCap, 
  User, 
  Lock, 
  ArrowRight, 
  Sparkles, 
  BookOpen,
  Brain,
  Lightbulb,
  Trophy,
  Target,
  Zap,
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

  // Clear stale session timer when landing on login so after login we get a fresh 20 min
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STUDENT_ACTIVITY_KEY);
    }
  }, []);

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        sessionStorage.setItem('student', JSON.stringify(result.student));
        sessionStorage.setItem('role', 'student');
        // Start 20-minute session from login (student dashboard uses lastActivity_student)
        updateActivity('student', true);
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

  const motivationalQuotes = [
    { text: "Every expert was once a beginner", icon: <Brain className="w-5 h-5" /> },
    { text: "Your potential is limitless", icon: <Lightbulb className="w-5 h-5" /> },
    { text: "Small steps lead to big achievements", icon: <Trophy className="w-5 h-5" /> },
    { text: "Learning is a lifelong adventure", icon: <Target className="w-5 h-5" /> },
    { text: "Dream big, study smart", icon: <Zap className="w-5 h-5" /> },
  ];

  const [currentQuote] = useState(() => 
    motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]
  );

  const features = [
    { icon: BookOpen, title: 'Interactive Courses', description: '500+ courses' },
    { icon: Clock, title: 'Learn Anytime', description: '24/7 access' },
    { icon: Award, title: 'Certificates', description: 'Earn credentials' },
    { icon: Shield, title: 'Secure Platform', description: 'Data protected' },
  ];

  const floatingIcons = [
    { Icon: BookOpen, delay: 0, duration: 20 },
    { Icon: Brain, delay: 2, duration: 25 },
    { Icon: Lightbulb, delay: 4, duration: 22 },
    { Icon: Trophy, delay: 6, duration: 23 },
  ];

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navy Blue Gradient Background with Mesh */}
      <div className="absolute inset-0">
        {/* Animated gradient mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1),rgba(30,58,138,0.8),rgba(15,23,42,1))]" />
        
        {/* Grid Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Subtle dots pattern */}
        <div 
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(147, 197, 253, 0.8) 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
          }}
        />
      </div>

      {/* Glowing Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-[10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]"
          animate={{
            y: [0, 40, 0],
            x: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-20 right-[10%] w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[120px]"
          animate={{
            y: [0, -40, 0],
            x: [0, -30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        />
        <motion.div
          className="absolute top-1/3 right-1/4 w-80 h-80 bg-indigo-500/15 rounded-full blur-[100px]"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Floating Icons */}
        {floatingIcons.map(({ Icon, delay, duration }, index) => (
          <motion.div
            key={index}
            className="absolute text-blue-400/10"
            style={{
              left: `${15 + index * 20}%`,
              top: `${20 + (index % 3) * 25}%`,
            }}
            animate={{
              y: [0, -25, 0],
              rotate: [0, 180, 360],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration,
              repeat: Infinity,
              ease: 'easeInOut',
              delay,
            }}
          >
            <Icon size={48} />
          </motion.div>
        ))}
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left Side - Hero Section */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="hidden lg:flex flex-col space-y-8 px-4"
          >
            {/* Main Heading */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                className="inline-flex items-center gap-3 px-5 py-2.5 bg-blue-500/10 backdrop-blur-xl rounded-full border border-blue-400/20"
              >
                <Sparkles className="w-5 h-5 text-blue-400" />
                <span className="text-blue-300 text-sm font-semibold tracking-wide">
                  Welcome to Your Learning Portal
                </span>
              </motion.div>

              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                Empower Your
                <span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent mt-2">
                  Learning Journey
                </span>
              </h1>

              <p className="text-xl text-blue-200/80 leading-relaxed max-w-lg">
                Access world-class education, track your progress, and achieve your academic goals with our comprehensive student portal.
              </p>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-blue-400/30 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <Trophy className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">15K+</p>
                  </div>
                </div>
                <p className="text-blue-200/70 text-sm font-medium">Active Students</p>
              </div>

              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-blue-400/30 transition-all duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <BookOpen className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">500+</p>
                  </div>
                </div>
                <p className="text-blue-200/70 text-sm font-medium">Courses Available</p>
              </div>
            </motion.div>

            {/* Features Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-2 gap-4"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl rounded-xl p-5 border border-white/10 hover:border-blue-400/30 transition-all duration-300 group"
                >
                  <feature.icon className="w-8 h-8 text-blue-400 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="text-white font-semibold mb-1">{feature.title}</h3>
                  <p className="text-blue-200/60 text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Motivational Quote */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="relative bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-2xl p-6 border border-blue-400/20 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="relative flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0 relative">
                  {currentQuote.icon}
                  <motion.div
                    className="absolute inset-0 bg-white/20 rounded-xl"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
                <div>
                  <p className="text-xs text-blue-300 font-semibold mb-2 uppercase tracking-wider">
                    Daily Inspiration
                  </p>
                  <p className="text-xl font-bold text-white leading-relaxed">
                    &quot;{currentQuote.text}&quot;
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Side - Login Form */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className="w-full max-w-md mx-auto"
          >
            <motion.div
              className="bg-white/[0.08] backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/10"
              whileHover={{ boxShadow: '0 25px 50px -12px rgba(59, 130, 246, 0.25)' }}
              transition={{ duration: 0.3 }}
            >
              {/* Form Header */}
              <div className="relative bg-gradient-to-br from-blue-600/20 to-cyan-600/20 p-8 text-center border-b border-white/10">
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
                
                <div className="relative z-10">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 mb-4 shadow-lg"
                  >
                    <GraduationCap className="text-white" size={40} />
                  </motion.div>
                  
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Student Portal
                  </h2>
                  <p className="text-blue-200/80 text-sm font-medium">
                    Sign in to access your personalized dashboard
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
                      className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-xl"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                        <p className="text-red-300 text-sm font-medium">{error}</p>
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
                      label="School Code"
                      type="text"
                      value={formData.school_code}
                      onChange={(value) => setFormData({ ...formData, school_code: value })}
                      error={fieldErrors.school_code}
                      icon={<GraduationCap size={20} />}
                      placeholder="e.g., SCH2024"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <FloatingLabelInput
                      id="admission_no"
                      label="Student ID / Roll Number"
                      type="text"
                      value={formData.admission_no}
                      onChange={(value) => setFormData({ ...formData, admission_no: value })}
                      error={fieldErrors.admission_no}
                      icon={<User size={20} />}
                      placeholder="e.g., STU12345"
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

                  {/* Remember & Forgot */}
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-blue-400/30 bg-white/5 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                      />
                      <span className="text-blue-200/70 group-hover:text-blue-300 transition-colors">
                        Remember me
                      </span>
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
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
                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                  >
                    {/* Button Shimmer */}
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
                          <span>Signing In...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to Dashboard</span>
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
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-slate-900/50 text-blue-300/70 font-medium">
                      Need assistance?
                    </span>
                  </div>
                </div>

                {/* Footer Links */}
                <div className="text-center space-y-4">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-blue-300/70 hover:text-blue-300 font-medium transition-colors group"
                  >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span>
                    <span>Back to role selection</span>
                  </Link>
                  
                  <p className="text-xs text-blue-200/50 leading-relaxed">
                    By signing in, you agree to our{' '}
                    <Link href="/terms" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
                      Privacy Policy
                    </Link>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="mt-6 flex items-center justify-center gap-6 text-blue-300/60 text-xs"
            >
              <div className="flex items-center gap-2">
                <Shield size={16} />
                <span>Secure Login</span>
              </div>
              <div className="w-1 h-1 bg-blue-400/30 rounded-full" />
              <div className="flex items-center gap-2">
                <Lock size={16} />
                <span>Data Protected</span>
              </div>
              <div className="w-1 h-1 bg-blue-400/30 rounded-full" />
              <div className="flex items-center gap-2">
                <Award size={16} />
                <span>Verified Platform</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Wave Decoration */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none opacity-20">
        <svg viewBox="0 0 1440 120" className="w-full h-auto">
          <path
            fill="rgba(59, 130, 246, 0.1)"
            d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
          />
        </svg>
      </div>
    </div>
  );
}