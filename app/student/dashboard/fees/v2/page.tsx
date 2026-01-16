'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { DollarSign, Download, Clock, CheckCircle, AlertCircle, Loader2, Receipt } from 'lucide-react';

interface StudentFee {
  id: string;
  due_month: string;
  due_date: string;
  base_amount: number;
  paid_amount: number;
  adjustment_amount: number;
  balance_due: number;
  late_fee: number;
  total_due: number;
  status: string;
  fee_structure: {
    name: string;
  };
}

interface ReceiptRecord {
  id: string;
  receipt_no: string;
  issued_at: string;
  payment: {
    amount: number;
    payment_mode: string;
    payment_date: string;
  };
}

export default function StudentFeesPage() {
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'fees' | 'receipts'>('fees');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Get student ID from session
        const studentData = sessionStorage.getItem('student');
        if (!studentData) {
          setError('Student information not found');
          setLoading(false);
          return;
        }
        const student = JSON.parse(studentData);
        const studentId = student.id;
        const studentSchoolCode = student.school_code;
        if (!studentId || !studentSchoolCode) {
          setError('Student information incomplete');
          setLoading(false);
          return;
        }
        studentSchoolCode(studentSchoolCode);

        // Fetch fees
        const feesRes = await fetch(`/api/v2/fees/students/${studentId}/fees?school_code=${studentSchoolCode}`);
        const feesData = await feesRes.json();
        if (feesRes.ok) {
          setFees(feesData.data || []);
        }

        // Fetch receipts
        const receiptsRes = await fetch(`/api/v2/fees/receipts?school_code=${studentSchoolCode}&student_id=${studentId}`);
        const receiptsData = await receiptsRes.json();
        if (receiptsRes.ok) {
          setReceipts(receiptsData.data || []);
        }
      } catch (err) {
        setError('Failed to load fee information');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Paid' },
      partial: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Partial' },
      pending: { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Pending' },
      overdue: { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Overdue' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${config.color}`}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  const totalDue = fees.reduce((sum, fee) => sum + (fee.total_due > 0 ? fee.total_due : 0), 0);
  const totalPaid = fees.reduce((sum, fee) => sum + fee.paid_amount, 0);

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
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <DollarSign size={32} className="text-indigo-600" />
          My Fees
        </h1>
        <p className="text-gray-600">View your fee statements and payment history</p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 mb-1">Total Due</p>
              <p className="text-3xl font-bold text-blue-900">{formatCurrency(totalDue)}</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-full">
              <AlertCircle className="w-8 h-8 text-blue-700" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 mb-1">Total Paid</p>
              <p className="text-3xl font-bold text-green-900">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="p-3 bg-green-200 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-700" />
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Receipts</p>
              <p className="text-3xl font-bold text-gray-900">{receipts.length}</p>
            </div>
            <div className="p-3 bg-gray-200 rounded-full">
              <Receipt className="w-8 h-8 text-gray-700" />
            </div>
          </div>
        </Card>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <AlertCircle size={20} />
          {error}
        </motion.div>
      )}

      {/* Tabs */}
      <Card>
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('fees')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'fees'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Fee Statement
            </button>
            <button
              onClick={() => setActiveTab('receipts')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'receipts'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Payment History ({receipts.length})
            </button>
          </nav>
        </div>

        {/* Fees Tab */}
        {activeTab === 'fees' && (
          <div className="space-y-4">
            {fees.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No fees found</div>
            ) : (
              fees.map((fee) => (
                <motion.div
                  key={fee.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{fee.fee_structure.name}</h3>
                        {getStatusBadge(fee.status)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Due Date:</span>
                          <p className="font-medium text-gray-900">{formatDate(fee.due_date)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Base Amount:</span>
                          <p className="font-medium text-gray-900">{formatCurrency(fee.base_amount)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Paid:</span>
                          <p className="font-medium text-green-600">{formatCurrency(fee.paid_amount)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Balance Due:</span>
                          <p className="font-medium text-red-600">{formatCurrency(fee.balance_due)}</p>
                        </div>
                      </div>
                      {fee.late_fee > 0 && (
                        <div className="mt-2 text-sm text-red-600">
                          Late Fee: {formatCurrency(fee.late_fee)}
                        </div>
                      )}
                      {fee.adjustment_amount !== 0 && (
                        <div className="mt-2 text-sm text-blue-600">
                          Adjustment: {formatCurrency(fee.adjustment_amount)}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Receipts Tab */}
        {activeTab === 'receipts' && (
          <div className="space-y-4">
            {receipts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No receipts found</div>
            ) : (
              receipts.map((receipt) => (
                <motion.div
                  key={receipt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">Receipt #{receipt.receipt_no}</h3>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          Paid
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Amount:</span>
                          <p className="font-medium text-gray-900">{formatCurrency(receipt.payment.amount)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Payment Mode:</span>
                          <p className="font-medium text-gray-900 capitalize">{receipt.payment.payment_mode}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Date:</span>
                          <p className="font-medium text-gray-900">{formatDate(receipt.payment.payment_date)}</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/api/v2/fees/receipts/${receipt.id}/pdf`, '_blank')}
                      className="ml-4"
                    >
                      <Download size={16} className="mr-1" />
                      Download
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
