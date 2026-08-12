// app/baocao/components/MyShifts.tsx
"use client";

import { useEffect, useState } from "react";

import { todayInVN } from "@/lib/baobay/date";

import { apiGet } from "./client-api";

/**
 * Lịch bay của chính phi công, hiện ngay trên trang báo cáo.
 *
 * Email báo lịch là kênh chính nhưng hay bị mất hoặc đổi máy; đây là bản luôn
 * đúng, mở trang là thấy. Hôm nay được viền đậm để liếc một cái biết ngay hôm
 * nay có bay hay không.
 *
 * KHÔNG liên quan gì tới việc nhập báo cáo: hôm nào bay tăng cường đột xuất,
 * không có trong lịch, vẫn báo cáo bình thường.
 */

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

type MyShift = { month: string; daysInMonth: number; workDays: number[]; updatedAt?: string };

function weekdayOf(month: string, day: number): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).getUTCDay();
}

export function MyShifts({ spot, bilingual = false }: { spot: string; bilingual?: boolean }) {
  const today = todayInVN();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [data, setData] = useState<MyShift | null>(null);

  const t = (vi: string, en: string) => (bilingual ? `${vi} (${en})` : vi);

  /**
   * Cờ `alive` không phải trang trí: đổi tháng nhanh hai lần thì câu trả lời của
   * lần gọi CŨ có thể về sau và đè lên lịch của tháng mới.
   */
  useEffect(() => {
    let alive = true;

    apiGet<MyShift>(`/api/baocao/shifts?spot=${spot}&month=${month}`)
      .then((res) => {
        if (alive) setData(res);
      })
      .catch(() => {
        /* chưa có lịch thì thôi, không làm phiền người đang nhập số */
      });

    return () => {
      alive = false;
    };
  }, [spot, month]);

  if (!data) return null;

  const work = new Set(data.workDays);
  const isThisMonth = month === today.slice(0, 7);
  const todayDay = Number(today.slice(8, 10));
  const flyToday = isThisMonth && work.has(todayDay);
  const days = Array.from({ length: data.daysInMonth }, (_, i) => i + 1);
  const offCount = data.daysInMonth - work.size;

  /** Ngày bay tiếp theo tính từ hôm nay — câu hỏi hay gặp nhất sau "hôm nay có bay không". */
  const nextDay = isThisMonth ? days.find((d) => d > todayDay && work.has(d)) : undefined;

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <section className="rounded-2xl border-2 border-indigo-300 bg-indigo-50/60 p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-indigo-950">
          🗓️ {t("Lịch bay của tôi", "My schedule")}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="h-8 w-8 rounded-lg border border-indigo-300 bg-white text-sm text-indigo-700"
          >
            ‹
          </button>
          <span className="min-w-24 text-center text-sm font-medium text-slate-700">
            {`Tháng ${Number(month.slice(5))}/${month.slice(0, 4)}`}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="h-8 w-8 rounded-lg border border-indigo-300 bg-white text-sm text-indigo-700"
          >
            ›
          </button>
        </div>
      </div>

      {work.size === 0 ? (
        <p className="mt-2 text-sm text-slate-600">
          {t("Tháng này chưa có lịch", "no schedule yet")} — quản lý chưa chấm hoặc chưa gửi. Hôm nào bay
          tăng cường thì vẫn báo cáo bình thường.
        </p>
      ) : (
        <>
          {isThisMonth && (
            <p className="mt-2 text-sm">
              {flyToday ? (
                <span className="font-semibold text-emerald-700">
                  ✈️ {t("Hôm nay CÓ lịch bay", "flying today")}
                </span>
              ) : (
                <span className="font-semibold text-slate-600">
                  🌤️ {t("Hôm nay là ngày nghỉ", "day off today")}
                </span>
              )}
              {nextDay && (
                <span className="text-slate-600">
                  {" "}
                  · {t("bay tiếp ngày", "next flight day")} <strong>{nextDay}</strong>
                </span>
              )}
            </p>
          )}

          <div className="mt-3 grid grid-cols-7 gap-1">
            {days.map((d) => {
              const on = work.has(d);
              const isToday = isThisMonth && d === todayDay;
              return (
                <div
                  key={d}
                  className={
                    "rounded-lg py-1.5 text-center text-xs " +
                    (on ? "bg-emerald-500 font-bold text-white" : "bg-white text-slate-400") +
                    (isToday ? " ring-2 ring-indigo-600" : "")
                  }
                  title={on ? "Ngày bay" : "Ngày nghỉ"}
                >
                  <div className="text-[9px] opacity-70">{WEEKDAY[weekdayOf(month, d)]}</div>
                  {d}
                </div>
              );
            })}
          </div>

          <p className="mt-2 text-xs text-slate-600">
            <span className="inline-block h-3 w-3 rounded bg-emerald-500 align-middle" />{" "}
            {t("bay", "fly")} <strong>{work.size}</strong> {t("ngày", "days")} ·{" "}
            <span className="inline-block h-3 w-3 rounded border border-slate-300 bg-white align-middle" />{" "}
            {t("nghỉ", "off")} <strong>{offCount}</strong> {t("ngày", "days")}
            {data.updatedAt && ` · cập nhật ${new Date(data.updatedAt).toLocaleDateString("vi-VN")}`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Bay tăng cường ngoài lịch vẫn báo cáo bình thường — lịch không khoá việc nhập số.
          </p>
        </>
      )}
    </section>
  );
}
