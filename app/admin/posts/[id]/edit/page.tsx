"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import PostEditor from "@/components/admin/posts/PostEditor";
import api from "@/lib/api";
import { authHeader, getToken } from "@/lib/auth";
import type { Post, PostPayload } from "@/types/frontend/post";

export default function AdminEditPostPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const postId = String(params?.id || "");

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }

    if (!postId) {
      router.replace("/admin/posts");
      return;
    }

    let cancelled = false;

    async function loadPost() {
      setLoading(true);
      try {
        const data = await api<Post>(`/api/posts/${postId}`, {
          headers: { ...authHeader() },
        });

        if (!cancelled) {
          setPost(data);
        }
      } catch (err: any) {
        console.error("Load post failed:", err);
        if (!cancelled) {
          setToast({
            type: "error",
            message: err?.message || "Không thể tải bài viết",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPost();

    return () => {
      cancelled = true;
    };
  }, [postId, router]);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function handleSave(data: PostPayload, publish: boolean) {
    if (!postId) return;

    setSaving(true);

    try {
      const payload = {
        ...data,
        isPublished: publish,
      };

      const updated = await api<Post>(`/api/posts/${postId}`, {
        method: "PUT",
        headers: {
          ...authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      setPost(updated);

      showToast(
        "success",
        publish ? "Đã cập nhật và xuất bản bài viết!" : "Đã lưu bản nháp!"
      );
    } catch (err: any) {
      console.error("Update post failed:", err);
      showToast("error", err?.message || "Không thể cập nhật bài viết");
      throw err;
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    router.push("/admin/posts");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <Link
            href="/admin/posts"
            className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            <span>Quay lại quản lý bài viết</span>
          </Link>

          <div className="h-6 w-px bg-gray-200" />

          <div>
            <h1 className="text-lg font-semibold text-gray-900">Chỉnh sửa bài viết</h1>
            <p className="text-xs text-gray-500">
              Cập nhật nội dung song ngữ Việt / Anh
            </p>
          </div>
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

      <div className="mx-auto max-w-7xl">
        {loading ? (
          <div className="flex h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
              <p className="mt-3 text-sm text-gray-500">Đang tải bài viết...</p>
            </div>
          </div>
        ) : post ? (
          <PostEditor
            post={post}
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
          />
        ) : (
          <div className="flex h-[60vh] items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500">Không tìm thấy bài viết</p>
              <Link
                href="/admin/posts"
                className="mt-4 inline-block rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-600"
              >
                Quay lại
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}