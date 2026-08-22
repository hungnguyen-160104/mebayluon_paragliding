// app/baocao/components/InsuranceBox.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { apiGet, apiPost, apiPut } from "./client-api";
import {
  birthdayVN,
  emptyInsured,
  fromScanned,
  insuranceLabel,
  insuranceState,
  normalizeBirthday,
  type InsuredGuest,
} from "@/lib/baobay/insurance";
import type { ScannedPerson } from "@/lib/baobay/id-scan";

import { IdScanCard } from "./IdScanCard";
import { Banner, Button, TextInput } from "./ui";

/**
 * HỒ SƠ BẢO HIỂM ngay dưới dòng booking.
 *
 * Ai đang xem booking cũng bấm vào nhập được — khách đứng ở bãi thì gặp phi
 * công trước khi gặp quầy. Trường nào web/OTA đã có thì máy điền sẵn, nhân
 * viên chỉ bổ sung chỗ thiếu hoặc bấm quét CCCD/hộ chiếu.
 *
 * Thu gọn thì chỉ là MỘT DÒNG trạng thái: đủ thì xanh, thiếu thì đỏ kèm nút mở.
 * Danh sách booking hôm đông có mấy chục dòng, mở sẵn hết là không đọc nổi.
 */

type View = {
  bookingId: string;
  daySeq: number;
  flightDate: string;
  spotLabel: string;
  contactName: string;
  phone: string;
  bookingCode: string;
  guestCount: number;
  guests: InsuredGuest[];
  approvedAt?: string;
  approvedBy?: string;
  updatedBy?: string;
  sheetAt?: string;
  sheetError?: string;
  sheetConfigured: boolean;
  duplicateElsewhere: Array<{ idNumber: string; where: string }>;
};

export function InsuranceBox({
  spot,
  bookingId,
  guestCount,
  /** Trạng thái đã tính sẵn từ danh sách booking — hiện ngay, khỏi chờ gọi máy chủ. */
  preview,
}: {
  spot: string;
  bookingId: string;
  guestCount: number;
  preview?: { guests?: InsuredGuest[]; approvedAt?: string };
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const [guests, setGuests] = useState<InsuredGuest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  /** Chỉ số người đang mở khung quét — mỗi lúc một người, khỏi rối. */
  const [scanFor, setScanFor] = useState<number | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await apiGet<{ view: View }>(`/api/baocao/insurance?spot=${spot}&id=${bookingId}`);
      setView(r.view);
      setGuests(r.view.guests);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không tải được hồ sơ bảo hiểm");
    } finally {
      setBusy(false);
    }
  }, [spot, bookingId]);

  useEffect(() => {
    if (open && !view) void load();
  }, [open, view, load]);

  /** Số hiện trên dòng thu gọn: ưu tiên số máy chủ, chưa mở thì lấy tạm từ danh sách. */
  const shown = view ? view.guests : (preview?.guests ?? []);
  const st = insuranceState(shown, view ? view.guestCount : guestCount);
  const approved = Boolean(view?.approvedAt ?? preview?.approvedAt);

  const patch = (i: number, p: Partial<InsuredGuest>) =>
    setGuests((prev) => prev.map((g, k) => (k === i ? { ...g, ...p } : g)));

  async function save(approve: boolean) {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const r = await apiPost<{ view: View }>(`/api/baocao/insurance?spot=${spot}`, {
        id: bookingId,
        guests,
        approve,
      });
      setView(r.view);
      setGuests(r.view.guests);
      setDone(
        approve
          ? r.view.sheetConfigured
            ? "✓ Đã duyệt — đang đẩy sang bảng bảo hiểm"
            : "✓ Đã duyệt (chưa khai bảng bảo hiểm nên chưa đẩy đi đâu)"
          : "✓ Đã lưu",
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không lưu được");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError(null);
    try {
      const r = await apiPut<{ view: View }>(`/api/baocao/insurance?spot=${spot}`, { id: bookingId });
      setView(r.view);
      setDone("✓ Đã đẩy lại sang bảng bảo hiểm");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đẩy lại không được");
    } finally {
      setBusy(false);
    }
  }

  /** Giấy tờ trùng — trong chính booking này hoặc ở booking khác cùng ngày. */
  const dupHere = new Set(st.duplicateIds);
  const dupElse = new Map((view?.duplicateElsewhere ?? []).map((d) => [d.idNumber, d.where]));

  const tone = st.need === 0 ? "slate" : st.ok ? (approved ? "emerald" : "sky") : "rose";
  const toneClass =
    tone === "emerald"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
      : tone === "sky"
        ? "border-sky-300 bg-sky-50 text-sky-800"
        : tone === "rose"
          ? "border-rose-300 bg-rose-50 text-rose-800"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1 text-left text-[11px] font-semibold leading-tight ${toneClass}`}
      >
        <span className="shrink-0">🛡</span>
        <span className="min-w-0 flex-1">
          {approved && st.ok ? `Bảo hiểm ĐỦ ${st.ready}/${st.need} · đã duyệt` : insuranceLabel(st)}
          {view?.sheetError ? " · ⚠ chưa sang bảng" : view?.sheetAt ? " · đã sang bảng" : ""}
        </span>
        <span className="shrink-0 rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] font-bold">
          {open ? "Đóng" : st.ok ? "Xem" : "Thu thập dữ liệu bảo hiểm"}
        </span>
      </button>

      {open && (
        <div className="mt-1.5 rounded-xl border border-slate-200 bg-white p-2">
          {busy && !view && <p className="text-xs text-slate-500">Đang tải…</p>}
          {error && (
            <div className="mb-2">
              <Banner tone="error">{error}</Banner>
            </div>
          )}
          {done && (
            <div className="mb-2">
              <Banner tone="success">{done}</Banner>
            </div>
          )}

          {view && (
            <>
              <p className="mb-2 text-[11px] leading-tight text-slate-500">
                {view.spotLabel} · bay {view.flightDate} · {view.contactName || "khách"}
                {view.phone ? ` · ${view.phone}` : ""} · cần đủ {view.guestCount} người.
                {view.updatedBy ? ` Người nhập gần nhất: ${view.updatedBy}.` : ""}
              </p>

              {guests.map((g, i) => {
                const dup = g.idNumber && (dupHere.has(g.idNumber) || dupElse.has(g.idNumber));
                return (
                  <div
                    key={i}
                    className={
                      "mb-2 rounded-xl border p-2 " +
                      (g.cancelled
                        ? "border-slate-200 bg-slate-50 opacity-70"
                        : dup
                          ? "border-rose-400 bg-rose-50"
                          : "border-slate-200 bg-slate-50/60")
                    }
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">
                        Người {i + 1}
                        {g.cancelled ? " · ĐÃ HUỶ" : ""}
                      </span>
                      {g.source && (
                        <span className="rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-500">
                          {g.source === "web"
                            ? "khách tự điền trên web"
                            : g.source === "ota"
                              ? "OTA gửi kèm"
                              : g.source === "scan"
                                ? "quét giấy tờ"
                                : "nhập tay"}
                        </span>
                      )}
                      <span className="flex-1" />
                      <button
                        type="button"
                        onClick={() => setScanFor(scanFor === i ? null : i)}
                        className="h-7 rounded-lg border border-violet-300 bg-white px-2 text-[11px] font-semibold text-violet-700"
                      >
                        {scanFor === i ? "Đóng quét" : "🪪 Quét CCCD/HC"}
                      </button>
                      <button
                        type="button"
                        onClick={() => patch(i, { cancelled: !g.cancelled })}
                        className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-500"
                        title="Khách này không bay nữa — giữ dòng, đánh dấu huỷ để bên bảo hiểm rút tên"
                      >
                        {g.cancelled ? "Bay lại" : "Huỷ"}
                      </button>
                    </div>

                    {scanFor === i && (
                      <div className="mb-2">
                        <IdScanCard
                          embedded
                          onPick={(p: ScannedPerson) => {
                            patch(i, fromScanned(p));
                            setScanFor(null);
                          }}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-1.5 @md:grid-cols-3">
                      <label className="col-span-2 block @md:col-span-1">
                        <span className="mb-0.5 block text-[10px] font-medium text-slate-500">Họ và tên đầy đủ</span>
                        <TextInput value={g.fullName} onChange={(e) => patch(i, { fullName: e.target.value })} />
                      </label>
                      <label className="block">
                        <span className="mb-0.5 block text-[10px] font-medium text-slate-500">Ngày sinh</span>
                        <TextInput
                          defaultValue={birthdayVN(g.birthday)}
                          placeholder="dd/mm/yyyy"
                          onBlur={(e) => patch(i, { birthday: normalizeBirthday(e.target.value) })}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-0.5 block text-[10px] font-medium text-slate-500">Giới tính</span>
                        <div className="flex gap-1">
                          {(["nam", "nu"] as const).map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => patch(i, { gender: v })}
                              className={
                                "h-9 flex-1 rounded-lg border text-xs font-semibold " +
                                (g.gender === v
                                  ? "border-sky-500 bg-sky-500 text-white"
                                  : "border-slate-300 bg-white text-slate-600")
                              }
                            >
                              {v === "nam" ? "Nam" : "Nữ"}
                            </button>
                          ))}
                        </div>
                      </label>
                      <label className="block">
                        <span className="mb-0.5 block text-[10px] font-medium text-slate-500">Loại giấy tờ</span>
                        <select
                          value={g.idType}
                          onChange={(e) => patch(i, { idType: e.target.value as InsuredGuest["idType"] })}
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs"
                        >
                          <option value="">— chọn —</option>
                          <option value="cccd">CCCD</option>
                          <option value="passport">Hộ chiếu</option>
                          <option value="dinhdanh">Số định danh (trẻ chưa có CCCD)</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-0.5 block text-[10px] font-medium text-slate-500">Số giấy tờ</span>
                        <TextInput value={g.idNumber} onChange={(e) => patch(i, { idNumber: e.target.value })} />
                      </label>
                      <label className="block">
                        <span className="mb-0.5 block text-[10px] font-medium text-slate-500">Quốc tịch</span>
                        <TextInput value={g.nationality} onChange={(e) => patch(i, { nationality: e.target.value })} />
                      </label>
                      <label className="col-span-2 flex items-center gap-2 pt-1 @md:col-span-1">
                        <input
                          type="checkbox"
                          checked={g.isChild}
                          onChange={(e) => patch(i, { isChild: e.target.checked })}
                          className="h-4 w-4"
                        />
                        <span className="text-[11px] font-medium text-slate-600">Trẻ em (dưới 35 kg)</span>
                      </label>
                      <label className="col-span-2 block">
                        <span className="mb-0.5 block text-[10px] font-medium text-slate-500">
                          Bay THAY cho ai (nếu đổi người)
                        </span>
                        <TextInput
                          value={g.replacedName ?? ""}
                          placeholder="tên người đăng ký ban đầu"
                          onChange={(e) => patch(i, { replacedName: e.target.value })}
                        />
                      </label>
                    </div>

                    {dup && (
                      <p className="mt-1 text-[11px] font-semibold leading-tight text-rose-700">
                        ⚠ Số giấy tờ TRÙNG
                        {dupElse.has(g.idNumber) ? ` với ${dupElse.get(g.idNumber)}` : " với người khác trong booking này"}
                        {" — khai hai lần là bảo hiểm tính phí hai lần cho một người."}
                      </p>
                    )}
                  </div>
                );
              })}

              <div className="mb-2 flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 bg-white px-2.5 text-xs"
                  onClick={() => setGuests((prev) => [...prev, emptyInsured()])}
                >
                  ＋ Thêm người bay
                </Button>
                {view.sheetError && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 bg-white px-2.5 text-xs text-amber-700"
                    disabled={busy}
                    onClick={resend}
                  >
                    ⟳ Đẩy lại sang bảng
                  </Button>
                )}
              </div>

              {view.sheetError && (
                <p className="mb-2 text-[11px] leading-tight text-amber-700">
                  Bảng bảo hiểm chưa nhận được: {view.sheetError}
                </p>
              )}

              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 flex-1 bg-white text-xs"
                  disabled={busy}
                  onClick={() => save(false)}
                >
                  Lưu tạm
                </Button>
                <Button
                  type="button"
                  className="h-10 flex-1 bg-emerald-600 text-xs hover:bg-emerald-700"
                  disabled={busy}
                  onClick={() => save(true)}
                  title="Xác nhận đủ và đúng — đẩy sang bảng bảo hiểm"
                >
                  ✓ Duyệt & gửi bảo hiểm
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
