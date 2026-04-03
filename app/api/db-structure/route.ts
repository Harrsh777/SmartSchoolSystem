import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireSuperAdminSession } from '@/lib/super-admin-api';
import type { DbColumn, DbRelation, DbTable, DbStructureResponse } from '@/types/db-structure';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getConnectionString(): string | null {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.DIRECT_URL?.trim() ||
    null
  );
}

async function runQuery<T extends Record<string, unknown>>(
  pool: Pool,
  text: string
): Promise<T[]> {
  const result = await pool.query<T>(text);
  return result.rows;
}

export async function GET(request: NextRequest) {
  const denied = await requireSuperAdminSession(request);
  if (denied) return denied;

  const connectionString = getConnectionString();
  if (!connectionString) {
    return NextResponse.json(
      {
        error:
          'Database connection string is not configured. Add DATABASE_URL (or SUPABASE_DB_URL / DIRECT_URL) from Supabase → Project Settings → Database → Connection string (URI). Use the session pooler or direct connection.',
        code: 'MISSING_DATABASE_URL',
      },
      { status: 503 }
    );
  }

  const pool = new Pool({
    connectionString,
    max: 1,
    ssl:
      connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? undefined
        : { rejectUnauthorized: false },
  });

  try {
    const tableRows = await runQuery<{ table_name: string }>(
      pool,
      `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
    );

    const columnRows = await runQuery<{
      table_name: string;
      column_name: string;
      data_type: string;
      udt_name: string;
      is_nullable: string;
      column_default: string | null;
      ordinal_position: number;
    }>(
      pool,
      `
      SELECT
        table_name,
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `
    );

    const pkRows = await runQuery<{ table_name: string; column_name: string }>(
      pool,
      `
      SELECT kcu.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        AND tc.table_catalog = kcu.table_catalog
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'PRIMARY KEY';
    `
    );

    const fkRows = await runQuery<{
      table_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
    }>(
      pool,
      `
      SELECT
        tc.table_name AS table_name,
        kcu.column_name AS column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_catalog = kcu.table_catalog
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_catalog = tc.table_catalog
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public';
    `
    );

    const pkSet = new Set(
      pkRows.map((r) => `${r.table_name}.${r.column_name}`.toLowerCase())
    );
    const fkByTable = new Map<string, DbRelation[]>();
    const fkColumnSet = new Set<string>();

    for (const fk of fkRows) {
      const rel: DbRelation = {
        column: fk.column_name,
        foreignTable: fk.foreign_table_name,
        foreignColumn: fk.foreign_column_name,
        references: `${fk.foreign_table_name}.${fk.foreign_column_name}`,
      };
      const list = fkByTable.get(fk.table_name) ?? [];
      list.push(rel);
      fkByTable.set(fk.table_name, list);
      fkColumnSet.add(`${fk.table_name}.${fk.column_name}`.toLowerCase());
    }

    const columnsByTable = new Map<string, DbColumn[]>();
    for (const row of columnRows) {
      const key = row.table_name;
      const colKey = `${row.table_name}.${row.column_name}`.toLowerCase();
      const typeLabel =
        row.data_type === 'USER-DEFINED' || row.data_type === 'ARRAY'
          ? row.udt_name || row.data_type
          : row.data_type;
      const col: DbColumn = {
        name: row.column_name,
        type: typeLabel,
        nullable: row.is_nullable === 'YES',
        default: row.column_default,
        isPrimaryKey: pkSet.has(colKey),
        isForeignKey: fkColumnSet.has(colKey),
      };
      const list = columnsByTable.get(key) ?? [];
      list.push(col);
      columnsByTable.set(key, list);
    }

    const tables: DbTable[] = tableRows.map((t) => {
      const name = t.table_name;
      return {
        name,
        columns: columnsByTable.get(name) ?? [],
        relations: fkByTable.get(name) ?? [],
      };
    });

    let edgeCount = 0;
    const edgeKeys = new Set<string>();
    for (const table of tables) {
      for (const rel of table.relations) {
        const ek = `${table.name}:${rel.column}->${rel.foreignTable}`;
        if (!edgeKeys.has(ek)) {
          edgeKeys.add(ek);
          edgeCount += 1;
        }
      }
    }

    const body: DbStructureResponse = {
      tables,
      meta: {
        fetchedAt: new Date().toISOString(),
        tableCount: tables.length,
        edgeCount,
      },
    };

    return NextResponse.json(body);
  } catch (e) {
    console.error('db-structure:', e);
    const message = e instanceof Error ? e.message : 'Query failed';
    return NextResponse.json(
      {
        error: message,
        code: 'INTROSPECTION_FAILED',
        hint:
          'Confirm DATABASE_URL uses a role that can read information_schema (e.g. postgres or service user). Pooler port is often 6543.',
      },
      { status: 502 }
    );
  } finally {
    await pool.end().catch(() => {});
  }
}
