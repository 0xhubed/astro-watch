import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://api.mapbox.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
              "img-src 'self' data: blob: https://api.mapbox.com https://*.mapbox.com https://apod.nasa.gov https://nasa.gov",
              "font-src 'self' data:",
              "connect-src 'self' https://api.mapbox.com https://*.mapbox.com https://events.mapbox.com https://api.nasa.gov wss://localhost:* ws://localhost:*",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nasa.gov',
      },
      {
        protocol: 'https',
        hostname: 'apod.nasa.gov',
      },
      {
        protocol: 'https',
        hostname: 'unpkg.com',
      },
    ],
  },
  experimental: {
    optimizeCss: true,
  },
  turbopack: {
    rules: {
      '*.glsl': ['raw-loader'],
      '*.vs': ['raw-loader'],
      '*.fs': ['raw-loader'],
      '*.vert': ['raw-loader'],
      '*.frag': ['raw-loader'],
    },
  },
  webpack: (config, { dev }) => {
    // Only apply webpack config when not using turbopack
    if (!dev) {
      // Support for shader files in production builds
      config.module.rules.push({
        test: /\.(glsl|vs|fs|vert|frag)$/,
        use: ['raw-loader'],
      });
      
      // Support for Web Workers in production
      config.module.rules.push({
        test: /\.worker\.js$/,
        use: { loader: 'worker-loader' },
      });
    }
    
    return config;
  },
};

export default nextConfig;
