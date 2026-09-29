// components/bct-notice-badge.tsx
/**
 * Logo "Đã thông báo Bộ Công Thương" — gắn ở footer mọi trang.
 *
 * Đường dẫn lấy từ BCT_NOTICE_URL trong lib/legal-entity.ts. Còn null (chưa có
 * mã từ Bộ) thì component KHÔNG vẽ gì — không để ô trống, không để logo giả.
 * Có mã từ Bộ thì chỉ sửa dòng BCT_NOTICE_URL, không cần đụng file này.
 *
 * Dùng thẻ <img> thường chứ không dùng next/image: ảnh nằm trên máy chủ của Bộ
 * (online.gov.vn), đi qua next/image thì phải khai domain trong next.config và
 * ảnh bị tối ưu lại — Bộ yêu cầu gắn nguyên logo và trỏ về trang chi tiết hồ sơ.
 */
import { BCT_LOGO_SRC, BCT_NOTICE_URL } from "@/lib/legal-entity";

export function BctNoticeBadge({ className = "" }: { className?: string }) {
  if (!BCT_NOTICE_URL) return null;

  return (
    <a
      href={BCT_NOTICE_URL}
      target="_blank"
      rel="noopener"
      className={`inline-block ${className}`}
      title="Đã thông báo Bộ Công Thương"
    >
      <img
        src={BCT_LOGO_SRC}
        alt="Đã thông báo Bộ Công Thương"
        width={150}
        height={57}
        loading="lazy"
        className="h-auto w-[150px]"
      />
    </a>
  );
}
