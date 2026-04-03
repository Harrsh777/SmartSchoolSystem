'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Key, Link2 } from 'lucide-react';
import type { DbColumn } from '@/types/db-structure';

export type TableNodeData = {
  tableName: string;
  columns: DbColumn[];
  dimmed: boolean;
  selected: boolean;
  connected: boolean;
};

function TableNodeInner({ data }: NodeProps) {
  const d = data as TableNodeData;
  const { tableName, columns, dimmed, selected, connected } = d;

  return (
    <div
      className={[
        'rounded-xl border-2 bg-white dark:bg-slate-900 shadow-lg transition-all duration-200 min-w-[240px] max-w-[280px]',
        selected
          ? 'border-cyan-500 ring-2 ring-cyan-400/50 shadow-cyan-500/20'
          : connected
            ? 'border-teal-400/80 ring-1 ring-teal-400/30'
            : 'border-slate-200 dark:border-slate-600',
        dimmed ? 'opacity-40 scale-[0.98]' : 'opacity-100',
      ].join(' ')}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-white dark:!border-slate-900"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-cyan-500 !border-2 !border-white dark:!border-slate-900"
      />

      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-800 dark:to-slate-800/80 rounded-t-[10px]">
        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate" title={tableName}>
          {tableName}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">
          {columns.length} column{columns.length === 1 ? '' : 's'}
        </p>
      </div>

      <div className="max-h-[220px] overflow-y-auto px-2 py-2 space-y-0.5 nodrag nopan cursor-default">
        {columns.length === 0 ? (
          <p className="text-xs text-slate-400 px-1 py-2">No columns</p>
        ) : (
          columns.map((col) => (
            <div
              key={col.name}
              className="flex items-start gap-1.5 text-[11px] leading-tight py-1 px-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/80"
            >
              <span className="shrink-0 mt-0.5 text-slate-400">
                {col.isPrimaryKey ? (
                  <Key size={12} className="text-amber-500" aria-label="PK" />
                ) : col.isForeignKey ? (
                  <Link2 size={12} className="text-cyan-600 dark:text-cyan-400" aria-label="FK" />
                ) : (
                  <span className="inline-block w-3" />
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="font-mono text-slate-800 dark:text-slate-200 break-all">{col.name}</span>
                <span className="text-slate-500 dark:text-slate-500 ml-1">{col.type}</span>
                {!col.nullable && (
                  <span className="text-rose-500 dark:text-rose-400 ml-1" title="NOT NULL">
                    *
                  </span>
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default memo(TableNodeInner);
