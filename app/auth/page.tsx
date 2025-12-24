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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-black mb-2">
              Edu<span className="text-gray-600">Yan</span>
            </h1>
          </Link>
          <p className="text-gray-600">
            {isSignup ? 'Create your school account' : 'Sign in to your account'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
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
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <Button type="submit" variant="primary" className="w-full">
                    Sign In
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    New user?{' '}
                    <button
                      onClick={() => {
                        setIsSignup(true);
                        setError('');
                      }}
                      className="text-black font-semibold hover:underline"
                    >
                      Sign up
                    </button>
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center">
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
                    <button
                      onClick={() => {
                        setIsSignup(false);
                        setError('');
                      }}
                      className="text-black font-semibold hover:underline"
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

