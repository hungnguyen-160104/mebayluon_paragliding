// app/admin/posts/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import PostSidebar from "@/components/admin/posts/PostSidebar";
import PostEditor from "@/components/admin/posts/PostEditor";
import type { Post } from "@/types/frontend/post";
import api from "@/lib/api";
import { authHeader, getToken } from "@/lib/auth";

export default function AdminPostsPage() {
  const router = useRouter();

  // Auth check
  useEffect(() => {
    if (!getToken()) router.replace("/admin/login");
  }, [router]);

  // State
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    status: "",
  });

  // Refs for debouncing
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      params.set("sort", "-createdAt");

      if (filters.search) params.set("q", filters.search);
      if (filters.category) params.set("category", filters.category);
      if (filters.status === "published") params.set("published", "true");
      if (filters.status === "draft") params.set("published", "false");

      const resp = await api<{ items: Post[]; total: number }>(
        `/api/posts?${params.toString()}`,
        { headers: { ...authHeader() } }
      );

      setPosts(resp.items || []);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
      showToast("error", "Không thể tải danh sách bài viết");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch on mount and when filters change
  useEffect(() => {
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchPosts();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [fetchPosts]);

  // Toast helper
  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  // Handle selecting a post to edit
  function handleSelectPost(post: Post) {
    // Check for unsaved changes
    if (isCreating || selectedPost) {
      // For now, just switch - could add confirmation dialog
    }
    setSelectedPost(post);
    setIsCreating(false);
  }

  // Handle creating new post
  function handleCreateNew() {
    setSelectedPost(null);
    setIsCreating(true);
  }

  // Handle save (create or update)
  async function handleSave(data: any, publish: boolean) {
    setSaving(true);
    try {
      if (selectedPost) {
        // Update existing post
        await api(`/api/posts/${selectedPost._id}`, {
          method: "PUT",
          headers: { ...authHeader() },
          body: JSON.stringify(data),
        });
        showToast("success", publish ? "Đã cập nhật và xuất bản!" : "Đã lưu bản nháp!");
      } else {
        // Create new post
        const path = data.type === "product" ? "/api/products" : "/api/posts";
        await api(path, {
          method: "POST",
          headers: { ...authHeader() },
          body: JSON.stringify(data),
        });
        showToast("success", publish ? "Đã xuất bản bài viết mới!" : "Đã lưu bản nháp!");
      }

      // Refresh list
      await fetchPosts();

      // Reset if creating
      if (isCreating) {
        setIsCreating(false);
        setSelectedPost(null);
      }
    } catch (err: any) {
      const msg = err?.message || "Có lỗi xảy ra khi lưu";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  }

  // Handle cancel
  function handleCancel() {
    setSelectedPost(null);
    setIsCreating(false);
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div className="h-6 w-px bg-gray-200" />
          <h1 className="text-lg font-semibold text-gray-900">Quản lý bài viết</h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {posts.length} bài viết
          </span>
        </div>
      </header>

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "error" && <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main content - 2 column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - post list */}
        <div className="w-80 lg:w-96 border-r border-gray-200 flex-shrink-0 overflow-hidden">
          <PostSidebar
            posts={posts}
            selectedId={selectedPost?._id || null}
            onSelect={handleSelectPost}
            onCreateNew={handleCreateNew}
            loading={loading}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>

        {/* Right panel - editor */}
        <div className="flex-1 overflow-hidden">
          {isCreating || selectedPost ? (
            <PostEditor
              post={selectedPost}
              onSave={handleSave}
              onCancel={handleCancel}
              saving={saving}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  Chọn bài viết để chỉnh sửa
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Hoặc tạo bài viết mới từ danh sách bên trái
                </p>
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                >
                  Tạo bài viết mới
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
