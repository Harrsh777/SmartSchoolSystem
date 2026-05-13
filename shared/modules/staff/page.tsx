'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { UserCheck, Search, Mail, Phone, Plus, Upload, HelpCircle, Calendar, Key } from 'lucide-react';
import type { Staff } from '@/lib/supabase';
import StaffTutorial from '@/components/staff/StaffTutorial';

export default function StaffPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const router = useRouter();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [showTutorial, setShowTutorial] = useState(false);
  const [generatingPasswords, setGeneratingPasswords] = useState(false);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);

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

  const filteredStaff = staff.filter(member => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = typeof member.full_name === 'string' ? member.full_name : '';
    const staffId = typeof member.staff_id === 'string' ? member.staff_id : '';
    const role = typeof member.role === 'string' ? member.role : '';
    const department = typeof member.department === 'string' ? member.department : '';
    
    const matchesSearch = 
      fullName.toLowerCase().includes(searchLower) ||
      staffId.toLowerCase().includes(searchLower) ||
      role.toLowerCase().includes(searchLower) ||
      department.toLowerCase().includes(searchLower);
    
    const matchesDepartment = departmentFilter === 'all' || department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });

  // Helper to safely get string value
  const getString = (value: unknown): string => {
    return typeof value === 'string' ? value : '';
  };

  const uniqueDepartments: string[] = Array.from(
    new Set(
      staff
        .map(s => getString(s.department))
        .filter(dept => dept.length > 0)
    )
  ).sort();

  const handleGeneratePasswords = async () => {
    if (!confirm('Are you sure you want to generate passwords for all staff members? This will create passwords for staff who don\'t have one.')) {
      return;
    }

    try {
      setGeneratingPasswords(true);
      const response = await fetch('/api/staff/generate-passwords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          school_code: schoolCode,
          regenerate_all: false, // Only generate for staff without passwords
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Password generation completed!\n\nTotal staff: ${result.results.total}\nPasswords created: ${result.results.created}\nPasswords updated: ${result.results.updated}\nErrors: ${result.results.errors.length}`);
        // Refresh staff list to show updated password status
        fetchStaff();
      } else {
        alert(`Error: ${result.error || 'Failed to generate passwords'}`);
      }
    } catch (err) {
      console.error('Error generating passwords:', err);
      alert('An error occurred while generating passwords. Please try again.');
    } finally {
      setGeneratingPasswords(false);
    }
  };

  const handleResetPassword = async (staffId: string) => {
    if (!confirm(`Are you sure you want to reset the password for this staff member? A new password will be generated and displayed.`)) {
      return;
    }

    try {
      setResettingPassword(staffId);
      const response = await fetch('/api/staff/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          school_code: schoolCode,
          staff_id: staffId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`Password reset successfully!\n\nStaff: ${result.data.staff_name}\nStaff ID: ${result.data.staff_id}\n\nNew Password: ${result.data.password}\n\nPlease save this password securely.`);
      } else {
        alert(`Error: ${result.error || result.details || 'Failed to reset password'}`);
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      alert('An error occurred while resetting password. Please try again.');
    } finally {
      setResettingPassword(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#5A7A95] border-t-transparent mx-auto mb-4"></div>
          <p className="text-[#5A7A95] dark:text-[#6B9BB8] font-medium">Loading staff...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white mb-2 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8]">
                <UserCheck className="text-white" size={28} />
              </div>
              Staff Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage all staff members and their information</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowTutorial(true)}
            >
              <HelpCircle size={18} className="mr-2" />
              Tutorial
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/${schoolCode}/attendance/staff`)}
            >
              <Calendar size={18} className="mr-2" />
              Staff Attendance
            </Button>
            <Button
              variant="outline"
              onClick={handleGeneratePasswords}
              disabled={generatingPasswords || staff.length === 0}
            >
              {generatingPasswords ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Key size={18} className="mr-2" />
                  Generate Passwords
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/${schoolCode}/staff/import`)}
            >
              <Upload size={18} className="mr-2" />
              Bulk Import
            </Button>
            <Button onClick={() => router.push(`/dashboard/${schoolCode}/staff/add`)}>
              <Plus size={18} className="mr-2" />
              Add Staff
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search staff by name, staff ID, role, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] focus:border-transparent transition-all hover:border-[#5A7A95]/50 dark:hover:border-[#6B9BB8]/50"
                />
              </div>
            </div>
            <select 
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#5A7A95] dark:focus:ring-[#6B9BB8] focus:border-transparent transition-all hover:border-[#5A7A95]/50 dark:hover:border-[#6B9BB8]/50"
            >
              <option value="all">All Departments</option>
              {uniqueDepartments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </Card>
      </motion.div>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <UserCheck className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg mb-2">No staff found</p>
            <p className="text-gray-500 text-sm mb-6">
              {staff.length === 0 
                ? 'Get started by adding your first staff member'
                : 'Try adjusting your search or filters'}
            </p>
            {staff.length === 0 && (
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/${schoolCode}/staff/import`)}
                >
                  <Upload size={18} className="mr-2" />
                  Bulk Import
                </Button>
                <Button onClick={() => router.push(`/dashboard/${schoolCode}/staff/add`)}>
                  <Plus size={18} className="mr-2" />
                  Add Staff
                </Button>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
            >
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-[#5A7A95]/30 dark:hover:border-[#6B9BB8]/30">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#5A7A95] to-[#6B9BB8] rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {member.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{member.full_name}</h3>
                    {!!member.role && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{getString(member.role)}</p>
                    )}
                    {!!member.department && (
                      <p className="text-xs text-[#5A7A95] dark:text-[#6B9BB8] font-medium mb-3">{getString(member.department)}</p>
                    )}
                    <div className="space-y-2">
                      {!!member.email && (
                        <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                          <Mail size={14} className="text-[#5A7A95] dark:text-[#6B9BB8]" />
                          <span className="truncate">{getString(member.email)}</span>
                        </div>
                      )}
                      {!!member.phone && (
                        <div className="flex items-center space-x-2 text-xs text-gray-600 dark:text-gray-400">
                          <Phone size={14} className="text-[#5A7A95] dark:text-[#6B9BB8]" />
                          <span>{getString(member.phone)}</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Joined: {(() => {
                          const doj = typeof member.date_of_joining === 'string' ? member.date_of_joining : 
                                     typeof member.date_of_joining === 'number' ? String(member.date_of_joining) : null;
                          return doj ? new Date(doj).toLocaleDateString() : 'N/A';
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex space-x-2">
                  <button 
                    onClick={() => router.push(`/dashboard/${schoolCode}/staff/${member.id}/view`)}
                    className="flex-1 px-3 py-2 text-sm bg-gradient-to-r from-[#5A7A95] to-[#6B9BB8] hover:from-[#567C8D] hover:to-[#5A7A95] text-white rounded-lg transition-all shadow-md hover:shadow-lg"
                  >
                    View
                  </button>
                  <button 
                    onClick={() => router.push(`/dashboard/${schoolCode}/staff/${member.id}/edit`)}
                    className="flex-1 px-3 py-2 text-sm border-2 border-gray-300 hover:border-black rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => {
                      const staffId = typeof member.staff_id === 'string' ? member.staff_id : '';
                      if (staffId) {
                        handleResetPassword(staffId);
                      }
                    }}
                    disabled={resettingPassword === member.staff_id || !member.staff_id}
                    className="px-3 py-2 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Reset Password"
                  >
                    {resettingPassword === member.staff_id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mx-auto" />
                    ) : (
                      <Key size={14} />
                    )}
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Stats Summary */}
      {staff.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-3 rounded-lg">
                <UserCheck className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Staff</p>
                <p className="text-2xl font-bold text-black">{staff.length}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-green-500 p-3 rounded-lg">
                <UserCheck className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Teachers</p>
                <p className="text-2xl font-bold text-black">
                  {staff.filter(s => {
                    const role = typeof s.role === 'string' ? s.role : '';
                    return role.toLowerCase().includes('teacher');
                  }).length}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-purple-500 p-3 rounded-lg">
                <UserCheck className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Administration</p>
                <p className="text-2xl font-bold text-black">
                  {staff.filter(s => s.department === 'Administration').length}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center space-x-4">
              <div className="bg-orange-500 p-3 rounded-lg">
                <UserCheck className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Departments</p>
                <p className="text-2xl font-bold text-black">{uniqueDepartments.length}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {showTutorial && (
        <StaffTutorial
          schoolCode={schoolCode}
          onClose={() => setShowTutorial(false)}
        />
      )}
    </div>
  );
}

