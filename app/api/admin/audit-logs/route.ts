import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  user_name: string;
  role: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  severity: string;
  ip_address: string | null;
  device_summary: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const role = searchParams.get('role')?.trim() || undefined;
    const severity = searchParams.get('severity')?.trim() || undefined;
    const entityType = searchParams.get('module')?.trim() || searchParams.get('entityType')?.trim() || undefined;
    const actionType = searchParams.get('actionType')?.trim() || undefined;
    const userSearch = searchParams.get('user')?.trim() || undefined;
    const dateFrom = searchParams.get('dateFrom')?.trim() || undefined;
    const dateTo = searchParams.get('dateTo')?.trim() || undefined;

    const supabase = getServiceRoleClient();

    let query = supabase
      .from('audit_logs')
      .select('id, user_id, user_name, role, action_type, entity_type, entity_id, severity, ip_address, device_summary, metadata, created_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (role) query = query.eq('role', role);
    if (severity) query = query.eq('severity', severity);
    if (entityType) query = query.eq('entity_type', entityType);
    if (actionType) query = query.eq('action_type', actionType);
    if (userSearch) query = query.ilike('user_name', `%${userSearch}%`);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) {
      const end = dateTo.length <= 10 ? `${dateTo}T23:59:59.999Z` : dateTo;
      query = query.lte('created_at', end);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data: rows, count, error } = await query.range(from, to);

    if (error) {
      if ((error as { code?: string }).code === '42P01') {
        return NextResponse.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          tableMissing: true,
        });
      }
      throw error;
    }

    return NextResponse.json({
      data: rows || [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
      tableMissing: false,
    });
  } catch (err) {
    console.error('Audit logs fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs', details: (err as Error).message },
      { status: 500 }
    );
  }
}
