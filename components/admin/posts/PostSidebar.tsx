// components/admin/posts/PostSidebar.tsx
"use client";

import { useState } from "react";
import { Search, Plus, Filter, Calendar, Tag, Eye, EyeOff } from "lucide-react";
import type { Post } from "@/types/frontend/post";

// Category options
const CATEGORIES = [
  { value: "", label: "Tất cả danh mục" },
  { value: "news", label: "Tin tức" },
  { value: "knowledge", label: "Kiến thức dù lượn" },
  { value: "store", label: "Cửa hàng" },
];

// Status options
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

  const hasActiveFilters = filters.category || filters.status;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quản lý bài viết</h2>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            placeholder="Tìm kiếm bài viết..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
        </div>

        {/* Filter toggle & Create button */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
              hasActiveFilters
                ? "bg-red-50 border-red-200 text-red-600"
                : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <Filter size={16} />
            <span>Bộ lọc</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>

          <button
            type="button"
            onClick={onCreateNew}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
          >
            <Plus size={18} />
            <span>Tạo bài viết</span>
          </button>
        </div>

        {/* Filter dropdowns */}
        {showFilters && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
            <select
              value={filters.category}
              onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-red-500"
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
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-red-500"
            >
              {STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => onFiltersChange({ search: filters.search, category: "", status: "" })}
                className="w-full text-sm text-red-500 hover:text-red-600"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {/* Post list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-gray-500 text-sm">Không tìm thấy bài viết nào</p>
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

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Hiển thị {posts.length} bài viết
        </p>
      </div>
    </div>
  );
}

// Post list item component
function PostListItem({
  post,
  isSelected,
  onClick,
}: {
  post: Post;
  isSelected: boolean;
  onClick: () => void;
}) {
  const categoryLabels: Record<string, string> = {
    news: "Tin tức",
    knowledge: "Kiến thức",
    store: "Cửa hàng",
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
        isSelected ? "bg-red-50 border-l-4 border-l-red-500" : ""
      }`}
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        {post.coverImage ? (
          <img
            src={post.coverImage}
            alt=""
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
            <span className="text-gray-400 text-xs">No img</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
            {post.title}
          </h3>

          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span className="truncate">/{post.slug}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category badge */}
            {post.category && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                <Tag size={10} className="mr-1" />
                {categoryLabels[post.category] || post.category}
              </span>
            )}

            {/* Status badge */}
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                post.isPublished
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {post.isPublished ? <Eye size={10} /> : <EyeOff size={10} />}
              {post.isPublished ? "Đã xuất bản" : "Nháp"}
            </span>

            {/* Date */}
            <span className="inline-flex items-center text-xs text-gray-400">
              <Calendar size={10} className="mr-1" />
              {formatDate(post.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
