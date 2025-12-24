'use client';

import { Check } from 'lucide-react';

interface StepperProps {
  currentStep: 1 | 2 | 3 | 4;
}

export default function Stepper({ currentStep }: StepperProps) {
  const steps = [
    { number: 1, label: 'Download Template' },
    { number: 2, label: 'Upload File' },
    { number: 3, label: 'Review & Fix' },
    { number: 4, label: 'Import Complete' },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            {/* Step Circle */}
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  currentStep > step.number
                    ? 'bg-green-600 text-white'
                    : currentStep === step.number
                    ? 'bg-black text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {currentStep > step.number ? (
                  <Check size={20} />
                ) : (
                  step.number
                )}
              </div>
              <p
                className={`mt-2 text-sm font-medium ${
                  currentStep >= step.number ? 'text-black' : 'text-gray-500'
                }`}
              >
                {step.label}
              </p>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`h-1 flex-1 mx-2 transition-colors ${
                  currentStep > step.number ? 'bg-green-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

