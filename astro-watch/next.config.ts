import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'nasa.gov' },
      { protocol: 'https', hostname: 'apod.nasa.gov' },
      { protocol: 'https', hostname: 'unpkg.com' },
    ],
  },
  // Exclude TensorFlow.js from server-side bundling to prevent localStorage errors during SSR
  serverExternalPackages: ['@tensorflow/tfjs'],
  experimental: {
    optimizeCss: true,
  },
};

export default nextConfig;
