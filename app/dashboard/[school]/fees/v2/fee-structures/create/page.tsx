'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Loader2, FileText, DollarSign, Calendar, Settings } from 'lucide-react';

interface FeeHead {
  id: string;
  name: string;
  description: string | null;
  is_optional: boolean;
}

interface Class {
  id: string;
  class: string;
  section: string;
  academic_year: string;
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function CreateFeeStructurePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Step 1: Scope
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [academicYear, setAcademicYear] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  
  // Step 2: Duration
  const [startMonth, setStartMonth] = useState(4); // April
  const [endMonth, setEndMonth] = useState(3); // March (next year)
  const [frequency, setFrequency] = useState('monthly');
  
  // Step 3: Fee Composition
  const [selectedFeeHeads, setSelectedFeeHeads] = useState<Record<string, number>>({});
  
  // Step 4: Late Fee Rules
  const [lateFeeType, setLateFeeType] = useState('');
  const [lateFeeValue, setLateFeeValue] = useState('');
  const [gracePeriodDays, setGracePeriodDays] = useState(0);
  
  // Step 5: Review
  const [structureName, setStructureName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch classes
        const classesRes = await fetch(`/api/admin/classes?school_code=${schoolCode}`);
        const classesData = await classesRes.json();
        if (classesRes.ok) {
          setClasses(classesData.data || []);
        }

        // Fetch fee heads
        const headsRes = await fetch(`/api/v2/fees/fee-heads?school_code=${schoolCode}`);
        const headsData = await headsRes.json();
        if (headsRes.ok) {
          setFeeHeads(headsData.data || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, [schoolCode]);

  // Auto-generate structure name
  useEffect(() => {
    if (selectedClasses.size > 0 && frequency && startMonth && endMonth) {
      const startMonthName = MONTHS.find(m => m.value === startMonth)?.label || '';
      const endMonthName = MONTHS.find(m => m.value === endMonth)?.label || '';
      const classNames = Array.from(selectedClasses).join(', ');
      const sectionText = selectedSections.size > 0 ? ` (${Array.from(selectedSections).join(', ')})` : '';
      setStructureName(`${classNames}${sectionText} ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Fee ${startMonthName}-${endMonthName}`);
    }
  }, [selectedClasses, selectedSections, frequency, startMonth, endMonth]);

  // Get unique class names
  const uniqueClassNames = Array.from(new Set(classes.map(c => c.class))).sort();
  
  // Get unique sections for selected classes
  const availableSections = Array.from(new Set(
    classes
      .filter(c => selectedClasses.size === 0 || selectedClasses.has(c.class))
      .map(c => c.section)
      .filter(Boolean)
  )).sort();

  const handleToggleClass = (className: string) => {
    const newSelected = new Set(selectedClasses);
    if (newSelected.has(className)) {
      newSelected.delete(className);
      // Remove sections that belong only to this class
      const remainingClasses = Array.from(newSelected);
      const sectionsInRemainingClasses = new Set(
        classes
          .filter(c => remainingClasses.includes(c.class))
          .map(c => c.section)
          .filter(Boolean)
      );
      setSelectedSections(prev => {
        const newSections = new Set(prev);
        Array.from(prev).forEach(section => {
          if (!sectionsInRemainingClasses.has(section)) {
            newSections.delete(section);
          }
        });
        return newSections;
      });
    } else {
      newSelected.add(className);
    }
    setSelectedClasses(newSelected);
  };

  const handleToggleSection = (section: string) => {
    const newSelected = new Set(selectedSections);
    if (newSelected.has(section)) {
      newSelected.delete(section);
    } else {
      newSelected.add(section);
    }
    setSelectedSections(newSelected);
  };

  const handleNext = () => {
    setError('');
    
    if (step === 1) {
      if (selectedClasses.size === 0) {
        setError('Please select at least one class');
        return;
      }
    } else if (step === 3) {
      if (Object.keys(selectedFeeHeads).length === 0) {
        setError('Please select at least one fee head');
        return;
      }
      const hasZeroAmount = Object.values(selectedFeeHeads).some(amt => amt <= 0);
      if (hasZeroAmount) {
        setError('All fee head amounts must be greater than 0');
        return;
      }
    }
    
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSave = async () => {
    if (!structureName.trim()) {
      setError('Structure name is required');
      return;
    }

    if (selectedClasses.size === 0) {
      setError('Please select at least one class');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const items = Object.entries(selectedFeeHeads).map(([fee_head_id, amount]) => ({
        fee_head_id,
        amount,
      }));

      // Generate all class/section combinations
      const combinations: { class_name: string; section: string | null }[] = [];
      
      if (selectedSections.size === 0) {
        // If no sections selected, create structures for each class with null section (all sections)
        selectedClasses.forEach(className => {
          combinations.push({ class_name: className, section: null });
        });
      } else {
        // Create structures for each valid class/section combination
        selectedClasses.forEach(className => {
          const sectionsForClass = new Set(
            classes
              .filter(c => c.class === className)
              .map(c => c.section)
              .filter(Boolean)
          );
          
          // Find sections that are both selected AND exist for this class
          const relevantSections = Array.from(selectedSections).filter(section =>
            sectionsForClass.has(section)
          );
          
          if (relevantSections.length > 0) {
            // Create one structure per relevant section for this class
            relevantSections.forEach(section => {
              combinations.push({ class_name: className, section });
            });
          } else {
            // If no selected sections match this class, create structure for all sections (null)
            combinations.push({ class_name: className, section: null });
          }
        });
      }

      // Create all fee structures
      const createPromises = combinations.map(({ class_name, section }) => {
        const nameSuffix = section ? ` - ${section}` : '';
        const structureNameWithSuffix = `${structureName}${nameSuffix}`;
        
        return fetch('/api/v2/fees/fee-structures', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-staff-id': sessionStorage.getItem('staff_id') || '',
          },
          body: JSON.stringify({
            school_code: schoolCode,
            name: structureNameWithSuffix.trim(),
            class_name,
            section,
            academic_year: academicYear || null,
            start_month: startMonth,
            end_month: endMonth,
            frequency,
            late_fee_type: lateFeeType || null,
            late_fee_value: lateFeeValue ? parseFloat(lateFeeValue) : 0,
            grace_period_days: gracePeriodDays,
            items,
          }),
        });
      });

      const responses = await Promise.all(createPromises);
      const results = await Promise.all(responses.map(r => r.json()));

      const hasError = results.some(r => !r.data);
      if (hasError) {
        const errorResult = results.find(r => !r.data);
        setError(errorResult?.error || 'Failed to create some fee structures');
      } else {
        router.push(`/dashboard/${schoolCode}/fees/v2/fee-structures`);
      }
    } catch (err) {
      setError('Failed to create fee structures');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTotalAmount = () => {
    return Object.values(selectedFeeHeads).reduce((sum, amt) => sum + amt, 0);
  };

  const stepTitles = [
    'Scope',
    'Duration',
    'Fee Composition',
    'Late Fee Rules',
    'Review & Activate',
  ];

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button variant="outline" onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/fee-structures`)}>
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FileText size={32} className="text-indigo-600" />
            Create Fee Structure
          </h1>
          <p className="text-gray-600">Step-by-step wizard to create a new fee structure</p>
        </div>
      </motion.div>

      {/* Progress Steps */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          {stepTitles.map((title, index) => (
            <div key={index} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step > index + 1
                      ? 'bg-green-500 text-white'
                      : step === index + 1
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step > index + 1 ? <CheckCircle size={20} /> : index + 1}
                </div>
                <span className="mt-2 text-xs font-medium text-gray-600 text-center">{title}</span>
              </div>
              {index < stepTitles.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 ${
                    step > index + 1 ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <AlertCircle size={20} />
          {error}
        </motion.div>
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <Card>
            {/* Step 1: Scope */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Settings size={24} className="text-indigo-600" />
                  Step 1: Scope
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Classes * ({selectedClasses.size} selected)
                  </label>
                  <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto bg-white">
                    {uniqueClassNames.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No classes available</p>
                    ) : (
                      <div className="space-y-2">
                        {uniqueClassNames.map((className) => (
                          <label
                            key={className}
                            className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedClasses.has(className)}
                              onChange={() => handleToggleClass(className)}
                              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium text-gray-900">{className}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Select one or more classes. Leave sections unselected to apply to all sections.
                  </p>
                </div>

                {selectedClasses.size > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Sections (Optional) ({selectedSections.size} selected)
                    </label>
                    <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto bg-white">
                      {availableSections.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No sections available</p>
                      ) : (
                        <div className="space-y-2">
                          {availableSections.map((section) => (
                            <label
                              key={section}
                              className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedSections.has(section)}
                                onChange={() => handleToggleSection(section)}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                              />
                              <span className="text-sm font-medium text-gray-900">{section}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Select specific sections or leave unselected to apply to all sections of selected classes.
                    </p>
                  </div>
                )}

                <Input
                  label="Academic Year (Optional)"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g., 2024-25"
                />
              </div>
            )}

            {/* Step 2: Duration */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar size={24} className="text-indigo-600" />
                  Step 2: Duration
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Month *</label>
                    <select
                      value={startMonth}
                      onChange={(e) => setStartMonth(parseInt(e.target.value))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {MONTHS.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Month *</label>
                    <select
                      value={endMonth}
                      onChange={(e) => setEndMonth(parseInt(e.target.value))}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {MONTHS.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frequency *</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 3: Fee Composition */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign size={24} className="text-indigo-600" />
                  Step 3: Fee Composition
                </h2>

                <div className="space-y-3">
                  {feeHeads.map((head) => (
                    <div key={head.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{head.name}</span>
                          {head.is_optional && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Optional</span>
                          )}
                        </div>
                        {head.description && (
                          <p className="text-sm text-gray-600 mt-1">{head.description}</p>
                        )}
                      </div>
                      <div className="w-48">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={selectedFeeHeads[head.id] || ''}
                          onChange={(e) => {
                            const amt = parseFloat(e.target.value) || 0;
                            setSelectedFeeHeads({
                              ...selectedFeeHeads,
                              [head.id]: amt,
                            });
                          }}
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">Total Amount:</span>
                    <span className="text-2xl font-bold text-indigo-600">₹{getTotalAmount().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Late Fee Rules */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle size={24} className="text-indigo-600" />
                  Step 4: Late Fee Rules
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Late Fee Type</label>
                  <select
                    value={lateFeeType}
                    onChange={(e) => setLateFeeType(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No Late Fee</option>
                    <option value="flat">Flat Amount</option>
                    <option value="per_day">Per Day</option>
                    <option value="percentage">Percentage (of base amount per day)</option>
                  </select>
                </div>

                {lateFeeType && (
                  <>
                    <Input
                      label={lateFeeType === 'percentage' ? 'Percentage (%)' : 'Late Fee Value'}
                      type="number"
                      value={lateFeeValue}
                      onChange={(e) => setLateFeeValue(e.target.value)}
                      placeholder={lateFeeType === 'percentage' ? 'e.g., 0.5' : 'e.g., 50'}
                      min="0"
                      step="0.01"
                    />

                    <Input
                      label="Grace Period (Days)"
                      type="number"
                      value={gracePeriodDays.toString()}
                      onChange={(e) => setGracePeriodDays(parseInt(e.target.value) || 0)}
                      placeholder="e.g., 5"
                      min="0"
                    />
                  </>
                )}
              </div>
            )}

            {/* Step 5: Review */}
            {step === 5 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle size={24} className="text-indigo-600" />
                  Step 5: Review & Create
                </h2>

                <Input
                  label="Structure Name *"
                  value={structureName}
                  onChange={(e) => setStructureName(e.target.value)}
                  placeholder="Fee structure name"
                />

                <div className="mt-6 space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Classes ({selectedClasses.size}):</span>
                      <p className="font-semibold text-gray-900">
                        {selectedClasses.size > 0 ? Array.from(selectedClasses).join(', ') : 'None selected'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Sections ({selectedSections.size}):</span>
                      <p className="font-semibold text-gray-900">
                        {selectedSections.size > 0 ? Array.from(selectedSections).join(', ') : 'All Sections'}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Frequency:</span>
                      <p className="font-semibold text-gray-900 capitalize">{frequency}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Period:</span>
                      <p className="font-semibold text-gray-900">
                        {MONTHS.find(m => m.value === startMonth)?.label} - {MONTHS.find(m => m.value === endMonth)?.label}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Total Amount:</span>
                      <p className="font-semibold text-indigo-600">₹{getTotalAmount().toFixed(2)}</p>
                    </div>
                    {academicYear && (
                      <div>
                        <span className="text-sm text-gray-600">Academic Year:</span>
                        <p className="font-semibold text-gray-900">{academicYear}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <span className="text-sm text-gray-600">Fee Heads:</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(selectedFeeHeads).map(([headId, amount]) => {
                        const head = feeHeads.find(h => h.id === headId);
                        return head ? (
                          <span key={headId} className="px-3 py-1 bg-white border border-gray-200 rounded-md text-sm">
                            {head.name}: ₹{amount.toFixed(2)}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>

                  {lateFeeType && (
                    <div className="mt-4">
                      <span className="text-sm text-gray-600">Late Fee:</span>
                      <p className="font-semibold text-gray-900">
                        {lateFeeType} - ₹{lateFeeValue}
                        {lateFeeType === 'per_day' && '/day'}
                        {gracePeriodDays > 0 && ` • Grace Period: ${gracePeriodDays} days`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <Card>
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          {step < 5 ? (
            <Button
              onClick={handleNext}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Next
              <ArrowRight size={18} className="ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={loading || !structureName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle size={18} className="mr-2" />
                  Create Structure
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
