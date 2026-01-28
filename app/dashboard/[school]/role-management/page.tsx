'use client';

import { use, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Shield,
  Settings,
  UserCheck,
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Save,
  CheckCircle,
  AlertCircle,
  Search,
  Loader2,
  ChevronRight,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import AssignRolesTab from '@/components/role-management/AssignRolesTab';
import PermissionsTab from '@/components/role-management/PermissionsTab';
import OverridesTab from '@/components/role-management/OverridesTab';

interface Role {
  id: string;
  role_name: string;
  role_description: string | null;
  is_system_role: boolean;
  is_active: boolean;
  school_code: string;
  created_at: string;
}

export default function RoleManagementPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [activeTab, setActiveTab] = useState<'roles' | 'assign' | 'permissions' | 'overrides'>('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/roles?school_code=${schoolCode}`);
      if (response.ok) {
        const result = await response.json();
        setRoles(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = roles.filter(role =>
    role.role_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (role.role_description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/${schoolCode}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Shield className="h-8 w-8 text-[#2F6FED]" />
                Admin Role Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage roles, permissions, and staff access control
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Card className="p-0 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {[
              { id: 'roles', label: 'Roles', icon: Shield },
              { id: 'assign', label: 'Assign Roles', icon: UserCheck },
              { id: 'permissions', label: 'Permissions', icon: Settings },
              { id: 'overrides', label: 'Overrides', icon: Lock },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex-1 px-6 py-4 font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'text-[#2F6FED] border-b-2 border-[#2F6FED] bg-blue-50 dark:bg-blue-900/20'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeTab === 'roles' && (
                <RolesTab
                  key="roles"
                  schoolCode={schoolCode}
                  roles={filteredRoles}
                  loading={loading}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onRefresh={fetchRoles}
                />
              )}
              {activeTab === 'assign' && (
                <AssignRolesTab key="assign" schoolCode={schoolCode} roles={roles} />
              )}
              {activeTab === 'permissions' && (
                <PermissionsTab key="permissions" schoolCode={schoolCode} roles={roles} />
              )}
              {activeTab === 'overrides' && (
                <OverridesTab key="overrides" schoolCode={schoolCode} />
              )}
            </AnimatePresence>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Roles Tab Component
function RolesTab({
  schoolCode,
  roles: filteredRoles, // parent passes pre-filtered list
  loading,
  searchQuery,
  setSearchQuery,
  onRefresh,
}: {
  schoolCode: string;
  roles: Role[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onRefresh: () => void;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ role_name: '', role_description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleCreate = async () => {
    if (!formData.role_name.trim()) {
      setError('Role name is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_code: schoolCode,
          role_name: formData.role_name,
          role_description: formData.role_description || null,
        }),
      });

      if (response.ok) {
        setSuccess('Role created successfully');
        setShowCreateModal(false);
        setFormData({ role_name: '', role_description: '' });
        onRefresh();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to create role');
      }
    } catch {
      setError('An error occurred while creating the role');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingRole || !formData.role_name.trim()) {
      setError('Role name is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_name: formData.role_name,
          role_description: formData.role_description || null,
        }),
      });

      if (response.ok) {
        setSuccess('Role updated successfully');
        setEditingRole(null);
        setFormData({ role_name: '', role_description: '' });
        onRefresh();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to update role');
      }
    } catch {
      setError('An error occurred while updating the role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (!confirm(`Are you sure you want to delete "${role.role_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/roles/${role.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Role deleted successfully');
        onRefresh();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to delete role');
      }
    } catch {
      alert('An error occurred while deleting the role');
    }
  };

  return (
    <div className="space-y-4">
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

      {/* Search and Create */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-5 w-5 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Roles List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#2F6FED]" />
        </div>
      ) : filteredRoles.length === 0 ? (
        <Card className="text-center py-12">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No roles found</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRoles.map((role) => (
            <Card key={role.id} hover className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[#2F6FED]" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {role.role_name}
                  </h3>
                  {role.is_system_role && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                      System
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingRole(role);
                      setFormData({
                        role_name: role.role_name,
                        role_description: role.role_description || '',
                      });
                      setShowCreateModal(true);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    disabled={role.is_system_role}
                  >
                    <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(role)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    disabled={role.is_system_role}
                  >
                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </button>
                </div>
              </div>
              {role.role_description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {role.role_description}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                <span>Status: {role.is_active ? 'Active' : 'Inactive'}</span>
                <Link href={`/dashboard/${schoolCode}/role-management/permissions/${role.id}`}>
                  <Button variant="ghost" size="sm" className="text-xs">
                    Manage Permissions
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {(showCreateModal || editingRole) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowCreateModal(false);
              setEditingRole(null);
              setFormData({ role_name: '', role_description: '' });
              setError('');
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl"
            >
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                {editingRole ? 'Edit Role' : 'Create New Role'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role Name *
                  </label>
                  <Input
                    type="text"
                    value={formData.role_name}
                    onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                    placeholder="e.g., Class Teacher, Accountant"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.role_description}
                    onChange={(e) => setFormData({ ...formData, role_description: e.target.value })}
                    placeholder="Optional description..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] dark:bg-gray-700 dark:text-white"
                    rows={3}
                  />
                </div>
                {error && (
                  <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
                )}
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingRole(null);
                      setFormData({ role_name: '', role_description: '' });
                      setError('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={editingRole ? handleEdit : handleCreate} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editingRole ? 'Update' : 'Create'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// AssignRolesTab is now imported from components

// PermissionsTab is now imported from components

// OverridesTab is now imported from components
