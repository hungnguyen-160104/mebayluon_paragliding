// app/baocao/thoi-tiet/page.tsx
"use client";

/**
 * TRANG THỜI TIẾT ĐIỂM BAY.
 *
 * Ai cũng vào được (trừ những vai không đứng ở điểm bay): trời xấu là việc của
 * cả ca trực — quầy vé cần biết để dừng bán, phi công cần biết để khỏi lên đèo
 * sớm, điều phối cần biết để gọi khách dời lịch từ tối hôm trước.
 *
 * Người có nhiều điểm thì đổi điểm ngay trên trang; mỗi điểm một toạ độ, một
 * bộ ngưỡng, một sổ kinh nghiệm riêng.
 */

import { todayInVN } from "@/lib/baobay/date";
import { wearsRole } from "@/lib/baobay/roles";
import { SPOTS } from "@/lib/baobay/spots";

import { useBaobaySession } from "../components/session";
import { Shell } from "../components/Shell";
import { ThoiTietCard } from "../components/ThoiTietCard";
import { useSpot } from "../components/spot";
import { PageLoading } from "../components/ui";

export default function TrangThoiTiet() {
  const { user, loading } = useBaobaySession();
  const { spot, setSpot, options } = useSpot(user?.spots);

  if (loading || !user) return <PageLoading />;

  const laQuanTri = user.role === "admin";
  /** Chấm kinh nghiệm là việc của người đứng điểm: điều phối và quản trị. */
  const laDieuPhoi = laQuanTri || wearsRole(user, "dispatcher") || wearsRole(user, "counter");

  /**
   * HIỆN MỌI ĐIỂM CÙNG LÚC, không bắt bấm chọn từng cái.
   *
   * Người kiêm nhiệm nhiều điểm (quản trị, kế toán, phi công bay cả hai nơi)
   * cần so ngang: mai Khau Phạ gió to mà Sa Pa đẹp thì dồn khách sang Sa Pa.
   * Bắt bấm qua lại là phải nhớ số của điểm vừa xem — nhớ sai thì điều nhầm.
   *
   * Điểm đang chọn (nút phía trên) xếp LÊN ĐẦU: đó là điểm người này làm hôm
   * nay, mở trang ra phải thấy ngay, không phải cuộn tìm.
   */
  const dsDiem = spot ? [spot, ...options.filter((s) => s !== spot)] : options;

  return (
    <Shell user={user} title="Thời tiết bay" subtitle="Dự báo 7 ngày · gió, giật, mưa · sổ kinh nghiệm">
      {options.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {options.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpot(s)}
              className={
                "rounded-lg border px-2 py-1 text-xs font-bold " +
                (spot === s ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-slate-700")
              }
              title="Đưa điểm này lên đầu trang"
            >
              {SPOTS.find((x) => x.id === s)?.name ?? s}
            </button>
          ))}
        </div>
      )}

      {dsDiem.length ? (
        <div className="space-y-3">
          {dsDiem.map((s) => (
            <ThoiTietCard key={s} spot={s} homNay={todayInVN()} laQuanTri={laQuanTri} laDieuPhoi={laDieuPhoi} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
          Tài khoản chưa được chỉ định điểm bay nào.
        </div>
      )}

      <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-[11px] leading-relaxed text-slate-600">
        <strong className="text-slate-800">Đọc thế nào:</strong> màu ô tính từ gió trung bình, gió giật, mưa và hướng
        gió so với ngưỡng của chính điểm bay này — không phải ngưỡng chung chung. Ngưỡng ban đầu lấy mức thường dùng
        cho bay đôi, và mỗi lần chấm <em>bay tốt / hạn chế / nghỉ</em> là máy học thêm một ngày; đủ 8 ngày trở lên nó
        sẽ đề nghị mốc gió khớp với cách anh quyết định. Máy chỉ đề nghị, người bấm áp dụng.
      </div>
    </Shell>
  );
}
