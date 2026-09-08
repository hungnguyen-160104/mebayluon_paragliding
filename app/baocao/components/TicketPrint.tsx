"use client";

/**
 * IN VÉ BAY — bản DEMO (luật chủ 07/09).
 *
 * Tới hết tháng 9/2026 công ty vẫn dùng vé giấy 3 liên viết tay; khối này để
 * chạy thử máy in và chốt mẫu vé trước, nên nó CHỈ IN. Không sinh mã vé, không
 * ghi gì thêm vào sổ ngoài việc đánh dấu "đã xuất vé" như nút cũ vẫn làm.
 *
 * In qua CỬA SỔ IN CỦA TRÌNH DUYỆT thay vì nói chuyện thẳng với máy in: trang
 * web không có đường nào tới máy in nhiệt USB, còn hộp thoại in thì máy nào
 * cũng có và nhận cả máy in nhiệt lẫn máy in giấy A4. Người trực chọn máy một
 * lần rồi tích "không hỏi lại" là những lần sau ra thẳng giấy.
 *
 * MỖI KHÁCH MỘT VÉ, không phải mỗi booking một vé: phi công khai mã vé theo
 * từng chuyến, mà mỗi khách là một chuyến. Nhóm 4 khách in ra 4 vé.
 */

import { formatDateKeyVN } from "@/lib/baobay/date";
import { spotName } from "@/lib/baobay/spots";
import type { BookingDTO } from "@/lib/baobay/types";
import { formatVND } from "@/lib/pricing";

/** Khổ giấy máy in nhiệt phổ thông ở quầy. */
const PAPER_WIDTH_MM = 80;

const KIND_LABEL: Record<string, string> = {
  pg: "Dù lượn (PG)",
  ppg: "Dù có động cơ (PPG)",
  m650: "Mô tô bay M650",
  m850: "Mô tô bay M850",
};

/** Dịch vụ thêm đã đặt — in lên vé để phi công và thợ quay biết ngay tại bãi. */
function extrasOf(b: BookingDTO): string[] {
  const out: string[] = [];
  if (b.flycam > 0) out.push(`Flycam ×${b.flycam}`);
  if (b.video360 > 0) out.push(`Camera 360 ×${b.video360}`);
  if (b.redFlag > 0) out.push(`Cờ đỏ ×${b.redFlag}`);
  if (b.sunset > 0) out.push(`Hoàng hôn ×${b.sunset}`);
  if (b.flagFlight > 0) out.push(`Bay cờ ×${b.flagFlight}`);
  return out;
}

function esc(v: unknown): string {
  return String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/**
 * Một liên vé. `copy` là tên liên (Khách / Phi công / Lưu quầy) — giữ đúng nếp
 * vé 3 liên đang dùng, để đổi sang vé in không phải đổi luôn cách làm việc.
 */
function ticketHtml(b: BookingDTO, spot: string, guestNo: number, copy: string): string {
  const extras = extrasOf(b);
  return `
  <section class="ve">
    <div class="lien">${esc(copy)}</div>
    <div class="ten">MEBAYLUON</div>
    <div class="diem">${esc(spotName(spot))}</div>

    <div class="so">
      <div class="so-nhan">SỐ KHÁCH TRONG NGÀY</div>
      <div class="so-tri">${esc(b.daySeq || "?")}${b.guestCount > 1 ? `<span class="so-phu">/${guestNo}</span>` : ""}</div>
    </div>

    <table>
      <tr><td>Ngày bay</td><td class="p">${esc(formatDateKeyVN(b.flightDate))}</td></tr>
      <tr><td>Khách</td><td class="p">${esc(b.contactName || "—")}</td></tr>
      <tr><td>Loại hình</td><td class="p">${esc(KIND_LABEL[b.flightKind] ?? b.flightKind)}</td></tr>
      ${b.guestCount > 1 ? `<tr><td>Đoàn</td><td class="p">${esc(guestNo)}/${esc(b.guestCount)} khách</td></tr>` : ""}
      ${b.bookingCode ? `<tr><td>Mã booking</td><td class="p">${esc(b.bookingCode)}</td></tr>` : ""}
      ${extras.length ? `<tr><td>Dịch vụ</td><td class="p">${esc(extras.join(" · "))}</td></tr>` : ""}
    </table>

    <div class="tien">
      <span>Tổng đơn</span>
      <strong>${esc(formatVND(b.totalAmount))} đ</strong>
    </div>
    ${
      b.remaining > 0
        ? `<div class="con-thu">CÒN THU ${esc(formatVND(b.remaining))} đ</div>`
        : `<div class="da-du">ĐÃ THANH TOÁN ĐỦ</div>`
    }

    <div class="chan">
      Vé có giá trị cho ĐÚNG chuyến ghi trên vé.<br/>
      Xuất lúc ${esc(new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }))}
    </div>
    <div class="ky">
      <div>Khách ký</div>
      <div>Quầy vé</div>
    </div>
  </section>`;
}

export const DEFAULT_COPIES = ["LIÊN 1 — KHÁCH GIỮ", "LIÊN 2 — PHI CÔNG", "LIÊN 3 — LƯU QUẦY"];

/**
 * Dựng trang in cho một booking — tách riêng khỏi việc in để xem thử được mẫu
 * vé mà không cần máy in (dùng ở scripts/baocao/xem-mau-ve.ts).
 *
 * @param copies tên các liên cần in. Mặc định đủ 3 liên như vé giấy.
 */
export function buildTicketsHtml(b: BookingDTO, spot: string, copies: string[] = DEFAULT_COPIES): string {
  const guests = Math.max(1, b.guestCount || 1);
  const pages: string[] = [];
  for (let g = 1; g <= guests; g++) for (const copy of copies) pages.push(ticketHtml(b, spot, g, copy));

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8" />
<title>Vé bay ${esc(b.bookingCode || b.daySeq)}</title>
<style>
  @page { size: ${PAPER_WIDTH_MM}mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #000; }
  /* Mỗi liên một trang giấy — máy in nhiệt cắt theo trang */
  .ve { width: ${PAPER_WIDTH_MM - 6}mm; page-break-after: always; padding-bottom: 4mm; }
  .ve:last-child { page-break-after: auto; }
  .lien { text-align: center; font-size: 10px; font-weight: 700; letter-spacing: .5px;
          border: 1px solid #000; padding: 1px 0; margin-bottom: 4px; }
  .ten { text-align: center; font-size: 20px; font-weight: 900; letter-spacing: 1px; }
  .diem { text-align: center; font-size: 12px; margin-bottom: 5px; }
  /* SỐ KHÁCH to hết cỡ: ở bãi người ta gọi nhau bằng con số này */
  .so { border: 2px solid #000; text-align: center; padding: 2px 0 4px; margin-bottom: 6px; }
  .so-nhan { font-size: 9px; font-weight: 700; }
  .so-tri { font-size: 44px; font-weight: 900; line-height: 1; }
  .so-phu { font-size: 20px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td { padding: 2px 0; vertical-align: top; border-bottom: 1px dotted #999; }
  td.p { text-align: right; font-weight: 700; padding-left: 6px; }
  .tien { display: flex; justify-content: space-between; align-items: baseline;
          margin-top: 6px; font-size: 13px; }
  .con-thu { margin-top: 4px; border: 2px solid #000; text-align: center;
             font-size: 15px; font-weight: 900; padding: 3px 0; }
  .da-du { margin-top: 4px; text-align: center; font-size: 12px; font-weight: 700; }
  .chan { margin-top: 6px; font-size: 9px; line-height: 1.35; text-align: center; }
  .ky { display: flex; justify-content: space-between; margin-top: 10px; font-size: 10px; }
  .ky div { width: 46%; text-align: center; border-top: 1px dotted #000; padding-top: 14px; }
</style></head><body>${pages.join("")}</body></html>`;
}

/** Mở hộp thoại in của trình duyệt cho một booking. */
export function printBookingTickets(b: BookingDTO, spot: string, copies: string[] = DEFAULT_COPIES): void {
  const html = buildTicketsHtml(b, spot, copies);

  /**
   * In qua IFRAME ẨN, không mở tab mới: trình duyệt điện thoại chặn cửa sổ bật
   * lên, mà quầy dùng máy tính bảng là chính. Gỡ iframe sau khi in xong.
   */
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    document.body.removeChild(frame);
    window.alert("Trình duyệt không mở được cửa sổ in. Thử lại bằng Chrome hoặc Safari.");
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  const go = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    // Đợi hộp thoại in đóng hẳn rồi mới dọn, không thì bản in cụt giữa chừng
    window.setTimeout(() => frame.parentNode && document.body.removeChild(frame), 60_000);
  };
  if (doc.readyState === "complete") go();
  else frame.onload = go;
}
