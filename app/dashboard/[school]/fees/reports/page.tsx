'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  BarChart3, 
  ArrowLeft,
  Calendar,
  Download,
  TrendingUp,
  AlertTriangle,
  IndianRupee
} from 'lucide-react';

export default function FeeReportsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  
  const [activeReport, setActiveReport] = useState<'daily' | 'monthly' | 'pending' | 'overdue'>('daily');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<{
    // Daily report properties
    summary?: {
      total_pending?: number;
      total_overdue?: number;
      total_count?: number;
      average_days_overdue?: number;
      total_collected?: number;
      transaction_count?: number;
      students_count?: number;
    };
    date?: string;
    collections?: Array<{
      id: string;
      receipt_no: string;
      student?: { student_name?: string; admission_no?: string; class?: string; section?: string };
      amount: number;
      total_amount?: number;
      payment_mode: string;
      payment_date: string;
    }>;
    // Monthly report properties
    total_collected?: number;
    total_transactions?: number;
    // Pending/Overdue report properties
    installments?: Array<{
      id: string;
      student?: { student_name?: string; admission_no?: string; class?: string; section?: string };
      installment_number: number;
      due_date: string;
      amount: number;
      paid_amount: number;
      pending_amount: number;
      status: string;
      fee_component?: { component_name?: string };
      days_overdue?: number;
    }>;
  } | null>(null);

  // Daily report filters
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);

  // Monthly report filters
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [monthlyMonth, setMonthlyMonth] = useState(currentMonth);

  // Pending/Overdue filters
  const [classFilter, setClassFilter] = useState('');

  const generateReport = async () => {
    try {
      setLoading(true);
      let url = '';
      
      if (activeReport === 'daily') {
        url = `/api/fees/reports/daily?school_code=${schoolCode}&date=${dailyDate}`;
      } else if (activeReport === 'monthly') {
        url = `/api/fees/reports/monthly?school_code=${schoolCode}&month=${monthlyMonth}`;
      } else if (activeReport === 'pending') {
        url = `/api/fees/reports/pending?school_code=${schoolCode}${classFilter ? `&class_id=${classFilter}` : ''}`;
      } else if (activeReport === 'overdue') {
        url = `/api/fees/reports/overdue?school_code=${schoolCode}${classFilter ? `&class_id=${classFilter}` : ''}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (response.ok) {
        setReportData(result.data);
      } else {
        alert(result.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReport, dailyDate, monthlyMonth, classFilter]);

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
            <BarChart3 className="text-[#2F6FED]" size={32} />
            Fee Reports
          </h1>
          <p className="text-gray-600">View collection reports and analytics</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}/fees`)}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Report Type Tabs */}
      <Card className="p-0 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {[
            { id: 'daily', label: 'Daily Collection', icon: Calendar },
            { id: 'monthly', label: 'Monthly Collection', icon: TrendingUp },
            { id: 'pending', label: 'Pending Fees', icon: AlertTriangle },
            { id: 'overdue', label: 'Overdue Fees', icon: IndianRupee },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveReport(id as 'daily' | 'monthly' | 'pending' | 'overdue')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                activeReport === id
                  ? 'text-[#2F6FED] border-b-2 border-[#2F6FED] bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">
          {/* Filters */}
          <div className="flex gap-4 items-end">
            {activeReport === 'daily' && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <Input
                  type="date"
                  value={dailyDate}
                  onChange={(e) => setDailyDate(e.target.value)}
                />
              </div>
            )}

            {activeReport === 'monthly' && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <Input
                  type="month"
                  value={monthlyMonth}
                  onChange={(e) => setMonthlyMonth(e.target.value)}
                />
              </div>
            )}

            {(activeReport === 'pending' || activeReport === 'overdue') && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Class (Optional)</label>
                <Input
                  type="text"
                  placeholder="Class ID (leave empty for all)"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                />
              </div>
            )}

            <Button
              onClick={generateReport}
              disabled={loading}
              className="bg-[#2F6FED] hover:bg-[#1E3A8A] text-white"
            >
              {loading ? 'Loading...' : 'Generate Report'}
            </Button>
          </div>

          {/* Report Results */}
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading report...</div>
          ) : reportData ? (
            <div className="space-y-4">
              {/* Summary Cards */}
              {activeReport === 'daily' && reportData.summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Collected</p>
                    <p className="text-2xl font-bold text-[#2F6FED]">₹{reportData.summary.total_collected != null ? reportData.summary.total_collected.toLocaleString('en-IN') : '0'}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.summary.transaction_count || 0}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Students</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.summary.students_count || 0}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Date</p>
                    <p className="text-lg font-semibold text-gray-900">{reportData.date ? new Date(reportData.date).toLocaleDateString() : 'N/A'}</p>
                  </Card>
                </div>
              )}

              {activeReport === 'monthly' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Collected</p>
                    <p className="text-2xl font-bold text-[#2F6FED]">
                      ₹{reportData.total_collected != null ? reportData.total_collected.toLocaleString('en-IN') : '0'}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {reportData.total_transactions != null ? reportData.total_transactions : 0}
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Month</p>
                    <p className="text-lg font-semibold text-gray-900">{new Date(monthlyMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                  </Card>
                </div>
              )}

              {(activeReport === 'pending' || activeReport === 'overdue') && reportData.summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-[#2F6FED]">₹{reportData.summary.total_pending?.toLocaleString('en-IN') || reportData.summary.total_overdue?.toLocaleString('en-IN') || '0'}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Installments</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.summary.total_count || 0}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-gray-600 mb-1">Students</p>
                    <p className="text-2xl font-bold text-gray-900">{reportData.summary.students_count || 0}</p>
                  </Card>
                  {activeReport === 'overdue' && (
                    <Card className="p-4">
                      <p className="text-sm text-gray-600 mb-1">Avg Days Overdue</p>
                      <p className="text-2xl font-bold text-red-600">{reportData.summary.average_days_overdue || 0}</p>
                    </Card>
                  )}
                </div>
              )}

              {/* Data Table */}
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    {activeReport === 'daily' && 'Daily Collections'}
                    {activeReport === 'monthly' && 'Monthly Breakdown'}
                    {activeReport === 'pending' && 'Pending Installments'}
                    {activeReport === 'overdue' && 'Overdue Installments'}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // TODO: Export to Excel/CSV
                      alert('Export functionality - Coming soon');
                    }}
                  >
                    <Download size={16} className="mr-2" />
                    Export
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  {activeReport === 'daily' && reportData.collections && (
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Receipt No</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Mode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.collections?.map((collection) => (
                          <tr key={collection.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{collection.receipt_no}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {collection.student?.student_name || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                              ₹{collection.total_amount?.toLocaleString('en-IN') || '0'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs capitalize">
                                {collection.payment_mode}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {(activeReport === 'pending' || activeReport === 'overdue') && reportData.installments && (
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Component</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Due Date</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Pending</th>
                          {activeReport === 'overdue' && (
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Days Overdue</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reportData.installments?.slice(0, 100).map((inst) => (
                          <tr key={inst.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              <div>
                                <p className="font-medium text-gray-900">{inst.student?.student_name || 'N/A'}</p>
                                <p className="text-xs text-gray-600">{inst.student?.admission_no || ''} • {inst.student?.class || ''}-{inst.student?.section || ''}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">{inst.fee_component?.component_name || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{new Date(inst.due_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900">₹{inst.amount?.toLocaleString('en-IN') || '0'}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-orange-600">₹{inst.pending_amount?.toLocaleString('en-IN') || '0'}</td>
                            {activeReport === 'overdue' && (
                              <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">{inst.days_overdue || 0}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {reportData.installments && reportData.installments.length === 0 && (
                    <div className="p-8 text-center text-gray-500">No data found</div>
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500">
              Select filters and click &quot;Generate Report&quot; to view data
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
