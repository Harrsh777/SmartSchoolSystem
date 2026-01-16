'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  Tag, 
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Check,
  AlertCircle,
  Percent,
  Calendar
} from 'lucide-react';

interface Discount {
  id: string;
  discount_name: string;
  discount_type: 'fixed' | 'percentage';
  discount_value: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  remarks?: string;
}

interface Fine {
  id: string;
  fine_name: string;
  fine_type: 'fixed' | 'percentage' | 'daily';
  fine_value: number;
  applicable_from_days?: number; // UI field name
  applicable_after_days?: number; // DB field name
  max_fine_amount?: number;
  is_active: boolean;
  remarks?: string;
}

export default function DiscountsFinesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'discounts' | 'fines'>('discounts');
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Discount | Fine | null>(null);
  const [saving, setSaving] = useState(false);

  const [discountForm, setDiscountForm] = useState({
    discount_name: '',
    discount_type: 'percentage' as 'fixed' | 'percentage',
    discount_value: '0',
    start_date: '',
    end_date: '',
    is_active: true,
    remarks: '',
  });

  const [fineForm, setFineForm] = useState({
    fine_name: '',
    fine_type: 'daily' as 'fixed' | 'percentage' | 'daily',
    fine_value: '0',
    applicable_from_days: '1', // Maps to applicable_after_days in DB
    max_fine_amount: '',
    is_active: true,
    remarks: '',
  });

  useEffect(() => {
    fetchDiscounts();
    fetchFines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchDiscounts = useCallback(async () => {
    try {
      const response = await fetch(`/api/fees/discounts?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok) {
        setDiscounts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching discounts:', error);
    } finally {
      setLoading(false);
    }
  }, [schoolCode]);

  const fetchFines = useCallback(async () => {
    try {
      const response = await fetch(`/api/fees/fines?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok) {
        setFines(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching fines:', error);
    }
  }, [schoolCode]);

  const handleOpenModal = (item?: Discount | Fine) => {
    if (item) {
      setEditingItem(item);
      if (activeTab === 'discounts') {
        const discount = item as Discount;
        setDiscountForm({
          discount_name: discount.discount_name || '',
          discount_type: discount.discount_type || 'percentage',
          discount_value: discount.discount_value?.toString() || '0',
          start_date: discount.start_date || '',
          end_date: discount.end_date || '',
          is_active: discount.is_active !== false,
          remarks: discount.remarks || '',
        });
      } else {
        const fine = item as Fine;
        setFineForm({
          fine_name: fine.fine_name || '',
          fine_type: fine.fine_type || 'daily',
          fine_value: fine.fine_value?.toString() || '0',
          applicable_from_days: fine.applicable_after_days?.toString() || fine.applicable_from_days?.toString() || '1',
          max_fine_amount: fine.max_fine_amount?.toString() || '',
          is_active: fine.is_active !== false,
          remarks: fine.remarks || '',
        });
      }
    } else {
      setEditingItem(null);
      if (activeTab === 'discounts') {
        setDiscountForm({
          discount_name: '',
          discount_type: 'percentage',
          discount_value: '0',
          start_date: '',
          end_date: '',
          is_active: true,
          remarks: '',
        });
      } else {
        setFineForm({
          fine_name: '',
          fine_type: 'daily',
          fine_value: '0',
          applicable_from_days: '1',
          max_fine_amount: '',
          is_active: true,
          remarks: '',
        });
      }
    }
    setModalOpen(true);
    setError('');
    setSuccess('');
  };

  const handleSaveDiscount = async () => {
    if (!discountForm.discount_name.trim()) {
      setError('Discount name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const url = editingItem
        ? `/api/fees/discounts/${editingItem.id}`
        : '/api/fees/discounts';
      const method = editingItem ? 'PATCH' : 'POST';

      const body = {
        school_code: schoolCode,
        ...discountForm,
        discount_value: parseFloat(discountForm.discount_value) || 0,
        start_date: discountForm.start_date || null,
        end_date: discountForm.end_date || null,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(editingItem ? 'Discount updated successfully!' : 'Discount created successfully!');
        setModalOpen(false);
        fetchDiscounts();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to save discount');
      }
    } catch (err) {
      console.error('Error saving discount:', err);
      setError('Failed to save discount');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFine = async () => {
    if (!fineForm.fine_name.trim()) {
      setError('Fine name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const url = editingItem
        ? `/api/fees/fines/${editingItem.id}`
        : '/api/fees/fines';
      const method = editingItem ? 'PATCH' : 'POST';

      const body: {
        school_code: string;
        fine_name: string;
        fine_type: 'fixed' | 'percentage' | 'daily';
        fine_value: number;
        applicable_from_days: number;
        is_active: boolean;
        max_fine_amount?: number;
        remarks?: string;
      } = {
        school_code: schoolCode,
        fine_name: fineForm.fine_name,
        fine_type: fineForm.fine_type,
        fine_value: parseFloat(fineForm.fine_value) || 0,
        applicable_from_days: parseInt(fineForm.applicable_from_days) || 1, // API will map to applicable_after_days
        is_active: fineForm.is_active,
      };
      
      if (fineForm.max_fine_amount) {
        body.max_fine_amount = parseFloat(fineForm.max_fine_amount);
      }
      if (fineForm.remarks) {
        body.remarks = fineForm.remarks;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(editingItem ? 'Fine rule updated successfully!' : 'Fine rule created successfully!');
        setModalOpen(false);
        fetchFines();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to save fine rule');
      }
    } catch (err) {
      console.error('Error saving fine:', err);
      setError('Failed to save fine rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, type: 'discount' | 'fine') => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) {
      return;
    }

    try {
      const url = type === 'discount' 
        ? `/api/fees/discounts/${id}`
        : `/api/fees/fines/${id}`;
      
      const response = await fetch(url, { method: 'DELETE' });
      const result = await response.json();

      if (response.ok) {
        setSuccess(`${type === 'discount' ? 'Discount' : 'Fine'} deleted successfully!`);
        if (type === 'discount') {
          fetchDiscounts();
        } else {
          fetchFines();
        }
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || `Failed to delete ${type}`);
      }
    } catch (err) {
      console.error(`Error deleting ${type}:`, err);
      setError(`Failed to delete ${type}`);
    }
  };

  const filteredDiscounts = discounts.filter(d => 
    d.discount_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFines = fines.filter(f => 
    f.fine_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <Tag className="text-[#2F6FED]" size={32} />
            Discounts & Fines
          </h1>
          <p className="text-gray-600">Manage fee discounts and late fee rules</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/fees`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
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

      {/* Tabs */}
      <Card className="p-0 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('discounts')}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'discounts'
                ? 'text-[#2F6FED] border-b-2 border-[#2F6FED] bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Discounts
          </button>
          <button
            onClick={() => setActiveTab('fines')}
            className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
              activeTab === 'fines'
                ? 'text-[#2F6FED] border-b-2 border-[#2F6FED] bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Fine Rules
          </button>
        </div>

        <div className="p-6">
          {/* Search and Add Button */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-[#2F6FED] hover:bg-[#1E3A8A] text-white"
            >
              <Plus size={18} className="mr-2" />
              Add {activeTab === 'discounts' ? 'Discount' : 'Fine Rule'}
            </Button>
          </div>

          {/* Discounts List */}
          {activeTab === 'discounts' && (
            <div className="space-y-4">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : filteredDiscounts.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {discounts.length === 0 ? 'No discounts found. Create your first one!' : 'No discounts match your search.'}
                </div>
              ) : (
                filteredDiscounts.map((discount) => (
                  <Card key={discount.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{discount.discount_name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            discount.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {discount.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Percent size={14} />
                            {discount.discount_type === 'percentage' 
                              ? `${discount.discount_value}%`
                              : `₹${discount.discount_value.toLocaleString('en-IN')}`
                            }
                          </span>
                          {discount.start_date && discount.end_date && (
                            <span className="flex items-center gap-1">
                              <Calendar size={14} />
                              {new Date(discount.start_date).toLocaleDateString()} - {new Date(discount.end_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {discount.remarks && (
                          <p className="text-sm text-gray-600 mt-2">{discount.remarks}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(discount)}
                          className="p-2 text-[#2F6FED] hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(discount.id, 'discount')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Fines List */}
          {activeTab === 'fines' && (
            <div className="space-y-4">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : filteredFines.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {fines.length === 0 ? 'No fine rules found. Create your first one!' : 'No fine rules match your search.'}
                </div>
              ) : (
                filteredFines.map((fine) => (
                  <Card key={fine.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{fine.fine_name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            fine.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {fine.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="capitalize">{fine.fine_type}</span>
                          {fine.fine_type === 'percentage' 
                            ? `: ${fine.fine_value}%`
                            : `: ₹${fine.fine_value.toLocaleString('en-IN')}${fine.fine_type === 'daily' ? ' per day' : ''}`
                          }
                          <span>• Applicable after {fine.applicable_after_days || fine.applicable_from_days || 1} days</span>
                        </div>
                        {fine.remarks && (
                          <p className="text-sm text-gray-600 mt-2">{fine.remarks}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(fine)}
                          className="p-2 text-[#2F6FED] hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(fine.id, 'fine')}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingItem ? `Edit ${activeTab === 'discounts' ? 'Discount' : 'Fine Rule'}` : `Add ${activeTab === 'discounts' ? 'Discount' : 'Fine Rule'}`}
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

                {activeTab === 'discounts' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Discount Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={discountForm.discount_name}
                        onChange={(e) => setDiscountForm({ ...discountForm, discount_name: e.target.value })}
                        placeholder="e.g., Early Bird Discount"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Discount Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={discountForm.discount_type}
                          onChange={(e) => setDiscountForm({ ...discountForm, discount_type: e.target.value as 'fixed' | 'percentage' })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Amount (₹)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Discount Value <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          value={discountForm.discount_value}
                          onChange={(e) => setDiscountForm({ ...discountForm, discount_value: e.target.value })}
                          placeholder={discountForm.discount_type === 'percentage' ? 'e.g., 10' : 'e.g., 500'}
                          min="0"
                          step={discountForm.discount_type === 'percentage' ? '0.01' : '1'}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <Input
                          type="date"
                          value={discountForm.start_date}
                          onChange={(e) => setDiscountForm({ ...discountForm, start_date: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                        <Input
                          type="date"
                          value={discountForm.end_date}
                          onChange={(e) => setDiscountForm({ ...discountForm, end_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={discountForm.is_active}
                          onChange={(e) => setDiscountForm({ ...discountForm, is_active: e.target.checked })}
                          className="w-4 h-4 text-[#2F6FED] border-gray-300 rounded focus:ring-[#2F6FED]"
                        />
                        <span className="text-sm font-medium text-gray-700">Is Active</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                      <textarea
                        value={discountForm.remarks}
                        onChange={(e) => setDiscountForm({ ...discountForm, remarks: e.target.value })}
                        placeholder="Additional notes..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveDiscount}
                        disabled={saving || !discountForm.discount_name.trim()}
                        className="bg-[#2F6FED] hover:bg-[#1E3A8A] text-white"
                      >
                        {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fine Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={fineForm.fine_name}
                        onChange={(e) => setFineForm({ ...fineForm, fine_name: e.target.value })}
                        placeholder="e.g., Late Fee Rule 2026"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fine Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={fineForm.fine_type}
                          onChange={(e) => setFineForm({ ...fineForm, fine_type: e.target.value as 'fixed' | 'percentage' | 'daily' })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED]"
                        >
                          <option value="fixed">Fixed Amount</option>
                          <option value="percentage">Percentage of Amount</option>
                          <option value="daily">Daily Rate</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fine Value <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          value={fineForm.fine_value}
                          onChange={(e) => setFineForm({ ...fineForm, fine_value: e.target.value })}
                          placeholder={fineForm.fine_type === 'percentage' ? 'e.g., 5' : 'e.g., 50'}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Applicable From (Days Overdue) <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          value={fineForm.applicable_from_days}
                          onChange={(e) => setFineForm({ ...fineForm, applicable_from_days: e.target.value })}
                          placeholder="e.g., 1"
                          min="1"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">Fine will be applicable after this many days of overdue</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Fine Amount (Optional)
                        </label>
                        <Input
                          type="number"
                          value={fineForm.max_fine_amount}
                          onChange={(e) => setFineForm({ ...fineForm, max_fine_amount: e.target.value })}
                          placeholder="e.g., 5000"
                          min="0"
                          step="0.01"
                        />
                        <p className="text-xs text-gray-500 mt-1">Maximum fine amount cap</p>
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fineForm.is_active}
                          onChange={(e) => setFineForm({ ...fineForm, is_active: e.target.checked })}
                          className="w-4 h-4 text-[#2F6FED] border-gray-300 rounded focus:ring-[#2F6FED]"
                        />
                        <span className="text-sm font-medium text-gray-700">Is Active</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                      <textarea
                        value={fineForm.remarks}
                        onChange={(e) => setFineForm({ ...fineForm, remarks: e.target.value })}
                        placeholder="Additional notes..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveFine}
                        disabled={saving || !fineForm.fine_name.trim()}
                        className="bg-[#2F6FED] hover:bg-[#1E3A8A] text-white"
                      >
                        {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
