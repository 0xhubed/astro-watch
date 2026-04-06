import { NextResponse } from 'next/server';
import { loadAnnotationsPublic, loadBriefing } from '@/lib/agent/memory';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [annotations, briefing] = await Promise.all([
    loadAnnotationsPublic(),
    loadBriefing(),
  ]);

  return NextResponse.json({
    annotations,
    briefing,
    lastUpdated: new Date().toISOString(),
  });
}
