'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Shield,
  Users,
  CheckCircle,
  X,
  Plus,
  Save,
  Edit,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface Permission {
  id: string;
  key: string;
  name: string;
  description: string | null;
  module: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions?: Permission[];
}

interface StaffMember {
  id: string;
  staff_id: string;
  full_name: string;
  email: string | null;
  designation: string | null;
  school_code: string;
  roles: Array<{ id: string; name: string; description: string | null }>;
}

export default function RoleManagementPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Normalize school code to uppercase
      const normalizedSchoolCode = schoolCode.toUpperCase();
      console.log('Fetching staff for school:', normalizedSchoolCode);
      
      const [staffRes, rolesRes, permissionsRes] = await Promise.all([
        fetch(`/api/rbac/staff/with-roles?school_code=${normalizedSchoolCode}`),
        fetch('/api/rbac/roles'),
        fetch('/api/rbac/permissions'),
      ]);

      const staffData = await staffRes.json();
      const rolesData = await rolesRes.json();
      const permissionsData = await permissionsRes.json();

      if (staffRes.ok) {
        if (staffData.data && Array.isArray(staffData.data)) {
          setStaff(staffData.data);
          console.log(`Loaded ${staffData.data.length} staff members for school ${normalizedSchoolCode}`);
          if (staffData.data.length === 0) {
            setError(`No staff members found for school ${normalizedSchoolCode}. Please add staff members first through Staff Management.`);
          }
        } else {
          console.warn('No staff data received or invalid format:', staffData);
          setStaff([]);
          setError('No staff data received. Please check if staff members exist in the database.');
        }
      } else {
        console.error('Failed to fetch staff:', staffData);
        const errorMsg = staffData.details 
          ? `${staffData.error}: ${staffData.details}`
          : (staffData.error || 'Failed to load staff members');
        setError(errorMsg);
        setStaff([]);
      }

      if (rolesRes.ok && rolesData.data) {
        setRoles(rolesData.data);
        console.log(`Loaded ${rolesData.data.length} roles`);
      } else {
        console.error('Failed to fetch roles:', rolesData);
        if (!rolesData.data) {
          setError((prev) => prev ? `${prev}. Also failed to load roles.` : 'Failed to load roles.');
        }
      }

      if (permissionsRes.ok && permissionsData.data) {
        setPermissions(permissionsData.data);
        console.log(`Loaded ${permissionsData.data.length} permissions`);
      } else {
        console.error('Failed to fetch permissions:', permissionsData);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const handleManageRoles = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    // Initialize with current roles
    const currentRoleIds = new Set(staffMember.roles.map(r => r.id));
    setSelectedPermissions(currentRoleIds);
    setRoleModalOpen(true);
  };

  const handleSaveStaffRoles = async () => {
    if (!selectedStaff) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const roleIds = Array.from(selectedPermissions).map((roleId) => roleId);

      const response = await fetch(`/api/rbac/staff/${selectedStaff.id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_ids: roleIds }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Roles assigned successfully!');
        setRoleModalOpen(false);
        setSelectedStaff(null);
        setSelectedPermissions(new Set());
        fetchData(); // Refresh data
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to assign roles');
      }
    } catch (err) {
      console.error('Error saving roles:', err);
      setError('Failed to save roles');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      setError('Role name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/rbac/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoleName,
          description: newRoleDescription || null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Role created successfully!');
        setNewRoleName('');
        setNewRoleDescription('');
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorMessage = result.details 
          ? `${result.error}: ${result.details}` 
          : (result.error || 'Failed to create role');
        setError(errorMessage);
        console.error('Role creation error:', result);
      }
    } catch (err) {
      console.error('Error creating role:', err);
      setError('Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  const handleEditRolePermissions = (role: Role) => {
    setSelectedRole(role);
    const rolePermissionIds = new Set(
      role.permissions?.map((p) => p.id) || []
    );
    setSelectedPermissions(rolePermissionIds);
    setPermissionModalOpen(true);
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const permissionIds = Array.from(selectedPermissions);

      const response = await fetch(`/api/rbac/roles/${selectedRole.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission_ids: permissionIds }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Permissions assigned successfully!');
        setPermissionModalOpen(false);
        setSelectedRole(null);
        setSelectedPermissions(new Set());
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Failed to assign permissions');
      }
    } catch (err) {
      console.error('Error saving permissions:', err);
      setError('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role? This will remove it from all staff members.')) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/rbac/roles/${roleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Role deleted successfully!');
        fetchData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to delete role');
      }
    } catch (err) {
      console.error('Error deleting role:', err);
      setError('Failed to delete role');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="text-indigo-600" size={32} />
            Role & Permission Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage staff roles and permissions for {schoolCode}
          </p>
        </div>
        <Button onClick={() => setPermissionModalOpen(true)}>
          <Plus size={18} className="mr-2" />
          Create Role
        </Button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <CheckCircle size={20} />
          {success}
        </motion.div>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2"
        >
          <AlertCircle size={20} />
          {error}
        </motion.div>
      )}

      {/* Staff List - Full Width */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={28} />
            All Staff Members ({staff.length})
          </h2>
          <Button onClick={() => setPermissionModalOpen(true)}>
            <Plus size={18} className="mr-2" />
            Create Role
          </Button>
        </div>
        {staff.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600 text-lg font-semibold mb-2">No staff members found</p>
            <p className="text-gray-500 text-sm mb-4">
              Staff members from school {schoolCode} will appear here once they are added to the system.
            </p>
            <p className="text-gray-400 text-xs">
              You can add staff members through the Staff Management section.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map((member) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 border-2 border-gray-200 rounded-xl hover:border-indigo-400 hover:shadow-lg transition-all bg-white"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">{member.full_name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{member.email || 'No email'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {member.designation || 'No designation'} • ID: {member.staff_id}
                  </p>
                </div>
              </div>
              {member.roles.length > 0 ? (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Assigned Roles:</p>
                  <div className="flex flex-wrap gap-2">
                    {member.roles.map((role) => (
                      <span
                        key={role.id}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium"
                      >
                        {role.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-xs text-gray-400 italic">No roles assigned</p>
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleManageRoles(member)}
                className="w-full"
              >
                <Edit size={14} className="mr-2" />
                Assign Roles
              </Button>
            </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Roles List */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Shield size={28} />
          Available Roles ({roles.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 border-2 border-gray-200 rounded-xl hover:border-indigo-400 hover:shadow-lg transition-all bg-white"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">{role.name}</h3>
                  {role.description && (
                    <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                  )}
                </div>
              </div>
              {role.permissions && role.permissions.length > 0 ? (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Permissions:</p>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((perm) => (
                      <span
                        key={perm.id}
                        className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                      >
                        {perm.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-xs text-gray-400 italic">No permissions assigned</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditRolePermissions(role)}
                  className="flex-1"
                >
                  <Edit size={14} className="mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteRole(role.id)}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Role Assignment Modal */}
      {roleModalOpen && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Assign Roles to {selectedStaff.full_name}
                </h2>
                <button
                  onClick={() => {
                    setRoleModalOpen(false);
                    setSelectedStaff(null);
                    setSelectedPermissions(new Set());
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              {roles.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No roles available. Create a role first.</p>
                </div>
              ) : (
                roles.map((role) => {
                  const isSelected = selectedPermissions.has(role.id);
                  const currentlyHasRole = selectedStaff.roles.some((r) => r.id === role.id);
                  
                  // Group permissions by view/edit
                  const viewPermissions = role.permissions?.filter(p => p.key.startsWith('view_')) || [];
                  const managePermissions = role.permissions?.filter(p => p.key.startsWith('manage_')) || [];
                  
                  return (
                    <label
                      key={role.id}
                      className={`flex items-start gap-3 p-5 border-2 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 shadow-md'
                          : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const newSet = new Set(selectedPermissions);
                          if (e.target.checked) {
                            newSet.add(role.id);
                          } else {
                            newSet.delete(role.id);
                          }
                          setSelectedPermissions(newSet);
                        }}
                        className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-lg text-gray-900">{role.name}</span>
                          {currentlyHasRole && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                              Currently Assigned
                            </span>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                        )}
                        {role.permissions && role.permissions.length > 0 && (
                          <div className="space-y-2">
                            {viewPermissions.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">View Access:</p>
                                <div className="flex flex-wrap gap-1">
                                  {viewPermissions.map((perm) => (
                                    <span
                                      key={perm.id}
                                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
                                    >
                                      {perm.name.replace('View ', '')}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {managePermissions.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">Edit/Manage Access:</p>
                                <div className="flex flex-wrap gap-1">
                                  {managePermissions.map((perm) => (
                                    <span
                                      key={perm.id}
                                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full"
                                    >
                                      {perm.name.replace('Manage ', '')}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setRoleModalOpen(false);
                  setSelectedStaff(null);
                  setSelectedPermissions(new Set());
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveStaffRoles} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Role Modal */}
      {permissionModalOpen && !selectedRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Create New Role</h2>
                <button
                  onClick={() => {
                    setPermissionModalOpen(false);
                    setNewRoleName('');
                    setNewRoleDescription('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Name *
                </label>
                <Input
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., Fee Manager"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Describe what this role does..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setPermissionModalOpen(false);
                  setNewRoleName('');
                  setNewRoleDescription('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateRole} disabled={saving || !newRoleName.trim()}>
                {saving ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={18} className="mr-2" />
                    Create Role
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Role Permissions Modal */}
      {permissionModalOpen && selectedRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Assign Permissions to {selectedRole.name}
                </h2>
                <button
                  onClick={() => {
                    setPermissionModalOpen(false);
                    setSelectedRole(null);
                    setSelectedPermissions(new Set());
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Group permissions by module */}
              {Object.entries(
                permissions.reduce((acc, perm) => {
                  const moduleName = perm.module || 'Other';
                  if (!acc[moduleName]) acc[moduleName] = [];
                  acc[moduleName].push(perm);
                  return acc;
                }, {} as Record<string, Permission[]>)
              ).map(([moduleName, modulePermissions]) => (
                <div key={moduleName} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">{moduleName}</h3>
                  <div className="space-y-2">
                    {modulePermissions.map((perm) => {
                      const isSelected = selectedPermissions.has(perm.id);
                      return (
                        <label
                          key={perm.id}
                          className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSet = new Set(selectedPermissions);
                              if (e.target.checked) {
                                newSet.add(perm.id);
                              } else {
                                newSet.delete(perm.id);
                              }
                              setSelectedPermissions(newSet);
                            }}
                            className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">{perm.name}</span>
                            {perm.description && (
                              <p className="text-sm text-gray-600 mt-1">{perm.description}</p>
                            )}
                            <span className="text-xs text-gray-500 mt-1 block">
                              Key: {perm.key}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setPermissionModalOpen(false);
                  setSelectedRole(null);
                  setSelectedPermissions(new Set());
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveRolePermissions} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" />
                    Save Permissions
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

