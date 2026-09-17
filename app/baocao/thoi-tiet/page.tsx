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
import { useState } from "react";

import { DIEM_CHI_CONG_KHAI, tenDiemThoiTiet } from "@/lib/baobay/khoa-thoi-tiet";

import { useBaobaySession } from "../components/session";
import { Shell } from "../components/Shell";
import { ThoiTietCard } from "../components/ThoiTietCard";
import { useSpot } from "../components/spot";
import { PageLoading } from "../components/ui";

export default function TrangThoiTiet() {
  const { user, loading } = useBaobaySession();
  const { spot, setSpot, options } = useSpot(user?.spots);
  /**
   * THU GỌN / XỔ RA từng điểm (chủ 17/09): trang liệt kê cả chục điểm, mỗi thẻ
   * cao cả màn hình — thu gọn thì còn dải 7 ngày + dòng tóm tắt (bản `gon`).
   * Điểm đang chọn luôn xổ; các điểm khác mặc định THU GỌN cho gọn trang.
   */
  const [xo, setXo] = useState<Record<string, boolean>>({});

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
  /**
   * ĐIỂM CHỈ CÓ TRÊN TRANG KHÁCH (Viên Nam, Sơn Trà, Quản Bạ, Phình Hồ, Đại
   * Huệ…) xếp SAU sổ của mình (chủ 17/09): chuyên gia chấm được mọi điểm, mỗi
   * điểm một sổ kinh nghiệm riêng — không còn cảnh nhận định của Khau Phạ hiện
   * lên mọi điểm trên web.
   */
  const dsCongKhai = DIEM_CHI_CONG_KHAI.map((d) => d.slug);
  const tatCa = [...dsDiem, ...dsCongKhai];
  const dangXo = (s: string) => (xo[s] ?? (s === (spot ?? dsDiem[0])));

  return (
    <Shell user={user} title="Thời tiết bay" subtitle="Dự báo 10 ngày · gió, giật, mưa · sổ kinh nghiệm">
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
              {tenDiemThoiTiet(s)}
            </button>
          ))}
        </div>
      )}

      {tatCa.length ? (
        <div className="space-y-3">
          {tatCa.map((s, i) => (
            <div key={s}>
              {i === dsDiem.length && (
                <div className="mb-1 mt-4 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Điểm khác trên web (chưa có sổ vận hành) — chuyên gia vẫn chấm và ghi nhận định được
                </div>
              )}
              <div className="mb-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setXo((p) => ({ ...p, [s]: !dangXo(s) }))}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  title={dangXo(s) ? "Thu gọn thẻ này" : "Xổ đầy đủ thẻ này"}
                >
                  {dangXo(s) ? "▾ Thu gọn" : "▸ Xổ ra"}
                </button>
                <span className="text-xs font-bold text-slate-800">{tenDiemThoiTiet(s)}</span>
              </div>
              <ThoiTietCard key={`${s}:${dangXo(s) ? "du" : "gon"}`} spot={s} homNay={todayInVN()} laQuanTri={laQuanTri} laDieuPhoi={laDieuPhoi} gon={!dangXo(s)} />
            </div>
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
