'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  ArrowLeft, 
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Search,
  Save,
  X,
  Calendar,
  DollarSign,
  FileText,
} from 'lucide-react';

interface Income {
  id: string;
  source: string;
  amount: number;
  entry_date: string;
  reference_number?: string;
  notes?: string;
  financial_year_id?: string;
}

export default function ManageIncomePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [incomeEntries, setIncomeEntries] = useState<Income[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    source: '',
    start_date: '',
    end_date: '',
  });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    source: '',
    amount: '',
    entry_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: '',
  });

  // Mock data
  const incomeSources = ['Fees', 'Donation', 'Grant', 'Other'];

  const mockIncome: Income[] = [
    {
      id: '1',
      source: 'Fees',
      amount: 500000,
      entry_date: '2024-12-15',
      reference_number: 'TXN789012',
      notes: 'Monthly fee collection',
    },
    {
      id: '2',
      source: 'Donation',
      amount: 100000,
      entry_date: '2024-12-10',
      reference_number: 'DON001',
      notes: 'Charity donation',
    },
    {
      id: '3',
      source: 'Grant',
      amount: 250000,
      entry_date: '2024-12-05',
      reference_number: 'GRANT2024',
      notes: 'Government grant',
    },
  ];

  useEffect(() => {
    // TODO: Fetch income entries
    setIncomeEntries(mockIncome);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, filters]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleOpenModal = (income?: Income) => {
    if (income) {
      setEditingId(income.id);
      setFormData({
        source: income.source,
        amount: income.amount.toString(),
        entry_date: income.entry_date,
        reference_number: income.reference_number || '',
        notes: income.notes || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        source: '',
        amount: '',
        entry_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        notes: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    // TODO: Implement API call
    console.log('Saving income:', formData);
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this income entry?')) {
      // TODO: Implement API call
      console.log('Deleting income:', id);
    }
  };

  const filteredIncome = incomeEntries.filter(income => {
    const matchesSearch = 
      income.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      income.reference_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = !filters.source || income.source === filters.source;
    const matchesDateRange = 
      (!filters.start_date || income.entry_date >= filters.start_date) &&
      (!filters.end_date || income.entry_date <= filters.end_date);
    return matchesSearch && matchesSource && matchesDateRange;
  });

  const totalAmount = filteredIncome.reduce((sum, inc) => sum + inc.amount, 0);

  return (
    <div className="space-y-6 pb-8 min-h-screen bg-[#ECEDED]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <TrendingUp className="text-white" size={24} />
            </div>
            Manage Income
          </h1>
          <p className="text-gray-600">Track and manage all income transactions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
          >
            <Plus size={18} className="mr-2" />
            Add Income
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/expense-income`)}
            className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
        </div>
      </motion.div>

      {/* Summary Card */}
      <Card className="p-5 bg-gradient-to-br from-green-500 to-green-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-green-100 mb-1">Total Income</p>
            <p className="text-3xl font-bold">{formatCurrency(totalAmount)}</p>
            <p className="text-xs text-green-100 mt-1">{filteredIncome.length} transactions</p>
          </div>
          <TrendingUp size={48} className="opacity-30" />
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search income..."
              className="pl-10"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Source</label>
            <select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">All Sources</option>
              {incomeSources.map(source => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
            <Input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
            <Input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {/* Income Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Source</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Reference</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Notes</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredIncome.map((income, index) => (
                <motion.tr
                  key={income.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(income.entry_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                      {income.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                    {formatCurrency(income.amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                    {income.reference_number || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {income.notes || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenModal(income)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(income.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredIncome.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">No income entries found</p>
            <p className="text-sm text-gray-400 mt-1">Add your first income entry to get started</p>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200"
            >
              <div className="p-6 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">
                    {editingId ? 'Edit Income' : 'Add Income'}
                  </h3>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Source <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    >
                      <option value="">Select Source</option>
                      {incomeSources.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <DollarSign size={14} className="inline mr-1" />
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                      min="0"
                      step="0.01"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar size={14} className="inline mr-1" />
                      Entry Date <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="date"
                      value={formData.entry_date}
                      onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                      required
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reference Number
                    </label>
                    <Input
                      value={formData.reference_number}
                      onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                      placeholder="Transaction reference"
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <FileText size={14} className="inline mr-1" />
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!formData.source || !formData.amount}
                  className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
                >
                  <Save size={18} className="mr-2" />
                  {editingId ? 'Update' : 'Create'} Income
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



