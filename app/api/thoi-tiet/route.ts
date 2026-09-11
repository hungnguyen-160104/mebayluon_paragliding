// app/api/thoi-tiet/route.ts
import { NextResponse } from "next/server";

import { diemThoiTietTheoSlug, DIEM_TRANG_THOI_TIET } from "@/lib/weather-spots";
import { duBaoDiemCongKhai } from "@/services/baobay-thoitiet.service";

export const runtime = "nodejs";
/** Gọi mô hình khí tượng qua mạng cho nhiều điểm — cần rộng thời gian. */
export const maxDuration = 30;

/**
 * THỜI TIẾT ĐIỂM BAY CHO KHÁCH — không cần đăng nhập.
 *
 * GET /api/thoi-tiet            → mọi điểm trên trang "Thời tiết bay"
 * GET /api/thoi-tiet?spot=slug  → một điểm (widget trong trang /spots/<slug>)
 *
 * CACHE 30 PHÚT Ở BIÊN (`s-maxage`) chứ không để mỗi lượt khách gọi một lần:
 * mô hình khí tượng chỉ chạy vài lần một ngày nên số y hệt nhau, mà trang điểm
 * bay là trang khách vào nhiều nhất — không chặn lại thì mỗi lượt xem là một
 * lần gọi ra ngoài, vừa chậm vừa dễ bị nhà cung cấp chặn.
 *
 * `stale-while-revalidate` để lúc số hết hạn khách vẫn nhận ngay bản cũ, máy
 * chủ lấy bản mới ở phía sau — thà chậm 20 phút còn hơn quay vòng chờ.
 */
const CACHE_HEADER = "public, s-maxage=1800, stale-while-revalidate=3600";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("spot");
  const model = url.searchParams.get("model") ?? undefined;

  try {
    if (slug) {
      const diem = diemThoiTietTheoSlug(slug);
      if (!diem) return NextResponse.json({ message: "Không có điểm bay này" }, { status: 404 });
      const du = await duBaoDiemCongKhai(diem, model);
      return NextResponse.json(du, { headers: { "Cache-Control": CACHE_HEADER } });
    }

    /**
     * Gọi SONG SONG cả danh sách: nối tiếp sáu điểm là sáu lần chờ mạng cộng
     * lại. `allSettled` để một điểm hỏng không kéo cả trang xuống — điểm nào
     * lỗi thì thiếu thẻ đó, phần còn lại vẫn hiện.
     */
    const ket = await Promise.allSettled(DIEM_TRANG_THOI_TIET.map((d) => duBaoDiemCongKhai(d, model)));
    const diem = ket.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    if (!diem.length) throw new Error("Không điểm nào lấy được dự báo");

    /**
     * THIẾU ĐIỂM THÌ ĐỪNG CACHE LÂU (chủ báo 11/09: trang không có Khau Phạ).
     *
     * Một lần gọi mà mô hình khí tượng chậm hoặc đứt là điểm ấy rơi ra khỏi
     * danh sách — chuyện thường, `allSettled` cố ý để trang vẫn hiện phần còn
     * lại. Cái sai là ĐEM BẢN THIẾU ẤY CACHE 30 PHÚT ở biên rồi phục vụ tiếp
     * một tiếng nữa (stale-while-revalidate): cả tiếng đồng hồ khách vào không
     * thấy điểm bay chính, trong khi gọi thẳng điểm ấy thì vẫn ra số.
     *
     * Nên: đủ điểm mới cache dài; thiếu thì cache 60 giây, lần sau tự lấy lại.
     */
    const du = diem.length === DIEM_TRANG_THOI_TIET.length;
    if (!du) {
      const hong = DIEM_TRANG_THOI_TIET.filter((d) => !diem.some((x) => x.slug === d.slug)).map((d) => d.slug);
      console.error("GET /api/thoi-tiet: thiếu điểm", hong.join(", "));
    }
    return NextResponse.json(
      { diem },
      { headers: { "Cache-Control": du ? CACHE_HEADER : "public, s-maxage=60, stale-while-revalidate=60" } },
    );
  } catch (err) {
    console.error("GET /api/thoi-tiet error:", err);
    return NextResponse.json({ message: "Không lấy được dự báo thời tiết" }, { status: 502 });
  }
}
