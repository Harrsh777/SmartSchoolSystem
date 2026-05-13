import { NextRequest, NextResponse } from 'next/server';
import { getStaffMenuModulesForStaffId } from '@/lib/rbac/get-staff-menu-modules';

// GET /api/staff/[id]/menu - Get menu items based on staff permissions (roles + overrides)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const menuItems = await getStaffMenuModulesForStaffId(id);

    if (!menuItems) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    return NextResponse.json({ data: menuItems }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/staff/[id]/menu:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
