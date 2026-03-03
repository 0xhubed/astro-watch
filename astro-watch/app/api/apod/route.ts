import { NextResponse } from 'next/server';
import { getAPOD } from '@/lib/nasa-api';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || undefined;

  try {
    const apod = await getAPOD(date);
    return NextResponse.json(apod);
  } catch (error) {
    console.error('Error fetching APOD:', error);
    return NextResponse.json({ error: 'Failed to fetch Picture of the Day' }, { status: 500 });
  }
}
