'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Database, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DatabaseGraph from './DatabaseGraph';
import type { DbStructureResponse, DbTable } from '@/types/db-structure';

function GraphSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 animate-pulse min-h-[520px] h-[min(72vh,820px)] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-200/50 via-transparent to-cyan-500/5 dark:from-slate-800/50" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="animate-spin" size={32} />
        <span className="text-sm font-medium">Loading schema graph…</span>
      </div>
    </div>
  );
}

export default function DatabaseStructurePanel() {
  const [tables, setTables] = useState<DbTable[]>([]);
  const [meta, setMeta] = useState<DbStructureResponse['meta'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const res = await fetch('/api/db-structure');
      const json = await res.json();
      if (!res.ok) {
        setTables([]);
        setMeta(null);
        setError(json.error || 'Failed to load database structure');
        setHint(json.hint || null);
        return;
      }
      const data = json as DbStructureResponse;
      setTables(data.tables ?? []);
      setMeta(data.meta ?? null);
    } catch {
      setTables([]);
      setMeta(null);
      setError('Network error while loading schema.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 border border-cyan-500/20">
            <Database size={14} />
            PostgreSQL · public schema
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Database structure
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400 max-w-2xl text-sm sm:text-base">
            Tables, columns, primary keys, and foreign-key relationships (same view as Supabase
            schema, rendered as an interactive graph).
          </p>
          {meta && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              {meta.tableCount} tables · {meta.edgeCount} foreign-key links · updated{' '}
              {new Date(meta.fetchedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <Input
              type="search"
              placeholder="Filter tables…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600"
              aria-label="Filter tables"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => load()}
            disabled={loading}
            className="border-cyan-500/30 text-cyan-800 dark:text-cyan-300"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-amber-900 dark:text-amber-100"
        >
          <AlertCircle className="shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium">{error}</p>
            {hint && <p className="text-sm mt-1 opacity-90">{hint}</p>}
          </div>
        </div>
      )}

      {loading && tables.length === 0 ? (
        <GraphSkeleton />
      ) : (
        <DatabaseGraph tables={tables} search={search} />
      )}
    </div>
  );
}
