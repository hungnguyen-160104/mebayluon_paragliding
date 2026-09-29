// app/api/cron/thoi-tiet-mail/route.ts
import { NextResponse } from "next/server";

import { nhanNgayVN, thuDuBao, type ChiTietNgay, type DiemDuBaoMail } from "@/lib/baobay/thoi-tiet-mail";
import { layThamKhong } from "@/lib/baobay/tham-khong-api";
import { phanTichGioCao, phanTichSkewT } from "@/lib/baobay/phan-tich-cao";
import { anhBieuDoGio, anhSkewT } from "@/lib/baobay/thoi-tiet-anh";
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
 * `dangky.mebayluon@gmail.com`.
 *
 * Lịch chạy khai trong `vercel.json`: 13:00 UTC = 20:00 giờ Việt Nam.
 *
 * AI ĐƯỢC GỌI (sửa 29/09/2026 — từ 12/09 tới nay CHƯA GỬI ĐƯỢC THƯ NÀO: code
 * cũ chờ header `x-vercel-cron` mà Vercel không hề gửi, nên tối nào lịch cũng
 * bị 401). Theo tài liệu Vercel, lời gọi của Cron mang:
 *  - `Authorization: Bearer <CRON_SECRET>` — khi dự án có khai CRON_SECRET;
 *  - `x-vercel-cron-schedule: <biểu thức lịch>` — luôn có.
 * Có CRON_SECRET thì BẮT BUỘC Bearer (hoặc `?key=` khi gọi tay); chưa khai
 * thì nhận header lịch. Tham số `to`/`demo` (gửi địa chỉ khác) chỉ nhận khi
 * gọi tay kèm `?key=` — người ngoài giả header cũng chỉ gửi được thư dự báo
 * thật cho đúng anh Toản, không biến máy chủ thành chỗ gửi thư lung tung.
 *
 * Thử trước khi bật lịch: `?key=…&to=ai@đó&demo=1` gửi CHỈ cho địa chỉ ấy,
 * không đụng tới người nhận thật.
 */
const NHAN_CHINH = "vntqtoan@gmail.com";
/** CC hộp đăng ký (chủ 29/09/2026) — KHÔNG cc dangvm@gmail.com vì hộp đó đầy thư rác. */
const NHAN_CC = "dangky.mebayluon@gmail.com";
const DIEM = ["vien-nam", "doi-bu"] as const;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";
  const secret = (process.env.CRON_SECRET ?? "").trim();
  const goiTay = !!secret && key === secret;
  const laCron = secret
    ? req.headers.get("authorization") === `Bearer ${secret}`
    : req.headers.get("x-vercel-cron-schedule") !== null;
  if (!laCron && !goiTay) {
    return NextResponse.json({ message: "Không có quyền" }, { status: 401 });
  }

  const demo = goiTay && url.searchParams.get("demo") === "1";
  const toParam = goiTay ? url.searchParams.get("to") : null;

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

    /**
     * PHÂN TÍCH GIÓ TRÊN CAO + ẢNH biểu đồ gió và Skew-T 12h (chủ 29/09/2026).
     * Mỗi (điểm, ngày) làm độc lập: hỏng một phần thì thư vẫn đi với phần còn
     * lại — thà thiếu ảnh còn hơn cả thư không gửi.
     */
    const chiTiet: Record<string, ChiTietNgay> = {};
    const attachments: Array<{ filename: string; content: Buffer; contentType: string; cid: string }> = [];
    await Promise.all(
      diem.flatMap((d) =>
        ngayCanGui.map(async (k) => {
          const n = d.ngay.find((x) => x.ngay === k);
          if (!n) return;
          const alt = d.toaDo.alt ?? 0;
          const ct: ChiTietNgay = { gioCao: phanTichGioCao(n.gio, alt) };
          chiTiet[`${d.slug}|${k}`] = ct;
          const nhan = nhanNgayVN(k);
          try {
            const cid = `gio-${d.slug}-${k}@mebayluon`;
            attachments.push({ filename: `gio-${d.slug}-${k}.png`, content: await anhBieuDoGio({ ten: d.ten, nhanNgay: nhan, gio: n.gio, altCat: alt }), contentType: "image/png", cid });
            ct.cidGio = cid;
          } catch (e) {
            console.error("thoi-tiet-mail: biểu đồ gió lỗi", d.slug, k, e);
          }
          try {
            const toa = diemThoiTietTheoSlug(d.slug);
            if (!toa) return;
            const tk = await layThamKhong({ lat: toa.lat, lon: toa.lon, ngay: k });
            const g12 = tk.gio.find((g) => g.gio.endsWith("T12:00")) ?? tk.gio[Math.floor(tk.gio.length / 2)];
            if (!g12) return;
            ct.skewT = phanTichSkewT(g12.muc, g12.gio, alt, n.xacSuatDongMax);
            const cid = `skewt-${d.slug}-${k}@mebayluon`;
            attachments.push({
              filename: `skewt-${d.slug}-${k}.png`,
              content: await anhSkewT({ ten: d.ten, nhanNgay: nhan, gio: g12.gio.slice(11, 16), muc: g12.muc, altCat: alt, altHa: d.toaDo.altHa }),
              contentType: "image/png",
              cid,
            });
            ct.cidSkewT = cid;
          } catch (e) {
            console.error("thoi-tiet-mail: Skew-T lỗi", d.slug, k, e);
          }
        }),
      ),
    );

    const thu = thuDuBao(diem, ngayCanGui, undefined, chiTiet);
    const to = toParam || NHAN_CHINH;
    await sendSmtpMail({
      to,
      /** Bản thử chỉ gửi một địa chỉ — đừng làm phiền người nhận thật. */
      cc: demo || toParam ? undefined : NHAN_CC,
      subject: (demo ? "[THỬ] " : "") + thu.subject,
      html: thu.html,
      text: thu.text,
      attachments,
    });

    return NextResponse.json({ ok: true, to, cc: demo || toParam ? null : NHAN_CC, ngay: ngayCanGui, diem: diem.map((d) => d.ten) });
  } catch (err) {
    console.error("GET /api/cron/thoi-tiet-mail error:", err);
    return NextResponse.json({ message: err instanceof Error ? err.message : "Không gửi được thư" }, { status: 500 });
  }
}
