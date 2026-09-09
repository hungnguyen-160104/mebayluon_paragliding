"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { BookingDTO } from "@/lib/baobay/types";

import { apiPatch } from "./client-api";

/**
 * SỔ BOOKING KIỂU BẢNG TÍNH — bấm thẳng vào ô là sửa.
 *
 * Kiểu xem thứ ba, cạnh THẺ và BẢNG, và mỗi kiểu giải một việc khác nhau:
 *   ☰ Thẻ  — làm việc với MỘT khách: đủ nút, đủ chỗ đọc, hợp lúc khách đứng trước mặt.
 *   ▦ Bảng — QUÉT MẮT cả ngày: xếp theo cột, so số nhanh, nhưng sửa phải mở thẻ.
 *   ▤ Sheet — GÕ cả ngày: sửa tại ô, chạy bằng bàn phím, không rời tay khỏi lưới.
 *
 * Sheet sinh ra cho lúc nhập bù cuối ngày, hoặc sửa một loạt sau khi đối chiếu:
 * mười lăm dòng cần sửa mỗi dòng một ô thì mở mười lăm cái thẻ là mười lăm lần
 * mất chỗ đang nhìn.
 *
 * VẪN ĐỦ NÚT. Cột "Thao tác" đứng CUỐI mỗi dòng mang đúng những nút của thẻ —
 * thu tiền, xuất vé, đã bay, bay không vé, sửa thu, bảo hiểm, ⋯ Thêm. Một lưới
 * chỉ sửa được số mà không thu được tiền thì cuối cùng vẫn phải quay lại thẻ,
 * và không ai dùng nó.
 *
 * BÀN PHÍM là thứ quyết định nó có được dùng hay không:
 *   Tab / Shift+Tab  sang ô bên, hết dòng thì xuống dòng dưới
 *   Enter · ↑ ↓      chạy dọc đúng một cột
 *   Esc              bỏ dở ô đang gõ, trả lại số cũ
 *
 * LƯU TỪNG Ô, không gom cả dòng: gõ xong một ô là nó bay đi ngay. Máy chủ tính
 * lại tổng tiền rồi trả về CẢ DÒNG — trình duyệt không tự tính tiền bao giờ.
 */

type CellKind = "text" | "num" | "money" | "time" | "status" | "names";

type Col = {
  key: string;
  label: string;
  /** Có tên trường thì ô sửa được; không thì máy tính, nền xám. */
  edit?: string;
  kind: CellKind;
  w: string;
  right?: boolean;
  strong?: boolean;
  title?: string;
};

const vnd = (n: number) => (n ? n.toLocaleString("vi-VN") : "");

const STATUS_LABEL: Record<string, string> = {
  open: "CHỜ BAY",
  done: "ĐÃ BAY",
  cancelled: "ĐÃ HUỶ",
  voided: "BỎ SỔ",
};

/**
 * Cột theo ĐIỂM BAY — mỗi điểm bán một bộ dịch vụ khác nhau, bày cột của điểm
 * khác chỉ tạo thêm chỗ gõ nhầm.
 *   Sa Pa    : không có bay hoàng hôn, không có xe lên núi
 *   Hà Nội   : có xe lên núi, không có PPG (chọn 650m/850m ở thẻ)
 *   Khau Phạ : có PPG lẫn hoàng hôn
 */
function buildCols(spot: string): Col[] {
  const kp = spot === "khau-pha";
  const hn = spot === "ha-noi";
  const sapa = spot === "sapa";
  return [
    { key: "daySeq", label: "STT", kind: "num", w: "w-12", right: true, title: "Số khách trong ngày — máy cấp, không sửa" },
    { key: "source", label: "Nguồn", edit: "source", kind: "text", w: "w-32" },
    { key: "bookingCode", label: "Mã book", edit: "bookingCode", kind: "text", w: "w-28" },
    { key: "guestNames", label: "Tên khách", edit: "guestNames", kind: "names", w: "w-52", title: "Mỗi khách một dòng" },
    { key: "phone", label: "SĐT", edit: "phone", kind: "text", w: "w-28" },
    { key: "guestCount", label: "Khách", edit: "guestCount", kind: "num", w: "w-14", right: true },
    ...(kp ? [{ key: "ppgGuests", label: "PPG", edit: "ppgGuests", kind: "num" as CellKind, w: "w-14", right: true }] : []),
    { key: "unitPrice", label: "Đơn giá", edit: "unitPrice", kind: "money", w: "w-24", right: true },
    { key: "lineAmount", label: "Thành tiền", kind: "money", w: "w-24", right: true },
    { key: "flycam", label: "Flycam", edit: "flycam", kind: "num", w: "w-14", right: true },
    { key: "video360", label: "360", edit: "video360", kind: "num", w: "w-14", right: true },
    { key: "redFlag", label: "Cờ đỏ", edit: "redFlag", kind: "num", w: "w-14", right: true },
    ...(sapa ? [] : [{ key: "sunset", label: "Hoàng hôn", edit: "sunset", kind: "num" as CellKind, w: "w-16", right: true }]),
    { key: "flagFlight", label: "Kéo cờ", edit: "flagFlight", kind: "num", w: "w-14", right: true },
    ...(hn ? [{ key: "mountainCar", label: "Xe núi", edit: "mountainCar", kind: "num" as CellKind, w: "w-14", right: true }] : []),
    { key: "pickupFee", label: "Phí đón", edit: "pickupFee", kind: "money", w: "w-24", right: true },
    { key: "discount", label: "Giảm trừ", edit: "discount", kind: "money", w: "w-24", right: true },
    { key: "totalAmount", label: "TỔNG", kind: "money", w: "w-28", right: true, strong: true },
    { key: "deposit", label: "Đã cọc", edit: "deposit", kind: "money", w: "w-24", right: true },
    { key: "remaining", label: "Còn thu", kind: "money", w: "w-24", right: true },
    { key: "expectedTime", label: "Giờ", edit: "expectedTime", kind: "time", w: "w-16" },
    { key: "pickupNote", label: "Điểm đón", edit: "pickupNote", kind: "text", w: "w-40" },
    { key: "status", label: "Trạng thái", edit: "status", kind: "status", w: "w-24" },
    { key: "note", label: "Ghi chú", edit: "note", kind: "text", w: "w-48" },
    { key: "contactNote", label: "Ghi chú gọi khách", edit: "contactNote", kind: "text", w: "w-44" },
  ];
}

function cellText(b: BookingDTO, col: Col): string {
  /** "Thành tiền" chỉ để NHÌN — tổng thật do máy chủ chốt, xem updateBookingCell. */
  if (col.key === "lineAmount") return vnd((b.unitPrice || 0) * (b.guestCount || 0));
  if (col.key === "guestNames") {
    const names = (b.otaGuests ?? []).map((g) => String(g.fullName || "").trim()).filter(Boolean);
    return names.length ? names.join("\n") : b.contactName || "";
  }
  const v = (b as unknown as Record<string, unknown>)[col.key];
  if (col.kind === "money") return vnd(Number(v) || 0);
  if (col.kind === "num") return Number(v) ? String(v) : "";
  if (col.kind === "status") return STATUS_LABEL[String(v)] ?? String(v ?? "");
  return String(v ?? "");
}

function cellEditValue(b: BookingDTO, col: Col): string {
  if (col.key === "guestNames") {
    const names = (b.otaGuests ?? []).map((g) => String(g.fullName || "").trim()).filter(Boolean);
    return names.length ? names.join("\n") : b.contactName || "";
  }
  if (col.kind === "money" || col.kind === "num") {
    const n = Number((b as unknown as Record<string, unknown>)[col.key]) || 0;
    return n ? String(n) : "";
  }
  return String((b as unknown as Record<string, unknown>)[col.key] ?? "");
}

export function BookingSheet({
  spot,
  open,
  closed,
  movedOut,
  tall,
  canEdit,
  canLock,
  onSaved,
  renderQuick,
  renderClosedQuick,
  renderMovedActions,
  renderMore,
  renderInsurance,
  renderMoneyCell,
}: {
  spot: string;
  open: BookingDTO[];
  closed: BookingDTO[];
  movedOut: BookingDTO[];
  tall?: boolean;
  canEdit: boolean;
  /**
   * Người này có quyền KHOÁ/MỞ KHOÁ dòng (kế toán, quản trị) hay không.
   *
   * Dòng đã khoá thì điều phối không sửa được, nhưng CHÍNH kế toán vẫn sửa —
   * họ là người khoá và mở khoá. Không truyền cờ này thì lưới khoá cả người có
   * quyền, và họ phải mở khoá rồi khoá lại chỉ để sửa một ô (máy chủ vẫn cho
   * qua, nên đây thuần là giao diện chặn oan).
   */
  canLock?: boolean;
  /** Máy chủ trả về dòng đã tính lại — thay đúng dòng đó ở danh sách của cha. */
  onSaved: (b: BookingDTO) => void;
  renderQuick?: (b: BookingDTO) => ReactNode;
  renderClosedQuick?: (b: BookingDTO) => ReactNode;
  renderMovedActions?: (b: BookingDTO) => ReactNode;
  renderMore?: (b: BookingDTO, close?: () => void) => ReactNode;
  renderInsurance?: (b: BookingDTO) => ReactNode;
  renderMoneyCell?: (b: BookingDTO) => ReactNode;
}) {
  const cols = useMemo(() => buildCols(spot), [spot]);
  const editCols = useMemo(() => cols.map((c, i) => (c.edit ? i : -1)).filter((i) => i >= 0), [cols]);
  /** Chưa bay trước, đã bay/huỷ sau — đúng thứ tự mắt người trực cần. */
  const rows = useMemo(() => [...open, ...closed], [open, closed]);

  const [sel, setSel] = useState<{ r: number; c: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Dòng đang xổ "⋯ Thêm" / bảo hiểm ngay dưới nó. */
  const [expanded, setExpanded] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing, sel]);

  const startEdit = useCallback(
    (r: number, c: number) => {
      const b = rows[r];
      const col = cols[c];
      if (!b || !col?.edit || !canEdit) return;
      /** Dòng đã khoá: chỉ người có quyền mở khoá mới sửa — máy chủ cũng xét đúng luật này. */
      if (b.locked && !canLock) return;
      setSel({ r, c });
      setDraft(cellEditValue(b, col));
      setEditing(true);
    },
    [rows, cols, canEdit, canLock],
  );

  const move = useCallback(
    (dr: number, dc: number) => {
      setSel((cur) => {
        if (!cur) return cur;
        let ci = editCols.indexOf(cur.c);
        let r = cur.r;
        if (dc) {
          ci += dc;
          if (ci < 0) {
            r -= 1;
            ci = editCols.length - 1;
          } else if (ci >= editCols.length) {
            r += 1;
            ci = 0;
          }
        }
        if (dr) r += dr;
        if (r < 0 || r >= rows.length) return cur;
        return { r, c: editCols[Math.max(0, Math.min(editCols.length - 1, ci))] };
      });
      setEditing(true);
    },
    [editCols, rows.length],
  );

  const commit = useCallback(
    async (r: number, c: number, value: string) => {
      const b = rows[r];
      const col = cols[c];
      if (!b || !col?.edit) return;
      if (value === cellEditValue(b, col)) return;

      const key = `${b.id}:${col.edit}`;
      setSaving(key);
      setError(null);
      try {
        const res = await apiPatch<{ booking: BookingDTO }>(`/api/baocao/booking?spot=${spot}`, {
          id: b.id,
          action: "cell",
          field: col.edit,
          value,
        });
        onSaved(res.booking);
      } catch (e: unknown) {
        setError(
          `#${b.daySeq || "?"} ${b.contactName || b.phone || "khách"} — ô "${col.label}": ` +
            (e instanceof Error ? e.message : "không lưu được"),
        );
      } finally {
        setSaving((s) => (s === key ? null : s));
      }
    },
    [rows, cols, spot, onSaved],
  );

  function onKey(e: React.KeyboardEvent, r: number, c: number) {
    if (e.key === "Escape") {
      e.preventDefault();
      setEditing(false);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      void commit(r, c, draft);
      move(0, e.shiftKey ? -1 : 1);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void commit(r, c, draft);
      move(1, 0);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      void commit(r, c, draft);
      move(e.key === "ArrowDown" ? 1 : -1, 0);
    }
  }

  const totals = {
    guests: rows.reduce((t, b) => t + (b.guestCount || 0), 0),
    total: rows.reduce((t, b) => t + (b.totalAmount || 0), 0),
    remaining: rows.reduce((t, b) => t + (b.remaining || 0), 0),
  };

  return (
    <div className="mt-2 space-y-1.5">
      {error && (
        <div className="rounded-lg border-2 border-rose-400 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-800">
          ⚠ {error}
          <button type="button" onClick={() => setError(null)} className="ml-2 underline">
            bỏ qua
          </button>
        </div>
      )}

      <div
        className="overflow-auto rounded-xl border border-slate-300 bg-white"
        style={{ maxHeight: tall ? "calc(100vh - 210px)" : "68vh" }}
      >
        <table className="min-w-max border-collapse text-[12px]">
          <thead className="sticky top-0 z-20">
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  title={c.title ?? (c.edit ? "Bấm vào ô để sửa" : "Máy tự tính — sửa ở ô gốc")}
                  className={
                    "border border-slate-300 px-2 py-1 text-[11px] font-bold " +
                    c.w +
                    (c.right ? " text-right" : " text-left") +
                    (c.edit ? " bg-slate-100 text-slate-700" : " bg-slate-200/90 text-slate-500")
                  }
                >
                  {c.label}
                </th>
              ))}
              {/* Cột thao tác đứng CUỐI và DÍNH mép phải: cuộn ngang tới đâu nút vẫn ở đó */}
              <th className="sticky right-0 z-10 border border-slate-300 bg-slate-700 px-2 py-1 text-left text-[11px] font-bold text-white">
                Thao tác
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((b, r) => {
              const done = b.status !== "open";
              return (
                <tr key={b.id}>
                  {cols.map((col, c) => {
                    const active = sel?.r === r && sel?.c === c;
                    const isEditing = active && editing && Boolean(col.edit);
                    const busy = saving === `${b.id}:${col.edit}`;
                    return (
                      <td
                        key={col.key}
                        onClick={() => col.edit && startEdit(r, c)}
                        className={
                          "border border-slate-200 px-1 py-0.5 align-top " +
                          col.w +
                          (col.right ? " text-right tabular-nums" : "") +
                          (col.edit && (!b.locked || canLock) ? " cursor-text" : " bg-slate-50 text-slate-500") +
                          (col.strong ? " font-bold text-sky-900" : "") +
                          (done ? " opacity-70" : "") +
                          (b.locked ? " bg-slate-100" : "") +
                          (active ? " outline outline-2 outline-sky-500" : "") +
                          (busy ? " bg-amber-100" : "")
                        }
                      >
                        {isEditing ? (
                          col.kind === "status" ? (
                            <select
                              ref={inputRef as React.MutableRefObject<HTMLSelectElement>}
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => onKey(e, r, c)}
                              onBlur={() => {
                                void commit(r, c, draft);
                                setEditing(false);
                              }}
                              className="w-full bg-white text-[12px] outline-none"
                            >
                              <option value="open">CHỜ BAY</option>
                              <option value="done">ĐÃ BAY</option>
                              <option value="cancelled">ĐÃ HUỶ</option>
                            </select>
                          ) : col.kind === "names" ? (
                            <textarea
                              ref={inputRef as React.MutableRefObject<HTMLTextAreaElement>}
                              value={draft}
                              rows={Math.max(2, draft.split("\n").length)}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => onKey(e, r, c)}
                              onBlur={() => {
                                void commit(r, c, draft);
                                setEditing(false);
                              }}
                              placeholder="mỗi khách một dòng"
                              className="w-full resize-none bg-white text-[12px] leading-tight outline-none"
                            />
                          ) : (
                            <input
                              ref={inputRef as React.MutableRefObject<HTMLInputElement>}
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => onKey(e, r, c)}
                              onBlur={() => {
                                void commit(r, c, draft);
                                setEditing(false);
                              }}
                              inputMode={col.kind === "money" || col.kind === "num" ? "numeric" : undefined}
                              placeholder={col.kind === "time" ? "08:00" : ""}
                              className={"w-full bg-white text-[12px] outline-none" + (col.right ? " text-right" : "")}
                            />
                          )
                        ) : (
                          <span
                            className={
                              "block min-h-[18px] " + (col.kind === "names" ? "whitespace-pre-line leading-tight" : "truncate")
                            }
                          >
                            {cellText(b, col)}
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* ĐỦ NÚT NHƯ THẺ — cùng những hàm render, không phải bản rút gọn */}
                  <td className="sticky right-0 z-10 border border-slate-200 bg-white px-1 py-0.5 align-top">
                    <div className="flex flex-wrap items-center gap-1">
                      {renderMoneyCell?.(b)}
                      {done ? renderClosedQuick?.(b) : renderQuick?.(b)}
                      {renderInsurance && (
                        <button
                          type="button"
                          onClick={() => setExpanded((x) => (x === `bh:${b.id}` ? null : `bh:${b.id}`))}
                          className="h-7 rounded-lg border border-violet-300 bg-violet-50 px-2 text-[11px] font-semibold text-violet-800"
                          title="Hồ sơ bảo hiểm — nhập và quét giấy tờ"
                        >
                          BH
                        </button>
                      )}
                      {renderMore && (
                        <button
                          type="button"
                          onClick={() => setExpanded((x) => (x === b.id ? null : b.id))}
                          className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-700"
                        >
                          ⋯ Thêm
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Dòng xổ của "⋯ Thêm" và "BH" — trải hết bề ngang, ngay dưới đúng dòng */}
            {rows.map((b) =>
              expanded === b.id || expanded === `bh:${b.id}` ? (
                <tr key={`x-${b.id}`}>
                  <td colSpan={cols.length + 1} className="border border-slate-200 bg-slate-50 px-2 py-2">
                    {expanded === b.id
                      ? renderMore?.(b, () => setExpanded(null))
                      : renderInsurance?.(b)}
                  </td>
                </tr>
              ) : null,
            )}

            {movedOut.map((b) => (
              <tr key={`m-${b.id}`} className="bg-amber-50">
                <td colSpan={cols.length} className="border border-slate-200 px-2 py-1 text-[11px] text-amber-900">
                  #{b.daySeq || "?"} {b.contactName || b.phone || "khách"} — <strong>đã dời sang ngày khác</strong>
                </td>
                <td className="sticky right-0 z-10 border border-slate-200 bg-amber-50 px-1 py-0.5">
                  {renderMovedActions?.(b)}
                </td>
              </tr>
            ))}

            {!rows.length && !movedOut.length && (
              <tr>
                <td colSpan={cols.length + 1} className="px-3 py-6 text-center text-slate-500">
                  Ngày này chưa có booking nào.
                </td>
              </tr>
            )}
          </tbody>

          {rows.length > 0 && (
            <tfoot className="sticky bottom-0 z-20">
              <tr className="bg-slate-800 text-white">
                {cols.map((c) => (
                  <td key={c.key} className={"border border-slate-600 px-2 py-1 font-bold " + (c.right ? "text-right" : "")}>
                    {c.key === "daySeq"
                      ? "Σ"
                      : c.key === "guestCount"
                        ? totals.guests
                        : c.key === "totalAmount"
                          ? vnd(totals.total)
                          : c.key === "remaining"
                            ? vnd(totals.remaining)
                            : ""}
                  </td>
                ))}
                <td className="sticky right-0 z-10 border border-slate-600 bg-slate-800" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="text-[11px] leading-tight text-slate-500">
        Bấm vào ô để sửa · <strong>Tab</strong> sang ô bên (hết dòng thì xuống dòng dưới) ·{" "}
        <strong>Enter</strong> và <strong>↑ ↓</strong> chạy dọc một cột · <strong>Esc</strong> bỏ dở.
        Ô nền xám là máy tự tính. Dòng kế toán đã khoá thì không sửa được.
      </p>
    </div>
  );
}
