'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { mockFees } from '@/lib/demoData';
import { DollarSign, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

export default function FeesPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  use(params); // school param available if needed
  const fees = mockFees;

  const stats = {
    total: fees.reduce((sum, f) => sum + f.amount, 0),
    paid: fees.filter(f => f.status === 'Paid').reduce((sum, f) => sum + f.amount, 0),
    pending: fees.filter(f => f.status === 'Pending').reduce((sum, f) => sum + f.amount, 0),
    collectionRate: Math.round((fees.filter(f => f.status === 'Paid').length / fees.length) * 100),
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Fee Management</h1>
            <p className="text-gray-600">Track and manage fee collection</p>
          </div>
          <button className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium">
            + Collect Fee
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-3 rounded-lg">
                <DollarSign className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-black">₹{(stats.total / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <CheckCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-black">₹{(stats.paid / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-red-500 p-3 rounded-lg">
                <AlertCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-black">₹{(stats.pending / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-purple-500 p-3 rounded-lg">
                <TrendingUp className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Collection Rate</p>
                <p className="text-2xl font-bold text-black">{stats.collectionRate}%</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Fees Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <h2 className="text-xl font-bold text-black mb-6">Fee Records</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Student</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Class</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Category</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Due Date</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((fee, index) => (
                  <motion.tr
                    key={fee.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-black">{fee.studentName}</p>
                        <p className="text-sm text-gray-500">Roll No: {fee.rollNo}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-700">{fee.class}</td>
                    <td className="py-4 px-4 text-gray-700">{fee.category}</td>
                    <td className="py-4 px-4 font-semibold text-black">₹{fee.amount.toLocaleString()}</td>
                    <td className="py-4 px-4 text-gray-700">
                      {new Date(fee.dueDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        fee.status === 'Paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {fee.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          View
                        </button>
                        {fee.status === 'Pending' && (
                          <>
                            <span className="text-gray-300">|</span>
                            <button className="text-green-600 hover:text-green-800 text-sm font-medium">
                              Mark Paid
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

