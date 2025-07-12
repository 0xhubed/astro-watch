import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
