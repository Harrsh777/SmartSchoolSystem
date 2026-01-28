'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  UserCheck,
  Search,
  CheckCircle,
  Loader2,
  Users,
  Shield,
  AlertCircle,
  BadgeCheck,
} from 'lucide-react';

interface Staff {
  id: string;
  staff_id: string;
  full_name: string;
  email: string | null;
  designation: string | null;
}

interface Role {
  id: string;
  role_name: string;
  role_description: string | null;
}

interface StaffRole {
  id: string;
  role_id: string;
  roles: {
    id: string;
    role_name: string;
    role_description: string | null;
    is_system_role: boolean;
  };
}

interface StaffPermission {
  module_name: string;
  sub_module_name: string;
  view_access: boolean;
  edit_access: boolean;
  source: 'role' | 'staff' | 'default';
}

export default function AssignRolesTab({
  schoolCode,
  roles,
}: {
  schoolCode: string;
  roles: Role[];
}) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>([]);
  const [currentPermissions, setCurrentPermissions] = useState<StaffPermission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (selectedStaff) {
      fetchStaffRoles(selectedStaff.id);
      fetchStaffPermissions(selectedStaff.id);
    } else {
      setCurrentPermissions([]);
    }
  }, [selectedStaff]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/staff?school_code=${schoolCode}`);
      if (response.ok) {
        const result = await response.json();
        setStaff(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffRoles = async (staffId: string) => {
    try {
      const response = await fetch(`/api/staff/${staffId}/roles`);
      if (response.ok) {
        const result = await response.json();
        const roles = result.data || [];
        setStaffRoles(roles);
        setSelectedRoleIds(new Set(roles.map((sr: StaffRole) => sr.role_id)));
      }
    } catch (err) {
      console.error('Error fetching staff roles:', err);
    }
  };

  const fetchStaffPermissions = async (staffId: string) => {
    try {
      setLoadingPermissions(true);
      const response = await fetch(`/api/rbac/staff-permissions/${staffId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.modules) {
          // Flatten permissions from modules
          const permissions: StaffPermission[] = [];
          result.data.modules.forEach((module: {
            name: string;
            sub_modules: Array<{
              name: string;
              view_access: boolean;
              edit_access: boolean;
            }>;
          }) => {
            module.sub_modules.forEach((subModule) => {
              if (subModule.view_access || subModule.edit_access) {
                permissions.push({
                  module_name: module.name,
                  sub_module_name: subModule.name,
                  view_access: subModule.view_access,
                  edit_access: subModule.edit_access,
                  source: 'role', // Will be determined from actual source if needed
                });
              }
            });
          });
          setCurrentPermissions(permissions);
        }
      }
    } catch (error) {
      console.error('Error fetching staff permissions:', error);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleSave = async () => {
    if (!selectedStaff) return;

    setSaving(true);
    setError('');
    try {
      const staffData = JSON.parse(sessionStorage.getItem('staff') || '{}');
      const response = await fetch(`/api/staff/${selectedStaff.id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_ids: Array.from(selectedRoleIds),
          assigned_by: staffData.id || null,
        }),
      });

      if (response.ok) {
        setSuccess('Roles assigned successfully');
        fetchStaffRoles(selectedStaff.id);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to assign roles');
      }
    } catch {
      setError('An error occurred while assigning roles');
    } finally {
      setSaving(false);
    }
  };

  const filteredStaff = staff.filter((s) =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.staff_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <CheckCircle className="h-5 w-5" />
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="h-5 w-5" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Staff Selection */}
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-[#2F6FED]" />
            Select Staff Member
          </h3>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#2F6FED]" />
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredStaff.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStaff(s)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedStaff?.id === s.id
                        ? 'bg-[#2F6FED] text-white'
                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-medium">{s.full_name}</div>
                    <div className="text-sm opacity-75">
                      {s.staff_id} {s.designation && `• ${s.designation}`}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Role Assignment */}
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#2F6FED]" />
            Assign Roles
          </h3>
          {selectedStaff ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedStaff.full_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedStaff.staff_id} {selectedStaff.designation && `• ${selectedStaff.designation}`}
                </p>
              </div>

              {/* Currently Assigned Roles */}
              {staffRoles.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BadgeCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h4 className="font-semibold text-green-900 dark:text-green-200">
                      Currently Assigned Roles
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {staffRoles.map((staffRole) => (
                      <span
                        key={staffRole.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200 text-sm font-medium border border-green-300 dark:border-green-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {staffRole.roles?.role_name || 'Unknown Role'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Permissions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200">
                    Current Permissions
                  </h4>
                </div>
                {loadingPermissions ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading permissions...</span>
                  </div>
                ) : currentPermissions.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {Object.entries(
                      currentPermissions.reduce((acc, perm) => {
                        if (!acc[perm.module_name]) {
                          acc[perm.module_name] = [];
                        }
                        acc[perm.module_name].push(perm);
                        return acc;
                      }, {} as Record<string, StaffPermission[]>)
                    ).map(([moduleName, perms]) => (
                      <div key={moduleName} className="border-b border-blue-200 dark:border-blue-700 pb-2 last:border-b-0">
                        <div className="font-medium text-sm text-blue-900 dark:text-blue-200 mb-1">
                          {moduleName}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {perms.map((perm, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700"
                            >
                              {perm.sub_module_name}
                              {perm.edit_access && (
                                <span className="text-blue-600 dark:text-blue-400" title="Edit Access">✏️</span>
                              )}
                              {!perm.edit_access && perm.view_access && (
                                <span className="text-blue-500 dark:text-blue-400" title="View Only">👁️</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-2">
                    No permissions assigned yet. Assign roles to grant permissions.
                  </p>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-[#2F6FED]" />
                  Select Roles to Assign
                </h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                {roles.map((role) => {
                  const isSelected = selectedRoleIds.has(role.id);
                  return (
                    <label
                      key={role.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#2F6FED]/10 border-2 border-[#2F6FED]'
                          : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const newSet = new Set(selectedRoleIds);
                          if (e.target.checked) {
                            newSet.add(role.id);
                          } else {
                            newSet.delete(role.id);
                          }
                          setSelectedRoleIds(newSet);
                        }}
                        className="w-5 h-5 text-[#2F6FED] rounded focus:ring-[#2F6FED]"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {role.role_name}
                        </div>
                        {role.role_description && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {role.role_description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-[#2F6FED]" />
                      )}
                    </label>
                  );
                })}
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Save Assignments
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a staff member to assign roles</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
