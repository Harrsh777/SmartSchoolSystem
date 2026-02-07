'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  IndianRupee,
  Users,
  X,
  Filter,
  Download,
  Printer,
} from 'lucide-react';
import { getExpensesPrintHtml, printHtml, downloadHtml } from '@/lib/print-utils';

interface FinancialYear {
  id: string;
  year_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface IncomeEntry {
  id: string;
  source: string;
  amount: number;
  entry_date: string;
  reference_number: string | null;
  notes: string | null;
}

interface ExpenseEntry {
  id: string;
  category: string;
  amount: number;
  entry_date: string;
  paid_to: string;
  payment_mode: string;
  notes: string | null;
  is_finalized: boolean;
}

interface SalaryRecord {
  id: string;
  staff_id: string;
  staff?: {
    full_name: string;
    designation: string;
  };
  salary_month: string;
  base_salary: number;
  bonus: number;
  deduction: number;
  net_salary: number;
  payment_status: string;
  payment_date: string | null;
}

interface OverviewData {
  income: { month: number; year: number };
  expense: { month: number; year: number };
  netBalance: { month: number; year: number };
  salary: { paid: number; pending: number; total: number };
}

type Tab = 'overview' | 'income' | 'expense' | 'salary' | 'reports';

export default function ExpenseIncomePage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<FinancialYear | null>(null);
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchFinancialYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (selectedYear) {
      fetchOverview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, schoolCode]);

  const fetchFinancialYears = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/finance/financial-years?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data && result.data.length > 0) {
        setFinancialYears(result.data);
        const current = result.data.find((y: FinancialYear) => y.is_current);
        setSelectedYear(current || result.data[0] || null);
      } else {
        // If no years exist, the API will create one, so retry
        const retryResponse = await fetch(`/api/finance/financial-years?school_code=${schoolCode}`);
        const retryResult = await retryResponse.json();
        if (retryResponse.ok && retryResult.data && retryResult.data.length > 0) {
          setFinancialYears(retryResult.data);
          setSelectedYear(retryResult.data[0]);
        } else {
          setError(result.error || 'Failed to load financial years');
        }
      }
    } catch (err) {
      console.error('Error fetching financial years:', err);
      setError('Failed to load financial years. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      setError('');
      const response = await fetch(
        `/api/finance/overview?school_code=${schoolCode}${selectedYear ? `&financial_year_id=${selectedYear.id}` : ''}`
      );
      const result = await response.json();
      if (response.ok && result.data) {
        setOverviewData(result.data);
      } else {
        setError(result.error || 'Failed to load overview data');
      }
    } catch (err) {
      console.error('Error fetching overview:', err);
      setError('Failed to load overview data. Please try again.');
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
    <div className="space-y-6 pb-20 min-h-screen bg-wh">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <TrendingUp size={32} className="text-blue-300" />
            Expense/Income Management
          </h1>
          <p className="text-blue-200/80">Manage school finances, income, expenses, and salaries</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}`)}
          className="border-blue-500 text-blue-200 hover:bg-blue-500/20 hover:border-blue-400"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-400/50 text-red-200 px-4 py-3 rounded-lg flex items-center justify-between"
        >
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-300 hover:text-red-100">
            <X size={18} />
          </button>
        </motion.div>
      )}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/10 border border-emerald-400/50 text-emerald-200 px-4 py-3 rounded-lg flex items-center justify-between"
        >
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-emerald-300 hover:text-emerald-100">
            <X size={18} />
          </button>
        </motion.div>
      )}

      {/* Financial Year Selector */}
      <Card className="p-4 bg-slate-800/60 border-blue-700/50 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-blue-200">Financial Year</label>
            <select
              value={selectedYear?.id || ''}
              onChange={(e) => {
                const year = financialYears.find((y) => y.id === e.target.value);
                setSelectedYear(year || null);
              }}
              className="px-4 py-2 border border-blue-600 rounded-lg bg-slate-800 text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 min-w-[200px]"
              disabled={financialYears.length === 0}
            >
              {financialYears.length === 0 ? (
                <option value="">No financial years available</option>
              ) : (
                financialYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year_name} {year.is_current ? '(Current)' : ''}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-blue-700/50">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'income', label: 'Income', icon: IndianRupee },
            { id: 'expense', label: 'Expenses', icon: TrendingUp },
            { id: 'salary', label: 'Salaries', icon: Users },
            { id: 'reports', label: 'Reports', icon: Download },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-400 text-blue-200'
                    : 'border-transparent text-blue-300/70 hover:text-blue-200 hover:border-blue-600/50'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <OverviewTab
            schoolCode={schoolCode}
            financialYearId={selectedYear?.id}
            financialYearName={selectedYear?.year_name}
            overviewData={overviewData}
            onRefresh={fetchOverview}
          />
        )}
        {activeTab === 'income' && (
          <IncomeTab
            schoolCode={schoolCode}
            financialYearId={selectedYear?.id}
            onRefresh={fetchOverview}
          />
        )}
        {activeTab === 'expense' && (
          <ExpenseTab
            schoolCode={schoolCode}
            financialYearId={selectedYear?.id}
            onRefresh={fetchOverview}
          />
        )}
        {activeTab === 'salary' && (
          <SalaryTab
            schoolCode={schoolCode}
            financialYearId={selectedYear?.id}
            onRefresh={fetchOverview}
          />
        )}
        {activeTab === 'reports' && (
          <ReportsTab
            schoolCode={schoolCode}
            financialYearId={selectedYear?.id}
          />
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({
  financialYearName,
  overviewData,
}: {
  schoolCode: string;
  financialYearId?: string | null;
  financialYearName?: string;
  overviewData: OverviewData | null;
  onRefresh: () => void;
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleDownloadReceipt = () => {
    const data = overviewData ?? {
      income: { month: 0, year: 0 },
      expense: { month: 0, year: 0 },
      netBalance: { month: 0, year: 0 },
      salary: { paid: 0, pending: 0, total: 0 },
    };
    const html = getFinanceOverviewReceiptHtml(data, financialYearName);
    const date = new Date().toISOString().slice(0, 10);
    const yearLabel = (financialYearName ? financialYearName.replace(/\s*\(Current\)$/i, '').replace(/\s+/g, '-') : 'Overview');
    downloadHtml(
      typeof html === 'string' ? html : '',
      `Finance_Overview_Receipt_${yearLabel}_${date}.html`
    );
  };

  return (
    <div className="space-y-6">
      {/* Download receipt */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleDownloadReceipt}
          className="flex items-center gap-2 border-blue-500 text-blue-200 hover:bg-blue-500/20"
        >
          <Download size={18} />
          Download receipt
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-slate-800/60 border-blue-600/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-200/80 mb-1">Total Income (Month)</p>
              <p className="text-2xl font-bold text-white">
                {overviewData ? formatCurrency(overviewData.income.month) : '₹0'}
              </p>
            </div>
            <IndianRupee className="text-emerald-400" size={32} />
          </div>
        </Card>

        <Card className="p-6 bg-slate-800/60 border-blue-600/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-200/80 mb-1">Total Expenses (Month)</p>
              <p className="text-2xl font-bold text-white">
                {overviewData ? formatCurrency(overviewData.expense.month) : '₹0'}
              </p>
            </div>
            <TrendingUp className="text-rose-400" size={32} />
          </div>
        </Card>

        <Card className="p-6 bg-slate-800/60 border-blue-600/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-200/80 mb-1">Net Balance (Month)</p>
              <p className={`text-2xl font-bold ${overviewData && overviewData.netBalance.month < 0 ? 'text-rose-400' : 'text-white'}`}>
                {overviewData ? formatCurrency(overviewData.netBalance.month) : '₹0'}
              </p>
            </div>
            <TrendingUp className="text-blue-400" size={32} />
          </div>
        </Card>

        <Card className="p-6 bg-slate-800/60 border-blue-600/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-200/80 mb-1">Total Income (Year)</p>
              <p className="text-2xl font-bold text-white">
                {overviewData ? formatCurrency(overviewData.income.year) : '₹0'}
              </p>
            </div>
            <IndianRupee className="text-violet-400" size={32} />
          </div>
        </Card>
      </div>

      {/* Salary Summary */}
      <Card className="p-6 bg-slate-800/60 border-blue-600/50">
        <h2 className="text-xl font-bold text-white mb-4">Salary Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-900/40 rounded-lg border border-blue-600/40">
            <p className="text-sm text-blue-200/80 mb-1">Paid</p>
            <p className="text-2xl font-bold text-white">
              {overviewData ? formatCurrency(overviewData.salary.paid) : '₹0'}
            </p>
          </div>
          <div className="p-4 bg-blue-900/40 rounded-lg border border-blue-600/40">
            <p className="text-sm text-blue-200/80 mb-1">Pending</p>
            <p className="text-2xl font-bold text-white">
              {overviewData ? formatCurrency(overviewData.salary.pending) : '₹0'}
            </p>
          </div>
          <div className="p-4 bg-blue-900/40 rounded-lg border border-blue-600/40">
            <p className="text-sm text-blue-200/80 mb-1">Total</p>
            <p className="text-2xl font-bold text-white">
              {overviewData ? formatCurrency(overviewData.salary.total) : '₹0'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Income Tab Component
function IncomeTab({
  schoolCode,
  financialYearId,
  onRefresh,
}: {
  schoolCode: string;
  financialYearId?: string | null;
  onRefresh: () => void;
}) {
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<IncomeEntry | null>(null);
  const [filters, setFilters] = useState({
    source: '',
    start_date: '',
    end_date: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchIncomeEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, financialYearId, filters, page]);

  const fetchIncomeEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        school_code: schoolCode,
        page: page.toString(),
        limit: '50',
      });
      if (financialYearId) params.append('financial_year_id', financialYearId);
      if (filters.source) params.append('source', filters.source);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const response = await fetch(`/api/finance/income?${params}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setIncomeEntries(result.data);
        setTotalPages(result.pagination?.totalPages || 1);
      } else {
        console.error('Error fetching income entries:', result.error);
      }
    } catch (err) {
      console.error('Error fetching income entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this income entry? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/finance/income/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchIncomeEntries();
        onRefresh();
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to delete income entry. ' + (result.details || ''));
      }
    } catch (err) {
      console.error('Error deleting income entry:', err);
      alert('Failed to delete income entry. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Income Entries</h2>
        <Button
          onClick={() => {
            setEditingEntry(null);
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white border-0"
        >
          <Plus size={18} className="mr-2" />
          Add Income
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-slate-800/60 border-blue-600/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">Source</label>
            <select
              value={filters.source}
              onChange={(e) => setFilters({ ...filters, source: e.target.value })}
              className="w-full px-4 py-2 border border-blue-600 rounded-lg bg-slate-800 text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">All Sources</option>
              <option value="Fees">Fees</option>
              <option value="Donation">Donation</option>
              <option value="Grant">Grant</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">Start Date</label>
            <Input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="bg-slate-800 border-blue-600 text-blue-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">End Date</label>
            <Input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="bg-slate-800 border-blue-600 text-blue-100"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => setFilters({ source: '', start_date: '', end_date: '' })}
              className="w-full border-blue-500 text-blue-200 hover:bg-blue-500/20"
            >
              <Filter size={18} className="mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Income Table */}
      <Card className="p-6 bg-slate-800/60 border-blue-600/50">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : incomeEntries.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-900 text-blue-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Source</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Reference</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Notes</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-700/30">
                  {incomeEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-blue-900/30">
                      <td className="px-4 py-3 text-sm text-blue-100">{formatDate(entry.entry_date)}</td>
                      <td className="px-4 py-3 text-sm text-blue-100">{entry.source}</td>
                      <td className="px-4 py-3 text-sm font-medium text-white">{formatCurrency(entry.amount)}</td>
                      <td className="px-4 py-3 text-sm text-blue-100">{entry.reference_number || '-'}</td>
                      <td className="px-4 py-3 text-sm text-blue-100">{entry.notes || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingEntry(entry);
                              setShowModal(true);
                            }}
                            className="p-2 text-blue-300 hover:bg-blue-500/30 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-blue-700/50">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-blue-600 rounded-lg text-blue-200 hover:bg-blue-500/20 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-blue-200">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-blue-600 rounded-lg text-blue-200 hover:bg-blue-500/20 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-blue-200/80">
            No income entries found. Click &quot;Add Income&quot; to create one.
          </div>
        )}
      </Card>

      {/* Income Modal */}
      {showModal && (
        <IncomeModal
          schoolCode={schoolCode}
          financialYearId={financialYearId}
          entry={editingEntry}
          onClose={() => {
            setShowModal(false);
            setEditingEntry(null);
            fetchIncomeEntries();
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// Income Modal Component
function IncomeModal({
  schoolCode,
  financialYearId,
  entry,
  onClose,
}: {
  schoolCode: string;
  financialYearId?: string | null;
  entry: IncomeEntry | null;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    source: entry?.source || 'Fees',
    amount: entry?.amount.toString() || '',
    entry_date: entry?.entry_date || new Date().toISOString().split('T')[0],
    reference_number: entry?.reference_number || '',
    notes: entry?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setSaving(true);
    try {
      const url = entry ? `/api/finance/income/${entry.id}` : '/api/finance/income';
      const method = entry ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          financial_year_id: financialYearId,
          ...formData,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        onClose();
      } else {
        alert(result.error || `Failed to ${entry ? 'update' : 'create'} income entry. ${result.details || ''}`);
      }
    } catch (err) {
      console.error('Error saving income entry:', err);
      alert(`Failed to ${entry ? 'update' : 'create'} income entry. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-lg shadow-xl"
      >
        <Card className="m-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">
              {entry ? 'Edit Income Entry' : 'Add Income Entry'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Source <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              >
                <option value="Fees">Fees</option>
                <option value="Donation">Donation</option>
                <option value="Grant">Grant</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Amount <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={formData.entry_date}
                onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reference Number</label>
              <Input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
                placeholder="Optional notes"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white">
                {saving ? 'Saving...' : entry ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

// Expense Tab Component (similar structure to Income Tab)
function ExpenseTab({
  schoolCode,
  financialYearId,
  onRefresh,
}: {
  schoolCode: string;
  financialYearId?: string | null;
  onRefresh: () => void;
}) {
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ExpenseEntry | null>(null);
  const [filters, setFilters] = useState({
    category: '',
    start_date: '',
    end_date: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchExpenseEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, financialYearId, filters, page]);

  const fetchExpenseEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        school_code: schoolCode,
        page: page.toString(),
        limit: '50',
      });
      if (financialYearId) params.append('financial_year_id', financialYearId);
      if (filters.category) params.append('category', filters.category);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const response = await fetch(`/api/finance/expense?${params}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setExpenseEntries(result.data);
        setTotalPages(result.pagination?.totalPages || 1);
      } else {
        console.error('Error fetching expense entries:', result.error);
      }
    } catch (err) {
      console.error('Error fetching expense entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense entry? This action cannot be undone.')) return;

    try {
      const response = await fetch(`/api/finance/expense/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchExpenseEntries();
        onRefresh();
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to delete expense entry. ' + (result.details || ''));
      }
    } catch (err) {
      console.error('Error deleting expense entry:', err);
      alert('Failed to delete expense entry. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === expenseEntries.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(expenseEntries.map((e) => e.id)));
  };

  const selectedEntries = expenseEntries.filter((e) => selectedIds.has(e.id));

  const handlePrintSelected = () => {
    if (selectedEntries.length === 0) return;
    const html = getExpensesPrintHtml(
      selectedEntries.map((e) => ({
        id: e.id,
        category: e.category,
        amount: e.amount,
        entry_date: e.entry_date,
        paid_to: e.paid_to,
        payment_mode: e.payment_mode,
        notes: e.notes === null ? undefined : e.notes, // Fix: convert null to undefined for type safety
      })),
      'Expense Report'
    );
    printHtml(html, 'Expense Report');
  };

  const handleDownloadSelected = () => {
    if (selectedEntries.length === 0) return;
    const html = getExpensesPrintHtml(
      selectedEntries.map((e) => ({
        id: e.id,
        category: e.category,
        amount: e.amount,
        entry_date: e.entry_date,
        paid_to: e.paid_to,
        payment_mode: e.payment_mode,
        notes: e.notes === null ? undefined : e.notes, // Fix: convert null to undefined
      })),
      'Expense Report'
    );
    downloadHtml(html, `Expenses_${new Date().toISOString().slice(0, 10)}.html`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">Expense Entries</h2>
        <div className="flex items-center gap-2">
          {expenseEntries.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadSelected}
                disabled={selectedIds.size === 0}
                title="Download selected expenses"
                className="border-blue-500 text-blue-200 hover:bg-blue-500/20"
              >
                <Download size={16} className="mr-1" />
                Download ({selectedIds.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintSelected}
                disabled={selectedIds.size === 0}
                title="Print selected expenses"
                className="border-blue-500 text-blue-200 hover:bg-blue-500/20"
              >
                <Printer size={16} className="mr-1" />
                Print ({selectedIds.size})
              </Button>
            </>
          )}
          <Button
            onClick={() => {
              setEditingEntry(null);
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white border-0"
          >
            <Plus size={18} className="mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-slate-800/60 border-blue-600/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-4 py-2 border border-blue-600 rounded-lg bg-slate-800 text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">All Categories</option>
              <option value="Salary">Salary</option>
              <option value="Utility">Utility</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Vendor">Vendor</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">Start Date</label>
            <Input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="bg-slate-800 border-blue-600 text-blue-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">End Date</label>
            <Input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="bg-slate-800 border-blue-600 text-blue-100"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => setFilters({ category: '', start_date: '', end_date: '' })}
              className="w-full border-blue-500 text-blue-200 hover:bg-blue-500/20"
            >
              <Filter size={18} className="mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Expense Table */}
      <Card className="p-6 bg-slate-800/60 border-blue-600/50">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : expenseEntries.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-900 text-blue-100">
                  <tr>
                    <th className="px-2 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={expenseEntries.length > 0 && selectedIds.size === expenseEntries.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Paid To</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Payment Mode</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-700/30">
                  {expenseEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-blue-900/30">
                      <td className="px-2 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(entry.id)}
                          onChange={() => toggleSelect(entry.id)}
                          className="rounded border-blue-500 bg-slate-800"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-100">{formatDate(entry.entry_date)}</td>
                      <td className="px-4 py-3 text-sm text-blue-100">{entry.category}</td>
                      <td className="px-4 py-3 text-sm font-medium text-white">{formatCurrency(entry.amount)}</td>
                      <td className="px-4 py-3 text-sm text-blue-100">{entry.paid_to}</td>
                      <td className="px-4 py-3 text-sm text-blue-100">{entry.payment_mode}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {!entry.is_finalized && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingEntry(entry);
                                  setShowModal(true);
                                }}
                                className="p-2 text-blue-300 hover:bg-blue-500/30 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                          {entry.is_finalized && (
                            <span className="text-xs text-blue-300/70">Finalized</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-blue-700/50">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-blue-600 rounded-lg text-blue-200 hover:bg-blue-500/20 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-blue-200">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-blue-600 rounded-lg text-blue-200 hover:bg-blue-500/20 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-blue-200/80">
            No expense entries found. Click &quot;Add Expense&quot; to create one.
          </div>
        )}
      </Card>

      {/* Expense Modal */}
      {showModal && (
        <ExpenseModal
          schoolCode={schoolCode}
          financialYearId={financialYearId}
          entry={editingEntry}
          onClose={() => {
            setShowModal(false);
            setEditingEntry(null);
            fetchExpenseEntries();
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// Expense Modal Component
function ExpenseModal({
  schoolCode,
  financialYearId,
  entry,
  onClose,
}: {
  schoolCode: string;
  financialYearId?: string | null;
  entry: ExpenseEntry | null;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    category: entry?.category || 'Other',
    amount: entry?.amount.toString() || '',
    entry_date: entry?.entry_date || new Date().toISOString().split('T')[0],
    paid_to: entry?.paid_to || '',
    payment_mode: entry?.payment_mode || 'Bank',
    notes: entry?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0 || !formData.paid_to) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const url = entry ? `/api/finance/expense/${entry.id}` : '/api/finance/expense';
      const method = entry ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          financial_year_id: financialYearId,
          category: formData.category,
          amount: parseFloat(formData.amount) || 0,
          entry_date: formData.entry_date,
          paid_to: formData.paid_to,
          payment_mode: formData.payment_mode,
          notes: formData.notes || null,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        onClose();
      } else {
        alert(result.error || `Failed to ${entry ? 'update' : 'create'} expense entry. ${result.details || ''}`);
      }
    } catch (err) {
      console.error('Error saving expense entry:', err);
      alert(`Failed to ${entry ? 'update' : 'create'} expense entry. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const numeric = raw.replace(/[^0-9.]/g, '');
    const parts = numeric.split('.');
    const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : numeric;
    setFormData((prev) => ({ ...prev, amount: sanitized }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 my-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {entry ? 'Edit Expense Entry' : 'Add Expense Entry'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          <div className="px-6 py-4 space-y-4 overflow-y-auto overscroll-contain">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="Salary">Salary</option>
                <option value="Utility">Utility</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Vendor">Vendor</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={formData.amount}
                onChange={handleAmountChange}
                placeholder="0"
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={formData.entry_date}
                onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                className="w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Paid To <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.paid_to}
                onChange={(e) => setFormData({ ...formData, paid_to: e.target.value })}
                required
                placeholder="Name or company"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.payment_mode}
                onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                rows={2}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white">
              {saving ? 'Saving...' : entry ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Salary Tab Component
function SalaryTab({
  schoolCode,
  financialYearId,
  onRefresh,
}: {
  schoolCode: string;
  financialYearId?: string | null;
  onRefresh: () => void;
}) {
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalaryRecord | null>(null);
  const [filters, setFilters] = useState({
    staff_id: '',
    payment_status: '',
    salary_month: '',
  });

  useEffect(() => {
    fetchSalaryRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, financialYearId, filters]);

  const fetchSalaryRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        school_code: schoolCode,
      });
      if (financialYearId) params.append('financial_year_id', financialYearId);
      if (filters.staff_id) params.append('staff_id', filters.staff_id);
      if (filters.payment_status) params.append('payment_status', filters.payment_status);
      if (filters.salary_month) params.append('salary_month', filters.salary_month);

      const response = await fetch(`/api/finance/salary?${params}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setSalaryRecords(result.data);
      } else {
        console.error('Error fetching salary records:', result.error || result.details);
        setSalaryRecords([]);
      }
    } catch (err) {
      console.error('Error fetching salary records:', err);
      setSalaryRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (record: SalaryRecord) => {
    if (!confirm(`Mark salary as paid for ${record.staff?.full_name}?`)) return;

    try {
      const response = await fetch(`/api/finance/salary/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_status: 'PAID',
          payment_date: new Date().toISOString().split('T')[0],
          payment_mode: 'Bank',
          create_expense: true,
        }),
      });

      if (response.ok) {
        fetchSalaryRecords();
        onRefresh();
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to mark salary as paid. ' + (result.details || ''));
      }
    } catch (err) {
      console.error('Error marking salary as paid:', err);
      alert('Failed to mark salary as paid. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Salary Records</h2>
        <Button
          onClick={() => {
            setEditingRecord(null);
            setShowModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white border-0"
        >
          <Plus size={18} className="mr-2" />
          Add Salary Record
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-slate-800/60 border-blue-600/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">Payment Status</label>
            <select
              value={filters.payment_status}
              onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}
              className="w-full px-4 py-2 border border-blue-600 rounded-lg bg-slate-800 text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">All Status</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-2">Salary Month</label>
            <Input
              type="month"
              value={filters.salary_month}
              onChange={(e) => setFilters({ ...filters, salary_month: e.target.value })}
              className="bg-slate-800 border-blue-600 text-blue-100"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => setFilters({ staff_id: '', payment_status: '', salary_month: '' })}
              className="w-full border-blue-500 text-blue-200 hover:bg-blue-500/20"
            >
              <Filter size={18} className="mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Salary Table */}
      <Card className="p-6 bg-slate-800/60 border-blue-600/50">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent"></div>
          </div>
        ) : salaryRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-900 text-blue-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Staff</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Month</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Base Salary</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Bonus</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Deduction</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Net Salary</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-700/30">
                {salaryRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-blue-900/30">
                    <td className="px-4 py-3 text-sm text-blue-100">{record.staff?.full_name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-blue-100">{formatDate(record.salary_month)}</td>
                    <td className="px-4 py-3 text-sm text-blue-100">{formatCurrency(record.base_salary)}</td>
                    <td className="px-4 py-3 text-sm text-blue-100">{formatCurrency(record.bonus)}</td>
                    <td className="px-4 py-3 text-sm text-blue-100">{formatCurrency(record.deduction)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-white">{formatCurrency(record.net_salary)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.payment_status === 'PAID'
                            ? 'bg-emerald-500/30 text-emerald-200'
                            : 'bg-amber-500/30 text-amber-200'
                        }`}
                      >
                        {record.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {record.payment_status === 'UNPAID' && (
                        <button
                          onClick={() => handleMarkAsPaid(record)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm"
                        >
                          Mark Paid
                        </button>
                      )}
                      {record.payment_status === 'PAID' && (
                        <span className="text-xs text-blue-300/70">Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-blue-200/80">
            No salary records found. Click &quot;Add Salary Record&quot; to create one.
          </div>
        )}
      </Card>

      {/* Salary Modal */}
      {showModal && (
        <SalaryModal
          schoolCode={schoolCode}
          financialYearId={financialYearId}
          record={editingRecord}
          onClose={() => {
            setShowModal(false);
            setEditingRecord(null);
            fetchSalaryRecords();
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

// Salary Modal Component
function SalaryModal({
  schoolCode,
  financialYearId,
  record,
  onClose,
}: {
  schoolCode: string;
  financialYearId?: string | null;
  record: SalaryRecord | null;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [staffList, setStaffList] = useState<Array<{ id: string; full_name: string }>>([]);
  const [formData, setFormData] = useState({
    staff_id: record?.staff_id || '',
    salary_month: record?.salary_month || new Date().toISOString().slice(0, 7) + '-01',
    base_salary: record?.base_salary.toString() || '',
    bonus: record?.bonus.toString() || '0',
    deduction: record?.deduction.toString() || '0',
    notes: '',
  });
  
  const [netSalary, setNetSalary] = useState(() => {
    if (record) {
      return record.net_salary;
    }
    return 0;
  });
  
  useEffect(() => {
    const base = parseFloat(formData.base_salary) || 0;
    const bonus = parseFloat(formData.bonus) || 0;
    const deduction = parseFloat(formData.deduction) || 0;
    setNetSalary(base + bonus - deduction);
  }, [formData.base_salary, formData.bonus, formData.deduction]);

  useEffect(() => {
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await fetch(`/api/staff?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStaffList(result.data);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.staff_id || !formData.base_salary) {
      alert('Please fill in all required fields');
      return;
    }

    if (netSalary < 0) {
      alert('Net salary cannot be negative. Please check bonus and deduction values.');
      return;
    }

    setSaving(true);
    try {
      const url = record ? `/api/finance/salary/${record.id}` : '/api/finance/salary';
      const method = record ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          financial_year_id: financialYearId,
          ...formData,
          base_salary: parseFloat(formData.base_salary),
          bonus: parseFloat(formData.bonus || '0'),
          deduction: parseFloat(formData.deduction || '0'),
        }),
      });

      const result = await response.json();
      if (response.ok) {
        onClose();
      } else {
        alert(result.error || `Failed to ${record ? 'update' : 'create'} salary record. ${result.details || ''}`);
      }
    } catch (err) {
      console.error('Error saving salary record:', err);
      alert(`Failed to ${record ? 'update' : 'create'} salary record. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-lg shadow-xl"
      >
        <Card className="m-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black">
              {record ? 'Edit Salary Record' : 'Add Salary Record'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Staff <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.staff_id}
                onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
                disabled={!!record}
              >
                <option value="">Select Staff</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Salary Month <span className="text-red-500">*</span>
              </label>
              <Input
                type="month"
                value={formData.salary_month.slice(0, 7)}
                onChange={(e) => setFormData({ ...formData, salary_month: e.target.value + '-01' })}
                required
                disabled={!!record}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Base Salary <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.base_salary}
                onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                required
                placeholder="0.00"
                disabled={record?.payment_status === 'PAID'}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bonus</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.bonus}
                  onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                  placeholder="0.00"
                  disabled={record?.payment_status === 'PAID'}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Deduction</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.deduction}
                  onChange={(e) => setFormData({ ...formData, deduction: e.target.value })}
                  placeholder="0.00"
                  disabled={record?.payment_status === 'PAID'}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Net Salary</label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-lg font-semibold text-gray-900">
                {new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                }).format(netSalary)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Calculated: Base + Bonus - Deduction</p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white">
                {saving ? 'Saving...' : record ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

// Reports Tab Component
function ReportsTab({
  // schoolCode,
  // financialYearId,
}: {
  schoolCode: string;
  financialYearId?: string | null;
}) {
  return (
    <Card className="p-6 bg-slate-800/60 border-blue-600/50">
      <h2 className="text-xl font-bold text-white mb-4">Financial Reports</h2>
      <div className="text-center py-12 text-blue-200/80">
        Reports feature coming soon. This will include:
        <ul className="mt-4 text-left list-disc list-inside space-y-2 text-blue-100/90">
          <li>Monthly income vs expense reports</li>
          <li>Salary reports</li>
          <li>Export to CSV functionality</li>
          <li>Financial year summaries</li>
        </ul>
      </div>
    </Card>
  );
}

function getFinanceOverviewReceiptHtml(data: OverviewData, financialYearName: string | undefined) {
  throw new Error('Function not implemented.');
}

