"use client";

import { useMemo, useState } from "react";
import { Calendar, Eye, EyeOff, Filter, Plus, Search, Star, Tag } from "lucide-react";
import type { Post } from "@/types/frontend/post";

const CATEGORIES = [
  { value: "", label: "Tất cả danh mục" },
  { value: "news", label: "Tin tức" },
  { value: "knowledge", label: "Kiến thức dù lượn" },
  { value: "store", label: "Cửa hàng" },
];

const STATUSES = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "published", label: "Đã xuất bản" },
  { value: "draft", label: "Bản nháp" },
];

interface PostSidebarProps {
  posts: Post[];
  selectedId: string | null;
  onSelect: (post: Post) => void;
  onCreateNew: () => void;
  loading?: boolean;
  filters: {
    search: string;
    category: string;
    status: string;
  };
  onFiltersChange: (filters: { search: string; category: string; status: string }) => void;
}

const categoryLabels: Record<string, string> = {
  news: "Tin tức",
  knowledge: "Kiến thức",
  store: "Cửa hàng",
};

export default function PostSidebar({
  posts,
  selectedId,
  onSelect,
  onCreateNew,
  loading,
  filters,
  onFiltersChange,
}: PostSidebarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = Boolean(filters.category || filters.status);

  const totalPublished = useMemo(
    () => posts.filter((post) => post.isPublished).length,
    [posts]
  );

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-gray-100 p-4">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Quản lý bài viết</h2>
        <p className="mb-4 text-xs text-gray-500">
          {totalPublished} đã xuất bản / {posts.length} tổng bài viết
        </p>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Tìm tiêu đề, slug, tag..."
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
              hasActiveFilters
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
            }`}
          >
            <Filter size={16} />
            <span>Bộ lọc</span>
            {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-red-500" />}
          </button>

          <button
            type="button"
            onClick={onCreateNew}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 py-2 text-white transition-colors hover:bg-red-600"
          >
            <Plus size={18} />
            <span>Tạo bài viết</span>
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 space-y-2 rounded-lg bg-gray-50 p-3">
            <select
              value={filters.category}
              onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-red-500 focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-red-500 focus:outline-none"
            >
              {STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() =>
                  onFiltersChange({
                    search: filters.search,
                    category: "",
                    status: "",
                  })
                }
                className="w-full text-sm text-red-500 hover:text-red-600"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
          </div>
        ) : posts.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-gray-500">Không tìm thấy bài viết nào</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {posts.map((post) => (
              <PostListItem
                key={post._id}
                post={post}
                isSelected={selectedId === post._id}
                onClick={() => onSelect(post)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 bg-gray-50 p-3">
        <p className="text-center text-xs text-gray-500">
          Hiển thị {posts.length} bài viết
        </p>
      </div>
    </div>
  );
}

function PostListItem({
  post,
  isSelected,
  onClick,
}: {
  post: Post;
  isSelected: boolean;
  onClick: () => void;
}) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const primaryTitle = post.titleVi || post.title;
  const secondaryTitle =
    post.title && post.titleVi && post.title !== post.titleVi ? post.title : "";

  const isFeatured = post.isFixed ?? post.fixed ?? false;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-3 text-left transition-colors hover:bg-gray-50 ${
        isSelected ? "border-l-4 border-l-red-500 bg-red-50" : ""
      }`}
    >
      <div className="flex gap-3">
        {post.coverImage ? (
          <img
            src={post.coverImage}
            alt=""
            className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <span className="text-xs text-gray-400">No img</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="mb-1 line-clamp-2 text-sm font-medium text-gray-900">
            {primaryTitle}
          </h3>

          {secondaryTitle && (
            <p className="mb-1 line-clamp-1 text-xs text-gray-500">{secondaryTitle}</p>
          )}

          <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
            <span className="truncate">/{post.slug}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {post.category && (
              <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                <Tag size={10} className="mr-1" />
                {categoryLabels[post.category] || post.category}
              </span>
            )}

            {isFeatured && (
              <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                <Star size={10} className="mr-1" />
                Nổi bật
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs ${
                post.isPublished
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {post.isPublished ? <Eye size={10} /> : <EyeOff size={10} />}
              {post.isPublished ? "Đã xuất bản" : "Nháp"}
            </span>

            <span className="inline-flex items-center text-xs text-gray-400">
              <Calendar size={10} className="mr-1" />
              {formatDate(post.updatedAt || post.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}