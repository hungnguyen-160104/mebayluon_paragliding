// app/api/baocao/export/route.ts
import { NextResponse } from "next/server";

import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { ROLE_LABEL } from "@/lib/baobay/roles";
import { spotName } from "@/lib/baobay/spots";
import type { BaobaySummaryDTO } from "@/lib/baobay/types";
import { firstZodMessage, summaryQuerySchema } from "@/lib/baobay/validation";
import { buildXlsx, type SheetSpec } from "@/lib/baobay/xlsx";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { getReconcile, getSummary, listHandovers } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Gom dữ liệu cả kỳ + đóng gói Excel có thể ngốn vài giây với kỳ dài. */
export const maxDuration = 30;

/**
 * Xuất báo cáo tài chính / bảng lương cả kỳ ra MỘT file Excel nhiều sheet.
 *
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD   khoảng bất kỳ
 *   ?month=YYYY-MM                   gọn cho cuối tháng
 *
 * Chỉ kế toán và quản trị. File mở bằng Excel/LibreOffice, hoặc tải thẳng lên
 * Google Sheets (Tệp → Nhập → Tải lên).
 *
 * NGUYÊN TẮC SỐ LIỆU: bảng lương và bảng tổng CHỈ cộng ngày kế toán đã chốt —
 * giống hệt màn hình Tổng hợp. Ngày chưa chốt được liệt kê riêng ở sheet "Đọc
 * trước" để không ai lỡ tay tính lương trên số chưa soát.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["accountant", "admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const params = new URL(req.url).searchParams;
  const today = todayInVN();
  const month = params.get("month");

  let from = params.get("from") || shiftDateKey(today, -29);
  let to = params.get("to") || today;

  if (month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    from = `${month}-01`;
    to = `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
  }

  const parsed = summaryQuerySchema.safeParse({ spot, from, to });
  if (!parsed.success) {
    return NextResponse.json({ message: firstZodMessage(parsed.error) }, { status: 400 });
  }

  const summary = await getSummary(spot, parsed.data.from, parsed.data.to);
  const handovers = await listHandovers(spot, parsed.data.from, parsed.data.to);

  /**
   * Từng khoản thu/chi trong kỳ — gom bằng cách chạy lại bộ đối chiếu từng ngày.
   * Chỉ chạy cho ngày CÓ số liệu nên số lần gọi bằng số ngày thật, không phải
   * toàn bộ khoảng ngày.
   */
  const expenseRows: (string | number)[][] = [];
  for (const day of summary.days) {
    const rec = await getReconcile(spot, day.date);
    for (const line of rec.expenseLines) {
      expenseRows.push([
        day.date,
        line.who,
        ROLE_LABEL[line.role],
        line.content.startsWith("[THU") ? "Thu" : "Chi",
        line.content,
        line.amount,
        line.note || "",
      ]);
    }
  }

  const xlsx = buildXlsx(buildSheets(summary, handovers, expenseRows));
  const name = `baobay-${spot}-${month ? `thang-${month}` : `${summary.from}_${summary.to}`}.xlsx`;

  return new Response(new Uint8Array(xlsx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}

const STATUS_LABEL = { none: "chưa nhập số chốt", draft: "chưa chốt", closed: "đã chốt" } as const;

function buildSheets(
  summary: BaobaySummaryDTO,
  handovers: Awaited<ReturnType<typeof listHandovers>>,
  expenseRows: (string | number)[][],
): SheetSpec[] {
  const t = summary.totals;
  const closedDays = summary.days.filter((d) => d.status === "closed").length;

  /* ---------------- Sheet 1: Đọc trước ---------------- */
  const cover: SheetSpec = {
    name: "Đọc trước",
    header: ["Mục", "Giá trị"],
    widths: [42, 60],
    rows: [
      ["Điểm bay", spotName(summary.spot)],
    ["Kỳ báo cáo", `${formatDateKeyVN(summary.from)} – ${formatDateKeyVN(summary.to)}`],
      ["Số ngày có số liệu", summary.days.length],
      ["Số ngày ĐÃ CHỐT (được tính vào tổng)", closedDays],
      ["Số ngày chưa chốt (KHÔNG tính vào tổng)", summary.pendingDays.length],
      [
        "Danh sách ngày chưa chốt",
        summary.pendingDays.length ? summary.pendingDays.map(formatDateKeyVN).join(", ") : "không có",
      ],
      [],
      ["Vé bán ra (đã chốt)", t.ticketsIssued],
      ["Vé thu hồi (huỷ + dời)", t.ticketsReturned],
      ["Chuyến bay phi công báo", t.pilotFlights],
      ["Tiền mặt", t.cashTotal],
      ["Chuyển khoản", t.transferTotal],
      ["TỔNG THU", t.revenueTotal],
      ["Tổng chi nhân viên khai", t.expenseTotal],
      ["Flycam", t.flycam],
      ["Camera 360", t.video360],
      ["Bay kéo cờ", t.flagFlight],
      ["Vé khách ngoại giao", t.diplomaticTickets],
      ["Tiền thu từ khách ngoại giao", t.diplomaticAmount],
      [],
      [
        "Lưu ý",
        "Mọi bảng trong file chỉ cộng ngày ĐÃ CHỐT. Ngày chưa chốt còn sửa được nên không dùng để tính lương.",
      ],
    ],
  };

  /* ---------------- Sheet 2: Bảng lương phi công ---------------- */
  const payroll: SheetSpec = {
    name: "Bảng lương phi công",
    header: [
      "Phi công",
      "Tài khoản",
      "Số ngày bay",
      "Tổng chuyến",
      "Flycam",
      "Camera 360",
      "Dù cờ đỏ",
      "Bay kéo cờ",
      "Khách ngoại giao",
      "Chi đã ứng (hoàn lại)",
      "Phạt nộp muộn (trừ)",
      "Tiền ứng (trừ)",
      "Còn lại sau chi, phạt & ứng",
    ],
    widths: [26, 16, 12, 12, 10, 12, 10, 12, 16, 20, 20, 18, 24],
    rows: [
      ...summary.byPilot.map((p) => [
        p.pilotName,
        p.username,
        p.days,
        p.flights,
        p.flycam,
        p.video360,
        p.redFlag,
        p.flagFlight,
        p.diplomaticGuests,
        p.expenseTotal,
        p.latePenalty,
        p.advanceTotal,
        p.expenseTotal - p.latePenalty - p.advanceTotal,
      ]),
      [],
      [
        "TỔNG",
        "",
        "",
        summary.byPilot.reduce((s, p) => s + p.flights, 0),
        summary.byPilot.reduce((s, p) => s + p.flycam, 0),
        summary.byPilot.reduce((s, p) => s + p.video360, 0),
        summary.byPilot.reduce((s, p) => s + p.redFlag, 0),
        summary.byPilot.reduce((s, p) => s + p.flagFlight, 0),
        summary.byPilot.reduce((s, p) => s + p.diplomaticGuests, 0),
        summary.byPilot.reduce((s, p) => s + p.expenseTotal, 0),
        summary.byPilot.reduce((s, p) => s + p.latePenalty, 0),
        summary.byPilot.reduce((s, p) => s + p.advanceTotal, 0),
        summary.byPilot.reduce((s, p) => s + p.expenseTotal - p.latePenalty - p.advanceTotal, 0),
      ],
      [],
      [
        "Ghi chú",
        "Cột cuối = chi tại bãi được hoàn − phạt nộp muộn − tiền đã ứng. Đơn giá chuyến/dịch vụ do kế toán nhân thêm bên ngoài, app không giữ đơn giá.",
      ],
    ],
  };

  /* ---------------- Sheet 3: Theo ngày ---------------- */
  const days: SheetSpec = {
    name: "Theo ngày",
    header: [
      "Ngày", "Trạng thái", "Lỗi đỏ", "Số khách", "Vé xuất", "Vé thu hồi", "Vé huỷ", "Vé dời lịch",
      "Tiền mặt", "Chuyển khoản", "Tổng thu", "Chi nhân viên",
      "Flycam (KT)", "Camera man báo", "360 (KT)", "Phi công báo 360", "Bay kéo cờ",
      "Vé ngoại giao", "Thu ngoại giao",
      "Điều phối khai vé", "PC khai chuyến", "PC đã chốt",
    ],
    rows: [
      ...summary.days.map((d) => [
        d.date, STATUS_LABEL[d.status], d.issueCount, d.guestCount, d.ticketsIssued, d.ticketsReturned,
        d.cancelledCount, d.rescheduledCount,
        d.cashTotal, d.transferTotal, d.revenueTotal, d.expenseTotal,
        d.flycam, d.cameramanFlycam, d.video360, d.pilot360, d.flagFlight,
        d.diplomaticTickets, d.diplomaticAmount,
        d.dispatcherIssued, d.pilotFlights, `${d.pilotSubmitted}/${d.pilotCount}`,
      ]),
      [],
      [
        "TỔNG (chỉ ngày đã chốt)", "", "", t.guestCount, t.ticketsIssued, t.ticketsReturned,
        t.cancelledCount, t.rescheduledCount,
        t.cashTotal, t.transferTotal, t.revenueTotal, t.expenseTotal,
        t.flycam, t.cameramanFlycam, t.video360, t.pilot360, t.flagFlight,
        t.diplomaticTickets, t.diplomaticAmount,
        t.dispatcherIssued, t.pilotFlights, "",
      ],
    ],
  };

  /* ---------------- Sheet 4: Phi công theo ngày ---------------- */
  const pilotDaily: SheetSpec = {
    name: "Phi công theo ngày",
    header: [
      "Ngày", "Phi công", "Đã chốt", "Chuyến", "Số mã vé", "Flycam", "360", "Cờ đỏ", "Kéo cờ",
      "Ngoại giao", "Phí bãi bay", "Nước", "Xe cho khách",
      "Đón BigC (lượt)", "Đón KS (lượt)", "Xe lên núi (lượt)",
      "Chi khác", "Tổng chi", "Phạt", "Mã vé đã bay", "Ghi chú",
    ],
    widths: [12, 24, 10, 10, 10, 9, 8, 9, 9, 11, 14, 12, 14, 13, 13, 13, 12, 14, 12, 40, 24],
    rows: summary.pilotReports.map((r) => {
      const other = r.expenses.reduce((s, e) => s + (e.kind === "thu" ? 0 : e.amount), 0);
      return [
        r.date, r.pilotName, r.submitted ? "x" : "", r.flightCount, r.ticketCodes.length,
        r.flycam, r.video360, r.redFlag, r.flagFlight, r.diplomaticGuests,
        r.siteFee, r.waterCost, r.guestCarCost,
        r.pickupBigC, r.pickupHotel, r.mountainTrips,
        other,
        r.siteFee + r.waterCost + r.guestCarCost + other,
        r.latePenalty,
        r.ticketCodes.join(" "),
        r.note,
      ];
    }),
  };

  /* ---------------- Sheet 5: Điều phối ---------------- */
  const dispatcher: SheetSpec = {
    name: "Điều phối",
    header: [
      "Ngày", "Nhân sự", "Khách", "Vé xuất", "Vé thu về", "Dải mã vé", "Vé huỷ", "Vé dời lịch",
      "Flycam", "360", "Cờ đỏ", "Kéo cờ", "Ngoại giao", "Thu ngoại giao",
      "Tiền mặt", "Chuyển khoản", "Tổng thu", "Chi cho khách", "Ghi chú",
    ],
    widths: [12, 24, 10, 10, 11, 30, 10, 12, 9, 8, 9, 9, 11, 15, 14, 14, 14, 15, 24],
    rows: summary.dispatcherReports.map((r) => [
      r.date, r.staffName, r.guestCount, r.ticketsIssued, r.ticketsReturned,
      r.issuedRanges.map((x) => `${x.from}–${x.to} (${x.count})`).join(" | "),
      r.cancelledCount, r.rescheduledCount,
      r.flycam, r.video360, r.redFlag, r.flagFlight, r.diplomaticGuests, r.diplomaticAmount,
      r.cashReceived, r.transferReceived, r.cashReceived + r.transferReceived,
      r.guestWaterCost + r.mountainCarCost + r.shuttleCarCost + r.expenses.reduce((s, e) => s + (e.kind === "thu" ? 0 : e.amount), 0),
      r.note,
    ]),
  };

  /* ---------------- Sheet 6: Camera man ---------------- */
  const cameraman: SheetSpec = {
    name: "Camera man",
    header: ["Ngày", "Camera man", "Đã chốt", "Chuyến flycam", "Quay dù lượn", "Mã vé flycam", "Thu tại bãi", "Chi", "Ghi chú"],
    widths: [12, 26, 10, 14, 14, 34, 14, 12, 24],
    rows: summary.cameramanReports.map((r) => [
      r.date, r.cameramanName, r.submitted ? "x" : "", r.flycamFlights, r.paraglidingFlights,
      r.flycamCodes.join(" "),
      r.expenses.reduce((s, e) => s + (e.kind === "thu" ? e.amount : 0), 0),
      r.expenses.reduce((s, e) => s + (e.kind === "thu" ? 0 : e.amount), 0),
      r.note,
    ]),
  };

  /* ---------------- Sheet 7: Thu chi chi tiết ---------------- */
  const expenses: SheetSpec = {
    name: "Thu chi chi tiết",
    header: ["Ngày", "Người khai", "Vai trò", "Loại", "Nội dung", "Số tiền", "Ghi chú"],
    widths: [12, 26, 18, 8, 40, 14, 30],
    rows: expenseRows,
  };

  /* ---------------- Sheet 8: Giao tiền quản lý ---------------- */
  const ROLE_TEXT: Record<string, string> = {
    pilot: "Phi công",
    dispatcher: "Điều phối",
    cameraman: "Camera man",
    accountant: "Kế toán",
    admin: "Quản trị",
  };
  const givens = handovers.filter((h) => h.kind !== "advance");
  const advances = handovers.filter((h) => h.kind === "advance");

  const handoverSheet: SheetSpec = {
    name: "Giao tiền quản lý",
    header: ["Ngày", "Người đưa", "Vai trò", "Người nhận", "Số tiền", "Hình thức", "Nội dung", "Trạng thái", "Thời điểm xác nhận", "Người xác nhận"],
    widths: [12, 26, 14, 26, 16, 14, 34, 16, 22, 18],
    rows: [
      ...givens.map((h) => [
        h.date,
        h.staffName,
        ROLE_TEXT[h.role] ?? h.role,
        h.recipientName,
        h.amount,
        h.method === "cash" ? "Tiền mặt" : "Chuyển khoản",
        h.content || "",
        h.rejected ? `TỪ CHỐI: ${h.rejectedReason || ""}` : h.confirmed ? "Đã nhận" : "Chờ xác nhận",
        h.confirmedAt ? new Date(h.confirmedAt).toLocaleString("vi-VN") : "",
        h.confirmedBy || "",
      ]),
      [],
      [
        "TỔNG ĐÃ NHẬN", "", "", "",
        givens.filter((h) => h.confirmed).reduce((s, h) => s + h.amount, 0),
        "", "",
        `${givens.filter((h) => h.confirmed).length}/${givens.length} khoản`, "", "",
      ],
      [
        "CÒN CHỜ XÁC NHẬN", "", "", "",
        givens.filter((h) => !h.confirmed && !h.rejected).reduce((s, h) => s + h.amount, 0),
        "", "", "", "", "",
      ],
    ],
  };

  /* ---------------- Sheet 9: Ứng tiền ---------------- */
  const advanceSheet: SheetSpec = {
    name: "Ứng tiền",
    header: ["Ngày", "Người ứng", "Vai trò", "Người duyệt", "Số tiền", "Nội dung ứng", "Trạng thái", "Duyệt lúc", "Người duyệt thật"],
    widths: [12, 26, 14, 26, 16, 40, 16, 22, 18],
    rows: [
      ...advances.map((h) => [
        h.date,
        h.staffName,
        ROLE_TEXT[h.role] ?? h.role,
        h.recipientName,
        h.amount,
        h.content || "",
        h.rejected ? `TỪ CHỐI: ${h.rejectedReason || ""}` : h.confirmed ? "Đã duyệt" : "Chờ duyệt",
        h.confirmedAt ? new Date(h.confirmedAt).toLocaleString("vi-VN") : "",
        h.confirmedBy || "",
      ]),
      [],
      [
        "TỔNG ĐÃ DUYỆT (trừ lương)", "", "", "",
        advances.filter((h) => h.confirmed).reduce((s, h) => s + h.amount, 0),
        "", "", "", "",
      ],
    ],
  };

  return [cover, payroll, days, pilotDaily, dispatcher, cameraman, expenses, handoverSheet, advanceSheet];
}
