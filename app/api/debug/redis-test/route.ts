import { NextResponse } from 'next/server';
import { runRedisDiagnostics } from '@/lib/redis';

/**
 * GET /api/debug/redis-test
 * Runs a simple Redis write/read/keys/ttl diagnostic.
 */
export async function GET() {
  const result = await runRedisDiagnostics();
  return NextResponse.json({ data: result }, { status: result.connected ? 200 : 503 });
}
