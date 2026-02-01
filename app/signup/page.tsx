'use client';

import React, { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { GraduationCap, AlertCircle, Loader2 } from 'lucide-react';

/* ---------------- VALIDATION ---------------- */

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[6-9]\d{9}$/; // India mobile
const zipRegex = /^\d{5,6}$/;
const nameRegex = /^[a-zA-Z\s.'-]{2,60}$/;
const schoolNameRegex = /^[A-Za-z\s.'&-]{3,100}$/; // NO digits allowed

const allowedSchoolTypes = ['Private','Public','Government','Other'];
const allowedAffiliations = ['CBSE','ICSE','State Board','Other'];

const currentYear = new Date().getFullYear();

const sanitize = (v: string) => v.trim().replace(/\s+/g, ' ');

/* ---------------- PAGE ---------------- */

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

  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

/* ---------------- FIELD VALIDATOR ---------------- */

const validateField = (field: string, raw: string) => {
  const v = sanitize(raw);

  switch(field) {
    case 'schoolName':
      if (!schoolNameRegex.test(v))
        return 'Only letters allowed (no digits)';
      return '';

    case 'schoolAddress':
      if (v.length < 5) return 'Valid address required';
      return '';

    case 'city':
    case 'state':
      if (!nameRegex.test(v)) return 'Invalid name';
      return '';

    case 'zipCode':
      if (!zipRegex.test(v)) return 'Invalid zip code';
      return '';

    case 'schoolEmail':
    case 'principalEmail':
      if (!emailRegex.test(v)) return 'Invalid email';
      return '';

    case 'schoolPhone':
    case 'principalPhone':
      if (!phoneRegex.test(v)) return 'Invalid phone';
      return '';

    case 'principalName':
      if (!nameRegex.test(v)) return 'Invalid name';
      return '';

    case 'establishedYear':
      const year = Number(v);
      if (!year || year < 1800 || year > currentYear)
        return `Year must be 1800–${currentYear}`;
      return '';

    case 'schoolType':
      if (!allowedSchoolTypes.includes(v)) return 'Select valid type';
      return '';

    case 'affiliation':
      if (!allowedAffiliations.includes(v)) return 'Select valid board';
      return '';

    default:
      return '';
  }
};

/* ---------------- CHANGE ---------------- */

const handleChange = (field: string, value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }));

  const msg = validateField(field, value);

  setFieldErrors(prev => {
    const next = { ...prev };
    if (msg) next[field] = msg;
    else delete next[field];
    return next;
  });
};

/* ---------------- FORM VALIDATION ---------------- */

const validateForm = () => {
  const errors: Record<string,string> = {};

  Object.entries(formData).forEach(([k,v]) => {
    if (k === 'country') return;
    const msg = validateField(k,v);
    if (msg) errors[k] = msg;
  });

  setFieldErrors(errors);
  return Object.keys(errors).length === 0;
};

/* ---------------- SUBMIT ---------------- */

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setError('');

  if (!validateForm()) return;

  setIsSubmitting(true);

  try {
    const payload = Object.fromEntries(
      Object.entries(formData).map(([k,v]) => [k, sanitize(v)])
    );

    const res = await fetch('/api/schools/signup', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json().catch(()=>({}));

    if (!res.ok) throw new Error(result.error || 'Server error');

    window.location.href = '/login';

  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Submission failed');
  } finally {
    setIsSubmitting(false);
  }
};

/* ---------------- UI ---------------- */

return (
<div className="min-h-screen bg-gradient-to-br from-[#667EEA]/10 via-[#764BA2]/10 to-[#F093FB]/10 flex items-center justify-center px-4 py-12">

<motion.div className="w-full max-w-5xl bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-10">

{/* HEADER */}
<div className="text-center mb-10">
  <div className="flex justify-center mb-4">
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#667EEA] via-[#764BA2] to-[#F093FB] flex items-center justify-center">
      <GraduationCap className="text-white" size={28} />
    </div>
  </div>
  <h1 className="text-4xl font-bold bg-gradient-to-r from-[#667EEA] via-[#764BA2] to-[#F093FB] bg-clip-text text-transparent">
    School Registration
  </h1>
</div>

<form onSubmit={handleSubmit} className="space-y-10">

<Section title="School Information">
  <Input label="School Name *"
    value={formData.schoolName}
    onChange={e => handleChange('schoolName', e.target.value.replace(/[0-9]/g,''))}
    error={fieldErrors.schoolName}
  />
  <Input label="Established Year *"
    value={formData.establishedYear}
    onChange={e => handleChange('establishedYear', e.target.value.replace(/\D/g,''))}
    error={fieldErrors.establishedYear}
  />
  <Select label="School Type *"
    value={formData.schoolType}
    onChange={e => handleChange('schoolType', e.target.value)}
    options={allowedSchoolTypes}
    error={fieldErrors.schoolType}
  />
  <Select label="Affiliation *"
    value={formData.affiliation}
    onChange={e => handleChange('affiliation', e.target.value)}
    options={allowedAffiliations}
    error={fieldErrors.affiliation}
  />
</Section>

<Section title="Address">
  <Input label="Address *" value={formData.schoolAddress}
    onChange={e => handleChange('schoolAddress', e.target.value)}
    error={fieldErrors.schoolAddress}
  />
  <Input label="City *" value={formData.city}
    onChange={e => handleChange('city', e.target.value)}
    error={fieldErrors.city}
  />
  <Input label="State *" value={formData.state}
    onChange={e => handleChange('state', e.target.value)}
    error={fieldErrors.state}
  />
  <Input label="Zip Code *" value={formData.zipCode}
    onChange={e => handleChange('zipCode', e.target.value.replace(/\D/g,''))}
    error={fieldErrors.zipCode}
  />
</Section>

<Section title="Contact">
  <Input label="School Email *" value={formData.schoolEmail}
    onChange={e => handleChange('schoolEmail', e.target.value)}
    error={fieldErrors.schoolEmail}
  />
  <Input label="School Phone *" value={formData.schoolPhone}
    onChange={e => handleChange('schoolPhone', e.target.value.replace(/\D/g,''))}
    error={fieldErrors.schoolPhone}
  />
</Section>

<Section title="Principal">
  <Input label="Principal Name *" value={formData.principalName}
    onChange={e => handleChange('principalName', e.target.value)}
    error={fieldErrors.principalName}
  />
  <Input label="Principal Email *" value={formData.principalEmail}
    onChange={e => handleChange('principalEmail', e.target.value)}
    error={fieldErrors.principalEmail}
  />
  <Input label="Principal Phone *" value={formData.principalPhone}
    onChange={e => handleChange('principalPhone', e.target.value.replace(/\D/g,''))}
    error={fieldErrors.principalPhone}
  />
</Section>

{error && (
<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex gap-2">
  <AlertCircle size={18} className="text-red-500"/>
  <p className="text-red-700 text-sm">{error}</p>
</div>
)}

<Button type="submit" disabled={isSubmitting}
className="w-full py-4 text-lg bg-gradient-to-r from-[#667EEA] via-[#764BA2] to-[#F5576C] text-white rounded-full shadow-xl">
{isSubmitting ? <Loader2 className="animate-spin"/> : 'Submit Registration'}
</Button>

</form>
</motion.div>
</div>
);
}

/* ---------------- HELPERS ---------------- */

function Section({title, children}:{title:string, children:React.ReactNode}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4 text-[#667EEA]">{title}</h3>
      <div className="grid md:grid-cols-2 gap-6">{children}</div>
    </div>
  );
}

function Select({label, options, error, ...props}:
{label:string; options:string[]; error?:string} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="text-sm font-semibold mb-1 block">{label}</label>
      <select {...props} className="w-full px-4 py-3 rounded-xl border border-gray-300">
        <option value="">Select</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
