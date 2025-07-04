/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['nasa.gov', 'apod.nasa.gov', 'unpkg.com'],
  },
  experimental: {
    optimizeCss: true,
  },
  webpack: (config) => {
    // Support for shader files
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: ['raw-loader'],
    });
    
    // Support for Web Workers
    config.module.rules.push({
      test: /\.worker\.js$/,
      use: { loader: 'worker-loader' },
    });
    
    return config;
  },
}

module.exports = nextConfig
