"use client";

/**
 * NÚT GHÉP MÁY IN USB (Gainscha B300) cho quầy in vé — chủ chốt 12/09.
 *
 * Ghép một lần trên máy quầy; từ đó nút "IN VÉ" đẩy thẳng ra máy in, không qua
 * hộp thoại in. Chưa ghép, hoặc trình duyệt không có WebUSB (Safari, Firefox),
 * thì nút này chỉ nói cho biết và vé vẫn in qua hộp thoại như thường — quầy
 * không bao giờ bị kẹt vì thiếu máy in "thẳng".
 */

import { useState } from "react";

import { boGhepMayIn, ghepMayIn, mayInDaGhep, trinhDuyetCoUsb } from "@/lib/baobay/may-in-usb";

export function MayInUsb() {
  const [daGhep, setDaGhep] = useState<boolean>(() => mayInDaGhep() !== null);
  const [loi, setLoi] = useState<string | null>(null);
  const [ten, setTen] = useState<string | null>(null);

  if (!trinhDuyetCoUsb()) {
    return (
      <span className="text-[11px] text-slate-500" title="Chỉ Chrome / Edge mới nối thẳng máy in USB. Vé vẫn in qua hộp thoại in.">
        🖨 In qua hộp thoại in (trình duyệt này không nối thẳng USB)
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-1 text-[11px]">
      {daGhep ? (
        <>
          <span className="rounded-lg border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-800" title={ten ?? "Máy in USB đã ghép — nút IN VÉ sẽ in thẳng"}>
            🖨 Máy in USB: đã ghép{ten ? ` (${ten})` : ""}
          </span>
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-1.5 py-0.5 font-semibold text-slate-600"
            onClick={() => {
              boGhepMayIn();
              setDaGhep(false);
              setTen(null);
            }}
            title="Bỏ ghép — vé quay về in qua hộp thoại in"
          >
            bỏ ghép
          </button>
        </>
      ) : (
        <button
          type="button"
          className="rounded-lg border border-sky-300 bg-sky-50 px-2 py-0.5 font-bold text-sky-800 hover:bg-sky-100"
          onClick={async () => {
            setLoi(null);
            try {
              const t = await ghepMayIn();
              setTen(t);
              setDaGhep(true);
            } catch (e) {
              /** Người dùng đóng hộp chọn thì trình duyệt ném lỗi — không phải lỗi thật. */
              const m = e instanceof Error ? e.message : String(e);
              if (!/No device selected|cancel/i.test(m)) setLoi(m);
            }
          }}
          title="Cắm Gainscha B300 vào USB rồi bấm — chọn máy in trong hộp hiện ra. Windows cần gán WinUSB (Zadig) một lần."
        >
          🖨 Ghép máy in USB
        </button>
      )}
      {loi && <span className="text-rose-700">{loi}</span>}
    </span>
  );
}
