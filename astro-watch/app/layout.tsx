import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.astro-watch.com'),
  title: 'AstroWatch — explore near-Earth asteroids',
  description:
    'Browse and visualize near-Earth asteroids using NASA data — a 3D solar-system scene, AI chat, impact simulation and daily discovery.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'AstroWatch',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <main className="flex-grow">
              {children}
            </main>
            <footer className="text-center py-4 text-sm text-gray-500">
              © 2026 AstroWatch · <a href="mailto:danielhuber.dev@proton.me" className="text-blue-400 hover:text-blue-300 transition-colors">danielhuber.dev@proton.me</a>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
