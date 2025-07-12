import { NextResponse } from 'next/server';
import { fetchNEOFeed } from '@/lib/nasa-api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || 'week';
  
  // Calculate date range
  const startDate = new Date();
  const endDate = new Date();
  
  switch (range) {
    case 'day':
      endDate.setDate(endDate.getDate() + 1);
      break;
    case 'week':
      endDate.setDate(endDate.getDate() + 7);
      break;
    case 'month':
      // NASA API only allows max 7 days per request
      // For month view, we'll fetch the next 7 days
      endDate.setDate(endDate.getDate() + 7);
      break;
    default:
      endDate.setDate(endDate.getDate() + 7);
  }
  
  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];
  
  try {
    const asteroids = await fetchNEOFeed(start, end);
    return NextResponse.json({ asteroids });
  } catch (error) {
    console.error('Error fetching asteroids:', error);
    return NextResponse.json({ error: 'Failed to fetch asteroids' }, { status: 500 });
  }
}