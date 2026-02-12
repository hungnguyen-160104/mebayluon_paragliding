"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { authHeader, getToken } from "@/lib/auth";

// dùng any để tương thích các field mở rộng (isFixed, fixedKey)
type AnyPost = any;

// 6 điểm bay cố định (submenu Tin tức)
type FixedKey = "hoa-binh" | "ha-noi" | "mu-cang-chai" | "yen-bai" | "da-nang" | "sapa";
const FIXED_NEWS_OPTIONS: { value: FixedKey; label: string }[] = [
  { value: "hoa-binh", label: "Viên Nam – Hòa Bình" },
  { value: "ha-noi", label: "Đồi Bù – Chương Mỹ – Hà Nội" },
  { value: "mu-cang-chai", label: "Khau Phạ – Mù Cang Chải – Yên Bái" },
  { value: "yen-bai", label: "Trạm Tấu – Yên Bái" },
  { value: "da-nang", label: "Sơn Trà – Đà Nẵng" },
  { value: "sapa", label: "Sapa – Lào Cai" },
];

export default function EditPostPage() {
  const router = useRouter();
  const { id } = useParams();
  const [form, setForm] = useState<AnyPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Trạng thái upload ảnh
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  // 🧭 Kiểm tra token + tải bài viết
  useEffect(() => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }
    (async () => {
      try {
        const res = await api(`/api/posts/${id}`, {
          headers: { ...authHeader() },
        });
        setForm(res);
      } catch (e: any) {
        setErr(e?.message || "Không tải được bài viết");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  // ====== Upload ảnh từ file -> Cloudinary (qua backend) ======
  async function handlePickFile(file: File) {
    if (!file) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file); // trùng với .single("file") phía server

      const resp = await api<{ url: string; publicId?: string }>("/api/uploads/image", {
        method: "POST",
        headers: { ...authHeader() }, // KHÔNG set Content-Type cho FormData
        body: fd,
      });

      setForm((f: AnyPost) => ({ ...(f || {}), coverImage: resp.url }));
    } catch (e: any) {
      setUploadErr(e?.message || "Upload ảnh thất bại");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setLoading(true);
    setErr(null);
    try {
      await api(`/api/posts/${id}`, {
        method: "PUT",
        headers: { ...authHeader() },
        body: JSON.stringify(form),
      });
      router.replace("/admin/dashboard");
    } catch (e: any) {
      setErr(e?.message || "Không lưu được bài viết");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <CenteredMessage message="Đang tải bài viết..." />;
  if (err && !form) return <CenteredMessage message={err} type="error" />;
  if (!form) return <CenteredMessage message="Không tìm thấy bài viết." type="error" />;

  const isNews = (form.category || "") === "news";

  const glassInputStyle = `
    w-full rounded-lg px-3 py-2 bg-white/30 border border-white/40 shadow-sm 
    text-gray-900 placeholder-gray-600 
    focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400
    transition-colors duration-200
  `;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-start pt-24 pb-8 px-4 md:px-8 overflow-y-auto bg-cover bg-center"
      style={{ backgroundImage: "url('/hinh-nen-3.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] z-0" />

      <div
        className="relative z-10 w-full max-w-4xl p-6 md:p-8 rounded-2xl 
                   bg-white/15 backdrop-blur-xl border border-white/20 shadow-lg text-gray-800"
      >
        <h2 className="text-3xl font-bold mb-6 text-gray-900 drop-shadow-lg">Sửa bài viết</h2>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-800">Tiêu đề</label>
            <input
              className={glassInputStyle}
              value={form.title || ""}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          {/* Cover: URL + Nút upload Cloudinary */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-800">Ảnh cover</label>

            {/* Nhập URL thủ công (giữ như cũ) */}
            <input
              className={glassInputStyle}
              value={form.coverImage || ""}
              onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
              placeholder="Dán link ảnh (https://...) hoặc dùng nút tải ảnh lên bên dưới"
            />

            {/* Nút tải ảnh lên Cloudinary */}
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 rounded-lg bg-white/40 border border-white/50 px-4 py-2.5 text-gray-900 cursor-pointer hover:bg-white/60">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePickFile(f);
                    e.currentTarget.value = ""; // cho phép chọn lại cùng 1 file vẫn trigger
                  }}
                />
                <span>📤 Tải ảnh lên Cloudinary</span>
              </label>

              {uploading && <span className="text-sm text-gray-800">Đang tải ảnh…</span>}
              {uploadErr && <span className="text-sm text-red-700">{uploadErr}</span>}
            </div>

            {/* Preview */}
            {form.coverImage && (
              <div className="rounded-lg border border-white/30 bg-white/20 p-3">
                <img
                  src={form.coverImage}
                  alt="preview"
                  className="max-h-48 rounded-lg shadow"
                />
                <p className="text-xs text-gray-700 mt-1 break-all">{form.coverImage}</p>
              </div>
            )}
          </div>

          {/* Danh mục */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-800">Danh mục</label>
            <select
              className={glassInputStyle}
              value={form.category || ""}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Chọn danh mục</option>
              <option value="news">Tin tức</option>
              <option value="knowledge">Kiến thức dù lượn - Học bay</option>
              <option value="store">Cửa hàng</option>
            </select>
          </div>

          {/* Nhóm (Tin tức): "" = Bài viết mới, còn lại = bài cố định theo điểm bay */}
          {isNews && (
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-800">Nhóm (Tin tức)</label>
              <select
                className={glassInputStyle}
                value={form.fixedKey || ""}
                onChange={(e) => {
                  const val = e.target.value as "" | FixedKey;
                  setForm({
                    ...form,
                    isPublished: form.isPublished, // giữ nguyên
                    isFixed: !!val,
                    fixedKey: val || undefined,
                  });
                }}
              >
                <option value="">Bài viết mới (không cố định)</option>
                {FIXED_NEWS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-700 mt-1">
                Mỗi điểm có tối đa 01 bài cố định. Nếu chọn trùng điểm đã có bài, lưu sẽ báo lỗi.
              </p>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-800">
              Tags (phân cách bằng dấu phẩy)
            </label>
            <input
              className={glassInputStyle}
              value={(form.tags || []).join(", ")}
              onChange={(e) =>
                setForm({
                  ...form,
                  tags: e.target.value
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="ví dụ: dù lượn, sapa, kinh nghiệm"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-800">Nội dung (HTML)</label>
            <textarea
              className={`${glassInputStyle} min-h-[250px] md:min-h-[300px]`}
              value={form.content || ""}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
          </div>

          {/* Options */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div>
              <label className="text-sm font-medium text-gray-800 mr-2">Ngôn ngữ:</label>
              <select
                className="rounded-lg px-2 py-1 bg-white/30 border border-white/40 shadow-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.language || "vi"}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
              >
                <option value="vi">vi</option>
                <option value="en">en</option>
              </select>
            </div>
            <label className="text-sm font-medium text-gray-800 flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded text-blue-500 border-white/40 focus:ring-blue-400"
                checked={!!form.isPublished}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              />
              Xuất bản
            </label>
          </div>

          {/* Error */}
          {err && (
            <p className="text-red-700 font-medium text-sm p-3 bg-red-100/50 rounded-lg border border-red-300">
              {err}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4">
            <button
              className="rounded-xl bg-blue-500 border border-blue-300 text-white px-6 py-2.5 font-medium shadow-md 
                         hover:bg-blue-600 transition-colors duration-300 
                         disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
            <Link
              href="/admin/dashboard"
              className="rounded-xl bg-white/40 border border-white/50 text-gray-900 px-6 py-2.5 font-medium shadow-md 
                         hover:bg-white/60 transition-colors duration-300"
            >
              Huỷ
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Component hiển thị thông báo ở giữa màn hình */
function CenteredMessage({
  message,
  type = "info",
}: {
  message: string;
  type?: "info" | "error";
}) {
  const textColor = type === "error" ? "text-red-700" : "text-gray-900";
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/hinh-nen.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] z-0" />
      <div
        className="relative z-10 p-8 rounded-2xl bg-white/30 backdrop-blur-xl 
                   border border-white/40 shadow-lg"
      >
        <p className={`text-lg font-medium ${textColor}`}>{message}</p>
      </div>
    </div>
  );
}
