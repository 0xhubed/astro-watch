import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/agent/run';

export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dryRun') === '1';

  if (dryRun) {
    return NextResponse.json({ status: 'dry_run', message: 'Agent would run here' });
  }

  try {
    const result = await runAgent();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Agent run failed:', error);
    return NextResponse.json({ error: 'Agent run failed' }, { status: 500 });
  }
}
