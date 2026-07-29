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
  //
  // Web cũ chạy WordPress với cấu trúc URL khác hẳn (/trip/..., /destinations/...,
  // /YYYY/MM/DD/slug/). Google vẫn index các URL này (kiểm tra site:mebayluon.com
  // ngày 30-7-2026) — không redirect thì backlink + thứ hạng cũ đổ vào trang 404.
  // Nguyên tắc: URL cũ → trang MỚI cùng chủ đề (điểm bay, phi công); không có
  // trang tương ứng thì về hub gần nhất (/blog, /pilots, /).
  // Bài WP cũ KHÔNG được migrate cùng slug vào DB blog mới (đã kiểm tra),
  // nên không thể redirect động /YYYY/MM/DD/:slug -> /blog/:slug.
  async redirects() {
    return [
      /* ===== /trip/* — trang điểm bay của web cũ ===== */
      { source: '/trip/muong-hoa-sapa', destination: '/spots/muong-hoa-sapa', permanent: true },
      { source: '/trip/mu-cang-chai', destination: '/spots/khau-pha', permanent: true },
      { source: '/trip/ban-dao-son-tra', destination: '/spots/son-tra', permanent: true },
      { source: '/trip/diem-bay-doi-bu', destination: '/spots/doi-bu', permanent: true },
      { source: '/trip/trai-nghiem-bay-du-luon-lau-camping-phinh-ho', destination: '/spots/tram-tau', permanent: true },
      { source: '/trip', destination: '/', permanent: true },
      { source: '/trip/:path*', destination: '/', permanent: true },

      /* ===== /destinations/* — trang tỉnh/thành của web cũ ===== */
      { source: '/destinations/sa-pa', destination: '/spots/muong-hoa-sapa', permanent: true },
      { source: '/destinations/yen-bai', destination: '/spots/khau-pha', permanent: true },
      { source: '/destinations/:path*', destination: '/', permanent: true },

      /* ===== Bài viết WordPress cũ (URL theo ngày) =====
       * Ưu tiên trỏ vào BÀI BLOG MỚI cùng chủ đề (giữ được ý định tìm kiếm
       * của người dùng và độ liên quan cho Google); chỉ khi không có bài
       * tương ứng mới trỏ về trang điểm bay.
       */
      // Bài "xe khách đi Mù Cang Chải" là bài nhiều truy cập nhất của web cũ
      // -> bài tổng hợp xe đi Mù Cang Chải trên web mới.
      { source: '/2024/07/20/thong-tin-xe-khach-di-mu-cang-chai', destination: '/blog/xe-di-mu-cang-chai', permanent: true },
      { source: '/2024/08/14/cach-di-chuyen-toi-tram-tau-yen-bai', destination: '/blog/di-chuyen-den-tram-tau', permanent: true },
      { source: '/2024/08/15/10-dia-diem-du-lich-o-mu-cang-chai-khong-nen-bo-qua', destination: '/blog/cam-nang-du-lich-mu-cang-chai-lao-cai', permanent: true },
      { source: '/2024/08/14/bay-du-luon-thu-hut-dan-van-phong', destination: '/blog/the-thao-ngoai-troi-ha-noi-du-luon', permanent: true },
      { source: '/2024/08/14/cach-di-chuyen-toi-doi-bu-chuong-my-ha-noi', destination: '/blog/diem-bay-du-luon-doi-bu', permanent: true },
      { source: '/2025/08/10/phi-cong-pilot-dinh-the-anh', destination: '/pilots/dinh-the-anh', permanent: true },
      { source: '/2025/08/06/phi-cong-pilot-du-luon-dang-van-my', destination: '/pilots/dang-van-my', permanent: true },
      { source: '/2025/02/06/du-lich-sapa', destination: '/spots/muong-hoa-sapa', permanent: true },
      { source: '/2025/02/06/cach-di-chuyen-sapa', destination: '/spots/muong-hoa-sapa', permanent: true },
      { source: '/2024/08/14/kham-pha-ban-dao-son-tra-vien-ngoc-quy-cua-du-lich-da-nang', destination: '/spots/son-tra', permanent: true },

      /* ===== Catch-all cho mọi bài WP cũ khác chưa liệt kê ===== */
      { source: '/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug*', destination: '/blog', permanent: true },

      /* ===== Cấu trúc WordPress chuẩn ===== */
      { source: '/tag/:path*', destination: '/blog', permanent: true },
      { source: '/category/:path*', destination: '/blog', permanent: true },
      { source: '/author/:path*', destination: '/pilots', permanent: true },
      { source: '/feed', destination: '/blog', permanent: true },

      /* ===== Route cũ của chính web Next (đã xoá) ===== */
      { source: '/about', destination: '/', permanent: true },
    ];
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
