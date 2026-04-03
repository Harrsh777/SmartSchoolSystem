'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import {
  Activity,
  BarChart3,
  Clock,
  Globe2,
  Loader2,
  MousePointerClick,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  Eye,
  Percent,
  Zap,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';

const PERIODS = [
  { id: '24h', label: '24h' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: '1y', label: '1 year' },
  { id: 'all', label: 'All time' },
] as const;

type PeriodId = (typeof PERIODS)[number]['id'];

const ACCENT = '#06b6d4';
const TEAL = '#14b8a6';
const CHART_DEVICE = ['#06b6d4', '#14b8a6', '#6366f1', '#a78bfa', '#f59e0b'];
const CHART_BROWSER = ['#0e7490', '#0d9488', '#4f46e5', '#7c3aed', '#ea580c', '#64748b'];

interface WebAnalyticsPayload {
  ok: boolean;
  configured?: boolean;
  error?: string;
  period?: string;
  timezone?: string;
  activeVisitors?: number;
  stats?: {
    pageviews: number;
    visitors: number;
    visits: number;
    bounces: number;
    totaltime: number;
    bounceRate: number;
    avgVisitSeconds: number;
    prev?: {
      pageviews?: number;
      visitors?: number;
      visits?: number;
      bounces?: number;
      totaltime?: number;
    };
  };
  pageviews?: {
    pageviews: Array<{ t: string; y: number }>;
    sessions: Array<{ t: string; y: number }>;
  };
  topPages?: Array<{
    name: string;
    pageviews: number;
    visitors: number;
    visits: number;
    bounces: number;
    totaltime: number;
  }>;
  countries?: Array<{ name: string; visitors: number; visits: number; pageviews: number }>;
  browsers?: Array<{ name: string; visitors: number }>;
  devices?: Array<{ name: string; visitors: number }>;
  customEvents?: Array<{ name: string; visitors: number; visits: number }>;
  eventSeriesSummary?: Array<{ name: string; count: number }>;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function formatDuration(sec: number): string {
  if (!sec || sec < 0) return '—';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function mergeSeries(
  pageviews: Array<{ t: string; y: number }>,
  sessions: Array<{ t: string; y: number }>
) {
  const map = new Map<string, { t: string; pageviews: number; sessions: number }>();
  for (const p of pageviews) {
    const key = p.t || '—';
    const cur = map.get(key) || { t: key, pageviews: 0, sessions: 0 };
    cur.pageviews += p.y;
    map.set(key, cur);
  }
  for (const s of sessions) {
    const key = s.t || '—';
    const cur = map.get(key) || { t: key, pageviews: 0, sessions: 0 };
    cur.sessions += s.y;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => a.t.localeCompare(b.t));
}

function DeltaBadge({
  current,
  prev,
  invert,
}: {
  current: number;
  prev?: number;
  invert?: boolean;
}) {
  if (prev === undefined || prev === 0) return null;
  const raw = ((current - prev) / prev) * 100;
  const pct = Math.round(raw * 10) / 10;
  const up = pct > 0;
  const good = invert ? !up : up;
  if (pct === 0) {
    return (
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-2">0%</span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ml-2 ${
        good ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'
      }`}
    >
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? '+' : ''}
      {pct}%
    </span>
  );
}

export default function WebAnalyticsDashboard() {
  const [period, setPeriod] = useState<PeriodId>('30d');
  const [data, setData] = useState<WebAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tz] = useState(() =>
    typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      : 'UTC'
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period, timezone: tz });
      const res = await fetch(`/api/admin/web-analytics?${params}`);
      const json = (await res.json()) as WebAnalyticsPayload;
      setData(json);
    } catch {
      setData({ ok: false, error: 'Network error' });
    } finally {
      setLoading(false);
    }
  }, [period, tz]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = useMemo(() => {
    const pv = data?.pageviews?.pageviews ?? [];
    const sess = data?.pageviews?.sessions ?? [];
    return mergeSeries(pv, sess).map((row) => ({
      ...row,
      label:
        row.t && row.t.length > 10
          ? new Date(row.t).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: period === '24h' || period === '7d' ? 'numeric' : undefined,
            })
          : row.t,
    }));
  }, [data?.pageviews, period]);

  const deviceChartData = useMemo(() => {
    const rows = data?.devices ?? [];
    const total = rows.reduce((s, r) => s + (r.visitors || 0), 0) || 1;
    return rows.map((r) => ({
      name: r.name || 'Other',
      value: Math.round(((r.visitors || 0) / total) * 1000) / 10,
      visitors: r.visitors,
    }));
  }, [data?.devices]);

  const browserChartData = useMemo(() => {
    const rows = data?.browsers ?? [];
    const total = rows.reduce((s, r) => s + (r.visitors || 0), 0) || 1;
    return rows.map((r) => ({
      name: r.name || 'Other',
      value: Math.round(((r.visitors || 0) / total) * 1000) / 10,
      visitors: r.visitors,
    }));
  }, [data?.browsers]);

  const stats = data?.stats;
  const prev = stats?.prev;

  if (data && data.configured === false) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/40 dark:to-slate-900 p-8 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200">
            <Zap size={24} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Connect Umami analytics
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              Add your Umami Cloud API credentials to the server environment so this dashboard can
              load real pageviews, visitors, and events. The API key is never sent to the browser.
            </p>
            <ul className="mt-4 text-sm font-mono text-slate-700 dark:text-slate-300 space-y-1 bg-white/70 dark:bg-slate-950/50 rounded-lg p-4 border border-slate-200/80 dark:border-slate-700">
              <li>UMAMI_API_KEY=your_key</li>
              <li>UMAMI_WEBSITE_ID=6b3a314c-a362-47db-b427-1329e70d43de</li>
              <li className="text-slate-500 dark:text-slate-500">
                UMAMI_API_BASE_URL=https://api.umami.is/v1 (optional)
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
            <BarChart3 size={14} />
            Web analytics
          </div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Traffic &amp; behavior
          </h2>
          <p className="mt-1 text-slate-600 dark:text-slate-400 max-w-2xl">
            Live metrics from Umami: visitors, sessions, top pages, devices, and custom events for
            your ERP.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800/80 border border-slate-300/50 dark:border-slate-700/80">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  period === p.id
                    ? 'bg-white dark:bg-slate-900 text-cyan-700 dark:text-cyan-300 shadow-sm ring-1 ring-cyan-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => load()}
            disabled={loading}
            className="border-cyan-500/30 text-cyan-800 dark:text-cyan-300 hover:bg-cyan-500/10"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <RefreshCw size={18} />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      {data?.error && data.ok === false && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-rose-800 dark:text-rose-200 text-sm">
          {data.error}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        {[
          {
            label: 'Active now',
            sub: 'Last 5 min',
            value: formatNum(data?.activeVisitors ?? 0),
            icon: Zap,
            prev: undefined,
            invert: false,
          },
          {
            label: 'Unique visitors',
            value: formatNum(stats?.visitors ?? 0),
            icon: Users,
            prev: prev?.visitors,
            current: stats?.visitors ?? 0,
            invert: false,
          },
          {
            label: 'Visits',
            value: formatNum(stats?.visits ?? 0),
            icon: MousePointerClick,
            prev: prev?.visits,
            current: stats?.visits ?? 0,
            invert: false,
          },
          {
            label: 'Pageviews',
            value: formatNum(stats?.pageviews ?? 0),
            icon: Eye,
            prev: prev?.pageviews,
            current: stats?.pageviews ?? 0,
            invert: false,
          },
          {
            label: 'Avg. visit',
            value: formatDuration(stats?.avgVisitSeconds ?? 0),
            icon: Clock,
            prev: undefined,
            invert: false,
          },
          {
            label: 'Bounce rate',
            value: `${(stats?.bounceRate ?? 0).toFixed(1)}%`,
            icon: Percent,
            prev: undefined,
            current: stats?.bounceRate ?? 0,
            invert: true,
          },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          const showDelta =
            'current' in kpi && kpi.prev !== undefined && typeof kpi.current === 'number';
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="h-full border border-slate-200/90 dark:border-slate-700/90 bg-white/90 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-cyan-500/25 transition-all duration-300">
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {kpi.label}
                    </p>
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                      <Icon size={18} />
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline flex-wrap">
                    <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                      {loading && !data ? '—' : kpi.value}
                    </span>
                    {showDelta ? (
                      <DeltaBadge
                        current={kpi.current as number}
                        prev={kpi.prev}
                        invert={'invert' in kpi ? kpi.invert : false}
                      />
                    ) : null}
                  </div>
                  {'sub' in kpi && kpi.sub ? (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{kpi.sub}</p>
                  ) : null}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Trend chart */}
      <Card className="border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-slate-900/50 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="text-cyan-600 dark:text-cyan-400" size={20} />
              Traffic over time
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Pageviews and sessions · {tz}
            </p>
          </div>
        </div>
        <div className="p-4 h-[320px]">
          {loading && !chartData.length ? (
            <div className="h-full flex items-center justify-center text-slate-400">
              <Loader2 className="animate-spin mr-2" size={22} />
              Loading chart…
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              No time-series data for this range yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillPv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fillSess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TEAL} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-slate-200 dark:stroke-slate-700"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-slate-500"
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-slate-500"
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgb(148 163 184 / 0.35)',
                    background: 'rgba(15 23 42 / 0.95)',
                    color: '#f8fafc',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="pageviews"
                  name="Pageviews"
                  stroke={ACCENT}
                  strokeWidth={2}
                  fill="url(#fillPv)"
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  name="Sessions"
                  stroke={TEAL}
                  strokeWidth={2}
                  fill="url(#fillSess)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-slate-900/50 shadow-sm">
          <div className="p-6 border-b border-slate-200/80 dark:border-slate-700/80">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Top pages</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">By visits in selected period</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-6 py-3 font-semibold">Path</th>
                  <th className="px-4 py-3 font-semibold text-right">Visitors</th>
                  <th className="px-4 py-3 font-semibold text-right">Visits</th>
                  <th className="px-4 py-3 font-semibold text-right">Views</th>
                  <th className="px-6 py-3 font-semibold text-right">Avg. time</th>
                </tr>
              </thead>
              <tbody>
                {(data?.topPages ?? []).length === 0 && !loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No page data yet. Ensure the Umami script is on your site.
                    </td>
                  </tr>
                ) : (
                  (data?.topPages ?? []).map((row, idx) => {
                    const avg =
                      row.visits > 0 ? Math.round(row.totaltime / row.visits) : 0;
                    return (
                      <tr
                        key={`${row.name}-${idx}`}
                        className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-cyan-500/[0.04] transition-colors"
                      >
                        <td className="px-6 py-3 font-mono text-xs sm:text-sm text-slate-800 dark:text-slate-200 max-w-[240px] truncate">
                          {row.name || '/'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {formatNum(row.visitors)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {formatNum(row.visits)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-300">
                          {formatNum(row.pageviews)}
                        </td>
                        <td className="px-6 py-3 text-right text-slate-600 dark:text-slate-400">
                          {formatDuration(avg)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-slate-900/50 shadow-sm">
          <div className="p-6 border-b border-slate-200/80 dark:border-slate-700/80">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe2 size={18} className="text-cyan-600 dark:text-cyan-400" />
              Countries
            </h3>
          </div>
          <div className="p-6 space-y-3 max-h-[360px] overflow-y-auto">
            {(data?.countries ?? []).length === 0 && !loading ? (
              <p className="text-sm text-slate-500">No country data yet.</p>
            ) : (
              (data?.countries ?? []).map((c, i) => {
                const max = Math.max(1, ...(data?.countries ?? []).map((x) => x.visitors));
                const pct = Math.round((c.visitors / max) * 100);
                return (
                  <div key={`${c.name}-${i}`}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700 dark:text-slate-200 font-medium">
                        {c.name || 'Unknown'}
                      </span>
                      <span className="text-slate-500 tabular-nums">{formatNum(c.visitors)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-slate-900/50 shadow-sm">
          <div className="p-6 border-b border-slate-200/80 dark:border-slate-700/80">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Devices</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Share of visitors</p>
          </div>
          <div className="h-64 p-4">
            {deviceChartData.length === 0 && !loading ? (
              <p className="text-sm text-slate-500 p-4">No device breakdown.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name} ${value}%`}
                  >
                    {deviceChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_DEVICE[i % CHART_DEVICE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _n, item) => {
                      const v = typeof value === 'number' ? value : 0;
                      const props = item as { payload?: { visitors?: number } };
                      return [`${v}% (${formatNum(props?.payload?.visitors ?? 0)} visitors)`, ''];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-slate-900/50 shadow-sm">
          <div className="p-6 border-b border-slate-200/80 dark:border-slate-700/80">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Browsers</h3>
          </div>
          <div className="h-64 p-4">
            {browserChartData.length === 0 && !loading ? (
              <p className="text-sm text-slate-500 p-4">No browser data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={browserChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name} ${value}%`}
                  >
                    {browserChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_BROWSER[i % CHART_BROWSER.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, _n, item) => {
                      const v = typeof value === 'number' ? value : 0;
                      const props = item as { payload?: { visitors?: number } };
                      return [`${v}% (${formatNum(props?.payload?.visitors ?? 0)} visitors)`, ''];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Custom events */}
      <Card className="border border-slate-200/90 dark:border-slate-700/90 bg-white/95 dark:bg-slate-900/50 shadow-sm">
        <div className="p-6 border-b border-slate-200/80 dark:border-slate-700/80">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Custom events
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track ERP actions with{' '}
            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
              umami.track(&apos;event_name&apos;)
            </code>
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-slate-200 dark:divide-slate-700">
          <div className="p-6">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
              Totals (period)
            </h4>
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {(data?.customEvents ?? []).length > 0
                ? (data?.customEvents ?? []).map((e, i) => (
                    <li
                      key={`ce-${e.name}-${i}`}
                      className="flex justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-800/80"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                        {e.name}
                      </span>
                      <span className="tabular-nums text-cyan-600 dark:text-cyan-400 shrink-0">
                        {formatNum(e.visitors)} visitors
                      </span>
                    </li>
                  ))
                : (data?.eventSeriesSummary ?? []).length > 0
                  ? (data?.eventSeriesSummary ?? []).map((e, i) => (
                      <li
                        key={`es-${e.name}-${i}`}
                        className="flex justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-800/80"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                          {e.name}
                        </span>
                        <span className="tabular-nums text-teal-600 dark:text-teal-400 shrink-0">
                          {formatNum(e.count)} hits
                        </span>
                      </li>
                    ))
                  : !loading && (
                      <li className="text-sm text-slate-500">No events recorded.</li>
                    )}
            </ul>
          </div>
          <div className="p-6 bg-slate-50/50 dark:bg-slate-950/20">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
              Tips
            </h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
              <li>Use events for logins, fee payments, and report exports.</li>
              <li>Filter funnels in Umami Cloud for deeper paths.</li>
              <li>Data refreshes from Umami on each Refresh or period change.</li>
            </ul>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
