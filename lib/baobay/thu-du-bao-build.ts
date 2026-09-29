// lib/baobay/thu-du-bao-build.ts
/**
 * DỰNG THƯ DỰ BÁO 20H (không gửi): lấy dự báo Viên Nam + Đồi Bù cho mai và
 * ngày kia, phân tích gió trên cao, vẽ ảnh biểu đồ gió + Skew-T 12h. Route
 * /api/cron/thoi-tiet-mail gọi rồi gửi; cũng dùng để xem trước ở máy.
 */
import { nhanNgayVN, thuDuBao, type ChiTietNgay, type DiemDuBaoMail } from "@/lib/baobay/thoi-tiet-mail";
import { layThamKhong } from "@/lib/baobay/tham-khong-api";
import { phanTichPhiCong } from "@/lib/baobay/phan-tich-cao";
import { anhBieuDoGio, anhSkewT } from "@/lib/baobay/thoi-tiet-anh";
import { diemThoiTietTheoSlug } from "@/lib/weather-spots";
import { shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { duBaoDiemCongKhai } from "@/services/baobay-thoitiet.service";

const DIEM = ["vien-nam", "doi-bu"] as const;

/**
 * DỰNG THƯ (không gửi) — tách ra để xem trước bản thư đầy đủ ở máy mà không
 * gửi cho ai (chủ 29/09/2026: "cho tôi nội dung email qua đây tôi kiểm tra").
 */
export async function dungThuDuBao() {
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
        const nhan = nhanNgayVN(k);
        /** Thám không cả ngày: dùng cho đứt gió / gió xiết theo tầng và Skew-T 12h. */
        let tk: Awaited<ReturnType<typeof layThamKhong>>["gio"] | null = null;
        try {
          const toa = diemThoiTietTheoSlug(d.slug);
          if (toa) tk = (await layThamKhong({ lat: toa.lat, lon: toa.lon, ngay: k })).gio;
        } catch (e) {
          console.error("thoi-tiet-mail: thám không lỗi", d.slug, k, e);
        }
        const ct: ChiTietNgay = { phiCong: phanTichPhiCong(n, tk, alt, d.slug) };
        chiTiet[`${d.slug}|${k}`] = ct;
        try {
          const cid = `gio-${d.slug}-${k}@mebayluon`;
          attachments.push({ filename: `gio-${d.slug}-${k}.png`, content: await anhBieuDoGio({ ten: d.ten, nhanNgay: nhan, gio: n.gio, altCat: alt }), contentType: "image/png", cid });
          ct.cidGio = cid;
        } catch (e) {
          console.error("thoi-tiet-mail: biểu đồ gió lỗi", d.slug, k, e);
        }
        const g12 = tk?.find((g) => g.gio.endsWith("T12:00"));
        if (g12) {
          try {
            const cid = `skewt-${d.slug}-${k}@mebayluon`;
            attachments.push({
              filename: `skewt-${d.slug}-${k}.png`,
              content: await anhSkewT({ ten: d.ten, nhanNgay: nhan, gio: "12:00", muc: g12.muc, altCat: alt, altHa: d.toaDo.altHa }),
              contentType: "image/png",
              cid,
            });
            ct.cidSkewT = cid;
          } catch (e) {
            console.error("thoi-tiet-mail: Skew-T lỗi", d.slug, k, e);
          }
        }
      }),
    ),
  );

  const thu = thuDuBao(diem, ngayCanGui, undefined, chiTiet);
  return { thu, attachments, ngayCanGui, diem };
}

