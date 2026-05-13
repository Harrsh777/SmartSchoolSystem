'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import {
  BarChart3,
  BookOpen,
  Book,
  Users,
  AlertCircle,
  TrendingUp,
  Calendar,
  Loader2,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface LibraryStats {
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  issuedCopies: number;
  overdueBooks: number;
  totalTransactions: number;
  mostIssuedBooks: Array<{
    title: string;
    author: string | null;
    count: number;
  }>;
  monthlyTrend: Record<string, { issues: number; returns: number }>;
  sectionUsage: Record<string, number>;
  borrowerStats: {
    students: number;
    staff: number;
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function LibraryDashboardPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/library/stats?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setStats(result.data);
      } else {
        setError(result.error || 'Failed to fetch library statistics');
      }
    } catch (err) {
      console.error('Error fetching library stats:', err);
      setError('Failed to load library statistics');
    } finally {
      setLoading(false);
    }
  }, [schoolCode]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Prepare monthly trend data for chart
  const monthlyTrendData = stats?.monthlyTrend
    ? Object.entries(stats.monthlyTrend)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          Issues: data.issues,
          Returns: data.returns,
        }))
    : [];

  // Prepare section usage data for pie chart
  const sectionUsageData = stats?.sectionUsage
    ? Object.entries(stats.sectionUsage).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  // Prepare borrower stats data for pie chart
  const borrowerData = stats?.borrowerStats
    ? [
        { name: 'Students', value: stats.borrowerStats.students },
        { name: 'Staff', value: stats.borrowerStats.staff },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-[#5A7A95] dark:text-[#6B9BB8]" size={48} />
          <p className="text-[#5A7A95] dark:text-[#6B9BB8] font-medium">Loading library statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center py-12">
            <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
            <p className="text-red-600 text-lg">{error}</p>
            <button
              onClick={fetchStats}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] hover:from-[#567C8D] hover:to-[#5A7A95] text-white rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              Retry
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const utilizationRate = stats.totalCopies > 0 
    ? ((stats.issuedCopies / stats.totalCopies) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-4 sm:p-6 space-y-6 min-h-screen bg-[#F5EFEB] dark:bg-[#0f172a]">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] shrink-0">
              <BarChart3 className="text-white" size={28} />
            </div>
            Library Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Analytics and statistics for {schoolCode}</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] hover:from-[#567C8D] hover:to-[#5A7A95] text-white rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2 shrink-0 disabled:opacity-70"
        >
          <Loader2 size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </motion.div>

      {/* Stats Cards - equal height and alignment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          {
            label: 'Total Books',
            value: stats.totalBooks,
            sub: `${stats.totalCopies} total copies`,
            icon: BookOpen,
            valueClass: 'text-gray-900 dark:text-white',
            iconBg: 'bg-[#5A7A95]/10 dark:bg-[#6B9BB8]/20',
            iconClass: 'text-[#5A7A95] dark:text-[#6B9BB8]',
          },
          {
            label: 'Available Copies',
            value: stats.availableCopies,
            sub: `${stats.issuedCopies} issued`,
            icon: Book,
            valueClass: 'text-green-600 dark:text-green-400',
            iconBg: 'bg-green-100 dark:bg-green-900/30',
            iconClass: 'text-green-600 dark:text-green-400',
          },
          {
            label: 'Overdue Books',
            value: stats.overdueBooks,
            sub: 'Requires attention',
            icon: AlertCircle,
            valueClass: 'text-red-600 dark:text-red-400',
            iconBg: 'bg-red-100 dark:bg-red-900/30',
            iconClass: 'text-red-600 dark:text-red-400',
          },
          {
            label: 'Total Transactions',
            value: stats.totalTransactions,
            sub: `${utilizationRate}% utilization`,
            icon: TrendingUp,
            valueClass: 'text-[#5A7A95] dark:text-[#6B9BB8]',
            iconBg: 'bg-[#5A7A95]/10 dark:bg-[#6B9BB8]/20',
            iconClass: 'text-[#5A7A95] dark:text-[#6B9BB8]',
          },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * (i + 1) }}
            className="h-full"
          >
            <Card hover className="h-full min-h-[120px]">
              <div className="flex items-stretch justify-between gap-3 h-full">
                <div className="flex flex-col justify-center min-w-0 flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-0.5">{item.label}</p>
                  <p className={`text-2xl sm:text-3xl font-bold truncate ${item.valueClass}`}>{item.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.sub}</p>
                </div>
                <div className={`${item.iconBg} p-3 rounded-lg shrink-0 flex items-center justify-center self-center`}>
                  <item.icon className={item.iconClass} size={32} />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row - equal height cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="min-h-[340px]"
        >
          <Card className="h-full bg-white/85 dark:bg-[#1e293b]/85 border border-white/60 dark:border-gray-700/50">
            <div className="p-4 sm:p-6 flex flex-col h-full">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 shrink-0">
                <Calendar className="text-[#5A7A95] dark:text-[#6B9BB8]" size={20} />
                Monthly Issue/Return Trend
              </h3>
              <div className="flex-1 min-h-[280px]">
                {monthlyTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Issues" fill="#3b82f6" name="Issues" />
                      <Bar dataKey="Returns" fill="#10b981" name="Returns" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-gray-500 dark:text-gray-400">
                    <Calendar className="mx-auto mb-2 text-gray-400 dark:text-gray-500" size={32} />
                    <p>No transaction data available</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="min-h-[340px]"
        >
          <Card className="h-full bg-white/85 dark:bg-[#1e293b]/85 border border-white/60 dark:border-gray-700/50">
            <div className="p-4 sm:p-6 flex flex-col h-full">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 shrink-0">
                <BookOpen className="text-[#5A7A95] dark:text-[#6B9BB8]" size={20} />
                Section Usage
              </h3>
              <div className="flex-1 min-h-[280px]">
                {sectionUsageData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={sectionUsageData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sectionUsageData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-gray-500 dark:text-gray-400">
                    <BookOpen className="mx-auto mb-2 text-gray-400 dark:text-gray-500" size={32} />
                    <p>No section usage data available</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Borrower Stats and Most Issued Books - equal height */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="min-h-[360px]"
        >
          <Card className="h-full bg-white/85 dark:bg-[#1e293b]/85 border border-white/60 dark:border-gray-700/50">
            <div className="p-4 sm:p-6 flex flex-col h-full">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 shrink-0">
                <Users className="text-[#5A7A95] dark:text-[#6B9BB8]" size={20} />
                Borrower Statistics
              </h3>
              <div className="flex-1 min-h-[200px] flex flex-col">
                {borrowerData.some((d) => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={borrowerData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {borrowerData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] text-gray-500 dark:text-gray-400">
                    <Users className="mx-auto mb-2 text-gray-400 dark:text-gray-500" size={32} />
                    <p>No borrower data available</p>
                  </div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 shrink-0">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/50">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Students</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.borrowerStats.students}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800/50">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Staff</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.borrowerStats.staff}</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="min-h-[360px]"
        >
          <Card className="h-full bg-white/85 dark:bg-[#1e293b]/85 border border-white/60 dark:border-gray-700/50">
            <div className="p-4 sm:p-6 flex flex-col h-full">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 shrink-0">
                <TrendingUp className="text-[#5A7A95] dark:text-[#6B9BB8]" size={20} />
                Most Issued Books
              </h3>
              <div className="flex-1 min-h-[280px]">
                {stats.mostIssuedBooks.length > 0 ? (
                  <div className="space-y-3">
                    {stats.mostIssuedBooks.slice(0, 5).map((book, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{book.title}</p>
                          {book.author && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">by {book.author}</p>
                          )}
                        </div>
                        <span className="px-3 py-1 bg-[#5A7A95]/10 dark:bg-[#6B9BB8]/20 text-[#5A7A95] dark:text-[#6B9BB8] rounded-full text-sm font-semibold shrink-0">
                          {book.count} issues
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[280px] text-gray-500 dark:text-gray-400">
                    <BookOpen className="mx-auto mb-2 text-gray-400 dark:text-gray-500" size={32} />
                    <p>No book issue data available</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Section Usage Table */}
      {sectionUsageData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Card className="bg-white/85 dark:bg-[#1e293b]/85 border border-white/60 dark:border-gray-700/50">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Section Usage Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Section</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Total Issues</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {[...sectionUsageData]
                      .sort((a, b) => b.value - a.value)
                      .map((section, index) => {
                        const total = sectionUsageData.reduce((sum, s) => sum + s.value, 0);
                        const percentage = total > 0 ? ((section.value / total) * 100).toFixed(1) : '0';
                        return (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{section.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{section.value}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 min-w-[60px]">
                                  <div
                                    className="bg-[#5A7A95] dark:bg-[#6B9BB8] h-2 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-gray-600 dark:text-gray-400 font-medium shrink-0">{percentage}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

