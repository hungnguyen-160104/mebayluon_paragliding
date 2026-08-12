// app/baocao/components/ReviewNotices.tsx
"use client";

import { useEffect, useState } from "react";

import { formatDateKeyVN } from "@/lib/baobay/date";

import { apiGet } from "./client-api";

/**
 * Băng rôn "kế toán yêu cầu soát lại" trên trang nhân sự.
 *
 * Máy chủ đã lọc theo vai trò (flycam chỉ tới điều phối + camera man, 360/cờ
 * đỏ/kéo cờ tới điều phối + phi công), nên khung này chỉ việc hiện. Nhân sự
 * soát xong thì sửa/lưu lại báo cáo như thường; lệnh tan khi kế toán đánh dấu
 * đã xử lý hoặc chốt ngày.
 */

type Review = { id: string; topicLabel: string; note: string; requestedBy: string; createdAt: string };

export function ReviewNotices({ spot, date }: { spot: string; date: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () =>
      apiGet<{ reviews: Review[] }>(`/api/baocao/review?date=${date}&spot=${spot}`)
        .then((r) => {
          if (alive) setReviews(r.reviews);
        })
        .catch(() => {
          /* không có lệnh thì thôi */
        });

    load();
    // Lệnh mới hiện trong vòng 30 giây, không cần tải lại trang
    const timer = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [spot, date]);

  if (!reviews.length) return null;

  return (
    <div className="rounded-2xl border-2 border-orange-400 bg-orange-50 p-4">
      <h2 className="text-sm font-bold text-orange-900">
        📣 Kế toán yêu cầu soát lại — ngày {formatDateKeyVN(date)}
      </h2>
      <ul className="mt-2 space-y-1.5">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-lg bg-white px-3 py-2 text-sm">
            <strong className="text-orange-900">{r.topicLabel}</strong>
            {r.note && <span className="text-slate-700"> — {r.note}</span>}
            <span className="ml-1 text-xs text-slate-500">({r.requestedBy})</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-orange-800">
        Kiểm lại số rồi sửa và lưu báo cáo của ngày này. Sai ở phía khác thì báo lại kế toán.
      </p>
    </div>
  );
}
