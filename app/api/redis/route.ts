import { NextResponse } from 'next/server';
import { runRedisDiagnostics } from '@/lib/redis';

function maskRedisUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const hasPassword = parsed.password.length > 0;
    const authPart = parsed.username
      ? `${parsed.username}:${hasPassword ? '***' : ''}@`
      : hasPassword
        ? ':***@'
        : '';
    const portPart = parsed.port ? `:${parsed.port}` : '';
    return `${parsed.protocol}//${authPart}${parsed.hostname}${portPart}`;
  } catch {
    return 'invalid-url';
  }
}

export async function GET() {
  const redisEnabled = process.env.REDIS_ENABLED === 'true';
  const redisUrl = process.env.REDIS_URL?.trim() || '';
  const diagnostics = await runRedisDiagnostics();

  return NextResponse.json({
    data: {
      enabled: redisEnabled,
      configured: Boolean(redisUrl),
      url: redisUrl ? maskRedisUrl(redisUrl) : null,
      circuitMs: Number(process.env.REDIS_CIRCUIT_MS || 300000),
      diagnostics,
      checkedAt: new Date().toISOString(),
    },
  });
}
