'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  Download,
  Search,
  User,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import type { FeeWithStudent } from '@/lib/supabase';

export default function FeesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<FeeWithStudent[]>([]);
  const [statistics, setStatistics] = useState({
    totalAmount: 0,
    totalTransactions: 0,
    todayCollection: 0,
    monthlyCollection: 0,
  });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    class: '',
    collectedBy: '',
    search: '',
  });
  const [classes, setClasses] = useState<string[]>([]);
  interface Accountant {
    id: string;
    name: string;
    email?: string;
  }
  const [accountants, setAccountants] = useState<Accountant[]>([]);

  useEffect(() => {
    fetchFees();
    fetchAccountants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode, filters]);

  const fetchFees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('school_code', schoolCode);
      
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.collectedBy) params.append('collected_by', filters.collectedBy);
      if (filters.class) params.append('class', filters.class);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/fees?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setFees(result.data);
        setStatistics(result.statistics || statistics);
        
        // Extract unique classes
        const uniqueClasses = [...new Set(result.data.map((fee: FeeWithStudent) => fee.student?.class).filter(Boolean))];
        setClasses(uniqueClasses.sort());
      }
    } catch (err) {
      console.error('Error fetching fees:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountants = async () => {
    try {
      const response = await fetch(`/api/staff?school_code=${schoolCode}&role=Accountant`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setAccountants(result.data);
      }
    } catch (err) {
      console.error('Error fetching accountants:', err);
    }
  };

  const handleExport = () => {
    // Convert fees to CSV
    const headers = ['Receipt No', 'Student Name', 'Admission No', 'Class', 'Amount', 'Payment Mode', 'Date', 'Collected By'];
    const rows = fees.map(fee => [
      fee.receipt_no,
      fee.student?.student_name || 'N/A',
      fee.admission_no,
      `${fee.student?.class || ''}-${fee.student?.section || ''}`,
      fee.amount.toString(),
      fee.payment_mode,
      fee.payment_date,
      fee.collected_by_name || 'Unknown',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fees-${schoolCode}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getPaymentModeColor = (mode: string) => {
    switch (mode) {
      case 'cash':
        return 'bg-green-100 text-green-800';
      case 'online':
        return 'bg-blue-100 text-blue-800';
      case 'cheque':
        return 'bg-purple-100 text-purple-800';
      case 'card':
        return 'bg-indigo-100 text-indigo-800';
      case 'bank_transfer':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading fees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fee</h1>
        </div>
        {fees.length > 0 && (
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download size={16} className="mr-2" />
            Export
          </Button>
        )}
      </div>

      {/* Collection Stats Cards - Compact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-gray-600 mb-1">Today&apos;s Collection</p>
          <p className="text-2xl font-bold text-gray-900">₹{statistics.todayCollection.toLocaleString()}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
        >
          <p className="text-sm text-gray-600 mb-1">Total Collection (This Month)</p>
          <p className="text-2xl font-bold text-gray-900">₹{statistics.monthlyCollection.toLocaleString()}</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Search</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Student name or receipt no..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Class</label>
              <select
                value={filters.class}
                onChange={(e) => setFilters({ ...filters, class: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Accountant</label>
              <select
                value={filters.collectedBy}
                onChange={(e) => setFilters({ ...filters, collectedBy: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Accountants</option>
                {accountants.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.full_name}</option>
                ))}
              </select>
            </div>
          </div>
      </div>

      {/* Fees Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Fee Transactions</h2>
        </div>
          {fees.length === 0 ? (
            <div className="text-center py-16">
              <DollarSign className="mx-auto text-gray-300 mb-3" size={40} />
              <p className="text-gray-600 font-medium">No fee transactions found</p>
              <p className="text-sm text-gray-500 mt-1">Transactions will appear here once fees are collected</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Receipt No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Student Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Admission No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Payment Mode</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Collected By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {fees.map((fee) => (
                    <tr
                      key={fee.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{fee.receipt_no}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{fee.student?.student_name || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{fee.admission_no}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {fee.student?.class ? `${fee.student.class}-${fee.student.section}` : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{Number(fee.amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getPaymentModeColor(fee.payment_mode)}`}>
                          {fee.payment_mode.charAt(0).toUpperCase() + fee.payment_mode.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(fee.payment_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-gray-400" />
                          <span>{fee.collected_by_name || 'Unknown'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
