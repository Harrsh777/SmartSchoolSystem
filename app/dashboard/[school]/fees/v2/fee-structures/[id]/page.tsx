'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, FileText, Loader2, AlertCircle, CheckCircle, XCircle, Edit2, Save } from 'lucide-react';

interface FeeStructureItem {
  id: string;
  fee_head_id: string;
  amount: number;
  fee_head?: {
    id: string;
    name: string;
    description: string | null;
    is_optional: boolean;
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

export default function FeeStructureDetailPage({
  params,
}: {
  params: Promise<{ school: string; id: string }>;
}) {
  const { school: schoolCode, id: structureId } = use(params);
  const router = useRouter();
  const [structure, setStructure] = useState<FeeStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingLateFee, setEditingLateFee] = useState(false);
  const [lateFeeType, setLateFeeType] = useState('');
  const [lateFeeValue, setLateFeeValue] = useState('');
  const [gracePeriodDays, setGracePeriodDays] = useState(0);
  const [savingLateFee, setSavingLateFee] = useState(false);
  const [lateFeeError, setLateFeeError] = useState('');
  const [lateFeeSuccess, setLateFeeSuccess] = useState('');

  useEffect(() => {
    fetchStructure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureId, schoolCode]);

  const fetchStructure = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/v2/fees/fee-structures/${structureId}?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok) {
        setStructure(result.data);
        const s = result.data as FeeStructure;
        setLateFeeType(s.late_fee_type || '');
        setLateFeeValue(s.late_fee_value != null ? String(s.late_fee_value) : '');
        setGracePeriodDays(s.grace_period_days ?? 0);
      } else {
        setError(result.error || 'Failed to fetch fee structure');
      }
    } catch (err) {
      setError('Failed to load fee structure');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (monthNumber: number) => {
    return MONTHS.find(m => m.value === monthNumber)?.label || `Month ${monthNumber}`;
  };

  const getTotalAmount = () => {
    return structure?.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
  };

  const handleSaveLateFee = async () => {
    if (!structure) return;
    setSavingLateFee(true);
    setLateFeeError('');
    setLateFeeSuccess('');
    try {
      const res = await fetch(`/api/v2/fees/fee-structures/${structureId}?school_code=${schoolCode}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          late_fee_type: lateFeeType.trim() || null,
          late_fee_value: lateFeeValue ? parseFloat(lateFeeValue) : 0,
          grace_period_days: gracePeriodDays,
        }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setStructure({ ...structure, ...data.data });
        setEditingLateFee(false);
        setLateFeeSuccess('Late fee settings saved.');
        setTimeout(() => setLateFeeSuccess(''), 3000);
      } else {
        setLateFeeError(data.error || 'Failed to save late fee');
      }
    } catch (err) {
      setLateFeeError('Failed to save late fee');
    } finally {
      setSavingLateFee(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !structure) {
    return (
      <div className="space-y-6 p-6">
        <Button variant="outline" onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/fee-structures`)}>
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
        <Card>
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900 mb-2">{error || 'Fee structure not found'}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
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
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <FileText size={32} className="text-indigo-600" />
            Fee Structure Details
          </h1>
          <p className="text-gray-600">{structure.name}</p>
        </div>
        {structure.is_active && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-100 text-green-800 rounded-full">
            <CheckCircle size={16} />
            Active
          </span>
        )}
        {!structure.is_active && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-full">
            <XCircle size={16} />
            Inactive
          </span>
        )}
      </motion.div>

      {structure.is_active && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <AlertCircle size={20} />
          <p className="text-sm">
            This fee structure is active. You can only edit Late Fee rules below; other changes require deactivation first.
          </p>
        </motion.div>
      )}

      {!structure.is_active && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <AlertCircle size={20} />
          <p className="text-sm">This structure is inactive. You can edit details including Late Fee below.</p>
        </motion.div>
      )}

      {/* Basic Information */}
      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Structure Name</label>
            <p className="text-lg font-semibold text-gray-900">{structure.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <p className="text-lg font-semibold text-gray-900">
              {structure.is_active ? (
                <span className="text-green-600">Active</span>
              ) : (
                <span className="text-gray-600">Inactive</span>
              )}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <p className="text-lg font-semibold text-gray-900">
              {structure.class_name}
              {structure.section && <span className="text-indigo-600"> - {structure.section}</span>}
            </p>
          </div>
          {structure.academic_year && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
              <p className="text-lg font-semibold text-gray-900">{structure.academic_year}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <p className="text-lg font-semibold text-gray-900 capitalize">{structure.frequency}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <p className="text-lg font-semibold text-gray-900">
              {getMonthName(structure.start_month)} - {getMonthName(structure.end_month)}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
            <p className="text-2xl font-bold text-indigo-600">
              ₹{getTotalAmount().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          {structure.activated_at && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activated At</label>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(structure.activated_at).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Fee Composition */}
      {structure.items && structure.items.length > 0 && (
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Fee Composition</h2>
          <div className="space-y-3">
            {structure.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div>
                  <p className="font-semibold text-gray-900">{item.fee_head?.name || 'Unknown'}</p>
                  {item.fee_head?.description && (
                    <p className="text-sm text-gray-600 mt-1">{item.fee_head.description}</p>
                  )}
                  {item.fee_head?.is_optional && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                      Optional
                    </span>
                  )}
                </div>
                <p className="text-xl font-bold text-indigo-600">
                  ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Late Fee Policy - view and edit */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Late Fee Policy</h2>
          {!editingLateFee ? (
            <Button variant="outline" size="sm" onClick={() => setEditingLateFee(true)}>
              <Edit2 size={16} className="mr-1" />
              Edit Late Fee
            </Button>
          ) : (
            <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => {
              setEditingLateFee(false);
              setLateFeeError('');
              setLateFeeSuccess('');
              if (structure) {
                setLateFeeType(structure.late_fee_type || '');
                setLateFeeValue(structure.late_fee_value != null ? String(structure.late_fee_value) : '');
                setGracePeriodDays(structure.grace_period_days ?? 0);
              }
            }}>
              Cancel
            </Button>
              <Button size="sm" onClick={handleSaveLateFee} disabled={savingLateFee}>
                {savingLateFee ? <Loader2 size={16} className="animate-spin mr-1" /> : <Save size={16} className="mr-1" />}
                Save
              </Button>
            </div>
          )}
        </div>
        {lateFeeError && <p className="text-sm text-red-600 mb-3">{lateFeeError}</p>}
        {lateFeeSuccess && <p className="text-sm text-green-600 mb-3">{lateFeeSuccess}</p>}
        {editingLateFee ? (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Late Fee Type</label>
              <select
                value={lateFeeType}
                onChange={(e) => setLateFeeType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">No Late Fee</option>
                <option value="flat">Flat Amount</option>
                <option value="per_day">Per Day</option>
                <option value="percentage">Percentage (of base per day)</option>
              </select>
            </div>
            {lateFeeType && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lateFeeType === 'percentage' ? 'Percentage (%)' : 'Late Fee Value (₹)'}
                  </label>
                  <Input
                    type="number"
                    value={lateFeeValue}
                    onChange={(e) => setLateFeeValue(e.target.value)}
                    placeholder={lateFeeType === 'percentage' ? 'e.g. 0.5' : 'e.g. 50'}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grace Period (days)</label>
                  <Input
                    type="number"
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(parseInt(e.target.value) || 0)}
                    min="0"
                  />
                </div>
              </>
            )}
          </div>
        ) : structure.late_fee_type ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">Late Fee Type</label>
                <p className="text-lg font-semibold text-amber-900 capitalize">{structure.late_fee_type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">Late Fee Value</label>
                <p className="text-lg font-semibold text-amber-900">
                  {structure.late_fee_type === 'percentage' ? `${structure.late_fee_value}%` : `₹${structure.late_fee_value.toLocaleString('en-IN')}`}
                  {structure.late_fee_type === 'per_day' && '/day'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">Grace Period</label>
                <p className="text-lg font-semibold text-amber-900">{structure.grace_period_days} days</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 py-2">No late fee configured. Click &quot;Edit Late Fee&quot; to add.</p>
        )}
      </Card>

      {/* Created Information */}
      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
            <p className="text-gray-900">
              {new Date(structure.created_at).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
