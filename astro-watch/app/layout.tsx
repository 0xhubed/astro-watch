'use client';

import { Inter } from 'next/font/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 3,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  }));

  return (
    <html lang="en">
      <head>
        <title>AstroWatch</title>
        <meta name="description" content="Browse and visualize near-Earth asteroids using NASA data" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#0a0a0f" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen flex flex-col">
            <main className="flex-grow">
              {children}
            </main>
            <footer className="text-center py-4 text-sm text-gray-500">
              © 2026 AstroWatch · <a href="mailto:danielhuber.dev@proton.me" className="text-blue-400 hover:text-blue-300 transition-colors">danielhuber.dev@proton.me</a>
            </footer>
          </div>
        </QueryClientProvider>
        <Analytics />
      </body>
    </html>
  );
}