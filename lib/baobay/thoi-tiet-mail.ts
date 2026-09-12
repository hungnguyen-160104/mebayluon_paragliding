/**
 * THƯ DỰ BÁO THỜI TIẾT HẰNG NGÀY — soạn nội dung, không gửi.
 *
 * Chủ đặt 11/09: 20h mỗi tối gửi dự báo Viên Nam và Đồi Bù cho HAI NGÀY TỚI,
 * "không gửi quá nhiều ngày vào email". Hai ngày là vừa đúng việc: tối nay
 * chốt lịch mai và xem trước ngày kia để còn nhận khách.
 *
 * Viết thành thư NGẮN, đọc trên điện thoại: mỗi điểm mỗi ngày một khối, câu
 * kết luận lên đầu, số liệu bên dưới, khuyến cáo quan trọng nhất đóng khối.
 * Không nhồi cả bảng giờ — ai cần chi tiết thì bấm sang trang thời tiết.
 *
 * Thuần dựng chuỗi, không mạng: nơi gọi truyền dự báo vào, kiểm bằng phép thử.
 */

import { NHAN_MUC_THERMAL, type TiemNangThermal } from "./thermal";
import { huongDayDuVi, huongTroiNgay, type MucDo, type NgayThoiTiet } from "./thoi-tiet";

export type DiemDuBaoMail = {
  ten: string;
  tinh: string;
  slug: string;
  toaDo: { alt?: number; altHa?: number };
  ngay: NgayThoiTiet[];
};

const NHAN_MUC: Record<MucDo, string> = { xanh: "BAY TỐT", vang: "CÂN NHẮC", do: "NÊN NGHỈ" };
const MAU_MUC: Record<MucDo, string> = { xanh: "#047857", vang: "#b45309", do: "#be123c" };
const NEN_MUC: Record<MucDo, string> = { xanh: "#ecfdf5", vang: "#fffbeb", do: "#fff1f2" };

/** "2026-09-13" → "Thứ 7, 13/09". */
export function nhanNgayVN(ngay: string): string {
  const THU = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const t = new Date(`${ngay}T12:00:00+07:00`);
  return `${THU[t.getDay()]}, ${ngay.slice(8, 10)}/${ngay.slice(5, 7)}`;
}

/**
 * Một dòng số liệu gọn cho một ngày — HAI bản: `html` tô HƯỚNG GIÓ đỏ đậm
 * (chủ 12/09: "gửi mail báo gió thì phải highlight hướng gió màu đỏ cho dễ
 * nhận biết"), `text` viết hoa hướng gió cho hộp thư không hiện HTML.
 */
function dongSo(n: NgayThoiTiet): { html: string; text: string } {
  const huong = huongTroiNgay(n.gio, [6, 18]);
  const th = n.thermal as TiemNangThermal | undefined;
  const tenHuong = huong === null ? "" : huongDayDuVi(huong);
  const gioHtml =
    `Gió ` +
    (tenHuong ? `<b style="color:#b91c1c;background:#fee2e2;padding:0 4px;border-radius:4px">${tenHuong.toUpperCase()}</b> ` : "") +
    `${n.gioMax.toFixed(1)} m/s · giật ${n.giatMax.toFixed(1)}`;
  const gioText = `Gió ${tenHuong ? `${tenHuong.toUpperCase()} ` : ""}${n.gioMax.toFixed(1)} m/s · giật ${n.giatMax.toFixed(1)}`;
  const phan: string[] = [];
  if (n.khungDep) phan.push(`Giờ đẹp ${n.khungDep}`);
  if (th) {
    phan.push(
      `Thermal ${NHAN_MUC_THERMAL[th.muc]} ${th.diem}/100` + (th.khung && th.diem >= 25 ? ` (mạnh nhất ${th.khung})` : ""),
    );
  }
  if (n.gioMua > 0) phan.push(`Mưa ${n.gioMua} giờ${n.khungMua ? ` ${n.khungMua}` : ""} · ${n.muaTongThat.toFixed(1)}mm`);
  else if (n.gioMuaBay > 0) phan.push("Mưa bay — bay vẫn bay");
  else phan.push("Không mưa");
  if (n.xacSuatDongMax >= 20) phan.push(`Dông ${n.xacSuatDongMax}%`);
  const duoi = phan.length ? ` · ${phan.join(" · ")}` : "";
  return { html: gioHtml + duoi, text: gioText + duoi };
}

/** Câu kết luận + khuyến cáo quan trọng nhất (bộ nhận định đã xếp câu xấu nhất lên đầu). */
function loiKhuyen(n: NgayThoiTiet): { tomTat: string; khuyenCao: string[] } {
  const nd = n.nhanDinh as { tomTat?: string; kieuNgay?: string; khuyenCao?: string[] } | undefined;
  return {
    tomTat: nd?.kieuNgay || nd?.tomTat || "",
    khuyenCao: (nd?.khuyenCao ?? []).slice(0, 2),
  };
}

export type ThuThoiTiet = { subject: string; html: string; text: string };

/**
 * Dựng thư cho danh sách điểm và danh sách ngày (thường là mai + ngày kia).
 */
export function thuDuBao(diem: DiemDuBaoMail[], ngayCanGui: string[], trang = "https://www.mebayluon.com/thoi-tiet-bay"): ThuThoiTiet {
  const khoi: string[] = [];
  const dong: string[] = [];

  for (const d of diem) {
    const ngays = ngayCanGui.map((k) => d.ngay.find((n) => n.ngay === k)).filter((n): n is NgayThoiTiet => Boolean(n));
    if (!ngays.length) continue;
    khoi.push(
      `<h2 style="margin:18px 0 6px;font:700 16px/1.3 system-ui,sans-serif;color:#0f172a">${d.ten}` +
        `<span style="font-weight:400;color:#64748b"> — ${d.tinh}` +
        (d.toaDo.alt ? ` · cất ${d.toaDo.alt}m${d.toaDo.altHa !== undefined ? ` → hạ ${d.toaDo.altHa}m` : ""}` : "") +
        `</span></h2>`,
    );
    dong.push(`## ${d.ten} (${d.tinh})`);
    for (const n of ngays) {
      const { tomTat, khuyenCao } = loiKhuyen(n);
      khoi.push(
        `<div style="margin:0 0 8px;padding:8px 10px;border:1px solid #e2e8f0;border-left:4px solid ${MAU_MUC[n.muc]};border-radius:8px;background:${NEN_MUC[n.muc]}">` +
          `<div style="font:700 14px/1.4 system-ui,sans-serif;color:${MAU_MUC[n.muc]}">${nhanNgayVN(n.ngay)} — ${NHAN_MUC[n.muc]}</div>` +
          `<div style="margin-top:2px;font:400 13px/1.5 system-ui,sans-serif;color:#0f172a">${dongSo(n).html}</div>` +
          (tomTat ? `<div style="margin-top:4px;font:600 13px/1.5 system-ui,sans-serif;color:#334155">${tomTat}</div>` : "") +
          (khuyenCao.length
            ? `<ul style="margin:4px 0 0;padding-left:18px;font:400 12px/1.5 system-ui,sans-serif;color:#475569">` +
              khuyenCao.map((k) => `<li>${k}</li>`).join("") +
              `</ul>`
            : "") +
          `</div>`,
      );
      dong.push(`- ${nhanNgayVN(n.ngay)} — ${NHAN_MUC[n.muc]}: ${dongSo(n).text}${tomTat ? ` | ${tomTat}` : ""}`);
      for (const k of khuyenCao) dong.push(`    • ${k}`);
    }
  }

  const tieuDe = `Dự báo bay ${ngayCanGui.map((k) => nhanNgayVN(k)).join(" · ")} — ${diem.map((d) => d.ten).join(" & ")}`;
  const html =
    `<div style="max-width:640px;margin:0 auto;padding:12px">` +
    `<h1 style="margin:0 0 2px;font:700 18px/1.3 system-ui,sans-serif;color:#0f172a">Dự báo thời tiết bay</h1>` +
    `<p style="margin:0 0 10px;font:400 12px/1.5 system-ui,sans-serif;color:#64748b">` +
    `Hai ngày tới, gửi tự động lúc 20h. Số liệu từ mô hình ECMWF cho đúng toạ độ bãi cất cánh.</p>` +
    khoi.join("") +
    `<p style="margin:14px 0 0;font:400 12px/1.6 system-ui,sans-serif;color:#64748b">` +
    `Xem đủ 10 ngày, biểu đồ và giản đồ thám không: <a href="${trang}" style="color:#0369a1">${trang}</a><br>` +
    `Dự báo chỉ để tham khảo — quyết định bay là của phi công tại bãi.</p>` +
    `</div>`;

  return {
    subject: tieuDe,
    html,
    text: ["DỰ BÁO THỜI TIẾT BAY — hai ngày tới", "", ...dong, "", `Chi tiết: ${trang}`].join("\n"),
  };
}
