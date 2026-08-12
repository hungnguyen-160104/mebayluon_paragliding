// app/api/baocao/monthly/route.ts
import { NextResponse } from "next/server";

import { todayInVN } from "@/lib/baobay/date";
import { resolveSpot } from "@/lib/baobay/request-spot";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { getMonthlyReport } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Báo cáo tháng theo từng phi công: ?month=YYYY-MM (mặc định tháng này).
 *
 * Kế toán (và quản trị) xem được cả đội; PHI CÔNG chỉ xem được của chính mình —
 * cùng một endpoint nhưng lọc theo username trong token, không dựa vào tham số
 * do trình duyệt gửi (nếu tin tham số thì phi công đổi tham số là xem được số
 * của người khác).
 *
 * ?format=csv để tải bảng "cả tháng" mở bằng Excel.
 */
export async function GET(req: Request) {
  const auth = requireBaobay(req, { roles: ["accountant", "pilot"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const spot = resolveSpot(req, auth);
  if (spot instanceof NextResponse) return spot;

  const params = new URL(req.url).searchParams;
  const month = params.get("month") || todayInVN().slice(0, 7);

  if (!MONTH.test(month)) {
    return NextResponse.json({ message: "Tháng không hợp lệ (cần dạng YYYY-MM)" }, { status: 400 });
  }

  const report = await getMonthlyReport(spot, month, auth.role === "pilot" ? auth.username : undefined);

  if (params.get("format") === "csv") {
    const csv = buildCsv(report);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="baobay-${spot}-thang-${month}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json(report);
}

/** CSV: mỗi phi công một dòng, cột là các chỉ tiêu của cả tháng và đến hôm nay. */
function buildCsv(report: Awaited<ReturnType<typeof getMonthlyReport>>): string {
  const rows: (string | number)[][] = [];

  rows.push([`Báo cáo tháng ${report.month}`, `tính đến ${report.today}`]);
  if (report.unclosedDays.length) {
    rows.push([`Ngày chưa kế toán chốt (số còn có thể đổi)`, report.unclosedDays.join(" ")]);
  }
  rows.push([]);

  rows.push([
    "Phi công", "Tài khoản", "Số ngày bay",
    "Chuyến đến hôm nay", "Chuyến cả tháng",
    "Camera360 đến hôm nay", "Camera360 cả tháng",
    "Khách ngoại giao cả tháng",
    "Phí bãi bay cả tháng", "Nước cho khách cả tháng", "Xe cho khách cả tháng",
    "Chi khác cả tháng", "Tổng chi cả tháng", "Phạt nộp muộn",
  ]);

  for (const p of report.pilots) {
    rows.push([
      p.pilotName, p.username, p.month.days,
      p.toDate.flights, p.month.flights,
      p.toDate.video360, p.month.video360,
      p.month.diplomaticGuests,
      p.month.siteFee, p.month.waterCost, p.month.guestCarCost,
      p.month.otherExpense, p.month.expenseTotal, p.month.latePenalty,
    ]);
  }

  const g = report.grandMonth;
  const t = report.grandToDate;
  rows.push([
    "TỔNG", "", g.days,
    t.flights, g.flights,
    t.video360, g.video360,
    g.diplomaticGuests,
    g.siteFee, g.waterCost, g.guestCarCost,
    g.otherExpense, g.expenseTotal, g.latePenalty,
  ]);

  // Chi tiết các khoản chi khác — kế toán cần đọc nội dung, không chỉ số tổng.
  rows.push([]);
  rows.push(["Chi tiết chi khác", "", "", ""]);
  rows.push(["Ngày", "Phi công", "Nội dung", "Số tiền", "Ghi chú"]);
  for (const p of report.pilots) {
    for (const e of p.expenses) {
      rows.push([e.date, p.pilotName, e.content, e.amount, e.note || ""]);
    }
  }

  const body = rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
  return `﻿${body}\r\n`;
}

function csvCell(value: string | number): string {
  if (typeof value === "number") return String(value);
  const text = String(value ?? "");
  if (/[";\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
