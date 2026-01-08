'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  ArrowLeft, 
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  Search,
  Save,
  X,
  Calendar,
  DollarSign,
  User,
  CreditCard,
  Filter,
  Download
} from 'lucide-react';

interface Expense {
  id: string;
  category: string;
  amount: number;
  entry_date: string;
  paid_to: string;
  payment_mode: string;
  reference_number?: string;
  notes?: string;
  is_finalized: boolean;
  financial_year_id?: string;
}

export default function ManageExpensesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    payment_mode: '',
    start_date: '',
    end_date: '',
  });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    entry_date: new Date().toISOString().split('T')[0],
    paid_to: '',
    payment_mode: 'Cash',
    reference_number: '',
    notes: '',
    is_finalized: false,
  });

  // Mock data
  const categories = ['Salary', 'Utility', 'Maintenance', 'Vendor', 'Transport', 'Other'];
  const paymentModes = ['Cash', 'Bank', 'UPI', 'Cheque', 'Card'];

  const mockExpenses: Expense[] = [
    {
      id: '1',
      category: 'Utility',
      amount: 50000,
      entry_date: '2024-12-15',
      paid_to: 'Electricity Board',
      payment_mode: 'Bank',
      reference_number: 'TXN123456',
      notes: 'Monthly electricity bill',
      is_finalized: true,
    },
    {
      id: '2',
      category: 'Maintenance',
      amount: 25000,
      entry_date: '2024-12-10',
      paid_to: 'ABC Maintenance Services',
      payment_mode: 'UPI',
      notes: 'Building maintenance',
      is_finalized: false,
    },
    {
      id: '3',
      category: 'Vendor',
      amount: 15000,
      entry_date: '2024-12-05',
      paid_to: 'XYZ Suppliers',
      payment_mode: 'Cheque',
      reference_number: 'CHQ001234',
      notes: 'Stationery supplies',
      is_finalized: true,
    },
  ];

  useEffect(() => {
    // TODO: Fetch expenses
    setExpenses(mockExpenses);
  }, [schoolCode, filters]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setEditingId(expense.id);
      setFormData({
        category: expense.category,
        amount: expense.amount.toString(),
        entry_date: expense.entry_date,
        paid_to: expense.paid_to,
        payment_mode: expense.payment_mode,
        reference_number: expense.reference_number || '',
        notes: expense.notes || '',
        is_finalized: expense.is_finalized,
      });
    } else {
      setEditingId(null);
      setFormData({
        category: '',
        amount: '',
        entry_date: new Date().toISOString().split('T')[0],
        paid_to: '',
        payment_mode: 'Cash',
        reference_number: '',
        notes: '',
        is_finalized: false,
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
    console.log('Saving expense:', formData);
    handleCloseModal();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      // TODO: Implement API call
      console.log('Deleting expense:', id);
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.paid_to.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.reference_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filters.category || expense.category === filters.category;
    const matchesPaymentMode = !filters.payment_mode || expense.payment_mode === filters.payment_mode;
    const matchesDateRange = 
      (!filters.start_date || expense.entry_date >= filters.start_date) &&
      (!filters.end_date || expense.entry_date <= filters.end_date);
    return matchesSearch && matchesCategory && matchesPaymentMode && matchesDateRange;
  });

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

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
              <TrendingDown className="text-white" size={24} />
            </div>
            Manage Expenses
          </h1>
          <p className="text-gray-600">Track and manage all expense transactions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
          >
            <Plus size={18} className="mr-2" />
            Add Expense
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
      <Card className="p-5 bg-gradient-to-br from-red-500 to-red-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-red-100 mb-1">Total Expenses</p>
            <p className="text-3xl font-bold">{formatCurrency(totalAmount)}</p>
            <p className="text-xs text-red-100 mt-1">{filteredExpenses.length} transactions</p>
          </div>
          <TrendingDown size={48} className="opacity-30" />
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses..."
              className="pl-10"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Mode</label>
            <select
              value={filters.payment_mode}
              onChange={(e) => setFilters({ ...filters, payment_mode: e.target.value })}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
            >
              <option value="">All Modes</option>
              {paymentModes.map(mode => (
                <option key={mode} value={mode}>{mode}</option>
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

      {/* Expenses Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Paid To</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Payment Mode</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Reference</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredExpenses.map((expense, index) => (
                <motion.tr
                  key={expense.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(expense.entry_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{expense.paid_to}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-red-600">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{expense.payment_mode}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                    {expense.reference_number || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      expense.is_finalized 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }`}>
                      {expense.is_finalized ? 'Finalized' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenModal(expense)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
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

        {filteredExpenses.length === 0 && (
          <div className="text-center py-12">
            <TrendingDown size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 font-medium">No expenses found</p>
            <p className="text-sm text-gray-400 mt-1">Add your first expense to get started</p>
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
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">
                    {editingId ? 'Edit Expense' : 'Add Expense'}
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
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
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

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <User size={14} className="inline mr-1" />
                    Paid To <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.paid_to}
                    onChange={(e) => setFormData({ ...formData, paid_to: e.target.value })}
                    required
                    className="w-full"
                  />
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
                      <CreditCard size={14} className="inline mr-1" />
                      Payment Mode <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.payment_mode}
                      onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                    >
                      {paymentModes.map(mode => (
                        <option key={mode} value={mode}>{mode}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Reference Number
                  </label>
                  <Input
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    placeholder="Transaction/Cheque/UPI reference"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Finalized
                    </label>
                    <p className="text-xs text-gray-600">Mark as finalized to prevent further edits</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_finalized: !formData.is_finalized })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.is_finalized ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.is_finalized ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
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
                  disabled={!formData.category || !formData.amount || !formData.paid_to}
                  className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white"
                >
                  <Save size={18} className="mr-2" />
                  {editingId ? 'Update' : 'Create'} Expense
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



