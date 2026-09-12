// app/api/cron/thoi-tiet-mail/route.ts
import { NextResponse } from "next/server";

import { thuDuBao, type DiemDuBaoMail } from "@/lib/baobay/thoi-tiet-mail";
import { diemThoiTietTheoSlug } from "@/lib/weather-spots";
import { shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { duBaoDiemCongKhai } from "@/services/baobay-thoitiet.service";
import { sendSmtpMail } from "@/lib/mailer";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * THƯ DỰ BÁO 20H MỖI TỐI (chủ đặt 11/09).
 *
 * Gửi Viên Nam + Đồi Bù, HAI NGÀY TỚI (mai và ngày kia) — chủ dặn "không gửi
 * quá nhiều ngày vào email". Người nhận chính `vntqtoan@gmail.com`, cc
 * `dangvm@gmail.com`.
 *
 * Lịch chạy khai trong `vercel.json`: 13:00 UTC = 20:00 giờ Việt Nam.
 *
 * AI ĐƯỢC GỌI: Vercel Cron tự gửi header `x-vercel-cron`. Gọi tay thì phải
 * kèm `?key=<CRON_SECRET>` — nếu không, bất kỳ ai biết đường dẫn cũng bắt máy
 * chủ gửi thư được.
 *
 * Thử trước khi bật lịch: `?key=…&to=ai@đó&demo=1` gửi CHỈ cho địa chỉ ấy,
 * không đụng tới người nhận thật.
 */
const NHAN_CHINH = "vntqtoan@gmail.com";
const NHAN_CC = "dangvm@gmail.com";
const DIEM = ["vien-nam", "doi-bu"] as const;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const laCron = req.headers.get("x-vercel-cron") !== null;
  const key = url.searchParams.get("key") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  if (!laCron && (!secret || key !== secret)) {
    return NextResponse.json({ message: "Không có quyền" }, { status: 401 });
  }

  const demo = url.searchParams.get("demo") === "1";
  const toParam = url.searchParams.get("to");

  try {
    /** Hai ngày TỚI: mai và ngày kia — hôm nay coi như đã biết rồi. */
    const homNay = todayInVN();
    const ngayCanGui = [shiftDateKey(homNay, 1), shiftDateKey(homNay, 2)];

    const diem: DiemDuBaoMail[] = [];
    for (const slug of DIEM) {
      const d = diemThoiTietTheoSlug(slug);
      if (!d) continue;
      const du = await duBaoDiemCongKhai(d);
      diem.push({
        ten: du.ten,
        tinh: du.tinh,
        slug: du.slug,
        toaDo: { alt: du.toaDo.alt, altHa: du.toaDo.altHa },
        ngay: du.ngay,
      });
    }
    if (!diem.length) throw new Error("Không lấy được dự báo điểm nào");

    const thu = thuDuBao(diem, ngayCanGui);
    const to = toParam || NHAN_CHINH;
    await sendSmtpMail({
      to,
      /** Bản thử chỉ gửi một địa chỉ — đừng làm phiền người nhận thật. */
      cc: demo || toParam ? undefined : NHAN_CC,
      subject: (demo ? "[THỬ] " : "") + thu.subject,
      html: thu.html,
      text: thu.text,
    });

    return NextResponse.json({ ok: true, to, cc: demo || toParam ? null : NHAN_CC, ngay: ngayCanGui, diem: diem.map((d) => d.ten) });
  } catch (err) {
    console.error("GET /api/cron/thoi-tiet-mail error:", err);
    return NextResponse.json({ message: err instanceof Error ? err.message : "Không gửi được thư" }, { status: 500 });
  }
}
