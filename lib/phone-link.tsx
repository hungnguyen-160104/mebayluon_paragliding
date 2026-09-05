// lib/phone-link.tsx
import type { ReactNode } from "react";

/**
 * Số điện thoại Việt Nam trong bài viết: 0964 073 555 · 0964.073.555 ·
 * 0964073555 · +84 964 073 555 · (+84) 964073555. Trên điện thoại khách phải
 * bấm là gọi được, không bắt bôi đen rồi dán sang ứng dụng gọi.
 *
 * Bắt đầu bằng 0 hoặc +84, sau đó 9 chữ số (di động) hoặc 024 3838 8888 (cố định),
 * ngăn tuỳ ý bằng cách/chấm/gạch. Lookaround chặn hai đầu là chữ số hoặc
 * chữ cái để không dính giá tiền "1.500.000", mã vé, hay đoạn cuối một số dài.
 */
const PHONE_RE =
  /(?<![\d\w+])(?:(?:\(\+84\)|\+84|0)[\s.\-]?\d{2,3}[\s.\-]?\d{3}[\s.\-]?\d{3,4}|0\d{2}[\s.\-]?\d{4}[\s.\-]?\d{4})(?![\d\w])/g;

/** "(+84) 964 073 555" → "+84964073555"; "0964 073 555" → "0964073555". */
export function phoneToTel(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : digits.replace(/^\+?84/, "+84");
}

/** Cắt đoạn chữ thuần thành [chữ, số, chữ, số, ...] để bên gọi tự bọc thẻ. */
export function splitPhones(text: string): { text: string; phone?: string }[] {
  const out: { text: string; phone?: string }[] = [];
  let last = 0;
  for (const m of String(text || "").matchAll(PHONE_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ text: text.slice(last, idx) });
    out.push({ text: m[0], phone: phoneToTel(m[0]) });
    last = idx + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

const LINK_CLASS = "font-semibold text-emerald-300 underline underline-offset-4 hover:text-emerald-200";

/** Chữ thuần (React) → mảng node, số điện thoại thành <a href="tel:">. */
export function linkifyPhones(text: string, keyPrefix = "tel"): ReactNode[] {
  return splitPhones(text).map((p, i) =>
    p.phone ? (
      <a key={`${keyPrefix}-${i}`} href={`tel:${p.phone}`} className={LINK_CLASS}>
        {p.text}
      </a>
    ) : (
      p.text
    ),
  );
}

/**
 * HTML thô (bài viết cũ từ WordPress) → thay số điện thoại trong phần chữ bằng
 * <a href="tel:">. Đi từng mảnh giữa các thẻ; đang ở trong <a> thì bỏ qua để
 * không lồng link vào link, và không đụng vào thuộc tính thẻ.
 */
export function linkifyPhonesInHtml(html: string): string {
  let depthA = 0;
  return String(html || "")
    .split(/(<[^>]+>)/)
    .map((chunk) => {
      if (chunk.startsWith("<")) {
        if (/^<a[\s>]/i.test(chunk)) depthA++;
        else if (/^<\/a\s*>/i.test(chunk)) depthA = Math.max(0, depthA - 1);
        return chunk;
      }
      if (depthA > 0 || !chunk) return chunk;
      return chunk.replace(
        PHONE_RE,
        (m) => `<a href="tel:${phoneToTel(m)}" class="${LINK_CLASS}">${m}</a>`,
      );
    })
    .join("");
}
