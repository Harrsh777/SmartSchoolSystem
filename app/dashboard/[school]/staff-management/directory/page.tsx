'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  Search, 
  Download, 
  Copy, 
  Edit, 
  UserX, 
  Filter, 
  Users, 
  UserCheck, 
  Mail, 
  Phone,
  Briefcase,
  GraduationCap,
  Building2,
  ArrowLeft,
  CheckCircle2,
  Eye
} from 'lucide-react';
import type { Staff } from '@/lib/supabase';
import EmptyState from '@/components/ui/EmptyState';

export default function StaffDirectoryPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'TEACHING' | 'NON-TEACHING' | 'DRIVER/SUPPORTING STAFF' | 'OTHERS' | 'ADMIN'>('TEACHING');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Helper to safely get string value
  const getString = (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  };
  
  const handleStaffClick = (staffId: string | undefined) => {
    if (staffId) {
      router.push(`/dashboard/${schoolCode}/staff/${staffId}/view`);
    }
  };

  useEffect(() => {
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/staff?school_code=${schoolCode}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setStaff(result.data);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStaffByRole = (role: string) => {
    const roleMap: Record<string, string[]> = {
      'TEACHING': ['Teacher', 'Principal', 'Vice Principal', 'Head Teacher'],
      'NON-TEACHING': ['Accountant', 'Clerk', 'Librarian', 'Admin Staff'],
      'DRIVER/SUPPORTING STAFF': ['Driver', 'Support Staff', 'Helper', 'Security'],
      'OTHERS': [],
      'ADMIN': ['Admin', 'Super Admin'],
    };
    
    const roles = roleMap[role] || [];
    return staff.filter(s => {
      const staffRole = getString(s.role);
      if (role === 'OTHERS') {
        return !roleMap['TEACHING'].includes(staffRole) && 
               !roleMap['NON-TEACHING'].includes(staffRole) && 
               !roleMap['DRIVER/SUPPORTING STAFF'].includes(staffRole) &&
               !roleMap['ADMIN'].includes(staffRole);
      }
      return roles.includes(staffRole);
    });
  };

  const filteredStaff = getStaffByRole(selectedTab).filter(member => {
    const query = searchQuery.toLowerCase();
    const fullName = getString(member.full_name).toLowerCase();
    const staffId = getString(member.staff_id).toLowerCase();
    const phone = getString(member.phone);
    const email = getString(member.email).toLowerCase();
    const employeeCode = getString(member.employee_code).toLowerCase();
    return (
      fullName.includes(query) ||
      staffId.includes(query) ||
      phone.includes(query) ||
      email.includes(query) ||
      employeeCode.includes(query)
    );
  });

  // Sorting
  const sortedStaff = [...filteredStaff].sort((a, b) => {
    if (!sortConfig) return 0;
    const aValue = a[sortConfig.key as keyof Staff] || '';
    const bValue = b[sortConfig.key as keyof Staff] || '';
    if (sortConfig.direction === 'asc') {
      return String(aValue).localeCompare(String(bValue));
    }
    return String(bValue).localeCompare(String(aValue));
  });

  // Pagination
  const totalPages = Math.ceil(sortedStaff.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStaff = sortedStaff.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const handleCopy = async (text: string, type: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Statistics
  const stats = {
    total: staff.length,
    teaching: getStaffByRole('TEACHING').length,
    nonTeaching: getStaffByRole('NON-TEACHING').length,
    admin: getStaffByRole('ADMIN').length,
    currentTab: filteredStaff.length,
  };

  const tabs = ['TEACHING', 'NON-TEACHING', 'DRIVER/SUPPORTING STAFF', 'OTHERS', 'ADMIN'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a8a] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading staff directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <Users className="text-[#1e3a8a]" size={32} />
            Staff Directory
          </h1>
          <p className="text-gray-600">View and manage all staff members</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/${schoolCode}`)}
          className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
        >
          <ArrowLeft size={18} className="mr-2" />
          Back
        </Button>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] text-white hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm mb-1">Total Staff</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Users size={24} />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm mb-1">Teaching</p>
                <p className="text-3xl font-bold">{stats.teaching}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <GraduationCap size={24} />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm mb-1">Non-Teaching</p>
                <p className="text-3xl font-bold">{stats.nonTeaching}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Briefcase size={24} />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm mb-1">Admin</p>
                <p className="text-3xl font-bold">{stats.admin}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <UserCheck size={24} />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6 bg-gradient-to-br from-teal-500 to-teal-600 text-white hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-sm mb-1">Current Tab</p>
                <p className="text-3xl font-bold">{stats.currentTab}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Building2 size={24} />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <Card className="p-0">
        <div className="flex gap-1 border-b border-gray-200 bg-gray-50 p-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setSelectedTab(tab as typeof selectedTab);
                setCurrentPage(1);
              }}
              className={`px-4 py-2.5 font-medium text-sm transition-all rounded-t-lg ${
                selectedTab === tab
                  ? 'bg-white text-[#1e3a8a] border-b-2 border-[#1e3a8a] shadow-sm'
                  : 'text-gray-600 hover:text-[#1e3a8a] hover:bg-gray-100'
              }`}
            >
              {tab}
              {getStaffByRole(tab).length > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  selectedTab === tab
                    ? 'bg-[#1e3a8a] text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {getStaffByRole(tab).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Search and Actions */}
      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Search by staff name, employee ID, mobile, email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 border-[#E1E1DB] focus:border-[#1e3a8a] focus:ring-[#1e3a8a]"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="bg-[#1e3a8a] text-white hover:bg-[#3B82F6] border-[#1e3a8a]"
            >
              <Download size={18} className="mr-2" />
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Staff Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#3B82F6] text-white">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-semibold">
                  <button
                    onClick={() => handleSort('staff_id')}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    Staff ID
                    <Filter size={14} />
                  </button>
                </th>
                <th className="px-4 py-4 text-left text-sm font-semibold">
                  <button
                    onClick={() => handleSort('full_name')}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    Name
                    <Filter size={14} />
                  </button>
                </th>
                <th className="px-4 py-4 text-left text-sm font-semibold">Designation</th>
                <th className="px-4 py-4 text-left text-sm font-semibold">Qualification</th>
                <th className="px-4 py-4 text-left text-sm font-semibold">Department</th>
                <th className="px-4 py-4 text-left text-sm font-semibold">Contact</th>
                <th className="px-4 py-4 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              <AnimatePresence mode="wait">
                {paginatedStaff.length > 0 ? (
                  paginatedStaff.map((member, index) => (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent transition-all cursor-pointer group"
                    >
                      <td className="px-4 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-mono text-xs">
                            {String(startIndex + index + 1).padStart(2, '0')}.
                          </span>
                          <span className="font-medium text-gray-900">{getString(member.staff_id) || '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div 
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => handleStaffClick(member.id)}
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1e3a8a] to-[#3B82F6] flex items-center justify-center text-white font-semibold shadow-md group-hover:scale-110 transition-transform">
                            {(() => {
                              const fullName = getString(member.full_name);
                              return fullName ? fullName.charAt(0).toUpperCase() : '?';
                            })()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 group-hover:text-[#1e3a8a] transition-colors">
                              {getString(member.full_name)}
                            </p>
                            {!!member.role && (
                              <p className="text-xs text-gray-500">{getString(member.role)}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {getString(member.designation) || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {getString(member.qualification) || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {getString(member.department) || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {!!member.phone && (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone size={14} className="text-gray-400" />
                              <span className="text-gray-700">{getString(member.phone)}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const phoneValue = getString(member.phone);
                                  const memberId = member.id || '';
                                  handleCopy(phoneValue, 'Phone', `phone-${memberId}`);
                                }}
                                className="text-[#1e3a8a] hover:text-[#3B82F6] transition-colors opacity-0 group-hover:opacity-100"
                                title="Copy phone"
                              >
                                {copiedId === `phone-${member.id}` ? (
                                  <CheckCircle2 size={14} className="text-green-500" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                          )}
                          {!!member.email && (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail size={14} className="text-gray-400" />
                              <span className="text-gray-700 truncate max-w-[150px]">{getString(member.email)}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const emailValue = getString(member.email);
                                  const memberId = member.id || '';
                                  handleCopy(emailValue, 'Email', `email-${memberId}`);
                                }}
                                className="text-[#1e3a8a] hover:text-[#3B82F6] transition-colors opacity-0 group-hover:opacity-100"
                                title="Copy email"
                              >
                                {copiedId === `email-${member.id}` ? (
                                  <CheckCircle2 size={14} className="text-green-500" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                          )}
                          {!member.phone && !member.email && (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStaffClick(member.id);
                            }}
                            className="p-2 text-[#1e3a8a] hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (member.id) {
                                router.push(`/dashboard/${schoolCode}/staff/${member.id}/edit`);
                              }
                            }}
                            className="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const fullName = getString(member.full_name);
                              if (confirm(`Are you sure you want to disable ${fullName}?`)) {
                                // TODO: Implement disable functionality
                                console.log('Disable staff:', member.id);
                              }
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Disable"
                          >
                            <UserX size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-4">
                      <EmptyState
                        icon={Users}
                        title="No staff found"
                        description={searchQuery ? 'Try adjusting your search or filters.' : 'Add staff members from the Add Staff page to see them here.'}
                        actionLabel={!searchQuery ? 'Add Staff' : undefined}
                        onAction={!searchQuery ? () => router.push(`/dashboard/${schoolCode}/staff-management/add`) : undefined}
                        compact
                      />
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{startIndex + 1}</span> to{' '}
              <span className="font-semibold">
                {Math.min(startIndex + itemsPerPage, sortedStaff.length)}
              </span>{' '}
              of <span className="font-semibold">{sortedStaff.length}</span> staff
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="border-[#E1E1DB]"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? 'bg-[#1e3a8a] text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-[#E1E1DB]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="border-[#E1E1DB]"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
