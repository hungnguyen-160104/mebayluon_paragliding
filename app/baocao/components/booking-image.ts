// app/baocao/components/booking-image.ts
"use client";

import { formatDateKeyVN } from "@/lib/baobay/date";
import { spotName } from "@/lib/baobay/spots";
import { buildTransferNote } from "@/lib/baobay/transfer-note";
import { CLUBHOUSE_MAP_URL, KHAU_PHA_TAKEOFF_MAP_URL } from "@/lib/spot-partner-links";
import { shouldShowQueueNo } from "@/lib/booking/queue-display";
import { buildVietQrPayload } from "@/lib/vietqr";

import { PAY_ACCOUNT } from "./PaymentQr";

/**
 * Vẽ PHIẾU BOOKING thành ảnh PNG để gửi khách qua Zalo/Messenger.
 *
 * Vẽ tay bằng canvas thay vì kéo thêm thư viện chụp DOM: html2canvas kéo theo
 * ~200KB và hay lệch phông trên máy khác, còn vẽ tay thì chủ động được cỡ chữ
 * đủ to để đọc trên điện thoại.
 *
 * Bố cục chia KHỐI thay vì một mạch nhãn–giá trị như bản đầu: khách chỉ cần
 * liếc là thấy ba thứ (bay ngày nào, hết bao nhiêu, còn phải trả bao nhiêu),
 * còn nhân viên cần soát đủ dịch vụ và các khoản cộng trừ.
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
  /** Nhãn loại hình in trên phiếu: PG · PPG · 650m · 850m. */
  flightKindLabel: string;
  unitPrice: number;
  /** Tiền dịch vụ tuỳ chọn của cả nhóm. */
  serviceMoney: number;
  pickupFee: number;
  /** Xe lên núi: số suất + tiền (Hà Nội). */
  mountainCar: number;
  mountainCarMoney: number;
  discount: number;
  total: number;
  deposit: number;
  remaining: number;
  note: string;
  /**
   * SỐ THỨ TỰ BAY TRONG NGÀY (daySeq của sổ điều hành). Chỉ in ra khi điểm bay
   * và ngày bay nằm trong khung được phép khoe số (xem lib/booking/queue-display):
   * ngày vắng mà in số to thì gieo cảm giác phải xếp hàng.
   */
  queueNo?: number | null;
  /** Số khách PPG trong đoàn PG lẫn — quyết định phiếu in chỉ đường nào (Khau Phạ). */
  ppgGuests?: number;
};

const money = (n: number) => `${(n || 0).toLocaleString("vi-VN")} đ`;

/**
 * HƯỚNG DẪN NHANH in cuối phiếu (luật chủ 05/09) — y như vé trên website
 * (components/booking/BookingTicket.tsx, bản tiếng Việt): mặc gì, mang gì,
 * đừng mang gì. Khách đặt qua quầy/Zalo không đi qua web nên chưa từng thấy.
 */
const QUICK_GUIDE: Array<{ title: string; items: string[] }> = [
  {
    title: "TRANG PHỤC",
    items: ["Quần áo dài tay, gọn gàng", "Giày thể thao hoặc giày leo núi", "Không mặc váy, không đi cao gót / dép lê"],
  },
  {
    title: "NÊN MANG THEO",
    items: [
      "Giấy tờ tuỳ thân (CCCD / Hộ chiếu)",
      "Kính râm, áo khoác mỏng",
      "Túi nhỏ 1–2 kg cho đồ cá nhân",
      "Điện thoại còn trống ~4GB để chép ảnh & video",
    ],
  },
  { title: "KHÔNG NÊN MANG THEO", items: ["Vật sắc nhọn", "Đồ cồng kềnh", "Tư trang giá trị cao", "Đồ nặng"] },
];

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const f = (size: number, weight: "" | "bold" = "") => `${weight ? weight + " " : ""}${size}px ${FONT}`;

const C = {
  ink: "#0F172A",
  sub: "#64748B",
  line: "#E2E8F0",
  sky: "#0284C7",
  skyLight: "#0EA5E9",
  skySoft: "#F0F9FF",
  orange: "#C2410C",
  orangeSoft: "#FFF7ED",
  green: "#15803D",
  card: "#F8FAFC",
};

function serviceLine(d: BookingImageData): string {
  const parts: string[] = [];
  if (d.flycam) parts.push(`${d.flycam} × flycam`);
  if (d.video360) parts.push(`${d.video360} × camera 360`);
  if (d.redFlag) parts.push(`${d.redFlag} × dù cờ đỏ`);
  if (d.sunset) parts.push(`${d.sunset} × bay hoàng hôn/săn mây`);
  if (d.flagFlight) parts.push(`${d.flagFlight} × bay kéo cờ/bánh`);
  return parts.join(" · ");
}

/** Cắt chuỗi dài thành nhiều dòng vừa bề ngang cho trước. */
function wrap(g: CanvasRenderingContext2D, text: string, maxW: number, maxLines = 3): string[] {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (g.measureText(test).width <= maxW) {
      cur = test;
      continue;
    }
    if (cur) lines.push(cur);
    cur = w;
    if (lines.length === maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.length) {
    // Còn thừa chữ thì chấm lửng ở dòng cuối
    let last = lines[maxLines - 1];
    const joined = lines.join(" ");
    if (joined.length < String(text).length) {
      while (last.length > 4 && g.measureText(last + "…").width > maxW) last = last.slice(0, -1);
      lines[maxLines - 1] = last + "…";
    }
  }
  return lines.length ? lines : ["—"];
}

/** Hình chữ nhật bo góc — dùng cho các khối và ô số thứ tự. */
function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/**
 * Nạp logo. Hỏng thì trả null và phiếu vẫn vẽ được (chỉ thiếu logo) — không để
 * một cái ảnh làm chết cả nút xuất phiếu.
 */
/**
 * MÃ QR CHUYỂN KHOẢN dựng NGAY TRONG MÁY theo chuẩn EMVCo (lib/vietqr.ts), không
 * gọi ảnh của img.vietqr.io: mã QR nằm giữa việc thu tiền, phụ thuộc dịch vụ
 * ngoài nghĩa là hôm nào họ sập là cả ba điểm bay không thu được chuyển khoản.
 *
 * Ảnh dạng data URL nên vẽ vào canvas KHÔNG làm "nhiễm bẩn" canvas — vẫn xuất
 * được PNG. Ảnh tải từ miền khác thì trình duyệt chặn luôn canvas.toBlob().
 */
async function loadPayQr(amount: number, note: string): Promise<HTMLImageElement | null> {
  try {
    const QRCode = (await import("qrcode")).default;
    const payload = buildVietQrPayload({
      bankBin: PAY_ACCOUNT.bankBin,
      accountNumber: PAY_ACCOUNT.accountNumber,
      amount,
      note,
    });
    const url = await QRCode.toDataURL(payload, {
      width: 560,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0F172A", light: "#FFFFFF" },
    });
    return await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } catch {
    // Dựng mã hỏng thì phiếu vẫn ra, chỉ thiếu khối QR — không chặn cả nút xuất phiếu
    return null;
  }
}

/** QR toạ độ Google Maps — cùng thư viện với QR trả tiền, hỏng thì bỏ khối. */
async function loadMapQr(url: string): Promise<HTMLImageElement | null> {
  try {
    const QRCode = (await import("qrcode")).default;
    const data = await QRCode.toDataURL(url, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0F172A", light: "#FFFFFF" },
    });
    return await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = data;
    });
  } catch {
    return null;
  }
}

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/logo-mbl.png";
    // Ảnh nằm cùng miền, 2 giây là quá đủ; quá thì bỏ logo cho nhanh
    setTimeout(() => resolve(img.complete && img.naturalWidth ? img : null), 2_000);
  });
}

type Row = { label: string; value: string; tone?: "normal" | "muted" | "minus" | "strong" | "due" };
type Block = { title: string; rows: Row[]; wrapLast?: boolean };

function buildBlocks(d: BookingImageData): Block[] {
  const blocks: Block[] = [];

  blocks.push({
    title: "CHUYẾN BAY",
    rows: [
      { label: "Ngày bay", value: formatDateKeyVN(d.flightDate) + (d.expectedTime ? ` · ${d.expectedTime}` : "") },
      { label: "Điểm bay", value: `${spotName(d.spot)}${d.flightKindLabel ? ` · ${d.flightKindLabel}` : ""}` },
      { label: "Số khách", value: `${d.guestCount} người` },
    ],
  });

  const khach: Row[] = [
    { label: "Khách", value: d.contactName || "—" },
    { label: "Điện thoại", value: d.phone || "—" },
  ];
  if (d.bookingCode) khach.push({ label: "Mã booking", value: d.bookingCode });
  if (d.source) khach.push({ label: "Nguồn đặt", value: d.source, tone: "muted" });
  blocks.push({ title: "KHÁCH ĐẶT", rows: khach });

  const svc = serviceLine(d);
  const dv: Row[] = [];
  if (svc) dv.push({ label: "Dịch vụ kèm", value: svc });
  dv.push({ label: "Đưa đón", value: d.pickupLabel || "Tự đến" });
  if (d.mountainCar) dv.push({ label: "Xe lên núi", value: `${d.mountainCar} suất` });
  if (dv.length) blocks.push({ title: "DỊCH VỤ", rows: dv });

  const tien: Row[] = [];
  if (d.unitPrice) tien.push({ label: `Giá bay (${money(d.unitPrice)} × ${d.guestCount})`, value: money(d.unitPrice * d.guestCount) });
  if (d.serviceMoney) tien.push({ label: "Tiền dịch vụ kèm", value: money(d.serviceMoney) });
  if (d.mountainCarMoney) tien.push({ label: `Xe lên núi × ${d.mountainCar}`, value: money(d.mountainCarMoney) });
  if (d.pickupFee) tien.push({ label: "Phí đưa đón", value: money(d.pickupFee) });
  if (d.discount) tien.push({ label: "Giảm trừ", value: `− ${money(d.discount)}`, tone: "minus" });
  tien.push({ label: "TỔNG TIỀN", value: money(d.total), tone: "strong" });
  if (d.deposit) tien.push({ label: "Đã đặt cọc", value: `− ${money(d.deposit)}`, tone: "minus" });
  tien.push({ label: "CÒN PHẢI THU", value: money(d.remaining), tone: "due" });
  blocks.push({ title: "THANH TOÁN", rows: tien });

  if (d.note.trim()) {
    blocks.push({ title: "GHI CHÚ", rows: [{ label: "", value: d.note.trim() }], wrapLast: true });
  }

  return blocks;
}

export async function drawBookingImage(d: BookingImageData): Promise<HTMLCanvasElement> {
  /**
   * NỘI DUNG CHUYỂN KHOẢN theo đúng chuẩn sổ điều hành ("2508 k18 KP2508-5678")
   * — kế toán dò sao kê bằng đúng dòng này, nên phiếu phải in ra để khách thấy
   * và biết mà đừng sửa.
   */
  const payAmount = Math.max(0, Math.round(d.remaining || 0));
  const payNote = buildTransferNote({
    spot: d.spot,
    flightDate: d.flightDate,
    daySeq: d.queueNo ?? undefined,
    bookingCode: d.bookingCode,
    phone: d.phone,
  });

  /**
   * CHỈ ĐƯỜNG KHAU PHẠ theo loại bay (luật chủ 04/09) — in kèm QR toạ độ:
   * PPG về thẳng Clubhouse; PG nhận bãi cất cánh (check-in Quầy Vé đỉnh đèo
   * nếu từ hướng Ngã Ba Kim) + bãi hạ cánh (Tú Lệ/Cao Phạ qua đây rồi xe
   * trung chuyển); đoàn lẫn in cả ba.
   */
  const dirPoints = (() => {
    if (!/khau/.test(d.spot)) return [] as Array<{ title: string; note: string; url: string }>;
    const labelPpg = /ppg/i.test(d.flightKindLabel || "");
    const hasPpg = labelPpg || (d.ppgGuests ?? 0) > 0;
    const pts: Array<{ title: string; note: string; url: string }> = [];
    if (hasPpg)
      pts.push({
        title: "ĐIỂM BAY DÙ MÁY (PPG) — Mebayluon Clubhouse",
        note: "Bay dù máy: quét QR, đến thẳng điểm này để làm thủ tục và bay.",
        url: CLUBHOUSE_MAP_URL,
      });
    if (!labelPpg) {
      pts.push({
        title: "BÃI CẤT CÁNH — đỉnh đèo Khau Phạ",
        note: "Từ hướng Ngã Ba Kim / Mù Cang Chải / Garrya: ghé QUẦY VÉ tại đỉnh đèo để check-in lấy vé bay.",
        url: KHAU_PHA_TAKEOFF_MAP_URL,
      });
      pts.push({
        title: "BÃI HẠ CÁNH — Mebayluon Clubhouse",
        note: "Ở Tú Lệ / Cao Phạ (cũ): qua bãi hạ cánh làm thủ tục trước, rồi đi xe trung chuyển lên bãi cất cánh.",
        url: CLUBHOUSE_MAP_URL,
      });
    }
    return pts;
  })();

  const [logo, payQr, ...dirQrs] = await Promise.all([
    loadLogo(),
    payAmount > 0 ? loadPayQr(payAmount, payNote) : Promise.resolve(null),
    ...dirPoints.map((p) => loadMapQr(p.url)),
  ]);

  /** Vẽ ở khổ gấp đôi rồi thu lại — chữ nét trên màn hình retina. */
  const S = 2;
  const W = 760;
  const pad = 30;
  const headerH = 148;
  const titleH = 30;
  const rowH = 34;
  const blockGap = 14;
  const footerH = 62;

  const blocks = buildBlocks(d);

  // Đo trước để biết chiều cao: khối ghi chú xuống dòng nên phải vẽ thử
  const probe = document.createElement("canvas").getContext("2d")!;
  probe.font = f(17);
  const noteLines = blocks.find((b) => b.wrapLast) ? wrap(probe, blocks[blocks.length - 1].rows[0].value, W - pad * 2 - 28, 3) : [];

  /** Khối QR: ô vuông mã + ba dòng dặn dò bên dưới. */
  const qrSide = 216;
  const payCardH = qrSide + 28;
  const payH = payQr ? titleH + payCardH + 8 + 3 * 23 + blockGap : 0;

  let bodyH = 0;
  for (const b of blocks) {
    bodyH += titleH + (b.wrapLast ? noteLines.length * 26 + 10 : b.rows.length * rowH) + blockGap;
  }

  /** Khối chỉ đường: mỗi điểm một thẻ QR (trái) + tên & lời dặn (phải). */
  probe.font = f(15);
  const dirNoteLines = dirPoints.map((p) => wrap(probe, p.note, W - pad * 2 - 168, 3));
  const dirCardHs = dirNoteLines.map((ls) => Math.max(140, 34 + ls.length * 22 + 16));
  const dirH = dirPoints.length ? titleH + dirCardHs.reduce((a, b2) => a + b2 + 12, 0) + blockGap : 0;

  /** Khối hướng dẫn nhanh: ba cột (mặc · mang · đừng mang), mỗi mục một gạch đầu dòng. */
  const guideColGap = 14;
  const guideColW = (W - pad * 2 - 20 - guideColGap * 2) / 3;
  probe.font = f(13);
  const guideCols = QUICK_GUIDE.map((c) => c.items.flatMap((it) => wrap(probe, it, guideColW - 14, 2)));
  const guideLineH = 18;
  const guideMaxLines = Math.max(...guideCols.map((ls) => ls.length));
  const guideCardH = 12 + 20 + guideMaxLines * guideLineH + 12;
  const guideH = titleH + guideCardH + blockGap;

  const H = headerH + bodyH + payH + dirH + guideH + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W * S;
  canvas.height = H * S;
  const g = canvas.getContext("2d");
  if (!g) return canvas;
  g.scale(S, S);
  g.textBaseline = "alphabetic";

  // ---- Nền
  g.fillStyle = "#FFFFFF";
  g.fillRect(0, 0, W, H);

  // ---- Dải tiêu đề
  const grad = g.createLinearGradient(0, 0, W, headerH);
  grad.addColorStop(0, C.sky);
  grad.addColorStop(1, C.skyLight);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, headerH);

  // Logo trong khuyên tròn trắng
  const logoD = 86;
  const logoX = pad;
  const logoY = 30;
  g.save();
  g.beginPath();
  g.arc(logoX + logoD / 2, logoY + logoD / 2, logoD / 2, 0, Math.PI * 2);
  g.fillStyle = "#FFFFFF";
  g.fill();
  g.clip();
  if (logo) g.drawImage(logo, logoX + 5, logoY + 5, logoD - 10, logoD - 10);
  g.restore();

  const tx = logoX + logoD + 18;
  g.fillStyle = "#FFFFFF";
  g.font = f(27, "bold");
  g.fillText("MEBAYLUON PARAGLIDING", tx, logoY + 26);
  g.font = f(17, "bold");
  g.fillStyle = "rgba(255,255,255,0.95)";
  g.fillText("PHIẾU BOOKING BAY DÙ LƯỢN", tx, logoY + 52);
  g.font = f(14);
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.fillText("mebayluon.com · 0964 073 555", tx, logoY + 76);

  /**
   * Ô SỐ THỨ TỰ — to như số thứ tự lấy ở ngân hàng, vì đó là thứ khách hỏi
   * đầu tiên khi đến điểm bay đông. Ẩn ngoài khung cho phép (xem queue-display).
   */
  const showQueue = Boolean(d.queueNo) && shouldShowQueueNo(d.spot, d.flightDate);
  if (showQueue) {
    const bw = 158;
    const bh = 108;
    const bx = W - pad - bw;
    const by = 20;
    g.fillStyle = "#FFFFFF";
    roundRect(g, bx, by, bw, bh, 16);
    g.fill();
    g.textAlign = "center";
    g.font = f(13, "bold");
    g.fillStyle = C.sky;
    g.fillText("SỐ THỨ TỰ BAY", bx + bw / 2, by + 26);
    g.font = f(56, "bold");
    g.fillStyle = C.sky;
    g.fillText(String(d.queueNo), bx + bw / 2, by + 80);
    g.font = f(12);
    g.fillStyle = C.sub;
    g.fillText("trong ngày", bx + bw / 2, by + 98);
    g.textAlign = "left";
  }

  // ---- Các khối
  let y = headerH + 22;
  for (const b of blocks) {
    // Tiêu đề khối + gạch mảnh chạy hết bề ngang
    g.font = f(13, "bold");
    g.fillStyle = C.sky;
    g.fillText(b.title, pad, y);
    const tw = g.measureText(b.title).width;
    g.strokeStyle = C.line;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(pad + tw + 10, y - 4);
    g.lineTo(W - pad, y - 4);
    g.stroke();
    y += titleH - 8;

    if (b.wrapLast) {
      // Ghi chú: nền vàng nhạt, chữ xuống dòng
      const h = noteLines.length * 26 + 16;
      g.fillStyle = "#FFFBEB";
      roundRect(g, pad, y - 8, W - pad * 2, h, 10);
      g.fill();
      g.font = f(17);
      g.fillStyle = "#92400E";
      let ny = y + 12;
      for (const ln of noteLines) {
        g.fillText(ln, pad + 14, ny);
        ny += 26;
      }
      y += h + blockGap;
      continue;
    }

    for (const r of b.rows) {
      const isStrong = r.tone === "strong";
      const isDue = r.tone === "due";

      if (isStrong || isDue) {
        g.fillStyle = isStrong ? C.skySoft : C.orangeSoft;
        roundRect(g, pad - 8, y - 20, W - (pad - 8) * 2, rowH - 4, 8);
        g.fill();
      }

      g.font = f(isStrong || isDue ? 17 : 16, isStrong || isDue ? "bold" : "");
      g.fillStyle = isStrong ? C.ink : isDue ? C.orange : C.sub;
      g.fillText(r.label, pad, y);

      const valueFont = isStrong || isDue ? f(22, "bold") : f(17, r.tone === "muted" ? "" : "bold");
      g.font = valueFont;
      g.fillStyle = isStrong ? C.sky : isDue ? C.orange : r.tone === "minus" ? C.green : r.tone === "muted" ? C.sub : C.ink;

      const labelW = g.measureText(r.label).width;
      const maxValW = W - pad * 2 - Math.min(labelW, 220) - 24;
      let text = r.value;
      if (g.measureText(text).width > maxValW) {
        while (text.length > 6 && g.measureText(text + "…").width > maxValW) text = text.slice(0, -1);
        text += "…";
      }
      g.fillText(text, W - pad - g.measureText(text).width, y);

      if (!isStrong && !isDue) {
        g.strokeStyle = "#F1F5F9";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(pad, y + 11);
        g.lineTo(W - pad, y + 11);
        g.stroke();
      }
      y += rowH;
    }
    y += blockGap;
  }

  /* ---- Khối QUÉT QR TRẢ TIỀN — chỉ khi còn phải thu ------------------ */
  if (payQr) {
    g.font = f(13, "bold");
    g.fillStyle = C.sky;
    g.fillText("QUÉT QR ĐỂ THANH TOÁN", pad, y);
    const tw = g.measureText("QUÉT QR ĐỂ THANH TOÁN").width;
    g.strokeStyle = C.line;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(pad + tw + 10, y - 4);
    g.lineTo(W - pad, y - 4);
    g.stroke();
    y += titleH - 8;

    // Nền khối
    g.fillStyle = C.skySoft;
    roundRect(g, pad, y - 8, W - pad * 2, payCardH, 12);
    g.fill();
    g.strokeStyle = "#BAE6FD";
    g.lineWidth = 1.5;
    roundRect(g, pad, y - 8, W - pad * 2, payCardH, 12);
    g.stroke();

    // Mã QR trên nền trắng cho máy quét bắt nét
    const qx = pad + 14;
    const qy = y + 6;
    g.fillStyle = "#FFFFFF";
    roundRect(g, qx - 6, qy - 6, qrSide + 12, qrSide + 12, 8);
    g.fill();
    g.drawImage(payQr, qx, qy, qrSide, qrSide);

    // Cột phải: tài khoản · số tiền · nội dung
    const cx = qx + qrSide + 22;
    let cy = qy + 24;
    g.font = f(13);
    g.fillStyle = C.sub;
    g.fillText("Tài khoản nhận", cx, cy);
    cy += 24;
    g.font = f(20, "bold");
    g.fillStyle = C.ink;
    g.fillText(`${PAY_ACCOUNT.bankName} · ${PAY_ACCOUNT.accountNumber}`, cx, cy);
    cy += 22;
    g.font = f(15);
    g.fillStyle = C.sub;
    g.fillText(PAY_ACCOUNT.accountName, cx, cy);

    cy += 34;
    g.font = f(13);
    g.fillStyle = C.sub;
    g.fillText("Số tiền", cx, cy);
    cy += 30;
    g.font = f(28, "bold");
    g.fillStyle = C.orange;
    g.fillText(money(payAmount), cx, cy);

    cy += 26;
    /**
     * NỘI DUNG CHUYỂN KHOẢN in trong ô kẻ riêng, chữ to: khách nào dùng ngân
     * hàng không tự điền nội dung thì còn chỗ đọc mà gõ tay cho đúng.
     */
    const boxW = W - pad - 14 - cx;
    g.fillStyle = "#FFFFFF";
    roundRect(g, cx, cy - 4, boxW, 50, 8);
    g.fill();
    g.strokeStyle = "#FDBA74";
    g.setLineDash([5, 4]);
    g.lineWidth = 1.5;
    roundRect(g, cx, cy - 4, boxW, 50, 8);
    g.stroke();
    g.setLineDash([]);
    g.font = f(12);
    g.fillStyle = C.sub;
    g.fillText("Nội dung chuyển khoản", cx + 10, cy + 14);
    g.font = f(18, "bold");
    g.fillStyle = C.orange;
    g.fillText(payNote, cx + 10, cy + 38);

    y += payCardH + 4;

    // Ba dòng dặn dò
    g.font = f(15, "bold");
    g.fillStyle = C.ink;
    g.fillText("Vui lòng quét QR để thanh toán.", pad, y + 14);
    g.font = f(14);
    g.fillStyle = C.orange;
    g.fillText("Lưu ý: KHÔNG đổi nội dung chuyển khoản — để đối soát dễ hơn.", pad, y + 37);
    g.fillStyle = C.sub;
    g.fillText("Xin lưu ảnh thanh toán để đối chiếu tại quầy.", pad, y + 60);
    y += 3 * 23 + blockGap;
  }

  /* ---- Khối ĐƯỜNG ĐẾN ĐIỂM BAY (Khau Phạ, theo loại bay) -------------- */
  if (dirPoints.length) {
    g.font = f(13, "bold");
    g.fillStyle = C.sky;
    g.fillText("ĐƯỜNG ĐẾN ĐIỂM BAY — QUÉT QR MỞ BẢN ĐỒ", pad, y);
    const tw2 = g.measureText("ĐƯỜNG ĐẾN ĐIỂM BAY — QUÉT QR MỞ BẢN ĐỒ").width;
    g.strokeStyle = C.line;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(pad + tw2 + 10, y - 4);
    g.lineTo(W - pad, y - 4);
    g.stroke();
    y += titleH - 8;

    for (let i = 0; i < dirPoints.length; i++) {
      const p = dirPoints[i];
      const cardH = dirCardHs[i];
      g.fillStyle = C.card;
      roundRect(g, pad, y - 8, W - pad * 2, cardH, 10);
      g.fill();
      const qrSide2 = cardH - 24;
      const qrImg = dirQrs[i];
      if (qrImg) {
        g.fillStyle = "#FFFFFF";
        roundRect(g, pad + 12, y + 4, qrSide2, qrSide2, 8);
        g.fill();
        g.drawImage(qrImg, pad + 16, y + 8, qrSide2 - 8, qrSide2 - 8);
      }
      const tx = pad + 12 + qrSide2 + 16;
      g.font = f(15, "bold");
      g.fillStyle = C.ink;
      g.fillText(p.title, tx, y + 18);
      g.font = f(15);
      g.fillStyle = C.sub;
      let ny2 = y + 44;
      for (const ln of dirNoteLines[i]) {
        g.fillText(ln, tx, ny2);
        ny2 += 22;
      }
      y += cardH + 12;
    }
    y += blockGap;
  }

  /* ---- Khối HƯỚNG DẪN NHANH: mặc gì · mang gì · đừng mang gì ------------ */
  {
    const title = "HƯỚNG DẪN NHANH KHI ĐI BAY";
    g.font = f(13, "bold");
    g.fillStyle = C.sky;
    g.fillText(title, pad, y);
    const tw3 = g.measureText(title).width;
    g.strokeStyle = C.line;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(pad + tw3 + 10, y - 4);
    g.lineTo(W - pad, y - 4);
    g.stroke();
    y += titleH - 8;

    g.fillStyle = C.card;
    roundRect(g, pad, y - 8, W - pad * 2, guideCardH, 10);
    g.fill();

    for (let i = 0; i < QUICK_GUIDE.length; i++) {
      const cx = pad + 10 + i * (guideColW + guideColGap);
      g.font = f(12, "bold");
      g.fillStyle = i === 2 ? C.orange : C.sky;
      g.fillText(QUICK_GUIDE[i].title, cx, y + 12);
      g.font = f(13);
      g.fillStyle = C.ink;
      let ly = y + 12 + 20;
      // Gạch đầu dòng cho dòng đầu của mỗi mục; dòng nối thụt vào
      const items = QUICK_GUIDE[i].items;
      for (const it of items) {
        const ls = wrap(g, it, guideColW - 14, 2);
        ls.forEach((ln, k) => {
          g.fillText(k === 0 ? `• ${ln}` : `  ${ln}`, cx, ly);
          ly += guideLineH;
        });
      }
    }
    y += guideCardH + blockGap;
  }

  // ---- Chân phiếu
  g.fillStyle = C.card;
  g.fillRect(0, H - footerH, W, footerH);
  g.font = f(14);
  g.fillStyle = C.sub;
  g.fillText("Vui lòng có mặt trước giờ bay 15 phút · Bay theo điều kiện thời tiết thực tế.", pad, H - footerH + 26);
  g.fillText("Mang theo CCCD/Passport để làm bảo hiểm chuyến bay.", pad, H - footerH + 47);

  return canvas;
}

/** Xuất phiếu: điện thoại mở khay chia sẻ, máy tính tải file PNG về. */
export async function shareBookingImage(d: BookingImageData): Promise<void> {
  const canvas = await drawBookingImage(d);
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
