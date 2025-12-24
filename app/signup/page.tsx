'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { CheckCircle, Sparkles } from 'lucide-react';
// Removed unused imports - now using API

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolAddress: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    schoolEmail: '',
    schoolPhone: '',
    principalName: '',
    principalEmail: '',
    principalPhone: '',
    establishedYear: '',
    schoolType: '',
    affiliation: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/schools/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to submit school information');
        setIsSubmitting(false);
        return;
      }

      // Success - show success modal
      setShowSuccessModal(true);
      setIsSubmitting(false);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError('An error occurred while submitting your information. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-black mb-2">
              Edu<span className="text-gray-600">-Yan</span>
            </h1>
          </Link>
          <h2 className="text-2xl font-semibold text-gray-900 mt-4 mb-2">
            Let&apos;s connect your school with our network
          </h2>
          <p className="text-gray-600">Fill up this form with your school information</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* School Basic Information */}
            <div className="border-b border-gray-200 pb-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">School Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="School Name"
                  type="text"
                  value={formData.schoolName}
                  onChange={(e) => handleChange('schoolName', e.target.value)}
                  placeholder="ABC International School"
                  required
                />

                <Input
                  label="School Type"
                  type="text"
                  value={formData.schoolType}
                  onChange={(e) => handleChange('schoolType', e.target.value)}
                  placeholder="Private, Public, International, etc."
                  required
                />

                <Input
                  label="Affiliation"
                  type="text"
                  value={formData.affiliation}
                  onChange={(e) => handleChange('affiliation', e.target.value)}
                  placeholder="CBSE, ICSE, State Board, etc."
                  required
                />

                <Input
                  label="Established Year"
                  type="number"
                  value={formData.establishedYear}
                  onChange={(e) => handleChange('establishedYear', e.target.value)}
                  placeholder="2000"
                  required
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="border-b border-gray-200 pb-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
              <div className="space-y-4">
                <Input
                  label="School Address"
                  type="text"
                  value={formData.schoolAddress}
                  onChange={(e) => handleChange('schoolAddress', e.target.value)}
                  placeholder="123 Main Street"
                  required
                />
                <div className="grid md:grid-cols-3 gap-4">
                  <Input
                    label="City"
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="City"
                    required
                  />
                  <Input
                    label="State"
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    placeholder="State"
                    required
                  />
                  <Input
                    label="Zip Code"
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => handleChange('zipCode', e.target.value)}
                    placeholder="123456"
                    required
                  />
                </div>
                <Input
                  label="Country"
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  placeholder="Country"
                  required
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-b border-gray-200 pb-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="School Email"
                  type="email"
                  value={formData.schoolEmail}
                  onChange={(e) => handleChange('schoolEmail', e.target.value)}
                  placeholder="admin@school.com"
                  required
                />

                <Input
                  label="School Phone"
                  type="tel"
                  value={formData.schoolPhone}
                  onChange={(e) => handleChange('schoolPhone', e.target.value)}
                  placeholder="+91 1234567890"
                  required
                />
              </div>
            </div>

            {/* Principal Information */}
            <div className="pb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Principal Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Principal Name"
                  type="text"
                  value={formData.principalName}
                  onChange={(e) => handleChange('principalName', e.target.value)}
                  placeholder="Dr. John Doe"
                  required
                />

                <Input
                  label="Principal Email"
                  type="email"
                  value={formData.principalEmail}
                  onChange={(e) => handleChange('principalEmail', e.target.value)}
                  placeholder="principal@school.com"
                  required
                />

                <Input
                  label="Principal Phone"
                  type="tel"
                  value={formData.principalPhone}
                  onChange={(e) => handleChange('principalPhone', e.target.value)}
                  placeholder="+91 1234567890"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-black font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden"
            >
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full -mr-16 -mt-16 opacity-50" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-full -ml-12 -mb-12 opacity-50" />
              
              <div className="relative z-10">
                {/* Success Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="flex justify-center mb-6"
                >
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                      <CheckCircle className="text-white" size={48} strokeWidth={2.5} />
                    </div>
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                      className="absolute -top-2 -right-2"
                    >
                      <Sparkles className="text-yellow-400" size={24} />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Success Message */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-center mb-6"
                >
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    Thank You for Signing Up!
                  </h2>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    We&apos;ve received your school registration request. Our team will review your application and get back to you soon.
                  </p>
                </motion.div>

                {/* Additional Info */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-6 border border-blue-100"
                >
                  <p className="text-sm text-gray-700 text-center">
                    <span className="font-semibold">What&apos;s next?</span> We&apos;ll review your information and send you an email with your school credentials once approved.
                  </p>
                </motion.div>

                {/* Action Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      setShowSuccessModal(false);
                      router.push('/');
                    }}
                  >
                    Return to Home
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

