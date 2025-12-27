'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Users, UserPlus, Upload, CheckCircle, ArrowRight } from 'lucide-react';

interface StudentSetupGuideProps {
  onComplete: () => void;
}

interface DetailData {
  type?: string;
  [key: string]: unknown;
}

export default function StudentSetupGuide({ onComplete }: StudentSetupGuideProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    {
      number: 1,
      title: 'Welcome to Students Management',
      icon: Users,
      description: 'Manage all your student records in one place. You can add students individually or import them in bulk using a CSV file.',
      details: [
        'View all your students in an organized table',
        'Search and filter students by name, class, or admission number',
        'Track student information including contact details and academic records',
        'Easily manage hundreds or thousands of students'
      ],
      color: 'bg-blue-500'
    },
    {
      number: 2,
      title: 'Adding Students',
      icon: UserPlus,
      description: 'You have two options to add students to your school:',
      details: [
        {
          type: 'single',
          title: 'Add Single Student',
          description: 'Perfect for adding one student at a time. Fill out a simple form with student details.',
          steps: [
            'Click the "Add Student" button',
            'Fill in the required information (Admission No, Name, Class, Section)',
            'Optionally add additional details like date of birth, parent contact, etc.',
            'Click "Add Student" to save'
          ]
        },
        {
          type: 'bulk',
          title: 'Bulk Import',
          description: 'Ideal for adding multiple students at once. Import from a CSV or Excel file.',
          steps: [
            'Click "Bulk Import" button',
            'Download the template file',
            'Fill in your student data',
            'Upload the file and review',
            'Fix any errors and import'
          ]
        }
      ],
      color: 'bg-green-500'
    },
    {
      number: 3,
      title: 'Managing Your Students',
      icon: CheckCircle,
      description: 'Once students are added, you can easily manage them:',
      details: [
        'Use the search bar to quickly find any student',
        'Filter students by class using the dropdown',
        'View student details by clicking "View"',
        'Edit student information by clicking "Edit"',
        'Track student status (Active, Inactive, Graduated, Transferred)',
        'View statistics at a glance in the summary cards'
      ],
      color: 'bg-purple-500'
    }
  ];

  const handleUnderstood = () => {
    setCompletedSteps(prev => [...prev, currentStep]);
    
    if (currentStep < 3) {
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
      }, 300);
    } else {
      // Mark setup as complete in localStorage
      localStorage.setItem('student_setup_completed', 'true');
      onComplete();
    }
  };

  const currentStepData = steps[currentStep - 1];
  const Icon = currentStepData.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl"
      >
        <Card className="relative">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-black">Student Setup Guide</h2>
              <span className="text-sm text-gray-600">
                Step {currentStep} of {steps.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
                className="bg-black h-2 rounded-full"
              />
            </div>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Step Header */}
              <div className="flex items-start gap-4">
                <div className={`${currentStepData.color} p-4 rounded-lg`}>
                  <Icon className="text-white" size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-black mb-2">
                    {currentStepData.title}
                  </h3>
                  <p className="text-gray-600">
                    {currentStepData.description}
                  </p>
                </div>
              </div>

              {/* Step Details */}
              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                {currentStep === 1 && (
                  <ul className="space-y-3">
                    {currentStepData.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle className="text-green-600 mt-0.5 flex-shrink-0" size={20} />
                        <span className="text-gray-700">{detail}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    {currentStepData.details.map((detail: DetailData, idx: number) => (
                      <div key={idx} className="border-l-4 border-gray-300 pl-4">
                        <div className="flex items-center gap-2 mb-2">
                          {detail.type === 'single' ? (
                            <UserPlus className="text-blue-600" size={20} />
                          ) : (
                            <Upload className="text-green-600" size={20} />
                          )}
                          <h4 className="font-semibold text-black">{detail.title}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{detail.description}</p>
                        <ol className="space-y-2 ml-6">
                          {detail.steps.map((step: string, stepIdx: number) => (
                            <li key={stepIdx} className="text-sm text-gray-700 list-decimal">
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                )}

                {currentStep === 3 && (
                  <ul className="space-y-3">
                    {currentStepData.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle className="text-purple-600 mt-0.5 flex-shrink-0" size={20} />
                        <span className="text-gray-700">{detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Step Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex gap-2">
                  {steps.map((step) => (
                    <div
                      key={step.number}
                      className={`w-2 h-2 rounded-full ${
                        step.number === currentStep
                          ? 'bg-black'
                          : completedSteps.includes(step.number)
                          ? 'bg-green-600'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <Button onClick={handleUnderstood} className="min-w-[140px]">
                  {currentStep < 3 ? (
                    <>
                      Understood
                      <ArrowRight size={18} className="ml-2" />
                    </>
                  ) : (
                    <>
                      Get Started
                      <CheckCircle size={18} className="ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}

