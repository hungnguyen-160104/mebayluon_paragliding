"use client";

/**
 * IN VÉ BAY 3 LIÊN — Khau Phạ và Sa Pa (chủ chốt 12/09, đang in thử).
 *
 * MỖI KHÁCH MỘT BỘ VÉ, không phải mỗi booking một bộ: phi công khai theo từng
 * chuyến mà mỗi khách là một chuyến. Booking #23 có 2 khách → #23.1 và #23.2,
 * mỗi số ba liên:
 *   LIÊN 1 — VÉ BAY DÙ: ngày bay · số thứ tự · tên khách · dịch vụ đi kèm ·
 *            giờ in · hai mã QR xin đánh giá (Google, Tripadvisor).
 *   LIÊN 2 — VÉ XE TRUNG CHUYỂN: ngày bay · tên khách · ngày giờ xuất vé.
 *   LIÊN 3 — VÉ ĐỒ UỐNG MIỄN PHÍ: tên khách · số thứ tự · ngày bay · danh mục
 *            đồ uống tại bãi.
 * Liên nào cũng in dòng "vé có giá trị tương đương tiền mặt, không cấp lại".
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
import { spotName } from "@/lib/baobay/spots";
import type { BookingDTO } from "@/lib/baobay/types";
import { KHAU_PHA_TAKEOFF_MAP_URL, SAPA_TAKEOFF_MAP_URL } from "@/lib/spot-partner-links";

import { inAnhQuaUsb, mayInDaGhep, RONG_CHAM, trinhDuyetCoUsb } from "@/lib/baobay/may-in-usb";

/** Khổ giấy máy in nhiệt Gainscha B300 ở quầy. */
const PAPER_WIDTH_MM = 80;

/** Chỉ hai điểm này in vé (chủ 12/09). Điểm khác vẫn tích "đã xuất vé" như cũ, không in. */
export const DIEM_IN_VE = new Set(["khau-pha", "sapa"]);
export function coInVe(spot: string): boolean {
  return DIEM_IN_VE.has(spot);
}

/**
 * HAI LINK XIN ĐÁNH GIÁ theo điểm: Google Maps (trang đánh giá của bãi) và
 * Tripadvisor (trang review của tour). Cùng nguồn với thẻ đối tác ở trang điểm
 * bay — sửa một chỗ là vé theo.
 */
const REVIEW_LINKS: Record<string, { google: string; tripadvisor: string }> = {
  "khau-pha": {
    google: KHAU_PHA_TAKEOFF_MAP_URL,
    tripadvisor:
      "https://www.tripadvisor.com/Attraction_Review-g8146384-d34094462-Reviews-Mu_Cang_Chai_Paragliding_Experience_with_Free_Accommodation-Mu_Cang_Chai_Lao_Ca.html",
  },
  sapa: {
    google: SAPA_TAKEOFF_MAP_URL,
    tripadvisor:
      "https://www.tripadvisor.com/Attraction_Review-g311304-d33242005-Reviews-Paragliding_Experience_in_Sapa_Hotel_Pickup_and_Drop-off-Sapa_Lao_Cai_Province.html",
  },
};

/** Đồ uống miễn phí tại bãi — chủ liệt kê 12/09. */
const DO_UONG = ["Cà phê (nâu / đen)", "Trà chanh / trà đào", "Nước lọc & đồ uống đóng chai", "Bia / nước ngọt"];

const LUU_Y = "Vé có giá trị tương đương tiền mặt — không làm mất vé, không cấp lại vé.";

/** Dịch vụ thêm đã đặt — in lên vé để phi công và thợ quay biết ngay tại bãi. */
function extrasOf(b: BookingDTO): string[] {
  const out: string[] = [];
  if (b.video360 > 0) out.push(`Cam 360 ×${b.video360}`);
  if (b.flycam > 0) out.push(`Flycam ×${b.flycam}`);
  if (b.redFlag > 0) out.push(`Cờ đỏ ×${b.redFlag}`);
  if (b.sunset > 0) out.push(`Hoàng hôn / săn mây ×${b.sunset}`);
  if (b.flagFlight > 0) out.push(`Bay kéo cờ ×${b.flagFlight}`);
  return out;
}

function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/** "#23.1" — số booking trong ngày rồi số khách trong đoàn; đoàn một người thì "#23". */
export function soThuTuVe(b: BookingDTO, guestNo: number): string {
  const so = b.daySeq || "?";
  return b.guestCount > 1 ? `#${so}.${guestNo}` : `#${so}`;
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

type QrBo = { google: string; tripadvisor: string };

function dau(spot: string, lien: string): string {
  return `
    <div class="lien">${esc(lien)}</div>
    <div class="ten">MEBAYLUON</div>
    <div class="diem">${esc(spotName(spot))}</div>`;
}

function chan(): string {
  return `<div class="luuy">⚠ ${esc(LUU_Y)}</div>`;
}

/** LIÊN 1 — vé bay dù. */
function lienBay(b: BookingDTO, spot: string, guestNo: number, qr: QrBo, luc: string): string {
  const extras = extrasOf(b);
  return `
  <section class="ve">
    ${dau(spot, "LIÊN 1 — VÉ BAY DÙ")}
    <div class="so">
      <div class="so-nhan">SỐ THỨ TỰ</div>
      <div class="so-tri">${esc(soThuTuVe(b, guestNo))}</div>
    </div>
    <table>
      <tr><td>Ngày bay</td><td class="p">${esc(formatDateKeyVN(b.flightDate))}</td></tr>
      <tr><td>Khách</td><td class="p">${esc(tenKhachVe(b, guestNo))}</td></tr>
      ${b.guestCount > 1 ? `<tr><td>Đoàn</td><td class="p">${guestNo}/${esc(b.guestCount)} khách</td></tr>` : ""}
      <tr><td>Dịch vụ</td><td class="p">${extras.length ? esc(extras.join(" · ")) : "Bay dù"}</td></tr>
      <tr><td>Giờ in vé</td><td class="p">${esc(luc)}</td></tr>
    </table>
    <div class="qr-nhan">Bay xong, cho chúng tôi một đánh giá nhé</div>
    <div class="qr">
      <figure><div class="qr-anh">${qr.google}</div><figcaption>Google</figcaption></figure>
      <figure><div class="qr-anh">${qr.tripadvisor}</div><figcaption>Tripadvisor</figcaption></figure>
    </div>
    ${chan()}
  </section>`;
}

/** LIÊN 2 — vé xe trung chuyển. */
function lienXe(b: BookingDTO, spot: string, guestNo: number, luc: string): string {
  return `
  <section class="ve">
    ${dau(spot, "LIÊN 2 — VÉ XE TRUNG CHUYỂN")}
    <div class="so nho">
      <div class="so-nhan">SỐ THỨ TỰ</div>
      <div class="so-tri">${esc(soThuTuVe(b, guestNo))}</div>
    </div>
    <table>
      <tr><td>Ngày bay</td><td class="p">${esc(formatDateKeyVN(b.flightDate))}</td></tr>
      <tr><td>Khách</td><td class="p">${esc(tenKhachVe(b, guestNo))}</td></tr>
      <tr><td>Xuất vé lúc</td><td class="p">${esc(luc)}</td></tr>
    </table>
    <div class="ghi">Đưa vé này cho lái xe trung chuyển lên bãi cất cánh / về bãi hạ.</div>
    ${chan()}
  </section>`;
}

/** LIÊN 3 — vé đồ uống miễn phí. */
function lienNuoc(b: BookingDTO, spot: string, guestNo: number): string {
  return `
  <section class="ve">
    ${dau(spot, "LIÊN 3 — ĐỒ UỐNG MIỄN PHÍ")}
    <div class="so nho">
      <div class="so-nhan">SỐ THỨ TỰ</div>
      <div class="so-tri">${esc(soThuTuVe(b, guestNo))}</div>
    </div>
    <table>
      <tr><td>Khách</td><td class="p">${esc(tenKhachVe(b, guestNo))}</td></tr>
      <tr><td>Ngày bay</td><td class="p">${esc(formatDateKeyVN(b.flightDate))}</td></tr>
    </table>
    <div class="ghi">Đổi vé này lấy MỘT đồ uống tại quầy bãi:</div>
    <ul class="uong">${DO_UONG.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
    ${chan()}
  </section>`;
}

const CSS = `
  @page { size: ${PAPER_WIDTH_MM}mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #000; background: #fff; }
  /* Mỗi liên một trang giấy — máy in nhiệt cắt theo trang */
  .ve { width: ${PAPER_WIDTH_MM - 6}mm; page-break-after: always; padding: 0 0 4mm; background: #fff; }
  .ve:last-child { page-break-after: auto; }
  .lien { text-align: center; font-size: 11px; font-weight: 800; letter-spacing: .4px;
          border: 1px solid #000; padding: 2px 0; margin-bottom: 4px; }
  .ten { text-align: center; font-size: 20px; font-weight: 900; letter-spacing: 1px; }
  .diem { text-align: center; font-size: 12px; margin-bottom: 5px; }
  /* SỐ THỨ TỰ to hết cỡ: ở bãi người ta gọi nhau bằng con số này */
  .so { border: 2px solid #000; text-align: center; padding: 2px 0 4px; margin-bottom: 6px; }
  .so-nhan { font-size: 9px; font-weight: 700; }
  .so-tri { font-size: 40px; font-weight: 900; line-height: 1.05; }
  .so.nho .so-tri { font-size: 28px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td { padding: 2px 0; vertical-align: top; border-bottom: 1px dotted #999; }
  td.p { text-align: right; font-weight: 700; padding-left: 6px; }
  .qr-nhan { margin-top: 7px; text-align: center; font-size: 10px; font-weight: 700; }
  .qr { display: flex; justify-content: space-around; align-items: flex-start; margin-top: 3px; }
  .qr figure { margin: 0; text-align: center; }
  .qr-anh { width: 26mm; height: 26mm; }
  .qr-anh svg { width: 100%; height: 100%; display: block; }
  .qr figcaption { font-size: 9px; font-weight: 700; margin-top: 2px; }
  .ghi { margin-top: 6px; font-size: 11px; line-height: 1.35; }
  .uong { margin: 3px 0 0; padding-left: 16px; font-size: 12px; line-height: 1.45; }
  .luuy { margin-top: 7px; border-top: 1px solid #000; padding-top: 4px; font-size: 9.5px; font-weight: 700; line-height: 1.35; text-align: center; }
`;

/**
 * Dựng trang in cho một booking (đủ bộ 3 liên × số khách). Tách khỏi việc in
 * để xem thử mẫu không cần máy in (scripts/baocao/xem-mau-ve.ts).
 */
export async function buildTicketsHtml(b: BookingDTO, spot: string): Promise<string> {
  const guests = Math.max(1, b.guestCount || 1);
  const links = REVIEW_LINKS[spot] ?? REVIEW_LINKS["khau-pha"];
  const [google, tripadvisor] = await Promise.all([qrSvg(links.google), qrSvg(links.tripadvisor)]);
  const qr = { google, tripadvisor };
  const luc = gioIn();
  const pages: string[] = [];
  for (let g = 1; g <= guests; g++) {
    pages.push(lienBay(b, spot, g, qr, luc), lienXe(b, spot, g, luc), lienNuoc(b, spot, g));
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
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  // Đợi hộp thoại in đóng hẳn rồi mới dọn, không thì bản in cụt giữa chừng
  window.setTimeout(() => frame.parentNode && document.body.removeChild(frame), 60_000);
}

/**
 * Đường 2: chụp từng liên thành ảnh 576 chấm rồi đẩy thẳng ra máy in USB.
 * Khung iframe rộng đúng 576px và CSS đổi mm sang px theo tỉ lệ ấy để bố cục
 * y hệt bản in qua hộp thoại.
 */
async function inQuaUsb(html: string): Promise<void> {
  const html2canvas = (await import("html2canvas")).default;
  /** 74mm vùng vé ↔ 576 chấm: ép khổ bằng CSS đè lên `.ve`. */
  const htmlUsb = html.replace("</style>", `.ve { width: ${RONG_CHAM}px !important; padding: 8px 10px 14px !important; } .qr-anh { width: 200px !important; height: 200px !important; } body { font-size: 15px; } table { font-size: 16px !important; } .so-tri { font-size: 56px !important; } .so.nho .so-tri { font-size: 40px !important; } .ten { font-size: 28px !important; } .diem, .ghi, .uong { font-size: 16px !important; } .lien { font-size: 15px !important; } .qr-nhan, .qr figcaption, .luuy { font-size: 13px !important; } .so-nhan { font-size: 12px !important; }</style>`);
  const frame = await dungKhung(htmlUsb, RONG_CHAM);
  try {
    const doc = frame.contentDocument!;
    /** Chờ font và SVG QR vẽ xong rồi mới chụp — chụp sớm là mất chữ đậm. */
    await new Promise((r) => setTimeout(r, 150));
    const lien = Array.from(doc.querySelectorAll<HTMLElement>(".ve"));
    const anh: HTMLCanvasElement[] = [];
    for (const el of lien) {
      const c = await html2canvas(el, { scale: 1, width: RONG_CHAM, backgroundColor: "#ffffff", logging: false });
      if (c.width !== RONG_CHAM) {
        /** html2canvas đôi khi làm tròn — vẽ lại đúng khổ. */
        const chuan = document.createElement("canvas");
        chuan.width = RONG_CHAM;
        chuan.height = Math.round((c.height * RONG_CHAM) / c.width);
        const g = chuan.getContext("2d")!;
        g.fillStyle = "#fff";
        g.fillRect(0, 0, chuan.width, chuan.height);
        g.drawImage(c, 0, 0, chuan.width, chuan.height);
        anh.push(chuan);
      } else anh.push(c);
    }
    await inAnhQuaUsb(anh);
  } finally {
    frame.parentNode && document.body.removeChild(frame);
  }
}

/**
 * IN BỘ VÉ CHO MỘT BOOKING. Có máy in USB đã ghép (và trình duyệt có WebUSB)
 * thì in thẳng; không có, hoặc in thẳng hỏng, thì mở hộp thoại in.
 * Trả về đường đã dùng để nút bấm báo lại cho người trực.
 */
export async function printBookingTickets(b: BookingDTO, spot: string): Promise<"usb" | "hop-thoai" | "khong-in"> {
  if (!coInVe(spot)) return "khong-in";
  const html = await buildTicketsHtml(b, spot);
  if (trinhDuyetCoUsb() && mayInDaGhep()) {
    try {
      await inQuaUsb(html);
      return "usb";
    } catch (e) {
      console.warn("In thẳng USB hỏng, chuyển sang hộp thoại in:", e);
    }
  }
  await inQuaHopThoai(html);
  return "hop-thoai";
}
