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

import { boGhepMayInBluetooth, docLoiBluetooth, ghepMayInBluetooth, mayInBluetoothDaGhep, trinhDuyetCoBluetooth } from "@/lib/baobay/may-in-bluetooth";
import { IN_VE_TU_DO } from "@/lib/baobay/in-ve-cau-hinh";
import { batRawbt, LINK_CAI_RAWBT, mayCoTheDungRawbt, rawbtDaBat } from "@/lib/baobay/may-in-rawbt";
import { batChiaSe, chiaSeDaBat, laIos, mayCoTheChiaSeAnh } from "@/lib/baobay/may-in-chia-se";
import { boGhepMayIn, ghepMayIn, mayInDaGhep, trinhDuyetCoUsb } from "@/lib/baobay/may-in-usb";

export function MayInUsb() {
  const [bt, setBt] = useState<string | null>(() => mayInBluetoothDaGhep()?.name ?? null);
  const [usb, setUsb] = useState<boolean>(() => mayInDaGhep() !== null);
  const [raw, setRaw] = useState<boolean>(() => rawbtDaBat());
  const [chiaSe, setChiaSe] = useState<boolean>(() => chiaSeDaBat());
  const [loi, setLoi] = useState<string | null>(null);
  const coBt = trinhDuyetCoBluetooth();
  const coUsb = trinhDuyetCoUsb();
  const coRaw = mayCoTheDungRawbt();
  const coChiaSe = mayCoTheChiaSeAnh();

  const nutBo = (onClick: () => void, title: string) => (
    <button type="button" className="rounded-lg border border-slate-300 bg-white px-1.5 py-0.5 font-semibold text-slate-600" onClick={onClick} title={title}>
      bỏ ghép
    </button>
  );

  /**
   * RAWBT — cầu nối cho máy in BLUETOOTH CỔ ĐIỂN (Gainscha B300). Trình duyệt
   * chỉ nối được Bluetooth năng lượng thấp; máy in ghép ở Cài đặt của Android
   * là kiểu cổ điển, không có cửa nào cho trang web. Cài RawBT một lần, chọn
   * máy in trong đó, rồi bật công tắc này — nút IN VÉ đẩy thẳng sang RawBT,
   * không qua máy nào khác (chủ 13/09).
   */
  const khoiRawbt = coRaw ? (
    raw ? (
      <>
        <span className="rounded-lg border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-800" title="Vé in thẳng qua RawBT ra máy in Bluetooth đã ghép ở Cài đặt máy">
          📲 RawBT: đang bật
        </span>
        {nutBo(() => {
          batRawbt(false);
          setRaw(false);
        }, "Tắt RawBT")}
      </>
    ) : (
      <button
        type="button"
        className="rounded-lg border border-violet-300 bg-violet-50 px-2 py-0.5 font-bold text-violet-800 hover:bg-violet-100"
        onClick={() => {
          batRawbt(true);
          setRaw(true);
        }}
        title="Dùng cho máy in Bluetooth thường (Gainscha B300): cài ứng dụng RawBT, ghép máy in trong Cài đặt Bluetooth của máy, chọn máy in trong RawBT, rồi bật cái này."
      >
        📲 Dùng RawBT (máy in Bluetooth thường)
      </button>
    )
  ) : null;

  /**
   * ĐƯỜNG 5 — IN QUA APP BẰNG KHAY CHIA SẺ (chủ 17/09: "bất kỳ điện thoại nào,
   * Android hay iPhone, có kết nối máy in đều in được"). iPhone không có Web
   * Bluetooth/USB, nhưng có khay chia sẻ: vé dựng thành ảnh đúng khổ, người
   * trực bấm "Gửi sang app in" → chọn app in nhiệt đã ghép máy in (Thermer trên
   * iPhone, RawBT trên Android). Cài và ghép MỘT LẦN trong app.
   */
  const khoiChiaSe = coChiaSe ? (
    chiaSe ? (
      <>
        <span className="rounded-lg border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-800" title="IN VÉ sẽ dựng ảnh vé rồi mở khay chia sẻ để gửi sang app in máy in nhiệt">
          📤 In qua app (chia sẻ): đang bật
        </span>
        {nutBo(() => {
          batChiaSe(false);
          setChiaSe(false);
        }, "Tắt in qua app chia sẻ")}
      </>
    ) : (
      <button
        type="button"
        className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-0.5 font-bold text-amber-900 hover:bg-amber-100"
        onClick={() => {
          batChiaSe(true);
          setChiaSe(true);
        }}
        title={
          laIos()
            ? "iPhone/iPad: cài một app in máy in nhiệt Bluetooth (ví dụ Thermer), ghép Gainscha B300 trong app một lần. Bật cái này thì IN VÉ dựng ảnh vé và mở khay chia sẻ — chọn app đó là in."
            : "Android: cài RawBT (hoặc app in của máy in), ghép máy in trong app một lần. Bật cái này thì IN VÉ dựng ảnh vé và mở khay chia sẻ — chọn app đó là in."
        }
      >
        📤 In qua app (chia sẻ ảnh vé) — {laIos() ? "iPhone/iPad" : "mọi máy"}
      </button>
    )
  ) : null;

  if (!coBt && !coUsb && !coRaw && !coChiaSe) {
    return (
      <span className="text-[11px] leading-snug text-rose-700">
        🖨 Trình duyệt này KHÔNG nối thẳng được máy in. Máy tính bảng Honor / Huawei phải mở bằng <b>Google Chrome</b> (không dùng trình duyệt sẵn của hãng). Vé vẫn in được qua hộp thoại in.
      </span>
    );
  }


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
              const m = docLoiBluetooth(e);
              if (m) setLoi(m);
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
      ) : coUsb && !raw ? (
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
      {IN_VE_TU_DO && (
        <span className="rounded-lg border border-sky-300 bg-sky-50 px-1.5 py-0.5 font-bold text-sky-800" title="Đang trong đợt thử máy in: nút 🖨 hiện ở mọi booking, in không giới hạn, không hỏi lý do.">
          🧪 Đang mở tự do để thử máy in
        </span>
      )}
      {khoiRawbt}
      {khoiChiaSe}
      {coRaw && !raw && (
        <a href={LINK_CAI_RAWBT} target="_blank" rel="noopener noreferrer" className="text-violet-700 underline">
          cài RawBT
        </a>
      )}
      {loi && <span className="text-rose-700">{loi}</span>}
    </span>
  );
}
