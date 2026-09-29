// lib/post-cover.ts
/**
 * ẢNH ĐẠI DIỆN KHÔNG ĐƯỢC TRÙNG ẢNH TRONG THÂN BÀI (chủ 29/09/2026).
 *
 * Ảnh đại diện đã hiện to ở đầu bài; để nó lặp lại trong thân bài là người
 * đọc thấy một ảnh hai lần. So theo "khoá" của ảnh chứ không so nguyên URL:
 * cùng một ảnh Cloudinary có thể mang số phiên bản (v123…), tham số biến đổi
 * (w_800…) hoặc đuôi khác nhau.
 */
type KhoiAnh = { type?: string; data?: { url?: string; images?: { url?: string }[] } };

export function khoaAnh(url: string | undefined | null): string {
  if (!url) return "";
  let s = String(url).trim().split("?")[0];
  const m = s.match(/\/upload\/(?:[^/]+\/)*?(?:v\d+\/)(.+)$/);
  s = m ? m[1] : s.replace(/^https?:\/\/[^/]+/, "");
  return s.replace(/\.[a-z0-9]+$/i, "").toLowerCase();
}

/** Mọi URL ảnh trong các danh sách khối và các đoạn HTML truyền vào. */
export function anhTrongBai(dsKhoi: (KhoiAnh[] | undefined)[], dsHtml: (string | undefined)[] = []): string[] {
  const out: string[] = [];
  for (const khoi of dsKhoi) {
    for (const b of khoi || []) {
      const d = b?.data || {};
      if (b?.type === "image" && d.url) out.push(d.url);
      for (const im of d.images || []) if (im?.url) out.push(im.url);
    }
  }
  for (const h of dsHtml) for (const m of String(h || "").matchAll(/<img[^>]+src=["']([^"']+)/gi)) out.push(m[1]);
  return out;
}

export function anhDaiDienBiTrung(cover: string, dsKhoi: (KhoiAnh[] | undefined)[], dsHtml: (string | undefined)[] = []): boolean {
  const k = khoaAnh(cover);
  return !!k && anhTrongBai(dsKhoi, dsHtml).some((u) => khoaAnh(u) === k);
}
