"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import PostSidebar from "@/components/admin/posts/PostSidebar";
import PostEditor from "@/components/admin/posts/PostEditor";
import type { Paginated, Post, PostPayload } from "@/types/frontend/post";
import api from "@/lib/api";
import { authHeader, getToken } from "@/lib/auth";

type FilterState = {
  search: string;
  category: string;
  status: string;
};

type ListResp = Paginated<Post>;

export default function AdminPostsPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "",
    status: "",
  });

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!getToken()) router.replace("/admin/login");
  }, [router]);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      params.set("sort", "-updatedAt,-createdAt");
      params.set("published", "all");

      if (filters.search) params.set("q", filters.search);
      if (filters.category) params.set("category", filters.category);
      if (filters.status === "published") params.set("published", "true");
      if (filters.status === "draft") params.set("published", "false");

      const resp = await api<ListResp>(`/api/posts?${params.toString()}`, {
        headers: { ...authHeader() },
      });

      setPosts(resp.items || []);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
      showToast("error", "Không thể tải danh sách bài viết");
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchPosts();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [fetchPosts]);

  const handleSelectPost = useCallback(
    async (postSummary: Post) => {
      try {
        setLoadingDetail(true);
        setIsCreating(false);

        const post = await api<Post>(`/api/posts/${postSummary._id}`, {
          headers: { ...authHeader() },
        });

        setSelectedPost(post);
      } catch (err) {
        console.error("Failed to fetch post detail:", err);
        showToast("error", "Không thể tải chi tiết bài viết");
      } finally {
        setLoadingDetail(false);
      }
    },
    [showToast]
  );

  const handleCreateNew = useCallback(() => {
    setSelectedPost(null);
    setIsCreating(true);
  }, []);

  const handleSave = useCallback(
    async (data: PostPayload, publish: boolean) => {
      setSaving(true);

      try {
        const payload = {
          ...data,
          isPublished: publish,
        };

        if (selectedPost?._id) {
          const updated = await api<Post>(`/api/posts/${selectedPost._id}`, {
            method: "PUT",
            headers: {
              ...authHeader(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          setSelectedPost(updated);
          showToast("success", publish ? "Đã cập nhật và xuất bản!" : "Đã lưu bản nháp!");
        } else {
          const created = await api<Post>("/api/posts", {
            method: "POST",
            headers: {
              ...authHeader(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          setSelectedPost(created);
          setIsCreating(false);
          showToast("success", publish ? "Đã tạo và xuất bản bài viết!" : "Đã tạo bản nháp!");
        }

        await fetchPosts();
      } catch (err: any) {
        console.error("Failed to save post:", err);
        showToast("error", err?.message || "Có lỗi xảy ra khi lưu bài viết");
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [fetchPosts, selectedPost, showToast]
  );

  const handleCancel = useCallback(() => {
    setSelectedPost(null);
    setIsCreating(false);
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-100">
      <header className="z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          <div className="h-6 w-px bg-gray-200" />

          <div>
            <h1 className="text-lg font-semibold text-gray-900">Quản lý bài viết</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Locale `vi` hiển thị tiếng Việt, các locale khác hiển thị tiếng Anh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{posts.length} bài viết</span>
        </div>
      </header>

      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-white shadow-lg ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toast.type === "error" && <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 flex-shrink-0 overflow-hidden border-r border-gray-200 lg:w-96">
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

        <div className="flex-1 overflow-hidden">
          {loadingDetail ? (
            <div className="flex h-full items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                <p className="mt-3 text-sm text-gray-500">Đang tải chi tiết bài viết...</p>
              </div>
            </div>
          ) : isCreating || selectedPost ? (
            <PostEditor
              post={selectedPost}
              onSave={handleSave}
              onCancel={handleCancel}
              saving={saving}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gray-200">
                  <svg
                    className="h-12 w-12 text-gray-400"
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

                <h3 className="mb-1 text-lg font-medium text-gray-900">
                  Chọn bài viết để chỉnh sửa
                </h3>
                <p className="mb-4 text-sm text-gray-500">
                  Hoặc tạo bài viết mới từ danh sách bên trái
                </p>

                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition-colors hover:bg-red-600"
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