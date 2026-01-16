'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { getSchoolByEmail, createSchoolSlug, saveSchool, type School } from '@/lib/demoData';

export default function AuthPage() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  const [signupData, setSignupData] = useState({
    schoolName: '',
    schoolAddress: '',
    schoolEmail: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Demo: Check if school exists
    const school = getSchoolByEmail(loginData.email);
    
    if (school) {
      // In a real app, verify password here
      const slug = createSchoolSlug(school.name);
      router.push(`/dashboard/${slug}`);
    } else {
      // Demo fallback: redirect to demo-school
      router.push('/dashboard/demo-school');
    }
  };

  const handleSignup = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (signupData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Check if email already exists
    if (getSchoolByEmail(signupData.schoolEmail)) {
      setError('An account with this email already exists');
      return;
    }

    // Create school object
    const slug = createSchoolSlug(signupData.schoolName);
    const newSchool: School = {
      id: slug,
      name: signupData.schoolName,
      email: signupData.schoolEmail,
      address: signupData.schoolAddress,
      setupCompleted: false,
    };

    // Save to localStorage (demo only)
    saveSchool(newSchool);

    // Redirect to dashboard
    router.push(`/dashboard/${slug}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5EFEB] via-[#F0F5F9] to-[#EBF2F7] dark:bg-[#0f172a] flex items-center justify-center px-4 py-12">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-0 w-72 h-72 bg-gradient-to-br from-[#5A7A95]/20 via-[#6B9BB8]/20 to-[#7DB5D3]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-gradient-to-br from-[#6B9BB8]/15 via-[#7DB5D3]/15 to-[#5A7A95]/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">E</span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent dark:text-white">
                EduCore
              </h1>
            </div>
          </Link>
          <p className="text-gray-600 dark:text-gray-400">
            {isSignup ? 'Create your school account' : 'Sign in to your account'}
          </p>
        </div>

        <div className="bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-[#E1E1DB] dark:border-[#2F4156]">
          <AnimatePresence mode="wait">
            {!isSignup ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <form onSubmit={handleLogin} className="space-y-6">
                  <Input
                    label="School Email"
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    placeholder="school@example.com"
                    required
                  />

                  <Input
                    label="Password"
                    type="password"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    placeholder="Enter your password"
                    required
                  />

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <Button type="submit" variant="primary" className="w-full">
                    Sign In
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    New user?{' '}
                    <button
                      onClick={() => {
                        setIsSignup(true);
                        setError('');
                      }}
                      className="text-[#5A7A95] dark:text-[#6B9BB8] font-semibold hover:underline"
                    >
                      Sign up
                    </button>
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-[#E1E1DB] dark:border-[#2F4156]">
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Demo Mode: Use any email to sign in
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <form onSubmit={handleSignup} className="space-y-5">
                  <Input
                    label="School Name"
                    type="text"
                    value={signupData.schoolName}
                    onChange={(e) => setSignupData({ ...signupData, schoolName: e.target.value })}
                    placeholder="ABC International School"
                    required
                  />

                  <Input
                    label="School Address"
                    type="text"
                    value={signupData.schoolAddress}
                    onChange={(e) => setSignupData({ ...signupData, schoolAddress: e.target.value })}
                    placeholder="123 Main Street, City, State"
                    required
                  />

                  <Input
                    label="School Email"
                    type="email"
                    value={signupData.schoolEmail}
                    onChange={(e) => setSignupData({ ...signupData, schoolEmail: e.target.value })}
                    placeholder="admin@school.com"
                    required
                  />

                  <Input
                    label="Password"
                    type="password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    placeholder="Create a password"
                    required
                  />

                  <Input
                    label="Confirm Password"
                    type="password"
                    value={signupData.confirmPassword}
                    onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                    placeholder="Confirm your password"
                    required
                  />

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <Button type="submit" variant="primary" className="w-full">
                    Create Account
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Already have an account?{' '}
                    <button
                      onClick={() => {
                        setIsSignup(false);
                        setError('');
                      }}
                      className="text-[#5A7A95] dark:text-[#6B9BB8] font-semibold hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

