'use client';

import { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import {
  GraduationCap,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function SignupPage() {

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

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      const updated = { ...fieldErrors };
      delete updated[field];
      setFieldErrors(updated);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.schoolName) errors.schoolName = 'Required';
    if (!formData.schoolType) errors.schoolType = 'Required';
    if (!formData.affiliation) errors.affiliation = 'Required';
    if (!formData.establishedYear) errors.establishedYear = 'Required';

    if (!formData.schoolAddress) errors.schoolAddress = 'Required';
    if (!formData.city) errors.city = 'Required';
    if (!formData.state) errors.state = 'Required';
    if (!formData.zipCode) errors.zipCode = 'Required';

    if (!formData.schoolEmail) errors.schoolEmail = 'Required';
    if (!formData.schoolPhone) errors.schoolPhone = 'Required';

    if (!formData.principalName) errors.principalName = 'Required';
    if (!formData.principalEmail) errors.principalEmail = 'Required';
    if (!formData.principalPhone) errors.principalPhone = 'Required';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/schools/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      // Success - could redirect or show success message
      window.location.href = '/login';
    } catch {
      setError('Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667EEA]/10 via-[#764BA2]/10 to-[#F093FB]/10 flex items-center justify-center px-4 py-12">
      <motion.div className="w-full max-w-5xl bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-10">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#667EEA] via-[#764BA2] to-[#F093FB] flex items-center justify-center">
              <GraduationCap className="text-white" size={28} />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#667EEA] via-[#764BA2] to-[#F093FB] bg-clip-text text-transparent">
            School Registration
          </h1>
          <p className="text-gray-600 mt-2">
            Register your institution with EduCore
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">

          {/* School Info */}
          <Section title="School Information">
            <Input label="School Name *" value={formData.schoolName} onChange={e => handleChange('schoolName', e.target.value)} error={fieldErrors.schoolName} />
            <Input label="Established Year *" value={formData.establishedYear} onChange={e => handleChange('establishedYear', e.target.value)} error={fieldErrors.establishedYear} />
            <Select label="School Type *" value={formData.schoolType} onChange={(e: { target: { value: string; }; }) => handleChange('schoolType', e.target.value)} error={fieldErrors.schoolType}
              options={['Private','Public','Government','Other']} />
            <Select label="Affiliation *" value={formData.affiliation} onChange={(e: { target: { value: string; }; }) => handleChange('affiliation', e.target.value)} error={fieldErrors.affiliation}
              options={['CBSE','ICSE','State Board','Other']} />
          </Section>

          {/* Address */}
          <Section title="Address Details">
            <Input label="Address *" value={formData.schoolAddress} onChange={e => handleChange('schoolAddress', e.target.value)} error={fieldErrors.schoolAddress} />
            <Input label="City *" value={formData.city} onChange={e => handleChange('city', e.target.value)} error={fieldErrors.city} />
            <Input label="State *" value={formData.state} onChange={e => handleChange('state', e.target.value)} error={fieldErrors.state} />
            <Input label="Zip Code *" value={formData.zipCode} onChange={e => handleChange('zipCode', e.target.value)} error={fieldErrors.zipCode} />
          </Section>

          {/* Contact */}
          <Section title="Contact Information">
            <Input label="School Email *" value={formData.schoolEmail} onChange={e => handleChange('schoolEmail', e.target.value)} error={fieldErrors.schoolEmail} />
            <Input label="School Phone *" value={formData.schoolPhone} onChange={e => handleChange('schoolPhone', e.target.value)} error={fieldErrors.schoolPhone} />
          </Section>

          {/* Principal */}
          <Section title="Principal Details">
            <Input label="Principal Name *" value={formData.principalName} onChange={e => handleChange('principalName', e.target.value)} error={fieldErrors.principalName} />
            <Input label="Principal Email *" value={formData.principalEmail} onChange={e => handleChange('principalEmail', e.target.value)} error={fieldErrors.principalEmail} />
            <Input label="Principal Phone *" value={formData.principalPhone} onChange={e => handleChange('principalPhone', e.target.value)} error={fieldErrors.principalPhone} />
          </Section>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex gap-2">
              <AlertCircle size={18} className="text-red-500" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 text-lg bg-gradient-to-r from-[#667EEA] via-[#764BA2] to-[#F5576C] text-white rounded-full shadow-xl hover:scale-[1.02]"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Submit Registration'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

/* Helpers */
interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4 text-[#667EEA]">{title}</h3>
      <div className="grid md:grid-cols-2 gap-6">{children}</div>
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: string[];
  error?: string;
}

function Select({ label, options, error, ...props }: SelectProps) {
  return (
    <div>
      <label className="text-sm font-semibold mb-1 block">{label}</label>
      <select {...props} className="w-full px-4 py-3 rounded-xl border border-gray-300">
        <option value="">Select</option>
        {options.map((o: string) => <option key={o}>{o}</option>)}
      </select>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
