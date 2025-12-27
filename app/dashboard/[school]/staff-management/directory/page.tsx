'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Search, Download, Copy, Edit, UserX, Filter } from 'lucide-react';
import type { Staff } from '@/lib/supabase';

export default function StaffDirectoryPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'TEACHING' | 'NON-TEACHING' | 'DRIVER/SUPPORTING STAFF' | 'OTHERS' | 'ADMIN'>('TEACHING');

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
      if (role === 'OTHERS') {
        return !roleMap['TEACHING'].includes(s.role) && 
               !roleMap['NON-TEACHING'].includes(s.role) && 
               !roleMap['DRIVER/SUPPORTING STAFF'].includes(s.role) &&
               !roleMap['ADMIN'].includes(s.role);
      }
      return roles.includes(s.role);
    });
  };

  const filteredStaff = getStaffByRole(selectedTab).filter(member => {
    const query = searchQuery.toLowerCase();
    return (
      member.full_name?.toLowerCase().includes(query) ||
      member.staff_id?.toLowerCase().includes(query) ||
      member.phone?.includes(query) ||
      member.email?.toLowerCase().includes(query) ||
      member.employee_code?.toLowerCase().includes(query)
    );
  });

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    alert(`${type} copied to clipboard!`);
  };

  const tabs = ['TEACHING', 'NON-TEACHING', 'DRIVER/SUPPORTING STAFF', 'OTHERS', 'ADMIN'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-black mb-2">Staff Directory</h1>
        <p className="text-gray-600">View and manage all staff members</p>
      </motion.div>

      {/* Tabs */}
      <Card>
        <div className="flex gap-2 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab as typeof selectedTab)}
              className={`px-4 py-3 font-medium transition-colors border-b-2 ${
                selectedTab === tab
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </Card>

      {/* Search and Actions */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Search by staff name, employee ID, mobile, email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="mt-6">
            <Button variant="outline" className="bg-orange-500 text-white hover:bg-orange-600">
              <Download size={18} className="mr-2" />
              DOWNLOAD/VIEW
            </Button>
          </div>
        </div>
      </Card>

      {/* Staff Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-teal-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    Staff ID
                    <Filter size={14} />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  <div className="flex items-center gap-2">
                    Name A-Z
                    <span className="text-xs">A-Z</span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Designation</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Highest Qualification</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Department</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Mobile</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">E-mail</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStaff.length > 0 ? (
                filteredStaff.map((member, index) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {String(index + 1).padStart(2, '0')}. {member.staff_id}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          {member.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span className="font-medium text-gray-900">{member.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{member.designation || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{member.qualification || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{member.department || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {member.phone ? (
                        <div className="flex items-center gap-2">
                          <span>{member.phone}</span>
                          <button
                            onClick={() => handleCopy(member.phone || '', 'Phone')}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {member.email ? (
                        <div className="flex items-center gap-2">
                          <span>{member.email}</span>
                          <button
                            onClick={() => handleCopy(member.email || '', 'Email')}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          className="text-orange-600 hover:text-orange-700 p-1"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="text-orange-600 hover:text-orange-700 p-1"
                          title="Disable/Delete"
                        >
                          <UserX size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No staff found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

