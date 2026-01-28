/**
 * Converts DashboardLayout searchableMenuItems to Module structure for Role Management
 */

interface MenuItem {
  label: string;
  path: string;
  category: string;
  parent?: string;
  icon?: unknown;
}

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

/**
 * Builds modules from menu items list
 * Groups items by parent or category
 */
export function buildModulesFromMenuItems(menuItems: MenuItem[]): Module[] {
  const modulesMap = new Map<string, Module>();
  
  // Helper to determine if a submodule supports edit access
  const supportsEdit = (label: string, path: string): boolean => {
    // Items that typically don't support edit (view-only)
    const viewOnlyKeywords = ['dashboard', 'directory', 'report', 'statements', 'reports', 'overview', 'search'];
    const lowerLabel = label.toLowerCase();
    const lowerPath = path.toLowerCase();
    
    // Check if it's a view-only item
    if (viewOnlyKeywords.some(keyword => lowerLabel.includes(keyword) || lowerPath.includes(keyword))) {
      // But some reports might support edit, so check exceptions
      if (lowerLabel.includes('mark attendance') || lowerLabel.includes('attendance') && lowerLabel.includes('mark')) {
        return true;
      }
      return false;
    }
    
    // Most other items support edit
    return true;
  };
  
  menuItems.forEach((item) => {
    // Skip Home as it's handled separately
    if (item.label === 'Home' && !item.parent) {
      return;
    }
    
    // Determine module name (parent or category)
    const moduleName = item.parent || item.category;
    const moduleId = moduleName.toLowerCase().replace(/\s+/g, '-');
    
    // Get or create module
    if (!modulesMap.has(moduleId)) {
      modulesMap.set(moduleId, {
        id: moduleId,
        name: moduleName,
        sub_modules: [],
      });
    }
    
    const modRecord = modulesMap.get(moduleId)!;
    
    // Create sub-module ID from label
    const subModuleId = item.label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const supportsEditAccess = supportsEdit(item.label, item.path);
    
    // Check if sub-module already exists
    const existingSubModule = modRecord.sub_modules.find(sm => sm.id === subModuleId);
    if (!existingSubModule) {
      modRecord.sub_modules.push({
        id: subModuleId,
        name: item.label,
        view_access: false,
        edit_access: false,
        supports_view_access: true,
        supports_edit_access: supportsEditAccess,
      });
    }
  });
  
  // Convert map to array and sort
  return Array.from(modulesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}
