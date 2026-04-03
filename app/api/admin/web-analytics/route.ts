import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@umami/api-client';
import { requireSuperAdminSession } from '@/lib/super-admin-api';

export const dynamic = 'force-dynamic';

type ExpandedMetric = {
  name: string;
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
};

function getRange(period: string): { startAt: number; endAt: number } {
  const endAt = Date.now();
  switch (period) {
    case '24h':
      return { startAt: endAt - 24 * 60 * 60 * 1000, endAt };
    case '7d':
      return { startAt: endAt - 7 * 24 * 60 * 60 * 1000, endAt };
    case '30d':
      return { startAt: endAt - 30 * 24 * 60 * 60 * 1000, endAt };
    case '90d':
      return { startAt: endAt - 90 * 24 * 60 * 60 * 1000, endAt };
    case '1y':
      return { startAt: endAt - 365 * 24 * 60 * 60 * 1000, endAt };
    case 'all':
      return { startAt: 0, endAt };
    default:
      return { startAt: endAt - 30 * 24 * 60 * 60 * 1000, endAt };
  }
}

function pageviewUnit(period: string): 'hour' | 'day' | 'month' {
  if (period === '24h' || period === '7d') return 'hour';
  if (period === '1y' || period === 'all') return 'month';
  return 'day';
}

function eventUnit(period: string): string {
  if (period === '24h' || period === '7d') return 'hour';
  if (period === '1y' || period === 'all') return 'month';
  return 'day';
}

function parseStatBlock(
  raw: unknown,
  key: string
): { value: number; prev?: number } {
  if (!raw || typeof raw !== 'object') return { value: 0 };
  const o = raw as Record<string, unknown>;
  const v = o[key];
  if (typeof v === 'number') return { value: v };
  if (v && typeof v === 'object' && 'value' in v) {
    const n = v as { value?: number; prev?: number };
    return {
      value: Number(n.value) || 0,
      prev: n.prev !== undefined ? Number(n.prev) : undefined,
    };
  }
  return { value: 0 };
}

function normalizeStats(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    return {
      pageviews: 0,
      visitors: 0,
      visits: 0,
      bounces: 0,
      totaltime: 0,
      comparison: null as Record<string, { value: number; prev?: number }> | null,
    };
  }
  const o = raw as Record<string, unknown>;
  const pageviews = parseStatBlock(o, 'pageviews');
  const visitors = parseStatBlock(o, 'visitors');
  const visits = parseStatBlock(o, 'visits');
  const bounces = parseStatBlock(o, 'bounces');
  const totaltime = parseStatBlock(o, 'totaltime');
  const comp = o.comparison;
  let comparison: Record<string, { value: number; prev?: number }> | null = null;
  if (comp && typeof comp === 'object') {
    comparison = {
      pageviews: parseStatBlock(comp, 'pageviews'),
      visitors: parseStatBlock(comp, 'visitors'),
      visits: parseStatBlock(comp, 'visits'),
      bounces: parseStatBlock(comp, 'bounces'),
      totaltime: parseStatBlock(comp, 'totaltime'),
    };
  }
  return {
    pageviews: pageviews.value,
    visitors: visitors.value,
    visits: visits.value,
    bounces: bounces.value,
    totaltime: totaltime.value,
    prev: {
      pageviews: pageviews.prev,
      visitors: visitors.prev,
      visits: visits.prev,
      bounces: bounces.prev,
      totaltime: totaltime.prev,
    },
    comparison,
  };
}

async function fetchExpanded(
  baseUrl: string,
  apiKey: string,
  websiteId: string,
  type: string,
  startAt: number,
  endAt: number,
  limit: number
): Promise<ExpandedMetric[]> {
  const url = new URL(
    `${baseUrl.replace(/\/$/, '')}/websites/${websiteId}/metrics/expanded`
  );
  url.searchParams.set('type', type);
  url.searchParams.set('startAt', String(startAt));
  url.searchParams.set('endAt', String(endAt));
  url.searchParams.set('limit', String(limit));
  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'x-umami-api-key': apiKey,
    },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = (await res.json()) as unknown;
  const rows = Array.isArray(data)
    ? data
    : data &&
        typeof data === 'object' &&
        Array.isArray((data as { data?: unknown }).data)
      ? (data as { data: unknown[] }).data
      : [];
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      return {
        name: String(r.name ?? ''),
        pageviews: Number(r.pageviews) || 0,
        visitors: Number(r.visitors) || 0,
        visits: Number(r.visits) || 0,
        bounces: Number(r.bounces) || 0,
        totaltime: Number(r.totaltime) || 0,
      };
    })
    .filter((x): x is ExpandedMetric => x !== null && x.name.length > 0);
}

type UmamiGet = (
  path: string,
  params?: Record<string, string | number>
) => Promise<{ ok: boolean; status: number; data?: unknown; error?: unknown }>;

export async function GET(request: NextRequest) {
  const denied = await requireSuperAdminSession(request);
  if (denied) return denied;

  const apiKey = process.env.UMAMI_API_KEY;
  const websiteId =
    process.env.UMAMI_WEBSITE_ID || '6b3a314c-a362-47db-b427-1329e70d43de';
  const baseUrl =
    process.env.UMAMI_API_BASE_URL ||
    process.env.UMAMI_API_CLIENT_ENDPOINT ||
    'https://api.umami.is/v1';

  if (!apiKey?.trim()) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        error:
          'Umami is not configured. Set UMAMI_API_KEY (and optionally UMAMI_WEBSITE_ID, UMAMI_API_BASE_URL) in your environment.',
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  let period = searchParams.get('period') || '30d';
  if (!['24h', '7d', '30d', '90d', '1y', 'all'].includes(period)) {
    period = '30d';
  }

  const range = getRange(period);
  let startAt = range.startAt;
  const { endAt } = range;
  const timezone = searchParams.get('timezone') || 'UTC';

  const client = getClient({
    apiKey,
    apiEndpoint: baseUrl,
  });

  const get = (client as unknown as { get: UmamiGet }).get.bind(client);

  if (period === 'all') {
    try {
      const dr = await get(`websites/${websiteId}/daterange`);
      if (dr.ok && dr.data && typeof dr.data === 'object') {
        const d = dr.data as { startDate?: string; minDate?: string };
        const startStr = d.startDate || d.minDate;
        if (startStr) {
          const t = new Date(startStr).getTime();
          if (!Number.isNaN(t)) startAt = t;
        }
      }
    } catch {
      }
  }
  const unit = pageviewUnit(period);
  const evUnit = eventUnit(period);

  try {
    const [
      activeRes,
      statsRes,
      pageviewsRes,
      eventsRes,
      pathsRes,
      countriesRes,
      browsersRes,
      devicesRes,
      eventsExpanded,
    ] = await Promise.all([
      get(`websites/${websiteId}/active`),
      get(`websites/${websiteId}/stats`, { startAt, endAt }),
      get(`websites/${websiteId}/pageviews`, {
        startAt,
        endAt,
        unit,
        timezone,
      }),
      get(`websites/${websiteId}/events/series`, {
        startAt: String(startAt),
        endAt: String(endAt),
        unit: evUnit,
        timezone,
      }),
      fetchExpanded(baseUrl, apiKey, websiteId, 'path', startAt, endAt, 20),
      fetchExpanded(baseUrl, apiKey, websiteId, 'country', startAt, endAt, 12),
      fetchExpanded(baseUrl, apiKey, websiteId, 'browser', startAt, endAt, 10),
      fetchExpanded(baseUrl, apiKey, websiteId, 'device', startAt, endAt, 8),
      fetchExpanded(baseUrl, apiKey, websiteId, 'event', startAt, endAt, 25),
    ]);

    const activePayload = activeRes.data as
      | { visitors?: number; x?: number }
      | undefined;
    const activeVisitors =
      typeof activePayload?.visitors === 'number'
        ? activePayload.visitors
        : typeof activePayload?.x === 'number'
          ? activePayload.x
          : 0;

    const stats = normalizeStats(statsRes.data);

    const pvRaw = pageviewsRes.data as
      | {
          pageviews?: Array<{ x?: string; t?: string; y?: number }>;
          sessions?: Array<{ x?: string; t?: string; y?: number }>;
        }
      | undefined;

    const mapSeries = (
      rows: Array<{ x?: string; t?: string; y?: number }> | undefined
    ) =>
      (rows ?? []).map((row) => ({
        t: String(row.t ?? row.x ?? ''),
        y: Number(row.y) || 0,
      }));

    const evData = eventsRes.data;
    const eventsRaw = Array.isArray(evData)
      ? evData
      : evData &&
          typeof evData === 'object' &&
          Array.isArray((evData as { data?: unknown[] }).data)
        ? (evData as { data: unknown[] }).data
        : [];
    const eventTotals = new Map<string, number>();
    for (const row of eventsRaw) {
      if (!row || typeof row !== 'object') continue;
      const r = row as { x?: string; y?: number };
      const name = String(r.x ?? '');
      if (!name) continue;
      eventTotals.set(name, (eventTotals.get(name) || 0) + (Number(r.y) || 0));
    }
    const eventSummary = [...eventTotals.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const bounceRate =
      stats.visits > 0 ? Math.round((stats.bounces / stats.visits) * 1000) / 10 : 0;
    const avgVisitSeconds =
      stats.visits > 0 ? Math.round(stats.totaltime / stats.visits) : 0;

    return NextResponse.json({
      ok: true,
      configured: true,
      period,
      timezone,
      range: { startAt, endAt },
      activeVisitors,
      stats: {
        ...stats,
        bounceRate,
        avgVisitSeconds,
      },
      pageviews: {
        pageviews: mapSeries(pvRaw?.pageviews),
        sessions: mapSeries(pvRaw?.sessions),
      },
      topPages: pathsRes,
      countries: countriesRes,
      browsers: browsersRes,
      devices: devicesRes,
      customEvents: eventsExpanded,
      eventSeriesSummary: eventSummary,
      errors: {
        active: !activeRes.ok ? activeRes.status : null,
        stats: !statsRes.ok ? statsRes.status : null,
        pageviews: !pageviewsRes.ok ? pageviewsRes.status : null,
        events: !eventsRes.ok ? eventsRes.status : null,
      },
    });
  } catch (e) {
    console.error('web-analytics:', e);
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error: e instanceof Error ? e.message : 'Umami request failed',
      },
      { status: 502 }
    );
  }
}
