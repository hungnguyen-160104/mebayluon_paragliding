// components/admin/posts/PostEditor.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Save,
  Eye,
  Send,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Image as ImageIcon,
} from "lucide-react";
import type { Post, StoreCategory } from "@/types/frontend/post";
import type { ContentBlock } from "@/types/post-blocks";
import { blocksToHTML, htmlToBlocks } from "@/types/post-blocks";
import PostBlockBuilder from "./PostBlockBuilder";
import api from "@/lib/api";
import { authHeader } from "@/lib/auth";

// Types
type KnowledgeSubCategory = "can-ban" | "nang-cao" | "thermal" | "xc" | "khi-tuong";

interface PostFormData {
  title: string;
  slug: string;
  coverImage: string;
  category: "" | "news" | "knowledge" | "store";
  subCategory?: KnowledgeSubCategory;
  storeCategory?: StoreCategory;
  price?: number;
  tags: string;
  language: "vi" | "en";
  isPublished: boolean;
  blocks: ContentBlock[];
}

interface PostEditorProps {
  post: Post | null;
  onSave: (data: any, publish: boolean) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

// Options
const CATEGORIES = [
  { value: "", label: "Chọn danh mục" },
  { value: "news", label: "Tin tức" },
  { value: "knowledge", label: "Kiến thức dù lượn" },
  { value: "store", label: "Cửa hàng" },
];

const KNOWLEDGE_SUBS = [
  { value: "", label: "Chọn tiểu mục" },
  { value: "can-ban", label: "Dù lượn căn bản" },
  { value: "nang-cao", label: "Dù lượn nâng cao" },
  { value: "thermal", label: "Bay thermal" },
  { value: "xc", label: "Bay XC" },
  { value: "khi-tuong", label: "Khí tượng bay" },
];

const STORE_SUBS = [
  { value: "", label: "Chọn loại sản phẩm" },
  { value: "thiet-bi-bay", label: "Thiết bị bay" },
  { value: "phu-kien", label: "Phụ kiện" },
  { value: "sach-du-luon", label: "Sách dù lượn" },
  { value: "khoa-hoc-du-luon", label: "Khóa học dù lượn" },
];

export default function PostEditor({ post, onSave, onCancel: _onCancel, saving }: PostEditorProps) {
  const [form, setForm] = useState<PostFormData>({
    title: "",
    slug: "",
    coverImage: "",
    category: "",
    subCategory: undefined,
    storeCategory: undefined,
    price: undefined,
    tags: "",
    language: "vi",
    isPublished: false,
    blocks: [],
  });

  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSeo, setShowSeo] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const initialLoadRef = useRef(true);

  // Load post data when editing
  useEffect(() => {
    if (post) {
      setForm({
        title: post.title || "",
        slug: post.slug || "",
        coverImage: post.coverImage || "",
        category: (post.category as any) || "",
        subCategory: (post as any).subCategory,
        storeCategory: post.storeCategory,
        price: post.price,
        tags: post.tags?.join(", ") || "",
        language: (post.language as "vi" | "en") || "vi",
        isPublished: post.isPublished,
        blocks: htmlToBlocks(post.content || ""),
      });
      setHasChanges(false);
      initialLoadRef.current = true;
    } else {
      // Reset form for new post
      setForm({
        title: "",
        slug: "",
        coverImage: "",
        category: "",
        subCategory: undefined,
        storeCategory: undefined,
        price: undefined,
        tags: "",
        language: "vi",
        isPublished: false,
        blocks: [],
      });
      setHasChanges(false);
      initialLoadRef.current = true;
    }
  }, [post]);

  // Track changes
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    setHasChanges(true);
  }, [form]);

  // Upload cover image
  async function handleUploadCover(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const resp = await api<{ url: string }>("/api/uploads/image", {
        method: "POST",
        headers: { ...authHeader() },
        body: fd,
      });
      setForm((f) => ({ ...f, coverImage: resp.url }));
    } catch (e: any) {
      setErrors((prev) => ({ ...prev, coverImage: "Upload thất bại" }));
    } finally {
      setUploading(false);
    }
  }

  // Auto-generate slug from title
  function generateSlug(title: string): string {
    return title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  // Validate form
  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!form.title.trim()) {
      errs.title = "Tiêu đề là bắt buộc";
    } else if (form.title.length < 5) {
      errs.title = "Tiêu đề phải có ít nhất 5 ký tự";
    }

    if (!form.category) {
      errs.category = "Vui lòng chọn danh mục";
    }

    if (form.category === "knowledge" && !form.subCategory) {
      errs.subCategory = "Vui lòng chọn tiểu mục";
    }

    if (form.category === "store") {
      if (!form.storeCategory) {
        errs.storeCategory = "Vui lòng chọn loại sản phẩm";
      }
      if (form.price === undefined || form.price < 0) {
        errs.price = "Vui lòng nhập giá hợp lệ";
      }
    }

    if (form.blocks.length === 0) {
      errs.blocks = "Bài viết cần có ít nhất 1 block nội dung";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // Handle submit
  async function handleSubmit(publish: boolean) {
    if (!validate()) return;

    const content = blocksToHTML(form.blocks);
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: any = {
      title: form.title,
      slug: form.slug || generateSlug(form.title),
      coverImage: form.coverImage || undefined,
      content,
      category: form.category,
      tags,
      language: form.language,
      isPublished: publish,
      type: form.category === "store" ? "product" : "blog",
    };

    // Add sub-category fields
    if (form.category === "knowledge" && form.subCategory) {
      payload.subCategory = form.subCategory;
    }

    if (form.category === "store") {
      payload.storeCategory = form.storeCategory;
      payload.price = form.price;
      if (form.storeCategory === "khoa-hoc-du-luon" && form.subCategory) {
        payload.subCategory = form.subCategory;
      }
    }

    await onSave(payload, publish);
    setHasChanges(false);
  }

  const inputClass =
    "w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const errorClass = "text-xs text-red-500 mt-1";

  const isStore = form.category === "store";
  const isKnowledge = form.category === "knowledge";
  const isCourseInStore = isStore && form.storeCategory === "khoa-hoc-du-luon";

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {post ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}
            </h2>
            {post && (
              <p className="text-sm text-gray-500 mt-0.5">
                ID: {post._id}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                Chưa lưu
              </span>
            )}

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              <span>Lưu nháp</span>
            </button>

            <button
              type="button"
              onClick={() =>
                window.open(`/preview/${form.slug || "new"}`, "_blank")
              }
              disabled={!form.slug && !form.title}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Eye size={16} />
              <span>Xem trước</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Send size={16} />
              )}
              <span>{post ? "Cập nhật" : "Xuất bản"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Form content - scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Title */}
          <div>
            <label className={labelClass}>Tiêu đề bài viết *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((f) => ({
                  ...f,
                  title,
                  slug: f.slug || generateSlug(title),
                }));
              }}
              placeholder="Nhập tiêu đề bài viết..."
              className={`${inputClass} text-lg font-medium`}
            />
            {errors.title && <p className={errorClass}>{errors.title}</p>}
          </div>

          {/* Slug */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <LinkIcon size={14} />
                Đường dẫn (slug)
              </span>
            </label>
            <div className="flex items-center">
              <span className="px-3 py-2.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-500">
                /
              </span>
              <input
                type="text"
                value={form.slug}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))
                }
                placeholder="duong-dan-bai-viet"
                className={`${inputClass} rounded-l-none`}
              />
            </div>
          </div>

          {/* Category & Sub-category row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Danh mục *</label>
              <select
                value={form.category}
                onChange={(e) => {
                  const cat = e.target.value as PostFormData["category"];
                  setForm((f) => ({
                    ...f,
                    category: cat,
                    subCategory: undefined,
                    storeCategory: undefined,
                    price: undefined,
                  }));
                }}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {errors.category && <p className={errorClass}>{errors.category}</p>}
            </div>

            {/* Sub-category for Knowledge */}
            {isKnowledge && (
              <div>
                <label className={labelClass}>Tiểu mục *</label>
                <select
                  value={form.subCategory || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      subCategory: e.target.value as KnowledgeSubCategory,
                    }))
                  }
                  className={inputClass}
                >
                  {KNOWLEDGE_SUBS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {errors.subCategory && <p className={errorClass}>{errors.subCategory}</p>}
              </div>
            )}

            {/* Store category */}
            {isStore && (
              <div>
                <label className={labelClass}>Loại sản phẩm *</label>
                <select
                  value={form.storeCategory || ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      storeCategory: e.target.value as StoreCategory,
                      subCategory: undefined,
                    }))
                  }
                  className={inputClass}
                >
                  {STORE_SUBS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {errors.storeCategory && <p className={errorClass}>{errors.storeCategory}</p>}
              </div>
            )}
          </div>

          {/* Course sub-category (if store + khoa-hoc) */}
          {isCourseInStore && (
            <div>
              <label className={labelClass}>Tiểu mục khóa học *</label>
              <select
                value={form.subCategory || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    subCategory: e.target.value as KnowledgeSubCategory,
                  }))
                }
                className={inputClass}
              >
                {KNOWLEDGE_SUBS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Price (for store) */}
          {isStore && (
            <div>
              <label className={labelClass}>Giá (VNĐ) *</label>
              <input
                type="number"
                min={0}
                value={form.price ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, price: Number(e.target.value) || 0 }))
                }
                placeholder="0"
                className={inputClass}
              />
              {errors.price && <p className={errorClass}>{errors.price}</p>}
            </div>
          )}

          {/* Cover image */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <ImageIcon size={14} />
                Ảnh bìa
              </span>
            </label>
            {form.coverImage ? (
              <div className="relative inline-block">
                <img
                  src={form.coverImage}
                  alt="Cover"
                  className="w-full max-h-48 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, coverImage: "" }))}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-red-400 hover:bg-red-50/50 transition-colors">
                {uploading ? (
                  <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Chọn ảnh bìa</span>
                    <span className="text-xs text-gray-400 mt-1">PNG, JPG tối đa 10MB</span>
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadCover(file);
                  }}
                />
              </label>
            )}
            {errors.coverImage && <p className={errorClass}>{errors.coverImage}</p>}
          </div>

          {/* Tags */}
          <div>
            <label className={labelClass}>Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="dù lượn, sapa, kinh nghiệm (phân cách bằng dấu phẩy)"
              className={inputClass}
            />
          </div>

          {/* Language */}
          <div>
            <label className={labelClass}>Ngôn ngữ</label>
            <select
              value={form.language}
              onChange={(e) =>
                setForm((f) => ({ ...f, language: e.target.value as "vi" | "en" }))
              }
              className={`${inputClass} w-auto`}
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Block builder */}
          <div className="pt-4 border-t border-gray-200">
            <PostBlockBuilder
              blocks={form.blocks}
              onChange={(blocks) => setForm((f) => ({ ...f, blocks }))}
            />
            {errors.blocks && <p className={errorClass}>{errors.blocks}</p>}
          </div>

          {/* SEO Section (collapsible) */}
          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowSeo(!showSeo)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-medium text-gray-700">
                SEO & Meta (tùy chọn)
              </span>
              {showSeo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showSeo && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 space-y-4">
                <p className="text-sm text-gray-500">
                  Các trường SEO sẽ được tự động tạo từ tiêu đề và nội dung nếu không điền.
                </p>
                {/* SEO fields can be added here if needed */}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
