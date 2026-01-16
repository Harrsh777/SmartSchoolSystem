'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, Plus, Edit, Trash2, Users, X } from 'lucide-react';

interface ClassFee {
  id: string;
  fee_name: string;
  classes: string[];
  fee_amount: number;
  fee_type: string;
  academic_year: string;
  fee_schedule_id: string | null;
}

interface ScheduleData {
  id: string;
  schedule_name?: string;
  name?: string;
  [key: string]: unknown;
}

export default function ClassWiseFeePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [classFees, setClassFees] = useState<ClassFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFee, setEditingFee] = useState<ClassFee | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);

  useEffect(() => {
    fetchClassFees();
    fetchClasses();
    fetchSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchClassFees = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/fees/class-wise?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setClassFees(result.data);
      }
    } catch (err) {
      console.error('Error fetching class fees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await fetch(`/api/classes?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        interface ClassData {
          class?: string;
          [key: string]: unknown;
        }
        const classNames: (string | undefined)[] = result.data.map((c: ClassData) => c.class);
        const uniqueClasses: string[] = Array.from(new Set(classNames.filter((cls: string | undefined): cls is string => Boolean(cls))));
        setClasses(uniqueClasses.sort());
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await fetch(`/api/fees/schedules?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setSchedules(result.data);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class fee?')) {
      return;
    }

    try {
      const response = await fetch(`/api/fees/class-wise/${id}?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchClassFees();
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to delete class fee');
      }
    } catch (error) {
      console.error('Error deleting class fee:', error);
      alert('Failed to delete class fee. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Users size={32} />
            Class-wise Fee
          </h1>
          <p className="text-gray-600">Configure fees for specific classes</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              setEditingFee(null);
              setShowAddModal(true);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus size={18} className="mr-2" />
            Add Class Fee
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/fees`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-teal-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Fee Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Classes</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Fee Amount (₹)</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Fee Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Academic Year</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {classFees.length > 0 ? (
                classFees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{fee.fee_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="flex flex-wrap gap-1">
                        {fee.classes.slice(0, 3).map((cls, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-xs">
                            {cls}
                          </span>
                        ))}
                        {fee.classes.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                            +{fee.classes.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">₹{fee.fee_amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize">{fee.fee_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{fee.academic_year}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingFee(fee);
                            setShowAddModal(true);
                          }}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(fee.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No class fees found. Click &quot;Add Class Fee&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <ClassFeeModal
          schoolCode={schoolCode}
          fee={editingFee}
          classes={classes}
          schedules={schedules}
          onClose={() => {
            setShowAddModal(false);
            setEditingFee(null);
          }}
          onSuccess={fetchClassFees}
        />
      )}
    </div>
  );
}

// Class Fee Modal Component
function ClassFeeModal({
  schoolCode,
  fee,
  classes,
  schedules,
  onClose,
  onSuccess,
}: {
  schoolCode: string;
  fee: ClassFee | null;
  classes: string[];
  schedules: ScheduleData[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fee_name: fee?.fee_name || '',
    classes: fee?.classes || [],
    fee_amount: fee?.fee_amount?.toString() || '',
    fee_type: fee?.fee_type || 'tuition',
    academic_year: fee?.academic_year || new Date().getFullYear().toString(),
    fee_schedule_id: fee?.fee_schedule_id || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fee_name || formData.classes.length === 0 || !formData.fee_amount) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const url = fee
        ? `/api/fees/class-wise/${fee.id}`
        : '/api/fees/class-wise';
      const method = fee ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...formData,
          fee_amount: parseFloat(formData.fee_amount),
          fee_schedule_id: formData.fee_schedule_id || null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        alert(result.error || `Failed to ${fee ? 'update' : 'create'} class fee`);
      }
    } catch (error) {
      console.error('Error saving class fee:', error);
      alert(`Failed to ${fee ? 'update' : 'create'} class fee. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const toggleClass = (className: string) => {
    setFormData(prev => ({
      ...prev,
      classes: prev.classes.includes(className)
        ? prev.classes.filter(c => c !== className)
        : [...prev.classes, className],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <Card className="m-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">
              {fee ? 'Edit Class Fee' : 'Add Class Fee'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fee Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.fee_name}
                onChange={(e) => setFormData(prev => ({ ...prev, fee_name: e.target.value }))}
                required
                placeholder="e.g., Tuition Fee, Library Fee"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Classes <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-300 rounded-lg p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {classes.map(cls => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleClass(cls)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        formData.classes.includes(cls)
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fee Amount (₹) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.fee_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, fee_amount: e.target.value }))}
                  required
                  placeholder="e.g., 5000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fee Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.fee_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, fee_type: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  required
                >
                  <option value="tuition">Tuition</option>
                  <option value="transport">Transport</option>
                  <option value="library">Library</option>
                  <option value="sports">Sports</option>
                  <option value="lab">Lab</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.academic_year}
                  onChange={(e) => setFormData(prev => ({ ...prev, academic_year: e.target.value }))}
                  required
                  placeholder="e.g., 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fee Schedule (Optional)
                </label>
                <select
                  value={formData.fee_schedule_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, fee_schedule_id: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select Schedule</option>
                  {schedules.map(schedule => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.schedule_name || schedule.name || 'Unnamed Schedule'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
                {saving ? 'Saving...' : (fee ? 'Update' : 'Create')}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

