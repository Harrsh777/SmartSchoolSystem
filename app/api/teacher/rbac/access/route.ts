import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session-store';
import { getStaffMenuModulesForStaffId } from '@/lib/rbac/get-staff-menu-modules';
import {
  evaluateTeacherSlugAgainstMenu,
  teacherPathnameToSlug,
} from '@/lib/rbac/teacher-menu-matching';
import { isTeacherDashboardPathExemptFromRbacMenu } from '@/lib/rbac/teacher-intrinsic-paths';

/**
 * GET /api/teacher/rbac/access?path=/teacher/dashboard/fees/v2/dashboard
 * Server-side permission check for teacher portal navigation (same rules as middleware).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.role !== 'teacher' || !session.user_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawPath = request.nextUrl.searchParams.get('path') || '';
    const path = rawPath.split('?')[0] || '';

    if (!path.startsWith('/teacher/dashboard')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    if (isTeacherDashboardPathExemptFromRbacMenu(path)) {
      return NextResponse.json({
        allowed: true,
        exempt: true,
        canView: true,
        canEdit: true,
      });
    }

    const menu = await getStaffMenuModulesForStaffId(session.user_id);
    if (!menu) {
      return NextResponse.json({ error: 'Menu unavailable' }, { status: 503 });
    }

    const slug = teacherPathnameToSlug(path, session.school_code);
    const result = evaluateTeacherSlugAgainstMenu(menu, slug);

    return NextResponse.json({
      allowed: result.allowed,
      exempt: false,
      canView: result.canView,
      canEdit: result.canEdit,
      matchedSubModuleKey: result.matchedSubModuleKey ?? null,
      matchedModuleKey: result.matchedModuleKey ?? null,
    });
  } catch (error) {
    console.error('GET /api/teacher/rbac/access', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
