// mbl-paragliding/next.config.mjs
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root to this project so Next.js doesn't pick up a stray
  // pnpm-lock.yaml in a parent directory (e.g. C:\Users\Admin\). A wrong root
  // breaks module resolution/caching and triggers webpack "reading 'call'" errors.
  outputFileTracingRoot: __dirname,

  // Enable image optimization for better performance
  images: {
    remotePatterns: [
      { hostname: '**.cloudinary.com' },
      { hostname: 'res.cloudinary.com' },
      { hostname: 'cdn.pixabay.com' },
      { hostname: 'pixabay.com' },
      { hostname: 'images.unsplash.com' },
      { hostname: 'lh3.googleusercontent.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 year cache for images
    deviceSizes: [320, 420, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: false,
  },
  
  // Enable compression for gzip/brotli
  compress: true,
  
  // Strict type checking in development
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  
  // Disable ESLint during build (run separately via `pnpm lint`)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  
  // 🔴 SECURITY FIX: Disable source maps in production
  productionBrowserSourceMaps: false,
  
  // Webpack optimization
  webpack: (config, { isServer, dev }) => {
    if (!isServer && !dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Separate vendor bundles
            default: false,
            vendors: false,
            
            // React & related
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|react-hook-form)[\\/]/,
              name: 'react',
              priority: 20,
              reuseExistingChunk: true,
              enforce: true,
            },
            
            // UI libraries
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|sonner)[\\/]/,
              name: 'ui',
              priority: 15,
              reuseExistingChunk: true,
              enforce: true,
            },
            
            // Animations
            animations: {
              test: /[\\/]node_modules[\\/](framer-motion)[\\/]/,
              name: 'animations',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            
            // Common
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
              name: 'common',
            },
          },
        },
      };
    }
    return config;
  },
  
  // Headers for caching
  async headers() {
    return [
      // Static images — cache 1 năm
      {
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/pilots/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/knowledge/:path*.(jpg|jpeg|png|webp|avif|gif|svg)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // Fonts — cache 1 năm
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // Background images
      {
        source: '/:file(hinh-nen|cua-hang|knowledge|per-flight|contact|tin-tuc-2|pilots/hero).(jpg|jpeg|png|webp)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
      // Allow /terms to be embedded in iframes on same origin (for booking modal)
      {
        source: '/terms',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
  // Redirects for old URLs (SEO)
  async redirects() {
    return [];
  },
  
  // Rewrites for internal routing
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
