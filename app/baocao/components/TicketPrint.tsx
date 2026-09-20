"use client";

/**
 * IN VÉ BAY 3 LIÊN — Khau Phạ và Sa Pa (chủ chốt 12/09, đang in thử).
 *
 * MỖI KHÁCH MỘT BỘ VÉ, không phải mỗi booking một bộ: phi công khai theo từng
 * chuyến mà mỗi khách là một chuyến. Booking #23 có 2 khách → #23.1 và #23.2,
 * mỗi số BỐN liên (chủ chốt lại 12/09):
 *   LIÊN 1 — VÉ BAY DÙ: ngày bay · số thứ tự · tên khách · dịch vụ · giờ in.
 *   LIÊN 2 — KHÁCH GIỮ: thông tin đặt vé và dịch vụ · số thứ tự · mã booking ·
 *            hai mã QR xin đánh giá · các điều lưu ý (điện thoại, kính, quần áo…).
 *   LIÊN 3 — VÉ ĐỒ UỐNG MIỄN PHÍ: tên khách · số thứ tự · ngày bay · danh mục.
 *   LIÊN 4 — VÉ XE TRUNG CHUYỂN: ngày bay · tên khách · ngày giờ xuất vé.
 * Liên nào cũng in "vé có giá trị thanh toán tương đương tiền mặt, mất vé không
 * cấp lại".
 *
 * HAI ĐƯỜNG RA GIẤY, cùng một mẫu vé:
 *  1. HỘP THOẠI IN của trình duyệt (@page 80mm) — chạy với driver Gainscha cài
 *     trên máy quầy, hoặc bất kỳ máy in nào. Đường mặc định.
 *  2. IN THẲNG QUA USB (WebUSB + ESC/POS, xem `lib/baobay/may-in-usb.ts`) —
 *     không cần driver, dùng được trên Android/Chrome. Vé được chụp thành ảnh
 *     576 chấm rồi gửi từng liên, cắt giấy sau mỗi liên. Bật ở nút "🖨 Máy in
 *     USB"; hỏng thì tự rơi về đường 1, không để người trực đứng chờ.
 *
 * Mã QR sinh tại chỗ thành SVG (thư viện `qrcode`), không tải ảnh ngoài — quầy
 * ở đèo hay mất mạng, mà vé thì phải in được.
 */

import { formatDateKeyVN } from "@/lib/baobay/date";
import { normalizeSpot, spotName } from "@/lib/baobay/spots";
import type { BookingDTO } from "@/lib/baobay/types";
import { dichVuChu, veQrPhuText, veQrText, type LoaiVePhu } from "@/lib/baobay/ve-qr";

import { inAnhQuaUsb, mayInDaGhep, RONG_CHAM, trinhDuyetCoUsb } from "@/lib/baobay/may-in-usb";
import { inAnhQuaBluetooth, mayInBluetoothDaGhep, trinhDuyetCoBluetooth } from "@/lib/baobay/may-in-bluetooth";
import { inAnhQuaRawbt, mayCoTheDungRawbt, rawbtDaBat } from "@/lib/baobay/may-in-rawbt";
import { chiaSeDaBat, ghepAnhLien, hienKhungChiaSe, mayCoTheChiaSeAnh } from "@/lib/baobay/may-in-chia-se";
import { apiGet, apiPost } from "./client-api";

/** Khổ giấy máy in nhiệt Gainscha B300 ở quầy. */
const PAPER_WIDTH_MM = 80;


/** Chỉ hai điểm này in vé (chủ 12/09). Điểm khác vẫn tích "đã xuất vé" như cũ, không in. */
/** Sa Pa in vé nhiệt mọi booking; Khau Phạ in vé QR cho booking PPG khi chọn "Vé QR" (chủ 20/09); Hà Nội không in. */
export const DIEM_IN_VE = new Set(["sapa", "khau-pha"]);
export function coInVe(spot: string): boolean {
  return DIEM_IN_VE.has(spot);
}

const DO_UONG = ["Cà phê", "Trà chanh/đào", "Nước lọc/chai", "Bia/nước ngọt"];

/**
 * Câu của chủ (12/09), cố ý TÁCH HAI DÒNG NGẮN chứ không để trình duyệt tự bẻ:
 * cả câu 70 ký tự không vừa một dòng 72mm ở cỡ chữ còn đọc được.
 */
const LUU_Y_1 = "Vé có giá trị thanh toán tương đương tiền mặt.";
const LUU_Y_2 = "Mất vé không cấp lại.";


/** Dịch vụ thêm đã đặt — in lên vé để phi công và thợ quay biết ngay tại bãi. */
function extrasOf(b: BookingDTO, guestNo?: number): string[] {
  /**
   * ĐÃ CẤP MÃ VÉ QR (Sa Pa): dịch vụ in theo TỪNG KHÁCH — đoàn 10 người 8
   * flycam thì vé của ai có flycam mới in chữ Flycam (chủ 17/09).
   */
  if (guestNo && b.veQr?.khach?.length) {
    const k = b.veQr.khach.find((x) => x.guestNo === guestNo);
    if (k) {
      /** Dịch vụ CẤP ĐOÀN (không chia từng khách) vẫn phải lên vé bay ở Khau Phạ: hoàng hôn, kéo cờ, PPG. */
      const dv = dichVuChu(k.dichVu);
      if (b.sunset > 0) dv.push("Hoàng hôn");
      if (b.flagFlight > 0) dv.push("Kéo cờ");
      if (b.flightKind === "ppg") dv.push("PPG");
      return dv;
    }
  }
  /** Chỉ in TÊN dịch vụ, không in "×1": có thì in, không có thì bỏ — chủ 12/09. */
  const out: string[] = [];
  if (b.video360 > 0) out.push("Cam 360");
  if (b.flycam > 0) out.push("Flycam");
  if (b.redFlag > 0) out.push("Cờ đỏ");
  if (b.sunset > 0) out.push("Hoàng hôn");
  if (b.flagFlight > 0) out.push("Kéo cờ");
  return out;
}

/**
 * BIỂU TƯỢNG VẼ BẰNG SVG ĐEN TRẮNG, không dùng emoji: máy in nhiệt chỉ có đen
 * trắng, emoji màu chụp ra thành mảng xám lem; SVG nét thì in sắc. Ba hình:
 * dù lượn (liên bay), xe trung chuyển (liên xe), cốc đồ uống (liên nước).
 */
const ICON: Record<"du" | "xe" | "uong", string> = {
  du: `<svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true"><path d="M4 22a20 12 0 0 1 40 0" fill="none" stroke="#000" stroke-width="3.5"/><path d="M4 22q10-8 20 0q10-8 20 0" fill="none" stroke="#000" stroke-width="2"/><path d="M6 22 22 40M14 22l8 18M34 22 26 40M42 22 26 40" stroke="#000" stroke-width="2"/><circle cx="24" cy="42" r="3.5" fill="#000"/></svg>`,
  xe: `<svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true"><path d="M5 30V18a4 4 0 0 1 4-4h22l9 8h3a3 3 0 0 1 3 3v5" fill="none" stroke="#000" stroke-width="3.5" stroke-linejoin="round"/><path d="M5 30h38M18 14v10M31 14v10M9 24h32" stroke="#000" stroke-width="2.5"/><circle cx="14" cy="33" r="4.5" fill="#fff" stroke="#000" stroke-width="3"/><circle cx="35" cy="33" r="4.5" fill="#fff" stroke="#000" stroke-width="3"/></svg>`,
  uong: `<svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true"><path d="M10 12h24l-3 28H13z" fill="none" stroke="#000" stroke-width="3.5" stroke-linejoin="round"/><path d="M12 24h20" stroke="#000" stroke-width="2.5"/><path d="M34 16h4a5 5 0 0 1 0 10h-5" fill="none" stroke="#000" stroke-width="3"/><path d="M17 6c0-3 4-3 4 0M23 5c0-3 4-3 4 0" fill="none" stroke="#000" stroke-width="2"/></svg>`,
};

function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/** "#23.1" — số booking trong ngày rồi số khách trong đoàn; đoàn một người thì "#23". */
export function soThuTuVe(b: BookingDTO, guestNo: number): string {
  const so = b.daySeq || "?";
  return b.guestCount > 1 ? `#${so}.${guestNo}` : `#${so}`;
}

/**
 * VIẾT TẮT MỘT PHẦN tên khách (Sa Pa, chủ 17/09): giữ họ và tên gọi, chữ lót
 * còn chữ cái đầu — "Nguyễn Thị Hồng Nhung" → "Nguyễn T.H. Nhung". Tên hai chữ
 * hoặc một chữ giữ nguyên. Tên nước ngoài (chữ không dấu, nhiều từ) cũng theo
 * luật ấy: "Jean Pierre Martin" → "Jean P. Martin".
 */
export function vietTatTen(ten: string): string {
  const tu = String(ten || "").trim().split(/\s+/).filter(Boolean);
  if (tu.length <= 2) return tu.join(" ");
  const giua = tu.slice(1, -1).map((t) => t[0].toUpperCase() + ".").join("");
  return `${tu[0]} ${giua} ${tu[tu.length - 1]}`;
}

/**
 * SA PA (chủ 18/09): tên trên vé lấy theo SỔ BẢO HIỂM — khách 1/2, 2/2 đúng
 * tên người đã khai bảo hiểm (bỏ người đã huỷ). Sổ trống mới lấy tên theo
 * booking (danh sách OTA rồi tên liên hệ).
 */
export function tenKhachBaoHiem(b: BookingDTO, guestNo: number): string {
  const ten = (b.insured ?? [])
    .filter((g) => !g.cancelled)
    .map((g) => String(g.fullName || "").trim())
    .filter(Boolean);
  if (ten.length >= guestNo) return ten[guestNo - 1];
  return tenKhachVe(b, guestNo);
}

/**
 * SỐ THỨ TỰ VÉ SA PA: "22.9#1.2" = bay ngày 22/9, booking số 1 trong ngày,
 * khách thứ 2 của booking (chủ 18/09). Đoàn một người: "22.9#1". Trả hai phần
 * để vẽ phần ngày nhỏ hơn phần số.
 */
export function soThuTuVeSapa(b: BookingDTO, guestNo: number): { ngay: string; so: string } {
  const [, m, d] = String(b.flightDate || "").split("-");
  const ngay = d && m ? `${Number(d)}.${Number(m)}` : "";
  return { ngay, so: soThuTuVe(b, guestNo) };
}

/** Tên khách thứ n: booking OTA có danh sách tên từng người; không có thì tên liên hệ. */
export function tenKhachVe(b: BookingDTO, guestNo: number): string {
  const ten = (b.otaGuests ?? []).map((g) => String(g.fullName || "").trim()).filter(Boolean);
  if (ten.length >= guestNo) return ten[guestNo - 1];
  return b.contactName || "Khách";
}

function gioIn(): string {
  return new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Mã QR thành SVG nội tuyến — sinh tại chỗ, không cần mạng. */
async function qrSvg(text: string): Promise<string> {
  /** Ép kiểu: khai báo của thư viện để `toString` đè lên Object.prototype nên TypeScript hiểu nhầm là hàm không tham số. */
  const QRCode = (await import("qrcode")) as unknown as {
    toString(text: string, opts: { type: "svg"; margin: number; errorCorrectionLevel: "M" }): Promise<string>;
  };
  return QRCode.toString(text, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
}

/** Mã chống sao chép của khách thứ n — cấp ở máy chủ lúc in lần đầu; chưa có thì in "····" để lộ ra là vé chưa qua sổ. */
export function maVeCua(b: BookingDTO, guestNo: number): string {
  const d = (b.ticketSecurity ?? []).find((x) => x.guestNo === guestNo);
  return d?.code || "····";
}

/**
 * THƯƠNG HIỆU trên vé nhiệt theo điểm: Sa Pa mang tên và web Sapa Paragliding;
 * Hà Nội / Khau Phạ mang Mebayluon (chủ 18/09: "vé Hà Nội và Khau Phạ làm
 * giống Sa Pa"). Lời dặn: Sa Pa khách nước ngoài — tiếng Anh; hai điểm kia
 * song ngữ Việt trước.
 */
function thuongHieuVe(spot: string): { logo: string; ten: string; web: string; luuY: string; diem: string } {
  if (normalizeSpot(spot) === "sapa") {
    return { logo: "/logo-sapa-in.png", ten: "SAPA PARAGLIDING", web: "www.paraglidingsapa.com", luuY: "Please keep this ticket safe and hand it to your pilot before the flight.", diem: "" };
  }
  return {
    logo: "/logo-mbl-in.png",
    ten: "MEBAYLUON PARAGLIDING",
    web: "www.mebayluon.com",
    luuY: "Giữ vé và đưa phi công trước khi bay · Keep this ticket and hand it to your pilot before the flight.",
    diem: spotName(spot).toUpperCase(),
  };
}

/** Đầu vé: logo + tên hãng + dòng phụ (loại vé · điểm). */
function dauTem(th: ReturnType<typeof thuongHieuVe>, phu: string): string {
  return `
    <div class="sp-dau">
      <img class="sp-logo" src="${th.logo}" alt="" />
      <div class="sp-hang">
        <div class="sp-ten">${esc(th.ten)}</div>
        <div class="sp-phu">${esc(phu)}${th.diem ? ` · ${esc(th.diem)}` : ""}</div>
      </div>
    </div>`;
}

/** Cụm số thứ tự "22.9#1.2" (phần ngày nhỏ hơn) — dùng chung ba liên. */
function soTem(b: BookingDTO, guestNo: number): string {
  const stt = soThuTuVeSapa(b, guestNo);
  return `${stt.ngay ? `<span class="sp-so-ngay">${esc(stt.ngay)}</span>` : ""}${esc(stt.so)}`;
}

/**
 * VÉ BAY DÙ — MỘT LIÊN khổ 80 mm, thiết kế Sa Pa (chủ 17–18/09), nay dùng cho
 * CẢ BA ĐIỂM: số thứ tự "22.9#1.2" + mã chống sao chép trong khung viền đậm,
 * MÃ QR to để phi công quét, ngày + giờ hẹn, tên khách theo SỔ BẢO HIỂM viết
 * tắt một phần, ô dịch vụ đi kèm của đúng khách ấy. Cao theo nội dung, các vé
 * nối tiếp trên giấy cuộn, cắt sau mỗi vé.
 *
 * Bố cục (ảnh in thật 18/09): số + mã từng "out box" vì hộp inline-flex lệch
 * dòng nền khi html2canvas vẽ → khung viền đậm, hai cột rõ; chữ đậm ≥ 800 cho
 * khỏi nhoè trên giấy nhiệt, đường kẻ 2px thay nét chấm mảnh.
 */
function lienBoarding(b: BookingDTO, spot: string, guestNo: number, luc: string, qrVe?: string): string {
  const th = thuongHieuVe(spot);
  const extras = extrasOf(b, guestNo);
  const ten = vietTatTen(tenKhachBaoHiem(b, guestNo));
  const gioHen = b.expectedTime ? esc(b.expectedTime) : "";
  return `
  <section class="ve tem">
    ${dauTem(th, "BOARDING TICKET")}
    <div class="sp-so">
      <div class="sp-so-trai"><span class="sp-so-icon">${ICON.du}</span><span class="sp-so-tri">${soTem(b, guestNo)}</span></div>
      <div class="sp-so-phai"><span class="sp-ma-nhan">CODE</span><span class="sp-ma">${esc(maVeCua(b, guestNo))}</span></div>
    </div>
    <div class="sp-than">
      ${qrVe && b.veQr ? `<div class="sp-qr">${qrVe}<div class="sp-qr-nhan">SCAN BEFORE FLIGHT</div></div>` : ""}
      <div class="sp-phai">
        <div class="sp-ngay">${esc(formatDateKeyVN(b.flightDate))}${gioHen ? `<span class="sp-gio">${gioHen}</span>` : ""}</div>
        <div class="sp-khach${ten.length > 18 ? " dai" : ""}">${esc(ten)}${b.guestCount > 1 ? `<span class="sp-stt"> ${guestNo}/${esc(b.guestCount)}</span>` : ""}</div>
        ${extras.length ? `<div class="sp-dv">${extras.map((x) => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
      </div>
    </div>
    <div class="sp-cuoi"><span>Printed ${esc(luc.slice(0, 11))}</span><span>${esc(th.web)}</span></div>
    <div class="sp-luuy">${esc(th.luuY)}</div>
  </section>`;
}

/**
 * VÉ PHỤ KHAU PHẠ (chủ 18/09): cùng một bộ với vé bay, mỗi khách thêm VÉ ĐỒ
 * UỐNG và VÉ XE ÔM. Cùng kiểu dáng vé bay nhưng KHÔNG có mã chống sao chép và
 * KHÔNG có dịch vụ; QR nhỏ hơn, chỉ mang "NUOC 22/09/2026 #1.2" / "XE …" —
 * khác vé bay nên máy quét không lẫn (xem `veQrPhuText`).
 */
function lienPhu(b: BookingDTO, spot: string, guestNo: number, luc: string, loai: LoaiVePhu, qr?: string): string {
  const th = thuongHieuVe(spot);
  const ten = vietTatTen(tenKhachBaoHiem(b, guestNo));
  const nhan = loai === "nuoc" ? "VÉ ĐỒ UỐNG" : "VÉ XE ÔM";
  const ghi = loai === "nuoc" ? `Đổi MỘT đồ uống tại quầy bãi: ${DO_UONG.join(" · ")}` : "Đưa xe ôm khi lên xe";
  return `
  <section class="ve tem phu">
    ${dauTem(th, nhan)}
    <div class="sp-so">
      <div class="sp-so-trai"><span class="sp-so-icon">${ICON[loai === "nuoc" ? "uong" : "xe"]}</span><span class="sp-so-tri">${soTem(b, guestNo)}</span></div>
      <div class="sp-so-phai"><span class="sp-ma-nhan">${loai === "nuoc" ? "ĐỒ UỐNG" : "XE ÔM"}</span></div>
    </div>
    <div class="sp-than">
      ${qr ? `<div class="sp-qr nho">${qr}<div class="sp-qr-nhan">${loai === "nuoc" ? "QUẦY QUÉT" : "XE ÔM QUÉT"}</div></div>` : ""}
      <div class="sp-phai">
        <div class="sp-ngay">${esc(formatDateKeyVN(b.flightDate))}</div>
        <div class="sp-khach${ten.length > 18 ? " dai" : ""}">${esc(ten)}${b.guestCount > 1 ? `<span class="sp-stt"> ${guestNo}/${esc(b.guestCount)}</span>` : ""}</div>
        <div class="sp-ghi">${esc(ghi)}</div>
      </div>
    </div>
    <div class="sp-cuoi"><span>Printed ${esc(luc.slice(0, 11))}</span><span>${esc(th.web)}</span></div>
    <div class="sp-luuy">${esc(LUU_Y_1)} ${esc(LUU_Y_2)}</div>
  </section>`;
}

const CSS = `
  @page { size: ${PAPER_WIDTH_MM}mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #000; background: #fff; }
  /* Mỗi liên một trang giấy — máy in nhiệt cắt theo trang */
  .ve { width: ${PAPER_WIDTH_MM - 6}mm; page-break-after: always; padding: 0 0 4mm; background: #fff; }
  .ve:last-child { page-break-after: auto; }
  .lien { text-align: center; font-size: 11px; font-weight: 800; letter-spacing: .4px; white-space: nowrap;
          border: 1px solid #000; padding: 1px 0; margin-bottom: 3px; }
  /* LOGO + tên hãng nằm ngang một khối thấp (~10mm) — chủ 12/09 xin logo lên vé. */
  .dau { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
  /* logo-mbl-in.png là bản NÉT ĐEN TRẮNG dựng riêng cho máy in nhiệt (1 bit): logo màu
     in ra thành một đĩa đen nuốt mất chữ MBL. */
  .logo { width: 10mm; height: 10mm; object-fit: contain; flex: none; }
  .ten { font-size: 13px; font-weight: 900; letter-spacing: .3px; white-space: nowrap; line-height: 1.15; }
  .ten small { font-size: 10.5px; font-weight: 600; letter-spacing: 0; }
  /* SỐ THỨ TỰ to hết cỡ: ở bãi người ta gọi nhau bằng con số này */
  /* SỐ THỨ TỰ to hết cỡ, biểu tượng của liên đứng sát bên trái */
  .so { border: 2px solid #000; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 2px 4px; margin-bottom: 4px; }
  .so-icon { display: inline-flex; }
  .so-icon svg { width: 34px; height: 34px; }
  .so-tri { font-size: 38px; font-weight: 900; line-height: 1; white-space: nowrap; }
  .so.nho .so-tri { font-size: 26px; }
  .so.nho .so-icon svg { width: 26px; height: 26px; }
  /* Mã chống sao chép: chữ đơn cách, viền riêng, luôn cạnh số để đối chiếu một lượt */
  .so-ma { margin-left: 8px; padding: 1px 5px; border: 1.5px solid #000; border-radius: 3px; font-family: "Courier New", ui-monospace, monospace; font-size: 15px; font-weight: 700; letter-spacing: 1.5px; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px; }
  .so-ma-nhan { font-family: inherit; font-size: 9px; letter-spacing: .5px; font-weight: 800; }
  .so.nho .so-ma { font-size: 13px; margin-left: 6px; }
  /* KHÔNG XUỐNG DÒNG ở bất cứ ô nào — vé nhiệt tính từng mm chiều dài (chủ 12/09).
     Ô giá trị dài quá thì co chữ nhỏ lại (clamp) chứ không bẻ dòng. */
  table { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; }
  td { padding: 1px 0; vertical-align: baseline; border-bottom: 1px dotted #999; white-space: nowrap; }
  td:first-child { width: 18mm; color: #222; }
  /* Màu ghi TƯỜNG MINH cho mọi ô: vé được chụp/in trong khung riêng, không được kế thừa màu của trang ngoài. */
  td.p { text-align: right; font-weight: 700; padding-left: 4px; overflow: hidden; text-overflow: clip; color: #000; }
  td.p.dai { font-size: 11px; }
  .qr-nhan { margin-top: 4px; text-align: center; font-size: 11.5px; font-weight: 800; white-space: nowrap; }
  .qr-ve { display: flex; gap: 6px; align-items: center; margin: 3px 0 2px; padding: 3px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
  .qr-ve-anh { width: 22mm; height: 22mm; flex: 0 0 22mm; }
  .qr-ve-anh svg { width: 100%; height: 100%; display: block; }
  .qr-ve-chu { min-width: 0; line-height: 1.2; }
  .qr-ve-ma { font-size: 16px; font-weight: 900; white-space: nowrap; }
  .qr-ve-ten { font-size: 11px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .qr-ve-dv { font-size: 11px; font-weight: 700; white-space: nowrap; }
  .qr-ve-nhan { font-size: 9px; margin-top: 2px; }
  .qr { display: flex; justify-content: space-around; align-items: flex-start; margin-top: 2px; }
  .qr figure { margin: 0; text-align: center; }
  .qr-anh { width: 24mm; height: 24mm; }
  .qr-anh svg { width: 100%; height: 100%; display: block; }
  .qr figcaption { font-size: 11px; font-weight: 800; margin-top: 1px; white-space: nowrap; }
  .ghi { margin-top: 4px; font-size: 11px; font-weight: 600; white-space: nowrap; color: #000; }
  .uong { margin: 2px 0 0; font-size: 11px; font-weight: 600; white-space: nowrap; color: #000; }
  .luuy { margin-top: 5px; border-top: 1px solid #000; padding-top: 3px; font-size: 11px; font-weight: 800; text-align: center; white-space: nowrap; line-height: 1.3; }
  .luuy-khach { margin: 1px 0 0; padding-left: 12px; font-size: 11px; font-weight: 600; line-height: 1.4; color: #000; }
  /* Lưới an toàn: dòng nào lỡ dài thì XUỐNG DÒNG có thụt lề, thà thêm vài mm
     giấy còn hơn in ra mất đuôi chữ (chủ 13/09). */
  .luuy-khach li { white-space: normal; overflow-wrap: anywhere; }
  /* SA PA: một liên 80 x 80 mm — cao cố định; QR to bên trái, ba dòng chữ bên phải */
  /* SA PA trên GIẤY CUỘN (chủ 18/09, ảnh chụp hộp thoại in Android "80mm Roll"): KHÔNG ngắt trang
     giữa các vé — mỗi vé một "trang" là mỗi vé một khúc cuộn dài, giấy trắng cả gang tay và đầu vé
     đầu bị cắt. Các vé nối liền nhau, cách nhau một vạch đứt để xé; vé vẫn cao đúng 74 mm. */
  /* ===== SA PA — một liên gọn, kiểu hiện đại (chủ 18/09) =====
     Cao theo NỘI DUNG (không ép 74 mm — hết khoảng trống), các vé nối liền trên giấy cuộn,
     cách nhau vạch đứt để xé. Không ngắt trang giữa các vé. */
  .ve.tem { display: block; padding: 1mm 0 3mm; page-break-after: auto; break-after: auto; page-break-inside: avoid; break-inside: avoid; }
  .ve.tem + .ve.tem { margin-top: 3mm; border-top: 1px dashed #000; padding-top: 3mm; }
  .sp-dau { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  /* Logo gốc VUÔNG (300×300); html2canvas không hiểu object-fit nên khung phải vuông, không thì bóp méo (chủ 18/09) */
  .sp-logo { width: 10mm; height: 10mm; object-fit: contain; flex: none; }
  .sp-hang { min-width: 0; line-height: 1.1; }
  .sp-ten { font-size: 16px; font-weight: 900; letter-spacing: .6px; white-space: nowrap; }
  .sp-phu { font-size: 10px; font-weight: 800; letter-spacing: .4px; white-space: nowrap; color: #000; margin-top: 2px; }
  /* Dải đen: số thứ tự (trái) + mã chống giả (phải) — chữ trắng */
  /* KHUNG VIỀN ĐẬM thay nền đen (chủ 18/09: nền đen in nhiệt dễ nhoè). Mọi thứ căn giữa theo trục dọc,
     số thứ tự line-height 1 và kéo nhẹ lên để không "lọt xuống thấp" khi máy vẽ ảnh. */
  .sp-so { display: flex; align-items: center; border: 3px solid #000; border-radius: 3mm; padding: 4px 8px; gap: 8px; }
  /* Chủ 18/09: số thứ tự căn GIỮA phần trái khung và to hơn một chút */
  .sp-so-trai { display: flex; align-items: center; justify-content: center; gap: 8px; flex: 1; min-width: 0; }
  .sp-so-icon { display: inline-flex; align-items: center; }
  .sp-so-icon svg { width: 30px; height: 30px; display: block; }
  /* Số không có phần đuôi dưới dòng nên ô chữ line-height 1 làm số "ngồi thấp", đè viền dưới — kéo lên ~10% cỡ chữ (chủ 18/09) */
  .sp-so-tri { font-size: 42px; font-weight: 900; line-height: 1; letter-spacing: -1px; white-space: nowrap; display: block; position: relative; top: -4px; }
  /* Phần ngày "22.9" nhỏ hơn phần "#1.2" — cùng dòng nền */
  .sp-so-ngay { font-size: 24px; font-weight: 900; letter-spacing: 0; margin-right: 2px; }
  .sp-so-phai { display: flex; flex-direction: column; align-items: flex-end; justify-content: center; flex: none; }
  .sp-ma-nhan { font-size: 9px; font-weight: 800; letter-spacing: 1.5px; line-height: 1; }
  .sp-ma { font-family: "Courier New", ui-monospace, monospace; font-size: 22px; font-weight: 900; letter-spacing: 3px; line-height: 1.1; white-space: nowrap; }
  /* Thân: QR trái, chữ phải */
  .sp-than { display: flex; gap: 7px; align-items: center; margin-top: 5px; }
  .sp-qr { flex: 0 0 30mm; text-align: center; }
  .sp-qr svg { width: 30mm; height: 30mm; display: block; }
  .sp-qr-nhan { font-size: 9px; font-weight: 900; letter-spacing: .8px; white-space: nowrap; margin-top: 1px; }
  .sp-phai { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
  .sp-ngay { font-size: 18px; font-weight: 900; white-space: nowrap; line-height: 1.1; }
  .sp-gio { display: inline-block; margin-left: 6px; padding: 1px 6px; border: 2px solid #000; border-radius: 3px; font-size: 14px; font-weight: 900; vertical-align: 2px; }
  .sp-khach { font-size: 15px; font-weight: 900; line-height: 1.15; white-space: normal; overflow-wrap: anywhere; }
  .sp-khach.dai { font-size: 13px; }
  .sp-stt { font-weight: 800; color: #000; }
  .sp-dv { display: flex; flex-wrap: wrap; gap: 4px; }
  .sp-dv span { border: 2px solid #000; border-radius: 3px; padding: 2px 6px; font-size: 13px; font-weight: 900; white-space: nowrap; }
  /* Chân: kẻ đậm 2px thay nét chấm mảnh (nét mảnh in nhiệt nhoè) */
  /* Chân: giãn ký tự để "Printed 12:27 18/9" không dính chữ khi mực nhoè */
  .sp-cuoi { display: flex; justify-content: space-between; gap: 6px; margin-top: 6px; padding-top: 3px; border-top: 2px solid #000; font-size: 11px; font-weight: 800; letter-spacing: .6px; word-spacing: 1.5px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .sp-luuy { margin-top: 3px; font-size: 11px; font-weight: 700; line-height: 1.25; text-align: center; white-space: normal; }
  /* Vé phụ Khau Phạ: QR nhỏ hơn (chỉ ngày + số), dòng ghi chú đổi nước / xe ôm */
  .sp-qr.nho { flex-basis: 22mm; }
  .sp-qr.nho svg { width: 22mm; height: 22mm; }
  .sp-ghi { font-size: 11px; font-weight: 800; line-height: 1.25; white-space: normal; overflow-wrap: anywhere; }
`;

/**
 * Dựng trang in cho một booking (đủ bộ 3 liên × số khách). Tách khỏi việc in
 * để xem thử mẫu không cần máy in (scripts/baocao/xem-mau-ve.ts).
 */
export async function buildTicketsHtml(b: BookingDTO, spot: string): Promise<string> {
  const guests = Math.max(1, b.guestCount || 1);
  const luc = gioIn();
  const laKhauPha = normalizeSpot(spot) === "khau-pha";
  /** Mã vé QR từng khách — sinh trước, mỗi khách một ảnh; Khau Phạ thêm QR vé nước + vé xe. */
  const qrVe = new Map<number, string>();
  const qrNuoc = new Map<number, string>();
  const qrXe = new Map<number, string>();
  if (b.veQr?.ngay) {
    const v = b.veQr;
    await Promise.all(
      Array.from({ length: guests }, (_, i) => i + 1).map(async (g) => {
        /** Đuôi QR = mã chống giả của khách (chủ 18/09) — chưa có mã thì rơi về mã điểm. */
        qrVe.set(g, await qrSvg(veQrText(spot, v.ngay, v.so, g, maVeCua(b, g))));
        if (laKhauPha) {
          qrNuoc.set(g, await qrSvg(veQrPhuText("nuoc", v.ngay, v.so, g)));
          qrXe.set(g, await qrSvg(veQrPhuText("xe", v.ngay, v.so, g)));
        }
      }),
    );
  }
  const pages: string[] = [];
  for (let g = 1; g <= guests; g++) {
    /**
     * Sa Pa, Hà Nội: MỘT liên vé bay. Khau Phạ: BA liên (chủ 18/09) — vé bay dù
     * có QR phi công quét, vé đồ uống, vé xe ôm (hai liên sau QR riêng, chỉ
     * ngày + số booking + số khách).
     */
    pages.push(lienBoarding(b, spot, g, luc, qrVe.get(g)));
    if (laKhauPha) pages.push(lienPhu(b, spot, g, luc, "nuoc", qrNuoc.get(g)), lienPhu(b, spot, g, luc, "xe", qrXe.get(g)));
  }
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8" />
<title>Vé bay ${esc(b.bookingCode || b.daySeq)}</title>
<style>${CSS}</style></head><body>${pages.join("")}</body></html>`;
}

/** Nạp HTML vào iframe ẩn — dùng chung cho cả hộp thoại in lẫn chụp ảnh gửi USB. */
function dungKhung(html: string, rongPx?: number): Promise<HTMLIFrameElement> {
  return new Promise((ok, loi) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = rongPx
      ? `position:fixed;left:-10000px;top:0;width:${rongPx}px;height:2000px;border:0;background:#fff;`
      : "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) {
      document.body.removeChild(frame);
      loi(new Error("Trình duyệt không mở được cửa sổ in. Thử lại bằng Chrome hoặc Safari."));
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    if (doc.readyState === "complete") ok(frame);
    else frame.onload = () => ok(frame);
  });
}

/** Đường 1: hộp thoại in của trình duyệt. */
async function inQuaHopThoai(html: string): Promise<void> {
  const frame = await dungKhung(html);
  try {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  } catch (e) {
    /**
     * Một số trình duyệt (Safari trên iPad, WebView) không cho khung ẩn gọi
     * print() — mở vé ra TAB RIÊNG để người trực bấm In / Chia sẻ → In (chủ
     * 12/09 báo "vẫn không in được"). Tab riêng không bị chặn vì mở ngay trong
     * cú bấm của người dùng.
     */
    console.warn("Không gọi được print() từ khung ẩn, mở tab riêng:", e);
    const w = window.open("", "_blank");
    if (w) {
      w.document.open();
      w.document.write(html.replace("</body>", '<script>setTimeout(function(){window.print()},300)</script></body>'));
      w.document.close();
    }
  }
  // Đợi hộp thoại in đóng hẳn rồi mới dọn, không thì bản in cụt giữa chừng
  window.setTimeout(() => frame.parentNode && document.body.removeChild(frame), 60_000);
}

/** Thu ảnh về `rong` điểm bằng cách lấy ĐIỂM ĐẬM NHẤT trong mỗi ô k×k, rồi cắt dòng trắng thừa ở đáy. */
function gopDamNhat(src: HTMLCanvasElement, rong: number): HTMLCanvasElement {
  const k = Math.max(1, Math.round(src.width / rong));
  const w = rong;
  const h = Math.max(1, Math.floor(src.height / k));
  const gs = src.getContext("2d", { willReadFrequently: true });
  const ra = document.createElement("canvas");
  ra.width = w;
  ra.height = h;
  const gr = ra.getContext("2d")!;
  if (!gs) {
    gr.fillStyle = "#fff";
    gr.fillRect(0, 0, w, h);
    gr.drawImage(src, 0, 0, w, h);
    return ra;
  }
  const px = gs.getImageData(0, 0, src.width, src.height).data;
  const out = gr.createImageData(w, h);
  const sw = src.width;
  let dongCuoiCoMuc = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let toi = 255;
      for (let dy = 0; dy < k; dy++) {
        for (let dx = 0; dx < k; dx++) {
          const i = ((y * k + dy) * sw + (x * k + dx)) * 4;
          const a = px[i + 3] / 255;
          const sang = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) * a + 255 * (1 - a);
          if (sang < toi) toi = sang;
        }
      }
      const o = (y * w + x) * 4;
      out.data[o] = out.data[o + 1] = out.data[o + 2] = toi;
      out.data[o + 3] = 255;
      if (toi < 160) dongCuoiCoMuc = y;
    }
  }
  gr.putImageData(out, 0, 0);
  /** Cắt phần trắng dưới đáy (giữ 24 dòng đệm) — bớt dữ liệu gửi qua Bluetooth, bớt giấy. */
  const hCat = Math.min(h, dongCuoiCoMuc + 24);
  if (hCat < h) {
    const cat = document.createElement("canvas");
    cat.width = w;
    cat.height = hCat;
    cat.getContext("2d")!.drawImage(ra, 0, 0, w, hCat, 0, 0, w, hCat);
    return cat;
  }
  return ra;
}

/**
 * Máy in "thẳng" nào đang dùng trên CHÍNH MÁY NÀY, theo thứ tự chắc ăn:
 * Bluetooth BLE đã ghép → USB đã ghép → RawBT (cầu nối cho máy in Bluetooth
 * cổ điển như Gainscha B300, chủ 13/09 muốn in thẳng không qua trạm).
 */
export type KenhInThang = "bluetooth" | "usb" | "rawbt" | "chia-se";

export function mayInThangDaGhep(): KenhInThang | null {
  /** RawBT đứng TRƯỚC Bluetooth (chủ 18/09): RawBT in nhanh và đúng, BLE thẳng ra B300 chậm và dễ vỡ ảnh. */
  if (mayCoTheDungRawbt() && rawbtDaBat()) return "rawbt";
  if (trinhDuyetCoUsb() && mayInDaGhep()) return "usb";
  if (trinhDuyetCoBluetooth() && mayInBluetoothDaGhep()) return "bluetooth";
  /** Đường 5 (chủ 17/09): iPhone / mọi máy — đưa ảnh vé sang app in qua khay chia sẻ. */
  if (mayCoTheChiaSeAnh() && chiaSeDaBat()) return "chia-se";
  return null;
}

/**
 * Đường 2: chụp từng liên thành ảnh 576 chấm rồi đẩy thẳng ra máy in (Bluetooth
 * hoặc USB — cùng luồng ESC/POS). Khung iframe rộng đúng 576px và CSS đổi mm
 * sang px theo tỉ lệ ấy để bố cục y hệt bản in qua hộp thoại.
 */
export async function inQuaMayInThang(html: string, kenh: KenhInThang): Promise<void> {
  const anh = await dungAnhVe(html);
  await inAnhQuaKenh(anh, kenh);
}

/**
 * ĐẨY ẢNH ĐÃ DỰNG ra đúng kênh. Tách riêng để KHUNG XEM VÉ (Sa Pa) in thẳng từ
 * ảnh đã có trong tay NGAY TRONG CÚ BẤM — không dựng lại, không await trước khi
 * gọi RawBT (Chrome Android chặn mở liên kết `rawbt:` khi cú bấm đã nguội;
 * chủ 18/09: "bấm in không sang RawBT mà mở trang trống").
 */
export async function inAnhQuaKenh(anh: HTMLCanvasElement[], kenh: KenhInThang): Promise<void> {
  if (kenh === "bluetooth") await inAnhQuaBluetooth(anh);
  else if (kenh === "rawbt") await inAnhQuaRawbt(anh);
  else if (kenh === "chia-se") {
    const kq = await hienKhungChiaSe(ghepAnhLien(anh, RONG_CHAM), `ve-${Date.now()}.png`);
    if (kq !== "da-gui") throw new Error("Chưa gửi sang app in");
  } else await inAnhQuaUsb(anh);
}

/**
 * DỰNG ẢNH TỪNG LIÊN (576 chấm ngang) từ HTML vé — dùng chung cho in thẳng,
 * gửi app in, và KHUNG XEM VÉ để khách chụp lại (Sa Pa, chủ 18/09).
 */
export async function dungAnhVe(html: string, onTienDo?: (pct: number, chu: string) => void): Promise<HTMLCanvasElement[]> {
  onTienDo?.(5, "Đang tải bộ vẽ vé…");
  const html2canvas = (await import("html2canvas")).default;
  onTienDo?.(15, "Đang dựng vé…");
  /** 74mm vùng vé ↔ 576 chấm: ép khổ bằng CSS đè lên `.ve`. */
  /**
   * BẢN IN THẲNG phóng chữ theo khung 576 chấm.
   *
   * Chủ 13/09: "một số chữ của vé in nhiệt quá bé, in bị nhoè". Trong khung
   * này 1px = 1 chấm máy in; ở 203 dpi thì chữ 10 chấm chỉ cao 1,2mm — nét
   * mảnh hơn một hạt mực, in ra nhoè. SÀN LÀ 15 CHẤM (≈1,9mm) và chữ nhỏ
   * phải đậm ≥600, vì nét mảnh là thứ nhoè trước tiên.
   *
   * Bản trước sót ba lớp — `.luuy-khach` (năm dòng lưu ý ở liên khách giữ),
   * `td.p.dai` (tên khách dài), và gõ nhầm `.so-nhan` thay vì `.so-ma-nhan` —
   * nên đúng mấy chỗ ấy vẫn in ở 9–10 chấm và nhoè.
   */
  const htmlUsb = htmlBanInThang(html);
  const frame = await dungKhung(htmlUsb, RONG_CHAM);
  try {
    const doc = frame.contentDocument!;
    /** Chờ font và SVG QR vẽ xong rồi mới chụp — chụp sớm là mất chữ đậm. */
    await new Promise((r) => setTimeout(r, 150));
    const lien = Array.from(doc.querySelectorAll<HTMLElement>(".ve"));
    const anh: HTMLCanvasElement[] = [];
    for (let i = 0; i < lien.length; i++) {
      onTienDo?.(Math.round(20 + (75 * i) / lien.length), `Đang vẽ vé ${i + 1}/${lien.length}…`);
      const c = await html2canvas(lien[i], { scale: 2, width: RONG_CHAM, backgroundColor: "#ffffff", logging: false });
      anh.push(gopDamNhat(c, RONG_CHAM));
    }
    onTienDo?.(100, "Xong");
    return anh;
  } finally {
    frame.parentNode && document.body.removeChild(frame);
  }
}

/**
 * CSS BẢN IN THẲNG (576 chấm ngang) đè lên HTML vé — tách ra để script xem mẫu
 * dựng đúng bản máy in sẽ nhận. Vé Sa Pa khai bằng mm cho hộp thoại in, nên ở
 * đây phải phóng lại TỪNG phần theo tỉ lệ 576/280 ≈ 2,06 (chủ 18/09: "vé vẽ ra
 * bị lệch chữ, chồng chữ" — QR đã phóng 236 chấm mà chữ vẫn 14px, nhãn dưới
 * QR đè lên dòng cuối).
 */
export function htmlBanInThang(html: string): string {
  return html.replace(
    "</style>",
    `.ve { width: ${RONG_CHAM}px !important; padding: 8px 10px 14px !important; }
     /* Đệm dưới 14 chấm: dòng "the flight." có chữ g/p thò xuống, đệm 2 chấm bị ảnh cắt mất chân chữ (chủ 18/09) */
     /* Khoảng trống đầu vé giảm một nửa (chủ 18/09) */
     .ve.tem { padding: 3px 10px 14px !important; }
     .ve.tem + .ve.tem { margin-top: 9px !important; padding-top: 9px !important; border-top-width: 2px !important; }
     .sp-dau { gap: 12px !important; margin-bottom: 6px !important; }
     .sp-logo { width: 76px !important; height: 76px !important; }
     .sp-ten { font-size: 32px !important; }
     .sp-phu { font-size: 18px !important; margin-top: 4px !important; }
     .sp-so { border-radius: 16px !important; border-width: 5px !important; padding: 6px 16px 12px !important; gap: 16px !important; }
     .sp-so-trai { gap: 10px !important; }
     .sp-so-tri { top: -9px !important; }
     .sp-so-icon svg { width: 44px !important; height: 44px !important; }
     .sp-so-tri { font-size: 80px !important; }
     .sp-so-ngay { font-size: 44px !important; margin-right: 4px !important; }
     .sp-ma-nhan { font-size: 16px !important; }
     .sp-ma { font-size: 42px !important; letter-spacing: 5px !important; }
     .sp-than { gap: 14px !important; margin-top: 10px !important; }
     .sp-qr { flex-basis: 236px !important; }
     .sp-qr svg { width: 236px !important; height: 236px !important; }
     .sp-qr-nhan { font-size: 16px !important; margin-top: 3px !important; }
     .sp-qr.nho { flex-basis: 170px !important; }
     .sp-qr.nho svg { width: 170px !important; height: 170px !important; }
     .sp-ghi { font-size: 20px !important; }
     .sp-phai { gap: 10px !important; }
     .sp-ngay { font-size: 34px !important; }
     .sp-gio { font-size: 26px !important; padding: 2px 10px !important; border-width: 3px !important; margin-left: 10px !important; vertical-align: 4px !important; }
     .sp-khach { font-size: 28px !important; }
     .sp-khach.dai { font-size: 24px !important; }
     .sp-dv span { font-size: 24px !important; padding: 4px 12px !important; border-width: 3px !important; border-radius: 6px !important; }
     .sp-cuoi { font-size: 20px !important; margin-top: 12px !important; padding-top: 6px !important; border-top-width: 3px !important; letter-spacing: 1.4px !important; word-spacing: 4px !important; }
     .sp-luuy { font-size: 20px !important; margin-top: 6px !important; margin-bottom: 0 !important; line-height: 1.35 !important; }
     .qr-anh { width: 200px !important; height: 200px !important; }
     body { font-size: 16px; -webkit-font-smoothing: none; }
     table { font-size: 17px !important; }
     td.p.dai { font-size: 15px !important; }
     .so-tri { font-size: 56px !important; }
     .so.nho .so-tri { font-size: 40px !important; }
     .so-ma { font-size: 22px !important; }
     .so.nho .so-ma { font-size: 19px !important; }
     .so-ma-nhan { font-size: 13px !important; }
     .ten { font-size: 28px !important; }
     .ten small { font-size: 17px !important; }
     .ghi, .uong { font-size: 17px !important; font-weight: 700 !important; }
     .lien { font-size: 17px !important; }
     .qr-nhan { font-size: 16px !important; }
     .qr figcaption { font-size: 15px !important; }
     .luuy { font-size: 15px !important; }
     .luuy-khach { font-size: 15px !important; font-weight: 600 !important; line-height: 1.45 !important; padding-left: 18px !important; }
     </style>`,
  );
}

/**
 * IN BỘ VÉ CHO MỘT BOOKING. Có máy in USB đã ghép (và trình duyệt có WebUSB)
 * thì in thẳng; không có, hoặc in thẳng hỏng, thì mở hộp thoại in.
 * Trả về đường đã dùng để nút bấm báo lại cho người trực.
 */
/**
 * ĐIỆN THOẠI / MÁY TÍNH BẢNG (Android, iPad): Chrome bỏ qua lệnh print() gọi
 * từ khung ẩn mà KHÔNG báo lỗi — chủ 12/09: "bấm in vé không thấy gì, không ra
 * hộp thoại". Trên các máy này vé phải mở ra TAB RIÊNG rồi in từ đó.
 */
export function nenMoTabIn(): boolean {
  return typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * Mở sẵn tab in NGAY TRONG CÚ BẤM (đồng bộ, trước mọi `await`) — mở sau khi đã
 * gọi máy chủ là bị chặn cửa sổ bật lên. Máy tính để bàn trả null (dùng khung
 * ẩn như cũ). Có USB đã ghép thì hàm in sẽ tự đóng tab này.
 */
export function moTabIn(): Window | null {
  if (!nenMoTabIn() || typeof window === "undefined") return null;
  /** Đã cài kênh in thẳng (RawBT / USB / Bluetooth / app) thì KHÔNG mở tab trống (chủ 18/09: "không mở trang trống, in trực tiếp luôn"). */
  if (mayInThangDaGhep()) return null;
  const w = window.open("", "_blank");
  if (w) {
    try {
      w.document.write(
        '<title>Đang chuẩn bị vé…</title><p style="font:16px system-ui,sans-serif;padding:24px;color:#333">Đang chuẩn bị vé, chờ một chút…</p>',
      );
    } catch {
      /* bỏ qua */
    }
  }
  return w;
}

/**
 * GHI LỖI VÀO TAB IN thay vì đóng tab (chủ 12/09: "bấm in vé nó loé lên như
 * mở cửa sổ rồi mọi thứ lại như cũ" — tab bị đóng ngay khi có lỗi nên không
 * ai đọc được lỗi gì). Tab ở lại với dòng lỗi và nút Đóng.
 */
export function baoLoiVaoTab(tab: Window | null | undefined, loi: string): void {
  if (!tab || tab.closed) return;
  try {
    tab.document.open();
    tab.document.write(
      `<title>Không in được vé</title><div style="font:16px system-ui,sans-serif;padding:24px;color:#7f1d1d;line-height:1.5"><b>Không in được vé.</b><br>${loi
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}<br><br><button onclick="window.close()" style="font:16px system-ui;padding:10px 18px;border:0;border-radius:10px;background:#111;color:#fff">Đóng</button></div>`,
    );
    tab.document.close();
  } catch {
    /* tab bị chặn thì thôi */
  }
}

type TramDTO = { online: boolean; deviceName: string; kenh: string };
type JobDTO = { id: string; status: "queued" | "printing" | "done" | "failed"; error?: string; stationName?: string };

/** Trạm in của điểm có đang trực không — nhớ 15 giây để bấm in liên tiếp không hỏi lại. */
const nhoTram = new Map<string, { luc: number; tram: TramDTO }>();
async function tramDangTruc(spot: string): Promise<TramDTO | null> {
  const c = nhoTram.get(spot);
  if (c && Date.now() - c.luc < 15_000) return c.tram.online ? c.tram : null;
  try {
    const r = await apiGet<{ tram: TramDTO }>(`/api/baocao/in-ve?spot=${spot}&tram=1`);
    nhoTram.set(spot, { luc: Date.now(), tram: r.tram });
    return r.tram.online ? r.tram : null;
  } catch {
    return null;
  }
}

/** Ghi tiến độ vào tab in (điện thoại) — không có tab thì thôi. */
function ghiTab(tab: Window | null | undefined, html: string): void {
  if (!tab || tab.closed) return;
  try {
    tab.document.open();
    tab.document.write(`<title>Trạm in</title><div style="font:17px system-ui,sans-serif;padding:24px;line-height:1.6">${html}</div>`);
    tab.document.close();
  } catch {
    /* bỏ qua */
  }
}

/**
 * GỬI LỆNH TỚI TRẠM IN rồi chờ tối đa 40 giây. Trả true nếu trạm in xong;
 * ném lỗi (có câu) nếu trạm báo hỏng hoặc quá giờ — chỗ gọi tự rơi về in tay.
 */
async function inQuaTram(b: BookingDTO, spot: string, tram: TramDTO, tab: Window | null | undefined, reason: string): Promise<void> {
  const nut = '<br><br><button onclick="window.close()" style="font:16px system-ui;padding:10px 18px;border:0;border-radius:10px;background:#111;color:#fff">Đóng</button>';
  ghiTab(tab, `🖨 Đã gửi vé tới <b>trạm in ${tram.deviceName || ""}</b>… đang in, đợi khoảng 20 giây.${nut}`);
  const { job } = await apiPost<{ job: JobDTO }>(`/api/baocao/in-ve?spot=${spot}`, { bookingId: b.id, reason });
  const het = Date.now() + 40_000;
  while (Date.now() < het) {
    await new Promise((r) => setTimeout(r, 2000));
    const r = await apiGet<{ job: JobDTO | null }>(`/api/baocao/in-ve?spot=${spot}&job=${job.id}`);
    if (r.job?.status === "done") {
      ghiTab(tab, `✅ <b>Trạm in đã in xong</b> vé #${b.daySeq}.${nut}`);
      if (tab && !tab.closed) setTimeout(() => tab.close(), 2500);
      return;
    }
    if (r.job?.status === "failed") throw new Error(r.job.error || "Trạm in báo lỗi");
  }
  throw new Error("Trạm in không trả lời sau 40 giây — kiểm tra máy trạm còn mở trang Trạm in không");
}

export async function printBookingTickets(
  b: BookingDTO,
  spot: string,
  tab?: Window | null,
  reason = "",
): Promise<KenhInThang | "tram" | "hop-thoai" | "tab" | "khong-in"> {
  if (!coInVe(spot)) {
    baoLoiVaoTab(tab, "Điểm bay này không in vé (chỉ Sa Pa và vé QR PPG Khau Phạ).");
    return "khong-in";
  }
  const kenh = mayInThangDaGhep();
  /**
   * THỨ TỰ ƯU TIÊN: (1) máy in ghép trực tiếp trên chính máy này; (2) TRẠM IN
   * của điểm đang trực — cách chạy được trên iPhone và mọi máy khác, cài một
   * lần ở trạm (chủ 12/09); (3) tab / hộp thoại in của trình duyệt.
   */
  if (!kenh) {
    const tram = await tramDangTruc(spot);
    if (tram) {
      try {
        await inQuaTram(b, spot, tram, tab, reason);
        return "tram";
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        console.warn("Trạm in hỏng, chuyển sang in tay:", m);
        if (typeof window !== "undefined") window.alert(`Trạm in không in được: ${m}\nVé sẽ mở ra để in tay.`);
      }
    }
  }
  let html: string;
  try {
    html = await buildTicketsHtml(b, spot);
  } catch (e) {
    baoLoiVaoTab(tab, `Không dựng được vé: ${e instanceof Error ? e.message : String(e)}`);
    throw e;
  }
  if (kenh) {
    try {
      await inQuaMayInThang(html, kenh);
      tab?.close();
      return kenh;
    } catch (e) {
      /**
       * KÊNH IN THẲNG HỎNG → BÁO LỖI RÕ và DỪNG (chủ 18/09: "lỗi không in được
       * do chưa kết nối hay lỗi phát sinh thì phải hiện lỗi để xử lý"). Không
       * lặng lẽ nhảy sang hộp thoại in nữa — nhảy như thế người trực tưởng máy
       * tự đổi đường, còn lỗi thật (chưa mở RawBT, Bluetooth chưa nối…) thì
       * không ai biết mà sửa.
       */
      console.warn(`In thẳng qua ${kenh} hỏng:`, e);
      const tenKenh = kenh === "bluetooth" ? "Bluetooth" : kenh === "rawbt" ? "RawBT" : kenh === "chia-se" ? "app in (chia sẻ)" : "USB";
      tab?.close();
      if (kenh === "chia-se" && e instanceof Error && e.message === "Chưa gửi sang app in") return "khong-in";
      const m = e instanceof Error ? e.message : String(e);
      if (typeof window !== "undefined") window.alert(`KHÔNG IN ĐƯỢC qua ${tenKenh}: ${m}\n\nKiểm tra: app/máy in đã bật và ghép chưa? Sửa xong bấm In vé lại. (Muốn in qua hộp thoại thì tắt kênh ${tenKenh} trong khung cài máy in.)`);
      throw new Error(`Không in được qua ${tenKenh}: ${m}`);
    }
  }
  if (tab && !tab.closed) {
    inQuaTab(tab, html);
    return "tab";
  }
  await inQuaHopThoai(html);
  return "hop-thoai";
}

/**
 * In từ TAB RIÊNG: có thanh nút "IN" / "Đóng" (ẩn khi in) vì trên điện thoại
 * hộp thoại in tự bật không phải lúc nào cũng lên — người trực bấm IN là được.
 * Android không có dịch vụ in của Gainscha thì hộp thoại chỉ có "Lưu PDF":
 * lúc đó phải ghép máy in USB (cáp OTG) để in thẳng — thanh nút nhắc điều này.
 */
function inQuaTab(tab: Window, html: string): void {
  const thanh =
    '<div class="thanh-in" style="position:sticky;top:0;z-index:9;display:flex;gap:8px;align-items:center;padding:10px;background:#111;color:#fff;font:14px system-ui,sans-serif">' +
    '<button onclick="window.print()" style="font:700 18px system-ui;padding:12px 22px;border:0;border-radius:10px;background:#16a34a;color:#fff">🖨 IN VÉ</button>' +
    '<button onclick="window.close()" style="font:15px system-ui;padding:12px 16px;border:1px solid #666;border-radius:10px;background:transparent;color:#fff">Đóng</button>' +
    '<span style="opacity:.8">Không thấy máy in? Trên Android hãy ghép máy in USB (cáp OTG) ở đầu sổ booking để in thẳng.</span></div>' +
    "<style>@media print{.thanh-in{display:none!important}}</style>";
  const trang = html.replace(/<body([^>]*)>/i, (m) => `${m}${thanh}`).replace("</body>", '<script>setTimeout(function(){try{window.print()}catch(e){}},400)</script></body>');
  tab.document.open();
  tab.document.write(trang);
  tab.document.close();
  try {
    tab.focus();
  } catch {
    /* bỏ qua */
  }
}
