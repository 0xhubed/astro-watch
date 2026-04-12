import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [
  'https://www.astro-watch.com',
  'https://astro-watch.com',
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow localhost on any port for local dev
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const response = NextResponse.next();

  if (isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin!);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: response.headers,
    });
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
