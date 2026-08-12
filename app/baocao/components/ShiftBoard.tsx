// app/baocao/components/ShiftBoard.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SPOTS, type SpotId } from "@/lib/baobay/spots";
import { todayInVN } from "@/lib/baobay/date";

/**
 * Bảng chấm lịch bay: hàng là phi công, cột là ngày 1…31.
 *
 * Chấm ô = hôm đó ĐI LÀM, ô trống = NGHỈ. Cố ý làm một bảng dàn ngang thay vì
 * mỗi ngày một danh sách: nhìn một cái là thấy ngày nào thiếu người và ai đang
 * làm liên tục quá nhiều hôm.
 *
 * Kéo ngang để chấm nhanh cả dãy (bấm giữ rồi rê) — xếp lịch cả tháng cho mười
 * người mà bấm từng ô thì mỏi tay.
 */

type Row = { username: string; pilotName: string; email: string; days: number[] };

type Board = {
  spot: string;
  month: string;
  daysInMonth: number;
  neededPerDay: number;
  rows: Row[];
  perDay: number[];
  version: number;
  updatedBy: string;
  updatedAt?: string;
  notifiedAt?: string;
  needsNotify: boolean;
};

type MailReport = {
  sent: Array<{ pilotName: string; email: string }>;
  skipped: Array<{ pilotName: string; reason: string }>;
  failed: Array<{ pilotName: string; email: string; error: string }>;
};

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function weekdayOf(month: string, day: number): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).getUTCDay();
}

export function ShiftBoard({
  api,
  authHeader,
}: {
  api: <T>(url: string, init?: RequestInit) => Promise<T>;
  authHeader: () => Record<string, string>;
}) {
  const [spot, setSpot] = useState<SpotId>("khau-pha");
  const [month, setMonth] = useState(todayInVN().slice(0, 7));
  const [board, setBoard] = useState<Board | null>(null);
  /** Bản đang sửa: username -> tập ngày làm. */
  const [draft, setDraft] = useState<Record<string, Set<number>>>({});
  const [needed, setNeeded] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [mail, setMail] = useState<MailReport | null>(null);
  /** Đang rê chuột để chấm cả dãy; giá trị là chấm-hay-xoá. */
  const [painting, setPainting] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setMail(null);
    try {
      const b = await api<Board>(`/api/admin/baocao/shifts?spot=${spot}&month=${month}`, {
        headers: authHeader(),
      });
      setBoard(b);
      setDraft(Object.fromEntries(b.rows.map((r) => [r.username, new Set(r.days)])));
      setNeeded(b.neededPerDay || Math.max(0, b.rows.length - 1));
      setDirty(false);
    } catch (e: any) {
      setError(e?.message || "Không tải được lịch bay");
    }
  }, [api, authHeader, spot, month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const stop = () => setPainting(null);
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, []);

  const days = useMemo(
    () => (board ? Array.from({ length: board.daysInMonth }, (_, i) => i + 1) : []),
    [board],
  );

  const perDay = useMemo(() => {
    if (!board) return [];
    return days.map((d) => board.rows.filter((r) => draft[r.username]?.has(d)).length);
  }, [board, days, draft]);

  function toggle(username: string, day: number, force?: boolean) {
    setDraft((prev) => {
      const set = new Set(prev[username] ?? []);
      const on = force ?? !set.has(day);
      if (on) set.add(day);
      else set.delete(day);
      return { ...prev, [username]: set };
    });
    setDirty(true);
  }

  /** Cả hàng: bấm tên là chấm hết tháng, bấm lần nữa là xoá hết. */
  function toggleRow(username: string) {
    setDraft((prev) => {
      const set = prev[username] ?? new Set<number>();
      const full = set.size >= days.length;
      return { ...prev, [username]: full ? new Set<number>() : new Set(days) };
    });
    setDirty(true);
  }

  /** Cả cột: bấm số ngày là cho cả đội đi làm hôm đó, bấm nữa là cho nghỉ hết. */
  function toggleDay(day: number) {
    if (!board) return;
    const all = board.rows.every((r) => draft[r.username]?.has(day));
    setDraft((prev) => {
      const next = { ...prev };
      for (const r of board.rows) {
        const set = new Set(next[r.username] ?? []);
        if (all) set.delete(day);
        else set.add(day);
        next[r.username] = set;
      }
      return next;
    });
    setDirty(true);
  }

  /**
   * Xếp lần lượt: mỗi ngày cho đúng một người nghỉ, xoay vòng theo thứ tự danh
   * sách. Tám phi công cần bảy người mỗi ngày thì đây chính là cách công ty vẫn
   * làm — chấm xong vẫn sửa tay được từng ô.
   */
  function autoRotate() {
    if (!board || !board.rows.length) return;
    const n = board.rows.length;
    setDraft(() => {
      const next: Record<string, Set<number>> = {};
      board.rows.forEach((r, i) => {
        const set = new Set<number>();
        for (const d of days) if ((d - 1) % n !== i) set.add(d);
        next[r.username] = set;
      });
      return next;
    });
    setDirty(true);
    setMessage(`Đã xếp lần lượt: mỗi ngày một người nghỉ, xoay vòng ${board.rows.length} phi công.`);
  }

  async function save() {
    if (!board) return;
    setBusy("save");
    setError(null);
    setMessage(null);
    try {
      const b = await api<Board>(`/api/admin/baocao/shifts?spot=${spot}`, {
        method: "PUT",
        headers: authHeader(),
        body: JSON.stringify({
          month,
          neededPerDay: needed,
          rows: board.rows.map((r) => ({ username: r.username, days: [...(draft[r.username] ?? [])] })),
        }),
      });
      setBoard(b);
      setDraft(Object.fromEntries(b.rows.map((r) => [r.username, new Set(r.days)])));
      setDirty(false);
      setMessage(`Đã lưu lịch (bản ${b.version}). Nhớ bấm "Gửi email" để phi công biết.`);
    } catch (e: any) {
      setError(e?.message || "Không lưu được lịch");
    } finally {
      setBusy(null);
    }
  }

  async function sendMail() {
    if (dirty && !window.confirm("Lịch đang sửa chưa lưu. Gửi email theo bản ĐÃ LƯU?")) return;
    setBusy("mail");
    setError(null);
    setMessage(null);
    try {
      const r = await api<MailReport>(`/api/admin/baocao/shifts?spot=${spot}`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ month }),
      });
      setMail(r);
      load();
    } catch (e: any) {
      setError(e?.message || "Không gửi được email");
    } finally {
      setBusy(null);
    }
  }

  const cellBase = "h-8 w-8 shrink-0 border-b border-r border-slate-200 text-[11px] font-medium";

  return (
    <section className="rounded-xl border-2 border-indigo-300 bg-indigo-50/50 p-5">
      <h2 className="font-semibold text-slate-900">🗓️ Lịch bay theo tháng</h2>
      <p className="mt-1 text-sm text-slate-600">
        Chấm ô = hôm đó <strong>đi làm</strong>, để trống = <strong>nghỉ</strong>. Bấm giữ rồi rê ngang để
        chấm nhanh cả dãy. Lưu xong bấm <strong>Gửi email</strong> để từng phi công nhận lịch của mình.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="flex flex-wrap gap-1">
          {SPOTS.map((sp) => (
            <button
              key={sp.id}
              type="button"
              onClick={() => setSpot(sp.id)}
              className={
                "rounded-lg px-3 py-1.5 text-xs font-medium " +
                (sp.id === spot
                  ? "bg-indigo-600 font-semibold text-white"
                  : "border border-slate-300 bg-white text-slate-700")
              }
            >
              {sp.name}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Tháng</span>
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="h-9 rounded-lg border border-slate-300 px-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Cần mỗi ngày</span>
          <input
            type="number"
            min={0}
            value={needed}
            onChange={(e) => {
              setNeeded(Number(e.target.value) || 0);
              setDirty(true);
            }}
            className="h-9 w-20 rounded-lg border border-slate-300 px-2 text-sm"
          />
        </label>

        <button
          type="button"
          onClick={autoRotate}
          className="h-9 rounded-lg border border-indigo-300 bg-white px-3 text-xs font-medium text-indigo-700"
        >
          Xếp lần lượt
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy === "save"}
          className="h-9 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy === "save" ? "Đang lưu…" : dirty ? "Lưu thay đổi" : "Đã lưu"}
        </button>
        <button
          type="button"
          onClick={sendMail}
          disabled={busy === "mail" || !board?.version}
          className="h-9 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy === "mail" ? "Đang gửi…" : "Gửi email lịch bay"}
        </button>
      </div>

      {board && (
        <p className="mt-2 text-xs text-slate-500">
          {board.version > 0
            ? `Bản ${board.version}${board.updatedBy ? ` · ${board.updatedBy}` : ""}${
                board.notifiedAt
                  ? ` · đã gửi email ${new Date(board.notifiedAt).toLocaleString("vi-VN")}`
                  : " · chưa gửi email lần nào"
              }`
            : "Tháng này chưa chấm lịch."}
          {board.needsNotify && (
            <span className="ml-1 font-medium text-amber-700">· có sửa sau lần gửi gần nhất</span>
          )}
        </p>
      )}

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}

      {mail && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <div className="font-medium text-emerald-800">Đã gửi {mail.sent.length} email</div>
          {mail.sent.length > 0 && (
            <div className="text-xs text-slate-600">{mail.sent.map((s) => s.pilotName).join(" · ")}</div>
          )}
          {mail.skipped.length > 0 && (
            <div className="mt-1 text-xs text-amber-700">
              Bỏ qua: {mail.skipped.map((s) => `${s.pilotName} (${s.reason})`).join(" · ")}
            </div>
          )}
          {mail.failed.length > 0 && (
            <div className="mt-1 text-xs text-rose-700">
              Hỏng: {mail.failed.map((s) => `${s.pilotName} — ${s.error}`).join(" · ")}
            </div>
          )}
        </div>
      )}

      {board && board.rows.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">
          Điểm bay này chưa có phi công nào đang làm việc — cấp tài khoản trước rồi mới chấm lịch được.
        </p>
      )}

      {board && board.rows.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <div className="min-w-max">
            {/* Hàng ngày tháng */}
            <div className="flex bg-slate-50">
              <div className="sticky left-0 z-10 w-40 shrink-0 border-b border-r border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                Phi công
              </div>
              {days.map((d) => {
                const wd = weekdayOf(month, d);
                const weekend = wd === 0 || wd === 6;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    title={`Chấm/bỏ cả cột ngày ${d}`}
                    className={
                      cellBase +
                      " leading-tight " +
                      (weekend ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-600")
                    }
                  >
                    <div className="text-[9px] opacity-70">{WEEKDAY[wd]}</div>
                    {d}
                  </button>
                );
              })}
              <div className="w-14 shrink-0 border-b border-slate-200 bg-slate-50 px-1 py-1 text-center text-[11px] font-semibold text-slate-700">
                Công
              </div>
            </div>

            {/* Mỗi phi công một hàng */}
            {board.rows.map((r) => {
              const set = draft[r.username] ?? new Set<number>();
              return (
                <div key={r.username} className="flex">
                  <button
                    type="button"
                    onClick={() => toggleRow(r.username)}
                    title="Chấm/bỏ cả tháng cho người này"
                    className="sticky left-0 z-10 w-40 shrink-0 truncate border-b border-r border-slate-200 bg-white px-2 py-1 text-left text-xs font-medium text-slate-800"
                  >
                    {r.pilotName}
                    {!r.email && <span className="ml-1 text-[10px] text-rose-600">(chưa có email)</span>}
                  </button>

                  {days.map((d) => {
                    const on = set.has(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onPointerDown={() => {
                          setPainting(!on);
                          toggle(r.username, d, !on);
                        }}
                        onPointerEnter={() => {
                          if (painting !== null) toggle(r.username, d, painting);
                        }}
                        className={
                          cellBase +
                          " " +
                          (on
                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                            : "bg-white text-slate-300 hover:bg-slate-100")
                        }
                      >
                        {on ? "✓" : ""}
                      </button>
                    );
                  })}

                  <div className="w-14 shrink-0 border-b border-slate-200 px-1 py-1 text-center text-xs font-semibold text-slate-700">
                    {set.size}
                  </div>
                </div>
              );
            })}

            {/* Hàng đếm: ngày nào thiếu người thì đỏ */}
            <div className="flex bg-slate-50">
              <div className="sticky left-0 z-10 w-40 shrink-0 border-r border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                Có mặt / ngày
              </div>
              {days.map((d, i) => {
                const n = perDay[i] ?? 0;
                const short = needed > 0 && n < needed;
                return (
                  <div
                    key={d}
                    className={
                      "h-8 w-8 shrink-0 border-r border-slate-200 pt-1.5 text-center text-[11px] font-semibold " +
                      (short ? "bg-rose-100 text-rose-700" : "text-slate-700")
                    }
                    title={short ? `Thiếu ${needed - n} người` : undefined}
                  >
                    {n}
                  </div>
                );
              })}
              <div className="w-14 shrink-0" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
