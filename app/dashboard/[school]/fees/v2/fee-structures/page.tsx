'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, Plus, Edit2, Power, PowerOff, FileText, Search, CheckCircle, XCircle, AlertCircle, Loader2, Calendar, Clock, Users, DollarSign, TrendingUp } from 'lucide-react';

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

  const filteredStructures = structures.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.class_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      {/* Structures List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredStructures.length === 0 ? (
          <div className="lg:col-span-2">
            <Card>
              <div className="text-center py-12 text-gray-500">
                {searchQuery ? 'No structures found matching your search' : 'No fee structures created yet'}
              </div>
            </Card>
          </div>
        ) : (
          filteredStructures.map((structure) => (
            <motion.div
              key={structure.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className={`h-full border-2 transition-all ${structure.is_active ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{structure.name}</h3>
                      {structure.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          <CheckCircle size={12} />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                          <XCircle size={12} />
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Key Information */}
                  <div className="space-y-3 mb-4 flex-1">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 min-w-[80px]">
                        <Users size={16} className="text-indigo-500" />
                        <span className="font-medium">Class:</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {structure.class_name}
                        {structure.section && <span className="text-indigo-600"> - {structure.section}</span>}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 min-w-[80px]">
                        <Clock size={16} className="text-purple-500" />
                        <span className="font-medium">Frequency:</span>
                      </div>
                      <span className="font-semibold text-gray-900 capitalize">{structure.frequency}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 min-w-[80px]">
                        <Calendar size={16} className="text-blue-500" />
                        <span className="font-medium">Period:</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {getMonthName(structure.start_month)} - {getMonthName(structure.end_month)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-gray-600 min-w-[80px]">
                        <DollarSign size={16} className="text-green-600" />
                        <span className="font-medium">Total:</span>
                      </div>
                      <span className="text-xl font-bold text-indigo-600">
                        ₹{getTotalAmount(structure).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Fee Composition */}
                  {structure.items && structure.items.length > 0 && (
                    <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={16} className="text-indigo-600" />
                        <p className="text-sm font-semibold text-gray-900">Fee Composition</p>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {structure.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                          >
                            <span className="text-sm font-medium text-gray-700">
                              {item.fee_head?.name || 'Unknown'}
                            </span>
                            <span className="text-sm font-bold text-indigo-600">
                              ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Late Fee Info */}
                  {structure.late_fee_type && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="text-xs font-semibold text-amber-900 mb-1">Late Fee Policy</div>
                      <div className="text-sm text-amber-800">
                        <span className="font-medium capitalize">{structure.late_fee_type}</span>
                        {' - ₹'}{structure.late_fee_value.toLocaleString('en-IN')}
                        {structure.late_fee_type === 'per_day' && '/day'}
                        {structure.grace_period_days > 0 && (
                          <span className="ml-2 text-amber-700">• {structure.grace_period_days} days grace period</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-4 border-t border-gray-200">
                    {!structure.is_active ? (
                      <Button
                        onClick={() => handleActivate(structure.id)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        <Power size={16} className="mr-2" />
                        Activate Structure
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleGenerateFees(structure.id)}
                          disabled={generating === structure.id}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                          size="sm"
                        >
                          {generating === structure.id ? (
                            <>
                              <Loader2 size={16} className="mr-2 animate-spin" />
                              Generating Fees...
                            </>
                          ) : (
                            <>
                              <Calendar size={16} className="mr-2" />
                              Generate Student Fees
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleDeactivate(structure.id)}
                          className="w-full bg-red-600 hover:bg-red-700 text-white"
                          size="sm"
                        >
                          <PowerOff size={16} className="mr-2" />
                          Deactivate Structure
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/fee-structures/${structure.id}`)}
                      className="w-full"
                    >
                      <Edit2 size={16} className="mr-2" />
                      View / Edit Details
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
