'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { 
  Search, 
  Copy, 
  Users, 
  UserCheck, 
  Mail, 
  Phone,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Eye
} from 'lucide-react';
import type { Staff } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

export default function StaffDirectoryPage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<Staff | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'TEACHING' | 'NON-TEACHING' | 'DRIVER/SUPPORTING STAFF' | 'OTHERS' | 'ADMIN'>('TEACHING');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  useEffect(() => {
    const storedTeacher = sessionStorage.getItem('teacher');
    if (storedTeacher) {
      const teacherData = JSON.parse(storedTeacher);
      setTeacher(teacherData);
      fetchStaff(teacherData);
    }
  }, []);

  const fetchStaff = async (teacherData: Staff) => {
    try {
      setLoading(true);
      const schoolCode = getString(teacherData.school_code);
      if (!schoolCode) {
        setLoading(false);
        return;
      }
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
    const role = getString(member.role).toLowerCase();
    const department = getString(member.department).toLowerCase();
    const email = getString(member.email).toLowerCase();
    const phone = getString(member.phone).toLowerCase();
    
    return (
      fullName.includes(query) ||
      staffId.includes(query) ||
      role.includes(query) ||
      department.includes(query) ||
      email.includes(query) ||
      phone.includes(query)
    );
  });

  const sortedStaff = [...filteredStaff].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const aValue = getString(a[sortConfig.key as keyof Staff] as unknown);
    const bValue = getString(b[sortConfig.key as keyof Staff] as unknown);
    
    if (sortConfig.direction === 'asc') {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

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

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStaffClick = (staffId: string | undefined) => {
    if (staffId && teacher?.school_code) {
      router.push(`/dashboard/${teacher.school_code}/staff/${staffId}/view`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading staff directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="secondary"
            onClick={() => router.push('/teacher/dashboard')}
            className="p-2"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
            <Users className="text-indigo-600 dark:text-indigo-400" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staff Directory</h1>
            <p className="text-gray-600 dark:text-gray-400">View and manage all staff members</p>
          </div>
        </div>
      </motion.div>

      <Card className="p-6">
        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Search by name, staff ID, role, department, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
            {(['TEACHING', 'NON-TEACHING', 'DRIVER/SUPPORTING STAFF', 'OTHERS', 'ADMIN'] as const).map((tab) => {
              const count = getStaffByRole(tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setSelectedTab(tab);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    selectedTab === tab
                      ? 'bg-indigo-600 text-white border-b-2 border-indigo-600'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {paginatedStaff.length} of {filteredStaff.length} staff members
        </div>

        {/* Staff Table */}
        {paginatedStaff.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No staff found</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              {searchQuery ? 'Try adjusting your search query' : `No ${selectedTab.toLowerCase()} staff members found`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('staff_id')}
                  >
                    Staff ID {sortConfig?.key === 'staff_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('full_name')}
                  >
                    Name {sortConfig?.key === 'full_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleSort('role')}
                  >
                    Role {sortConfig?.key === 'role' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Department</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedStaff.map((member, index) => {
                  const memberId = getString(member.id) || `member-${index}`;
                  const staffId = getString(member.staff_id);
                  const fullName = getString(member.full_name);
                  const role = getString(member.role);
                  const department = getString(member.department);
                  const email = getString(member.email);
                  const phone = getString(member.phone);
                  
                  return (
                    <tr 
                      key={memberId} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{staffId || 'N/A'}</span>
                          <button
                            onClick={() => handleCopyId(staffId)}
                            className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            title="Copy Staff ID"
                          >
                            {copiedId === staffId ? (
                              <CheckCircle2 size={16} className="text-green-600" />
                            ) : (
                              <Copy size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                            <UserCheck className="text-indigo-600 dark:text-indigo-400" size={16} />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{fullName || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{role || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{department || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {email && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <Mail size={12} />
                              <span>{email}</span>
                            </div>
                          )}
                          {phone && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <Phone size={12} />
                              <span>{phone}</span>
                            </div>
                          )}
                          {!email && !phone && <span className="text-xs text-gray-400">N/A</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStaffClick(member.id)}
                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
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
