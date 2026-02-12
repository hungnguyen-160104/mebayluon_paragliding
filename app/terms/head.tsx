// app/terms/head.tsx
export default function Head() {
  return (
    <>
      <title>Terms & Conditions</title>
      {/* CSS này nằm trong <head>, tải trước khi body vẽ => không còn flash header */}
      <style>{`
        /* Ẩn hoàn toàn chrome của site khi vào /terms */
        header, footer, nav,
        .site-header, .main-header, .navbar, .topbar,
        [role="navigation"], [data-header], [data-footer] {
          display: none !important;
        }

        /* Ẩn mọi widget social/chat dạng nổi */
        .fixed, .sticky,
        [style*="position:fixed"], [style*="position: sticky"],
        .social, .socials, .social-bar, .social-sidebar, .social-floating, .social-icons,
        .chatbot, .chat-bot, .chat-widget, .zalo-chat-widget, .fb_dialog,
        [id*="zalo"], [id*="fb"], [class*="zalo"], [class*="facebook"], [class*="messenger"], [class*="chat"] {
          display: none !important; visibility: hidden !important; pointer-events: none !important;
        }

        /* Loại bỏ khoảng trắng mặc định để không bị viền trắng trên/dưới */
        html, body, #__next { margin: 0 !important; padding: 0 !important; }
        html, body { overflow: auto !important; }
      `}</style>
    </>
  );
}
