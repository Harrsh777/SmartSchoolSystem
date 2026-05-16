import { getServiceRoleClient } from '@/lib/supabase-admin';
import type { RbacMenuModule } from '@/lib/rbac/teacher-menu-matching';
import {
  mergeIntrinsicDigitalDiaryModule,
  staffHasIntrinsicDigitalDiaryAccess,
} from '@/lib/rbac/intrinsic-digital-diary';

type PermissionRow = {
  module_name: string;
  module_key: string;
  module_display_order: number;
  sub_module_name: string;
  sub_module_key: string;
  route_path: string;
  sub_module_display_order: number;
  has_view_access: boolean;
  has_edit_access: boolean;
  source: string;
};

const menuCache = new Map<string, { exp: number; data: RbacMenuModule[] }>();
const CACHE_MS = 15_000;

/**
 * Build the same RBAC menu tree as GET /api/staff/[id]/menu (roles + staff_permissions merged).
 */
export async function getStaffMenuModulesForStaffId(staffId: string): Promise<RbacMenuModule[] | null> {
  const supabase = getServiceRoleClient();

  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('id, staff_id, role, designation, school_code')
    .eq('id', staffId)
    .single();

  if (staffError || !staffData) {
    return null;
  }

  const { data: staffRoles, error: rolesError } = await supabase
    .from('staff_roles')
    .select('role_id, roles!inner(role_name)')
    .eq('staff_id', staffId)
    .eq('is_active', true);

  if (rolesError) {
    console.error('getStaffMenuModulesForStaffId: staff_roles', rolesError);
  }

  const roleIds = (staffRoles ?? []).map((sr) => sr.role_id);

  let rolePermissions: Array<Record<string, unknown>> = [];
  if (roleIds.length > 0) {
    const { data: rp, error: rpError } = await supabase
      .from('role_permissions')
      .select(
        `
          view_access,
          edit_access,
          sub_modules!inner(
            id,
            sub_module_name,
            sub_module_key,
            route_path,
            display_order,
            modules!inner(
              id,
              module_name,
              module_key,
              display_order
            )
          ),
          permission_categories!inner(
            category_key,
            category_type
          )
        `
      )
      .in('role_id', roleIds);

    if (rpError) {
      console.error('getStaffMenuModulesForStaffId: role_permissions', rpError);
    } else {
      rolePermissions = rp || [];
    }
  }

  const { data: rawStaffPermissions } = await supabase.from('staff_permissions').select('*').eq('staff_id', staffId);

  const { data: staffPermissions, error: spError } = await supabase
    .from('staff_permissions')
    .select(
      `
        view_access,
        edit_access,
        sub_module_id,
        category_id,
        sub_modules(
          id,
          sub_module_name,
          sub_module_key,
          route_path,
          display_order,
          is_active,
          modules(
            id,
            module_name,
            module_key,
            display_order,
            is_active
          )
        ),
        permission_categories(
          id,
          category_key,
          category_type
        )
      `
    )
    .eq('staff_id', staffId);

  if (spError) {
    console.error('getStaffMenuModulesForStaffId: staff_permissions', spError);
  }

  let enrichedStaffPermissions = staffPermissions || [];
  if (
    rawStaffPermissions &&
    rawStaffPermissions.length > 0 &&
    (!staffPermissions || staffPermissions.length < rawStaffPermissions.length)
  ) {
    const subModuleIds = [...new Set(rawStaffPermissions.map((p: { sub_module_id: string }) => p.sub_module_id))];

    const { data: subModulesData, error: smError } = await supabase
      .from('sub_modules')
      .select(
        `
          id,
          sub_module_name,
          sub_module_key,
          route_path,
          display_order,
          is_active,
          modules(
            id,
            module_name,
            module_key,
            display_order,
            is_active
          )
        `
      )
      .in('id', subModuleIds);

    if (smError) {
      console.error('getStaffMenuModulesForStaffId: sub_modules fallback', smError);
    } else {
      const subModulesMap = new Map<string, Record<string, unknown>>();
      (subModulesData || []).forEach((sm: Record<string, unknown>) => {
        subModulesMap.set(sm.id as string, sm);
      });

      enrichedStaffPermissions = rawStaffPermissions
        .map((p: Record<string, unknown>) => ({
          ...p,
          sub_modules: subModulesMap.get(p.sub_module_id as string) || null,
        }))
        .filter((p) => p.sub_modules !== null) as unknown as NonNullable<typeof staffPermissions>;
    }
  }

  const finalStaffPermissions = enrichedStaffPermissions;
  const permissionsMap = new Map<string, PermissionRow>();

  rolePermissions.forEach((rp: Record<string, unknown>) => {
    const subModule = rp.sub_modules as {
      sub_module_key: string;
      sub_module_name: string;
      route_path: string;
      display_order: number;
      modules: { module_name: string; module_key: string; display_order: number };
    };
    const permissionCategory = rp.permission_categories as { category_key?: string } | null;
    const key = subModule.sub_module_key;
    const categoryKey = permissionCategory?.category_key || '';
    const roleViewAccess = Boolean(rp.view_access) || (categoryKey === 'edit' && Boolean(rp.edit_access));
    const roleEditAccess = Boolean(rp.edit_access) && categoryKey === 'edit';

    const existing = permissionsMap.get(key);
    permissionsMap.set(key, {
      module_name: subModule.modules.module_name,
      module_key: subModule.modules.module_key,
      module_display_order: subModule.modules.display_order,
      sub_module_name: subModule.sub_module_name,
      sub_module_key: subModule.sub_module_key,
      route_path: subModule.route_path,
      sub_module_display_order: subModule.display_order,
      has_view_access: Boolean(existing?.has_view_access) || roleViewAccess,
      has_edit_access: Boolean(existing?.has_edit_access) || roleEditAccess,
      source: 'role',
    });
  });

  (finalStaffPermissions || []).forEach((sp: Record<string, unknown>) => {
    const subModuleRaw = sp.sub_modules;
    const subModule = Array.isArray(subModuleRaw) ? subModuleRaw[0] : subModuleRaw;
    if (!subModule || typeof subModule !== 'object') return;

    const sm = subModule as {
      sub_module_key: string;
      sub_module_name: string;
      route_path: string;
      display_order: number;
      modules:
        | { module_name: string; module_key: string; display_order: number }
        | Array<{ module_name: string; module_key: string; display_order: number }>;
    };

    const permissionCategory = sp.permission_categories as { category_key?: string } | null;
    if (!sm.sub_module_key) return;

    const key = sm.sub_module_key;
    const categoryKey = permissionCategory?.category_key || '';
    const moduleData = Array.isArray(sm.modules) ? sm.modules[0] : sm.modules;
    if (!moduleData) return;

    const staffViewAccess = Boolean(sp.view_access) || (categoryKey === 'edit' && Boolean(sp.edit_access));
    const staffEditAccess = Boolean(sp.edit_access) && categoryKey === 'edit';
    const existing = permissionsMap.get(key);

    permissionsMap.set(key, {
      module_name: moduleData.module_name,
      module_key: moduleData.module_key,
      module_display_order: moduleData.display_order,
      sub_module_name: sm.sub_module_name,
      sub_module_key: sm.sub_module_key,
      route_path: sm.route_path,
      sub_module_display_order: sm.display_order,
      has_view_access: Boolean(existing?.has_view_access) || staffViewAccess,
      has_edit_access: Boolean(existing?.has_edit_access) || staffEditAccess,
      source: 'staff',
    });
  });

  const modulesMap = new Map<
    string,
    {
      module_name: string;
      module_key: string;
      display_order: number;
      sub_modules: Array<{
        name: string;
        key: string;
        route: string;
        has_view_access: boolean;
        has_edit_access: boolean;
      }>;
    }
  >();

  permissionsMap.forEach((perm) => {
    if (!modulesMap.has(perm.module_key)) {
      modulesMap.set(perm.module_key, {
        module_name: perm.module_name,
        module_key: perm.module_key,
        display_order: perm.module_display_order,
        sub_modules: [],
      });
    }

    const modRecord = modulesMap.get(perm.module_key)!;

    if (!perm.has_view_access && !perm.has_edit_access) {
      return;
    }

    modRecord.sub_modules.push({
      name: perm.sub_module_name,
      key: perm.sub_module_key,
      route: perm.route_path,
      has_view_access: perm.has_view_access,
      has_edit_access: perm.has_edit_access,
    });
  });

  const menuItems: RbacMenuModule[] = Array.from(modulesMap.values())
    .map((module) => ({
      module_name: module.module_name,
      module_key: module.module_key,
      display_order: module.display_order,
      sub_modules: module.sub_modules
        .filter((sm) => sm.has_view_access || sm.has_edit_access)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter((module) => module.sub_modules.length > 0)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const schoolCode = String(staffData.school_code || '').trim();
  if (!schoolCode) {
    return menuItems;
  }
  const intrinsicDigitalDiary = await staffHasIntrinsicDigitalDiaryAccess(
    supabase,
    staffData.id,
    schoolCode
  );
  return mergeIntrinsicDigitalDiaryModule(menuItems, intrinsicDigitalDiary);
}

export async function getStaffMenuModulesCached(staffId: string): Promise<RbacMenuModule[] | null> {
  const now = Date.now();
  const hit = menuCache.get(staffId);
  if (hit && hit.exp > now) {
    return hit.data;
  }
  const fresh = await getStaffMenuModulesForStaffId(staffId);
  if (fresh) {
    menuCache.set(staffId, { exp: now + CACHE_MS, data: fresh });
  }
  return fresh;
}
