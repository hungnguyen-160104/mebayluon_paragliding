// lib/policies/nav.ts
/**
 * Tách riêng khỏi index.ts để footer (client component) nhập nhãn mà KHÔNG kéo
 * toàn bộ nội dung chính sách (vi.ts, en.ts) vào gói JavaScript của trình duyệt.
 */
import type { Locale } from "@/lib/site-config";

import type { PolicySlug } from "./shared";

/**
 * Nhãn ngắn của từng trang — dùng ở footer (6 thứ tiếng, footer đã dịch đủ).
 * Trang đích với fr/ru/zh/hi là bản tiếng Anh.
 */
export const POLICY_NAV_LABELS: Record<Locale, Record<PolicySlug, string>> = {
  vi: {
    "dieu-khoan-su-dung": "Điều khoản sử dụng",
    "thanh-toan": "Chính sách thanh toán",
    "huy-doi-lich-hoan-tien": "Hủy, đổi lịch & hoàn tiền",
    "cung-cap-dich-vu": "Chính sách cung cấp dịch vụ",
    "bao-mat-thong-tin": "Bảo mật thông tin cá nhân",
    "giai-quyet-khieu-nai": "Giải quyết khiếu nại",
  },
  en: {
    "dieu-khoan-su-dung": "Terms of use",
    "thanh-toan": "Payment policy",
    "huy-doi-lich-hoan-tien": "Cancellation & refunds",
    "cung-cap-dich-vu": "Service delivery policy",
    "bao-mat-thong-tin": "Privacy policy",
    "giai-quyet-khieu-nai": "Complaints & disputes",
  },
  fr: {
    "dieu-khoan-su-dung": "Conditions d’utilisation",
    "thanh-toan": "Paiement",
    "huy-doi-lich-hoan-tien": "Annulation & remboursement",
    "cung-cap-dich-vu": "Prestation du service",
    "bao-mat-thong-tin": "Confidentialité",
    "giai-quyet-khieu-nai": "Réclamations & litiges",
  },
  ru: {
    "dieu-khoan-su-dung": "Условия использования",
    "thanh-toan": "Оплата",
    "huy-doi-lich-hoan-tien": "Отмена и возврат",
    "cung-cap-dich-vu": "Предоставление услуг",
    "bao-mat-thong-tin": "Конфиденциальность",
    "giai-quyet-khieu-nai": "Жалобы и споры",
  },
  zh: {
    "dieu-khoan-su-dung": "使用条款",
    "thanh-toan": "付款政策",
    "huy-doi-lich-hoan-tien": "取消、改期与退款",
    "cung-cap-dich-vu": "服务提供政策",
    "bao-mat-thong-tin": "隐私政策",
    "giai-quyet-khieu-nai": "投诉与争议",
  },
  hi: {
    "dieu-khoan-su-dung": "उपयोग की शर्तें",
    "thanh-toan": "भुगतान नीति",
    "huy-doi-lich-hoan-tien": "रद्दीकरण और रिफ़ंड",
    "cung-cap-dich-vu": "सेवा प्रदान नीति",
    "bao-mat-thong-tin": "गोपनीयता नीति",
    "giai-quyet-khieu-nai": "शिकायत और विवाद",
  },
};
