import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  turbopack: {},
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'eihouseindia.firebasestorage.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  async redirects() {
    return [
      {
        source: '/article',
        destination: '/articles',
        permanent: true,
      },
      {
        source: '/artical',
        destination: '/articles',
        permanent: true,
      },
      {
        source: '/articals',
        destination: '/articles',
        permanent: true,
      },
      {
        source: '/engineering-tools',
        destination: '/tools',
        permanent: true,
      },
      {
        source: '/engineering-tool',
        destination: '/tools',
        permanent: true,
      },
      {
        source: '/engineering-tools-and-library',
        destination: '/tools',
        permanent: true,
      },
      {
        source: '/engineering-library',
        destination: '/library',
        permanent: true,
      },
    ];
  },
  webpack: (config, { dev }) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
