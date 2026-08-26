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

  // Cho phép build ra thư mục khác để không giẫm lên .next mà `next dev` đang
  // dùng — build đè lúc dev đang chạy làm hỏng CSS/JS của bản xem thử.
  //   NEXT_DIST_DIR=.next-buildcheck npx next build
  distDir: process.env.NEXT_DIST_DIR || '.next',

  /**
   * KHÔNG khai outputFileTracingIncludes trỏ vào public/ ở đây.
   *
   * Từng có dòng `'/**' + '/opengraph-image': ['./public/og/**']` để hàm sinh
   * thẻ chia sẻ đọc được ảnh nền. Vercel hiểu khai báo đó rộng hơn mong đợi và
   * kéo cả thư mục public (319 MB) vào một hàm, khiến hàm nặng 325 MB và build
   * hỏng vì trần là 250 MB. Nay thẻ chia sẻ là ảnh tĩnh dựng sẵn trong
   * public/og/cards nên không hàm nào cần đọc tệp trong public nữa.
   */

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
    // Thêm 1920 và 2048: ảnh nền giờ đi qua next/image và phủ kín màn hình,
    // dừng ở 1536 thì màn 2K/4K phải phóng to lên nên trông mờ. Chỉ máy nào
    // thật sự rộng mới nhận bản lớn, máy nhỏ vẫn lấy bản nhẹ như cũ.
    deviceSizes: [320, 420, 640, 768, 1024, 1280, 1536, 1920, 2048],
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
  
  // KHÔNG tự cấu hình splitChunks ở đây.
  //
  // Bản cũ gom mọi module dùng từ 2 nơi trở lên vào MỘT gói tên 'common'
  // (minChunks: 2). Hệ quả: trang nào cần một mẩu trong đó là phải tải cả gói —
  // đo trên production thấy common-*.js nặng 892 KB giải nén / 267 KB nén và
  // được tải ở mọi trang, bên trong có cả recharts vốn chỉ dùng cho biểu đồ
  // trang quản trị. Cấu hình mặc định của Next.js chia gói theo route nên nhẹ
  // hơn nhiều; để trống để Next tự lo.

  // Headers for caching
  async headers() {
    return [
      /**
       * Khu báo cáo nội bộ: chặn index + không cache + chống nhúng khung.
       *
       * Khai ở ĐÂY chứ không chỉ trong middleware.ts: matcher của middleware
       * loại trừ /api nên header khai bên đó không bao giờ chạm tới API. Khối
       * này phủ cả ba prefix, middleware chỉ còn lo phần chuyển hướng đăng nhập.
       */
      ...['/baocao/:path*', '/baocao', '/api/baocao/:path*', '/api/admin/baocao/:path*'].map((source) => ({
        source,
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          // camera=(self): khu /baocao có chức năng quét CCCD — xem chú thích ở middleware.ts
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=(self)' },
        ],
      })),
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
      /**
       * /trip/mu-cang-chai TỪNG trỏ về /spots/khau-pha. Nay đổ về BÀI PILLAR:
       * URL cũ này là bài giới thiệu điểm đến của web WordPress, gần với bài
       * viết dài hơn là trang điểm bay, và nó đang gánh backlink cũ — cho
       * backlink ấy dồn vào bài đang muốn lên hạng cho "dù lượn Mù Cang Chải".
       *
       * LƯU Ý: việc này KHÔNG giải quyết chuyện hai trang tranh nhau từ khoá.
       * /trip/mu-cang-chai vốn đã 301 từ lâu, không còn nội dung riêng; trang
       * đang thật sự đá nhau với bài pillar là /spots/khau-pha (H1 "Dù lượn Mù
       * Cang Chải", vẫn index, vẫn tự canonical). Muốn hết tranh nhau thì phải
       * xử ở trang đó, không phải ở dòng này.
       */
      { source: '/trip/mu-cang-chai', destination: '/blog/du-luon-mu-cang-chai', permanent: true },
      { source: '/trip/ban-dao-son-tra', destination: '/spots/son-tra', permanent: true },
      { source: '/trip/diem-bay-doi-bu', destination: '/spots/doi-bu', permanent: true },
      { source: '/trip/trai-nghiem-bay-du-luon-lau-camping-phinh-ho', destination: '/spots/tram-tau', permanent: true },
      /**
       * Bắt hết phần còn lại về HUB ĐÚNG CHỦ ĐỀ, không về trang chủ.
       *
       * Đổ mọi URL cũ về "/" là kiểu Google gọi là soft 404: nó thấy hàng chục
       * địa chỉ khác nhau cùng rơi vào một trang chẳng liên quan, nên thường
       * KHÔNG chuyển sức mạnh của link cũ sang. Khách bấm link cũ cũng lạc —
       * đang tìm một điểm bay thì bị ném ra trang chủ.
       */
      { source: '/trip', destination: '/spots', permanent: true },
      { source: '/trip/:path*', destination: '/spots', permanent: true },

      /* ===== /destinations/* — trang tỉnh/thành của web cũ ===== */
      { source: '/destinations/sa-pa', destination: '/spots/muong-hoa-sapa', permanent: true },
      { source: '/destinations/yen-bai', destination: '/spots/khau-pha', permanent: true },
      { source: '/destinations/:path*', destination: '/spots', permanent: true },

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

      /* ===== Đường dẫn cha không có trang riêng =====
       * /spots đã có trang danh sách riêng (app/spots/page.tsx) nên KHÔNG
       * redirect nữa. /fixed vẫn chỉ có /fixed/[key].
       */
      { source: '/fixed', destination: '/blog', permanent: true },

      /* Viên Nam đã gộp vào thẻ Hà Nội (Đồi Bù – Viên Nam) */
      { source: '/spots/vien-nam', destination: '/spots/doi-bu', permanent: true },
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
