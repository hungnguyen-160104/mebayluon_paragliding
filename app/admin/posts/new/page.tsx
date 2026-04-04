"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import PostEditor from "@/components/admin/posts/PostEditor";
import api from "@/lib/api";
import { authHeader, getToken } from "@/lib/auth";
import type { Post, PostPayload } from "@/types/frontend/post";

export default function AdminNewPostPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/admin/login");
    }
  }, [router]);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function handleSave(data: PostPayload, publish: boolean) {
    setSaving(true);

    try {
      const payload = {
        ...data,
        isPublished: publish,
      };

      const created = await api<Post>("/api/posts", {
        method: "POST",
        headers: {
          ...authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      showToast(
        "success",
        publish ? "Đã tạo và xuất bản bài viết!" : "Đã tạo bản nháp!"
      );

      const id = created?._id;
      if (id) {
        router.replace(`/admin/posts/${id}`);
      } else {
        router.replace("/admin/posts");
      }
    } catch (err: any) {
      console.error("Create post failed:", err);
      showToast("error", err?.message || "Không thể tạo bài viết");
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
            <h1 className="text-lg font-semibold text-gray-900">Tạo bài viết mới</h1>
            <p className="text-xs text-gray-500">
              Bài viết song ngữ: `vi` hiển thị tiếng Việt, locale khác hiển thị tiếng Anh
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
        <PostEditor
          post={null}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={saving}
        />
      </div>
    </div>
  );
}