// app/baocao/components/VeQrTongHop.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { QuetVeModal } from "./QuetVeModal";

import { formatDateKeyVN } from "@/lib/baobay/date";
import type { MaVeDTO, ThuHoiDTO, TongHopVe } from "@/services/ve-qr.service";

import { apiGet, apiPost } from "./client-api";
import { Button, Card } from "./ui";

/**
 * KHỐI "TỪ QUÉT VÉ" trên trang Phi công (chủ 17/09, mục 4): số chuyến và dịch
 * vụ tự cộng từ các mã phi công đã quét trong ngày — để tính lương. Nút "Điền
 * vào báo cáo" chép số sang ô của báo cáo; mã vé đã bay cũng chép (dạng
 * "22/12 #3.2") để kế toán soát.
 */
export function VeQrTongHop({
  spot,
  date,
  onDien,
}: {
  spot: string;
  date: string;
  onDien: (so: { flightCount: number; video360: number; flycam: number; redFlag: number; codes: string[] }) => void;
}) {
  const [du, setDu] = useState<{ ma: MaVeDTO[]; thuHoi: ThuHoiDTO[]; tongHop: TongHopVe } | null>(null);
  /** Hộp quét nhanh đang mở? Đóng thì tăng `lan` để tải lại số. */
  const [moQuet, setMoQuet] = useState(false);
  const [lan, setLan] = useState(0);
  const [ban, setBan] = useState(false);
  const [loiLenh, setLoiLenh] = useState<string | null>(null);
  /** Lệnh trên một mã của mình: "bayxong" / "hoan" — xong tải lại số. */
  const lenh = async (action: "bayxong" | "hoan", m: MaVeDTO) => {
    setBan(true);
    setLoiLenh(null);
    try {
      await apiPost(`/api/baocao/ve-qr?spot=${spot}`, { action, bookingId: m.bookingId, guestNo: m.guestNo });
      setLan((x) => x + 1);
    } catch (e) {
      setLoiLenh(e instanceof Error ? e.message : "Không thực hiện được");
    } finally {
      setBan(false);
    }
  };
  useEffect(() => {
    let huy = false;
    apiGet<{ ma: MaVeDTO[]; thuHoi: ThuHoiDTO[]; tongHop: TongHopVe }>(`/api/baocao/ve-qr?spot=${spot}&date=${date}${lan ? `&lan=${lan}` : ""}`)
      .then((r) => !huy && setDu(r))
      .catch(() => !huy && setDu(null));
    return () => {
      huy = true;
    };
  }, [spot, date, lan]);
  if (!du) return null;
  const t = du.tongHop;
  return (
    <Card title={`Từ quét vé — ${formatDateKeyVN(date)}`} hint="tự cộng từ các mã anh/chị đã quét; mở thẻ Quét vé để quét thêm hay hoàn mã">
      {du.thuHoi.length > 0 && (
        <p className="mb-2 text-xs font-semibold text-amber-800">⚠ {du.thuHoi.length} mã bị thu hồi (huỷ/dời) — xem ở thẻ Quét vé.</p>
      )}
      <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
        {(
          [
            ["Chuyến", t.chuyen],
            ["Bay xong", t.bayXong],
            ["Đang giữ", t.dangGiu],
            ["Cam 360", t.video360],
            ["Flycam", t.flycam],
            ["Cờ đỏ", t.redFlag],
          ] as Array<[string, number]>
        ).map(([n, v]) => (
          <div key={n} className="rounded-lg bg-slate-50 px-2 py-1.5">
            <div className="text-lg font-black text-slate-900">{v}</div>
            <div className="text-[11px] font-semibold text-slate-500">{n}</div>
          </div>
        ))}
      </div>
      {du.ma.length > 0 && (
        /** Từng mã có nút ngay tại chỗ (chủ 20/09: "đủ chức năng như hoàn vé"): ✓ bay xong · ↩ hoàn mã cho phi công khác quét. */
        <ul className="mt-2 divide-y divide-slate-100 text-xs">
          {du.ma.map((m) => (
            <li key={`${m.bookingId}-${m.guestNo}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1">
              <strong className="font-mono">{m.nhan}</strong>
              <span className="min-w-0 flex-1 truncate text-slate-700">
                {m.tenKhach}
                {m.dichVuTinh.video360 || m.dichVuTinh.flycam || m.dichVuTinh.redFlag
                  ? ` · ${[m.dichVuTinh.video360 ? "360" : "", m.dichVuTinh.flycam ? "flycam" : "", m.dichVuTinh.redFlag ? "cờ đỏ" : ""].filter(Boolean).join(" + ")}`
                  : ""}
              </span>
              {m.bayXong ? (
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">✅ bay xong</span>
              ) : (
                <>
                  <button type="button" disabled={ban} onClick={() => void lenh("bayxong", m)} className="rounded border border-emerald-400 bg-white px-2 py-0.5 font-bold text-emerald-800 hover:bg-emerald-50">
                    ✓ Bay xong
                  </button>
                  <button
                    type="button"
                    disabled={ban}
                    onClick={() => {
                      if (window.confirm(`Hoàn mã ${m.nhan} (${m.tenKhach}) để phi công khác quét?`)) void lenh("hoan", m);
                    }}
                    className="rounded border border-slate-300 bg-white px-2 py-0.5 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    ↩ Hoàn mã
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {loiLenh && <p className="mt-1 text-xs font-semibold text-rose-700">{loiLenh}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          className="h-8 px-3 text-xs"
          disabled={t.chuyen === 0}
          onClick={() => onDien({ flightCount: t.chuyen, video360: t.video360, flycam: t.flycam, redFlag: t.redFlag, codes: du.ma.map((m) => m.qrText) })}
        >
          ⤵ Điền vào báo cáo
        </Button>
        {/* Bấm là MỞ CAMERA NGAY (chủ 20/09) — không phải sang trang khác. */}
        <Button type="button" className="h-8 bg-sky-600 px-3 text-xs hover:bg-sky-700" onClick={() => setMoQuet(true)}>
          📷 Quét vé
        </Button>
        <Link href="/baocao/quet-ve" className="inline-flex h-8 items-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50" title="Trang đầy đủ: chọn ảnh, hoàn mã, tích bay xong">
          Trang quét vé
        </Link>
      </div>
      {moQuet && (
        <QuetVeModal
          spot={spot}
          date={date}
          onClose={() => {
            setMoQuet(false);
            setLan((x) => x + 1);
          }}
        />
      )}
    </Card>
  );
}
