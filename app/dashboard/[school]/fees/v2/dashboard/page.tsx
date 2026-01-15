'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { DollarSign, TrendingUp, AlertCircle, Clock, ArrowRight, Loader2 } from 'lucide-react';

interface DashboardStats {
  today_collection: number;
  pending_dues: number;
  overdue_amount: number;
  pending_count: number;
  overdue_count: number;
}

export default function FeesDashboardPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/v2/fees/reports/dashboard?school_code=${schoolCode}`);
        const result = await response.json();

        if (response.ok) {
          setStats(result.data);
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [schoolCode]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
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
          <DollarSign size={32} className="text-indigo-600" />
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
    </div>
  );
}
