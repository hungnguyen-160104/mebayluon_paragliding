// lib/policies/index.ts
/**
 * CÁC TRANG CHÍNH SÁCH — bắt buộc để thông báo website TMĐT bán hàng với Bộ
 * Công Thương (online.gov.vn) theo Nghị định 52/2013/NĐ-CP (sửa bởi
 * 85/2021/NĐ-CP) và Thông tư 47/2014/TT-BCT.
 *
 * Mỗi chính sách một URL riêng: /chinh-sach/<slug> (trang app/chinh-sach).
 * Link ở footer mọi trang + sitemap đều đọc danh sách POLICY_SLUGS dưới đây —
 * thêm/bớt trang thì sửa ở đây là đủ.
 *
 * NGUỒN NỘI DUNG: chép lại đúng các điều khoản ĐANG CÓ trên web — lib/terms.ts
 * (bản khách tích đồng ý khi đặt bay), trang /pre-notice, bước xác nhận đặt bay
 * (components/booking/review-confirm-step.tsx), thư xác nhận
 * (lib/email/customer-booking.ts) và luật sửa booking
 * (services/booking-khach-sua.service.ts). Sửa điều khoản ở những nơi đó thì
 * nhớ đồng bộ sang đây, và ngược lại.
 *
 * Các mốc thời gian (hạn hoàn tiền, hạn trả lời khiếu nại) nằm ở
 * POLICY_ASSUMPTIONS; hủy/hoàn tiền, VAT, đặt cọc, lưu dữ liệu, bên nhận dữ
 * liệu — chủ doanh nghiệp đã chốt 30/09/2026.
 *
 * NGÔN NGỮ: tiếng Việt (chuẩn, có giá trị pháp lý) + tiếng Anh. Bốn thứ tiếng
 * còn lại (fr/ru/zh/hi) hiện bản tiếng Anh — metadata khai
 * `availableLocales: ["vi", "en"]` nên các bản đó tự canonical về /en, noindex.
 */
import type { Locale } from "@/lib/site-config";

import { POLICIES_EN } from "./en";
import { POLICIES_VI } from "./vi";

export {
  POLICY_SLUGS,
  POLICY_UPDATED_AT,
  POLICY_ASSUMPTIONS,
  policyHref,
  type PolicySlug,
  type PolicyLang,
  type PolicyDoc,
} from "./shared";
import type { PolicyDoc, PolicyLang, PolicySlug } from "./shared";
import { POLICY_SLUGS } from "./shared";

/** Ngôn ngữ nội dung: tiếng Việt giữ nguyên, mọi ngôn ngữ khác dùng tiếng Anh. */
export function policyLangOf(locale: Locale | string): PolicyLang {
  return locale === "vi" ? "vi" : "en";
}

export function getPolicy(slug: PolicySlug, lang: PolicyLang): PolicyDoc {
  return (lang === "vi" ? POLICIES_VI : POLICIES_EN)[slug];
}

export function isPolicySlug(v: string): v is PolicySlug {
  return (POLICY_SLUGS as readonly string[]).includes(v);
}

export { POLICY_NAV_LABELS } from "./nav";
