'use client';

import { use, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Shield,
  ArrowLeft,
  Save,
  CheckCircle,
  AlertCircle,
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  Eye,
  Edit as EditIcon,
  Users,
  X,
  User,
} from 'lucide-react';
import Link from 'next/link';

interface Staff {
  id: string;
  staff_id: string;
  full_name: string;
  email: string | null;
  designation: string | null;
  role_name?: string;
}

interface Module {
  id: string;
  module_name: string;
  module_key: string;
  is_active?: boolean;
  sub_modules: Array<{
    id: string;
    sub_module_name: string;
    sub_module_key: string;
    route_path: string;
    is_active?: boolean;
    permission_categories?: Array<{
      id: string;
      category_name: string;
      category_key: string;
      category_type: string;
      is_active?: boolean;
    }>;
  }>;
}

interface PermissionState {
  [subModuleId: string]: {
    [categoryId: string]: {
      view_access: boolean;
      edit_access: boolean;
    };
  };
}

export default function StaffPermissionsPage({
  params,
}: {
  params: Promise<{ school: string }>;
}) {
  const { school: schoolCode } = use(params);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<PermissionState>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStaff();
    fetchModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolCode]);

  useEffect(() => {
    if (selectedStaff) {
      fetchStaffPermissions(selectedStaff.id);
    } else {
      setPermissions({});
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
        const rawModules = result.data || [];
        
        // Deduplicate modules by module_key
        const moduleMap = new Map<string, Module>();
        rawModules
          .filter((module: Module) => module.is_active !== false && module.module_name)
          .forEach((module: Module) => {
            const key = module.module_key || module.id;
            if (!moduleMap.has(key)) {
              moduleMap.set(key, module);
            } else {
              const existing = moduleMap.get(key)!;
              if (module.sub_modules && module.sub_modules.length > 0) {
                existing.sub_modules = (existing.sub_modules || []).concat(module.sub_modules);
              }
            }
          });
        
        // Process each unique module
        const processedModules = Array.from(moduleMap.values())
          .map((module: Module) => {
            const subModuleMap = new Map<string, Record<string, unknown>>();
            
            (module.sub_modules || [])
              .filter((sm: Record<string, unknown>) => sm.is_active !== false && sm.sub_module_name)
              .forEach((subModule: Record<string, unknown>) => {
                const key = (subModule.sub_module_key || subModule.id) as string;
                if (subModuleMap.has(key)) return;
                
                const categoryMap = new Map<string, Record<string, unknown>>();
                ((subModule.permission_categories as Record<string, unknown>[]) || [])
                  .filter((cat: Record<string, unknown>) => cat.is_active !== false)
                  .forEach((category: Record<string, unknown>) => {
                    const catKey = String(category.category_key ?? category.id ?? '');
                    if (catKey && !categoryMap.has(catKey)) {
                      categoryMap.set(catKey, category);
                    }
                  });
                
                const categories = Array.from(categoryMap.values())
                  .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
                    (Number(a.display_order) || 0) - (Number(b.display_order) || 0)
                  );
                
                if (categories.length > 0) {
                  subModuleMap.set(key, {
                    ...subModule,
                    permission_categories: categories,
                  });
                }
              });

            const uniqueSubModules = Array.from(subModuleMap.values())
              .sort((a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0));

            if (uniqueSubModules.length === 0) return null;
            
            return { ...module, sub_modules: uniqueSubModules };
          })
          .filter((module): module is Module => module !== null);

        setModules(processedModules);
        // Expand all by default
        setExpandedModules(new Set(processedModules.map((m) => m.id)));
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    }
  };

  const fetchStaffPermissions = async (staffId: string) => {
    try {
      setLoadingPermissions(true);
      const response = await fetch(`/api/staff/${staffId}/permissions`);
      if (response.ok) {
        const result = await response.json();
        const perms: PermissionState = {};
        (result.data || []).forEach((perm: {
          sub_module_id: string;
          category_id: string;
          view_access: boolean;
          edit_access: boolean;
        }) => {
          if (!perms[perm.sub_module_id]) {
            perms[perm.sub_module_id] = {};
          }
          perms[perm.sub_module_id][perm.category_id] = {
            view_access: perm.view_access,
            edit_access: perm.edit_access,
          };
        });
        setPermissions(perms);
      }
    } catch (error) {
      console.error('Error fetching staff permissions:', error);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const getSubModulePermissions = (subModuleId: string) => {
    const subModule = modules.flatMap(m => m.sub_modules).find(sm => sm.id === subModuleId);
    if (!subModule) return { view_access: false, edit_access: false, viewCategoryId: '', editCategoryId: '' };

    const categories = subModule.permission_categories || [];
    const viewCategory = categories.find(c => c.category_key === 'view');
    const editCategory = categories.find(c => c.category_key === 'edit');

    const viewCategoryId = viewCategory?.id || '';
    const editCategoryId = editCategory?.id || '';

    const viewPerm = viewCategoryId ? permissions[subModuleId]?.[viewCategoryId] : null;
    const editPerm = editCategoryId ? permissions[subModuleId]?.[editCategoryId] : null;

    return {
      view_access: viewPerm?.view_access || false,
      edit_access: (editPerm?.edit_access || false) && (viewPerm?.view_access || false),
      viewCategoryId,
      editCategoryId,
    };
  };

  const toggleSubModulePermission = (subModuleId: string, accessType: 'view' | 'edit') => {
    const currentPerms = getSubModulePermissions(subModuleId);
    const viewCategoryId = currentPerms.viewCategoryId;
    const editCategoryId = currentPerms.editCategoryId;

    if (!viewCategoryId || !editCategoryId) return;

    setPermissions((prev) => {
      const newPerms = { ...prev };
      if (!newPerms[subModuleId]) newPerms[subModuleId] = {};
      if (!newPerms[subModuleId][viewCategoryId]) {
        newPerms[subModuleId][viewCategoryId] = { view_access: false, edit_access: false };
      }
      if (!newPerms[subModuleId][editCategoryId]) {
        newPerms[subModuleId][editCategoryId] = { view_access: false, edit_access: false };
      }

      if (accessType === 'view') {
        const newViewAccess = !currentPerms.view_access;
        newPerms[subModuleId][viewCategoryId].view_access = newViewAccess;
        newPerms[subModuleId][editCategoryId].view_access = newViewAccess;
        if (!newViewAccess) {
          newPerms[subModuleId][editCategoryId].edit_access = false;
        }
      } else {
        if (currentPerms.view_access) {
          newPerms[subModuleId][editCategoryId].edit_access = !currentPerms.edit_access;
        }
      }

      return newPerms;
    });
  };

  const handleSave = async () => {
    if (!selectedStaff) return;

    setSaving(true);
    setError('');
    try {
      const staffData = JSON.parse(sessionStorage.getItem('staff') || '{}');
      const permissionsArray: Array<{
        sub_module_id: string;
        category_id: string;
        view_access: boolean;
        edit_access: boolean;
      }> = [];

      modules.forEach((module) => {
        module.sub_modules.forEach((subModule) => {
          if (!subModule.id) return;

          const perms = getSubModulePermissions(subModule.id);
          const viewCategory = subModule.permission_categories?.find(c => c.category_key === 'view');
          const editCategory = subModule.permission_categories?.find(c => c.category_key === 'edit');

          if (viewCategory && viewCategory.id) {
            permissionsArray.push({
              sub_module_id: subModule.id,
              category_id: viewCategory.id,
              view_access: perms.view_access || false,
              edit_access: false,
            });
          }

          if (editCategory && editCategory.id) {
            permissionsArray.push({
              sub_module_id: subModule.id,
              category_id: editCategory.id,
              view_access: perms.view_access || false,
              edit_access: perms.edit_access || false,
            });
          }
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
        setSuccess('Permissions saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const result = await response.json();
        setError(result.error || 'Failed to save permissions');
      }
    } catch {
      setError('An error occurred while saving permissions');
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
    s.staff_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.designation || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredModules = modules;

  // Count enabled permissions for a staff member
  const getEnabledPermissionsCount = () => {
    let count = 0;
    Object.values(permissions).forEach((subModulePerms) => {
      Object.values(subModulePerms).forEach((perm) => {
        if (perm.view_access) count++;
      });
    });
    return count;
  };

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
            <Link href={`/dashboard/${schoolCode}/settings`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Shield className="h-8 w-8 text-[#2F6FED]" />
                Staff Permissions
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage individual staff access to modules and features
              </p>
            </div>
          </div>
        </motion.div>

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
          {/* Step 1: Staff List */}
          <Card className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Users className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Staff Members</h2>
                <p className="text-sm text-gray-500">{staff.length} total</p>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, ID, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#2F6FED]" />
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No staff found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredStaff.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStaff(s)}
                    className={`w-full text-left p-4 rounded-xl transition-all border-2 ${
                      selectedStaff?.id === s.id
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-transparent shadow-lg'
                        : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedStaff?.id === s.id
                          ? 'bg-white/20'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <User className={`h-5 w-5 ${
                          selectedStaff?.id === s.id ? 'text-white' : 'text-gray-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{s.full_name}</div>
                        <div className={`text-sm ${
                          selectedStaff?.id === s.id ? 'text-white/80' : 'text-gray-500'
                        }`}>
                          {s.staff_id}
                        </div>
                      </div>
                    </div>
                    {s.designation && (
                      <div className={`mt-2 text-xs inline-block px-2 py-1 rounded-full ${
                        selectedStaff?.id === s.id
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                      }`}>
                        {s.designation}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Step 2: Permissions Panel */}
          <Card className="lg:col-span-2">
            {selectedStaff ? (
              <>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {selectedStaff.full_name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {selectedStaff.staff_id} {selectedStaff.designation && `• ${selectedStaff.designation}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right mr-4">
                      <div className="text-2xl font-bold text-[#2F6FED]">{getEnabledPermissionsCount()}</div>
                      <div className="text-xs text-gray-500">Permissions</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedStaff(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Permissions
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {loadingPermissions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#2F6FED]" />
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {filteredModules.map((module) => (
                      <div key={module.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        <button
                          onClick={() => toggleModule(module.id)}
                          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900"
                        >
                          <span className="font-bold text-gray-900 dark:text-white text-lg">
                            {module.module_name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                              {module.sub_modules.length} sub-modules
                            </span>
                            {expandedModules.has(module.id) ? (
                              <ChevronDown className="h-5 w-5 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                        </button>

                        <AnimatePresence>
                          {expandedModules.has(module.id) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 space-y-2 bg-white dark:bg-gray-900">
                                {module.sub_modules.map((subModule) => {
                                  const perms = getSubModulePermissions(subModule.id);
                                  return (
                                    <div
                                      key={subModule.id}
                                      className={`border rounded-lg p-4 transition-all ${
                                        perms.view_access
                                          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <h4 className="font-medium text-gray-900 dark:text-white">
                                            {subModule.sub_module_name}
                                          </h4>
                                          {subModule.route_path && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                              {subModule.route_path}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-4 ml-4">
                                          {/* View Permission */}
                                          <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className="relative">
                                              <input
                                                type="checkbox"
                                                checked={perms.view_access}
                                                onChange={() => toggleSubModulePermission(subModule.id, 'view')}
                                                className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                                              />
                                            </div>
                                            <div className="flex flex-col">
                                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-green-600 transition-colors flex items-center gap-1">
                                                <Eye className="h-3 w-3" />
                                                View
                                              </span>
                                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                                Can see
                                              </span>
                                            </div>
                                          </label>

                                          {/* Edit Permission */}
                                          <label className={`flex items-center gap-2 group ${perms.view_access ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                                            <div className="relative">
                                              <input
                                                type="checkbox"
                                                checked={perms.edit_access}
                                                onChange={() => toggleSubModulePermission(subModule.id, 'edit')}
                                                disabled={!perms.view_access}
                                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                              />
                                            </div>
                                            <div className="flex flex-col">
                                              <span className={`text-sm font-medium flex items-center gap-1 ${perms.view_access ? 'text-gray-700 dark:text-gray-300 group-hover:text-blue-600' : 'text-gray-400 dark:text-gray-500'} transition-colors`}>
                                                <EditIcon className="h-3 w-3" />
                                                Edit
                                              </span>
                                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                                Can modify
                                              </span>
                                            </div>
                                          </label>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Select a Staff Member
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Click on a staff member from the list to view and manage their permissions.
                  Enabling permissions will make the corresponding modules visible in their dashboard.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
