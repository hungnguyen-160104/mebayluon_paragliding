"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { endOfDay, startOfMonth } from "date-fns";
import api from "@/lib/api";
import { authHeader, getToken } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingsSection } from "@/components/admin/BookingsSection";
import { CustomersSection } from "@/components/admin/CustomersSection";
import {
  StatisticsDashboard,
  fetchStatisticsBundle,
  type FilterState,
} from "@/components/admin/statistics/StatisticsDashboard";
import type { Paginated, Post } from "@/types/frontend/post";
import type { StatisticsBundle } from "@/types/frontend/statistics";

type ListResp = Paginated<Post>;
const LIMIT = 10; // Đặt hằng số ra ngoài

// ===================================================================
// COMPONENT CHÍNH
// ===================================================================

export default function AdminDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State quản lý dữ liệu chính
  const [data, setData] = useState<ListResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // State quản lý phân trang
  const pageFromUrl = Number(searchParams.get("page") || "1");
  const [page, setPage] = useState<number>(pageFromUrl);
  const [activeTab, setActiveTab] = useState("posts");

  const [statsSeed, setStatsSeed] = useState<{ range: FilterState; data: StatisticsBundle } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  // 1. Đồng bộ state 'page' lên URL khi nó thay đổi
  useEffect(() => {
    const usp = new URLSearchParams(window.location.search);
    usp.set("page", String(page));
    router.replace(`/admin/dashboard?${usp.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // 2. Logic tải danh sách bài viết (được bọc trong useCallback)
  const loadPosts = useCallback(async () => {
    if (!getToken()) {
      router.replace("/admin/login");
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await api<ListResp>(
        `/api/posts?page=${page}&limit=${LIMIT}`,
        { headers: { ...authHeader() } }
      );
      setData(res);
    } catch (e: any) {
      if (String(e?.message || "").includes("401")) {
        router.replace("/admin/login");
        return;
      }
      setErr(e?.message || "Không tải được danh sách");
    } finally {
      setLoading(false);
    }
  }, [page, router]);

  // 3. Tải dữ liệu khi 'loadPosts' (tức là 'page') thay đổi
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const ensureStatsLoaded = useCallback(
    async (force = false) => {
      if (statsLoading) return;
      if (statsSeed && !force) return;
      setStatsLoading(true);
      setStatsError(null);
      const range = createDefaultStatsRange();
      try {
        const data = await fetchStatisticsBundle(range);
        setStatsSeed({ range, data });
      } catch (error) {
        console.error(error);
        setStatsError("Không thể tải dữ liệu thống kê. Vui lòng thử lại.");
      } finally {
        setStatsLoading(false);
      }
    },
    [statsSeed, statsLoading],
  );

  useEffect(() => {
    if (activeTab === "statistics") {
      ensureStatsLoaded();
    }
  }, [activeTab, ensureStatsLoaded]);

  // 4. Các hành động (xoá, publish)
  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Bạn có chắc chắn muốn xoá bài viết này?")) return;
      try {
        await api(`/api/posts/${id}`, {
          method: "DELETE",
          headers: { ...authHeader() },
        });
        await loadPosts();
      } catch (e: any) {
        alert(e?.message || "Xoá thất bại");
      }
    },
    [loadPosts]
  );

  const handleTogglePublish = useCallback(
    async (id: string, current: boolean) => {
      try {
        await api(`/api/posts/${id}/publish`, {
          method: "PATCH",
          headers: { ...authHeader() },
          body: JSON.stringify({ isPublished: !current }),
        });
        await loadPosts();
      } catch (e: any) {
        alert(e?.message || "Cập nhật trạng thái thất bại");
      }
    },
    [loadPosts]
  );

  // 5. Tính toán tổng số trang
  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil((data.total || 0) / (data.limit || LIMIT)));
  }, [data]);

  // 6. Render các trạng thái UI ban đầu
  if (loading && !data) return <CenteredMessage message="Đang tải danh sách…" />;
  if (err) return <CenteredMessage message={err} type="error" />;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-start pt-24 pb-8 px-4 md:px-8 overflow-y-auto bg-cover bg-center" // <-- ĐÃ SỬA Ở ĐÂY
      style={{ backgroundImage: "url('/hinh-nen-1.jpg')" }}
    >
      {/* Overlay mờ nhẹ - Giữ nguyên */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] z-0" />

      {/* Container chính của dashboard */}
      <div className="relative z-10 w-full max-w-7xl space-y-6">
        <DashboardHeader
          onRefresh={() => {
            loadPosts();
            if (activeTab === "statistics") {
              ensureStatsLoaded(true);
            }
          }}
        />

        {/* Tabs for Posts, Bookings, Customers */}
        <div
          className="rounded-2xl border border-white/20 shadow-xl 
                     bg-white/15 backdrop-blur-xl p-1"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-white/20 rounded-xl mb-6">
              <TabsTrigger 
                value="posts"
                className="data-[state=active]:bg-white/40 data-[state=active]:shadow-md rounded-lg text-sm md:text-base"
              >
                📝 Bài Viết
              </TabsTrigger>
              <TabsTrigger 
                value="bookings"
                className="data-[state=active]:bg-white/40 data-[state=active]:shadow-md rounded-lg text-sm md:text-base"
              >
                📅 Đơn Đặt Bay
              </TabsTrigger>
              <TabsTrigger 
                value="customers"
                className="data-[state=active]:bg-white/40 data-[state=active]:shadow-md rounded-lg text-sm md:text-base"
              >
                👥 Khách Hàng
              </TabsTrigger>
              <TabsTrigger 
                value="statistics"
                className="data-[state=active]:bg-white/40 data-[state=active]:shadow-md rounded-lg text-sm md:text-base"
              >
                📊 Thống kê
              </TabsTrigger>
            </TabsList>

            <div className="px-1 pb-1">
              {/* Tab: Posts */}
              <TabsContent value="posts" className="m-0">
                {!data?.items?.length ? (
                  <EmptyState />
                ) : (
                  <div className="space-y-5">
                    <PostTable
                      posts={data.items}
                      onDelete={handleDelete}
                      onTogglePublish={handleTogglePublish}
                      isLoading={loading}
                    />
                    <Pagination
                      currentPage={data.page}
                      totalPages={totalPages}
                      totalItems={data.total}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </TabsContent>

              {/* Tab: Bookings */}
              <TabsContent value="bookings" className="m-0">
                <BookingsSection />
              </TabsContent>

              {/* Tab: Customers */}
              <TabsContent value="customers" className="m-0">
                <CustomersSection />
              </TabsContent>

              {/* Tab: Statistics */}
              <TabsContent value="statistics" className="m-0">
                {statsSeed ? (
                  <StatisticsDashboard initialRange={statsSeed.range} initialData={statsSeed.data} />
                ) : (
                  <div className="rounded-2xl border border-white/20 bg-white/10 px-6 py-12 text-center text-gray-100">
                    {statsLoading ? (
                      <>
                        <p className="text-lg font-semibold">Đang tải thống kê...</p>
                        <p className="text-sm opacity-80 mt-2">Vui lòng đợi trong giây lát.</p>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-lg font-semibold">
                          {statsError || "Nhấn nút bên dưới để tải dữ liệu thống kê."}
                        </p>
                        <button
                          onClick={() => ensureStatsLoaded(true)}
                          className="px-5 py-2 rounded-xl bg-white/40 border border-white/50 text-gray-900 hover:bg-white/60 transition-colors duration-300 shadow-md font-medium"
                        >
                          {statsError ? "Thử lại" : "Tải thống kê"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// CÁC COMPONENT CON (UI - Glassmorphism Style - ĐÃ CẬP NHẬT)
// ===================================================================

/** Component hiển thị thông báo ở giữa màn hình (cho loading/error) */
function CenteredMessage({
  message,
  type = "info",
}: {
  message: string;
  type?: "info" | "error";
}) {
  const textColor = type === "error" ? "text-red-700" : "text-gray-900"; // Đổi sang chữ tối
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/hinh-nen.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px] z-0" />
      <div className="relative z-10 p-8 rounded-2xl bg-white/30 backdrop-blur-xl border border-white/40 shadow-lg">
        <p className={`text-lg font-medium ${textColor}`}>{message}</p>
      </div>
    </div>
  );
}

/** Header: Tiêu đề và các nút hành động chính */
function DashboardHeader({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div
      className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-2xl 
                 bg-white/15 backdrop-blur-xl 
                 border border-white/20 shadow-lg text-white" // Đổi nền xanh -> nền kính trắng
    >
      <h2 className="text-3xl font-bold drop-shadow-lg">Quản Lý Hệ Thống</h2>
      <div className="flex gap-4">
        <button
          className="px-5 py-2 rounded-xl bg-white/40 border border-white/50 text-gray-900 
                     hover:bg-white/60 transition-colors duration-300 shadow-md font-medium" // Đổi sang nút sáng, chữ tối
          onClick={onRefresh}
          title="Làm mới"
        >
          Làm mới
        </button>
        <Link
          href="/admin/posts"
          className="px-5 py-2 rounded-xl bg-blue-500 border border-blue-300 text-white
                     hover:bg-blue-600 transition-colors duration-300 shadow-md font-medium" // Đổi sang nút màu xanh dương
        >
          Quản lý bài viết
        </Link>
      </div>
    </div>
  );
}

/** Trạng thái khi không có bài viết nào */
function EmptyState() {
  return (
    <div
      className="p-12 text-center rounded-2xl border-2 border-dashed border-white/30 
                 bg-white/10 backdrop-blur-md 
                 shadow-inner text-gray-800" // Đổi sang nền kính trắng, chữ tối
    >
      <h3 className="text-xl font-medium drop-shadow-sm">Chưa có bài viết nào</h3>
      <div className="mt-5">
        <Link
          href="/admin/posts"
          className="px-6 py-2 rounded-xl bg-blue-500 border border-blue-300 text-white
                     hover:bg-blue-600 transition-colors duration-300 shadow-md font-medium" // Đổi sang nút màu xanh dương
        >
          Tạo bài viết đầu tiên
        </Link>
      </div>
    </div>
  );
}

/** Bảng hiển thị danh sách bài viết */
function PostTable({
  posts,
  onDelete,
  onTogglePublish,
  isLoading,
}: {
  posts: Post[];
  onDelete: (id: string) => void;
  onTogglePublish: (id: string, current: boolean) => void;
  isLoading: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/20 shadow-xl 
                 bg-white/15 backdrop-blur-xl 
                 ${isLoading ? "opacity-60 pointer-events-none" : "opacity-100"} 
                 transition-opacity duration-300`} // Đổi nền xanh -> nền kính trắng
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-gray-800">

          {/* Chữ tối cho toàn bảng */}
          <thead className="bg-white/20 border-b border-white/20">

            {/* Nền header sáng */}
            <tr>
              <th className="p-4 text-left font-semibold drop-shadow-sm w-2/5">
                Tiêu đề
              </th>
              <th className="p-4 text-left font-semibold drop-shadow-sm">
                Danh mục
              </th>
              <th className="p-4 text-left font-semibold drop-shadow-sm">
                Trạng thái
              </th>
              <th className="p-4 text-left font-semibold drop-shadow-sm min-w-[160px]">
                Thống kê
              </th>
              <th className="p-4 text-left font-semibold drop-shadow-sm min-w-[100px]">
                Cập nhật
              </th>
              <th className="p-4 text-left font-semibold drop-shadow-sm min-w-[210px]">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/15">
            {/* Đường kẻ mờ */}
            {posts.map((post) => (
              <PostTableRow
                key={post._id}
                post={post}
                onDelete={onDelete}
                onTogglePublish={onTogglePublish}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Component cho 1 hàng trong bảng */
function PostTableRow({
  post,
  onDelete,
  onTogglePublish,
}: {
  post: Post;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string, current: boolean) => void;
}) {
  const category = getCategoryDisplay(post.category);
  const status = getStatusDisplay(post.isPublished);

  // Style chung cho các nút bấm trong bảng (chữ tối, nền sáng)
  const glassBtnStyle = `
    px-3 py-1 text-xs rounded-lg 
    bg-white/20 border border-white/30 text-gray-800 
    hover:bg-white/40 transition-colors duration-200 shadow-sm
    backdrop-blur-sm font-medium
  `;

  return (
    <tr className="hover:bg-white/10 transition-colors duration-200">
      {/* Tiêu đề */}
      <td className="p-4 align-top">
        <div className="font-medium text-gray-900 line-clamp-2">
          {post.title}
        </div>
        <div className="text-xs text-gray-600 truncate mt-1">/{post.slug}</div>
      </td>
      {/* Danh mục */}
      <td className="p-4 align-top">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${category.className}`}
        >
          {category.text}
        </span>
      </td>
      {/* Trạng thái */}
      <td className="p-4 align-top">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${status.className}`}
        >
          {status.text}
        </span>
      </td>
      {/* Thống kê nhanh */}
      <td className="p-4 text-sm text-gray-800 align-top">
        <div className="flex flex-wrap gap-2">
          <StatBadge label="Lượt xem" value={post.views.toLocaleString("vi-VN")} className="bg-sky-100 text-sky-800 border-sky-200" />
          <StatBadge
            label="Tags"
            value={post.tags?.length ? post.tags.length : 0}
            className="bg-violet-100 text-violet-800 border-violet-200"
          />
          <StatBadge
            label="Ngôn ngữ"
            value={(post.language || "vi").toUpperCase()}
            className="bg-slate-100 text-slate-800 border-slate-200"
          />
        </div>
      </td>
      {/* Cập nhật */}
      <td className="p-4 text-xs text-gray-600 align-top">
        {new Date(post.updatedAt).toLocaleString("vi-VN")}
      </td>
      {/* Hành động */}
      <td className="p-4 align-top">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/posts/${post._id}/edit`}
            className={glassBtnStyle}
          >
            Sửa
          </Link>
          <button
            className={glassBtnStyle}
            onClick={() => onTogglePublish(post._id, post.isPublished)}
          >
            {post.isPublished ? "Ẩn" : "Xuất bản"}
          </button>
          <a
            className={glassBtnStyle}
            href={`/blog/${post.slug}`}
            target="_blank"
            rel="noreferrer"
          >
            Xem
          </a>
          <button
            className={`${glassBtnStyle} text-red-700 hover:bg-red-100 border-red-200`} // Nút xoá màu đỏ
            onClick={() => onDelete(post._id)}
          >
            Xoá
          </button>
        </div>
      </td>
    </tr>
  );
}

/** Phân trang */
function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number | ((prev: number) => number)) => void;
}) {
  return (
    <div
      className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl 
                 bg-white/15 backdrop-blur-xl 
                 border border-white/20 shadow-lg text-gray-800" // Nền kính trắng, chữ tối
    >
      <div className="text-sm text-gray-700">
        Trang{" "}
        <strong className="font-semibold text-gray-900">{currentPage}</strong> /{" "}
        {totalPages} (Tổng {totalItems} bài)
      </div>
      <div className="flex gap-3">
        <button
          className="px-4 py-2 text-sm rounded-lg bg-white/30 border border-white/40 text-gray-800 
                     hover:bg-white/50 transition-colors duration-300 shadow-md font-medium
                     disabled:opacity-50 disabled:cursor-not-allowed" // Nút sáng, chữ tối
          onClick={() => onPageChange((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
        >
          ← Trước
        </button>
        <button
          className="px-4 py-2 text-sm rounded-lg bg-white/30 border border-white/40 text-gray-800 
                     hover:bg-white/50 transition-colors duration-300 shadow-md font-medium
                     disabled:opacity-50 disabled:cursor-not-allowed" // Nút sáng, chữ tối
          onClick={() => onPageChange((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage >= totalPages}
        >
          Sau →
        </button>
      </div>
    </div>
  );
}

// ===================================================================
// CÁC HÀM TIỆN ÍCH (Helpers) - Đã điều chỉnh màu sắc badge
// ===================================================================

// Các hàm này đã khớp với phong cách trong ảnh (badge màu, chữ trắng)
// nên không cần thay đổi.

function createDefaultStatsRange(): FilterState {
  const now = new Date();
  return {
    from: startOfMonth(now).toISOString(),
    to: endOfDay(now).toISOString(),
    groupBy: "day",
  };
}

function getCategoryDisplay(category: string | undefined) {
  switch (category) {
    case "news":
      return {
        text: "Tin tức",
        className: "bg-blue-600/70 text-white shadow-sm", // Giống trong ảnh
      };
    case "knowledge":
      return {
        text: "Kiến thức",
        className: "bg-emerald-600/70 text-white shadow-sm", // Giống trong ảnh
      };
    default:
      return {
        text: category || "Chưa phân loại",
        className: "bg-gray-600/70 text-white shadow-sm",
      };
  }
}

function getStatusDisplay(isPublished: boolean) {
  if (isPublished) {
    return {
      text: "Đã xuất bản", // Giống "Duyệt" trong ảnh
      className: "bg-green-500/70 text-white shadow-sm",
    };
  }
  return {
    text: "Bản nháp", // Giống "Bản nháp" trong ảnh
    className: "bg-yellow-500/70 text-white shadow-sm",
  };
}

function StatBadge({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold ${className}`}
    >
      <span className="uppercase tracking-wide text-[10px] opacity-70">{label}</span>
      <span>{value}</span>
    </span>
  );
}