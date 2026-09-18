// app/baocao/components/VeDichVuModal.tsx
"use client";

import { useState } from "react";
import { normalizeSpot } from "@/lib/baobay/spots";

import type { BookingDTO } from "@/lib/baobay/types";
import { chiaDichVu, DICH_VU_VE, nhanVe, TEN_DICH_VU, tenVietTat, type DichVuKhach, type DichVuVe } from "@/lib/baobay/ve-qr";

import { Button } from "./ui";

/**
 * HỘP DỊCH VỤ TRÊN VÉ (chủ 17/09, mục 11–12): bấm IN VÉ ở điểm quét mã thì
 * hiện danh sách khách (tên viết tắt) kèm ô tích 360 / flycam / cờ đỏ cho
 * từng người. Chia đều được (10 khách 10 flycam) thì máy tích sẵn; không chia
 * đều thì để trống để điều phối tích tay. Xác nhận xong mới cấp mã và in.
 */
export function VeDichVuModal({
  booking,
  title,
  onCancel,
  onConfirm,
}: {
  booking: BookingDTO;
  title?: string;
  onCancel: () => void;
  onConfirm: (dichVu: Array<{ guestNo: number } & DichVuKhach>) => void | Promise<void>;
}) {
  const n = Math.max(1, booking.guestCount || 1);
  const [rows, setRows] = useState<DichVuKhach[]>(() => {
    const daCo = booking.veQr?.khach;
    if (daCo?.length) return Array.from({ length: n }, (_, i) => ({ ...(daCo[i]?.dichVu ?? { video360: false, flycam: false, redFlag: false }) }));
    return chiaDichVu(n, { video360: booking.video360, flycam: booking.flycam, redFlag: booking.redFlag }).khach;
  });
  const [busy, setBusy] = useState(false);
  const ten = (g: number) => {
    const ds = (booking.otaGuests ?? []).map((x) => String(x.fullName || "").trim()).filter(Boolean);
    return tenVietTat(ds.length >= g ? ds[g - 1]! : booking.contactName || "Khách");
  };
  const dem = (k: DichVuVe) => rows.filter((r) => r[k]).length;
  const dat = { video360: booking.video360, flycam: booking.flycam, redFlag: booking.redFlag };
  /**
   * Luật chủ 18/09: dịch vụ đặt 0 thì KHÔNG cho chọn (ẩn cột); đặt đủ cho cả
   * đoàn thì máy tích sẵn và KHOÁ; chỉ khi 0 < số đặt < số khách mới tích tay,
   * và phải tích ĐÚNG số đã đặt mới cấp mã được.
   */
  const daCapMa = Boolean(booking.veQr?.khach?.length);
  const cot = DICH_VU_VE.filter((k) => dat[k] > 0 || (daCapMa && rows.some((r) => r[k])));
  const khoa = (k: DichVuVe) => !booking.veQr && dat[k] >= n;
  const lech = cot.filter((k) => dem(k) !== Math.min(n, dat[k]));
  const chuaKhop = !booking.veQr && lech.length > 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-2 sm:items-center" onClick={onCancel}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-slate-900">{title ?? "Dịch vụ trên vé"} — #{booking.daySeq} {booking.contactName}</h3>
        {/* Dòng "Đã đặt" tô ĐỎ, dạng "0xCam360 · 1xFlycam" cho nổi (chủ 18/09). */}
        <p className="mt-0.5 text-xs text-slate-600">
          Đã đặt: <span className="font-bold text-rose-700">{DICH_VU_VE.map((k) => `${dat[k]}x${k === "video360" ? "Cam360" : TEN_DICH_VU[k]}`).join(" · ")}</span>
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-1 pr-2">Mã</th>
                <th className="py-1 pr-2">Khách</th>
                {cot.map((k) => (
                  <th key={k} className="py-1 text-center">
                    {TEN_DICH_VU[k]}
                    {khoa(k) && <span className="block text-[9px] font-normal normal-case text-slate-400">cả đoàn</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const g = i + 1;
                const daBay = Boolean(booking.veQr?.khach?.find((x) => x.guestNo === g)?.bayXong);
                return (
                  <tr key={g} className="border-t border-slate-100">
                    <td className="py-1.5 pr-2 font-mono font-bold">{nhanVe(booking.veQr?.so ?? booking.daySeq, g, n)}</td>
                    <td className="py-1.5 pr-2">
                      {ten(g)}
                      {daBay && <span className="ml-1 text-[10px] text-emerald-700">đã bay</span>}
                    </td>
                    {cot.map((k) => (
                      <td key={k} className="py-1.5 text-center">
                        <input
                          type="checkbox"
                          className="h-5 w-5"
                          checked={r[k]}
                          disabled={daBay || khoa(k)}
                          onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, [k]: e.target.checked } : x)))}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 text-xs font-semibold text-slate-600">
                <td className="py-1.5" colSpan={2}>
                  Đã tích / đã đặt
                </td>
                {cot.map((k) => (
                  <td key={k} className={"py-1.5 text-center " + (dem(k) !== Math.min(n, dat[k]) ? "text-rose-700" : "text-emerald-700")}>
                    {dem(k)}/{dat[k]}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
        {cot.length === 0 && <p className="mt-2 text-xs text-slate-500">Booking không có dịch vụ kèm — cấp mã thôi.</p>}
        {lech.length > 0 && (
          <p className="mt-2 text-xs text-rose-700">
            Tích cho đúng {lech.map((k) => `${dat[k]} ${TEN_DICH_VU[k]}`).join(", ")} theo số đã đặt rồi mới cấp mã.
          </p>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="ghost" className="h-9 px-3" onClick={onCancel} disabled={busy}>
            Huỷ
          </Button>
          <Button
            type="button"
            className="h-9 px-4"
            disabled={busy || chuaKhop}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(rows.map((r, i) => ({ guestNo: i + 1, ...r })));
              } finally {
                setBusy(false);
              }
            }}
          >
            {booking.veQr ? (normalizeSpot(booking.spot) === "sapa" ? "Lưu & xem vé" : "Lưu dịch vụ") : normalizeSpot(booking.spot) === "sapa" ? "Cấp mã & xem vé" : "Cấp mã & in vé"}
          </Button>
        </div>
      </div>
    </div>
  );
}
