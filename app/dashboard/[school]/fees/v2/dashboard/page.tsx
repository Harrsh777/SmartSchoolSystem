'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { IndianRupee, TrendingUp, AlertCircle, Clock, ArrowRight, Loader2, Calendar, Users, ChevronDown, ChevronUp, CreditCard, FileText } from 'lucide-react';

interface DashboardStats {
  today_collection: number;
  pending_dues: number;
  overdue_amount: number;
  pending_count: number;
  overdue_count: number;
}

interface MonthlyCollection {
  month: string;
  year: number;
  collected: number;
  pending: number;
  students_paid: number;
  students_pending: number;
}

interface RecentPayment {
  id: string;
  student_name: string;
  admission_no: string;
  amount: number;
  payment_date: string;
  payment_mode: string;
  receipt_no: string;
}

interface PendingStudent {
  id: string;
  student_name: string;
  admission_no: string;
  class: string;
  section: string;
  pending_amount: number;
  due_date: string;
}

export default function FeesDashboardPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyCollection[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [statsRes, monthlyRes, paymentsRes, pendingRes] = await Promise.all([
        fetch(`/api/v2/fees/reports/dashboard?school_code=${schoolCode}`),
        fetch(`/api/v2/fees/reports/monthly?school_code=${schoolCode}`),
        fetch(`/api/v2/fees/payments/recent?school_code=${schoolCode}&limit=10`),
        fetch(`/api/v2/fees/students/pending?school_code=${schoolCode}&limit=20`),
      ]);

      if (statsRes.ok) {
        const statsResult = await statsRes.json();
        setStats(statsResult.data);
      }

      if (monthlyRes.ok) {
        const monthlyResult = await monthlyRes.json();
        setMonthlyData(monthlyResult.data || []);
      }

      if (paymentsRes.ok) {
        const paymentsResult = await paymentsRes.json();
        setRecentPayments(paymentsResult.data || []);
      }

      if (pendingRes.ok) {
        const pendingResult = await pendingRes.json();
        setPendingStudents(pendingResult.data || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

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
          <IndianRupee size={32} className="text-indigo-600" />
          Fee Management Dashboard
        </h1>
        <p className="text-gray-600">Overview of fee collections and pending dues</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's Collection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card hover className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 mb-1">Today&apos;s Collection</p>
                <p className="text-3xl font-bold text-green-900">
                  {stats ? formatCurrency(stats.today_collection) : '₹0'}
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <TrendingUp className="w-8 h-8 text-green-700" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Pending Dues */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card hover className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 mb-1">Pending Dues</p>
                <p className="text-3xl font-bold text-blue-900">
                  {stats ? formatCurrency(stats.pending_dues) : '₹0'}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {stats?.pending_count || 0} students
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <Clock className="w-8 h-8 text-blue-700" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Overdue Amount */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card hover className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700 mb-1">Overdue Amount</p>
                <p className="text-3xl font-bold text-red-900">
                  {stats ? formatCurrency(stats.overdue_amount) : '₹0'}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {stats?.overdue_count || 0} students
                </p>
              </div>
              <div className="p-3 bg-red-200 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-700" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <Card>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button
            onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/collection`)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white justify-between"
          >
            <span>Collect Payment</span>
            <ArrowRight size={18} />
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/fee-heads`)}
            className="w-full justify-between"
          >
            <span>Manage Fee Heads</span>
            <ArrowRight size={18} />
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/fee-structures`)}
            className="w-full justify-between"
          >
            <span>Fee Structures</span>
            <ArrowRight size={18} />
          </Button>
        </div>
      </Card>

      {/* Detailed Information Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Month-wise Collection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Calendar size={20} className="text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Month-wise Collection</h2>
            </div>
            
            {monthlyData.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {monthlyData.map((month, index) => {
                  const isExpanded = expandedMonth === `${month.month}-${month.year}`;
                  const totalExpected = month.collected + month.pending;
                  const collectionPercent = totalExpected > 0 ? (month.collected / totalExpected) * 100 : 0;
                  
                  return (
                    <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedMonth(isExpanded ? null : `${month.month}-${month.year}`)}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-left">
                            <p className="font-semibold text-gray-900">{month.month} {month.year}</p>
                            <p className="text-sm text-gray-500">{month.students_paid} paid, {month.students_pending} pending</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-bold text-green-600">{formatCurrency(month.collected)}</p>
                            <p className="text-xs text-gray-500">{collectionPercent.toFixed(0)}% collected</p>
                          </div>
                          {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">Collected</p>
                              <p className="text-lg font-bold text-green-600">{formatCurrency(month.collected)}</p>
                              <p className="text-xs text-gray-500">{month.students_paid} students</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <p className="text-xs text-gray-500 mb-1">Pending</p>
                              <p className="text-lg font-bold text-red-600">{formatCurrency(month.pending)}</p>
                              <p className="text-xs text-gray-500">{month.students_pending} students</p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-500">Collection Progress</span>
                              <span className="font-medium">{collectionPercent.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${collectionPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar size={40} className="mx-auto mb-3 text-gray-400" />
                <p>No monthly data available</p>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Recent Payments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CreditCard size={20} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Recent Payments</h2>
            </div>
            
            {recentPayments.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{payment.student_name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="font-mono">{payment.admission_no}</span>
                        <span>•</span>
                        <span>{formatDate(payment.payment_date)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-gray-500 uppercase">{payment.payment_mode}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard size={40} className="mx-auto mb-3 text-gray-400" />
                <p>No recent payments</p>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Pending Fees Students */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Users size={20} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Students with Pending Fees</h2>
                <p className="text-sm text-gray-500">{pendingStudents.length} students have pending fees</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/collection`)}
            >
              Collect Payment
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
          
          {pendingStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Class</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Pending Amount</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingStudents.map((student) => {
                    const isOverdue = new Date(student.due_date) < new Date();
                    return (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-gray-900">{student.student_name}</p>
                            <p className="text-sm text-gray-500 font-mono">{student.admission_no}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium">
                            {student.class}-{student.section}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                            {formatDate(student.due_date)}
                            {isOverdue && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Overdue</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-red-600">{formatCurrency(student.pending_amount)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/${schoolCode}/fees/v2/collection`)}
                            className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
                          >
                            <FileText size={14} className="mr-1" />
                            Collect
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users size={40} className="mx-auto mb-3 text-gray-400" />
              <p>No pending fees found</p>
              <p className="text-sm">All students have cleared their dues</p>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
