// app/baocao/so-sapa/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { todayInVN } from "@/lib/baobay/date";
import type { SapaBookView } from "@/services/baobay.service";

import { apiGet, apiPost } from "../components/client-api";
import { useBaobaySession } from "../components/session";
import { Banner, Button, PageLoading } from "../components/ui";
import { Shell } from "../components/Shell";
import { SapaBookGrid } from "./SapaBookGrid";

/**
 * SỔ SA PA — bảng nhập liệu trong app, thay chỗ cho việc gõ vào Google Sheets.
 *
 * Cả tháng một màn hình, xếp theo ngày rồi theo số thứ tự khách, bố cục cột
 * dựng lại đúng sổ tay của điểm. Mục tiêu rõ ràng: nhân viên Sa Pa gõ thẳng ở
 * đây, bảng tính lùi về làm bản sao cho kế toán — hết cảnh hai sổ.
 *
 * Nút "Lấy từ bảng tính" vẫn nằm ở thẻ BOOKING MỚI bên trang điều phối: đó là
 * đường kéo những gì đã lỡ gõ bên kia về đây.
 */

/** "2026-09" — tháng đang xem. */
function thisMonth(): string {
  return todayInVN().slice(0, 7);
}

function shiftMonth(m: string, delta: number): string {
  const [y, mm] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mm - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function SoSapaPage() {
  const { user, loading } = useBaobaySession(["dispatcher", "counter", "accountant", "admin"]);

  const [month, setMonth] = useState(thisMonth());
  const [view, setView] = useState<SapaBookView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** Toàn màn hình — lưới rộng hơn ba mươi cột, màn thường xem không xuể. */
  const [fullScreen, setFullScreen] = useState(false);
  /** Ngày muốn mở khối mới (ngày chưa có khách nào trong tháng). */
  const [newDay, setNewDay] = useState("");

  useEffect(() => {
    if (!fullScreen) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setFullScreen(false);
    window.addEventListener("keydown", esc);
    /** Khoá cuộn nền: hai thanh cuộn lồng nhau thì lăn chuột không biết trúng cái nào. */
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, [fullScreen]);

  /**
   * KHÔNG xoá bảng cũ trước khi tải tháng mới — màn hình nháy trắng mỗi lần
   * bấm ‹ › là mất mạch làm việc. Giữ bảng cũ cho tới khi số mới về.
   */
  const load = useCallback(() => {
    apiGet<SapaBookView>(`/api/baocao/so-sapa?month=${month}`)
      .then(setView)
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được sổ Sa Pa"));
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  /** Kéo những gì nhân viên đã lỡ gõ bên Google Sheets về sổ này. */
  async function pullSheet() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await apiPost<{ message: string; warns: string[]; created: number; updated: number }>(
        "/api/baocao/booking/sync-sheet?spot=sapa",
        { direction: "pull" },
      );
      setNotice(`${r.message}${r.warns.length ? ` — ${r.warns.length} dòng cần nhìn lại: ${r.warns.join(" · ")}` : ""}`);
      if (r.created + r.updated > 0) load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không lấy được dữ liệu từ bảng tính");
    } finally {
      setBusy(false);
    }
  }

  /** Mở một ngày CHƯA có khách nào — sổ tay cũng gạch một khối ngày mới như vậy. */
  async function addDay() {
    if (!newDay) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/baocao/so-sapa", { flightDate: newDay });
      setNewDay("");
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không thêm được ngày");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) return <PageLoading />;

  const canEdit = !user.spots?.length || user.spots.includes("sapa");

  const fullScreenButton = (
    <Button type="button" variant="ghost" onClick={() => setFullScreen((v) => !v)}>
      {fullScreen ? "🗗 Thu nhỏ" : "⛶ Toàn màn hình"}
    </Button>
  );

  return (
    <Shell user={user} title="Sổ Sa Pa" subtitle="Bảng nhập liệu — bố cục y sổ tay của điểm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-1">
          <Button type="button" variant="ghost" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
            ‹
          </Button>
          <span className="min-w-28 text-center text-sm font-bold text-slate-800">
            Tháng {Number(month.slice(5, 7))}/{month.slice(0, 4)}
          </span>
          <Button type="button" variant="ghost" onClick={() => setMonth((m) => shiftMonth(m, 1))}>
            ›
          </Button>
        </div>
        {month !== thisMonth() && (
          <Button type="button" variant="ghost" onClick={() => setMonth(thisMonth())}>
            Về tháng này
          </Button>
        )}
        <Button type="button" variant="ghost" disabled={busy} onClick={() => void pullSheet()}>
          {busy ? "Đang lấy…" : "⬇ Lấy từ bảng tính"}
        </Button>
        {fullScreenButton}
        {canEdit && (
          <span className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-1 py-0.5">
            <input
              type="date"
              value={newDay}
              min={`${month}-01`}
              max={`${month}-31`}
              onChange={(e) => setNewDay(e.target.value)}
              className="h-7 rounded border border-slate-300 px-1 text-xs"
              title="Mở một khối ngày mới trong tháng này"
            />
            <Button type="button" variant="ghost" disabled={!newDay || busy} onClick={() => void addDay()}>
              + Ngày
            </Button>
          </span>
        )}
        {view && (
          <span className="text-xs text-slate-600">
            {view.totals.guests} khách · tổng {view.totals.total.toLocaleString("vi-VN")} đ · đã thu{" "}
            {view.totals.paid.toLocaleString("vi-VN")} đ
          </span>
        )}
      </div>

      {!canEdit && (
        <div className="mb-2">
          <Banner tone="warning">Tài khoản của bạn không được chỉ định điểm Sa Pa — chỉ xem, không sửa được.</Banner>
        </div>
      )}
      {error && (
        <div className="mb-2">
          <Banner tone="error">{error}</Banner>
        </div>
      )}
      {notice && (
        <div className="mb-2">
          <Banner tone="success" onClose={() => setNotice(null)}>
            {notice}
          </Banner>
        </div>
      )}

      {view ? <SapaBookGrid view={view} onReload={load} canEdit={canEdit} /> : <PageLoading label="Đang mở sổ…" />}

      {/**
       * TOÀN MÀN HÌNH phải PORTAL ra <body>: trang nằm trong khung Shell có
       * `max-w` và padding riêng, `fixed` bên trong đó vẫn bị hộp cha cắt ở
       * đáy nên lưới hụt một dải và phần dưới bị che. Ra thẳng body thì
       * `inset-0` phủ đúng cả cửa sổ.
       */}
      {fullScreen &&
        view &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex h-[100dvh] flex-col bg-slate-100 px-2 pb-1">
            <div className="flex flex-wrap items-center gap-2 py-1.5">
              <h2 className="text-sm font-bold text-slate-900">
                Sổ Sa Pa · tháng {Number(month.slice(5, 7))}/{month.slice(0, 4)}
              </h2>
              <span className="text-[11px] text-slate-600">
                {view.totals.guests} khách · tổng {view.totals.total.toLocaleString("vi-VN")} đ · đã thu{" "}
                {view.totals.paid.toLocaleString("vi-VN")} đ
              </span>
              <span className="ml-auto flex items-center gap-1">
                <Button type="button" variant="ghost" onClick={() => setMonth((m) => shiftMonth(m, -1))}>
                  ‹
                </Button>
                <Button type="button" variant="ghost" onClick={() => setMonth((m) => shiftMonth(m, 1))}>
                  ›
                </Button>
                {fullScreenButton}
              </span>
            </div>
            <div className="min-h-0 flex-1">
              <SapaBookGrid view={view} onReload={load} canEdit={canEdit} tall />
            </div>
          </div>,
          document.body,
        )}
    </Shell>
  );
}
