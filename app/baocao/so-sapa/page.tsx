// app/baocao/so-sapa/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

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

  if (loading || !user) return <PageLoading />;

  const canEdit = !user.spots?.length || user.spots.includes("sapa");

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
    </Shell>
  );
}
