'use client';

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, Plus, Edit2, Power, PowerOff, FileText, Search, CheckCircle, XCircle, AlertCircle, Loader2, Calendar, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';

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

interface FeeStructureItem {
  id: string;
  fee_head_id: string;
  amount: number;
  fee_head?: {
    id: string;
    name: string;
    description: string | null;
  };
}

interface FeeStructure {
  id: string;
  name: string;
  class_name: string;
  section: string | null;
  academic_year: string | null;
  start_month: number;
  end_month: number;
  frequency: string;
  late_fee_type: string | null;
  late_fee_value: number;
  grace_period_days: number;
  is_active: boolean;
  activated_at: string | null;
  items?: FeeStructureItem[];
  created_at: string;
}

export default function FeeStructuresPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchStructures = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/v2/fees/fee-structures?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok) {
        setStructures(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch fee structures');
      }
    } catch (err) {
      setError('Failed to load fee structures');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchStructures();
  }, [fetchStructures]);

  const handleActivate = async (structureId: string) => {
    if (!confirm('Activate this fee structure? This will make it available for fee generation.')) {
      return;
    }

    try {
      setError('');
      const response = await fetch(`/api/v2/fees/fee-structures/${structureId}/activate`, {
        method: 'POST',
        headers: {
          'x-staff-id': sessionStorage.getItem('staff_id') || '',
        },
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Fee structure activated successfully');
        fetchStructures();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to activate fee structure');
      }
    } catch (err) {
      setError('Failed to activate fee structure');
      console.error(err);
    }
  };

  const handleDeactivate = async (structureId: string) => {
    if (!confirm('Deactivate this fee structure? This will prevent it from being used for fee generation. Existing fees will not be affected.')) {
      return;
    }

    try {
      setError('');
      const response = await fetch(`/api/v2/fees/fee-structures/${structureId}/deactivate`, {
        method: 'POST',
        headers: {
          'x-staff-id': sessionStorage.getItem('staff_id') || '',
        },
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Fee structure deactivated successfully');
        fetchStructures();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to deactivate fee structure');
      }
    } catch (err) {
      setError('Failed to deactivate fee structure');
      console.error(err);
    }
  };

  const handleGenerateFees = async (structureId: string) => {
    if (!confirm('Generate student fees for this structure? This will create fee records for all applicable students.')) {
      return;
    }

    try {
      setGenerating(structureId);
      setError('');
      const response = await fetch(`/api/v2/fees/fee-structures/${structureId}/generate-fees`, {
        method: 'POST',
        headers: {
          'x-staff-id': sessionStorage.getItem('staff_id') || '',
        },
      });

      const result = await response.json();

      console.log('Fee generation response:', result);

      if (response.ok) {
        const feesGenerated = result.data?.fees_generated ?? 0;
        const studentsProcessed = result.data?.students_processed ?? 0;
        
        if (feesGenerated === 0) {
          // Show more detailed message when no fees were generated
          const details = result.details ? 
            `\n\nSearched for:\n- Class: "${result.details.class_name}"\n- Section: "${result.details.section || 'all'}"\n- Academic Year: "${result.details.academic_year || 'all'}"\n- School Code: "${result.details.school_code}"` : 
            '';
          
          const debugInfo = result.debug ? 
            `\n\nStudents in school: ${result.debug.total_students_in_school}\nClasses found: ${result.debug.sample_classes_found?.join(', ') || 'none'}\nSections found: ${result.debug.sample_sections_found?.join(', ') || 'none'}` : 
            '';
          
          setError(result.message || `No students found matching the fee structure criteria.${details}${debugInfo}\n\nPlease verify that:\n1. Students exist with the exact class and section values\n2. The class and section values match exactly (case-sensitive)\n3. Students belong to the correct school`);
        } else {
          // Success message with detailed information
          let successMsg = `✅ Student fees generated successfully!\n\n📊 Summary:\n- Fee records created: ${feesGenerated}\n- Students processed: ${studentsProcessed}\n- Months generated: ${result.data?.months_generated || 0}`;
          
          if (result.warning) {
            successMsg += `\n\n⚠️ Note: ${result.warning}`;
          }
          
          if (result.data?.errors && result.data.errors > 0) {
            successMsg += `\n\n❌ Errors: ${result.data.errors} fee records failed to insert`;
          }
          
          setSuccess(successMsg);
        }
        setTimeout(() => {
          setSuccess('');
          setError('');
          fetchStructures(); // Refresh to show updated data
        }, feesGenerated === 0 ? 10000 : 5000);
      } else {
        setError(result.error || 'Failed to generate fees');
      }
    } catch (err) {
      console.error('Error generating fees:', err);
      setError(`Failed to generate fees: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGenerating(null);
    }
  };

  const getTotalAmount = (structure: FeeStructure) => {
    return structure.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
  };

  const getMonthName = (monthNumber: number) => {
    return MONTHS.find(m => m.value === monthNumber)?.label || `Month ${monthNumber}`;
  };

  // Base name for grouping: remove trailing " - A", " - B" etc. so multi-class structures group as one
  const getBaseName = (name: string) => {
    return name.replace(/\s*-\s*[A-Z]\s*$/i, '').trim() || name;
  };

  const getGroupKey = (s: FeeStructure) => {
    const base = getBaseName(s.name);
    return `${base}|${s.start_month}|${s.end_month}|${s.frequency}`;
  };

  // Group structures so one logical structure (same name base + period + frequency) appears once
  const structureGroups = useMemo(() => {
    const map = new Map<string, FeeStructure[]>();
    structures.forEach((s) => {
      const key = getGroupKey(s);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries()).map(([key, list]) => ({
      key,
      displayName: getBaseName(list[0].name),
      structures: list.sort((a, b) =>
        a.class_name.localeCompare(b.class_name) || (a.section || '').localeCompare(b.section || '')
      ),
    }));
  }, [structures]);

  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return structureGroups.filter(
      (g) =>
        g.displayName.toLowerCase().includes(q) ||
        g.structures.some(
          (s) =>
            s.class_name.toLowerCase().includes(q) ||
            (s.section || '').toLowerCase().includes(q)
        )
    );
  }, [structureGroups, searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/dashboard`)}>
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <FileText size={32} className="text-indigo-600" />
              Fee Structures
            </h1>
            <p className="text-gray-600">Manage fee structures for classes</p>
          </div>
        </div>
        <Button
          onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/fee-structures/create`)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus size={18} className="mr-2" />
          Create Structure
        </Button>
      </motion.div>

      {/* Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg"
        >
          <div className="flex items-start gap-2">
            <CheckCircle size={20} className="mt-0.5 flex-shrink-0 text-green-600" />
            <div className="flex-1">
              <pre className="whitespace-pre-wrap font-sans text-sm">{success}</pre>
            </div>
          </div>
        </motion.div>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg"
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <pre className="whitespace-pre-wrap font-sans text-sm">{error}</pre>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            type="text"
            placeholder="Search fee structures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Structures List - collapsed by default, expand on click; one card per logical structure (no repeats) */}
      <div className="space-y-3">
        {filteredGroups.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? 'No structures found matching your search' : 'No fee structures created yet'}
            </div>
          </Card>
        ) : (
          filteredGroups.map((group) => {
            const isExpanded = expandedKey === group.key;
            const first = group.structures[0];
            const activeCount = group.structures.filter((s) => s.is_active).length;
            const totalAmount = getTotalAmount(first);

            return (
              <motion.div
                key={group.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card
                  className={`border-2 transition-all cursor-pointer select-none ${
                    activeCount > 0 ? 'border-green-200 hover:border-green-300' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setExpandedKey(isExpanded ? null : group.key)}
                >
                  <div className="flex items-center justify-between gap-4 py-1">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {isExpanded ? (
                        <ChevronDown size={20} className="text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronRight size={20} className="text-gray-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-gray-900 truncate">{group.displayName}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {group.structures.length} class{group.structures.length !== 1 ? 'es' : ''} •{' '}
                          {getMonthName(first.start_month)} – {getMonthName(first.end_month)} • {first.frequency}
                          {activeCount > 0 && (
                            <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                              <CheckCircle size={12} />
                              Active
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-sm font-bold text-indigo-600">
                        ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="pt-4 mt-4 border-t border-gray-200 space-y-4">
                          {group.structures.map((structure) => (
                            <div
                              key={structure.id}
                              className="p-4 rounded-lg bg-gray-50 border border-gray-200"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="font-semibold text-gray-900">
                                    {structure.class_name}
                                    {structure.section && (
                                      <span className="text-indigo-600"> - {structure.section}</span>
                                    )}
                                  </span>
                                  {structure.is_active ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                      <CheckCircle size={10} /> Active
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                      <XCircle size={10} /> Inactive
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {!structure.is_active ? (
                                    <Button
                                      onClick={() => handleActivate(structure.id)}
                                      className="bg-green-600 hover:bg-green-700 text-white text-xs py-1.5 px-2"
                                      size="sm"
                                    >
                                      <Power size={14} className="mr-1" />
                                      Activate
                                    </Button>
                                  ) : (
                                    <>
                                      <Button
                                        onClick={() => handleGenerateFees(structure.id)}
                                        disabled={generating === structure.id}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-1.5 px-2"
                                        size="sm"
                                      >
                                        {generating === structure.id ? (
                                          <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                          <>
                                            <Calendar size={14} className="mr-1" />
                                            Generate Fees
                                          </>
                                        )}
                                      </Button>
                                      <Button
                                        onClick={() => handleDeactivate(structure.id)}
                                        className="bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-2"
                                        size="sm"
                                      >
                                        <PowerOff size={14} className="mr-1" />
                                        Deactivate
                                      </Button>
                                    </>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/fee-structures/${structure.id}`)}
                                    className="text-xs py-1.5 px-2"
                                  >
                                    <Edit2 size={14} className="mr-1" />
                                    View / Edit
                                  </Button>
                                </div>
                              </div>

                              {structure.items && structure.items.length > 0 && (
                                <div className="mb-2">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Fee Composition</p>
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                                    {structure.items.map((item) => (
                                      <span key={item.id}>
                                        {item.fee_head?.name || 'Unknown'}: ₹
                                        {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {structure.late_fee_type && (
                                <p className="text-xs text-amber-800">
                                  Late: {structure.late_fee_type} – ₹{structure.late_fee_value}
                                  {structure.late_fee_type === 'per_day' && '/day'}
                                  {structure.grace_period_days > 0 && ` • ${structure.grace_period_days} days grace`}
                                </p>
                              )}
                            </div>
                          ))}

                          {first.items && first.items.length > 0 && group.structures.length > 1 && (
                            <div className="p-3 bg-white border border-gray-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <TrendingUp size={14} className="text-indigo-600" />
                                <p className="text-sm font-semibold text-gray-900">Fee Composition (same for all)</p>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
                                {first.items.map((item) => (
                                  <span key={item.id}>
                                    {item.fee_head?.name}: ₹
                                    {item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
