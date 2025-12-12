'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';

interface SetupWizardProps {
  schoolId: string;
  onComplete: () => void;
}

const steps = [
  {
    id: 1,
    title: 'Academic Configuration',
    description: 'Set up your academic year, terms, and grading system',
  },
  {
    id: 2,
    title: 'School Structure',
    description: 'Add branches, classes, and sections',
  },
  {
    id: 3,
    title: 'Fee Structure',
    description: 'Define your fee categories and amounts',
  },
  {
    id: 4,
    title: 'School Branding',
    description: 'Upload logo and customize colors',
  },
];

export default function SetupWizard({ schoolId, onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    academicYear: '',
    terms: '',
    gradingSystem: '',
    branches: '',
    classes: '',
    sections: '',
    feeCategories: '',
    logo: '',
    primaryColor: '#000000',
  });

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // In a real app, save this data
    // For demo, just mark as complete
    const schools = JSON.parse(localStorage.getItem('eduflow360_schools') || '[]');
    const schoolIndex = schools.findIndex((s: any) => s.id === schoolId);
    if (schoolIndex >= 0) {
      schools[schoolIndex].setupCompleted = true;
      localStorage.setItem('eduflow360_schools', JSON.stringify(schools));
    }
    onComplete();
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <Input
              label="Academic Year"
              value={formData.academicYear}
              onChange={(e) => handleChange('academicYear', e.target.value)}
              placeholder="2024-2025"
            />
            <Input
              label="Number of Terms"
              value={formData.terms}
              onChange={(e) => handleChange('terms', e.target.value)}
              placeholder="2 or 3"
            />
            <Input
              label="Grading System"
              value={formData.gradingSystem}
              onChange={(e) => handleChange('gradingSystem', e.target.value)}
              placeholder="Percentage / Letter Grade"
            />
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <Input
              label="Number of Branches"
              value={formData.branches}
              onChange={(e) => handleChange('branches', e.target.value)}
              placeholder="1"
            />
            <Input
              label="Classes (comma-separated)"
              value={formData.classes}
              onChange={(e) => handleChange('classes', e.target.value)}
              placeholder="1, 2, 3, 4, 5, 6, 7, 8, 9, 10"
            />
            <Input
              label="Sections per Class"
              value={formData.sections}
              onChange={(e) => handleChange('sections', e.target.value)}
              placeholder="A, B, C"
            />
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <Input
              label="Fee Categories (comma-separated)"
              value={formData.feeCategories}
              onChange={(e) => handleChange('feeCategories', e.target.value)}
              placeholder="Tuition, Library, Sports, Transport"
            />
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                You can configure detailed fee amounts for each category in the Fees section after setup.
              </p>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Color
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) => handleChange('primaryColor', e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                School Logo (URL)
              </label>
              <Input
                value={formData.logo}
                onChange={(e) => handleChange('logo', e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              <p className="mt-2 text-xs text-gray-500">
                For demo purposes, enter a logo URL. In production, this would be a file upload.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-black">Setup Your School</h2>
              <p className="text-gray-600 mt-1">Let's get you started in a few simple steps</p>
            </div>
            <button
              onClick={onComplete}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                        currentStep >= step.id
                          ? 'bg-black text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {step.id}
                    </div>
                    <p className="text-xs text-center mt-2 text-gray-600 hidden sm:block">
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 ${
                        currentStep > step.id ? 'bg-black' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <h3 className="text-xl font-bold text-black mb-2">
                  {steps[currentStep - 1].title}
                </h3>
                <p className="text-gray-600 mb-6">
                  {steps[currentStep - 1].description}
                </p>
                {renderStepContent()}
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ChevronLeft size={20} className="mr-2" />
              Previous
            </Button>
            <div className="text-sm text-gray-600">
              Step {currentStep} of {steps.length}
            </div>
            {currentStep < steps.length ? (
              <Button variant="primary" onClick={handleNext}>
                Next
                <ChevronRight size={20} className="ml-2" />
              </Button>
            ) : (
              <Button variant="primary" onClick={handleComplete}>
                Complete Setup
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

