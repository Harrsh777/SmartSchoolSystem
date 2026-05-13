import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session-store';
import { getStaffMenuModulesForStaffId } from '@/lib/rbac/get-staff-menu-modules';
import { evaluateTeacherSlugAgainstMenu } from '@/lib/rbac/teacher-menu-matching';

export type TeacherAccessGuardResult =
  | { ok: true; staffId: string; schoolCode: string | null; canView: boolean; canEdit: boolean }
  | { ok: false; response: NextResponse };

/**
 * Reusable server guard for API routes: session must be a teacher whose RBAC menu
 * authorizes the given slug under `/teacher/dashboard/<slug>`.
 */
export async function assertTeacherRbacForDashboardSlug(
  request: NextRequest,
  options: { slug: string; requireEdit?: boolean }
): Promise<TeacherAccessGuardResult> {
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== 'teacher' || !session.user_id) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const menu = await getStaffMenuModulesForStaffId(session.user_id);
  if (!menu) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const access = evaluateTeacherSlugAgainstMenu(menu, options.slug);
  if (!access.allowed) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  if (options.requireEdit && !access.canEdit) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return {
    ok: true,
    staffId: session.user_id,
    schoolCode: session.school_code,
    canView: access.canView,
    canEdit: access.canEdit,
  };
}
