'use client';

import type { CSSProperties, MouseEvent } from 'react';
import { useCallback, useMemo, useEffect, useRef } from 'react';
import dagre from 'dagre';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TableNode, { type TableNodeData } from './TableNode';
import type { DbTable } from '@/types/db-structure';

const nodeTypes = { tableNode: TableNode };

const NODE_WIDTH = 260;

function estimateNodeHeight(columnCount: number): number {
  const header = 52;
  const row = 26;
  const maxRows = 12;
  const rows = Math.min(columnCount || 1, maxRows);
  const body = rows * row + 16;
  const cap = 280;
  return Math.min(cap, header + body);
}

function layoutWithDagre(
  tables: DbTable[],
  getHeight: (name: string) => number
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    ranksep: 90,
    nodesep: 45,
    marginx: 24,
    marginy: 24,
  });

  const nodeIds = new Set(tables.map((t) => t.name));

  for (const t of tables) {
    g.setNode(t.name, {
      width: NODE_WIDTH,
      height: getHeight(t.name),
    });
  }

  const edges: Edge[] = [];
  const layoutPair = new Set<string>();
  let ei = 0;
  for (const table of tables) {
    for (const rel of table.relations) {
      if (!nodeIds.has(rel.foreignTable) || table.name === rel.foreignTable) continue;
      const pair = `${table.name}\0${rel.foreignTable}`;
      if (!layoutPair.has(pair)) {
        layoutPair.add(pair);
        g.setEdge(table.name, rel.foreignTable, {});
      }
      const id = `fk-${table.name}-${rel.column}-${rel.foreignTable}-${ei++}`;
      edges.push({
        id,
        source: table.name,
        target: rel.foreignTable,
        label: rel.column,
        type: 'smoothstep',
        animated: false,
        style: { strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
        labelStyle: { fill: 'var(--db-edge-label)', fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: 'var(--db-edge-label-bg)', fillOpacity: 0.95 },
        labelBgPadding: [4, 6] as [number, number],
        labelBgBorderRadius: 4,
      });
    }
  }

  dagre.layout(g);

  const nodes: Node[] = tables.map((t) => {
    const nodeWithPosition = g.node(t.name);
    const h = getHeight(t.name);
    const x = nodeWithPosition.x - NODE_WIDTH / 2;
    const y = nodeWithPosition.y - h / 2;
    return {
      id: t.name,
      type: 'tableNode',
      position: { x, y },
      data: {
        tableName: t.name,
        columns: t.columns,
        dimmed: false,
        selected: false,
        connected: false,
      } satisfies TableNodeData,
      style: { width: NODE_WIDTH },
    };
  });

  return { nodes, edges };
}

function buildNeighborMap(edges: Edge[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const add = (a: string, b: string) => {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a)!.add(b);
  };
  for (const e of edges) {
    add(e.source, e.target);
    add(e.target, e.source);
  }
  return map;
}

export interface DatabaseGraphProps {
  tables: DbTable[];
  search: string;
  className?: string;
}

export default function DatabaseGraph({ tables, search, className }: DatabaseGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const selectedRef = useRef<string | null>(null);
  const neighborMapRef = useRef<Map<string, Set<string>>>(new Map());

  const filteredTables = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) => t.name.toLowerCase().includes(q));
  }, [tables, search]);

  const heightByTable = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of filteredTables) {
      m.set(t.name, estimateNodeHeight(t.columns.length));
    }
    return m;
  }, [filteredTables]);

  const { nodes: laidOutNodes, edges: laidOutEdges } = useMemo(() => {
    return layoutWithDagre(filteredTables, (name) => heightByTable.get(name) ?? 120);
  }, [filteredTables, heightByTable]);

  useEffect(() => {
    neighborMapRef.current = buildNeighborMap(laidOutEdges);
    setNodes(laidOutNodes);
    setEdges(laidOutEdges);
    selectedRef.current = null;
  }, [laidOutNodes, laidOutEdges, setNodes, setEdges]);

  const applyHighlight = useCallback(
    (selectedId: string | null) => {
      selectedRef.current = selectedId;
      const neighbors = selectedId ? neighborMapRef.current.get(selectedId) : undefined;

      setNodes((nds) =>
        nds.map((n) => {
          const id = n.id;
          const data = n.data as TableNodeData;
          const selected = selectedId !== null && id === selectedId;
          const connected =
            selectedId !== null &&
            id !== selectedId &&
            neighbors != null &&
            neighbors.has(id);
          const dimmed =
            selectedId !== null &&
            id !== selectedId &&
            (neighbors == null || !neighbors.has(id));
          return {
            ...n,
            data: {
              ...data,
              selected,
              connected,
              dimmed,
            },
          };
        })
      );

      setEdges((eds) =>
        eds.map((e) => {
          const active =
            selectedId !== null &&
            (e.source === selectedId ||
              e.target === selectedId ||
              (neighbors?.has(e.source) && neighbors?.has(e.target)));
          return {
            ...e,
            style: {
              ...e.style,
              stroke: active ? '#06b6d4' : '#94a3b8',
              strokeWidth: active ? 2.5 : 1.5,
              opacity: selectedId === null ? 1 : active ? 1 : 0.2,
            },
            labelStyle: {
              ...e.labelStyle,
              opacity: selectedId === null ? 1 : active ? 1 : 0.25,
            },
          };
        })
      );
    },
    [setNodes, setEdges]
  );

  useEffect(() => {
    applyHighlight(null);
  }, [laidOutNodes, laidOutEdges, applyHighlight]);

  const onNodeClick = useCallback(
    (_: MouseEvent, node: Node) => {
      const id = node.id;
      if (selectedRef.current === id) {
        applyHighlight(null);
      } else {
        applyHighlight(id);
      }
    },
    [applyHighlight]
  );

  const onPaneClick = useCallback(() => {
    applyHighlight(null);
  }, [applyHighlight]);

  if (filteredTables.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 text-slate-500 min-h-[420px] ${className ?? ''}`}
      >
        {search.trim() ? 'No tables match your search.' : 'No tables to display.'}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-950 min-h-[520px] h-[min(72vh,820px)] ${className ?? ''}`}
      style={
        {
          '--db-edge-label': 'rgb(15 23 42)',
          '--db-edge-label-bg': 'rgb(241 245 249)',
        } as CSSProperties
      }
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1.1 }}
        minZoom={0.08}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
        onlyRenderVisibleElements
      >
        <Background gap={20} size={1} className="!bg-slate-100/80 dark:!bg-slate-900/80" />
        <Controls className="!bg-white/95 dark:!bg-slate-800/95 !border-slate-200 dark:!border-slate-600 !shadow-md" />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!bg-white/90 dark:!bg-slate-800/90 !border-slate-200 dark:!border-slate-600"
        />
        <Panel position="top-left" className="text-xs text-slate-500 dark:text-slate-400 m-2 max-w-[200px]">
          Click a table to highlight related tables. Drag to pan, scroll to zoom.
        </Panel>
      </ReactFlow>
    </div>
  );
}
