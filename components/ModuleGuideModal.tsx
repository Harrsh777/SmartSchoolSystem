'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, CheckCircle, ArrowRight, Info } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface GuideStep {
  stepNumber: number;
  title: string;
  description: string;
  details?: string[];
  icon?: React.ReactNode;
}

interface ModuleGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName: string;
  moduleIcon?: React.ReactNode;
  steps: GuideStep[];
  description?: string;
}

export default function ModuleGuideModal({
  isOpen,
  onClose,
  moduleName,
  moduleIcon,
  steps,
  description,
}: ModuleGuideModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-2 sm:p-4 overflow-hidden"
        onClick={onClose}
        style={{ zIndex: 99999 }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white/90 dark:bg-[#1e293b]/90 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-2xl border border-white/30 dark:border-white/20 w-full max-w-xs sm:max-w-md md:max-w-2xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
          style={{ zIndex: 100000 }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#5A7A95] via-[#6B9BB8] to-[#7DB5D3] p-4 sm:p-6 text-white flex-shrink-0">
            <div className="flex items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4">
              <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {moduleIcon || <BookOpen className="text-white" size={28} />}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold break-words">{moduleName} Setup Guide</h2>
                  {description && (
                    <p className="text-white/80 text-xs sm:text-sm mt-1 break-words">{description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <X size={20} className="text-white sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/80">
                  Step {currentStep + 1} of {steps.length}
                </span>
                <span className="text-sm text-white/80">
                  {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  className="bg-white rounded-full h-2"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 min-h-0">
            <div className="space-y-4 sm:space-y-6">
              {steps.map((step, index) => (
                <motion.div
                  key={step.stepNumber}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: index <= currentStep ? 1 : 0.5, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className={`p-4 sm:p-6 border-2 transition-all ${
                      index === currentStep
                        ? 'border-[#5A7A95] bg-[#5A7A95]/5 dark:bg-[#5A7A95]/10 shadow-lg'
                        : index < currentStep
                        ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Step Number */}
                      <div
                        className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-base sm:text-lg shadow-lg ${
                          index < currentStep
                            ? 'bg-green-500 text-white'
                            : index === currentStep
                            ? 'bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] text-white'
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {index < currentStep ? (
                          <CheckCircle size={20} className="sm:w-6 sm:h-6" />
                        ) : (
                          step.stepNumber
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start sm:items-center gap-2 mb-2 flex-wrap">
                          {step.icon && (
                            <div className="text-[#5A7A95] flex-shrink-0">{step.icon}</div>
                          )}
                          <h3
                            className={`text-base sm:text-lg md:text-xl font-bold break-words ${
                              index === currentStep
                                ? 'text-[#5A7A95] dark:text-[#6B9BB8]'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {step.title}
                          </h3>
                        </div>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 break-words">
                          {step.description}
                        </p>
                        {step.details && step.details.length > 0 && (
                          <div className="space-y-2 mt-3 sm:mt-4">
                            {step.details.map((detail, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300"
                              >
                                <ArrowRight
                                  size={14}
                                  className="text-[#5A7A95] mt-0.5 flex-shrink-0 sm:w-4 sm:h-4"
                                />
                                <span className="break-words">{detail}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Info Box */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <Info className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm sm:text-base text-blue-900 dark:text-blue-200 mb-1 break-words">
                    Need Help?
                  </p>
                  <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 break-words">
                    Follow the steps above in order. Each step builds upon the previous one. 
                    You can always come back to this guide by clicking the Guide button.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6 bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-sm flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="border-[#5A7A95]/30 text-[#5A7A95] hover:bg-[#5A7A95]/10 text-sm sm:text-base py-2 sm:py-2.5 px-3 sm:px-4 order-2 sm:order-1"
              >
                Previous
              </Button>
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 order-1 sm:order-2 overflow-x-auto pb-1 sm:pb-0">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`h-2 rounded-full transition-all flex-shrink-0 ${
                      idx === currentStep
                        ? 'bg-[#5A7A95] w-6 sm:w-8'
                        : idx < currentStep
                        ? 'bg-green-500 w-2'
                        : 'bg-gray-300 dark:bg-gray-600 w-2'
                    }`}
                    onClick={() => setCurrentStep(idx)}
                    aria-label={`Go to step ${idx + 1}`}
                  />
                ))}
              </div>
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                  className="bg-[#5A7A95] hover:bg-[#4a6a85] text-white text-sm sm:text-base py-2 sm:py-2.5 px-3 sm:px-4 order-3"
                >
                  Next
                  <ArrowRight size={16} className="ml-1.5 sm:ml-2 sm:w-[18px] sm:h-[18px]" />
                </Button>
              ) : (
                <Button
                  onClick={onClose}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base py-2 sm:py-2.5 px-3 sm:px-4 order-3"
                >
                  <CheckCircle size={16} className="mr-1.5 sm:mr-2 sm:w-[18px] sm:h-[18px]" />
                  Got it!
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
