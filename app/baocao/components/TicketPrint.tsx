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
const REVIEW_LINKS: Record<string, { google: string; tripadvisor: string; tripadvisorPpg?: string }> = {
  "khau-pha": {
    google: KHAU_PHA_TAKEOFF_MAP_URL,
    /** Khách bay PG → trang review tour dù lượn; bay PPG → trang review tour dù động cơ (chủ 12/09). */
    tripadvisor:
      "https://www.tripadvisor.com/AttractionProductReview-g23389438-d34108763-Mu_Cang_Chai_Paragliding_Experience_with_Free_Accommodation-Cao_Pha_Yen_Bai_Prov.html",
    tripadvisorPpg:
      "https://www.tripadvisor.com/AttractionProductReview-g23389438-d34437796-Paramotor_Paragliding_Experience_in_Mu_Cang_Chai-Cao_Pha_Yen_Bai_Province.html",
  },
  sapa: {
    google: SAPA_TAKEOFF_MAP_URL,
    tripadvisor:
      "https://www.tripadvisor.com/Attraction_Review-g311304-d33242005-Reviews-Paragliding_Experience_in_Sapa_Hotel_Pickup_and_Drop-off-Sapa_Lao_Cai_Province.html",
  },
};

/** Link Tripadvisor đúng loại bay của booking. */
export function linkTripadvisor(spot: string, flightKind: string): string {
  const l = REVIEW_LINKS[spot] ?? REVIEW_LINKS["khau-pha"];
  return flightKind === "ppg" && l.tripadvisorPpg ? l.tripadvisorPpg : l.tripadvisor;
}

/** Đồ uống miễn phí tại bãi — chủ liệt kê 12/09. */
/** Ngắn để nằm trọn MỘT dòng 72mm ở cỡ chữ 9,5px. */
const DO_UONG = ["Cà phê", "Trà chanh/đào", "Nước lọc/chai", "Bia/nước ngọt"];

/** Một dòng, không xuống dòng — vé nhiệt tính từng mm chiều dài (chủ 12/09). */
const LUU_Y = "Vé = tiền mặt · mất vé không cấp lại";

/** Dịch vụ thêm đã đặt — in lên vé để phi công và thợ quay biết ngay tại bãi. */
function extrasOf(b: BookingDTO): string[] {
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
    <div class="dau">
      <img class="logo" src="/logo-mbl-in.png" alt="" />
      <div class="ten">MEBAYLUON PARAGLIDING<br/><small>${esc(spotName(spot))}</small></div>
    </div>`;
}

function chan(): string {
  return `<div class="luuy">${esc(LUU_Y)}</div>`;
}

/** Ô số thứ tự: biểu tượng của liên đứng SÁT bên trái con số (chủ 12/09). */
function khoiSo(b: BookingDTO, guestNo: number, icon: keyof typeof ICON, nho = false): string {
  return `
    <div class="so${nho ? " nho" : ""}">
      <span class="so-icon">${ICON[icon]}</span>
      <span class="so-tri">${esc(soThuTuVe(b, guestNo))}</span>
    </div>`;
}

/** LIÊN 1 — vé bay dù. */
function lienBay(b: BookingDTO, spot: string, guestNo: number, qr: QrBo, luc: string): string {
  const extras = extrasOf(b);
  return `
  <section class="ve">
    ${dau(spot, "LIÊN 1 — VÉ BAY DÙ")}
    ${khoiSo(b, guestNo, "du")}
    <table>
      <tr><td>Ngày bay</td><td class="p">${esc(formatDateKeyVN(b.flightDate))}${b.guestCount > 1 ? ` · ${guestNo}/${esc(b.guestCount)}` : ""}</td></tr>
      <tr><td>Khách</td><td class="p${tenKhachVe(b, guestNo).length > 22 ? " dai" : ""}">${esc(tenKhachVe(b, guestNo))}</td></tr>
      <tr><td>Dịch vụ</td><td class="p${extras.join(" · ").length > 26 ? " dai" : ""}">${extras.length ? esc(extras.join(" · ")) : "Bay dù"}</td></tr>
      <tr><td>In vé</td><td class="p">${esc(luc)}</td></tr>
    </table>
    <div class="qr-nhan">Bay xong, cho chúng tôi một đánh giá nhé</div>
    <div class="qr">
      <figure><div class="qr-anh">${qr.google}</div><figcaption>Google</figcaption></figure>
      <figure><div class="qr-anh">${qr.tripadvisor}</div><figcaption>Tripadvisor ${b.flightKind === "ppg" ? "PPG" : "PG"}</figcaption></figure>
    </div>
    ${chan()}
  </section>`;
}

/** LIÊN 2 — vé xe trung chuyển. */
function lienXe(b: BookingDTO, spot: string, guestNo: number, luc: string): string {
  return `
  <section class="ve">
    ${dau(spot, "LIÊN 2 — VÉ XE TRUNG CHUYỂN")}
    ${khoiSo(b, guestNo, "xe", true)}
    <table>
      <tr><td>Ngày bay</td><td class="p">${esc(formatDateKeyVN(b.flightDate))}</td></tr>
      <tr><td>Khách</td><td class="p">${esc(tenKhachVe(b, guestNo))}</td></tr>
      <tr><td>Xuất vé</td><td class="p">${esc(luc)}</td></tr>
    </table>
    <div class="ghi">Đưa lái xe trung chuyển khi lên xe</div>
    ${chan()}
  </section>`;
}

/** LIÊN 3 — vé đồ uống miễn phí. */
function lienNuoc(b: BookingDTO, spot: string, guestNo: number): string {
  return `
  <section class="ve">
    ${dau(spot, "LIÊN 3 — ĐỒ UỐNG MIỄN PHÍ")}
    ${khoiSo(b, guestNo, "uong", true)}
    <table>
      <tr><td>Khách</td><td class="p">${esc(tenKhachVe(b, guestNo))}</td></tr>
      <tr><td>Ngày bay</td><td class="p">${esc(formatDateKeyVN(b.flightDate))}</td></tr>
    </table>
    <div class="ghi">Đổi MỘT đồ uống tại quầy bãi:</div>
    <div class="uong">${DO_UONG.map((d) => esc(d)).join(" · ")}</div>
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
  /* KHÔNG XUỐNG DÒNG ở bất cứ ô nào — vé nhiệt tính từng mm chiều dài (chủ 12/09).
     Ô giá trị dài quá thì co chữ nhỏ lại (clamp) chứ không bẻ dòng. */
  table { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; }
  td { padding: 1px 0; vertical-align: baseline; border-bottom: 1px dotted #999; white-space: nowrap; }
  td:first-child { width: 18mm; color: #222; }
  /* Màu ghi TƯỜNG MINH cho mọi ô: vé được chụp/in trong khung riêng, không được kế thừa màu của trang ngoài. */
  td.p { text-align: right; font-weight: 700; padding-left: 4px; overflow: hidden; text-overflow: clip; color: #000; }
  td.p.dai { font-size: 10.5px; }
  .qr-nhan { margin-top: 4px; text-align: center; font-size: 10px; font-weight: 700; white-space: nowrap; }
  .qr { display: flex; justify-content: space-around; align-items: flex-start; margin-top: 2px; }
  .qr figure { margin: 0; text-align: center; }
  .qr-anh { width: 24mm; height: 24mm; }
  .qr-anh svg { width: 100%; height: 100%; display: block; }
  .qr figcaption { font-size: 9px; font-weight: 700; margin-top: 1px; white-space: nowrap; }
  .ghi { margin-top: 4px; font-size: 11px; font-weight: 600; white-space: nowrap; color: #000; }
  .uong { margin: 2px 0 0; font-size: 9.5px; white-space: nowrap; color: #000; }
  .luuy { margin-top: 5px; border-top: 1px solid #000; padding-top: 3px; font-size: 10px; font-weight: 700; text-align: center; white-space: nowrap; }
`;

/**
 * Dựng trang in cho một booking (đủ bộ 3 liên × số khách). Tách khỏi việc in
 * để xem thử mẫu không cần máy in (scripts/baocao/xem-mau-ve.ts).
 */
export async function buildTicketsHtml(b: BookingDTO, spot: string): Promise<string> {
  const guests = Math.max(1, b.guestCount || 1);
  const links = REVIEW_LINKS[spot] ?? REVIEW_LINKS["khau-pha"];
  const [google, tripadvisor] = await Promise.all([qrSvg(links.google), qrSvg(linkTripadvisor(spot, b.flightKind))]);
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
