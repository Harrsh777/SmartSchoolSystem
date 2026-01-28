'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  Settings,
  ChevronDown,
  ChevronRight,
  Eye,
  Edit as EditIcon,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Search,
} from 'lucide-react';

interface Role {
  id: string;
  role_name: string;
  role_description: string | null;
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

export default function PermissionsTab({
  roles,
}: {
  schoolCode: string;
  roles: Role[];
}) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<PermissionState>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole.id);
    } else {
      setPermissions({});
    }
  }, [selectedRole]);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/modules');
      if (response.ok) {
        const result = await response.json();
        const rawModules = result.data || [];
        
        // First, deduplicate modules by module_key (client-side safety check)
        const moduleMap = new Map<string, Module>();
        rawModules
          .filter((module: Module) => module.is_active !== false && module.module_name) // Only active modules with names
          .forEach((module: Module) => {
            const key = module.module_key || module.id;
            if (!moduleMap.has(key)) {
              moduleMap.set(key, module);
            } else {
              // If duplicate, merge sub-modules
              const existing = moduleMap.get(key)!;
              if (module.sub_modules && module.sub_modules.length > 0) {
                existing.sub_modules = (existing.sub_modules || []).concat(module.sub_modules);
              }
            }
          });
        
        // Then process each unique module
        const processedModules = Array.from(moduleMap.values())
          .map((module: Module) => {
            const subModuleMap = new Map<string, Record<string, unknown>>();
            
            (module.sub_modules || [])
              .filter((sm: Record<string, unknown>) => sm.is_active !== false && sm.sub_module_name) // Only active sub-modules with names
              .forEach((subModule: Record<string, unknown>) => {
                // Use sub_module_key as the unique identifier, fallback to id
                const key = (subModule.sub_module_key || subModule.id) as string;
                
                // Skip if we already have this key (deduplicate)
                if (subModuleMap.has(key)) {
                  return;
                }
                
                // Deduplicate categories within each sub-module
                const categoryMap = new Map<string, Record<string, unknown>>();
                ((subModule.permission_categories as Record<string, unknown>[]) || [])
                  .filter((cat: Record<string, unknown>) => cat.is_active !== false) // Only active categories
                  .forEach((category: Record<string, unknown>) => {
                    const catKey = String(category.category_key ?? category.id ?? '');
                    if (catKey && !categoryMap.has(catKey)) {
                      categoryMap.set(catKey, category);
                    }
                  });
                
                // Only add if it has at least view and edit categories
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

            // Corrected: safely sort by display_order (could be missing, type flexible)
            const uniqueSubModules = Array.from(subModuleMap.values())
              .sort((a, b) =>
                (Number(a.display_order) || 0) - (Number(b.display_order) || 0)
              );

            // Only return module if it has sub-modules
            if (uniqueSubModules.length === 0) {
              return null;
            }
            
            return {
              ...module,
              sub_modules: uniqueSubModules,
            };
          })
          // Filter non-null modules (rewrite for correct typing)
          .filter((module): module is Module => module !== null);

        setModules(processedModules);
        // Expand all modules by default
        const moduleIds = new Set(processedModules.map((m) => m.id));
        setExpandedModules(moduleIds);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRolePermissions = async (roleId: string) => {
    try {
      const response = await fetch(`/api/roles/${roleId}/permissions`);
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
      console.error('Error fetching role permissions:', error);
    }
  };

  // togglePermission removed - not used
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const togglePermission = (
    subModuleId: string,
    categoryId: string,
    accessType: 'view' | 'edit'
  ) => {
    setPermissions((prev) => {
      const newPerms = { ...prev };
      if (!newPerms[subModuleId]) {
        newPerms[subModuleId] = {};
      }
      if (!newPerms[subModuleId][categoryId]) {
        newPerms[subModuleId][categoryId] = { view_access: false, edit_access: false };
      }
      newPerms[subModuleId][categoryId][`${accessType}_access`] =
        !newPerms[subModuleId][categoryId][`${accessType}_access`];
      
      // If view is disabled, disable edit too
      if (accessType === 'view' && !newPerms[subModuleId][categoryId].view_access) {
        newPerms[subModuleId][categoryId].edit_access = false;
      }
      
      return newPerms;
    });
  };

  const handleSave = async () => {
    if (!selectedRole) return;

    setSaving(true);
    setError('');
    try {
      // Prepare permissions array - save for both view and edit categories
      const permissionsArray: Array<{
        sub_module_id: string;
        category_id: string;
        view_access: boolean;
        edit_access: boolean;
      }> = [];

      // Iterate through all sub-modules
      modules.forEach((module) => {
        module.sub_modules.forEach((subModule) => {
          // Skip if sub-module doesn't have an ID or is inactive
          if (!subModule.id) {
            console.warn('Sub-module missing ID:', subModule);
            return;
          }

          const perms = getSubModulePermissions(subModule.id);
          const viewCategory = subModule.permission_categories?.find(c => c.category_key === 'view');
          const editCategory = subModule.permission_categories?.find(c => c.category_key === 'edit');

          // Save all permissions (both enabled and disabled) so we can properly clear disabled ones
          // The API will delete all existing permissions and insert these, so we need to include all
          if (viewCategory && viewCategory.id) {
            permissionsArray.push({
              sub_module_id: subModule.id,
              category_id: viewCategory.id,
              view_access: perms.view_access || false,
              edit_access: false, // View category only has view_access
            });
          }

          if (editCategory && editCategory.id) {
            permissionsArray.push({
              sub_module_id: subModule.id,
              category_id: editCategory.id,
              view_access: perms.view_access || false, // Edit requires view
              edit_access: perms.edit_access || false,
            });
          }
        });
      });

      // Log for debugging
      console.log(`Saving ${permissionsArray.length} permission records for role ${selectedRole.id}`);

      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch(`/api/roles/${selectedRole.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: permissionsArray }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        setSuccess(result.message || 'Permissions saved successfully');
        fetchRolePermissions(selectedRole.id);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        let result: Record<string, unknown> = {};
        const contentType = response.headers.get('content-type');
        
        try {
          // Check if response has content before trying to parse
          const text = await response.text();
          if (text && contentType?.includes('application/json')) {
            result = JSON.parse(text);
          } else if (text) {
            // If it's not JSON but has text, use that as the error message
            result = { 
              error: 'Failed to save permissions', 
              details: text || `HTTP ${response.status}: ${response.statusText}` 
            };
          } else {
            // Empty response body
            result = { 
              error: 'Failed to save permissions', 
              details: `HTTP ${response.status}: ${response.statusText || 'Unknown error'}` 
            };
          }
        } catch (e) {
          // If parsing fails, create a basic error object
          console.error('Error parsing response:', e);
          result = { 
            error: 'Failed to save permissions', 
            details: `HTTP ${response.status}: ${response.statusText || 'Unknown error'}` 
          };
        }
        
        // Build error message
        let errorMessage = 'Failed to save permissions';
        if (result.details) {
          errorMessage =
            typeof result.details === 'string'
              ? `${result.error || 'Failed to save permissions'}: ${result.details}`
              : typeof result.error === 'string'
                ? result.error
                : typeof result.message === 'string'
                  ? result.message
                  : `Failed to save permissions (HTTP ${response.status})`;
        }
        
        setError(errorMessage);
        console.error('Failed to save permissions:', {
          status: response.status,
          statusText: response.statusText,
          statusCode: response.status,
          url: response.url,
          result: result,
          errorCode: result.code,
          errorDetails: result.details,
          fullError: JSON.stringify(result, null, 2)
        });
      }
    } catch (error) {
      let errorMessage = 'An error occurred while saving permissions';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please check your internet connection and try again.';
        } else if (error.message.includes('fetch failed') || error.message.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      console.error('Error saving permissions:', error);
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

  const filteredModules = modules.filter((module) =>
    module.module_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.sub_modules.some((sm) =>
      sm.sub_module_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Get permission state for a sub-module (combining view and edit categories)
  const getSubModulePermissions = (subModuleId: string) => {
    // Find view and edit categories for this sub-module
    const subModule = modules
      .flatMap(m => m.sub_modules)
      .find(sm => sm.id === subModuleId);
    
    if (!subModule) {
      return { view_access: false, edit_access: false, viewCategoryId: '', editCategoryId: '' };
    }

    const categories = subModule.permission_categories || [];
    const viewCategory = categories.find(c => c.category_key === 'view');
    const editCategory = categories.find(c => c.category_key === 'edit');

    const viewCategoryId = viewCategory?.id || '';
    const editCategoryId = editCategory?.id || '';

    // Get permissions from respective categories
    const viewPerm = viewCategoryId ? permissions[subModuleId]?.[viewCategoryId] : null;
    const editPerm = editCategoryId ? permissions[subModuleId]?.[editCategoryId] : null;

    // View access comes from view category's view_access
    // Edit access comes from edit category's edit_access (and requires view_access)
    const view_access = viewPerm?.view_access || false;
    const edit_access = (editPerm?.edit_access || false) && view_access;

    return {
      view_access,
      edit_access,
      viewCategoryId,
      editCategoryId,
    };
  };

  const toggleSubModulePermission = (
    subModuleId: string,
    accessType: 'view' | 'edit'
  ) => {
    const currentPerms = getSubModulePermissions(subModuleId);
    const viewCategoryId = currentPerms.viewCategoryId;
    const editCategoryId = currentPerms.editCategoryId;

    if (!viewCategoryId || !editCategoryId) return;

    setPermissions((prev) => {
      const newPerms = { ...prev };
      if (!newPerms[subModuleId]) {
        newPerms[subModuleId] = {};
      }

      // Initialize categories if they don't exist
      if (!newPerms[subModuleId][viewCategoryId]) {
        newPerms[subModuleId][viewCategoryId] = { view_access: false, edit_access: false };
      }
      if (!newPerms[subModuleId][editCategoryId]) {
        newPerms[subModuleId][editCategoryId] = { view_access: false, edit_access: false };
      }

      if (accessType === 'view') {
        const newViewAccess = !currentPerms.view_access;
        // Update view category
        newPerms[subModuleId][viewCategoryId].view_access = newViewAccess;
        // Update edit category's view_access (edit requires view)
        newPerms[subModuleId][editCategoryId].view_access = newViewAccess;
        
        // If view is disabled, disable edit too
        if (!newViewAccess) {
          newPerms[subModuleId][editCategoryId].edit_access = false;
        }
      } else {
        // For edit, we need view to be enabled first
        if (currentPerms.view_access) {
          const newEditAccess = !currentPerms.edit_access;
          // Only update edit category's edit_access
          newPerms[subModuleId][editCategoryId].edit_access = newEditAccess;
        }
      }

      return newPerms;
    });
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

      {/* Role Selection */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-[#2F6FED]" />
            Select Role to Configure
          </h3>
          {selectedRole && (
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
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role)}
              className={`p-3 rounded-lg text-left transition-all ${
                selectedRole?.id === role.id
                  ? 'bg-[#2F6FED] text-white shadow-lg'
                  : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <div className="font-medium">{role.role_name}</div>
              {role.role_description && (
                <div className="text-xs opacity-75 mt-1">{role.role_description}</div>
              )}
            </button>
          ))}
        </div>
      </Card>

      {selectedRole && (
        <Card>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search modules or sub-modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2F6FED] dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#2F6FED]" />
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredModules.map((module) => (
                <div key={module.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-gray-50 dark:bg-gray-800/50"
                  >
                    <span className="font-semibold text-gray-900 dark:text-white text-lg">
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
                        <div className="p-4 space-y-3 bg-white dark:bg-gray-900">
                          {module.sub_modules.map((subModule) => {
                            const perms = getSubModulePermissions(subModule.id);
                            return (
                              <div
                                key={subModule.id}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-[#2F6FED] transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                      {subModule.sub_module_name}
                                    </h4>
                                    {subModule.route_path && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {subModule.route_path}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-6 ml-4">
                                    {/* View Permission */}
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                      <div className="relative">
                                        <input
                                          type="checkbox"
                                          checked={perms.view_access}
                                          onChange={() => toggleSubModulePermission(subModule.id, 'view')}
                                          className="w-5 h-5 text-[#2F6FED] rounded focus:ring-2 focus:ring-[#2F6FED] cursor-pointer"
                                        />
                                        {perms.view_access && (
                                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <Eye className="h-3 w-3 text-white" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-[#2F6FED] transition-colors">
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
                                          className="w-5 h-5 text-[#2F6FED] rounded focus:ring-2 focus:ring-[#2F6FED] disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        {perms.edit_access && (
                                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <EditIcon className="h-3 w-3 text-white" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className={`text-sm font-medium ${perms.view_access ? 'text-gray-700 dark:text-gray-300 group-hover:text-[#2F6FED]' : 'text-gray-400 dark:text-gray-500'} transition-colors`}>
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
        </Card>
      )}

      {!selectedRole && (
        <Card className="text-center py-12">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Select a role to configure its permissions
          </p>
        </Card>
      )}
    </div>
  );
}
