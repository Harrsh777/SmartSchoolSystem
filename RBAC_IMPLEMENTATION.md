# Role-Based Access Control (RBAC) Implementation Guide

## Overview
This document describes the complete RBAC system implementation for Smart School ERP.

## Database Schema

### Tables Created
1. **`roles`** - Stores role definitions (e.g., "Fee Manager", "Exam Controller")
2. **`permissions`** - Stores permission keys (e.g., "manage_students", "manage_fees")
3. **`role_permissions`** - Many-to-many relationship between roles and permissions
4. **`staff_roles`** - Many-to-many relationship between staff and roles

### Setup Instructions
1. Run the SQL schema file: `supabase_rbac_schema.sql` in your Supabase SQL editor
2. The schema includes:
   - All necessary tables with proper foreign keys
   - Row Level Security (RLS) policies
   - Indexes for performance
   - Default permissions and roles

## API Routes

### RBAC Management Routes
- `GET /api/rbac/permissions` - Get all permissions
- `GET /api/rbac/roles` - Get all roles with permissions
- `POST /api/rbac/roles` - Create a new role
- `PATCH /api/rbac/roles/[id]` - Update a role
- `DELETE /api/rbac/roles/[id]` - Delete a role
- `POST /api/rbac/roles/[id]/permissions` - Assign permissions to a role
- `GET /api/rbac/staff/[staffId]/permissions` - Get staff permissions
- `GET /api/rbac/staff/[staffId]/roles` - Get staff roles
- `POST /api/rbac/staff/[staffId]/roles` - Assign roles to staff
- `GET /api/rbac/staff/with-roles` - Get all staff with their roles

## Frontend Implementation

### Role Management Page
- **Location**: `/dashboard/[school]/settings/roles`
- **Features**:
  - View all staff members with their assigned roles
  - Assign multiple roles to staff members
  - Create new roles
  - Assign permissions to roles
  - Delete roles

### Permission-Based Sidebar
- **Location**: `components/DashboardLayout.tsx`
- **Behavior**:
  - Automatically filters menu items based on user permissions
  - Admin/Principal sees all menu items
  - Staff members only see items they have permission for
  - Role Management is only visible to Admin/Principal

## Permission Keys

| Permission Key | Module | Description |
|---------------|--------|-------------|
| `manage_students` | Students | Full access to student management |
| `manage_staff` | Staff | Full access to staff management |
| `manage_fees` | Fees | Full access to fee management |
| `manage_exams` | Examinations | Full access to examination management |
| `manage_timetable` | Timetable | Full access to timetable management |
| `manage_events` | Calendar | Full access to event and calendar management |
| `manage_transport` | Transport | Full access to transport management |
| `manage_library` | Library | Full access to library management |
| `manage_classes` | Classes | Full access to class management |
| `manage_communication` | Communication | Full access to communication/notices |
| `manage_passwords` | Credentials | Full access to password management |
| `view_reports` | Reports | Access to view reports and analytics |

## Backend Permission Enforcement

### Adding Permission Checks to API Routes

Example for fees API:

```typescript
import { requirePermission } from '@/lib/api-permissions';

export async function POST(request: NextRequest) {
  // Check permission
  const permissionCheck = await requirePermission(request, 'manage_fees');
  if (permissionCheck) {
    return permissionCheck; // Returns 403 if unauthorized
  }

  // Continue with normal logic...
}
```

### Permission Check Function
- **Location**: `lib/api-permissions.ts`
- **Functions**:
  - `checkPermission()` - Check if staff has permission
  - `requirePermission()` - Middleware function that returns 403 if unauthorized
  - `isAdminOrPrincipal()` - Check if user is admin/principal

## Usage Flow

### 1. Setting Up Roles
1. Go to `/dashboard/[school]/settings/roles`
2. Click "Create Role"
3. Enter role name and description
4. Assign permissions to the role
5. Save

### 2. Assigning Roles to Staff
1. Go to `/dashboard/[school]/settings/roles`
2. Find the staff member in the left panel
3. Click "Manage Roles"
4. Select the roles to assign
5. Save

### 3. How Permissions Work
- Staff members can have multiple roles
- Permissions from all roles are combined
- If a staff member has "Fee Manager" and "Exam Controller" roles, they get permissions from both
- Admin/Principal has full access to everything

## Security Features

1. **Row Level Security (RLS)**: All tables have RLS policies
2. **Backend Enforcement**: API routes check permissions before executing
3. **Frontend Filtering**: UI only shows allowed modules
4. **Admin Protection**: Only Admin/Principal can manage roles and permissions

## Notes

- The system is backward compatible - if no staff_id is provided in headers, permission checks are bypassed (for backward compatibility)
- In production, you should require authentication headers for all API calls
- Admin/Principal users have full access regardless of role assignments
- Staff members with no roles will see a minimal dashboard (only Home, Institute Info, Settings)

## Next Steps

To add permission checks to more API routes:
1. Import `requirePermission` from `@/lib/api-permissions`
2. Add permission check at the start of the route handler
3. Use the appropriate permission key from the table above

Example:
```typescript
// For examinations API
const permissionCheck = await requirePermission(request, 'manage_exams');
if (permissionCheck) return permissionCheck;
```

