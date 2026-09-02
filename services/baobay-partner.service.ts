// services/baobay-partner.service.ts
/**
 * BÁO SỐ CHUYẾN CHO ĐỐI TÁC CHỦ QUẢN của nhóm phi công Nha Trang (Long, Trọng,
 * Đạt) — gửi tự động MỖI KHI KẾ TOÁN CHỐT NGÀY ở Khau Phạ (luật chủ 02/09/2026).
 *
 * BẢO MẬT — chỉ được lộ đúng MỘT con số: SỐ CHUYẾN BAY của ba phi công này.
 * Tuyệt đối không flycam, không 360, không tiền nong, không tên khách, không
 * số liệu của phi công khác. Mail dựng thủ công từ đúng ba trường flightCount
 * + ppgFlights, không nhét nguyên báo cáo vào.
 *
 * Cộng dồn THEO THÁNG để đối tác thanh toán: mỗi mail kèm tổng từ mùng 1 đến
 * ngày vừa chốt; sang tháng mới thì khoảng cộng tự bắt đầu lại từ mùng 1 —
 * "reset" không cần lưu trạng thái gì.
 */
import { formatDateKeyVN } from "@/lib/baobay/date";
import { sendSmtpMail } from "@/lib/mailer";
import { PilotDailyReport } from "@/models/PilotDailyReport.model";

/** Phi công thuộc đối tác — username trong app. */
const PARTNER_PILOTS: Array<{ username: string; label: string }> = [
  { username: "longnt", label: "Long" },
  { username: "trongnt", label: "Trọng" },
  { username: "datnt", label: "Đạt" },
];

const PARTNER_EMAIL = "dothuytrang26.bl@gmail.com";
/** Chủ luôn nhận một bản để đối chiếu khi đối tác hỏi. */
const OWNER_EMAIL = "mebayluon@gmail.com";

/**
 * Gửi mail số chuyến của ngày vừa chốt + cộng dồn tháng. Gọi NỀN sau closeDay
 * — lỗi mail không được làm hỏng việc chốt sổ, chỉ ghi log.
 */
export async function sendPartnerFlightMail(spot: string, date: string): Promise<void> {
  if (spot !== "khau-pha") return;
  try {
    const monthStart = `${date.slice(0, 7)}-01`;
    const reports = await PilotDailyReport.find({
      spot,
      username: { $in: PARTNER_PILOTS.map((p) => p.username) },
      date: { $gte: monthStart, $lte: date },
    })
      .select("username date flightCount ppgFlights")
      .lean<Array<{ username: string; date: string; flightCount?: number; ppgFlights?: number }>>();

    const flightsOf = (r: { flightCount?: number; ppgFlights?: number }) =>
      (Number(r.flightCount) || 0) + (Number(r.ppgFlights) || 0);

    const perPilot = PARTNER_PILOTS.map((p) => {
      const mine = reports.filter((r) => r.username === p.username);
      return {
        label: p.label,
        day: mine.filter((r) => r.date === date).reduce((t, r) => t + flightsOf(r), 0),
        month: mine.reduce((t, r) => t + flightsOf(r), 0),
      };
    });
    const monthTotal = perPilot.reduce((t, p) => t + p.month, 0);

    const d = formatDateKeyVN(date);
    const dayLine = perPilot.map((p) => `${p.label}: ${p.day} chuyến`).join(" · ");
    const monthLine = perPilot.map((p) => `${p.label}: ${p.month}`).join(" · ");

    const text = [
      `Mebayluon Paragliding thông báo số chuyến ngày ${d}:`,
      dayLine,
      "",
      `Cộng dồn từ ${formatDateKeyVN(monthStart)} — ${monthLine}`,
      `Tổng số chuyến tính đến ngày ${d} là: ${monthTotal}`,
      "",
      "(Số cộng dồn tính theo tháng để thanh toán; sang tháng mới sẽ đếm lại từ đầu.)",
    ].join("\n");

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#0f172a">
        <p><strong>Mebayluon Paragliding</strong> thông báo số chuyến ngày <strong>${d}</strong>:</p>
        <ul>
          ${perPilot.map((p) => `<li>${p.label}: <strong>${p.day}</strong> chuyến</li>`).join("")}
        </ul>
        <p>Cộng dồn từ ${formatDateKeyVN(monthStart)}: ${perPilot
          .map((p) => `${p.label} <strong>${p.month}</strong>`)
          .join(" · ")}</p>
        <p style="font-size:15px">Tổng số chuyến tính đến ngày ${d} là: <strong>${monthTotal}</strong></p>
        <p style="color:#64748b;font-size:12px">Số cộng dồn tính theo tháng để thanh toán — sang tháng mới sẽ đếm lại từ đầu.</p>
      </div>`;

    await sendSmtpMail({
      to: PARTNER_EMAIL,
      subject: `Mebayluon Paragliding — số chuyến ngày ${d} (tổng tháng: ${monthTotal})`,
      html,
      text,
    });
    // Bản sao cho chủ — gửi riêng để địa chỉ chủ không lộ ra với đối tác
    await sendSmtpMail({
      to: OWNER_EMAIL,
      subject: `[bản sao đối tác NT] số chuyến ngày ${d} (tổng tháng: ${monthTotal})`,
      html,
      text,
    });
  } catch (err) {
    console.error("sendPartnerFlightMail failed:", err);
  }
}
