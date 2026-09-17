// app/baocao/components/VeQrTongHop.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatDateKeyVN } from "@/lib/baobay/date";
import type { MaVeDTO, ThuHoiDTO, TongHopVe } from "@/services/ve-qr.service";

import { apiGet } from "./client-api";
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
  useEffect(() => {
    let huy = false;
    apiGet<{ ma: MaVeDTO[]; thuHoi: ThuHoiDTO[]; tongHop: TongHopVe }>(`/api/baocao/ve-qr?spot=${spot}&date=${date}`)
      .then((r) => !huy && setDu(r))
      .catch(() => !huy && setDu(null));
    return () => {
      huy = true;
    };
  }, [spot, date]);
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
        <p className="mt-2 text-xs text-slate-600">
          {du.ma.map((m) => `${m.nhan} ${m.tenKhach}${m.bayXong ? " ✅" : ""}`).join(" · ")}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          className="h-8 px-3 text-xs"
          disabled={t.chuyen === 0}
          onClick={() => onDien({ flightCount: t.chuyen, video360: t.video360, flycam: t.flycam, redFlag: t.redFlag, codes: du.ma.map((m) => m.qrText) })}
        >
          ⤵ Điền vào báo cáo
        </Button>
        <Link href="/baocao/quet-ve" className="inline-flex h-8 items-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          📷 Quét vé
        </Link>
      </div>
    </Card>
  );
}
