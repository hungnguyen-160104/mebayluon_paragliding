// lib/baobay/shift-email.ts
/**
 * Email báo lịch bay cho từng phi công.
 *
 * Mỗi người nhận ĐÚNG lịch của mình, không phải bảng của cả đội: phi công mở
 * điện thoại giữa bãi đáp, cần thấy ngay "mai tôi có bay không", chứ không phải
 * dò tên mình trong bảng 8 hàng × 31 cột.
 *
 * Dựng HTML bằng bảng và màu nền in-line — Gmail trên điện thoại cắt phần lớn
 * CSS trong <style>, nên style phải nằm ngay trên từng ô.
 */

const WEEKDAY = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export type ShiftMailInput = {
  pilotName: string;
  /** "YYYY-MM". */
  month: string;
  spotName: string;
  /** Các ngày ĐI LÀM trong tháng. */
  workDays: number[];
  /** Lần cập nhật thứ mấy — 1 là bản đầu, từ 2 trở đi là bản cập nhật. */
  version: number;
};

function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `tháng ${Number(m)}/${y}`;
}

function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function weekdayOf(month: string, day: number): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).getUTCDay();
}

/** Gom dãy ngày liên tiếp thành "3–7" cho gọn: "1, 3–7, 10". */
function summarize(days: number[]): string {
  if (!days.length) return "—";
  const sorted = [...days].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (const d of sorted.slice(1)) {
    if (d === prev + 1) {
      prev = d;
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}–${prev}`);
    start = d;
    prev = d;
  }
  parts.push(start === prev ? `${start}` : `${start}–${prev}`);
  return parts.join(", ");
}

export function buildShiftEmail(input: ShiftMailInput): { subject: string; html: string; text: string } {
  const total = daysInMonth(input.month);
  const work = new Set(input.workDays.filter((d) => d >= 1 && d <= total));
  const offDays: number[] = [];
  for (let d = 1; d <= total; d += 1) if (!work.has(d)) offDays.push(d);

  const isUpdate = input.version > 1;
  const subject = isUpdate
    ? `Lịch bay ${monthLabel(input.month)} — BẢN CẬP NHẬT (${input.spotName})`
    : `Lịch bay ${monthLabel(input.month)} (${input.spotName})`;

  /** Bảng ngày: 7 cột một hàng cho vừa màn hình điện thoại. */
  const cells: string[] = [];
  for (let d = 1; d <= total; d += 1) {
    const on = work.has(d);
    cells.push(
      `<td align="center" style="padding:7px 0;border:1px solid #e2e8f0;` +
        `background:${on ? "#dcfce7" : "#f8fafc"};color:${on ? "#166534" : "#94a3b8"};` +
        `font-weight:${on ? "700" : "400"};font-size:13px;width:14%">` +
        `<div style="font-size:10px;opacity:.7">${WEEKDAY[weekdayOf(input.month, d)]}</div>${d}` +
        `</td>`,
    );
  }
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(`<tr>${cells.slice(i, i + 7).join("")}</tr>`);
  }

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
  <div style="background:#0369a1;color:#fff;padding:16px 18px;border-radius:12px 12px 0 0">
    <div style="font-size:18px;font-weight:700">Lịch bay ${monthLabel(input.month)}</div>
    <div style="font-size:13px;opacity:.9">${input.spotName} · ${input.pilotName}</div>
  </div>

  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:18px">
    ${
      isUpdate
        ? `<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:13px;color:#92400e">
             <b>Đây là bản cập nhật (lần ${input.version}).</b> Lịch có thay đổi so với bản trước — xem lại giúp.
           </div>`
        : ""
    }

    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:14px">
      ${rows.join("")}
    </table>

    <div style="font-size:13px;line-height:1.7;margin-bottom:14px">
      <div><span style="display:inline-block;width:12px;height:12px;background:#dcfce7;border:1px solid #86efac;vertical-align:middle;margin-right:6px"></span>
        <b>Ngày bay (${work.size} ngày):</b> ${summarize([...work])}</div>
      <div><span style="display:inline-block;width:12px;height:12px;background:#f8fafc;border:1px solid #e2e8f0;vertical-align:middle;margin-right:6px"></span>
        <b>Ngày nghỉ (${offDays.length} ngày):</b> ${summarize(offDays)}</div>
    </div>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;font-size:13px;line-height:1.7;color:#166534">
      Phi công cần nghỉ ngơi để đảm bảo <b>sức khoẻ và an toàn bay</b>. Hãy sắp xếp lịch để relax mà
      không phải vướng bận công việc.<br />
      Chúc vui vẻ và nhớ trở lại bầu trời đúng ngày ✈️
    </div>

    <div style="margin-top:14px;font-size:12px;color:#64748b">
      Lịch này cũng xem được bất cứ lúc nào ở trang báo cáo nội bộ:
      <a href="https://www.mebayluon.com/baocao" style="color:#0369a1">mebayluon.com/baocao</a>.
      Cần đổi lịch thì báo trực tiếp quản lý điểm bay.
    </div>
  </div>
</div>`.trim();

  const text = [
    `Lịch bay ${monthLabel(input.month)} — ${input.spotName} — ${input.pilotName}`,
    isUpdate ? `(BẢN CẬP NHẬT lần ${input.version})` : "",
    "",
    `Ngày bay (${work.size} ngày): ${summarize([...work])}`,
    `Ngày nghỉ (${offDays.length} ngày): ${summarize(offDays)}`,
    "",
    "Phi công cần nghỉ ngơi để đảm bảo sức khoẻ và an toàn bay. Hãy sắp xếp lịch để relax mà không phải",
    "vướng bận công việc. Chúc vui vẻ và nhớ trở lại bầu trời đúng ngày.",
    "",
    "Xem lịch bất cứ lúc nào: https://www.mebayluon.com/baocao",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
