'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { 
  CheckCircle, 
  Sparkles, 
  Building2, 
  MapPin, 
  Phone, 
  User, 
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft
} from 'lucide-react';

// Add CSS for animations
const style = `
  @keyframes blob {
    0%, 100% {
      transform: translate(0, 0) scale(1);
    }
    33% {
      transform: translate(30px, -50px) scale(1.1);
    }
    66% {
      transform: translate(-20px, 20px) scale(0.9);
    }
  }
  .animate-blob {
    animation: blob 7s infinite;
  }
`;

export default function SignupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolAddress: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const steps = [
    { id: 1, title: 'School Info', icon: Building2 },
    { id: 2, title: 'Address', icon: MapPin },
    { id: 3, title: 'Contact', icon: Phone },
    { id: 4, title: 'Principal', icon: User },
  ];

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};
    
    if (step === 1) {
      if (!formData.schoolName.trim()) errors.schoolName = 'School name is required';
      if (!formData.schoolType.trim()) errors.schoolType = 'School type is required';
      if (!formData.affiliation.trim()) errors.affiliation = 'Affiliation is required';
      if (!formData.establishedYear.trim()) errors.establishedYear = 'Established year is required';
      if (formData.establishedYear && (parseInt(formData.establishedYear) < 1800 || parseInt(formData.establishedYear) > new Date().getFullYear())) {
        errors.establishedYear = 'Please enter a valid year';
      }
    } else if (step === 2) {
      if (!formData.schoolAddress.trim()) errors.schoolAddress = 'School address is required';
      if (!formData.city.trim()) errors.city = 'City is required';
      if (!formData.state.trim()) errors.state = 'State is required';
      if (!formData.zipCode.trim()) errors.zipCode = 'Zip code is required';
      if (!formData.country.trim()) errors.country = 'Country is required';
    } else if (step === 3) {
      if (!formData.schoolEmail.trim()) errors.schoolEmail = 'School email is required';
      if (formData.schoolEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.schoolEmail)) {
        errors.schoolEmail = 'Please enter a valid email address';
      }
      if (!formData.schoolPhone.trim()) errors.schoolPhone = 'School phone is required';
    } else if (step === 4) {
      if (!formData.principalName.trim()) errors.principalName = 'Principal name is required';
      if (!formData.principalEmail.trim()) errors.principalEmail = 'Principal email is required';
      if (formData.principalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.principalEmail)) {
        errors.principalEmail = 'Please enter a valid email address';
      }
      if (!formData.principalPhone.trim()) errors.principalPhone = 'Principal phone is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
      setError('');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateStep(currentStep)) {
      return;
    }

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
    // Clear error for this field when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const getProgress = () => {
    return (currentStep / steps.length) * 100;
  };

  return (
    <>
      <style jsx global>{style}</style>
      <div className="min-h-screen bg-gradient-to-br from-[#F5EFEB] via-[#F0F5F9] to-[#EBF2F7] dark:bg-[#0f172a] flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Decorative Blob Gradients */}
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-br from-purple-300/30 via-blue-300/30 to-cyan-300/30 rounded-full mix-blend-multiply filter blur-[80px] opacity-50 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-teal-300/25 via-green-300/25 to-emerald-300/25 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-pink-300/20 via-rose-300/20 to-orange-300/20 rounded-full mix-blend-multiply filter blur-[90px] opacity-35 animate-blob" style={{ animationDelay: '4s' }}></div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl relative z-10"
      >
        {/* Header */}
        <div className="mb-8">
          {/* Back Button */}
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="border-gray-300 dark:border-gray-600 text-navy dark:text-skyblue hover:bg-[#F0F5F9] dark:hover:bg-[#1e293b] transition-all"
            >
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
          </div>
          
          <div className="text-center">
            <Link href="/" className="inline-block mb-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="inline-flex items-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] flex items-center justify-center shadow-lg shadow-[#6B9BB8]/30">
                  <GraduationCap className="text-white" size={28} />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent dark:text-white">
                  EduCore
                </h1>
              </motion.div>
            </Link>
            <h2 className="text-3xl font-bold text-navy dark:text-skyblue mb-2">
              Join Our School Network
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">Complete your school registration in just a few steps</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.1 }}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition-all ${
                        isCompleted
                          ? 'bg-gradient-to-br from-[#6B9BB8] to-[#7DB5D3] border-[#6B9BB8] text-white shadow-lg shadow-[#6B9BB8]/30'
                          : isActive
                          ? 'bg-gradient-to-br from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] border-[#5A7A95] text-white shadow-lg shadow-[#5A7A95]/30'
                          : 'bg-white dark:bg-[#1e293b] border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={24} />
                      ) : (
                        <Icon size={24} />
                      )}
                    </motion.div>
                    <span className={`mt-2 text-xs font-semibold ${
                      isActive ? 'text-[#5A7A95] dark:text-[#6B9BB8]' : isCompleted ? 'text-[#6B9BB8] dark:text-[#7DB5D3]' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                      isCompleted ? 'bg-gradient-to-r from-[#6B9BB8] to-[#7DB5D3]' : 'bg-gray-200 dark:bg-gray-700'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${getProgress()}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] rounded-full shadow-lg"
            />
          </div>
        </div>

        {/* Main Form Card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          whileHover={{ scale: 1.01 }}
          className="bg-white/85 dark:bg-[#1e293b]/85 backdrop-blur-xl rounded-2xl shadow-2xl shadow-[#6B9BB8]/10 border border-white/60 dark:border-gray-700/50 overflow-hidden relative hover:shadow-[#6B9BB8]/20 transition-shadow duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#6B9BB8]/5 via-[#7DB5D3]/5 to-transparent pointer-events-none"></div>
          <div className="bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#6B9BB8]/20 to-transparent"></div>
            <div className="flex items-center gap-3 relative z-10">
              {(() => {
                const StepIcon = steps[currentStep - 1].icon;
                return (
                  <motion.div 
                    initial={{ rotate: -180, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg"
                  >
                    <StepIcon className="text-white" size={24} />
                  </motion.div>
                );
              })()}
              <div>
                <h3 className="text-2xl font-bold text-white">{steps[currentStep - 1].title}</h3>
                <p className="text-[#C8D9E6] text-sm">Step {currentStep} of {steps.length}</p>
              </div>
            </div>
          </div>

          <form onSubmit={currentStep === steps.length ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="p-8 relative z-10">
            <AnimatePresence mode="wait">
              {/* Step 1: School Information */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Input
                        label="School Name *"
                        type="text"
                        value={formData.schoolName}
                        onChange={(e) => handleChange('schoolName', e.target.value)}
                        placeholder="ABC International School"
                        required
                        error={fieldErrors.schoolName}
                        className={fieldErrors.schoolName ? 'border-red-300 focus:border-red-500' : ''}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-navy dark:text-skyblue mb-2">
                        School Type *
                      </label>
                      <select
                        value={formData.schoolType}
                        onChange={(e) => handleChange('schoolType', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9BB8] focus:border-[#6B9BB8] transition-all bg-white dark:bg-[#2F4156] text-navy dark:text-skyblue ${
                          fieldErrors.schoolType ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        required
                      >
                        <option value="">Select School Type</option>
                        <option value="Private">Private</option>
                        <option value="Public">Public</option>
                        <option value="International">International</option>
                        <option value="Government">Government</option>
                        <option value="Semi-Private">Semi-Private</option>
                      </select>
                      {fieldErrors.schoolType && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertCircle size={14} />
                          {fieldErrors.schoolType}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-navy dark:text-skyblue mb-2">
                        Affiliation *
                      </label>
                      <select
                        value={formData.affiliation}
                        onChange={(e) => handleChange('affiliation', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9BB8] focus:border-[#6B9BB8] transition-all bg-white dark:bg-[#2F4156] text-navy dark:text-skyblue ${
                          fieldErrors.affiliation ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        required
                      >
                        <option value="">Select Board</option>
                        <option value="CBSE">CBSE</option>
                        <option value="ICSE">ICSE</option>
                        <option value="State Board">State Board</option>
                        <option value="IB">IB (International Baccalaureate)</option>
                        <option value="IGCSE">IGCSE</option>
                        <option value="Other">Other</option>
                      </select>
                      {fieldErrors.affiliation && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertCircle size={14} />
                          {fieldErrors.affiliation}
                        </p>
                      )}
                    </div>

                    <div>
                      <Input
                        label="Established Year *"
                        type="number"
                        value={formData.establishedYear}
                        onChange={(e) => handleChange('establishedYear', e.target.value)}
                        placeholder="2000"
                        required
                        error={fieldErrors.establishedYear}
                        className={fieldErrors.establishedYear ? 'border-red-300 focus:border-red-500' : ''}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Address Information */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div>
                    <Input
                      label="School Address *"
                      type="text"
                      value={formData.schoolAddress}
                      onChange={(e) => handleChange('schoolAddress', e.target.value)}
                      placeholder="123 Main Street, Building Name"
                      required
                      error={fieldErrors.schoolAddress}
                      className={fieldErrors.schoolAddress ? 'border-red-300 focus:border-red-500' : ''}
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <Input
                        label="City *"
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        placeholder="City"
                        required
                        error={fieldErrors.city}
                        className={fieldErrors.city ? 'border-red-300 focus:border-red-500' : ''}
                      />
                    </div>
                    <div>
                      <Input
                        label="State *"
                        type="text"
                        value={formData.state}
                        onChange={(e) => handleChange('state', e.target.value)}
                        placeholder="State"
                        required
                        error={fieldErrors.state}
                        className={fieldErrors.state ? 'border-red-300 focus:border-red-500' : ''}
                      />
                    </div>
                    <div>
                      <Input
                        label="Zip Code *"
                        type="text"
                        value={formData.zipCode}
                        onChange={(e) => handleChange('zipCode', e.target.value)}
                        placeholder="123456"
                        required
                        error={fieldErrors.zipCode}
                        className={fieldErrors.zipCode ? 'border-red-300 focus:border-red-500' : ''}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-navy dark:text-skyblue mb-2">
                      Country *
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => handleChange('country', e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6B9BB8] focus:border-[#6B9BB8] transition-all bg-white dark:bg-[#2F4156] text-navy dark:text-skyblue ${
                        fieldErrors.country ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      required
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                      <option value="Other">Other</option>
                    </select>
                    {fieldErrors.country && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle size={14} />
                        {fieldErrors.country}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Contact Information */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Input
                        label="School Email *"
                        type="email"
                        value={formData.schoolEmail}
                        onChange={(e) => handleChange('schoolEmail', e.target.value)}
                        placeholder="admin@school.com"
                        required
                        error={fieldErrors.schoolEmail}
                        className={fieldErrors.schoolEmail ? 'border-red-300 focus:border-red-500' : ''}
                      />
                    </div>

                    <div>
                      <Input
                        label="School Phone *"
                        type="tel"
                        value={formData.schoolPhone}
                        onChange={(e) => handleChange('schoolPhone', e.target.value)}
                        placeholder="+91 1234567890"
                        required
                        error={fieldErrors.schoolPhone}
                        className={fieldErrors.schoolPhone ? 'border-red-300 focus:border-red-500' : ''}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Principal Information */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Input
                        label="Principal Name *"
                        type="text"
                        value={formData.principalName}
                        onChange={(e) => handleChange('principalName', e.target.value)}
                        placeholder="Dr. John Doe"
                        required
                        error={fieldErrors.principalName}
                        className={fieldErrors.principalName ? 'border-red-300 focus:border-red-500' : ''}
                      />
                    </div>

                    <div>
                      <Input
                        label="Principal Email *"
                        type="email"
                        value={formData.principalEmail}
                        onChange={(e) => handleChange('principalEmail', e.target.value)}
                        placeholder="principal@school.com"
                        required
                        error={fieldErrors.principalEmail}
                        className={fieldErrors.principalEmail ? 'border-red-300 focus:border-red-500' : ''}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Input
                        label="Principal Phone *"
                        type="tel"
                        value={formData.principalPhone}
                        onChange={(e) => handleChange('principalPhone', e.target.value)}
                        placeholder="+91 1234567890"
                        required
                        error={fieldErrors.principalPhone}
                        className={fieldErrors.principalPhone ? 'border-red-300 focus:border-red-500' : ''}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg flex items-start gap-3 backdrop-blur-sm"
              >
                <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-red-800 dark:text-red-300 text-sm font-medium">{error}</p>
              </motion.div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 relative z-10">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className={`${currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''} border-gray-300 dark:border-gray-600 text-navy dark:text-skyblue hover:bg-[#F0F5F9] dark:hover:bg-[#1e293b] transition-all`}
              >
                Previous
              </Button>
              
              {currentStep < steps.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] hover:from-[#6B9BB8] hover:via-[#7DB5D3] hover:to-[#8FC7E1] text-white shadow-lg shadow-[#6B9BB8]/30 hover:shadow-[#6B9BB8]/50 px-8 transition-all transform hover:scale-105"
                >
                  Next Step
                  <ArrowRight size={18} className="ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-[#6B9BB8] to-[#7DB5D3] hover:from-[#7DB5D3] hover:to-[#8FC7E1] text-white shadow-lg shadow-[#6B9BB8]/30 hover:shadow-[#6B9BB8]/50 px-8 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <CheckCircle2 size={18} className="ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </motion.div>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-[#5A7A95] dark:text-[#6B9BB8] font-semibold hover:text-[#6B9BB8] dark:hover:text-[#7DB5D3] hover:underline transition-colors">
              Sign in here
            </Link>
          </p>
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
              className="bg-white/95 dark:bg-[#1e293b]/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 relative overflow-hidden border border-white/60 dark:border-gray-700/50"
            >
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#6B9BB8]/30 to-[#7DB5D3]/30 rounded-full -mr-16 -mt-16 opacity-50 blur-xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#5A7A95]/30 to-[#6B9BB8]/30 rounded-full -ml-12 -mb-12 opacity-50 blur-xl" />
              
              <div className="relative z-10">
                {/* Success Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="flex justify-center mb-6"
                >
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#6B9BB8] to-[#7DB5D3] rounded-full flex items-center justify-center shadow-lg shadow-[#6B9BB8]/30">
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
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] bg-clip-text text-transparent dark:text-white mb-3">
                    Thank You for Signing Up!
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                    We&apos;ve received your school registration request. Our team will review your application and get back to you soon.
                  </p>
                </motion.div>

                {/* Additional Info */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-r from-[#F0F5F9] to-[#EBF2F7] dark:from-[#2F4156]/50 dark:to-[#1e293b]/50 rounded-xl p-4 mb-6 border border-[#C8D9E6]/50 dark:border-gray-700/50 backdrop-blur-sm"
                >
                  <p className="text-sm text-navy dark:text-skyblue text-center">
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
                    className="w-full bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] hover:from-[#6B9BB8] hover:via-[#7DB5D3] hover:to-[#8FC7E1] text-white shadow-lg shadow-[#6B9BB8]/30 hover:shadow-[#6B9BB8]/50 transition-all transform hover:scale-105"
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
    </>
  );
}
