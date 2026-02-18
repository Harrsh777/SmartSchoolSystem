import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/supabase-admin';

export interface LoginAuditRow {
  id: string;
  user_id: string | null;
  name: string;
  role: string;
  login_type: string | null;
  ip_address: string | null;
  user_agent: string | null;
  login_at: string;
  status: string;
  created_at?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const role = searchParams.get('role')?.trim() || undefined;
    const dateFrom = searchParams.get('dateFrom')?.trim() || undefined;
    const dateTo = searchParams.get('dateTo')?.trim() || undefined;
    const ip = searchParams.get('ip')?.trim() || undefined;
    const status = searchParams.get('status')?.trim() || undefined;
    const exportCsv = searchParams.get('export') === 'csv';

    const supabase = getServiceRoleClient();

    let query = supabase
      .from('login_audit_log')
      .select('id, user_id, name, role, login_type, ip_address, user_agent, login_at, status, created_at', { count: 'exact' })
      .order('login_at', { ascending: false });

    if (role) query = query.eq('role', role);
    if (status) query = query.eq('status', status);
    if (ip) query = query.ilike('ip_address', `%${ip}%`);
    if (dateFrom) query = query.gte('login_at', dateFrom);
    if (dateTo) {
      const end = dateTo.length <= 10 ? `${dateTo}T23:59:59.999Z` : dateTo;
      query = query.lte('login_at', end);
    }

    if (exportCsv) {
      const { data: rows, error } = await query.limit(10000);
      if (error) {
        if ((error as { code?: string }).code === '42P01') {
          return new NextResponse('name,role,ip_address,device,status,time\n', {
            status: 200,
            headers: {
              'Content-Type': 'text/csv; charset=utf-8',
              'Content-Disposition': 'attachment; filename="login-audit.csv"',
            },
          });
        }
        throw error;
      }
      const header = 'Name,Role,IP Address,Device,Status,Time\n';
      const body = (rows || []).map((r: LoginAuditRow) => {
        const name = (r.name ?? '').replace(/"/g, '""');
        const roleVal = (r.role ?? '').replace(/"/g, '""');
        const ipVal = (r.ip_address ?? '').replace(/"/g, '""');
        const device = (r.user_agent ?? '').replace(/"/g, '""').slice(0, 200);
        const statusVal = (r.status ?? '').replace(/"/g, '""');
        const time = (r.login_at ?? r.created_at ?? '').replace(/"/g, '""');
        return `"${name}","${roleVal}","${ipVal}","${device}","${statusVal}","${time}"`;
      }).join('\n');
      return new NextResponse(header + body, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="login-audit.csv"',
        },
      });
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data: rows, count, error } = await query.range(from, to);

    if (error) {
      if ((error as { code?: string }).code === '42P01') {
        return NextResponse.json({
          data: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          stats: null,
          tableMissing: true,
        });
      }
      throw error;
    }

    // Aggregate stats for charts (last 30 days by default for list view)
    const statsFrom = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const statsTo = dateTo || new Date().toISOString().slice(0, 10);
    const statsEnd = statsTo.length <= 10 ? `${statsTo}T23:59:59.999Z` : statsTo;
    const statsQuery = supabase
      .from('login_audit_log')
      .select('login_at, role, status, ip_address')
      .gte('login_at', statsFrom)
      .lte('login_at', statsEnd);
    const { data: statsRows } = await statsQuery;
    const byDate: Record<string, { success: number; failed: number }> = {};
    const byRole: Record<string, { success: number; failed: number }> = {};
    const byHour: Record<number, { success: number; failed: number }> = {};
    const ipFailures: Record<string, { failed: number; total: number }> = {};
    const now = Date.now();
    const last24hStart = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    let last24hSuccess = 0;
    let last24hFailed = 0;
    (statsRows || []).forEach((r: { login_at?: string; role?: string; status?: string; ip_address?: string | null }) => {
      const day = (r.login_at || '').slice(0, 10);
      const ro = (r.role || 'Unknown');
      const ok = (r.status || '').toLowerCase() === 'success';
      const ip = (r.ip_address || '').trim() || null;
      if (day) {
        if (!byDate[day]) byDate[day] = { success: 0, failed: 0 };
        if (ok) byDate[day].success += 1; else byDate[day].failed += 1;
      }
      if (!byRole[ro]) byRole[ro] = { success: 0, failed: 0 };
      if (ok) byRole[ro].success += 1; else byRole[ro].failed += 1;
      const hour = r.login_at ? new Date(r.login_at).getUTCHours() : 0;
      if (!byHour[hour]) byHour[hour] = { success: 0, failed: 0 };
      if (ok) {
        byHour[hour].success += 1;
      } else {
        byHour[hour].failed += 1;
      }
      if (r.login_at && r.login_at >= last24hStart) {
        if (ok) {
          last24hSuccess += 1;
        } else {
          last24hFailed += 1;
        }
      }
      if (ip) {
        if (!ipFailures[ip]) ipFailures[ip] = { failed: 0, total: 0 };
        ipFailures[ip].total += 1;
        if (!ok) ipFailures[ip].failed += 1;
      }
    });
    const timeSeries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, success: v.success, failed: v.failed, total: v.success + v.failed }));
    const roleBreakdown = Object.entries(byRole).map((entry) => {
      const [role, v] = entry;
      return { role, success: v.success, failed: v.failed, total: v.success + v.failed };
    });
    const last24h = { success: last24hSuccess, failed: last24hFailed };
    const topIpsByFailures = Object.entries(ipFailures)
      .filter(([, v]) => v.failed > 0)
      .sort((a, b) => b[1].failed - a[1].failed)
      .slice(0, 10)
      .map(([ip, v]) => ({ ip, failed: v.failed, total: v.total }));
    const loginsByHour = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      success: byHour[h]?.success ?? 0,
      failed: byHour[h]?.failed ?? 0,
      total: (byHour[h]?.success ?? 0) + (byHour[h]?.failed ?? 0),
    }));

    return NextResponse.json({
      data: rows || [],
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
      stats: { timeSeries, roleBreakdown, last24h, topIpsByFailures, loginsByHour },
    });
  } catch (err) {
    console.error('Login audit fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch login audit', details: (err as Error).message },
      { status: 500 }
    );
  }
}
