'use client';

import React, { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  ArrowLeft,
  Save,
  Loader2,
  Folder,
} from 'lucide-react';

interface SubModule {
  id: string;
  name: string;
  view_access: boolean;
  edit_access: boolean;
  supports_view_access: boolean;
  supports_edit_access: boolean;
}

interface Module {
  id: string;
  name: string;
  sub_modules: SubModule[];
}

interface Staff {
  id: string;
  staff_id: string;
  full_name: string;
  email: string | null;
  designation: string | null;
  photo_url: string | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

export default function StaffPermissionsDetailPage({
  params,
}: {
  params: Promise<{ school: string; staffId: string }>;
}) {
  const { school: schoolCode, staffId } = use(params);
  const router = useRouter();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStaffPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, selectedCategory?.id]);

  const fetchStaffPermissions = async () => {
    try {
      setLoading(true);
      setError('');
      const categoryId = selectedCategory?.id || undefined;
      const url = `/api/rbac/staff-permissions/${staffId}${categoryId ? `?category_id=${categoryId}` : ''}`;
      const response = await fetch(url);
      const result = await response.json();

      if (response.ok && result.data) {
        setStaff(result.data.staff);
        setModules(result.data.modules);
        setCategories(result.data.categories || []);
        if (!selectedCategory && result.data.category) {
          setSelectedCategory(result.data.category);
        }
      } else {
        setError(result.error || 'Failed to load permissions');
      }
    } catch (error) {
      console.error('Error fetching staff permissions:', error);
      setError('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleViewAccess = (moduleId: string, subModuleId: string) => {
    setModules((prevModules) =>
      prevModules.map((module) => {
        if (module.id === moduleId) {
          return {
            ...module,
            sub_modules: module.sub_modules.map((subModule) => {
              if (subModule.id === subModuleId) {
                return {
                  ...subModule,
                  view_access: !subModule.view_access,
                };
              }
              return subModule;
            }),
          };
        }
        return module;
      })
    );
  };

  const handleToggleEditAccess = (moduleId: string, subModuleId: string) => {
    setModules((prevModules) =>
      prevModules.map((module) => {
        if (module.id === moduleId) {
          return {
            ...module,
            sub_modules: module.sub_modules.map((subModule) => {
              if (subModule.id === subModuleId) {
                return {
                  ...subModule,
                  edit_access: !subModule.edit_access,
                };
              }
              return subModule;
            }),
          };
        }
        return module;
      })
    );
  };

  const handleToggleModuleViewAccess = (moduleId: string) => {
    setModules((prevModules) =>
      prevModules.map((module) => {
        if (module.id === moduleId) {
          const allEnabled = module.sub_modules.every(
            (sm) => sm.supports_view_access && sm.view_access
          );
          const newValue = !allEnabled;
          return {
            ...module,
            sub_modules: module.sub_modules.map((subModule) => {
              if (subModule.supports_view_access) {
                return {
                  ...subModule,
                  view_access: newValue,
                };
              }
              return subModule;
            }),
          };
        }
        return module;
      })
    );
  };

  const handleToggleModuleEditAccess = (moduleId: string) => {
    setModules((prevModules) =>
      prevModules.map((module) => {
        if (module.id === moduleId) {
          const allEnabled = module.sub_modules.every(
            (sm) => sm.supports_edit_access && sm.edit_access
          );
          const newValue = !allEnabled;
          return {
            ...module,
            sub_modules: module.sub_modules.map((subModule) => {
              if (subModule.supports_edit_access) {
                return {
                  ...subModule,
                  edit_access: newValue,
                };
              }
              return subModule;
            }),
          };
        }
        return module;
      })
    );
  };

  const handleSave = async () => {
    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Get current user (you may need to adjust this based on your auth system)
      const currentUser = sessionStorage.getItem('staff');
      let assignedBy = null;
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser);
          assignedBy = userData.id;
        } catch {
          // Ignore parse errors
        }
      }

      const permissions = modules.flatMap((module) =>
        module.sub_modules.map((subModule) => ({
          sub_module_id: subModule.id,
          view_access: subModule.view_access,
          edit_access: subModule.edit_access,
        }))
      );

      const response = await fetch(`/api/rbac/staff-permissions/${staffId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category_id: selectedCategory.id,
          permissions: permissions,
          assigned_by: assignedBy,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess('Permissions saved successfully!');
        setTimeout(() => {
          router.push(`/dashboard/${schoolCode}/staff-access-control`);
        }, 1500);
      } else {
        setError(result.error || 'Failed to save permissions');
      }
    } catch (error) {
      console.error('Error saving permissions:', error);
      setError('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    if (category) {
      setSelectedCategory(category);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6">
          <p className="text-gray-600">Staff not found</p>
          <Button
            onClick={() => router.push(`/dashboard/${schoolCode}/staff-access-control`)}
            className="mt-4"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Staff List
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/${schoolCode}/staff-access-control`)}
            className="mr-2"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-teal-700">{staff.full_name}</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Category Selector */}
          <div className="flex items-center gap-2">
            <Folder size={16} className="text-gray-400" />
            <select
              value={selectedCategory?.id || ''}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg"
        >
          {success}
        </motion.div>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg"
        >
          {error}
        </motion.div>
      )}

      {/* Permissions Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-orange-100 border-b border-orange-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  MODULE
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                  SUB MODULE
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                  <div className="flex items-center justify-center gap-2">
                    <span>VIEW ACCESS</span>
                    <button
                      onClick={() => {
                        modules.forEach((m) => handleToggleModuleViewAccess(m.id));
                      }}
                      className="text-gray-500 hover:text-gray-700 text-xs"
                      title="Toggle all"
                    >
                      (All)
                    </button>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                  <div className="flex items-center justify-center gap-2">
                    <span>EDIT ACCESS</span>
                    <button
                      onClick={() => {
                        modules.forEach((m) => handleToggleModuleEditAccess(m.id));
                      }}
                      className="text-gray-500 hover:text-gray-700 text-xs"
                      title="Toggle all"
                    >
                      (All)
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modules.map((module) => (
                <React.Fragment key={module.id}>
                  {/* Module Row */}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {modules.indexOf(module) + 1}. {module.name}
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-center">
                      {module.sub_modules.some((sm) => sm.supports_view_access) && (
                        <button
                          onClick={() => handleToggleModuleViewAccess(module.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            module.sub_modules
                              .filter((sm) => sm.supports_view_access)
                              .every((sm) => sm.view_access)
                              ? 'bg-orange-500'
                              : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              module.sub_modules
                                .filter((sm) => sm.supports_view_access)
                                .every((sm) => sm.view_access)
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {module.sub_modules.some((sm) => sm.supports_edit_access) && (
                        <button
                          onClick={() => handleToggleModuleEditAccess(module.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            module.sub_modules
                              .filter((sm) => sm.supports_edit_access)
                              .every((sm) => sm.edit_access)
                              ? 'bg-orange-500'
                              : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              module.sub_modules
                                .filter((sm) => sm.supports_edit_access)
                                .every((sm) => sm.edit_access)
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* Sub-module Rows */}
                  {module.sub_modules.map((subModule, subIdx) => (
                    <tr key={subModule.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-gray-700">
                        {modules.indexOf(module) + 1}.{subIdx + 1} {subModule.name}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {subModule.supports_view_access ? (
                          <button
                            onClick={() => handleToggleViewAccess(module.id, subModule.id)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              subModule.view_access ? 'bg-orange-500' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                subModule.view_access ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {subModule.supports_edit_access ? (
                          <button
                            onClick={() => handleToggleEditAccess(module.id, subModule.id)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              subModule.edit_access ? 'bg-orange-500' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                subModule.edit_access ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
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
    </div>
  );
}

