// lib/policies/shared.ts
/**
 * Phần dùng chung của các trang chính sách (tách riêng để vi.ts / en.ts nhập
 * vào mà không vòng lại index.ts). Giải thích tổng thể: xem lib/policies/index.ts.
 */
import { LEGAL_ENTITY } from "@/lib/legal-entity";

export const POLICY_SLUGS = [
  "dieu-khoan-su-dung",
  "thanh-toan",
  "huy-doi-lich-hoan-tien",
  "cung-cap-dich-vu",
  "bao-mat-thong-tin",
  "giai-quyet-khieu-nai",
] as const;

export type PolicySlug = (typeof POLICY_SLUGS)[number];
export type PolicyLang = "vi" | "en";

export type PolicyDoc = {
  /** Tiêu đề trang (h1 + thẻ title). */
  title: string;
  /** Mô tả ngắn cho thẻ meta description. */
  description: string;
  /** Nội dung HTML tĩnh do mình viết — không chứa dữ liệu người dùng. */
  html: string;
};

/** Ngày cập nhật chính sách gần nhất, hiện ở đầu mỗi trang. */
export const POLICY_UPDATED_AT = "30/09/2026";

/**
 * CÁC MỐC THỜI GIAN TRONG CHÍNH SÁCH — CHỦ DOANH NGHIỆP ĐÃ CHỐT 30/09/2026.
 * Đổi số ở đây là cả bản Việt lẫn bản Anh đổi theo.
 */
export const POLICY_ASSUMPTIONS = {
  /** Hạn hoàn tiền (ngày làm việc) kể từ khi hai bên thống nhất khoản hoàn. */
  refundWorkingDays: 5,
  /** Hạn trả lời khiếu nại (ngày làm việc) kể từ khi nhận khiếu nại. */
  complaintResponseWorkingDays: 1,
} as const;

/** Viết số ngày dạng "05", "01" cho đúng văn phong văn bản. */
export const pad2 = (n: number) => String(n).padStart(2, "0");

/** Đường dẫn trang chính sách theo ngôn ngữ nội dung. */
export function policyHref(slug: PolicySlug, lang: PolicyLang = "vi"): string {
  return lang === "en" ? `/en/chinh-sach/${slug}` : `/chinh-sach/${slug}`;
}


/** Link nội bộ sang một trang chính sách khác, dùng trong nội dung HTML. */
export function policyLink(slug: PolicySlug, lang: PolicyLang, text: string): string {
  return `<a href="${policyHref(slug, lang)}">${text}</a>`;
}

/**
 * Khối thông tin pháp nhân (nguyên văn Giấy CN ĐKDN) — in cuối mỗi trang chính
 * sách. Đọc thẳng từ lib/legal-entity.ts, không gõ lại ở đây.
 */
export function entityInfoHtml(lang: PolicyLang): string {
  const e = LEGAL_ENTITY;
  const r = e.registration;
  if (lang === "vi") {
    return `<ul>
<li><b>Tên doanh nghiệp:</b> ${e.legalName} (${e.legalNameEn})</li>
<li><b>Tên giao dịch:</b> ${e.tradeName}</li>
<li><b>Mã số doanh nghiệp / Mã số thuế:</b> ${e.taxCode} — đăng ký lần đầu ngày ${r.firstIssuedDate}, ${r.latestChange}; nơi cấp: ${r.issuer}</li>
<li><b>Trụ sở chính:</b> ${e.registeredOffice}</li>
<li><b>Người đại diện theo pháp luật:</b> ${e.legalRepresentative.name} – ${e.legalRepresentative.title}</li>
<li><b>Điện thoại:</b> ${e.registeredPhone} — <b>Email:</b> ${e.registeredEmail}</li>
<li><b>Hotline chăm sóc khách hàng:</b> ${e.phones.join(" | ")} (Zalo, WhatsApp) — <b>Email:</b> ${e.email}</li>
<li><b>Website:</b> ${e.website}</li>
</ul>`;
  }
  return `<ul>
<li><b>Company:</b> ${e.legalNameEn} (${e.legalName})</li>
<li><b>Trading name:</b> ${e.tradeName}</li>
<li><b>Enterprise code / Tax code:</b> ${e.taxCode} — first registered on ${r.firstIssuedDate}, ${r.latestChangeEn}; issued by: ${r.issuerEn}</li>
<li><b>Head office:</b> ${e.registeredOffice}</li>
<li><b>Legal representative:</b> ${e.legalRepresentative.name} – ${e.legalRepresentative.titleEn}</li>
<li><b>Phone:</b> ${e.registeredPhone} — <b>Email:</b> ${e.registeredEmail}</li>
<li><b>Customer hotline:</b> ${e.phones.join(" | ")} (Zalo, WhatsApp) — <b>Email:</b> ${e.email}</li>
<li><b>Website:</b> ${e.website}</li>
</ul>`;
}
