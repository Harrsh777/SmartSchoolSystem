'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Users, UserCheck, DollarSign, Calendar, FileText, Bell } from 'lucide-react';
import type { AcceptedSchool } from '@/lib/supabase';

interface DashboardStats {
  totalStudents: number;
  totalStaff: number;
  feeCollection: {
    collected: number;
    total: number;
  };
  todayAttendance: {
    percentage: number;
    present: number;
  };
  upcomingExams: number;
  recentNotices: number;
}

export default function DashboardPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [school, setSchool] = useState<AcceptedSchool | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalStaff: 0,
    feeCollection: { collected: 0, total: 0 },
    todayAttendance: { percentage: 0, present: 0 },
    upcomingExams: 0,
    recentNotices: 0,
  });

  useEffect(() => {
    fetchSchoolData();
    fetchDashboardStats();
  }, [schoolCode]);

  const fetchSchoolData = async () => {
    try {
      // Get from sessionStorage first
      const storedSchool = sessionStorage.getItem('school');
      if (storedSchool) {
        const schoolData = JSON.parse(storedSchool);
        if (schoolData.school_code === schoolCode) {
          setSchool(schoolData);
          return;
        }
      }

      // If not in sessionStorage, fetch from API
      const response = await fetch(`/api/schools/accepted`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        const schoolData = result.data.find((s: AcceptedSchool) => s.school_code === schoolCode);
        if (schoolData) {
          setSchool(schoolData);
          sessionStorage.setItem('school', JSON.stringify(schoolData));
        } else {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching school:', err);
      router.push('/login');
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/stats?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

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
      value: stats.feeCollection.total > 0 
        ? `₹${(stats.feeCollection.collected / 100000).toFixed(1)}L`
        : '₹0',
      subtitle: stats.feeCollection.total > 0
        ? `of ₹${(stats.feeCollection.total / 100000).toFixed(1)}L`
        : 'Not configured',
      icon: DollarSign,
      color: 'bg-purple-500',
    },
    {
      title: "Today's Attendance",
      value: stats.todayAttendance.percentage > 0
        ? `${stats.todayAttendance.percentage.toFixed(1)}%`
        : '0%',
      subtitle: stats.todayAttendance.present > 0
        ? `${stats.todayAttendance.present} present`
        : 'No data',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg mb-4">School not found</p>
          <Button onClick={() => router.push('/login')}>
            Back to Login
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">
            Welcome, {school.school_name}
          </h1>
          <p className="text-gray-600">Here&apos;s what&apos;s happening at your school.</p>
        </div>
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
            <button
              onClick={() => router.push(`/dashboard/${schoolCode}/students/add`)}
              className="p-4 rounded-lg border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-colors text-left"
            >
              <p className="font-semibold text-black">Add Student</p>
              <p className="text-sm text-gray-600 mt-1">Register new student</p>
            </button>
            <button
              onClick={() => router.push(`/dashboard/${schoolCode}/attendance`)}
              className="p-4 rounded-lg border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-colors text-left"
            >
              <p className="font-semibold text-black">Mark Attendance</p>
              <p className="text-sm text-gray-600 mt-1">Record today&apos;s attendance</p>
            </button>
            <button
              onClick={() => router.push(`/dashboard/${schoolCode}/examinations`)}
              className="p-4 rounded-lg border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-colors text-left"
            >
              <p className="font-semibold text-black">Create Exam</p>
              <p className="text-sm text-gray-600 mt-1">Schedule new examination</p>
            </button>
            <button
              onClick={() => router.push(`/dashboard/${schoolCode}/communication`)}
              className="p-4 rounded-lg border-2 border-gray-200 hover:border-black hover:bg-gray-50 transition-colors text-left"
            >
              <p className="font-semibold text-black">Send Notice</p>
              <p className="text-sm text-gray-600 mt-1">Publish announcement</p>
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

