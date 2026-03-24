// components/admin/posts/BlockEditor.tsx
"use client";

import { useState } from "react";
import {
  X,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import type {
  ContentBlock,
  ParagraphBlock,
  HeadingBlock,
  ImageBlock,
  GalleryBlock,
  QuoteBlock,
  ListBlock,
  CTABlock,
  VideoBlock,
  FAQBlock,
  TableBlock,
  HTMLBlock,
} from "@/types/post-blocks";
import api from "@/lib/api";
import { authHeader } from "@/lib/auth";

interface BlockEditorProps {
  block: ContentBlock;
  onChange: (block: ContentBlock) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export default function BlockEditor({
  block,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: BlockEditorProps) {
  const [uploading, setUploading] = useState(false);

  // Upload image helper
  async function uploadImage(file: File): Promise<string | null> {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const resp = await api<{ url: string }>("/api/uploads/image", {
        method: "POST",
        headers: { ...authHeader() },
        body: fd,
      });
      return resp.url;
    } catch {
      return null;
    } finally {
      setUploading(false);
    }
  }

  // Block type label
  const typeLabels: Record<string, string> = {
    paragraph: "Đoạn văn",
    heading: "Tiêu đề",
    image: "Ảnh",
    gallery: "Gallery",
    quote: "Trích dẫn",
    list: "Danh sách",
    cta: "CTA",
    video: "Video",
    faq: "FAQ",
    table: "Bảng",
    divider: "Đường kẻ",
    html: "HTML",
  };

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500";
  const textareaClass = `${inputClass} min-h-[100px] resize-y`;

  function renderEditor() {
    switch (block.type) {
      case "paragraph":
        return (
          <textarea
            className={textareaClass}
            value={(block as ParagraphBlock).content}
            onChange={(e) =>
              onChange({ ...block, content: e.target.value } as ParagraphBlock)
            }
            placeholder="Nhập nội dung đoạn văn..."
          />
        );

      case "heading":
        const hBlock = block as HeadingBlock;
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              {[2, 3, 4].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => onChange({ ...hBlock, level: level as 2 | 3 | 4 })}
                  className={`px-3 py-1 text-sm rounded-md border ${
                    hBlock.level === level
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  H{level}
                </button>
              ))}
            </div>
            <input
              className={inputClass}
              value={hBlock.content}
              onChange={(e) => onChange({ ...hBlock, content: e.target.value })}
              placeholder="Nhập tiêu đề..."
            />
          </div>
        );

      case "image":
        const imgBlock = block as ImageBlock;
        return (
          <div className="space-y-3">
            {imgBlock.url ? (
              <div className="relative">
                <img
                  src={imgBlock.url}
                  alt={imgBlock.alt || ""}
                  className="w-full max-h-48 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => onChange({ ...imgBlock, url: "" })}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-red-400 bg-gray-50">
                <div className="flex flex-col items-center">
                  {uploading ? (
                    <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400" />
                      <span className="text-sm text-gray-500 mt-1">Chọn ảnh</span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await uploadImage(file);
                      if (url) onChange({ ...imgBlock, url });
                    }
                  }}
                />
              </label>
            )}
            <input
              className={inputClass}
              value={imgBlock.alt || ""}
              onChange={(e) => onChange({ ...imgBlock, alt: e.target.value })}
              placeholder="Alt text (mô tả ảnh)..."
            />
            <input
              className={inputClass}
              value={imgBlock.caption || ""}
              onChange={(e) => onChange({ ...imgBlock, caption: e.target.value })}
              placeholder="Caption (chú thích)..."
            />
          </div>
        );

      case "gallery":
        const galBlock = block as GalleryBlock;
        return (
          <div className="space-y-3">
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-600">Số cột:</span>
              {[2, 3, 4].map((cols) => (
                <button
                  key={cols}
                  type="button"
                  onClick={() => onChange({ ...galBlock, columns: cols as 2 | 3 | 4 })}
                  className={`px-3 py-1 text-sm rounded-md border ${
                    galBlock.columns === cols
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {cols}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {galBlock.images.map((img, idx) => (
                <div key={idx} className="relative">
                  <img src={img.url} alt={img.alt || ""} className="w-full h-20 object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => {
                      const newImages = galBlock.images.filter((_, i) => i !== idx);
                      onChange({ ...galBlock, images: newImages });
                    }}
                    className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <label className="flex items-center justify-center h-20 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-red-400 bg-gray-50">
                {uploading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full" />
                ) : (
                  <Plus className="w-6 h-6 text-gray-400" />
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []);
                    for (const file of files) {
                      const url = await uploadImage(file);
                      if (url) {
                        galBlock.images.push({ url, alt: "", caption: "" });
                      }
                    }
                    onChange({ ...galBlock });
                  }}
                />
              </label>
            </div>
          </div>
        );

      case "quote":
        const quoteBlock = block as QuoteBlock;
        return (
          <div className="space-y-2">
            <textarea
              className={textareaClass}
              value={quoteBlock.content}
              onChange={(e) => onChange({ ...quoteBlock, content: e.target.value })}
              placeholder="Nhập nội dung trích dẫn..."
            />
            <input
              className={inputClass}
              value={quoteBlock.author || ""}
              onChange={(e) => onChange({ ...quoteBlock, author: e.target.value })}
              placeholder="Tác giả (tùy chọn)..."
            />
          </div>
        );

      case "list":
        const listBlock = block as ListBlock;
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...listBlock, style: "bullet" })}
                className={`px-3 py-1 text-sm rounded-md border ${
                  listBlock.style === "bullet"
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                • Bullet
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...listBlock, style: "numbered" })}
                className={`px-3 py-1 text-sm rounded-md border ${
                  listBlock.style === "numbered"
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                1. Numbered
              </button>
            </div>
            <div className="space-y-1">
              {listBlock.items.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    className={inputClass}
                    value={item}
                    onChange={(e) => {
                      const newItems = [...listBlock.items];
                      newItems[idx] = e.target.value;
                      onChange({ ...listBlock, items: newItems });
                    }}
                    placeholder={`Mục ${idx + 1}...`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = listBlock.items.filter((_, i) => i !== idx);
                      onChange({ ...listBlock, items: newItems.length ? newItems : [""] });
                    }}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...listBlock, items: [...listBlock.items, ""] })}
              className="text-sm text-red-500 hover:text-red-600"
            >
              + Thêm mục
            </button>
          </div>
        );

      case "cta":
        const ctaBlock = block as CTABlock;
        return (
          <div className="space-y-2">
            <textarea
              className={`${inputClass} min-h-[60px]`}
              value={ctaBlock.text}
              onChange={(e) => onChange({ ...ctaBlock, text: e.target.value })}
              placeholder="Nội dung CTA..."
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className={inputClass}
                value={ctaBlock.buttonText}
                onChange={(e) => onChange({ ...ctaBlock, buttonText: e.target.value })}
                placeholder="Text nút..."
              />
              <input
                className={inputClass}
                value={ctaBlock.buttonUrl}
                onChange={(e) => onChange({ ...ctaBlock, buttonUrl: e.target.value })}
                placeholder="URL..."
              />
            </div>
          </div>
        );

      case "video":
        const videoBlock = block as VideoBlock;
        return (
          <div className="space-y-2">
            <input
              className={inputClass}
              value={videoBlock.url}
              onChange={(e) => onChange({ ...videoBlock, url: e.target.value })}
              placeholder="URL YouTube hoặc Vimeo..."
            />
            <input
              className={inputClass}
              value={videoBlock.caption || ""}
              onChange={(e) => onChange({ ...videoBlock, caption: e.target.value })}
              placeholder="Chú thích (tùy chọn)..."
            />
            {videoBlock.url && (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-sm text-gray-500">Preview video</span>
              </div>
            )}
          </div>
        );

      case "faq":
        const faqBlock = block as FAQBlock;
        return (
          <div className="space-y-3">
            {faqBlock.items.map((item, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    value={item.question}
                    onChange={(e) => {
                      const newItems = [...faqBlock.items];
                      newItems[idx] = { ...item, question: e.target.value };
                      onChange({ ...faqBlock, items: newItems });
                    }}
                    placeholder="Câu hỏi..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = faqBlock.items.filter((_, i) => i !== idx);
                      onChange({
                        ...faqBlock,
                        items: newItems.length ? newItems : [{ question: "", answer: "" }],
                      });
                    }}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
                <textarea
                  className={`${inputClass} min-h-[60px]`}
                  value={item.answer}
                  onChange={(e) => {
                    const newItems = [...faqBlock.items];
                    newItems[idx] = { ...item, answer: e.target.value };
                    onChange({ ...faqBlock, items: newItems });
                  }}
                  placeholder="Câu trả lời..."
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...faqBlock,
                  items: [...faqBlock.items, { question: "", answer: "" }],
                })
              }
              className="text-sm text-red-500 hover:text-red-600"
            >
              + Thêm FAQ
            </button>
          </div>
        );

      case "table":
        const tableBlock = block as TableBlock;
        return (
          <div className="space-y-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {tableBlock.headers.map((h, idx) => (
                    <th key={idx} className="p-1">
                      <input
                        className={`${inputClass} font-medium`}
                        value={h}
                        onChange={(e) => {
                          const newHeaders = [...tableBlock.headers];
                          newHeaders[idx] = e.target.value;
                          onChange({ ...tableBlock, headers: newHeaders });
                        }}
                      />
                    </th>
                  ))}
                  <th className="w-8">
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          ...tableBlock,
                          headers: [...tableBlock.headers, `Cột ${tableBlock.headers.length + 1}`],
                          rows: tableBlock.rows.map((r) => [...r, ""]),
                        });
                      }}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Plus size={14} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableBlock.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-1">
                        <input
                          className={inputClass}
                          value={cell}
                          onChange={(e) => {
                            const newRows = [...tableBlock.rows];
                            newRows[rIdx] = [...newRows[rIdx]];
                            newRows[rIdx][cIdx] = e.target.value;
                            onChange({ ...tableBlock, rows: newRows });
                          }}
                        />
                      </td>
                    ))}
                    <td className="w-8">
                      <button
                        type="button"
                        onClick={() => {
                          const newRows = tableBlock.rows.filter((_, i) => i !== rIdx);
                          onChange({
                            ...tableBlock,
                            rows: newRows.length ? newRows : [tableBlock.headers.map(() => "")],
                          });
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...tableBlock,
                  rows: [...tableBlock.rows, tableBlock.headers.map(() => "")],
                })
              }
              className="text-sm text-red-500 hover:text-red-600"
            >
              + Thêm hàng
            </button>
          </div>
        );

      case "divider":
        return (
          <div className="py-2">
            <hr className="border-gray-300" />
          </div>
        );

      case "html":
        const htmlBlock = block as HTMLBlock;
        return (
          <textarea
            className={`${textareaClass} font-mono text-xs`}
            value={htmlBlock.content}
            onChange={(e) => onChange({ ...htmlBlock, content: e.target.value })}
            placeholder="<p>Nhập mã HTML...</p>"
          />
        );

      default:
        return <p className="text-sm text-gray-500">Block không hỗ trợ</p>;
    }
  }

  return (
    <div className="group relative bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50/50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            {typeLabels[block.type] || block.type}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            <ChevronDown size={16} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-500"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">{renderEditor()}</div>
    </div>
  );
}
