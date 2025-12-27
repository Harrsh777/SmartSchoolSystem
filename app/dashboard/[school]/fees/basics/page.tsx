'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowLeft, Plus, Edit, Trash2, Calendar, X } from 'lucide-react';

interface FeeSchedule {
  id: string;
  schedule_name: string;
  classes: string[];
  number_of_installments: number;
  collection_frequency: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  start_date: string;
  end_date: string;
  last_collection_date: string | null;
  is_active: boolean;
}

export default function FeeBasicsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [schedules, setSchedules] = useState<FeeSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FeeSchedule | null>(null);
  const [classes, setClasses] = useState<string[]>([]);

  useEffect(() => {
    fetchSchedules();
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/fees/schedules?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setSchedules(result.data);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
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
        const uniqueClasses = Array.from(new Set(result.data.map((c: ClassData) => c.class).filter(Boolean)));
        setClasses(uniqueClasses.sort());
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee schedule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/fees/schedules/${id}?school_code=${schoolCode}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchSchedules();
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to delete schedule');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Failed to delete schedule. Please try again.');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateRange = (start: string, end: string) => {
    return `${formatDate(start)} - ${formatDate(end)}`;
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
            <Calendar size={32} />
            Fee Basics (Fee Schedule)
          </h1>
          <p className="text-gray-600">Configure fee schedules and collection frequency</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              setEditingSchedule(null);
              setShowAddModal(true);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus size={18} className="mr-2" />
            Add Schedule
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
                <th className="px-4 py-3 text-left text-sm font-semibold">Classes</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">No. of Installments</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Schedule Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Collection Frequency</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Last Collection Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {schedules.length > 0 ? (
                schedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {schedule.classes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {schedule.classes.slice(0, 3).map((cls, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-xs">
                              {cls}
                            </span>
                          ))}
                          {schedule.classes.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                              +{schedule.classes.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{schedule.number_of_installments}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{schedule.schedule_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDateRange(schedule.start_date, schedule.end_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize">
                      {schedule.collection_frequency.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {schedule.last_collection_date ? formatDate(schedule.last_collection_date) : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingSchedule(schedule);
                            setShowAddModal(true);
                          }}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.id)}
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
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No fee schedules found. Click &quot;Add Schedule&quot; to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <FeeScheduleModal
          schoolCode={schoolCode}
          schedule={editingSchedule}
          classes={classes}
          onClose={() => {
            setShowAddModal(false);
            setEditingSchedule(null);
          }}
          onSuccess={fetchSchedules}
        />
      )}
    </div>
  );
}

// Fee Schedule Modal Component
function FeeScheduleModal({
  schoolCode,
  schedule,
  classes,
  onClose,
  onSuccess,
}: {
  schoolCode: string;
  schedule: FeeSchedule | null;
  classes: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    schedule_name: schedule?.schedule_name || '',
    classes: schedule?.classes || [],
    number_of_installments: schedule?.number_of_installments || 1,
    collection_frequency: schedule?.collection_frequency || 'monthly',
    start_date: schedule?.start_date || '',
    end_date: schedule?.end_date || '',
    last_collection_date: schedule?.last_collection_date || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.schedule_name || formData.classes.length === 0 || !formData.start_date || !formData.end_date) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const url = schedule
        ? `/api/fees/schedules/${schedule.id}`
        : '/api/fees/schedules';
      const method = schedule ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          ...formData,
          last_collection_date: formData.last_collection_date || null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        alert(result.error || `Failed to ${schedule ? 'update' : 'create'} schedule`);
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert(`Failed to ${schedule ? 'update' : 'create'} schedule. Please try again.`);
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
              {schedule ? 'Edit Fee Schedule' : 'Add Fee Schedule'}
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
                Schedule Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.schedule_name}
                onChange={(e) => setFormData(prev => ({ ...prev, schedule_name: e.target.value }))}
                required
                placeholder="e.g., fees schedule 1"
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
                  Number of Installments <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.number_of_installments}
                  onChange={(e) => setFormData(prev => ({ ...prev, number_of_installments: parseInt(e.target.value) || 1 }))}
                  required
                  min="1"
                  max="12"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Collection Frequency <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.collection_frequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, collection_frequency: e.target.value as 'monthly' | 'quarterly' | 'yearly' | 'one_time' }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  required
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half_yearly">Half Yearly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Last Collection Date
              </label>
              <Input
                type="date"
                value={formData.last_collection_date}
                onChange={(e) => setFormData(prev => ({ ...prev, last_collection_date: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
                {saving ? 'Saving...' : (schedule ? 'Update' : 'Create')}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

