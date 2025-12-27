'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  DollarSign, 
  Search, 
  Plus, 
  LogOut, 
  User, 
  CheckCircle,
  XCircle,
  Filter,
  Users,
  AlertCircle,
  Bell,
  TrendingUp,
} from 'lucide-react';
import AddFeeModal from '@/components/fees/AddFeeModal';

interface Student {
  id: string;
  admission_no: string;
  student_name: string;
  class: string;
  section: string;
  total_paid?: number;
  fee_status?: 'paid' | 'pending';
}

export default function AccountantDashboard() {
  const router = useRouter();
  interface AccountantData {
    id: string;
    staff_id: string;
    name: string;
    full_name: string;
    email?: string;
    school_code: string;
    [key: string]: unknown;
  }
  interface SchoolData {
    id: string;
    school_name: string;
    school_code: string;
    [key: string]: unknown;
  }
  const [accountant, setAccountant] = useState<AccountantData | null>(null);
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [showAddFeeModal, setShowAddFeeModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    pendingFeesThisMonth: 0,
    totalFeesGiven: 0,
    notices: 0,
  });

  useEffect(() => {
    // Check if accountant is logged in
    const storedAccountant = sessionStorage.getItem('accountant');
    const storedSchool = sessionStorage.getItem('school');
    const role = sessionStorage.getItem('role');

    if (!storedAccountant || role !== 'accountant') {
      router.push('/accountant/login');
      return;
    }

    try {
      const accountantData = JSON.parse(storedAccountant);
      const schoolData = JSON.parse(storedSchool || '{}');
      setAccountant(accountantData);
      setSchool(schoolData);
      fetchStudents(accountantData.school_code);
      fetchStats(accountantData.school_code);
    } catch (err) {
      console.error('Error parsing session data:', err);
      router.push('/accountant/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchStats = async (schoolCode: string) => {
    try {
      const response = await fetch(`/api/accountant/stats?school_code=${schoolCode}`);
      const result = await response.json();
      if (response.ok && result.data) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchStudents = async (schoolCode: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('school_code', schoolCode);
      if (classFilter) params.append('class', classFilter);
      if (sectionFilter) params.append('section', sectionFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/fees/students?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setStudents(result.data);
        console.log(`Fetched ${result.data.length} students`);
      } else {
        console.error('Error fetching students:', result.error);
        setStudents([]);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountant) {
      fetchStudents(accountant.school_code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classFilter, sectionFilter, searchQuery, accountant]);

  const handleLogout = () => {
    sessionStorage.removeItem('accountant');
    sessionStorage.removeItem('school');
    sessionStorage.removeItem('role');
    router.push('/accountant/login');
  };

  const handleAddFee = (student: Student) => {
    setSelectedStudent(student);
    setShowAddFeeModal(true);
  };

  const handleFeeAdded = () => {
    setShowAddFeeModal(false);
    setSelectedStudent(null);
    if (accountant) {
      fetchStudents(accountant.school_code);
    }
  };

  const filteredStudents = students.filter((student) => {
    if (statusFilter === 'all') return true;
    return student.fee_status === statusFilter;
  });

  // Get unique classes and sections
  const classes = [...new Set(students.map(s => s.class))].sort();
  const sections = [...new Set(students.map(s => s.section))].sort();

  if (loading || !accountant || !school) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <DollarSign className="text-indigo-600" size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Fees Management</h1>
                  <p className="text-sm text-gray-600">{school.school_name}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{accountant.full_name}</p>
                <p className="text-xs text-gray-500">Accountant</p>
              </div>
              <Button variant="outline" onClick={handleLogout} size="sm">
                <LogOut size={18} className="mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stat Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          {/* Total Students */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="text-blue-600" size={20} />
                  </div>
                  <p className="text-sm text-gray-600">Total Students</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.totalStudents}</p>
                <p className="text-xs text-gray-500 mt-1">Active students</p>
              </div>
              <div className="opacity-10">
                <TrendingUp size={48} className="text-blue-600" />
              </div>
            </div>
          </Card>

          {/* Pending Fees This Month */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="text-red-600" size={20} />
                  </div>
                  <p className="text-sm text-gray-600">Pending Fees</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.pendingFeesThisMonth}</p>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </div>
              <div className="opacity-10">
                <TrendingUp size={48} className="text-red-600" />
              </div>
            </div>
          </Card>

          {/* Total Fees Given */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="text-green-600" size={20} />
                  </div>
                  <p className="text-sm text-gray-600">Total Fees Given</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">₹{stats.totalFeesGiven.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </div>
              <div className="opacity-10">
                <TrendingUp size={48} className="text-green-600" />
              </div>
            </div>
          </Card>

          {/* Notices */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Bell className="text-purple-600" size={20} />
                  </div>
                  <p className="text-sm text-gray-600">Notices</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats.notices}</p>
                <p className="text-xs text-gray-500 mt-1">Active notices</p>
              </div>
              <div className="opacity-10">
                <TrendingUp size={48} className="text-purple-600" />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search size={16} className="inline mr-2" />
                Search
              </label>
              <Input
                type="text"
                placeholder="Search by name or admission no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter size={16} className="inline mr-2" />
                Class
              </label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Sections</option>
                {sections.map((sec) => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fee Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'pending')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Students Table */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Students List</h2>
            <p className="text-sm text-gray-600">
              Total: {filteredStudents.length} students
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <User className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 text-lg">No students found</p>
              <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-y-auto overflow-x-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Admission No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Student Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Class</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Section</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Fee Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Total Paid</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.admission_no}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{student.student_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{student.class}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{student.section}</td>
                      <td className="px-4 py-3 text-sm">
                        {student.fee_status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <CheckCircle size={14} />
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            <XCircle size={14} />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        ₹{student.total_paid?.toLocaleString() || '0'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Button
                          size="sm"
                          onClick={() => handleAddFee(student)}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Plus size={16} className="mr-1" />
                          Add Fee
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Add Fee Modal */}
      {showAddFeeModal && selectedStudent && (
        <AddFeeModal
          student={selectedStudent}
          accountant={accountant}
          school={school}
          onClose={() => {
            setShowAddFeeModal(false);
            setSelectedStudent(null);
          }}
          onSuccess={handleFeeAdded}
        />
      )}
    </div>
  );
}

