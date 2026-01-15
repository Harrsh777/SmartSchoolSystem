'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  Calendar, 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowLeft,
  Search,
  X,
  Check,
  AlertCircle,
  CalendarDays
} from 'lucide-react';

interface FeeSchedule {
  id: string;
  school_code: string;
  schedule_name: string;
  academic_year: string;
  number_of_installments: number;
  collection_frequency: string;
  installments: Array<{
    installment_number: number;
    due_date: string;
    name: string;
  }>;
  start_date: string;
  end_date: string;
  last_collection_date?: string | null;
  classes?: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export default function FeeSchedulesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  
  const [schedules, setSchedules] = useState<FeeSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FeeSchedule | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    schedule_name: '',
    academic_year: '',
    number_of_installments: '4',
    collection_frequency: 'monthly',
    start_date: '',
    end_date: '',
    last_collection_date: '',
    is_active: true,
  });
  const [installments, setInstallments] = useState<Array<{
    installment_number: number;
    due_date: string;
    name: string;
  }>>([]);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/fees/schedules?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok) {
        setSchedules(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch fee schedules');
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError('Failed to fetch fee schedules');
    } finally {
      setLoading(false);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const generateInstallments = () => {
    const numInstallments = parseInt(formData.number_of_installments) || 4;
    const frequency = formData.collection_frequency;
    const start = formData.start_date ? new Date(formData.start_date) : new Date();
    const newInstallments: Array<{ installment_number: number; due_date: string; name: string }> = [];

    for (let i = 0; i < numInstallments; i++) {
      const dueDate = new Date(start);
      
      if (frequency === 'monthly') {
        dueDate.setMonth(dueDate.getMonth() + i);
        dueDate.setDate(1); // First day of month
      } else if (frequency === 'quarterly') {
        dueDate.setMonth(dueDate.getMonth() + (i * 3));
        if (i % 4 === 0) dueDate.setMonth(3, 1); // April
        else if (i % 4 === 1) dueDate.setMonth(6, 1); // July
        else if (i % 4 === 2) dueDate.setMonth(9, 1); // October
        else dueDate.setMonth(0, 1); // January
      } else if (frequency === 'annual') {
        dueDate.setFullYear(dueDate.getFullYear() + i);
      }

      newInstallments.push({
        installment_number: i + 1,
        due_date: dueDate.toISOString().split('T')[0],
        name: `${frequency === 'quarterly' ? 'Q' + (i + 1) : frequency === 'monthly' ? 'Month ' + (i + 1) : 'Annual'} Installment`,
      });
    }
    
    setInstallments(newInstallments);
  };

  useEffect(() => {
    if (formData.number_of_installments && formData.start_date && formData.collection_frequency) {
      generateInstallments();
    }
  }, [formData.number_of_installments, formData.start_date, formData.collection_frequency]);

  const handleOpenModal = (schedule?: FeeSchedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        schedule_name: schedule.schedule_name || '',
        academic_year: schedule.academic_year || '',
        number_of_installments: schedule.number_of_installments?.toString() || '4',
        collection_frequency: schedule.collection_frequency || 'monthly',
        start_date: schedule.start_date || '',
        end_date: schedule.end_date || '',
        last_collection_date: schedule.last_collection_date || '',
        is_active: schedule.is_active !== false,
      });
      setInstallments(schedule.installments || []);
    } else {
      setEditingSchedule(null);
      setFormData({
        schedule_name: '',
        academic_year: '',
        number_of_installments: '4',
        collection_frequency: 'monthly',
        start_date: '',
        end_date: '',
        last_collection_date: '',
        is_active: true,
      });
      setInstallments([]);
    }
    setModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!formData.schedule_name.trim()) {
      setError('Schedule name is required');
      return;
    }
    if (!formData.academic_year.trim()) {
      setError('Academic year is required');
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      setError('Start date and end date are required');
      return;
    }
    if (installments.length !== parseInt(formData.number_of_installments)) {
      setError(`Please ensure all ${formData.number_of_installments} installments have dates`);
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const url = editingSchedule
        ? `/api/fees/schedules/${editingSchedule.id}`
        : '/api/fees/schedules';
      const method = editingSchedule ? 'PATCH' : 'POST';

      const body = {
        school_code: schoolCode,
        ...formData,
        number_of_installments: parseInt(formData.number_of_installments),
        installments: installments,
        last_collection_date: formData.last_collection_date || null,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(editingSchedule ? 'Fee schedule updated successfully!' : 'Fee schedule created successfully!');
        setModalOpen(false);
        fetchSchedules();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || result.details || 'Failed to save fee schedule');
      }
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError('Failed to save fee schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this fee schedule? This action cannot be undone.')) {
      return;
    }

    try {
      setError('');
      const response = await fetch(`/api/fees/schedules/${scheduleId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Fee schedule deleted successfully!');
        fetchSchedules();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to delete fee schedule');
      }
    } catch (err) {
      console.error('Error deleting schedule:', err);
      setError('Failed to delete fee schedule');
    }
  };

  const filteredSchedules = schedules.filter((schedule) => {
    const matchesSearch = schedule.schedule_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = !filterAcademicYear || schedule.academic_year === filterAcademicYear;
    const matchesActive = filterActive === null || schedule.is_active === filterActive;
    return matchesSearch && matchesYear && matchesActive;
  });

  const academicYears = Array.from(new Set(schedules.map(s => s.academic_year).filter(Boolean) as string[]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Calendar className="text-[#2F6FED]" size={32} />
            Fee Schedules
          </h1>
          <p className="text-gray-600">Define installment structures for fee collection</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/fees/setup`)}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <Button onClick={() => handleOpenModal()} className="bg-[#2F6FED] hover:bg-[#1E3A8A] text-white">
            <Plus size={18} className="mr-2" />
            Add Schedule
          </Button>
        </div>
      </motion.div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <Check size={20} />
            <span>{success}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Search schedules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
            <select
              value={filterAcademicYear}
              onChange={(e) => setFilterAcademicYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
            >
              <option value="">All Years</option>
              {academicYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterActive === null ? '' : filterActive.toString()}
              onChange={(e) => setFilterActive(e.target.value === '' ? null : e.target.value === 'true')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Schedules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-8 text-center text-gray-500">Loading...</div>
        ) : filteredSchedules.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-500">
            {schedules.length === 0 ? 'No fee schedules found. Create your first one!' : 'No schedules match your filters.'}
          </div>
        ) : (
          filteredSchedules.map((schedule) => (
            <Card key={schedule.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{schedule.schedule_name}</h3>
                  <p className="text-sm text-gray-600">{schedule.academic_year}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  schedule.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {schedule.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Installments:</span>
                  <span className="font-semibold text-gray-900">{schedule.number_of_installments}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Frequency:</span>
                  <span className="font-semibold text-gray-900 capitalize">{schedule.collection_frequency}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Period:</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(schedule.start_date).toLocaleDateString()} - {new Date(schedule.end_date).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleOpenModal(schedule)}
                  className="flex-1 px-3 py-2 text-sm font-medium text-[#2F6FED] hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(schedule.id)}
                  className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingSchedule ? 'Edit Fee Schedule' : 'Add Fee Schedule'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Schedule Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.schedule_name}
                      onChange={(e) => setFormData({ ...formData, schedule_name: e.target.value })}
                      placeholder="e.g., Annual 2026, Quarterly 2026-27"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.academic_year}
                      onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                      placeholder="e.g., 2026-27"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Installments <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={formData.number_of_installments}
                      onChange={(e) => setFormData({ ...formData, number_of_installments: e.target.value })}
                      min="1"
                      max="12"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Collection Frequency <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.collection_frequency}
                      onChange={(e) => setFormData({ ...formData, collection_frequency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
                      required
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annual">Annual</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Collection Date</label>
                    <Input
                      type="date"
                      value={formData.last_collection_date}
                      onChange={(e) => setFormData({ ...formData, last_collection_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 text-[#2F6FED] border-gray-300 rounded focus:ring-[#2F6FED]"
                      />
                      <span className="text-sm font-medium text-gray-700">Is Active</span>
                    </label>
                  </div>
                </div>

                {/* Installments Section */}
                {installments.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <CalendarDays size={20} className="text-[#2F6FED]" />
                      Installments
                    </h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {installments.map((inst, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <Input
                              type="text"
                              value={inst.name}
                              onChange={(e) => {
                                const updated = [...installments];
                                updated[index].name = e.target.value;
                                setInstallments(updated);
                              }}
                              placeholder="Installment name"
                              className="mb-2"
                            />
                            <Input
                              type="date"
                              value={inst.due_date}
                              onChange={(e) => {
                                const updated = [...installments];
                                updated[index].due_date = e.target.value;
                                setInstallments(updated);
                              }}
                            />
                          </div>
                          <div className="text-sm font-medium text-gray-700">
                            #{inst.installment_number}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !formData.schedule_name.trim() || !formData.academic_year.trim()}
                  className="bg-[#2F6FED] hover:bg-[#1E3A8A] text-white"
                >
                  {saving ? 'Saving...' : editingSchedule ? 'Update' : 'Create'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
