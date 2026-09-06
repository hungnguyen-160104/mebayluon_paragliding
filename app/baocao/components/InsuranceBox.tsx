// app/baocao/components/InsuranceBox.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { apiGet, apiPatch, apiPost, apiPut } from "./client-api";
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
  sentAt?: string;
  sentBy?: string;
  sentReason?: string;
  recalledAt?: string;
  recalledBy?: string;
  recallReason?: string;
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
  headless = false,
}: {
  spot: string;
  bookingId: string;
  guestCount: number;
  preview?: { guests?: InsuredGuest[]; approvedAt?: string; sentAt?: string; recalledAt?: string };
  /**
   * KHÔNG có thanh trạng thái + nút Xem: mở thẳng hồ sơ (luật chủ 05/09 — trong
   * BẢNG, ô BH đã nói đủ/thiếu và đã gửi/chưa bằng màu + icon, bấm số là xổ
   * luôn hồ sơ, khỏi qua thêm một bước "Xem").
   */
  headless?: boolean;
}) {
  const [open, setOpen] = useState(headless);
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
  /**
   * ĐÃ GỬI hay chưa mới là điều đáng quan tâm nhất — duyệt hồ sơ chỉ là "sẵn
   * sàng". Bảo hiểm rời đi lúc XUẤT VÉ: sớm hơn thì trời xấu không bay được là
   * mất phí, muộn hơn thì sự cố trước lúc gửi coi như không có bảo hiểm.
   */
  const sentAt = view?.sentAt ?? preview?.sentAt;
  const recalledAt = view?.recalledAt ?? preview?.recalledAt;
  const sent = Boolean(sentAt);
  const recalled = !sent && Boolean(recalledAt);
  const hhmm = (iso?: string) =>
    iso ? new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }) : "";

  async function move(action: "send" | "recall") {
    if (action === "recall" && !window.confirm("THU HỒI bảo hiểm của booking này? Bên bảo hiểm sẽ thấy dòng chuyển sang THU HỒI.")) return;
    const reason =
      action === "recall" ? (window.prompt("Thu hồi vì lý do gì? (bấm nhầm, khách huỷ, dời lịch…)") ?? "").trim() : "";
    if (action === "recall" && !reason) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const r = await apiPatch<{ view: View }>(`/api/baocao/insurance?spot=${spot}`, {
        id: bookingId,
        action,
        reason,
      });
      setView(r.view);
      setGuests(r.view.guests);
      setDone(action === "send" ? "✓ Đã gửi bảo hiểm" : "✓ Đã thu hồi bảo hiểm");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thực hiện được");
    } finally {
      setBusy(false);
    }
  }

  const patch = (i: number, p: Partial<InsuredGuest>) =>
    setGuests((prev) => prev.map((g, k) => (k === i ? { ...g, ...p } : g)));

  /**
   * `list` = danh sách cần lưu, mặc định là state hiện tại. Quét giấy tờ xong
   * truyền thẳng danh sách vừa điền để LƯU NGAY (luật chủ 05/09): quét hai
   * người liền rồi mới bấm Lưu từng bị mất người trước — giờ mỗi lần quét xong
   * là hồ sơ đã nằm trên máy chủ, Lưu tạm/Duyệt chỉ còn là chốt lại.
   */
  async function save(approve: boolean, list: InsuredGuest[] = guests) {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const r = await apiPost<{ view: View }>(`/api/baocao/insurance?spot=${spot}`, {
        id: bookingId,
        guests: list,
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

  /**
   * Bốn trạng thái, mỗi cái một màu để liếc là biết:
   *   đỏ   — hồ sơ còn thiếu, chưa gửi được
   *   hổ phách — đủ rồi nhưng CHƯA GỬI (chờ xuất vé)
   *   xanh lá  — ĐÃ GỬI, người bay đã có bảo hiểm
   *   xám  — đã thu hồi
   */
  const stuck = Boolean(view?.sheetError);
  const tone =
    st.need === 0 ? "slate" : stuck ? "rose" : recalled ? "slate" : sent && !st.ok ? "amber" : sent ? "emerald" : st.ok ? "amber" : "rose";
  const toneClass =
    tone === "emerald"
      ? "border-emerald-400 bg-emerald-50 text-emerald-800"
      : tone === "amber"
        ? "border-amber-400 bg-amber-50 text-amber-900"
        : tone === "rose"
          ? "border-rose-300 bg-rose-50 text-rose-800"
          : "border-slate-300 bg-slate-100 text-slate-600";

  const headline = stuck && sent
    ? `⚠ ĐÃ GỬI nhưng CHƯA SANG BẢNG bảo hiểm — ${view?.sheetError}`
    : recalled
    ? `Bảo hiểm ĐÃ THU HỒI${view?.recallReason ? ` — ${view.recallReason}` : ""}`
    : sent && !st.ok
      ? `⚠ ĐÃ GỬI ${hhmm(sentAt)} nhưng hồ sơ mới đủ ${st.ready}/${st.need} — bổ sung giấy tờ rồi Lưu để bảng cập nhật`
    : sent
      ? `✅ ĐÃ GỬI bảo hiểm ${hhmm(sentAt)}${view?.sentReason ? ` (${view.sentReason})` : ""}`
      : st.ok
        ? `Bảo hiểm đủ ${st.ready}/${st.need} — CHƯA GỬI, sẽ gửi khi xuất vé`
        : insuranceLabel(st);

  return (
    <div className={headless ? "" : "mt-1.5"}>
      {!headless && (
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1 text-left text-[11px] font-semibold leading-tight ${toneClass}`}
      >
        <span className="shrink-0">🛡</span>
        <span className="min-w-0 flex-1">
          {headline}
          {view?.sheetError ? " · ⚠ chưa sang bảng" : ""}
        </span>
        <span className="shrink-0 rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] font-bold">
          {open ? "Đóng" : st.ok ? "Xem" : "Thu thập dữ liệu bảo hiểm"}
        </span>
      </button>
      )}

      {open && (
        <div className={headless ? "" : "mt-1.5 rounded-xl border border-slate-200 bg-white p-2"}>
          {/* Bản không thanh: vẫn nói một dòng đã gửi/chưa gửi ngay đầu hồ sơ */}
          {headless && <p className={`mb-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${toneClass}`}>{headline}</p>}
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
                {view.approvedBy ? ` Đã duyệt bởi ${view.approvedBy}.` : ""}
              </p>

              {guests.map((g, i) => {
                const dup = g.idNumber && (dupHere.has(g.idNumber) || dupElse.has(g.idNumber));
                return (
                  <div
                    key={i}
                    className={
                      "mb-1.5 rounded-xl border p-1.5 " +
                      (g.cancelled
                        ? "border-slate-200 bg-slate-50 opacity-70"
                        : dup
                          ? "border-rose-400 bg-rose-50"
                          : "border-slate-200 bg-slate-50/60")
                    }
                  >
                    {/* Hàng đầu tự xuống dòng khi màn hẹp; nút Quét và Xoá có NỀN MÀU cho dễ
                        nhận, bỏ icon vì chiếm chỗ làm chữ tràn ra ngoài (luật chủ 04/09). */}
                    <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
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
                      <span className="ml-auto flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setScanFor(scanFor === i ? null : i)}
                        className={
                          "h-7 whitespace-nowrap rounded-lg px-2 text-[11px] font-bold " +
                          (scanFor === i ? "border border-violet-300 bg-white text-violet-700" : "bg-violet-600 text-white")
                        }
                      >
                        {scanFor === i ? "Đóng quét" : "Quét CCCD/HC"}
                      </button>
                      <button
                        type="button"
                        onClick={() => patch(i, { cancelled: !g.cancelled })}
                        className="h-7 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-medium text-slate-500"
                        title="Khách này không bay nữa — giữ dòng, đánh dấu huỷ để bên bảo hiểm rút tên"
                      >
                        {g.cancelled ? "Bay lại" : "Huỷ"}
                      </button>
                      {/*
                        XOÁ HẲN — khác với "Huỷ". Huỷ là khách có thật nhưng
                        không bay; xoá là dòng này KHÔNG NÊN TỒN TẠI (quét nhầm
                        người, quét trùng, cần quét lại). Đã gửi bảo hiểm rồi
                        thì máy chủ tự đẩy dòng "THU HỒI" sang bảng cho bên kia
                        rút tên.
                      */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm(`Xoá hẳn hồ sơ của người ${i + 1}${g.fullName ? ` (${g.fullName})` : ""}?\n\nDùng khi quét nhầm người hoặc cần quét lại. Khách có thật mà không bay thì bấm “Huỷ”.`)) return;
                          setGuests((prev) => prev.filter((_, k) => k !== i));
                          if (scanFor === i) setScanFor(null);
                        }}
                        className="h-7 whitespace-nowrap rounded-lg bg-rose-600 px-2 text-[11px] font-bold text-white"
                        title="Quét nhầm người / quét trùng — xoá hẳn dòng này"
                      >
                        Xoá
                      </button>
                      </span>
                    </div>

                    {scanFor === i && (
                      <div className="mb-2">
                        <IdScanCard
                          embedded
                          onPick={(p: ScannedPerson) => {
                            const next = guests.map((g, k) => (k === i ? { ...g, ...fromScanned(p) } : g));
                            setGuests(next);
                            setScanFor(null);
                            // Lưu ngay — không chờ bấm Lưu (xem chú thích ở save)
                            void save(false, next);
                          }}
                        />
                      </div>
                    )}

                    {/* Lưới THẤP và CHẶT (luật chủ 04/09): điện thoại 2 cột, desktop 6 cột
                        gói 8 ô vào 2 hàng; ô cao 32px thay vì 40px; nhãn đứng trong ô. */}
                    <div className="grid grid-cols-2 gap-1 @md:grid-cols-6 [&_input]:h-8 [&_input]:text-xs [&_select]:h-8">
                      <label className="col-span-2 block">
                        <span className="mb-0.5 block text-[10px] font-medium leading-none text-slate-500">Họ và tên đầy đủ</span>
                        <TextInput value={g.fullName} placeholder="như trên giấy tờ" onChange={(e) => patch(i, { fullName: e.target.value })} />
                      </label>
                      <label className="block">
                        <span className="mb-0.5 block text-[10px] font-medium leading-none text-slate-500">Ngày sinh</span>
                        {/* Ô KHÔNG KIỂM SOÁT (defaultValue) để gõ dở không bị cha vẽ đè; đổi
                            lại phải TỰ GHI chữ đã chuẩn hoá vào ô — trước chỉ patch state, gõ
                            "22021999" máy hiểu đúng nhưng ô vẫn trơ dãy số (chuyện thật 06/09). */}
                        <TextInput
                          defaultValue={birthdayVN(g.birthday)}
                          placeholder="dd/mm/yyyy"
                          inputMode="numeric"
                          onChange={(e) => {
                            // Gõ liền đủ 8 số (ddmmyyyy) là nhận ngay, không chờ rời ô
                            if (!/^\d{8}$/.test(e.target.value)) return;
                            const iso = normalizeBirthday(e.target.value);
                            if (!iso) return;
                            e.target.value = birthdayVN(iso);
                            patch(i, { birthday: iso });
                          }}
                          onBlur={(e) => {
                            const iso = normalizeBirthday(e.target.value);
                            if (iso) e.target.value = birthdayVN(iso);
                            patch(i, { birthday: iso });
                          }}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-0.5 block text-[10px] font-medium leading-none text-slate-500">Giới tính</span>
                        <div className="flex gap-1">
                          {(["nam", "nu"] as const).map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => patch(i, { gender: v })}
                              className={
                                "h-8 flex-1 rounded-lg border text-xs font-semibold " +
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
                        <span className="mb-0.5 block text-[10px] font-medium leading-none text-slate-500">Giấy tờ</span>
                        <select
                          value={g.idType}
                          onChange={(e) => patch(i, { idType: e.target.value as InsuredGuest["idType"] })}
                          className="h-8 w-full rounded-lg border border-slate-300 bg-white px-1.5 text-xs"
                        >
                          <option value="">— chọn —</option>
                          <option value="cccd">CCCD</option>
                          <option value="passport">Hộ chiếu</option>
                          <option value="dinhdanh">Số định danh (trẻ)</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-0.5 block text-[10px] font-medium leading-none text-slate-500">Số giấy tờ</span>
                        <TextInput value={g.idNumber} onChange={(e) => patch(i, { idNumber: e.target.value })} />
                      </label>
                      <label className="block">
                        <span className="mb-0.5 block text-[10px] font-medium leading-none text-slate-500">Quốc tịch</span>
                        <TextInput value={g.nationality} onChange={(e) => patch(i, { nationality: e.target.value })} />
                      </label>
                      {/* Ô "Trẻ em" và "Bay thay cho ai" đã bỏ khỏi biểu mẫu (luật chủ 04/09:
                          thừa, không cần). Trường vẫn còn trong dữ liệu — bản ghi cũ giữ nguyên. */}
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

              {/* Nhắc cho rõ mốc gửi — nhân viên hay tưởng duyệt xong là xong */}
              <p className="mb-2 rounded-lg bg-slate-50 px-2 py-1 text-[11px] leading-tight text-slate-600">
                {sent
                  ? `Đã gửi sang bên bảo hiểm lúc ${hhmm(sentAt)}${view.sentBy ? ` — ${view.sentBy}` : ""}. Khách huỷ hay dời lịch thì bấm “Thu hồi”.`
                  : "Bảo hiểm sẽ TỰ GỬI khi quầy tích “Đã xuất vé” (hoặc đánh dấu “bay không vé”). Gửi sớm hơn mà trời xấu không bay được thì mất phí bảo hiểm."}
              </p>

              {guests.length !== view.guests.length && (
                <p className="mb-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-900">
                  Danh sách vừa đổi ({view.guests.length} → {guests.length} người) — bấm Lưu tạm hoặc Duyệt thì mới ghi.
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
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
                  className="h-10 flex-1 bg-sky-600 text-xs hover:bg-sky-700"
                  disabled={busy}
                  onClick={() => save(true)}
                  title="Xác nhận hồ sơ đủ và đúng — CHƯA gửi đi"
                >
                  ✓ Duyệt hồ sơ
                </Button>
                {sent ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 flex-1 bg-white text-xs text-rose-700"
                    disabled={busy}
                    onClick={() => move("recall")}
                    title="Bấm nhầm, khách huỷ, dời lịch — rút hồ sơ khỏi bên bảo hiểm"
                  >
                    ↩ Thu hồi bảo hiểm
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="h-10 flex-1 bg-emerald-600 text-xs hover:bg-emerald-700"
                    disabled={busy || !st.ok}
                    onClick={() => move("send")}
                    title="Chắc chắn bay mà chưa xuất vé — gửi bảo hiểm ngay"
                  >
                    📤 Gửi bảo hiểm ngay
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
