"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  Image as ImageIcon,
  Save,
  Send,
  Upload,
  X,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Type,
  Quote,
  List,
  Minus,
  MousePointerClick,
} from "lucide-react";
import api from "@/lib/api";
import { authHeader } from "@/lib/auth";
import type {
  ContentBlock,
  ContentBlockType,
  KnowledgeSubCategory,
  Post,
  PostCategory,
  PostPayload,
  StoreCategory,
} from "@/types/frontend/post";

type EditorForm = {
  title: string;
  titleVi: string;
  slug: string;

  excerpt: string;
  excerptVi: string;

  coverImage: string;

  category: "" | PostCategory;
  subCategory: "" | KnowledgeSubCategory;
  storeCategory: "" | StoreCategory;
  price: string;

  tags: string;
};

interface PostEditorProps {
  post: Post | null;
  onSave: (data: PostPayload, publish: boolean) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

const CATEGORY_OPTIONS: { value: "" | PostCategory; label: string }[] = [
  { value: "", label: "Chọn danh mục" },
  { value: "news", label: "Tin tức" },
  { value: "knowledge", label: "Kiến thức dù lượn" },
  { value: "store", label: "Cửa hàng" },
];

const KNOWLEDGE_OPTIONS: { value: "" | KnowledgeSubCategory; label: string }[] = [
  { value: "", label: "Chọn tiểu mục" },
  { value: "can-ban", label: "Dù lượn căn bản" },
  { value: "nang-cao", label: "Dù lượn nâng cao" },
  { value: "thermal", label: "Bay thermal" },
  { value: "xc", label: "Bay XC" },
  { value: "khi-tuong", label: "Khí tượng bay" },
];

const STORE_OPTIONS: { value: "" | StoreCategory; label: string }[] = [
  { value: "", label: "Chọn loại sản phẩm" },
  { value: "thiet-bi-bay", label: "Thiết bị bay" },
  { value: "phu-kien", label: "Phụ kiện" },
  { value: "sach-du-luon", label: "Sách dù lượn" },
  { value: "khoa-hoc-du-luon", label: "Khóa học dù lượn" },
];

const EMPTY_FORM: EditorForm = {
  title: "",
  titleVi: "",
  slug: "",
  excerpt: "",
  excerptVi: "",
  coverImage: "",
  category: "",
  subCategory: "",
  storeCategory: "",
  price: "",
  tags: "",
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createParallelBlock(type: ContentBlockType = "paragraph") {
  const id = createId();
  const base = getDefaultBlock(type);
  return {
    vi: { ...base, id },
    en: { ...getDefaultBlock(type), id },
  };
}

function slugify(input: string) {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function stripHtml(html: string) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDefaultBlock(type: ContentBlockType): ContentBlock {
  switch (type) {
    case "heading":
      return {
        id: createId(),
        type,
        data: { level: 2, text: "" },
      };
    case "paragraph":
      return {
        id: createId(),
        type,
        data: { text: "" },
      };
    case "image":
      return {
        id: createId(),
        type,
        data: { url: "", caption: "", alt: "" },
      };
    case "quote":
      return {
        id: createId(),
        type,
        data: { text: "", author: "" },
      };
    case "bulletList":
      return {
        id: createId(),
        type,
        data: { items: [""] },
      };
    case "divider":
      return {
        id: createId(),
        type,
        data: {},
      };
    case "cta":
      return {
        id: createId(),
        type,
        data: { text: "", link: "" },
      };
    default:
      return {
        id: createId(),
        type: "paragraph",
        data: { text: "" },
      };
  }
}

function normalizeBlocks(value: ContentBlock[] | undefined, fallbackText = ""): ContentBlock[] {
  if (Array.isArray(value) && value.length > 0) {
    return value.map((block, index) => ({
      id: block.id || `block-${index}-${Date.now()}`,
      type: block.type || "paragraph",
      data: block.data || {},
    }));
  }

  const fallback = stripHtml(fallbackText);
  if (!fallback) {
    return [createParallelBlock("paragraph").vi];
  }

  return [
    {
      id: createId(),
      type: "paragraph",
      data: { text: fallback },
    },
  ];
}

function syncParallelBlocks(
  viBlocks: ContentBlock[],
  enBlocks: ContentBlock[]
): { vi: ContentBlock[]; en: ContentBlock[] } {
  const max = Math.max(viBlocks.length, enBlocks.length);

  const nextVi: ContentBlock[] = [];
  const nextEn: ContentBlock[] = [];

  for (let i = 0; i < max; i++) {
    const vi = viBlocks[i];
    const en = enBlocks[i];

    if (vi && en) {
      const id = vi.id || en.id || createId();
      nextVi.push({ ...vi, id });
      nextEn.push({ ...en, id });
      continue;
    }

    const source = vi || en || getDefaultBlock("paragraph");
    const id = source.id || createId();

    nextVi.push({
      id,
      type: source.type,
      data: { ...source.data },
    });

    nextEn.push({
      id,
      type: source.type,
      data: { ...source.data },
    });
  }

  return { vi: nextVi, en: nextEn };
}

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function blocksToHtml(blocks: ContentBlock[]): string {
  return blocks
    .map((block) => {
      const data = block.data || {};

      switch (block.type) {
        case "heading": {
          const level = data.level || 2;
          const tag = `h${Math.min(4, Math.max(1, Number(level)))}`;
          return `<${tag}>${escapeHtml(data.text || "")}</${tag}>`;
        }

        case "paragraph":
          return `<p>${escapeHtml(data.text || "")}</p>`;

        case "image":
          return `
            <figure>
              <img src="${data.url || ""}" alt="${escapeHtml(data.alt || "")}" />
              ${data.caption ? `<figcaption>${escapeHtml(data.caption)}</figcaption>` : ""}
            </figure>
          `;

        case "quote":
          return `
            <blockquote>
              <p>${escapeHtml(data.text || "")}</p>
              ${data.author ? `<cite>${escapeHtml(data.author)}</cite>` : ""}
            </blockquote>
          `;

        case "bulletList":
          return `<ul>${(data.items || [])
            .map((item: string) => `<li>${escapeHtml(item)}</li>`)
            .join("")}</ul>`;

        case "divider":
          return "<hr />";

        case "cta":
          return `<p><a href="${data.link || "#"}">${escapeHtml(data.text || "")}</a></p>`;

        default:
          return "";
      }
    })
    .join("\n");
}

function getBlockLabel(type: ContentBlockType) {
  switch (type) {
    case "heading":
      return "Tiêu đề";
    case "paragraph":
      return "Đoạn văn";
    case "image":
      return "Hình ảnh";
    case "quote":
      return "Trích dẫn";
    case "bulletList":
      return "Danh sách";
    case "divider":
      return "Phân cách";
    case "cta":
      return "Nút CTA";
    default:
      return "Block";
  }
}

const BLOCK_OPTIONS: {
  type: ContentBlockType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { type: "heading", label: "Tiêu đề", icon: <Type size={18} /> },
  { type: "paragraph", label: "Đoạn văn", icon: <Type size={18} /> },
  { type: "image", label: "Hình ảnh", icon: <ImageIcon size={18} /> },
  { type: "quote", label: "Trích dẫn", icon: <Quote size={18} /> },
  { type: "bulletList", label: "Danh sách", icon: <List size={18} /> },
  { type: "divider", label: "Phân cách", icon: <Minus size={18} /> },
  { type: "cta", label: "Nút CTA", icon: <MousePointerClick size={18} /> },
];

export default function PostEditor({
  post,
  onSave,
  onCancel,
  saving,
}: PostEditorProps) {
  const initialPair = createParallelBlock("paragraph");

  const [form, setForm] = useState<EditorForm>(EMPTY_FORM);
  const [blocksVi, setBlocksVi] = useState<ContentBlock[]>([initialPair.vi]);
  const [blocksEn, setBlocksEn] = useState<ContentBlock[]>([initialPair.en]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (post) {
      const nextForm: EditorForm = {
        title: post.title || "",
        titleVi: post.titleVi || "",
        slug: post.slug || "",
        excerpt: post.excerpt || "",
        excerptVi: post.excerptVi || "",
        coverImage: post.coverImage || "",
        category: (post.category as "" | PostCategory) || "",
        subCategory: (post.subCategory as "" | KnowledgeSubCategory) || "",
        storeCategory: (post.storeCategory as "" | StoreCategory) || "",
        price: typeof post.price === "number" ? String(post.price) : "",
        tags: Array.isArray(post.tags) ? post.tags.join(", ") : "",
      };

      setForm(nextForm);
      setSlugTouched(true);
      setErrors({});

      const vi = normalizeBlocks(post.contentBlocksVi, post.contentVi || post.content || "");
      const en = normalizeBlocks(post.contentBlocks, post.content || post.contentVi || "");
      const synced = syncParallelBlocks(vi, en);

      setBlocksVi(synced.vi);
      setBlocksEn(synced.en);
      return;
    }

    setForm(EMPTY_FORM);
    setSlugTouched(false);
    setErrors({});
    const pair = createParallelBlock("paragraph");
    setBlocksVi([pair.vi]);
    setBlocksEn([pair.en]);
  }, [post]);

  const isKnowledge = form.category === "knowledge";
  const isStore = form.category === "store";
  const isCourseInStore = isStore && form.storeCategory === "khoa-hoc-du-luon";

  const previewSlug = useMemo(
    () => form.slug || slugify(form.title || form.titleVi),
    [form.slug, form.title, form.titleVi]
  );

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

      setForm((prev) => ({ ...prev, coverImage: resp.url }));
      setErrors((prev) => ({ ...prev, coverImage: "" }));
    } catch (error: any) {
      setErrors((prev) => ({
        ...prev,
        coverImage: error?.message || "Upload ảnh thất bại",
      }));
    } finally {
      setUploading(false);
    }
  }

  async function handleUploadImageToBlock(blockId: string, file: File) {
    try {
      const fd = new FormData();
      fd.append("file", file);

      const resp = await api<{ url: string }>("/api/uploads/image", {
        method: "POST",
        headers: { ...authHeader() },
        body: fd,
      });

      updateSharedBlockField(blockId, "url", resp.url);
    } catch (error) {
      console.error("Upload block image failed:", error);
    }
  }

  function updateEnglishTitle(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: slugTouched ? prev.slug : slugify(value || prev.titleVi),
    }));
  }

  function updateVietnameseTitle(value: string) {
    setForm((prev) => ({
      ...prev,
      titleVi: value,
      slug: slugTouched ? prev.slug : slugify(prev.title || value),
    }));
  }

  function updateSharedBlockField(
    blockId: string,
    field: string,
    value: any
  ) {
    setBlocksVi((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? { ...block, data: { ...block.data, [field]: value } }
          : block
      )
    );

    setBlocksEn((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? { ...block, data: { ...block.data, [field]: value } }
          : block
      )
    );
  }

  function updateLangBlockField(
    locale: "vi" | "en",
    blockId: string,
    field: string,
    value: any
  ) {
    const setter = locale === "vi" ? setBlocksVi : setBlocksEn;

    setter((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? { ...block, data: { ...block.data, [field]: value } }
          : block
      )
    );
  }

  function addBlock(type: ContentBlockType) {
    const pair = createParallelBlock(type);
    setBlocksVi((prev) => [...prev, pair.vi]);
    setBlocksEn((prev) => [...prev, pair.en]);
    setShowAddBlockModal(false);
  }

  function removeBlock(blockId: string) {
    const nextVi = blocksVi.filter((block) => block.id !== blockId);
    const nextEn = blocksEn.filter((block) => block.id !== blockId);

    if (!nextVi.length || !nextEn.length) {
      const pair = createParallelBlock("paragraph");
      setBlocksVi([pair.vi]);
      setBlocksEn([pair.en]);
      return;
    }

    setBlocksVi(nextVi);
    setBlocksEn(nextEn);
  }

  function moveBlock(blockId: string, direction: "up" | "down") {
    const reorder = (blocks: ContentBlock[]) => {
      const index = blocks.findIndex((b) => b.id === blockId);
      if (index === -1) return blocks;

      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= blocks.length) return blocks;

      const next = [...blocks];
      const [item] = next.splice(index, 1);
      next.splice(newIndex, 0, item);
      return next;
    };

    setBlocksVi((prev) => reorder(prev));
    setBlocksEn((prev) => reorder(prev));
  }

  function updateListItem(locale: "vi" | "en", blockId: string, index: number, value: string) {
    const setter = locale === "vi" ? setBlocksVi : setBlocksEn;

    setter((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        const items = Array.isArray(block.data.items) ? [...block.data.items] : [""];
        items[index] = value;
        return { ...block, data: { ...block.data, items } };
      })
    );
  }

  function addListItem(blockId: string) {
    setBlocksVi((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        const items = Array.isArray(block.data.items) ? [...block.data.items, ""] : ["", ""];
        return { ...block, data: { ...block.data, items } };
      })
    );

    setBlocksEn((prev) =>
      prev.map((block) => {
        if (block.id !== blockId) return block;
        const items = Array.isArray(block.data.items) ? [...block.data.items, ""] : ["", ""];
        return { ...block, data: { ...block.data, items } };
      })
    );
  }

  function removeListItem(blockId: string, index: number) {
    const removeAt = (blocks: ContentBlock[]) =>
      blocks.map((block) => {
        if (block.id !== blockId) return block;
        const items = Array.isArray(block.data.items) ? [...block.data.items] : [""];
        items.splice(index, 1);
        return {
          ...block,
          data: { ...block.data, items: items.length ? items : [""] },
        };
      });

    setBlocksVi((prev) => removeAt(prev));
    setBlocksEn((prev) => removeAt(prev));
  }

  function validate(mode: "draft" | "publish") {
    const nextErrors: Record<string, string> = {};

    if (mode === "draft") {
      if (!form.title.trim() && !form.titleVi.trim()) {
        nextErrors.title = "Cần ít nhất một tiêu đề";
      }
    }

    if (mode === "publish") {
      if (!form.title.trim()) nextErrors.title = "Cần tiêu đề tiếng Anh";
      if (!form.titleVi.trim()) nextErrors.titleVi = "Cần tiêu đề tiếng Việt";
      if (!form.category) nextErrors.category = "Cần chọn danh mục";

      const hasContentVi = blocksVi.some((block) =>
        JSON.stringify(block.data || {}).replace(/[{}\[\]",:\s]/g, "").length > 0
      );
      const hasContentEn = blocksEn.some((block) =>
        JSON.stringify(block.data || {}).replace(/[{}\[\]",:\s]/g, "").length > 0
      );

      if (!hasContentVi) nextErrors.contentVi = "Cần nội dung tiếng Việt";
      if (!hasContentEn) nextErrors.content = "Cần nội dung tiếng Anh";
    }

    if ((isKnowledge || isCourseInStore) && !form.subCategory) {
      nextErrors.subCategory = "Cần chọn tiểu mục";
    }

    if (isStore) {
      if (!form.storeCategory) {
        nextErrors.storeCategory = "Cần chọn loại sản phẩm";
      }
      if (mode === "publish" && (form.price === "" || Number(form.price) < 0)) {
        nextErrors.price = "Cần nhập giá hợp lệ";
      }
    }

    if (!previewSlug) {
      nextErrors.slug = "Slug không được để trống";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit(publish: boolean) {
    const mode = publish ? "publish" : "draft";
    if (!validate(mode)) return;

    const payload: PostPayload = {
      title: form.title.trim(),
      titleVi: form.titleVi.trim(),
      slug: previewSlug,

      excerpt: form.excerpt.trim(),
      excerptVi: form.excerptVi.trim(),

      contentBlocks: blocksEn,
      contentBlocksVi: blocksVi,

      content: blocksToHtml(blocksEn),
      contentVi: blocksToHtml(blocksVi),

      coverImage: form.coverImage.trim() || undefined,

      category: form.category,
      subCategory: (isKnowledge || isCourseInStore) && form.subCategory
        ? form.subCategory
        : undefined,

      type: isStore ? "product" : "blog",
      storeCategory: isStore && form.storeCategory ? form.storeCategory : undefined,
      price: isStore && form.price !== "" ? Number(form.price) : undefined,

      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),

      isPublished: publish,
    };

    await onSave(payload, publish);
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500";
  const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";
  const errorClass = "mt-1 text-xs text-red-500";

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {post ? "Cập nhật bài viết" : "Tạo bài viết mới"}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={() => submit(false)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
            >
              <Save size={16} />
              <span>Lưu nháp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!previewSlug) return;
                window.open(`/blog/${previewSlug}`, "_blank");
              }}
              disabled={!previewSlug}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
            >
              <Eye size={16} />
              <span>Xem trước</span>
            </button>

            <button
              type="button"
              onClick={() => submit(true)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              <Send size={16} />
              <span>{post ? "Cập nhật" : "Xuất bản"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Tiêu đề tiếng Việt *</label>
                <input
                  className={inputClass}
                  value={form.titleVi}
                  onChange={(e) => updateVietnameseTitle(e.target.value)}
                  placeholder="Nhập tiêu đề tiếng Việt..."
                />
                {errors.titleVi && <p className={errorClass}>{errors.titleVi}</p>}
              </div>

              <div>
                <label className={labelClass}>Title (English) *</label>
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => updateEnglishTitle(e.target.value)}
                  placeholder="Enter English title..."
                />
                {errors.title && <p className={errorClass}>{errors.title}</p>}
              </div>
            </div>

            <div className="mt-4">
              <label className={labelClass}>Đường dẫn (slug)</label>
              <input
                className={inputClass}
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((prev) => ({ ...prev, slug: slugify(e.target.value) }));
                }}
                placeholder="duong-dan-bai-viet"
              />
              {errors.slug && <p className={errorClass}>{errors.slug}</p>}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Mô tả ngắn tiếng Việt</label>
                <textarea
                  className={`${inputClass} min-h-[110px]`}
                  value={form.excerptVi}
                  onChange={(e) => setForm((prev) => ({ ...prev, excerptVi: e.target.value }))}
                  placeholder="Mô tả ngắn tiếng Việt..."
                />
              </div>

              <div>
                <label className={labelClass}>Short excerpt (English)</label>
                <textarea
                  className={`${inputClass} min-h-[110px]`}
                  value={form.excerpt}
                  onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                  placeholder="English short excerpt..."
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelClass}>Danh mục *</label>
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      category: e.target.value as "" | PostCategory,
                      subCategory: "",
                      storeCategory: "",
                      price: "",
                    }))
                  }
                >
                  {CATEGORY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                {errors.category && <p className={errorClass}>{errors.category}</p>}
              </div>

              {(isKnowledge || isCourseInStore) && (
                <div>
                  <label className={labelClass}>Tiểu mục *</label>
                  <select
                    className={inputClass}
                    value={form.subCategory}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        subCategory: e.target.value as "" | KnowledgeSubCategory,
                      }))
                    }
                  >
                    {KNOWLEDGE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  {errors.subCategory && <p className={errorClass}>{errors.subCategory}</p>}
                </div>
              )}

              {isStore && (
                <>
                  <div>
                    <label className={labelClass}>Loại sản phẩm *</label>
                    <select
                      className={inputClass}
                      value={form.storeCategory}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          storeCategory: e.target.value as "" | StoreCategory,
                          subCategory:
                            e.target.value === "khoa-hoc-du-luon" ? prev.subCategory : "",
                        }))
                      }
                    >
                      {STORE_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    {errors.storeCategory && <p className={errorClass}>{errors.storeCategory}</p>}
                  </div>

                  <div>
                    <label className={labelClass}>Giá</label>
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      value={form.price}
                      onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                      placeholder="2500000"
                    />
                    {errors.price && <p className={errorClass}>{errors.price}</p>}
                  </div>
                </>
              )}

              <div>
                <label className={labelClass}>Tags</label>
                <input
                  className={inputClass}
                  value={form.tags}
                  onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                  placeholder="du-luon, sapa"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Ảnh bìa</h3>

            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div>
                <label className={labelClass}>URL ảnh bìa</label>
                <input
                  className={inputClass}
                  value={form.coverImage}
                  onChange={(e) => setForm((prev) => ({ ...prev, coverImage: e.target.value }))}
                  placeholder="https://..."
                />

                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-800 transition-colors hover:bg-gray-100"
                  >
                    <Upload size={16} />
                    <span>{uploading ? "Đang tải ảnh..." : "Tải ảnh lên"}</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadCover(file);
                      e.currentTarget.value = "";
                    }}
                  />

                  {form.coverImage && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, coverImage: "" }))}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-600 transition-colors hover:bg-red-100"
                    >
                      <X size={14} />
                      <span>Xóa ảnh</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>Xem trước</label>
                <div className="flex min-h-[180px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50">
                  {form.coverImage ? (
                    <img
                      src={form.coverImage}
                      alt="cover preview"
                      className="max-h-[220px] w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <ImageIcon size={28} />
                      <span className="mt-2 text-sm">Chưa có ảnh bìa</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {errors.coverImage && <p className={errorClass}>{errors.coverImage}</p>}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Nội dung bài viết song ngữ</h3>
                <p className="text-sm text-gray-500">
                  Người dùng chỉ cần điền nội dung vào từng block
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {blocksVi.map((block, index) => {
                const blockEn = blocksEn[index] || block;
                const listItemsVi = Array.isArray(block.data.items) ? block.data.items : [""];
                const listItemsEn = Array.isArray(blockEn.data.items) ? blockEn.data.items : [""];
                const sharedUrl = block.data.url || blockEn.data.url || "";
                const sharedLink = block.data.link || blockEn.data.link || "";

                return (
                  <div key={block.id} className="rounded-xl border border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                      <div className="font-medium text-gray-800">{getBlockLabel(block.type)}</div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveBlock(block.id, "up")}
                          className="rounded-md border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-100"
                        >
                          <ArrowUp size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveBlock(block.id, "down")}
                          className="rounded-md border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-100"
                        >
                          <ArrowDown size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeBlock(block.id)}
                          className="rounded-md border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      {block.type === "divider" ? (
                        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500">
                          Đường phân cách
                        </div>
                      ) : block.type === "image" ? (
                        <div className="space-y-4">
                          <div>
                            <label className={labelClass}>Ảnh</label>
                            <div className="flex gap-2">
                              <input
                                className={inputClass}
                                value={sharedUrl}
                                onChange={(e) =>
                                  updateSharedBlockField(block.id, "url", e.target.value)
                                }
                                placeholder="https://..."
                              />
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                <Upload size={14} />
                                <span>Tải ảnh</span>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadImageToBlock(block.id, file);
                                    e.currentTarget.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label className={labelClass}>Chú thích tiếng Việt</label>
                              <input
                                className={inputClass}
                                value={block.data.caption || ""}
                                onChange={(e) =>
                                  updateLangBlockField("vi", block.id, "caption", e.target.value)
                                }
                                placeholder="Chú thích tiếng Việt..."
                              />
                            </div>

                            <div>
                              <label className={labelClass}>Caption (English)</label>
                              <input
                                className={inputClass}
                                value={blockEn.data.caption || ""}
                                onChange={(e) =>
                                  updateLangBlockField("en", block.id, "caption", e.target.value)
                                }
                                placeholder="English caption..."
                              />
                            </div>
                          </div>
                        </div>
                      ) : block.type === "bulletList" ? (
                        <div className="space-y-3">
                          {listItemsVi.map((_, itemIndex) => (
                            <div key={itemIndex} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                              <input
                                className={inputClass}
                                value={listItemsVi[itemIndex] || ""}
                                onChange={(e) =>
                                  updateListItem("vi", block.id, itemIndex, e.target.value)
                                }
                                placeholder={`Mục ${itemIndex + 1} tiếng Việt`}
                              />

                              <input
                                className={inputClass}
                                value={listItemsEn[itemIndex] || ""}
                                onChange={(e) =>
                                  updateListItem("en", block.id, itemIndex, e.target.value)
                                }
                                placeholder={`Item ${itemIndex + 1} English`}
                              />

                              <button
                                type="button"
                                onClick={() => removeListItem(block.id, itemIndex)}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-600 hover:bg-red-100"
                              >
                                Xóa
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => addListItem(block.id)}
                            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            + Thêm mục
                          </button>
                        </div>
                      ) : block.type === "heading" ? (
                        <div className="space-y-4">
                          <div className="max-w-xs">
                            <label className={labelClass}>Cấp tiêu đề</label>
                            <select
                              className={inputClass}
                              value={block.data.level || 2}
                              onChange={(e) =>
                                updateSharedBlockField(block.id, "level", Number(e.target.value))
                              }
                            >
                              <option value={1}>H1</option>
                              <option value={2}>H2</option>
                              <option value={3}>H3</option>
                              <option value={4}>H4</option>
                            </select>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label className={labelClass}>Tiêu đề tiếng Việt</label>
                              <textarea
                                className={`${inputClass} min-h-[110px]`}
                                value={block.data.text || ""}
                                onChange={(e) =>
                                  updateLangBlockField("vi", block.id, "text", e.target.value)
                                }
                                placeholder="Nhập tiêu đề tiếng Việt..."
                              />
                            </div>

                            <div>
                              <label className={labelClass}>Heading (English)</label>
                              <textarea
                                className={`${inputClass} min-h-[110px]`}
                                value={blockEn.data.text || ""}
                                onChange={(e) =>
                                  updateLangBlockField("en", block.id, "text", e.target.value)
                                }
                                placeholder="Enter English heading..."
                              />
                            </div>
                          </div>
                        </div>
                      ) : block.type === "quote" ? (
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label className={labelClass}>Nội dung trích dẫn tiếng Việt</label>
                              <textarea
                                className={`${inputClass} min-h-[140px]`}
                                value={block.data.text || ""}
                                onChange={(e) =>
                                  updateLangBlockField("vi", block.id, "text", e.target.value)
                                }
                                placeholder="Nhập trích dẫn tiếng Việt..."
                              />
                            </div>

                            <div>
                              <label className={labelClass}>Quote (English)</label>
                              <textarea
                                className={`${inputClass} min-h-[140px]`}
                                value={blockEn.data.text || ""}
                                onChange={(e) =>
                                  updateLangBlockField("en", block.id, "text", e.target.value)
                                }
                                placeholder="Enter English quote..."
                              />
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <input
                              className={inputClass}
                              value={block.data.author || ""}
                              onChange={(e) =>
                                updateLangBlockField("vi", block.id, "author", e.target.value)
                              }
                              placeholder="Tác giả tiếng Việt"
                            />
                            <input
                              className={inputClass}
                              value={blockEn.data.author || ""}
                              onChange={(e) =>
                                updateLangBlockField("en", block.id, "author", e.target.value)
                              }
                              placeholder="Author (English)"
                            />
                          </div>
                        </div>
                      ) : block.type === "cta" ? (
                        <div className="space-y-4">
                          <div>
                            <label className={labelClass}>Đường dẫn nút</label>
                            <input
                              className={inputClass}
                              value={sharedLink}
                              onChange={(e) =>
                                updateSharedBlockField(block.id, "link", e.target.value)
                              }
                              placeholder="/booking"
                            />
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <input
                              className={inputClass}
                              value={block.data.text || ""}
                              onChange={(e) =>
                                updateLangBlockField("vi", block.id, "text", e.target.value)
                              }
                              placeholder="Text nút tiếng Việt"
                            />
                            <input
                              className={inputClass}
                              value={blockEn.data.text || ""}
                              onChange={(e) =>
                                updateLangBlockField("en", block.id, "text", e.target.value)
                              }
                              placeholder="Button text (English)"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className={labelClass}>
                              {block.type === "paragraph"
                                ? "Đoạn tiếng Việt"
                                : "Nội dung tiếng Việt"}
                            </label>
                            <textarea
                              className={`${inputClass} min-h-[180px]`}
                              value={block.data.text || ""}
                              onChange={(e) =>
                                updateLangBlockField("vi", block.id, "text", e.target.value)
                              }
                              placeholder="Nhập nội dung tiếng Việt..."
                            />
                          </div>

                          <div>
                            <label className={labelClass}>
                              {block.type === "paragraph"
                                ? "Paragraph (English)"
                                : "English content"}
                            </label>
                            <textarea
                              className={`${inputClass} min-h-[180px]`}
                              value={blockEn.data.text || ""}
                              onChange={(e) =>
                                updateLangBlockField("en", block.id, "text", e.target.value)
                              }
                              placeholder="Enter English content..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAddBlockModal(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-600 transition-colors hover:bg-red-100"
              >
                <Plus size={16} />
                <span>Thêm block phía dưới</span>
              </button>
            </div>

            {(errors.contentVi || errors.content) && (
              <div className="mt-4 space-y-1">
                {errors.contentVi && <p className={errorClass}>{errors.contentVi}</p>}
                {errors.content && <p className={errorClass}>{errors.content}</p>}
              </div>
            )}
          </section>
        </div>
      </div>

      {showAddBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="mb-4 text-xl font-semibold text-gray-900">Thêm block</h3>

            <div className="grid grid-cols-2 gap-3">
              {BLOCK_OPTIONS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => addBlock(item.type)}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 text-left text-gray-800 transition-colors hover:bg-gray-50"
                >
                  <span className="text-gray-600">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAddBlockModal(false)}
              className="mt-5 w-full rounded-xl px-4 py-3 text-gray-500 hover:bg-gray-50"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}