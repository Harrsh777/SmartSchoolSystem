# Staff Permissions System Implementation

## Overview
This document describes the new staff permissions system that allows granular control over staff access to modules and sub-modules with separate VIEW and EDIT permissions.

## Database Schema

### New Tables Created

1. **`modules`** - Stores module definitions (e.g., "Home", "School Info", "Staff Management")
2. **`sub_modules`** - Stores sub-module definitions under each module
3. **`permission_categories`** - Stores permission categories (e.g., "Default", "Custom")
4. **`staff_permissions`** - Direct staff permissions with view/edit access for sub-modules

### Setup Instructions

1. Run the SQL schema file in your Supabase SQL editor:
   ```
   supabase_staff_permissions_schema.sql
   ```

2. The schema includes:
   - All necessary tables with proper foreign keys
   - Row Level Security (RLS) policies
   - Indexes for performance
   - Default modules and sub-modules
   - Helper function `get_staff_permissions_by_category()`

## API Routes

### Staff Permissions Routes

- **GET** `/api/rbac/staff-permissions?school_code={code}`
  - Returns all staff with their permissions summary
  - Includes summary statistics (total staff, view permission count, edit permission count)

- **GET** `/api/rbac/staff-permissions/[staffId]?category_id={id}`
  - Returns detailed permissions for a specific staff member
  - Includes all modules, sub-modules, and their view/edit access status
  - Defaults to "Default" category if category_id not provided

- **POST** `/api/rbac/staff-permissions/[staffId]`
  - Updates permissions for a specific staff member
  - Body: `{ category_id, permissions: [{ sub_module_id, view_access, edit_access }], assigned_by }`

## Frontend Pages

### 1. Staff Access Control List Page
**Location**: `/dashboard/[school]/staff-access-control`

**Features**:
- Summary cards showing:
  - Total Staff count
  - View Permission count
  - Edit Permission count
- Search functionality to filter staff by name, email, or employee ID
- Staff type filter (All Staff, Teaching, Non-Teaching)
- Module-wise view toggle (placeholder for future feature)
- Table displaying:
  - Staff name with photo
  - User Access type
  - Role Category
  - View Permissions (list of sub-modules)
  - Edit Permissions (list of sub-modules)
  - Access Given By (who assigned and when)
- Click on any staff row to open detailed permissions page

### 2. Staff Permissions Detail Page
**Location**: `/dashboard/[school]/staff-access-control/[staffId]`

**Features**:
- Staff name and details at the top
- Category selector dropdown
- Device Guard Settings button (Premium feature placeholder)
- Permissions table with:
  - Module and Sub-module columns
  - VIEW ACCESS toggle switches (orange when enabled)
  - EDIT ACCESS toggle switches (orange when enabled)
  - Module-level toggles to enable/disable all sub-modules at once
  - Header toggles to enable/disable all permissions at once
- Save button to persist changes

## Usage Flow

### 1. Viewing Staff Permissions
1. Navigate to `/dashboard/[school]/staff-access-control`
2. View summary statistics at the top
3. Use search and filters to find specific staff
4. Click on any staff member to view/edit their permissions

### 2. Managing Staff Permissions
1. Click on a staff member from the list
2. Select a category (default is "Default")
3. Toggle VIEW ACCESS and EDIT ACCESS switches for each sub-module
4. Use module-level toggles to quickly enable/disable all sub-modules in a module
5. Click "Save Permissions" to save changes
6. System will redirect back to the staff list after successful save

## Permission Structure

### Modules Included (Based on Images)
- Home
- School Info
- Admin Role Management
- Password Management
- Storage Used
- Staff Management
- Student Personal Details
- Accounts management
- Task Management

### Sub-modules Included
Each module has relevant sub-modules. For example:
- **Home**: Dashboard
- **School Info**: Basic School Info, Implementation Process
- **Staff Management**: Staff Directory, Add Staff, Bulk Staff import, Bulk Photo Upload
- **Student Personal Details**: Student Personal Details, Student Personal Details(Admission)
- **Accounts management**: Day Book, Journal & ledger, P & L, Balance Sheet

## Integration with Existing RBAC

This new system works alongside the existing role-based system:
- The existing `roles`, `permissions`, `role_permissions`, and `staff_roles` tables remain unchanged
- This new system provides direct, granular permissions per staff member
- You can use either system or both together

## Security Features

1. **Row Level Security (RLS)**: All tables have RLS policies
2. **Admin Only**: Only Principal/Admin can manage permissions
3. **Staff Can View**: Staff can read their own permissions
4. **Audit Trail**: Tracks who assigned permissions and when

## Next Steps

1. **Run the Schema**: Execute `supabase_staff_permissions_schema.sql` in Supabase
2. **Test the Pages**: Navigate to the staff access control pages
3. **Add More Modules**: Extend the modules and sub-modules as needed
4. **Integrate with Dashboard**: Use these permissions to control what appears in staff dashboards
5. **Add Permission Checks**: Use the permission data to restrict access in API routes

## Notes

- The system defaults to "Default" category if none is specified
- Toggle switches are orange when enabled, gray when disabled
- Module-level toggles only affect sub-modules that support that access type
- The "Device Guard Settings" button is a placeholder for a premium feature
- Photo URLs are displayed if available, otherwise a default user icon is shown

