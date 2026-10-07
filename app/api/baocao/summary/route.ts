// app/api/baocao/summary/route.ts
import { NextResponse } from "next/server";

import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { firstZodMessage, summaryQuerySchema } from "@/lib/baobay/validation";
import type { BaobaySummaryDTO, IssuedRangeDTO, RescheduledDTO } from "@/lib/baobay/types";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { boCotKhongBan } from "@/lib/baobay/flight-price";
import type { LedgerRollup } from "@/lib/baobay/rollup";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { voidStats, getSummary, getSummaryIssues } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bảng tổng hợp cho kế toán.
 *
 * Chỉ vai trò kế toán (và token quản trị website) được gọi: phi công không xem
 * được số của người khác, điều phối không xem được tổng doanh thu cả kỳ.
 *
 * ?format=csv&type=days|pilot|dispatcher|cameraman|bypilot -> tải về CSV.
 *
 * ?issues=0 -> bỏ bước soát lỗi từng ngày chưa chốt (bảng về trong vài giây);
 * ?issues=only&dates=a,b,c -> chỉ trả cột "treo / n lỗi" của các ngày ấy. Trang
 * tổng hợp gọi hai nhịp như vậy; CSV và Excel vẫn chạy đủ một lượt.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const params = new URL(req.url).searchParams;
  const today = todayInVN();

  const parsed = summaryQuerySchema.safeParse({
    spot,
    // Mặc định 30 ngày gần nhất — vừa đủ một kỳ lương/kỳ đối chiếu.
    from: params.get("from") || shiftDateKey(today, -29),
    to: params.get("to") || today,
  });
  if (!parsed.success) {
    return NextResponse.json({ message: firstZodMessage(parsed.error) }, { status: 400 });
  }

  if (params.get("issues") === "only") {
    /** Chỉ nhận ngày nằm trong khoảng đang xem — không cho dùng đường này để quét bừa. */
    const dates = (params.get("dates") || "")
      .split(",")
      .map((d) => d.trim())
      .filter((d) => d >= parsed.data.from && d <= parsed.data.to);
    return NextResponse.json(await getSummaryIssues(spot, dates));
  }

  const csv = params.get("format") === "csv";
  const summary = await getSummary(spot, parsed.data.from, parsed.data.to, { issues: csv || params.get("issues") !== "0" });

  if (params.get("format") === "csv") {
    const type = params.get("type") || "days";
    const csv = buildCsv(summary, type);
    const name = `baobay-${spot}-${type}-${summary.from}_${summary.to}.csv`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  /** Kèm bảng đếm booking đã bỏ theo người — lớp soi lạm dụng cho kế toán/chủ. */
  const voided = await voidStats(spot, parsed.data.from, parsed.data.to);
  return NextResponse.json({ ...summary, voidedByPerson: voided });
}

/**
 * Cột THEO SỔ nối vào cuối bảng ngày (chủ 07/10: tổng hợp đủ khách, vé, dịch vụ,
 * huỷ/dời/hoàn). Các cột phía trước giữ nguyên thứ tự cũ để file Excel kế toán
 * đang dùng không lệch cột.
 */
const LEDGER_COLS: Array<[string, (s: LedgerRollup) => number]> = [
  ["Sổ: khách đã bay", (s) => s.guestsFlown],
  ["Sổ: bay PG", (s) => s.flownByKind.pg + s.flownByKind.m650 + s.flownByKind.m850],
  ["Sổ: bay PPG", (s) => s.flownByKind.ppg],
  ["Sổ: khách chờ bay", (s) => s.guestsOpen],
  ["Sổ: vé đã xuất", (s) => s.ticketsIssued],
  ["Sổ: vé đã bay", (s) => s.ticketsFlown],
  ["Sổ: vé thu hồi", (s) => s.ticketsRecalled],
  ["Sổ: vé dời mang đi", (s) => s.ticketsMovedOut],
  ["Sổ: vé mang tới", (s) => s.ticketsCarriedIn],
  ["Sổ: booking huỷ", (s) => s.cancelledBookings],
  ["Sổ: khách huỷ", (s) => s.cancelledGuests + s.partialCancelledGuests],
  ["Sổ: khách dời đi", (s) => s.movedOutGuests],
  ["Sổ: khách dời tới", (s) => s.movedInGuests],
  ["Sổ: flycam", (s) => s.svcFlown.flycam],
  ["Sổ: 360", (s) => s.svcFlown.video360],
  ["Sổ: cờ đỏ", (s) => s.svcFlown.redFlag],
  ["Sổ: kéo cờ", (s) => s.svcFlown.flagFlight],
  ["Sổ: gói đặc biệt", (s) => s.svcFlown.sunset],
  ["Sổ: bay lâu tính tiền", (s) => s.longFlightCharged],
  ["Sổ: combo flycam+360", (s) => s.combos],
  ["Sổ: lệnh thêm dịch vụ", (s) => s.svcAddOrders],
  ["Sổ: thu thêm dịch vụ", (s) => s.svcAddedCharge],
  ["Sổ: lệnh huỷ dịch vụ", (s) => s.svcRemoveOrders + s.opCancelCount],
  ["Sổ: hoàn dịch vụ", (s) => s.refundSvcAmount + s.opCancelPaid],
  ["Sổ: hoàn huỷ bay", (s) => s.refundFullAmount + s.refundPartialAmount],
  ["Sổ: hoàn chờ chi", (s) => s.refundPending + s.opCancelPending],
  ["Sổ: CK về MB công ty", (s) => s.transferCompany],
  ["Sổ: chiết khấu đại lý", (s) => s.commissionCash + s.commissionTransfer + s.commissionAgency],
  ["Sổ: giảm trừ", (s) => s.discount],
];

const STATUS_LABEL = {
  none: "chưa nhập số chốt",
  draft: "chưa chốt",
  closed: "đã chốt",
} as const;

function rangesText(ranges: IssuedRangeDTO[]): string {
  return ranges.map((r) => `${r.from}–${r.to} (${r.count})`).join(" | ");
}

function rescheduledText(list: RescheduledDTO[]): string {
  return list.map((r) => `${r.code} → ${formatDateKeyVN(r.toDate)}`).join(" | ");
}

function expensesText(list: Array<{ content: string; amount: number; note?: string }>): string {
  return list.map((e) => `${e.content}: ${e.amount}${e.note ? ` (${e.note})` : ""}`).join(" | ");
}

/**
 * CSV ngăn cách bằng dấu chấm phẩy.
 *
 * Excel bản tiếng Việt/Windows lấy dấu chấm phẩy làm dấu ngăn cột (vì dấu phẩy
 * đã dùng làm dấu thập phân). Dùng dấu phẩy thì kế toán mở ra thấy cả dòng nằm
 * trong một ô. Google Sheets đọc được cả hai.
 */
function buildCsv(summary: BaobaySummaryDTO, type: string): string {
  const rows: (string | number)[][] = [];

  if (type === "pilot") {
    rows.push([
      "Ngày", "Phi công", "Tài khoản", "Đã chốt", "Số chuyến", "Số mã vé", "Mã vé đã bay",
      "Camera 360", "Mã 360", "Khách ngoại giao",
      "Phí bãi (khách)", "Nước cho khách", "Xe cho khách", "Chi khác", "Chi tiết chi khác", "Tổng chi",
      "Ghi chú",
    ]);
    for (const r of summary.pilotReports) {
      const other = r.expenses.reduce((s, e) => s + e.amount, 0);
      rows.push([
        r.date, r.pilotName, r.username, r.submitted ? "x" : "", r.flightCount, r.ticketCodes.length,
        r.ticketCodes.join(" "),
        r.video360, r.video360Codes.join(" "), r.diplomaticGuests,
        r.siteFeeGuests, r.waterCost, r.guestCarCost, other, expensesText(r.expenses),
        // Phí bãi khai theo SỐ KHÁCH — không phải tiền, không được cộng vào tổng chi
        r.waterCost + r.guestCarCost + other,
        r.note,
      ]);
    }
  } else if (type === "dispatcher") {
    rows.push([
      "Ngày", "Điều phối", "Tài khoản", "Số khách", "Vé xuất", "Vé thu về", "Dải mã vé",
      "Vé huỷ", "Mã vé huỷ", "Vé dời lịch", "Mã vé dời lịch",
      "Flycam", "Camera 360", "Cờ đỏ", "H.hôn / S.mây / B.minh", "Bay lâu", "Bay kéo cờ đỏ/cờ sinh nhật", "Khách ngoại giao",
      "Tiền mặt điều phối khai", "Chuyển khoản điều phối khai", "Tổng điều phối khai",
      "Nước cho khách", "Xe lên núi", "Xe đưa đón", "Chi khác", "Chi tiết chi khác", "Tổng chi",
      "Ghi chú",
    ]);
    for (const r of summary.dispatcherReports) {
      const other = r.expenses.reduce((s, e) => s + e.amount, 0);
      rows.push([
        r.date, r.staffName, r.username, r.guestCount, r.ticketsIssued, r.ticketsReturned,
        rangesText(r.issuedRanges),
        r.cancelledCount, r.cancelledCodes.join(" "), r.rescheduledCount, rescheduledText(r.rescheduled),
        r.flycam, r.video360, r.redFlag, r.sunset, r.longFlight ?? 0, r.flagFlight, r.diplomaticGuests,
        r.cashReceived, r.transferReceived, r.cashReceived + r.transferReceived,
        r.guestWaterCost, r.mountainCarCost, r.shuttleCarCost, other, expensesText(r.expenses),
        r.guestWaterCost + r.mountainCarCost + r.shuttleCarCost + other,
        r.note,
      ]);
    }
  } else if (type === "cameraman") {
    rows.push(["Ngày", "Camera man", "Tài khoản", "Đã chốt", "Số chuyến flycam", "Mã vé", "Chi tiêu", "Chi tiết", "Ghi chú"]);
    for (const r of summary.cameramanReports) {
      rows.push([
        r.date, r.cameramanName, r.username, r.submitted ? "x" : "", r.flycamFlights,
        r.flycamCodes.join(" "),
        r.expenses.reduce((s, e) => s + e.amount, 0), expensesText(r.expenses), r.note,
      ]);
    }
  } else if (type === "bypilot") {
    // Tổng theo từng phi công trong kỳ — bảng dùng để tính tiền cho phi công.
    rows.push(["Phi công", "Tài khoản", "Số ngày bay", "Tổng chuyến", "Camera 360", "Khách ngoại giao", "Tổng chi", "Phạt nộp muộn"]);
    for (const p of summary.byPilot) {
      rows.push([p.pilotName, p.username, p.days, p.flights, p.video360, p.diplomaticGuests, p.expenseTotal, p.latePenalty]);
    }
    rows.push([
      "TỔNG", "", "",
      summary.byPilot.reduce((s, p) => s + p.flights, 0),
      summary.byPilot.reduce((s, p) => s + p.video360, 0),
      summary.byPilot.reduce((s, p) => s + p.diplomaticGuests, 0),
      summary.byPilot.reduce((s, p) => s + p.expenseTotal, 0),
      summary.byPilot.reduce((s, p) => s + p.latePenalty, 0),
    ]);
  } else {
    rows.push([
      "Ngày", "Trạng thái", "Lỗi đỏ",
      "Số khách", "Vé xuất", "Vé thu hồi", "Vé huỷ", "Vé dời lịch",
      "Tiền mặt đã thu", "Chuyển khoản đã thu", "Tổng đã thu", "Còn thu",
      "Flycam", "Camera 360", "Bay kéo cờ đỏ/cờ sinh nhật",
      "Điều phối khai vé", "PC khai chuyến", "Số mã PC khai", "PC khai 360", "Camera man khai flycam",
      "Khách ngoại giao", "Cờ đỏ", "H.hôn / S.mây / B.minh", "Bay lâu", "Tổng chi", "PC đã chốt",
      ...LEDGER_COLS.map((c) => c[0]),
    ]);
    const soTheoNgay = new Map(summary.rollup.days.map((x) => [x.date, x.so]));
    for (const d of summary.days) {
      const so = soTheoNgay.get(d.date);
      rows.push([
        d.date, STATUS_LABEL[d.status], d.issueCount,
        d.guestCount, d.ticketsIssued, d.ticketsReturned, d.cancelledCount, d.rescheduledCount,
        d.cashTotal, d.transferTotal, d.revenueTotal, d.bookingRemaining,
        d.flycam, d.video360, d.flagFlight,
        d.dispatcherIssued, d.pilotFlights, d.pilotCodes, d.pilot360, d.cameramanFlycam,
        d.diplomaticGuests, d.redFlag, d.sunset, d.longFlight ?? 0, d.expenseTotal, `${d.pilotSubmitted}/${d.pilotCount}`,
        ...LEDGER_COLS.map((c) => (so ? c[1](so) : 0)),
      ]);
    }
    const t = summary.totals;
    rows.push([
      "TỔNG (chỉ ngày đã chốt)", "", "",
      t.guestCount, t.ticketsIssued, t.ticketsReturned, t.cancelledCount, t.rescheduledCount,
      t.cashTotal, t.transferTotal, t.revenueTotal, t.bookingRemaining,
      t.flycam, t.video360, t.flagFlight,
      t.dispatcherIssued, t.pilotFlights, t.pilotCodes, t.pilot360, t.cameramanFlycam,
      t.diplomaticGuests, t.redFlag, t.sunset, t.longFlight ?? 0, t.expenseTotal, "",
      ...LEDGER_COLS.map((c) => c[1](summary.rollup.closed.so)),
    ]);
    rows.push([
      "CẢ KỲ theo sổ (mọi ngày, kể cả chưa chốt)",
      ...Array(25).fill(""),
      ...LEDGER_COLS.map((c) => c[1](summary.rollup.all.so)),
    ]);
    if (summary.pendingDays.length) {
      rows.push([]);
      rows.push([`Chưa tính vào tổng (${summary.pendingDays.length} ngày chưa chốt)`, summary.pendingDays.join(" ")]);
    }
  }

  // Bỏ cột "Bay lâu" ở điểm không bán (chỉ Khau Phạ — chủ 02/10); hàng đầu là tiêu đề
  const gon = boCotKhongBan(summary.spot, (rows[0] ?? []).map(String), rows.slice(1));
  const body = (rows.length ? [gon.header, ...gon.rows] : rows).map((row) => row.map(csvCell).join(";")).join("\r\n");

  // ﻿ (BOM) để Excel nhận đúng UTF-8, không thì tiếng Việt thành ký tự lạ.
  return `﻿${body}\r\n`;
}

function csvCell(value: string | number): string {
  if (typeof value === "number") return String(value);
  const text = String(value ?? "");
  // Bọc nháy kép nếu có ký tự ngăn cột, nháy kép hoặc xuống dòng.
  if (/[";\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
