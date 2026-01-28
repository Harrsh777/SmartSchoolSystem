'use client';

import { useState } from 'react';
import { Calendar, Clock, User, Mail, Phone, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';

const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => {
  const totalMinutes = 9 * 60 + i * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${hour.toString().padStart(2, '0')}:${minute === 0 ? '00' : minute}`;
});

const getNextDays = () => {
  return Array.from({ length: 9 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
};

// Validation utilities
const validateEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validatePhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

const formatPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  submit?: string;
}

export default function RequestDemoPage() {
  const [step, setStep] = useState(1);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [touched, setTouched] = useState({
    name: false,
    phone: false,
    email: false,
  });

  // Validation functions
  const validateStep3 = () => {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (form.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!form.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(form.phone)) {
      newErrors.phone = 'Please enter a valid phone number (10-15 digits)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: 'name' | 'phone' | 'email', value: string) => {
    if (field === 'phone') {
      const formatted = formatPhone(value);
      setForm({ ...form, [field]: formatted });
    } else {
      setForm({ ...form, [field]: value });
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const handleBlur = (field: 'name' | 'phone' | 'email') => {
    setTouched({ ...touched, [field]: true });
  };

  const submitDemo = async () => {
    if (!validateStep3()) return;

    setLoading(true);

    try {
      // Simulated API call - replace with actual Supabase call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // const { error } = await supabase.from('demo_requests').insert({
      //   name: form.name,
      //   phone: form.phone,
      //   email: form.email,
      //   demo_date: date.toISOString().split('T')[0],
      //   demo_time: time,
      // });

      setSuccess(true);
    } catch {
      setErrors({ submit: 'Failed to schedule demo. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const goToStep = (newStep: number) => {
    if (newStep === 2 && !date) return;
    if (newStep === 3 && !time) return;
    setStep(newStep);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center animate-in">
          <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Demo Scheduled!
          </h2>
          
          <p className="text-gray-600 mb-6 text-lg">
            An <span className="font-semibold text-violet-600">EduCore Executive</span> will contact you shortly to confirm your demo.
          </p>
          
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-violet-600" />
                <span className="font-medium">{date?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-violet-600" />
                <span className="font-medium">{time}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-500">
            <p>✓ Confirmation email sent to <span className="font-medium text-gray-700">{form.email}</span></p>
            <p>✓ Calendar invite will be sent shortly</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-violet-100 overflow-hidden">
        
        {/* Progress Bar */}
        <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 h-2">
          <div 
            className="h-full bg-white/30 transition-all duration-500 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-3">
              Request a Demo
            </h1>
            <p className="text-gray-500 text-lg">
              Schedule a personalized walkthrough with our experts
            </p>
            
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-3 mt-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    s === step 
                      ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg scale-110' 
                      : s < step 
                      ? 'bg-violet-100 text-violet-600' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {s < step ? '✓' : s}
                  </div>
                  {s < 3 && <div className={`w-12 h-1 mx-1 ${s < step ? 'bg-violet-200' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>
          </div>

          {/* STEP 1 – Calendar */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-6">
                <Calendar className="w-5 h-5 text-violet-600" />
                <p className="font-semibold text-lg text-gray-800">Select a date</p>
              </div>

              <div className="grid grid-cols-3 gap-3 md:gap-4">
                {getNextDays().map((d) => {
                  const isSelected = date?.toDateString() === d.toDateString();
                  const isToday = d.toDateString() === new Date().toDateString();

                  return (
                    <button
                      key={d.toDateString()}
                      onClick={() => setDate(new Date(d))}
                      className={`p-4 md:p-5 rounded-2xl border-2 text-center transition-all hover:scale-105 ${
                        isSelected
                          ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white border-transparent shadow-xl scale-105'
                          : 'border-gray-200 hover:border-violet-300 hover:shadow-md'
                      }`}
                    >
                      <p className={`text-xs font-medium mb-1 ${isSelected ? 'text-violet-100' : 'text-gray-500'}`}>
                        {d.toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      <p className="text-2xl md:text-3xl font-bold mb-1">{d.getDate()}</p>
                      <p className={`text-xs ${isSelected ? 'text-violet-100' : 'text-gray-500'}`}>
                        {d.toLocaleDateString('en-US', { month: 'short' })}
                      </p>
                      {isToday && !isSelected && (
                        <p className="text-xs text-violet-600 font-medium mt-1">Today</p>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={!date}
                onClick={() => goToStep(2)}
                className="w-full mt-8 py-4 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white font-semibold text-lg disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* STEP 2 – Time */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-violet-600" />
                  <p className="font-semibold text-lg text-gray-800">Select a time slot</p>
                </div>
                <button
                  onClick={() => goToStep(1)}
                  className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>

              <div className="bg-violet-50 rounded-2xl p-4 mb-6">
                <p className="text-sm text-gray-600 text-center">
                  📅 <span className="font-medium text-gray-800">{date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </p>
              </div>

              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3 max-h-96 overflow-y-auto pr-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setTime(slot)}
                    className={`py-3 px-2 rounded-xl border-2 text-sm font-medium transition-all hover:scale-105 ${
                      time === slot
                        ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white border-transparent shadow-lg'
                        : 'border-gray-200 hover:border-violet-300 hover:shadow-md'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => goToStep(1)}
                  className="px-6 py-4 rounded-full border-2 border-gray-200 font-semibold hover:border-violet-300 transition-all"
                >
                  Back
                </button>
                <button
                  disabled={!time}
                  onClick={() => goToStep(3)}
                  className="flex-1 py-4 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white font-semibold text-lg disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 – Details */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-violet-600" />
                  <p className="font-semibold text-lg text-gray-800">Your details</p>
                </div>
                <button
                  onClick={() => goToStep(2)}
                  className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>

              <div className="bg-violet-50 rounded-2xl p-4 mb-6 space-y-1">
                <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  {time}
                </p>
              </div>

              <div className="space-y-5">
                {/* Name Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="John Doe"
                      value={form.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      onBlur={() => handleBlur('name')}
                      className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 focus:outline-none transition-all ${
                        errors.name && touched.name
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-gray-200 focus:border-violet-500'
                      }`}
                    />
                  </div>
                  {errors.name && touched.name && (
                    <p className="text-red-500 text-sm mt-1 ml-1">{errors.name}</p>
                  )}
                </div>

                {/* Email Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      placeholder="john@company.com"
                      value={form.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 focus:outline-none transition-all ${
                        errors.email && touched.email
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-gray-200 focus:border-violet-500'
                      }`}
                    />
                  </div>
                  {errors.email && touched.email && (
                    <p className="text-red-500 text-sm mt-1 ml-1">{errors.email}</p>
                  )}
                </div>

                {/* Phone Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="123-456-7890"
                      value={form.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      onBlur={() => handleBlur('phone')}
                      className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 focus:outline-none transition-all ${
                        errors.phone && touched.phone
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-gray-200 focus:border-violet-500'
                      }`}
                    />
                  </div>
                  {errors.phone && touched.phone && (
                    <p className="text-red-500 text-sm mt-1 ml-1">{errors.phone}</p>
                  )}
                </div>
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                  {errors.submit}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => goToStep(2)}
                  className="px-6 py-4 rounded-full border-2 border-gray-200 font-semibold hover:border-violet-300 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={submitDemo}
                  disabled={loading}
                  className="flex-1 py-4 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white font-semibold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      Schedule Demo
                      <CheckCircle className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}