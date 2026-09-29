"use client";

/**
 * BẢN DỊCH BÀI VIẾT — fr / zh / ru / hi (29/09/2026).
 *
 * Trái: bản tiếng Anh (bản gốc để dịch). Phải: bản dịch — cùng số khối, cùng
 * thứ tự, chỉ ô CHỮ được sửa (ảnh, link, bố cục giữ theo bản tiếng Anh).
 * Công tắc "Đã duyệt" = người biết tiếng đã đọc lại: chỉ khi bật, trang
 * /fr/blog/<slug> mới hiện bản này, khai với Google và vào sitemap.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trash2 } from "lucide-react";

import api from "@/lib/api";
import { authHeader, getToken } from "@/lib/auth";
import type { ContentBlock, Post, PostTranslation } from "@/types/frontend/post";

const NGON_NGU = [
  { ma: "fr", ten: "Tiếng Pháp" },
  { ma: "zh", ten: "Tiếng Trung" },
  { ma: "ru", ten: "Tiếng Nga" },
  { ma: "hi", ten: "Tiếng Hindi" },
] as const;
type Ma = (typeof NGON_NGU)[number]["ma"];

/** Các ô chữ của một khối, dạng đường dẫn → giá trị, để vẽ ô sửa chung cho mọi loại khối. */
function oChu(b: ContentBlock): Array<{ duong: string; nhan: string; giaTri: string; dai: boolean }> {
  const d = (b.data ?? {}) as Record<string, any>;
  const ra: Array<{ duong: string; nhan: string; giaTri: string; dai: boolean }> = [];
  for (const k of ["text", "caption", "alt", "author"]) {
    if (typeof d[k] === "string" && d[k].trim()) ra.push({ duong: k, nhan: k, giaTri: d[k], dai: k === "text" && b.type !== "heading" });
  }
  if (Array.isArray(d.items)) d.items.forEach((x: unknown, i: number) => ra.push({ duong: `items.${i}`, nhan: `dòng ${i + 1}`, giaTri: String(x ?? ""), dai: false }));
  if (Array.isArray(d.images)) d.images.forEach((im: any, i: number) => im?.caption && ra.push({ duong: `images.${i}.caption`, nhan: `chú thích ảnh ${i + 1}`, giaTri: String(im.caption), dai: false }));
  if (Array.isArray(d.headers)) d.headers.forEach((x: unknown, i: number) => ra.push({ duong: `headers.${i}`, nhan: `tiêu đề cột ${i + 1}`, giaTri: String(x ?? ""), dai: false }));
  if (Array.isArray(d.rows)) d.rows.forEach((r: unknown[], i: number) => (r ?? []).forEach((x, j) => ra.push({ duong: `rows.${i}.${j}`, nhan: `ô ${i + 1}.${j + 1}`, giaTri: String(x ?? ""), dai: false })));
  return ra;
}

function ganDuong(obj: any, duong: string, giaTri: string) {
  const p = duong.split(".");
  let o = obj;
  for (let i = 0; i < p.length - 1; i++) {
    const k = /^\d+$/.test(p[i]) ? Number(p[i]) : p[i];
    o = o[k];
  }
  const cuoi = /^\d+$/.test(p[p.length - 1]) ? Number(p[p.length - 1]) : p[p.length - 1];
  o[cuoi] = giaTri;
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export default function BanDichPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [ma, setMa] = useState<Ma>("fr");
  const [ban, setBan] = useState<PostTranslation | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [thongBao, setThongBao] = useState<{ loai: "ok" | "loi"; chu: string } | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }
    api<Post>(`/api/posts/${id}`, { headers: { ...authHeader() } })
      .then(setPost)
      .catch((e) => setThongBao({ loai: "loi", chu: e?.message || "Không tải được bài" }));
  }, [id, router]);

  const laHtml = post?.contentMode === "html";

  /** Đổi ngôn ngữ: nạp bản đã lưu, chưa có thì để trống (bấm "Lấy khung từ bản tiếng Anh"). */
  useEffect(() => {
    if (!post) return;
    const t = post.translations?.[ma];
    setBan(t ? clone(t) : null);
  }, [post, ma]);

  const khoiEn = useMemo(() => (post?.contentBlocks ?? []) as ContentBlock[], [post]);

  function taoKhung() {
    if (!post) return;
    setBan({
      title: post.title || "",
      excerpt: post.excerpt || "",
      contentBlocks: clone(khoiEn),
      content: laHtml ? post.content || "" : "",
      published: false,
      nguon: "nguoi",
    });
  }

  async function luu(xoa = false) {
    if (!post) return;
    setDangLuu(true);
    setThongBao(null);
    try {
      if (xoa) {
        if (!window.confirm(`Xoá hẳn bản ${ma.toUpperCase()} của bài này?`)) return;
        await api(`/api/posts/${id}/translations?lang=${ma}`, { method: "DELETE", headers: { ...authHeader() } });
        setPost({ ...post, translations: { ...(post.translations ?? {}), [ma]: undefined } });
        setThongBao({ loai: "ok", chu: "Đã xoá bản dịch" });
        return;
      }
      if (!ban) return;
      const r = await api<{ translations: Post["translations"] }>(`/api/posts/${id}/translations`, {
        method: "PUT",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ lang: ma, ...ban }),
      });
      setPost({ ...post, translations: r.translations });
      setThongBao({ loai: "ok", chu: ban.published ? "Đã lưu — bản dịch ĐANG HIỆN trên web" : "Đã lưu nháp — chưa hiện trên web" });
    } catch (e: any) {
      setThongBao({ loai: "loi", chu: e?.message || "Lưu lỗi" });
    } finally {
      setDangLuu(false);
    }
  }

  if (!post) {
    return <div className="p-6 text-gray-600">{thongBao?.chu ?? "Đang tải…"}</div>;
  }

  const khoiDich = (ban?.contentBlocks ?? []) as ContentBlock[];
  const slug = post.slug;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <Link href={`/admin/posts/${id}/edit`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft size={18} /> Về trang sửa bài
          </Link>
          <div className="h-6 w-px bg-gray-200" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold text-gray-900">Bản dịch — {post.titleVi || post.title}</h1>
            <p className="text-xs text-gray-500">Dịch từ bản tiếng Anh. Chỉ bản bật &quot;Đã duyệt&quot; mới hiện ở /{ma}/blog/{slug}</p>
          </div>
          <div className="flex gap-1">
            {NGON_NGU.map((n) => {
              const t = post.translations?.[n.ma];
              return (
                <button
                  key={n.ma}
                  type="button"
                  onClick={() => setMa(n.ma)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-semibold ${ma === n.ma ? "border-sky-600 bg-sky-600 text-white" : "border-gray-300 bg-white text-gray-700"}`}
                >
                  {n.ma.toUpperCase()}
                  {t ? <span className={`ml-1.5 inline-block h-2 w-2 rounded-full ${t.published ? "bg-green-400" : "bg-amber-400"}`} /> : null}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {thongBao && (
        <div className={`mx-auto mt-3 max-w-7xl rounded-md px-4 py-2 text-sm ${thongBao.loai === "ok" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{thongBao.chu}</div>
      )}

      <main className="mx-auto max-w-7xl p-4">
        {!ban ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="mb-4 text-gray-700">Bài này chưa có bản {NGON_NGU.find((n) => n.ma === ma)?.ten}.</p>
            <button type="button" onClick={taoKhung} className="rounded-md bg-sky-600 px-4 py-2 font-semibold text-white">
              Lấy khung từ bản tiếng Anh để dịch
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 rounded-lg bg-white p-4 shadow-sm">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={!!ban.published}
                  onChange={(e) => setBan({ ...ban, published: e.target.checked })}
                  className="h-4 w-4"
                />
                Đã duyệt — cho hiện trên web
              </label>
              <label className="flex items-center gap-2 text-sm">
                Người dịch:
                <select value={ban.nguon ?? "ai"} onChange={(e) => setBan({ ...ban, nguon: e.target.value as "ai" | "nguoi" })} className="rounded border px-2 py-1">
                  <option value="ai">Máy dịch (cần người duyệt)</option>
                  <option value="nguoi">Người dịch</option>
                </select>
              </label>
              <div className="ml-auto flex gap-2">
                {post.translations?.[ma] ? (
                  <button type="button" disabled={dangLuu} onClick={() => luu(true)} className="flex items-center gap-1 rounded-md border border-red-300 px-3 py-2 text-sm text-red-700">
                    <Trash2 size={16} /> Xoá bản này
                  </button>
                ) : null}
                <button type="button" disabled={dangLuu} onClick={() => luu()} className="flex items-center gap-1 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  <Save size={16} /> {dangLuu ? "Đang lưu…" : "Lưu bản dịch"}
                </button>
              </div>
            </div>

            <Hang nhan="Tiêu đề" goc={post.title} giaTri={ban.title} onChange={(v) => setBan({ ...ban, title: v })} />
            <Hang nhan="Tóm tắt" goc={post.excerpt ?? ""} giaTri={ban.excerpt ?? ""} dai onChange={(v) => setBan({ ...ban, excerpt: v })} />

            {laHtml ? (
              <Hang nhan="Nội dung (HTML)" goc={post.content ?? ""} giaTri={ban.content ?? ""} dai rat onChange={(v) => setBan({ ...ban, content: v })} />
            ) : (
              khoiDich.map((b, i) => {
                const goc = khoiEn[i];
                const oGoc = goc ? oChu(goc) : [];
                const oDich = oChu(b);
                if (!oDich.length) {
                  return (
                    <div key={b.id ?? i} className="rounded-lg bg-white px-4 py-2 text-xs text-gray-400 shadow-sm">
                      Khối {i + 1} · {b.type} — không có chữ, giữ nguyên theo bản tiếng Anh
                    </div>
                  );
                }
                return (
                  <div key={b.id ?? i} className="rounded-lg bg-white p-3 shadow-sm">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Khối {i + 1} · {b.type}</div>
                    <div className="space-y-2">
                      {oDich.map((o) => (
                        <Hang
                          key={o.duong}
                          nhan={o.nhan}
                          goc={oGoc.find((x) => x.duong === o.duong)?.giaTri ?? ""}
                          giaTri={o.giaTri}
                          dai={o.dai}
                          onChange={(v) => {
                            const moi = clone(khoiDich);
                            ganDuong(moi[i].data as any, o.duong, v);
                            setBan({ ...ban, contentBlocks: moi });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Hang({ nhan, goc, giaTri, onChange, dai, rat }: { nhan: string; goc: string; giaTri: string; onChange: (v: string) => void; dai?: boolean; rat?: boolean }) {
  const cao = rat ? "min-h-[420px]" : dai ? "min-h-[110px]" : "";
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <div>
        <div className="mb-1 text-xs font-semibold text-gray-500">{nhan} — tiếng Anh</div>
        <div className={`whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 ${cao}`}>{goc || "—"}</div>
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold text-sky-700">{nhan} — bản dịch</div>
        {dai || rat ? (
          <textarea value={giaTri} onChange={(e) => onChange(e.target.value)} className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm ${cao}`} />
        ) : (
          <input value={giaTri} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        )}
      </div>
    </div>
  );
}
