'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { Users, Search } from 'lucide-react';
import type { Staff } from '@/lib/supabase';
import { getString } from '@/lib/type-utils';

export default function AllStaffPage() {
  // teacher kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [teacher, setTeacher] = useState<Staff | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredStaff = staff.filter((member) => {
    const query = searchQuery.toLowerCase();
    const fullName = getString(member.full_name).toLowerCase();
    const staffId = getString(member.staff_id).toLowerCase();
    const role = getString(member.role).toLowerCase();
    const department = getString(member.department).toLowerCase();
    
    return (
      fullName.includes(query) ||
      staffId.includes(query) ||
      role.includes(query) ||
      department.includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
          <div className="p-2 bg-purple-100 rounded-lg">
            <Users className="text-purple-600" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Staff</h1>
            <p className="text-gray-600">View all staff members in the school</p>
          </div>
        </div>
      </motion.div>

      <Card>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Search by name, staff ID, role, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredStaff.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">
              {searchQuery ? 'No staff found matching your search' : 'No staff found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Staff ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Department</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStaff.map((member, index) => {
                  const memberId = getString(member.id) || `member-${index}`;
                  const staffId = getString(member.staff_id);
                  const fullName = getString(member.full_name);
                  const role = getString(member.role);
                  const department = getString(member.department);
                  const phone = getString(member.phone);
                  
                  return (
                    <tr key={memberId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{staffId || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{fullName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{role || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{department || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{phone || 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

