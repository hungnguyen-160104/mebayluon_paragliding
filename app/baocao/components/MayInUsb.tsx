"use client";

/**
 * NÚT GHÉP MÁY IN "THẲNG" cho quầy in vé (Gainscha B300) — chủ chốt 12/09.
 *
 * Hai kênh, cùng luồng ESC/POS:
 *  - BLUETOOTH (ưu tiên — B300 là máy in DI ĐỘNG, quầy dùng điện thoại/máy
 *    tính bảng): Web Bluetooth, Chrome trên Android / máy tính. Safari không có.
 *  - USB (cáp OTG hoặc máy tính): WebUSB, Chrome / Edge.
 *
 * Ghép một lần; từ đó nút "IN VÉ" đẩy thẳng ra máy in, không qua hộp thoại.
 * Chưa ghép, hoặc trình duyệt không có cả hai, thì vé in qua hộp thoại / tab
 * in như thường — quầy không bao giờ kẹt vì thiếu máy in "thẳng".
 */

import { useState } from "react";

import { boGhepMayInBluetooth, ghepMayInBluetooth, mayInBluetoothDaGhep, trinhDuyetCoBluetooth } from "@/lib/baobay/may-in-bluetooth";
import { boGhepMayIn, ghepMayIn, mayInDaGhep, trinhDuyetCoUsb } from "@/lib/baobay/may-in-usb";

export function MayInUsb() {
  const [bt, setBt] = useState<string | null>(() => mayInBluetoothDaGhep()?.name ?? null);
  const [usb, setUsb] = useState<boolean>(() => mayInDaGhep() !== null);
  const [loi, setLoi] = useState<string | null>(null);
  const coBt = trinhDuyetCoBluetooth();
  const coUsb = trinhDuyetCoUsb();

  if (!coBt && !coUsb) {
    return (
      <span className="text-[11px] text-slate-500" title="Chỉ Chrome / Edge mới nối thẳng máy in (Bluetooth hoặc USB). Vé vẫn in qua hộp thoại in.">
        🖨 In qua hộp thoại in (trình duyệt này không nối thẳng máy in — dùng Chrome)
      </span>
    );
  }

  const nutBo = (onClick: () => void, title: string) => (
    <button type="button" className="rounded-lg border border-slate-300 bg-white px-1.5 py-0.5 font-semibold text-slate-600" onClick={onClick} title={title}>
      bỏ ghép
    </button>
  );

  return (
    <span className="flex flex-wrap items-center gap-1 text-[11px]">
      {bt ? (
        <>
          <span className="rounded-lg border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-800" title="Máy in Bluetooth đã ghép — nút IN VÉ sẽ in thẳng">
            🖨 Bluetooth: {bt}
          </span>
          {nutBo(() => {
            boGhepMayInBluetooth();
            setBt(null);
          }, "Bỏ ghép Bluetooth")}
        </>
      ) : coBt ? (
        <button
          type="button"
          className="rounded-lg border border-sky-300 bg-sky-50 px-2 py-0.5 font-bold text-sky-800 hover:bg-sky-100"
          onClick={async () => {
            setLoi(null);
            try {
              setBt(await ghepMayInBluetooth());
            } catch (e) {
              const m = e instanceof Error ? e.message : String(e);
              if (!/cancel|chooser/i.test(m)) setLoi(m);
            }
          }}
          title="Bật máy in và Bluetooth điện thoại, bấm rồi chọn máy in trong hộp hiện ra (tên có chữ BLE nếu thấy hai tên). Chỉ Chrome."
        >
          🖨 Ghép máy in Bluetooth
        </button>
      ) : null}
      {usb ? (
        <>
          <span className="rounded-lg border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-800" title="Máy in USB đã ghép">
            🔌 USB: đã ghép
          </span>
          {nutBo(() => {
            boGhepMayIn();
            setUsb(false);
          }, "Bỏ ghép USB")}
        </>
      ) : coUsb ? (
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-2 py-0.5 font-semibold text-slate-600 hover:bg-slate-50"
          onClick={async () => {
            setLoi(null);
            try {
              await ghepMayIn();
              setUsb(true);
            } catch (e) {
              const m = e instanceof Error ? e.message : String(e);
              if (!/No device selected|cancel/i.test(m)) setLoi(m);
            }
          }}
          title="Cắm máy in qua USB (cáp OTG) rồi bấm — Windows cần gán WinUSB (Zadig) một lần."
        >
          🔌 hoặc USB
        </button>
      ) : null}
      {loi && <span className="text-rose-700">{loi}</span>}
    </span>
  );
}
