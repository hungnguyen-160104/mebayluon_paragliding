// app/api/baocao/statement/route.ts
import { NextResponse } from "next/server";

import { isDateKey, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { spotName } from "@/lib/baobay/spots";
import { PILOT_VIEW_LIMIT_DAYS } from "@/lib/baobay/validation";
import { buildXlsx, type SheetSpec } from "@/lib/baobay/xlsx";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { BaobayError, getPilotStatement } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bảng kê Excel của MỘT phi công theo chu kỳ tự chọn.
 *
 * GET ?from=&to=&spot=&username=
 *
 * - Phi công: chỉ xuất được bảng của CHÍNH MÌNH, và chỉ trong 45 ngày gần
 *   nhất — quá hạn đó dữ liệu bị kế toán khoá tra cứu (khoảng ngày tự co lại,
 *   có ghi chú ngay trong file).
 * - Kế toán / quản trị: phi công nào cũng được, khoảng ngày nào cũng được.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["pilot", "accountant", "admin"], allowAdmin: true });
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

  // Phi công: ép về chính mình + cửa sổ 45 ngày. Kế toán/quản trị: tự chọn.
  const isPilot = auth.role === "pilot" && !auth.viaAdmin;
  const username = isPilot ? auth.username : (params.get("username") || "").trim();
  if (!username) {
    return NextResponse.json({ message: "Thiếu tài khoản phi công (?username=)" }, { status: 400 });
  }

  let clamped = false;
  if (isPilot) {
    const limit = shiftDateKey(today, -PILOT_VIEW_LIMIT_DAYS);
    if (from < limit) {
      from = limit;
      clamped = true;
    }
    if (to < from) to = from;
  }

  try {
    const st = await getPilotStatement(spot, username, from, to);
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

type Statement = Awaited<ReturnType<typeof getPilotStatement>>;

function buildStatementSheets(st: Statement, clamped: boolean): SheetSpec[] {
  const closed = new Set(st.closedDates);
  const isHanoi = st.spot === "ha-noi";
  const sum = (pick: (r: Statement["reports"][number]) => number) =>
    st.reports.reduce((a, r) => a + pick(r), 0);
  const chiKhac = (r: Statement["reports"][number]) =>
    r.expenses.reduce((a, e) => a + (e.kind === "thu" ? 0 : e.amount), 0);
  const thuTaiBai = (r: Statement["reports"][number]) =>
    r.expenses.reduce((a, e) => a + (e.kind === "thu" ? e.amount : 0), 0);

  const daily: SheetSpec = {
    name: "Bảng kê theo ngày",
    header: [
      "Ngày", "Ngày đã chốt", "Số chuyến PG", "Số mã vé", "Chuyến PPG", "PPG không vé", "Flycam", "Camera 360", "Cờ đỏ", "Kéo cờ",
      "Ngoại giao", "Phí bãi bay", "Nước", "Xe cho khách",
      ...(isHanoi ? ["Đón BigC (lượt)", "Đón KS (lượt)", "Xe lên núi (lượt)"] : []),
      "Chi khác", "Tổng chi (hoàn lại)", "Thu hộ tại bãi", "Phạt nộp muộn", "Ghi chú",
    ],
    widths: [12, 12, 11, 10, 11, 12, 9, 11, 8, 8, 10, 12, 10, 12, ...(isHanoi ? [13, 13, 13] : []), 12, 16, 14, 14, 30],
    rows: [
      ...st.reports.map((r) => [
        r.date,
        closed.has(r.date) ? "x" : "chưa",
        r.flightCount,
        r.ticketCodes.length,
        r.ppgFlights,
        r.ppgNoTicket,
        r.flycam,
        r.video360,
        r.redFlag,
        r.flagFlight,
        r.diplomaticGuests,
        r.siteFee,
        r.waterCost,
        r.guestCarCost,
        ...(isHanoi ? [r.pickupBigC, r.pickupHotel, r.mountainTrips] : []),
        chiKhac(r),
        r.siteFee + r.waterCost + r.guestCarCost + chiKhac(r),
        thuTaiBai(r),
        r.latePenalty,
        r.latePenaltyWaived ? `đã huỷ phạt${r.latePenaltyWaiveReason ? `: ${r.latePenaltyWaiveReason}` : ""}` : r.note,
      ]),
      [],
      [
        "TỔNG", "", sum((r) => r.flightCount), sum((r) => r.ticketCodes.length),
        sum((r) => r.ppgFlights), sum((r) => r.ppgNoTicket),
        sum((r) => r.flycam), sum((r) => r.video360), sum((r) => r.redFlag), sum((r) => r.flagFlight),
        sum((r) => r.diplomaticGuests), sum((r) => r.siteFee), sum((r) => r.waterCost), sum((r) => r.guestCarCost),
        ...(isHanoi ? [sum((r) => r.pickupBigC), sum((r) => r.pickupHotel), sum((r) => r.mountainTrips)] : []),
        sum(chiKhac),
        sum((r) => r.siteFee + r.waterCost + r.guestCarCost) + sum(chiKhac),
        sum(thuTaiBai),
        sum((r) => r.latePenalty),
        "",
      ],
      [],
      [
        "Bảng kê", `${st.pilotName} (${st.username}) · ${spotName(st.spot)} · ${st.from} → ${st.to}`,
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

  const advances = st.money.filter((m) => m.kind === "advance");
  const handovers = st.money.filter((m) => m.kind !== "advance");

  const moneySheet: SheetSpec = {
    name: "Ứng tiền & giao tiền",
    header: ["Ngày", "Loại", "Nội dung", "Người nhận/duyệt", "Số tiền", "Hình thức", "Trạng thái"],
    widths: [12, 12, 36, 24, 14, 12, 18],
    rows: [
      ...st.money.map((m) => [
        m.date,
        m.kind === "advance" ? "Ứng tiền" : "Giao tiền",
        m.content,
        m.recipientName,
        m.amount,
        m.method === "cash" ? "Tiền mặt" : "CK",
        m.rejected ? `TỪ CHỐI: ${m.rejectedReason || ""}` : m.confirmed ? (m.kind === "advance" ? "Đã duyệt" : "Đã nhận") : "Chờ",
      ]),
      [],
      ["TỔNG ỨNG ĐÃ DUYỆT (trừ lương)", "", "", "", advances.filter((m) => m.confirmed).reduce((a, m) => a + m.amount, 0), "", ""],
      ["TỔNG ĐÃ GIAO (xác nhận)", "", "", "", handovers.filter((m) => m.confirmed).reduce((a, m) => a + m.amount, 0), "", ""],
    ],
  };

  return [daily, moneySheet];
}
