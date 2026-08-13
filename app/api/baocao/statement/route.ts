// app/api/baocao/statement/route.ts
import { NextResponse } from "next/server";

import { formatDateKeyVN, isDateKey, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { spotName } from "@/lib/baobay/spots";
import { PILOT_VIEW_LIMIT_DAYS } from "@/lib/baobay/validation";
import { buildXlsx, type SheetSpec } from "@/lib/baobay/xlsx";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError, getStaffStatement } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bảng kê Excel của MỘT nhân sự theo chu kỳ tự chọn — 1 tuần, 1 tháng, hay từ
 * ngày X đến ngày Y đều được. Bộ cột dựng theo VAI TRÒ của người đó (phi công /
 * điều phối / camera man), kèm sheet ứng tiền & giao tiền.
 *
 * GET ?from=&to=&spot=&username=
 *
 * - Nhân sự thường: chỉ xuất được bảng của CHÍNH MÌNH, và chỉ trong 45 ngày
 *   gần nhất (khoảng ngày tự co lại, có ghi chú ngay trong file).
 * - Kế toán / quản trị: người nào cũng được, khoảng ngày nào cũng được.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const params = new URL(req.url).searchParams;
  const today = todayInVN();
  let from = params.get("from") || shiftDateKey(today, -29);
  let to = params.get("to") || today;

  if (!isDateKey(from) || !isDateKey(to) || from > to) {
    return NextResponse.json({ message: "Khoảng ngày không hợp lệ" }, { status: 400 });
  }

  // Nhân sự thường: ép về chính mình + cửa sổ 45 ngày. Kế toán/quản trị: tự chọn.
  const isOverseer = auth.viaAdmin || auth.role === "accountant" || auth.role === "admin";
  const username = isOverseer ? (params.get("username") || "").trim() : auth.username;
  if (!username) {
    return NextResponse.json({ message: "Thiếu tài khoản nhân sự (?username=)" }, { status: 400 });
  }

  let clamped = false;
  if (!isOverseer) {
    const limit = shiftDateKey(today, -PILOT_VIEW_LIMIT_DAYS);
    if (from < limit) {
      from = limit;
      clamped = true;
    }
    if (to < from) to = from;
  }

  try {
    const st = await getStaffStatement(spot, username, from, to);
    const xlsx = buildXlsx(buildStatementSheets(st, clamped));

    const filename = `bang-ke-${st.username}-${from}-${to}.xlsx`;
    return new NextResponse(new Uint8Array(xlsx), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof BaobayError) {
      return NextResponse.json({ message: err.message }, { status: err.status });
    }
    console.error("GET /api/baocao/statement error:", err);
    return NextResponse.json({ message: "Không xuất được bảng kê" }, { status: 500 });
  }
}

type Statement = Awaited<ReturnType<typeof getStaffStatement>>;

function buildStatementSheets(st: Statement, clamped: boolean): SheetSpec[] {
  // Bộ cột theo vai trò — nhân sự nào bảng kê nấy
  if (st.role === "dispatcher") return [dispatcherDaily(st), moneySheetOf(st)];
  if (st.role === "cameraman") return [cameramanDaily(st), moneySheetOf(st)];
  const closed = new Set(st.closedDates);
  const isHanoi = st.spot === "ha-noi";
  const sum = (pick: (r: Statement["reports"][number]) => number) =>
    st.reports.reduce((a, r) => a + pick(r), 0);
  const chiKhac = (r: Statement["reports"][number]) =>
    r.expenses.reduce((a, e) => a + (e.kind === "thu" ? 0 : e.amount), 0);
  const thuTaiBai = (r: Statement["reports"][number]) =>
    r.expenses.reduce((a, e) => a + (e.kind === "thu" ? e.amount : 0), 0);

  const isKP = st.spot === "khau-pha";
  const daily: SheetSpec = {
    name: "Bảng kê theo ngày",
    header: [
      "Ngày", "Ngày đã chốt", "Số chuyến PG", "Số mã vé",
      ...(isKP ? ["Chuyến PPG", "PPG không vé"] : []),
      "Flycam", "Camera 360", "Cờ đỏ", "Hoàng hôn/săn mây", "Kéo cờ",
      "Ngoại giao", "Phí bãi (khách)", "Nước", "Xe cho khách",
      ...(isHanoi ? ["Đón BigC (lượt)", "Đón KS (lượt)", "Xe lên núi (lượt)"] : []),
      "Chi khác", "Tổng chi (hoàn lại)", "Thu hộ tại bãi", "Phạt nộp muộn", "Ghi chú",
    ],
    widths: [12, 12, 11, 10, ...(isKP ? [11, 12] : []), 9, 11, 8, 8, 10, 12, 10, 12, ...(isHanoi ? [13, 13, 13] : []), 12, 16, 14, 14, 30],
    rows: [
      ...st.reports.map((r) => [
        formatDateKeyVN(r.date),
        closed.has(r.date) ? "x" : "chưa",
        r.flightCount,
        r.ticketCodes.length,
        ...(isKP ? [r.ppgFlights, r.ppgNoTicket] : []),
        r.flycam,
        r.video360,
        r.redFlag,
        r.sunset,
        r.flagFlight,
        r.diplomaticGuests,
        r.siteFeeGuests,
        r.waterCost,
        r.guestCarCost,
        ...(isHanoi ? [r.pickupBigC, r.pickupHotel, r.mountainTrips] : []),
        chiKhac(r),
        r.waterCost + r.guestCarCost + chiKhac(r),
        thuTaiBai(r),
        r.latePenalty,
        r.latePenaltyWaived ? `đã huỷ phạt${r.latePenaltyWaiveReason ? `: ${r.latePenaltyWaiveReason}` : ""}` : r.note,
      ]),
      [],
      [
        "TỔNG", "", sum((r) => r.flightCount), sum((r) => r.ticketCodes.length),
        ...(isKP ? [sum((r) => r.ppgFlights), sum((r) => r.ppgNoTicket)] : []),
        sum((r) => r.flycam), sum((r) => r.video360), sum((r) => r.redFlag), sum((r) => r.sunset), sum((r) => r.flagFlight),
        sum((r) => r.diplomaticGuests), sum((r) => r.siteFeeGuests), sum((r) => r.waterCost), sum((r) => r.guestCarCost),
        ...(isHanoi ? [sum((r) => r.pickupBigC), sum((r) => r.pickupHotel), sum((r) => r.mountainTrips)] : []),
        sum(chiKhac),
        sum((r) => r.waterCost + r.guestCarCost) + sum(chiKhac),
        sum(thuTaiBai),
        sum((r) => r.latePenalty),
        "",
      ],
      [],
      [
        "Bảng kê", `${st.pilotName} (${st.username}) · ${spotName(st.spot)} · ${formatDateKeyVN(st.from)} → ${formatDateKeyVN(st.to)}`,
      ],
      [
        "Ghi chú",
        "Chỉ NGÀY ĐÃ CHỐT mới là số dùng trả tiền. Đơn giá chuyến/dịch vụ/lượt đưa đón do kế toán nhân bên ngoài.",
      ],
      ...(clamped
        ? [["Lưu ý", `Phi công chỉ tự tra được ${PILOT_VIEW_LIMIT_DAYS} ngày gần nhất — khoảng ngày đã tự thu hẹp. Cần xa hơn thì nhờ kế toán xuất.`]]
        : []),
    ],
  };

  return [daily, moneySheetOf(st)];
}

/** Sheet ứng tiền & giao tiền — chung cho mọi vai trò. */
function moneySheetOf(st: Statement): SheetSpec {
  const advances = st.money.filter((m) => m.kind === "advance");
  /** Lệnh chuyển GỬI CHO người này (kế toán lập) — chiều NHẬN, tách khỏi chiều giao. */
  const isReceived = (m: Statement["money"][number]) =>
    m.kind !== "advance" && m.recipientUsername === st.username && m.username !== st.username;
  const handovers = st.money.filter((m) => m.kind !== "advance" && !isReceived(m));
  const received = st.money.filter(isReceived);

  return {
    name: "Ứng tiền & giao tiền",
    header: ["Ngày", "Loại", "Nội dung", "Người nhận/duyệt", "Số tiền", "Hình thức", "Trạng thái"],
    widths: [12, 12, 36, 24, 14, 12, 18],
    rows: [
      ...st.money.map((m) => [
        formatDateKeyVN(m.date),
        m.kind === "advance" ? "Ứng tiền" : isReceived(m) ? "Nhận tiền (lệnh KT)" : "Giao tiền",
        m.content,
        // Chiều nhận thì cột "người kia" là NGƯỜI LẬP LỆNH, không phải chính mình
        isReceived(m) ? m.createdBy || m.staffName : m.recipientName,
        m.amount,
        m.method === "cash" ? "Tiền mặt" : "CK",
        m.rejected ? `TỪ CHỐI: ${m.rejectedReason || ""}` : m.confirmed ? (m.kind === "advance" ? "Đã duyệt" : "Đã nhận") : "Chờ",
      ]),
      [],
      ["TỔNG ỨNG ĐÃ DUYỆT (trừ lương)", "", "", "", advances.filter((m) => m.confirmed).reduce((a, m) => a + m.amount, 0), "", ""],
      ["TỔNG ĐÃ GIAO (xác nhận)", "", "", "", handovers.filter((m) => m.confirmed).reduce((a, m) => a + m.amount, 0), "", ""],
      ["TỔNG ĐÃ NHẬN (lệnh KT: lương/phí/khác)", "", "", "", received.filter((m) => m.confirmed).reduce((a, m) => a + m.amount, 0), "", ""],
    ],
  };
}

/** Bảng kê ĐIỀU PHỐI theo ngày. */
function dispatcherDaily(st: Statement): SheetSpec {
  const closed = new Set(st.closedDates);
  const list = st.dispatcherReports;
  const sum = (pick: (r: (typeof list)[number]) => number) => list.reduce((a, r) => a + pick(r), 0);
  const chi = (r: (typeof list)[number]) =>
    r.guestWaterCost + r.mountainCarCost + r.shuttleCarCost +
    r.expenses.reduce((a, e) => a + (e.kind === "thu" ? 0 : e.amount), 0);

  return {
    name: "Bảng kê theo ngày",
    header: [
      "Ngày", "Ngày đã chốt", "Khách", "Vé xuất", "Vé thu hồi", "Vé huỷ", "Vé dời",
      "Flycam", "Camera 360", "Cờ đỏ", "Hoàng hôn/săn mây", "Kéo cờ", "Vé ngoại giao", "Thu ngoại giao",
      "Tiền mặt", "Chuyển khoản", "Chi tiết tiền thu", "Tổng chi hộ khách", "Ghi chú",
    ],
    widths: [12, 12, 8, 9, 11, 8, 8, 9, 11, 8, 8, 13, 14, 14, 14, 36, 16, 24],
    rows: [
      ...list.map((r) => [
        formatDateKeyVN(r.date),
        closed.has(r.date) ? "x" : "chưa",
        r.guestCount, r.ticketsIssued, r.ticketsReturned, r.cancelledCount, r.rescheduledCount,
        r.flycam, r.video360, r.redFlag, r.sunset, r.flagFlight,
        r.diplomaticCodes.length || r.diplomaticGuests, r.diplomaticAmount,
        r.cashReceived, r.transferReceived,
        r.revenueEntries.map((e) => `${e.content || "?"}: ${(e.amount / 1000).toLocaleString("vi-VN")}k (${e.method === "transfer" ? "CK" : "TM"})`).join(" | "),
        chi(r),
        r.note,
      ]),
      [],
      [
        "TỔNG", "", sum((r) => r.guestCount), sum((r) => r.ticketsIssued), sum((r) => r.ticketsReturned),
        sum((r) => r.cancelledCount), sum((r) => r.rescheduledCount),
        sum((r) => r.flycam), sum((r) => r.video360), sum((r) => r.redFlag), sum((r) => r.sunset), sum((r) => r.flagFlight),
        sum((r) => r.diplomaticCodes.length || r.diplomaticGuests), sum((r) => r.diplomaticAmount),
        sum((r) => r.cashReceived), sum((r) => r.transferReceived), "", sum(chi), "",
      ],
      [],
      ["Bảng kê", `${st.pilotName} (${st.username}) · Điều phối · ${formatDateKeyVN(st.from)} → ${formatDateKeyVN(st.to)}`],
    ],
  };
}

/** Bảng kê CAMERA MAN theo ngày. */
function cameramanDaily(st: Statement): SheetSpec {
  const closed = new Set(st.closedDates);
  const list = st.cameramanReports;
  const sum = (pick: (r: (typeof list)[number]) => number) => list.reduce((a, r) => a + pick(r), 0);
  const thu = (r: (typeof list)[number]) => r.expenses.reduce((a, e) => a + (e.kind === "thu" ? e.amount : 0), 0);
  const chi = (r: (typeof list)[number]) => r.expenses.reduce((a, e) => a + (e.kind !== "thu" ? e.amount : 0), 0);

  return {
    name: "Bảng kê theo ngày",
    header: ["Ngày", "Ngày đã chốt", "Chuyến flycam", "Quay dù lượn", "Thu tại bãi", "Chi tiêu", "Ghi chú"],
    widths: [12, 12, 13, 13, 14, 12, 30],
    rows: [
      ...list.map((r) => [
        formatDateKeyVN(r.date),
        closed.has(r.date) ? "x" : "chưa",
        r.flycamFlights, r.paraglidingFlights, thu(r), chi(r), r.note,
      ]),
      [],
      ["TỔNG", "", sum((r) => r.flycamFlights), sum((r) => r.paraglidingFlights), sum(thu), sum(chi), ""],
      [],
      ["Bảng kê", `${st.pilotName} (${st.username}) · Camera man · ${formatDateKeyVN(st.from)} → ${formatDateKeyVN(st.to)}`],
    ],
  };
}
