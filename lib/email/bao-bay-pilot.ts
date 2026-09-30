// lib/email/bao-bay-pilot.ts
/**
 * THƯ XÁC NHẬN BÁO BAY gửi cho PHI CÔNG (chủ 01/10), từ hộp dangky.mebayluon
 * (sendSmtpMail sender "dangky").
 *
 * Chữ lấy từ cùng bảng chữ của trang /baobay (lib/i18n/bao-bay) nên thư nói
 * đúng những câu phi công vừa đọc trên trang: trang tiếng Việt → thư tiếng
 * Việt kèm tiếng Anh cùng dòng; trang thứ tiếng khác → thư đúng thứ tiếng đó.
 * Thư chỉ là bản lưu cho phi công — mọi con số đã chốt ở máy chủ trước khi gửi.
 */

import {
  BAO_BAY_HOTLINE,
  BAO_BAY_RADIO,
  type BaoBayFee,
} from "@/lib/bao-bay";
import { vienNamRules } from "@/lib/bao-bay-rules";
import { baoBayBilingual, type BiText } from "@/lib/i18n/bao-bay";
import { formatVnDate, formatVnd } from "@/lib/pilot-event";
import { SITE_URL } from "@/lib/site-config";
import type { IFlightNotice } from "@/models/FlightNotice.model";

const esc = (s?: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Một câu hai thứ tiếng trong thư: chính + " / phụ" nhỏ nhạt cùng dòng (như trang). */
function bi(t: BiText): string {
  return t.sub
    ? `${esc(t.main)}<span style="color:#9CA3AF;font-size:0.85em;font-weight:400;"> / ${esc(t.sub)}</span>`
    : esc(t.main);
}

/** Số tiền không bao giờ bị bẻ dòng — khoảng trắng không ngắt trước "đ". */
const vnd = (n: number) => formatVnd(n).replace(/\s+(?=đ$)/, " ");

export function baoBayPilotMail(input: {
  notice: IFlightNotice;
  fee: BaoBayFee;
  transferNote: string;
  lang: string;
}): { subject: string; html: string } {
  const { notice: n, fee, transferNote } = input;
  const lang = ["vi", "en", "fr", "ru", "zh", "hi"].includes(input.lang) ? input.lang : "vi";
  const { b, s } = baoBayBilingual(lang);
  const pageUrl = `${SITE_URL}${lang === "vi" ? "" : `/${lang}`}/baobay`;
  const siteName = s((d) => d.spotName[n.spot], " / ");

  const subject = `${s((d) => d.mailSubject, " / ")} ${n.noticeCode} · ${siteName}`;

  /* ---- dòng thông tin ---- */
  const rows: Array<[string, string]> = [
    [bi(b((d) => d.okCode)), `<b style="font-family:ui-monospace,Menlo,monospace;font-size:18px;">${esc(n.noticeCode)}</b>`],
    [bi(b((d) => d.okSpot)), `<b>${bi(b((d) => d.spotName[n.spot]))}</b>`],
    [bi(b((d) => d.okDates)), `<b>${esc(n.dates.map(formatVnDate).join(" · "))}</b>`],
    [bi(b((d) => d.step4)), `<b>${bi(b((d) => d.okFeeMode[fee.feeMode]))}</b>`],
  ];
  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:5px 12px 5px 0;color:#6B7280;font-size:13px;vertical-align:top;white-space:nowrap;">${k}</td><td style="padding:5px 0;font-size:14px;color:#111827;">${v}</td></tr>`,
    )
    .join("");

  /* ---- kết quả phí ---- */
  let feeHtml: string;
  if (fee.total > 0) {
    feeHtml = `<div style="margin-top:14px;padding:12px 14px;border-radius:10px;background:#FFFBEB;border:1px solid #FCD34D;">
      <div style="font-size:15px;font-weight:700;color:#92400E;">⏳ ${bi(b((d) => d.okPendingPay))}</div>
      <div style="margin-top:4px;font-size:22px;font-weight:800;color:#B45309;white-space:nowrap;">${esc(vnd(fee.total))}</div>
      ${transferNote ? `<div style="margin-top:6px;font-size:13px;color:#374151;">${bi(b((d) => d.payNote))}: <b style="font-family:ui-monospace,Menlo,monospace;">${esc(transferNote)}</b></div>` : ""}
    </div>`;
  } else {
    const extra = fee.coveredByPass
      ? `<div style="margin-top:4px;font-size:13px;color:#065F46;">🎫 ${bi(b((d) => d.passNotice(formatVnDate(fee.coveredByPass?.until ?? ""))))}</div>`
      : "";
    feeHtml = `<div style="margin-top:14px;padding:12px 14px;border-radius:10px;background:#ECFDF5;border:1px solid #6EE7B7;">
      <div style="font-size:15px;font-weight:700;color:#065F46;">✅ ${bi(b((d) => d.noFeeTitle))}</div>${extra}
    </div>`;
  }
  if (fee.passFrom && fee.passValidUntil) {
    feeHtml += `<div style="margin-top:8px;font-size:13px;color:#065F46;">${bi(
      b((d) => d.newPassNotice(formatVnDate(fee.passFrom ?? ""), formatVnDate(fee.passValidUntil ?? ""))),
    )}</div>`;
  }

  /* ---- bộ đàm + khẩn cấp ---- */
  const rules = n.spot === "vien-nam" ? vienNamRules(lang) : null;
  const radioHtml = `<div style="margin-top:16px;padding:12px 14px;border-radius:10px;background:#EFF6FF;border:1px solid #BFDBFE;font-size:14px;color:#1E3A8A;">
    <div style="font-weight:700;">📻 ${bi(b((d) => d.radioTitle))}</div>
    <div style="margin-top:4px;">${BAO_BAY_RADIO.map((r) => `<b>${esc(r.name)}</b> ${esc(r.freq)}`).join(" · ")}</div>
    <div style="margin-top:8px;font-weight:700;color:#B91C1C;">🚨 ${bi(b((d) => d.emergencyTitle))}:
      <a href="${esc(BAO_BAY_HOTLINE.tel)}" style="color:#B91C1C;">${esc(BAO_BAY_HOTLINE.display)}</a>${
        rules
          ? rules.emergency
              .map((e) => ` · <a href="${esc(e.tel)}" style="color:#B91C1C;">${esc(e.display)}</a> (${esc(e.name)})`)
              .join("")
          : ""
      }
    </div>
  </div>`;

  /* ---- nhắc nội quy ---- */
  const rulesItems = rules
    ? [...rules.zoneNotes, ...(rules.items.find((i) => i.sub)?.sub ?? [])]
    : [];
  const rulesHtml = `<div style="margin-top:16px;font-size:14px;color:#111827;">
    <div style="font-weight:700;">📋 ${bi(b((d) => d.mailRulesTitle))}${rules ? ` — ${esc(rules.title)}` : ""}</div>
    ${
      rules
        ? `<ul style="margin:6px 0 0;padding-left:20px;line-height:1.6;">${rulesItems.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
           <div style="margin-top:6px;"><a href="${esc(pageUrl)}#rules" style="color:#B45309;">${bi(b((d) => d.mailRulesLink))} →</a></div>`
        : `<div style="margin-top:4px;line-height:1.6;">${bi(b((d) => d.mailRulesGeneric))}</div>`
    }
  </div>`;

  const html = `<!doctype html>
<html lang="${lang}"><body style="margin:0;padding:0;background:#F9FAFB;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F9FAFB;padding:18px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <tr><td style="background:#B45309;padding:16px 20px;color:#ffffff;">
    <div style="font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;opacity:.9;">Mebayluon Paragliding</div>
    <div style="margin-top:4px;font-size:20px;font-weight:800;">🪂 ${bi(b((d) => d.okTitle))}</div>
  </td></tr>
  <tr><td style="padding:16px 20px 22px;">
    <p style="margin:0 0 10px;font-size:14px;color:#374151;">${bi(b((d) => d.mailIntro))}</p>
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">${rowsHtml}</table>
    ${feeHtml}
    ${radioHtml}
    ${rulesHtml}
    <div style="margin-top:18px;padding-top:12px;border-top:1px solid #E5E7EB;font-size:13px;color:#6B7280;">
      ${bi(b((d) => d.mailBack))} <a href="${esc(pageUrl)}" style="color:#B45309;font-weight:700;">${esc(pageUrl.replace(/^https?:\/\//, ""))}</a>
    </div>
  </td></tr>
</table></td></tr></table>
</body></html>`;

  return { subject, html };
}
