// app/baocao/components/booking-image.ts
"use client";

import { formatDateKeyVN } from "@/lib/baobay/date";
import { spotName } from "@/lib/baobay/spots";

/**
 * Vẽ PHIẾU BOOKING thành ảnh PNG để gửi khách qua Zalo/Messenger.
 *
 * Vẽ tay bằng canvas thay vì kéo thêm thư viện chụp DOM: phiếu chỉ là mấy dòng
 * chữ, mà html2canvas kéo theo ~200KB và hay lệch phông trên máy khác. Vẽ tay
 * còn được chủ động cỡ chữ đủ to để đọc trên điện thoại.
 *
 * Điện thoại: mở khay chia sẻ để gửi thẳng cho khách. Máy tính: tải file về.
 */

export type BookingImageData = {
  spot: string;
  flightDate: string;
  expectedTime: string;
  contactName: string;
  phone: string;
  bookingCode: string;
  source: string;
  guestCount: number;
  flycam: number;
  video360: number;
  redFlag: number;
  sunset: number;
  flagFlight: number;
  pickupLabel: string;
  /** PG hay PPG — in trên phiếu để khách khỏi nhầm loại hình. */
  flightKind: "pg" | "ppg";
  unitPrice: number;
  /** Tiền dịch vụ tuỳ chọn của cả nhóm. */
  serviceMoney: number;
  pickupFee: number;
  discount: number;
  total: number;
  deposit: number;
  remaining: number;
  note: string;
};

const money = (n: number) => `${(n || 0).toLocaleString("vi-VN")} đ`;

function serviceLine(d: BookingImageData): string {
  const parts: string[] = [];
  if (d.flycam) parts.push(`${d.flycam} flycam`);
  if (d.video360) parts.push(`${d.video360} camera 360`);
  if (d.redFlag) parts.push(`${d.redFlag} dù cờ đỏ`);
  if (d.sunset) parts.push(`${d.sunset} bay hoàng hôn/săn mây`);
  if (d.flagFlight) parts.push(`${d.flagFlight} bay kéo cờ/bánh`);
  return parts.join(" · ");
}

export function drawBookingImage(d: BookingImageData): HTMLCanvasElement {
  /** Vẽ ở khổ gấp đôi rồi thu lại — chữ nét trên màn hình retina. */
  const S = 2;
  const W = 720;
  const pad = 28;

  const rows: Array<[string, string]> = [
    ["Ngày bay", formatDateKeyVN(d.flightDate) + (d.expectedTime ? ` · ${d.expectedTime}` : "")],
    ["Điểm bay", `${spotName(d.spot)} · ${d.flightKind === "ppg" ? "PPG (có động cơ)" : "PG (dù lượn)"}`],
    ["Khách", `${d.contactName || "—"}${d.phone ? ` · ${d.phone}` : ""}`],
    ["Số khách", `${d.guestCount} người`],
  ];
  const svc = serviceLine(d);
  if (svc) rows.push(["Dịch vụ kèm", svc]);
  rows.push(["Đưa đón", d.pickupLabel || "Tự đến"]);
  if (d.unitPrice) rows.push(["Đơn giá bay", `${money(d.unitPrice)} × ${d.guestCount} khách`]);
  if (d.serviceMoney) rows.push(["Tiền dịch vụ", money(d.serviceMoney)]);
  if (d.pickupFee) rows.push(["Phí đưa đón", money(d.pickupFee)]);
  if (d.discount) rows.push(["Giảm trừ", `− ${money(d.discount)}`]);
  rows.push(["TỔNG TIỀN", money(d.total)]);
  rows.push(["Đã cọc", money(d.deposit)]);
  rows.push(["Còn phải thu", money(d.remaining)]);
  if (d.bookingCode) rows.push(["Mã booking", d.bookingCode]);
  if (d.source) rows.push(["Nguồn", d.source]);
  if (d.note) rows.push(["Ghi chú", d.note]);

  const headerH = 96;
  const rowH = 42;
  const footerH = 56;
  const H = headerH + rows.length * rowH + footerH + pad;

  const canvas = document.createElement("canvas");
  canvas.width = W * S;
  canvas.height = H * S;
  const g = canvas.getContext("2d");
  if (!g) return canvas;
  g.scale(S, S);

  // Nền
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, W, H);

  // Dải tiêu đề
  g.fillStyle = "#0284c7";
  g.fillRect(0, 0, W, headerH);
  g.fillStyle = "#ffffff";
  g.font = "bold 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  g.fillText("PHIẾU BOOKING BAY DÙ LƯỢN", pad, 42);
  g.font = "16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  g.fillStyle = "rgba(255,255,255,0.9)";
  g.fillText("MEBAYLUON PARAGLIDING · mebayluon.com · 0964 073 555", pad, 72);

  // Từng dòng: nhãn trái, giá trị phải
  let y = headerH + 34;
  for (const [label, value] of rows) {
    const strong = label === "TỔNG TIỀN" || label === "Còn phải thu";

    if (strong) {
      g.fillStyle = label === "TỔNG TIỀN" ? "#f0f9ff" : "#fff7ed";
      g.fillRect(pad - 10, y - 24, W - (pad - 10) * 2, rowH - 6);
    }

    g.font = `${strong ? "bold " : ""}17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    g.fillStyle = strong ? "#0f172a" : "#64748b";
    g.fillText(label, pad, y);

    g.font = `${strong ? "bold 20px" : "17px"} -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    g.fillStyle = strong ? (label === "TỔNG TIỀN" ? "#0369a1" : "#c2410c") : "#0f172a";
    const text = value;
    const tw = g.measureText(text).width;
    // Chữ dài (dịch vụ, ghi chú) thì cắt bớt cho khỏi tràn mép
    if (tw > W - pad * 2 - 150) {
      let cut = text;
      while (cut.length > 8 && g.measureText(cut + "…").width > W - pad * 2 - 150) cut = cut.slice(0, -1);
      g.fillText(cut + "…", W - pad - g.measureText(cut + "…").width, y);
    } else {
      g.fillText(text, W - pad - tw, y);
    }

    if (!strong) {
      g.strokeStyle = "#f1f5f9";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(pad, y + 12);
      g.lineTo(W - pad, y + 12);
      g.stroke();
    }
    y += rowH;
  }

  // Chân phiếu
  g.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  g.fillStyle = "#94a3b8";
  g.fillText("Vui lòng có mặt trước giờ bay 15 phút. Bay theo điều kiện thời tiết thực tế.", pad, y + 14);

  return canvas;
}

/** Xuất phiếu: điện thoại mở khay chia sẻ, máy tính tải file PNG về. */
export async function shareBookingImage(d: BookingImageData): Promise<void> {
  const canvas = drawBookingImage(d);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  if (!blob) throw new Error("Không tạo được ảnh phiếu");

  const name = `booking-${d.flightDate}-${(d.contactName || d.bookingCode || "khach").replace(/\s+/g, "-")}.png`;
  const file = new File([blob], name, { type: "image/png" });

  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
  if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "Phiếu booking" });
      return;
    } catch {
      /* khách bấm huỷ khay chia sẻ: rơi xuống tải file */
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}
