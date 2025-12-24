'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { X, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';

interface TutorialStep {
  title: string;
  content: React.ReactNode;
}

interface TutorialModalProps {
  title: string;
  steps: TutorialStep[];
  onClose: () => void;
}

export default function TutorialModal({ title, steps, onClose }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl"
      >
        <Card className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-black">{title}</h2>
              <p className="text-sm text-gray-600 mt-1">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              {steps.map((_, index) => (
                <div key={index} className="flex items-center flex-1">
                  <button
                    onClick={() => goToStep(index)}
                    className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                      index === currentStep
                        ? 'bg-black text-white scale-110'
                        : index < currentStep
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {index < currentStep ? (
                      <CheckCircle size={20} />
                    ) : (
                      index + 1
                    )}
                  </button>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        index < currentStep ? 'bg-green-500' : 'bg-gray-200'
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
              className="min-h-[300px]"
            >
              <div className="mb-6">
                <h3 className="text-xl font-bold text-black mb-4">
                  {steps[currentStep].title}
                </h3>
                <div className="prose prose-sm max-w-none text-gray-700">
                  {steps[currentStep].content}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft size={18} className="mr-2" />
              Previous
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Skip Tutorial
              </Button>
              <Button onClick={nextStep}>
                {currentStep === steps.length - 1 ? 'Got it!' : 'Next'}
                <ChevronRight size={18} className="ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

