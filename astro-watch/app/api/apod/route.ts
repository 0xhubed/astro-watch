import { NextResponse } from 'next/server';
import { getAPOD } from '@/lib/nasa-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || undefined;

  try {
    const apod = await getAPOD(date);

    // Cache for 1 hour on CDN, serve stale up to 24h while revalidating
    return NextResponse.json(apod, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error fetching APOD:', error);
    const message = error instanceof Error ? error.message : '';
    const isUpstream = message.includes('503') || message.includes('502') || message.includes('timeout');
    return NextResponse.json(
      {
        error: isUpstream
          ? 'NASA APOD service is temporarily unavailable. Please try again in a few minutes.'
          : 'Failed to fetch Picture of the Day',
      },
      {
        status: isUpstream ? 503 : 500,
        headers: isUpstream ? { 'Retry-After': '120' } : {},
      },
    );
  }
}
