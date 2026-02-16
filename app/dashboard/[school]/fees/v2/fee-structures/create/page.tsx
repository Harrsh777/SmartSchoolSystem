'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Loader2, FileText, IndianRupee, Calendar, Settings } from 'lucide-react';

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
  
  // Step 1: Scope - Class → Section mapping (each class has its own list of sections)
  const [classSectionMap, setClassSectionMap] = useState<Array<{ class: string; sections: string[] }>>([]);
  const [addClassValue, setAddClassValue] = useState('');
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const [expandedClassRows, setExpandedClassRows] = useState<Set<string>>(new Set());
  const [academicYear, setAcademicYear] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [feeHeads, setFeeHeads] = useState<FeeHead[]>([]);
  
  // Step 2: Duration
  const [startMonth, setStartMonth] = useState(4); // April
  const [endMonth, setEndMonth] = useState(3); // March (next year)
  const [frequency, setFrequency] = useState('monthly');
  
  // Step 3: Fee Composition - yearly: single; monthly: by month; quarterly: by Q1–Q4
  const [selectedFeeHeads, setSelectedFeeHeads] = useState<Record<string, number>>({});
  const [selectedFeeHeadsByMonth, setSelectedFeeHeadsByMonth] = useState<Record<string, Record<string, number>>>({});
  const [selectedFeeHeadsByQuarter, setSelectedFeeHeadsByQuarter] = useState<Record<string, Record<string, number>>>({
    Q1: {},
    Q2: {},
    Q3: {},
    Q4: {},
  });
  const [activeCompositionTab, setActiveCompositionTab] = useState<string>(''); // month number or Q1–Q4
  
  // Step 4: Late Fee Rules
  const [lateFeeType, setLateFeeType] = useState('');
  const [lateFeeValue, setLateFeeValue] = useState('');
  const [gracePeriodDays, setGracePeriodDays] = useState(0);
  
  // Step 5: Review
  const [structureName, setStructureName] = useState('');

  useEffect(() => {
    if (step === 3) {
      if (frequency === 'monthly') {
        const months = getMonthsInRange();
        if (months.length > 0) setActiveCompositionTab((prev) => prev || String(months[0].value));
      } else if (frequency === 'quarterly') {
        setActiveCompositionTab((prev) => prev || 'Q1');
      }
    }
  }, [step, frequency, startMonth, endMonth]);

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

  // Auto-generate structure name from classSectionMap
  useEffect(() => {
    if (classSectionMap.length > 0 && frequency && startMonth && endMonth) {
      const startMonthName = MONTHS.find(m => m.value === startMonth)?.label || '';
      const endMonthName = MONTHS.find(m => m.value === endMonth)?.label || '';
      const classNames = classSectionMap.map((e) => e.class).join(', ');
      const sectionSummary = classSectionMap
        .map((e) => (e.sections.length === 0 ? 'all' : `(${e.sections.join(', ')})`))
        .join(' ');
      setStructureName(`${classNames} ${sectionSummary} ${frequency.charAt(0).toUpperCase() + frequency.slice(1)} Fee ${startMonthName}-${endMonthName}`);
    }
  }, [classSectionMap, frequency, startMonth, endMonth]);

  const uniqueClassNames = Array.from(new Set(classes.map((c) => c.class))).sort();

  const sectionsForClass = (className: string) =>
    Array.from(new Set(classes.filter((c) => c.class === className).map((c) => c.section).filter(Boolean))).sort();

  const classesAlreadyAdded = classSectionMap.map((e) => e.class);
  const availableToAdd = uniqueClassNames.filter((c) => !classesAlreadyAdded.includes(c));
  const filteredAvailableToAdd = classSearchQuery.trim()
    ? availableToAdd.filter((c) => c.toLowerCase().includes(classSearchQuery.toLowerCase()))
    : availableToAdd;

  const toggleClassRowExpanded = (className: string) => {
    setExpandedClassRows((prev) => {
      const next = new Set(prev);
      if (next.has(className)) next.delete(className);
      else next.add(className);
      return next;
    });
  };

  const hasCompositionData = () => {
    if (frequency === 'yearly') return Object.keys(selectedFeeHeads).length > 0 && Object.values(selectedFeeHeads).some((a) => a > 0);
    if (frequency === 'quarterly') return QUARTERS.some((q) => Object.keys(selectedFeeHeadsByQuarter[q.id] || {}).length > 0);
    if (frequency === 'monthly') return Object.keys(selectedFeeHeadsByMonth).length > 0;
    return false;
  };

  const handleFrequencyChange = (newFrequency: string) => {
    if (step === 3 && hasCompositionData() && newFrequency !== frequency) {
      if (!confirm('Changing frequency will reset entered fee data (amounts per month/quarter/year). Continue?')) return;
      setSelectedFeeHeads({});
      setSelectedFeeHeadsByMonth({});
      setSelectedFeeHeadsByQuarter({ Q1: {}, Q2: {}, Q3: {}, Q4: {} });
      setActiveCompositionTab('');
    }
    setFrequency(newFrequency);
  };

  const handleAddClass = (className: string) => {
    if (!className || classesAlreadyAdded.includes(className)) return;
    setClassSectionMap((prev) => [...prev, { class: className, sections: [] }]);
    setAddClassValue('');
  };

  const handleRemoveClass = (className: string) => {
    setClassSectionMap((prev) => prev.filter((e) => e.class !== className));
  };

  const handleToggleSection = (className: string, section: string) => {
    setClassSectionMap((prev) =>
      prev.map((e) => {
        if (e.class !== className) return e;
        const has = e.sections.includes(section);
        return {
          ...e,
          sections: has ? e.sections.filter((s) => s !== section) : [...e.sections, section].sort(),
        };
      })
    );
  };

  const handleSelectAllSections = (className: string) => {
    const all = sectionsForClass(className);
    setClassSectionMap((prev) =>
      prev.map((e) => (e.class === className ? { ...e, sections: all } : e))
    );
  };

  const handleClearSections = (className: string) => {
    setClassSectionMap((prev) =>
      prev.map((e) => (e.class === className ? { ...e, sections: [] } : e))
    );
  };

  const handleNext = () => {
    setError('');
    
    if (step === 1) {
      if (classSectionMap.length === 0) {
        setError('Please add at least one class');
        return;
      }
    } else if (step === 3) {
      if (frequency === 'yearly') {
        if (Object.keys(selectedFeeHeads).length === 0) {
          setError('Please select at least one fee head and enter amounts');
          return;
        }
        const hasZeroAmount = Object.values(selectedFeeHeads).some((amt) => amt <= 0);
        if (hasZeroAmount) {
          setError('All fee head amounts must be greater than 0');
          return;
        }
      } else if (frequency === 'quarterly') {
        for (const q of QUARTERS) {
          const amts = selectedFeeHeadsByQuarter[q.id] || {};
          if (Object.keys(amts).length === 0 || Object.values(amts).some((a) => a <= 0)) {
            setError(`Please enter fee amounts for ${q.id}`);
            return;
          }
        }
      } else if (frequency === 'monthly') {
        const months = getMonthsInRange();
        for (const mo of months) {
          const amts = selectedFeeHeadsByMonth[String(mo.value)] || {};
          if (Object.keys(amts).length === 0 || Object.values(amts).some((a) => a <= 0)) {
            setError(`Please enter fee amounts for ${mo.label}`);
            return;
          }
        }
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

    if (classSectionMap.length === 0) {
      setError('Please add at least one class');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const items = Object.entries(selectedFeeHeads).map(([fee_head_id, amount]) => ({
        fee_head_id,
        amount,
      }));

      const baseCombinations: { class_name: string; section: string | null }[] = [];
      classSectionMap.forEach(({ class: className, sections }) => {
        if (sections.length === 0) {
          baseCombinations.push({ class_name: className, section: null });
        } else {
          sections.forEach((section) => {
            baseCombinations.push({ class_name: className, section });
          });
        }
      });

      type CreatePayload = { class_name: string; section: string | null; name: string; items: { fee_head_id: string; amount: number }[] };
      const toCreate: CreatePayload[] = [];

      if (frequency === 'yearly') {
        const items = Object.entries(selectedFeeHeads).map(([fee_head_id, amount]) => ({ fee_head_id, amount }));
        baseCombinations.forEach(({ class_name, section }) => {
          const nameSuffix = section ? ` - ${section}` : '';
          toCreate.push({
            class_name,
            section,
            name: `${structureName}${nameSuffix}`.trim(),
            items,
          });
        });
      } else if (frequency === 'quarterly') {
        QUARTERS.forEach((q) => {
          const items = Object.entries(selectedFeeHeadsByQuarter[q.id] || {}).map(([fee_head_id, amount]) => ({
            fee_head_id,
            amount,
          }));
          baseCombinations.forEach(({ class_name, section }) => {
            const nameSuffix = section ? ` - ${section}` : '';
            toCreate.push({
              class_name,
              section,
              name: `${structureName} ${q.id}${nameSuffix}`.trim(),
              items,
            });
          });
        });
      } else if (frequency === 'monthly') {
        const months = getMonthsInRange();
        months.forEach((mo) => {
          const key = String(mo.value);
          const items = Object.entries(selectedFeeHeadsByMonth[key] || {}).map(([fee_head_id, amount]) => ({
            fee_head_id,
            amount,
          }));
          baseCombinations.forEach(({ class_name, section }) => {
            const nameSuffix = section ? ` - ${section}` : '';
            toCreate.push({
              class_name,
              section,
              name: `${structureName} - ${mo.label}${nameSuffix}`.trim(),
              items,
            });
          });
        });
      }

      const createPromises = toCreate.map(({ class_name, section, name: structureNameWithSuffix, items: itemsPayload }) =>
        fetch('/api/v2/fees/fee-structures', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-staff-id': sessionStorage.getItem('staff_id') || '',
          },
          body: JSON.stringify({
            school_code: schoolCode,
            name: structureNameWithSuffix,
            class_name,
            section,
            academic_year: academicYear || null,
            start_month: startMonth,
            end_month: endMonth,
            frequency,
            late_fee_type: lateFeeType || null,
            late_fee_value: lateFeeValue ? parseFloat(lateFeeValue) : 0,
            grace_period_days: gracePeriodDays,
            items: itemsPayload,
          }),
        })
      );

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

  const getMonthsInRange = () => {
    const list: { value: number; label: string }[] = [];
    let m = startMonth;
    const end = endMonth;
    do {
      list.push({ value: m, label: MONTHS.find((x) => x.value === m)?.label || `Month ${m}` });
      m = m >= 12 ? 1 : m + 1;
    } while (m !== (end >= 12 ? 1 : end + 1));
    return list;
  };

  const QUARTERS = [
    { id: 'Q1', label: 'Q1 (Apr–Jun)' },
    { id: 'Q2', label: 'Q2 (Jul–Sep)' },
    { id: 'Q3', label: 'Q3 (Oct–Dec)' },
    { id: 'Q4', label: 'Q4 (Jan–Mar)' },
  ];

  const getAmountsForFrequency = (): Record<string, number> => {
    if (frequency === 'yearly') return selectedFeeHeads;
    if (frequency === 'quarterly' && activeCompositionTab && selectedFeeHeadsByQuarter[activeCompositionTab])
      return selectedFeeHeadsByQuarter[activeCompositionTab];
    if (frequency === 'monthly' && activeCompositionTab && selectedFeeHeadsByMonth[activeCompositionTab])
      return selectedFeeHeadsByMonth[activeCompositionTab];
    return selectedFeeHeads;
  };

  const applySameFeesToAllQuarters = () => {
    const source = activeCompositionTab && selectedFeeHeadsByQuarter[activeCompositionTab]
      ? { ...selectedFeeHeadsByQuarter[activeCompositionTab] }
      : selectedFeeHeads;
    setSelectedFeeHeadsByQuarter({
      Q1: { ...source },
      Q2: { ...source },
      Q3: { ...source },
      Q4: { ...source },
    });
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
            {/* Step 1: Scope - Class → Section mapping */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Settings size={24} className="text-indigo-600" />
                  Step 1: Scope
                </h2>
                <p className="text-sm text-gray-600">
                  Add classes and select which sections to include for each. Leave sections unselected to apply to all sections of that class.
                </p>

                <div className="space-y-4">
                  <div className="font-medium text-gray-700">Selected Classes & Sections</div>
                  {classSectionMap.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">No classes added yet. Use &quot;Add class&quot; below.</p>
                  ) : (
                    <div className="space-y-2">
                      {classSectionMap.map((entry) => {
                        const sections = sectionsForClass(entry.class);
                        const isExpanded = expandedClassRows.has(entry.class);
                        return (
                          <div
                            key={entry.class}
                            className="border border-gray-200 rounded-lg bg-gray-50/50 overflow-hidden"
                          >
                            <div
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100/80"
                              onClick={() => toggleClassRowExpanded(entry.class)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-indigo-600 font-medium select-none">
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                                <span className="font-semibold text-gray-900">Class {entry.class}</span>
                                {entry.sections.length > 0 && (
                                  <span className="text-xs text-gray-500">
                                    ({entry.sections.length} section{entry.sections.length !== 1 ? 's' : ''} selected)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleSelectAllSections(entry.class)}
                                  className="text-xs px-2 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                                >
                                  All
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleClearSections(entry.class)}
                                  className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                                >
                                  Clear
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveClass(entry.class)}
                                  className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="px-3 pb-3 pt-0 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {sections.length === 0 ? (
                                    <span className="text-sm text-gray-500">No sections in this class</span>
                                  ) : (
                                    sections.map((section) => (
                                      <label
                                        key={section}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={entry.sections.includes(section)}
                                          onChange={() => handleToggleSection(entry.class, section)}
                                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-medium text-gray-900">{section}</span>
                                      </label>
                                    ))
                                  )}
                                </div>
                                {entry.sections.length > 0 && (
                                  <p className="text-xs text-gray-500 mt-2">
                                    Leave all unchecked to apply to all sections of this class.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">+ Add another class</label>
                    <Input
                      placeholder="Search classes..."
                      value={classSearchQuery}
                      onChange={(e) => setClassSearchQuery(e.target.value)}
                      className="mb-2"
                    />
                    <div className="flex gap-2">
                      <select
                        value={addClassValue}
                        onChange={(e) => setAddClassValue(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select class...</option>
                        {filteredAvailableToAdd.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        onClick={() => addClassValue && handleAddClass(addClassValue)}
                        disabled={!addClassValue}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        Add class
                      </Button>
                    </div>
                    {classSearchQuery.trim() && filteredAvailableToAdd.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">No classes match &quot;{classSearchQuery}&quot;</p>
                    )}
                    {availableToAdd.length === 0 && uniqueClassNames.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">All classes have been added.</p>
                    )}
                  </div>
                </div>

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
                    onChange={(e) => handleFrequencyChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 3: Fee Composition - yearly single, monthly per month, quarterly per Q1–Q4 */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <IndianRupee size={24} className="text-indigo-600" />
                  Step 3: Fee Composition
                </h2>

                {frequency === 'yearly' && (
                  <>
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
                                setSelectedFeeHeads({ ...selectedFeeHeads, [head.id]: amt });
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
                  </>
                )}

                {frequency === 'monthly' && (
                  <>
                    <p className="text-sm text-gray-600">Enter fee amounts for each month in your duration.</p>
                    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
                      {getMonthsInRange().map((mo) => {
                        const key = String(mo.value);
                        const isActive = activeCompositionTab === key;
                        const amts = selectedFeeHeadsByMonth[key] || {};
                        const total = Object.values(amts).reduce((s, a) => s + a, 0);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setActiveCompositionTab(key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isActive ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {mo.label} {total > 0 && `(₹${total.toFixed(0)})`}
                          </button>
                        );
                      })}
                    </div>
                    {activeCompositionTab && (
                      <div className="space-y-3 mt-4">
                        {feeHeads.map((head) => (
                          <div key={head.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                            <div className="flex-1">
                              <span className="font-semibold text-gray-900">{head.name}</span>
                            </div>
                            <div className="w-48">
                              <Input
                                type="number"
                                placeholder="Amount"
                                value={selectedFeeHeadsByMonth[activeCompositionTab]?.[head.id] ?? ''}
                                onChange={(e) => {
                                  const amt = parseFloat(e.target.value) || 0;
                                  setSelectedFeeHeadsByMonth((prev) => ({
                                    ...prev,
                                    [activeCompositionTab]: {
                                      ...(prev[activeCompositionTab] || {}),
                                      [head.id]: amt,
                                    },
                                  }));
                                }}
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>
                        ))}
                        <div className="p-4 bg-indigo-50 rounded-lg">
                          <span className="font-bold text-gray-900">Total for this month: </span>
                          <span className="text-xl font-bold text-indigo-600">
                            ₹
                            {Object.values(selectedFeeHeadsByMonth[activeCompositionTab] || {}).reduce(
                              (s, a) => s + a,
                              0
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {frequency === 'quarterly' && (
                  <>
                    <p className="text-sm text-gray-600">Enter fee amounts for each quarter. Use &quot;Apply same to all quarters&quot; to copy current quarter to others.</p>
                    <div className="flex gap-2 flex-wrap border-b border-gray-200 pb-2">
                      {QUARTERS.map((q) => {
                        const isActive = activeCompositionTab === q.id;
                        const amts = selectedFeeHeadsByQuarter[q.id] || {};
                        const total = Object.values(amts).reduce((s, a) => s + a, 0);
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setActiveCompositionTab(q.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isActive ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {q.label} {total > 0 && `(₹${total.toFixed(0)})`}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={applySameFeesToAllQuarters}
                        className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-800 hover:bg-green-200"
                      >
                        Apply same fees to all quarters
                      </button>
                    </div>
                    {activeCompositionTab && (
                      <div className="space-y-3 mt-4">
                        {feeHeads.map((head) => (
                          <div key={head.id} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                            <div className="flex-1">
                              <span className="font-semibold text-gray-900">{head.name}</span>
                            </div>
                            <div className="w-48">
                              <Input
                                type="number"
                                placeholder="Amount"
                                value={selectedFeeHeadsByQuarter[activeCompositionTab]?.[head.id] ?? ''}
                                onChange={(e) => {
                                  const amt = parseFloat(e.target.value) || 0;
                                  setSelectedFeeHeadsByQuarter((prev) => ({
                                    ...prev,
                                    [activeCompositionTab]: {
                                      ...(prev[activeCompositionTab] || {}),
                                      [head.id]: amt,
                                    },
                                  }));
                                }}
                                min="0"
                                step="0.01"
                              />
                            </div>
                          </div>
                        ))}
                        <div className="p-4 bg-indigo-50 rounded-lg">
                          <span className="font-bold text-gray-900">Total for this quarter: </span>
                          <span className="text-xl font-bold text-indigo-600">
                            ₹
                            {Object.values(selectedFeeHeadsByQuarter[activeCompositionTab] || {}).reduce(
                              (s, a) => s + a,
                              0
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
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
                    <div className="col-span-2">
                      <span className="text-sm text-gray-600">Classes & Sections:</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {classSectionMap.length === 0 ? (
                          <p className="font-semibold text-gray-900">None selected</p>
                        ) : (
                          classSectionMap.map((e) => (
                            <span key={e.class} className="px-2 py-1 bg-white border border-gray-200 rounded text-sm font-medium">
                              {e.class}: {e.sections.length === 0 ? 'All sections' : e.sections.join(', ')}
                            </span>
                          ))
                        )}
                      </div>
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
                      <p className="font-semibold text-indigo-600">
                        {frequency === 'yearly' && `₹${getTotalAmount().toFixed(2)}`}
                        {frequency === 'quarterly' &&
                          `Per quarter: ₹${Object.values(selectedFeeHeadsByQuarter.Q1 || {}).reduce((s, a) => s + a, 0).toFixed(2)}`}
                        {frequency === 'monthly' &&
                          (() => {
                            const months = getMonthsInRange();
                            const first = months[0];
                            const amts = first ? selectedFeeHeadsByMonth[String(first.value)] || {} : {};
                            return `Per month (e.g. ${first?.label}): ₹${Object.values(amts).reduce((s, a) => s + a, 0).toFixed(2)}`;
                          })()}
                      </p>
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
