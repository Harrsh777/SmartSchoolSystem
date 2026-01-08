'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import {
  Users,
  Eye,
  Edit,
  Search,
  Bookmark,
  FileText,
  User,
} from 'lucide-react';

interface StaffPermission {
  id: string;
  staff_id: string;
  full_name: string;
  email: string | null;
  designation: string | null;
  photo_url: string | null;
  user_access: string;
  role_category: string;
  view_permissions: string[];
  edit_permissions: string[];
  access_given_by: string;
}

interface SummaryStats {
  total_staff: number;
  view_permission_count: number;
  edit_permission_count: number;
}

export default function StaffAccessControlPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [staff, setStaff] = useState<StaffPermission[]>([]);
  const [filteredStaff, setFilteredStaff] = useState<StaffPermission[]>([]);
  const [summary, setSummary] = useState<SummaryStats>({
    total_staff: 0,
    view_permission_count: 0,
    edit_permission_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [staffTypeFilter, setStaffTypeFilter] = useState<string>('all');
  const [moduleWiseView, setModuleWiseView] = useState(false);

  useEffect(() => {
    fetchStaffPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    filterStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, staffTypeFilter, staff]);

  const fetchStaffPermissions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/rbac/staff-permissions?school_code=${schoolCode}`);
      const result = await response.json();

      if (response.ok && result.data) {
        setStaff(result.data);
        setFilteredStaff(result.data);
        if (result.summary) {
          setSummary(result.summary);
        }
      } else {
        console.error('Failed to fetch staff permissions:', result);
      }
    } catch (error) {
      console.error('Error fetching staff permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterStaff = () => {
    let filtered = [...staff];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.full_name.toLowerCase().includes(query) ||
          s.email?.toLowerCase().includes(query) ||
          s.staff_id.toLowerCase().includes(query)
      );
    }

    // Staff type filter
    if (staffTypeFilter !== 'all') {
      if (staffTypeFilter === 'teaching') {
        filtered = filtered.filter((s) => s.user_access.includes('Teaching'));
      } else if (staffTypeFilter === 'non-teaching') {
        filtered = filtered.filter((s) => s.user_access.includes('Non-Teaching'));
      }
    }

    setFilteredStaff(filtered);
  };

  const handleStaffClick = (staffIdOrId: string) => {
    router.push(`/dashboard/${schoolCode}/staff-access-control/${staffIdOrId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading staff permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Access Control</h1>
        <p className="text-gray-600">Manage permissions for all staff members</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">Total Staffs</p>
              <p className="text-3xl font-bold text-blue-900">{summary.total_staff}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Users className="text-blue-600" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-orange-50 border border-orange-200 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 mb-1">View Permission</p>
              <p className="text-3xl font-bold text-orange-900">{summary.view_permission_count}</p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <Eye className="text-orange-600" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-pink-50 border border-pink-200 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-pink-600 mb-1">Edit Permission</p>
              <p className="text-3xl font-bold text-pink-900">{summary.edit_permission_count}</p>
            </div>
            <div className="bg-pink-100 rounded-full p-3">
              <Edit className="text-pink-600" size={24} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search */}
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Search Staff"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Module Wise View Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">SHOW MODULE WISE VIEW</label>
            <button
              onClick={() => setModuleWiseView(!moduleWiseView)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                moduleWiseView ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  moduleWiseView ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Staff Type Filter */}
          <div className="flex items-center gap-2">
            <Bookmark className="text-gray-400" size={18} />
            <select
              value={staffTypeFilter}
              onChange={(e) => setStaffTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Staff</option>
              <option value="teaching">Teaching</option>
              <option value="non-teaching">Non-Teaching</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Staff Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-teal-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  User Access
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Role Category
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  View Permission
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Edit Permission
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Access Given By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No staff members found
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr
                    key={member.id}
                    onClick={() => handleStaffClick(member.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {member.photo_url ? (
                          <img
                            src={member.photo_url}
                            alt={member.full_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="text-gray-400" size={20} />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{member.full_name}</div>
                          <div className="text-xs text-gray-500">Emp ID: {member.staff_id || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{member.email || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{member.user_access || '-'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">{member.role_category || 'Default'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {member.view_permissions && member.view_permissions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {member.view_permissions.slice(0, 3).map((perm, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                              >
                                {perm}
                              </span>
                            ))}
                            {member.view_permissions.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{member.view_permissions.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-900">
                        {member.edit_permissions && member.edit_permissions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {member.edit_permissions.slice(0, 3).map((perm, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded"
                              >
                                {perm}
                              </span>
                            ))}
                            {member.edit_permissions.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{member.edit_permissions.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-gray-500 max-w-xs">
                        {member.access_given_by ? (
                          <div className="space-y-0.5">
                            {member.access_given_by.split(', ').map((part, idx) => (
                              <div key={idx}>{part}</div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {filteredStaff.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredStaff.length}</span> of{' '}
              <span className="font-medium">{filteredStaff.length}</span> results
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled
                className="px-3 py-1 text-sm text-gray-400 cursor-not-allowed"
              >
                ←
              </button>
              <button
                disabled
                className="px-3 py-1 text-sm text-gray-400 cursor-not-allowed"
              >
                →
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

