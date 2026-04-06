import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/agent/run';

export const maxDuration = 60;

export async function GET(request: Request) {
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
    return NextResponse.json(
      { error: 'Agent run failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
