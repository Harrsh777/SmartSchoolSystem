'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import SetupWizard from '@/components/SetupWizard';
import { mockDashboardStats, getSchoolBySlug } from '@/lib/demoData';
import { Users, UserCheck, DollarSign, Calendar, FileText, Bell } from 'lucide-react';

export default function DashboardPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school } = use(params);
  const [showWizard, setShowWizard] = useState(false);
  const stats = mockDashboardStats;

  useEffect(() => {
    const schoolData = getSchoolBySlug(school);
    if (schoolData && !schoolData.setupCompleted) {
      setShowWizard(true);
    }
  }, [school]);

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents.toLocaleString(),
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Staff',
      value: stats.totalStaff.toLocaleString(),
      icon: UserCheck,
      color: 'bg-green-500',
    },
    {
      title: 'Fee Collection',
      value: `₹${(stats.feeCollection.collected / 100000).toFixed(1)}L`,
      subtitle: `of ₹${(stats.feeCollection.total / 100000).toFixed(1)}L`,
      icon: DollarSign,
      color: 'bg-purple-500',
    },
    {
      title: "Today's Attendance",
      value: `${stats.todayAttendance.percentage}%`,
      subtitle: `${stats.todayAttendance.present} present`,
      icon: Calendar,
      color: 'bg-orange-500',
    },
    {
      title: 'Upcoming Exams',
      value: stats.upcomingExams.toString(),
      icon: FileText,
      color: 'bg-red-500',
    },
    {
      title: 'Recent Notices',
      value: stats.recentNotices.toString(),
      icon: Bell,
      color: 'bg-indigo-500',
    },
  ];

  return (
    <>
      {showWizard && (
        <SetupWizard
          schoolId={school}
          onComplete={() => setShowWizard(false)}
        />
      )}
      <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-black mb-2">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome back! Here&apos;s what&apos;s happening at your school.</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card hover>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                    <p className="text-3xl font-bold text-black">{card.value}</p>
                    {card.subtitle && (
                      <p className="text-sm text-gray-500 mt-1">{card.subtitle}</p>
                    )}
                  </div>
                  <div className={`${card.color} p-3 rounded-lg`}>
                    <Icon className="text-white" size={24} />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <h2 className="text-xl font-bold text-black mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 rounded-lg border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-colors text-left">
              <p className="font-semibold text-black">Add Student</p>
              <p className="text-sm text-gray-600 mt-1">Register new student</p>
            </button>
            <button className="p-4 rounded-lg border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-colors text-left">
              <p className="font-semibold text-black">Mark Attendance</p>
              <p className="text-sm text-gray-600 mt-1">Record today&apos;s attendance</p>
            </button>
            <button className="p-4 rounded-lg border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-colors text-left">
              <p className="font-semibold text-black">Create Exam</p>
              <p className="text-sm text-gray-600 mt-1">Schedule new examination</p>
            </button>
            <button className="p-4 rounded-lg border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-colors text-left">
              <p className="font-semibold text-black">Send Notice</p>
              <p className="text-sm text-gray-600 mt-1">Publish announcement</p>
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
    </>
  );
}

