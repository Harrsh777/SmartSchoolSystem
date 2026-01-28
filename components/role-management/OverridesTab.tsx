'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  Lock,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  Edit as EditIcon,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Shield,
  X,
} from 'lucide-react';

interface Staff {
  id: string;
  staff_id: string;
  full_name: string;
  email: string | null;
  designation: string | null;
}

interface Module {
  id: string;
  module_name: string;
  module_key: string;
  sub_modules: Array<{
    id: string;
    sub_module_name: string;
    sub_module_key: string;
    permission_categories: Array<{
      id: string;
      category_name: string;
      category_key: string;
      category_type: string;
    }>;
  }>;
}

interface PermissionOverride {
  [subModuleId: string]: {
    [categoryId: string]: {
      view_access: boolean;
      edit_access: boolean;
      from_role?: boolean;
    };
  };
}

interface MergedPermission {
  sub_module_id: string;
  category_id: string;
  view_access: boolean;
  edit_access: boolean;
  source: 'role' | 'staff' | 'none';
}

export default function OverridesTab({ schoolCode }: { schoolCode: string }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [currentPermissions, setCurrentPermissions] = useState<MergedPermission[]>([]);
  const [overrides, setOverrides] = useState<PermissionOverride>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStaff();
    fetchModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (selectedStaff) {
      fetchStaffPermissions(selectedStaff.id);
    } else {
      setCurrentPermissions([]);
      setOverrides({});
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
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const response = await fetch('/api/modules');
      if (response.ok) {
        const result = await response.json();
        setModules(result.data || []);
        const moduleIds = new Set<string>((result.data || []).map((m: Module) => m.id as string));
        setExpandedModules(moduleIds);
      }
    } catch (err) {
      console.error('Error fetching modules:', err);
    }
  };

  const fetchStaffPermissions = async (staffId: string) => {
    try {
      const response = await fetch(`/api/staff/${staffId}/permissions`);
      if (response.ok) {
        const result = await response.json();
        const perms: MergedPermission[] = result.data || [];
        setCurrentPermissions(perms);

        // Initialize overrides from existing staff_permissions
        const overridesMap: PermissionOverride = {};
        perms.forEach((perm) => {
          if (perm.source === 'staff') {
            if (!overridesMap[perm.sub_module_id]) {
              overridesMap[perm.sub_module_id] = {};
            }
            overridesMap[perm.sub_module_id][perm.category_id] = {
              view_access: perm.view_access,
              edit_access: perm.edit_access,
              from_role: false,
            };
          }
        });
        setOverrides(overridesMap);
      }
    } catch (err) {
      console.error('Error fetching staff permissions:', err);
    }
  };

  const toggleOverride = (
    subModuleId: string,
    categoryId: string,
    accessType: 'view' | 'edit'
  ) => {
    setOverrides((prev) => {
      const newOverrides = { ...prev };
      if (!newOverrides[subModuleId]) {
        newOverrides[subModuleId] = {};
      }
      if (!newOverrides[subModuleId][categoryId]) {
        // Get current permission from role
        const currentPerm = currentPermissions.find(
          (p) => p.sub_module_id === subModuleId && p.category_id === categoryId
        );
        newOverrides[subModuleId][categoryId] = {
          view_access: currentPerm?.view_access || false,
          edit_access: currentPerm?.edit_access || false,
          from_role: currentPerm?.source === 'role',
        };
      }
      newOverrides[subModuleId][categoryId][`${accessType}_access`] =
        !newOverrides[subModuleId][categoryId][`${accessType}_access`];
      
      // If view is disabled, disable edit too
      if (accessType === 'view' && !newOverrides[subModuleId][categoryId].view_access) {
        newOverrides[subModuleId][categoryId].edit_access = false;
      }
      
      return newOverrides;
    });
  };

  const removeOverride = (subModuleId: string, categoryId: string) => {
    setOverrides((prev) => {
      const newOverrides = { ...prev };
      if (newOverrides[subModuleId] && newOverrides[subModuleId][categoryId]) {
        delete newOverrides[subModuleId][categoryId];
        if (Object.keys(newOverrides[subModuleId]).length === 0) {
          delete newOverrides[subModuleId];
        }
      }
      return newOverrides;
    });
  };

  const handleSave = async () => {
    if (!selectedStaff) return;

    setSaving(true);
    setError('');
    try {
      const staffData = JSON.parse(sessionStorage.getItem('staff') || '{}');
      
      // Prepare permissions array
      const permissionsArray: Array<{
        sub_module_id: string;
        category_id: string;
        view_access: boolean;
        edit_access: boolean;
      }> = [];

      Object.keys(overrides).forEach((subModuleId) => {
        Object.keys(overrides[subModuleId]).forEach((categoryId) => {
          const perm = overrides[subModuleId][categoryId];
          permissionsArray.push({
            sub_module_id: subModuleId,
            category_id: categoryId,
            view_access: perm.view_access,
            edit_access: perm.edit_access,
          });
        });
      });

      const response = await fetch(`/api/staff/${selectedStaff.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: permissionsArray,
          assigned_by: staffData.id || null,
        }),
      });

      if (response.ok) {
        setSuccess('Permission overrides saved successfully');
        fetchStaffPermissions(selectedStaff.id);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to save overrides');
      }
    } catch {
      setError('An error occurred while saving overrides');
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const filteredStaff = staff.filter((s) =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.staff_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPermissionState = (subModuleId: string, categoryId: string) => {
    // Check if there's an override
    if (overrides[subModuleId]?.[categoryId]) {
      return {
        ...overrides[subModuleId][categoryId],
        isOverride: true,
      };
    }
    
    // Get from current permissions (role-based)
    const currentPerm = currentPermissions.find(
      (p) => p.sub_module_id === subModuleId && p.category_id === categoryId
    );
    
    return {
      view_access: currentPerm?.view_access || false,
      edit_access: currentPerm?.edit_access || false,
      from_role: currentPerm?.source === 'role',
      isOverride: false,
    };
  };

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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Staff Selection */}
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-[#2F6FED]" />
            Select Staff
          </h3>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] dark:bg-gray-700 dark:text-white"
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

        {/* Permissions Override */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#2F6FED]" />
              Permission Overrides
            </h3>
            {selectedStaff && (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Overrides
                  </>
                )}
              </Button>
            )}
          </div>

          {selectedStaff ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedStaff.full_name}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedStaff.staff_id} {selectedStaff.designation && `• ${selectedStaff.designation}`}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Overrides take precedence over role permissions
                </p>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {modules.map((module) => (
                  <div key={module.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {module.module_name}
                      </span>
                      {expandedModules.has(module.id) ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                    </button>

                    <AnimatePresence>
                      {expandedModules.has(module.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3">
                            {module.sub_modules.map((subModule) => (
                              <div
                                key={subModule.id}
                                className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3"
                              >
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {subModule.sub_module_name}
                                </div>
                                <div className="space-y-2">
                                  {subModule.permission_categories.map((category) => {
                                    const permState = getPermissionState(subModule.id, category.id);
                                    const hasOverride = overrides[subModule.id]?.[category.id];
                                    
                                    return (
                                      <div
                                        key={category.id}
                                        className={`flex items-center justify-between p-3 rounded ${
                                          hasOverride
                                            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700'
                                            : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                                        }`}
                                      >
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                              {category.category_name}
                                            </span>
                                            {hasOverride && (
                                              <span className="text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                                                Override
                                              </span>
                                            )}
                                            {permState.from_role && !hasOverride && (
                                              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded flex items-center gap-1">
                                                <Shield className="h-3 w-3" />
                                                From Role
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {category.category_type}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={permState.view_access}
                                              onChange={() =>
                                                toggleOverride(subModule.id, category.id, 'view')
                                              }
                                              className="w-5 h-5 text-[#2F6FED] rounded focus:ring-[#2F6FED]"
                                            />
                                            <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                              View
                                            </span>
                                          </label>
                                          <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={permState.edit_access}
                                              onChange={() =>
                                                toggleOverride(subModule.id, category.id, 'edit')
                                              }
                                              disabled={!permState.view_access}
                                              className="w-5 h-5 text-[#2F6FED] rounded focus:ring-[#2F6FED] disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                            <EditIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                              Edit
                                            </span>
                                          </label>
                                          {hasOverride && (
                                            <button
                                              onClick={() => removeOverride(subModule.id, category.id)}
                                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                              title="Remove override"
                                            >
                                              <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a staff member to set permission overrides</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
