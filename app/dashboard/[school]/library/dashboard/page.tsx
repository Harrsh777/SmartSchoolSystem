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
          <Loader2 className="animate-spin mx-auto mb-4 text-indigo-600" size={48} />
          <p className="text-gray-600">Loading library statistics...</p>
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
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="text-indigo-600" size={32} />
            Library Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Analytics and statistics for {schoolCode}</p>
        </div>
        <button
          onClick={fetchStats}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Loader2 size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Books</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalBooks}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.totalCopies} total copies</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <BookOpen className="text-blue-600" size={32} />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Available Copies</p>
                <p className="text-3xl font-bold text-green-600">{stats.availableCopies}</p>
                <p className="text-xs text-gray-500 mt-1">{stats.issuedCopies} issued</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Book className="text-green-600" size={32} />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Overdue Books</p>
                <p className="text-3xl font-bold text-red-600">{stats.overdueBooks}</p>
                <p className="text-xs text-gray-500 mt-1">Requires attention</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <AlertCircle className="text-red-600" size={32} />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
                <p className="text-3xl font-bold text-indigo-600">{stats.totalTransactions}</p>
                <p className="text-xs text-gray-500 mt-1">{utilizationRate}% utilization</p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg">
                <TrendingUp className="text-indigo-600" size={32} />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="text-indigo-600" size={20} />
                Monthly Issue/Return Trend
              </h3>
              {monthlyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Issues" fill="#3b82f6" />
                    <Bar dataKey="Returns" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="mx-auto mb-2 text-gray-400" size={32} />
                  <p>No transaction data available</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Section Usage Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="text-indigo-600" size={20} />
                Section Usage
              </h3>
              {sectionUsageData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sectionUsageData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="mx-auto mb-2 text-gray-400" size={32} />
                  <p>No section usage data available</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Borrower Stats and Most Issued Books */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Borrower Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="text-indigo-600" size={20} />
                Borrower Statistics
              </h3>
              {borrowerData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={borrowerData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
                <div className="text-center py-12 text-gray-500">
                  <Users className="mx-auto mb-2 text-gray-400" size={32} />
                  <p>No borrower data available</p>
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Students</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.borrowerStats.students}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Staff</p>
                  <p className="text-2xl font-bold text-green-600">{stats.borrowerStats.staff}</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Most Issued Books */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="text-indigo-600" size={20} />
                Most Issued Books
              </h3>
              {stats.mostIssuedBooks.length > 0 ? (
                <div className="space-y-3">
                  {stats.mostIssuedBooks.slice(0, 5).map((book, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{book.title}</p>
                        {book.author && (
                          <p className="text-sm text-gray-600">by {book.author}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
                          {book.count} issues
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="mx-auto mb-2 text-gray-400" size={32} />
                  <p>No book issue data available</p>
                </div>
              )}
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
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Section Usage Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Section</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Total Issues</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sectionUsageData
                      .sort((a, b) => b.value - a.value)
                      .map((section, index) => {
                        const total = sectionUsageData.reduce((sum, s) => sum + s.value, 0);
                        const percentage = total > 0 ? ((section.value / total) * 100).toFixed(1) : '0';
                        return (
                          <tr key={index} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{section.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{section.value}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-indigo-600 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-gray-600 font-medium">{percentage}%</span>
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

