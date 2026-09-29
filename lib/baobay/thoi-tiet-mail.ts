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
import type { PhanTichGioCao, PhanTichSkewT } from "./phan-tich-cao";

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
 * PHẦN THÊM cho từng (điểm, ngày): phân tích gió trên cao, đọc Skew-T và mã
 * CID của hai ảnh đính kèm (chủ 29/09/2026). Khoá `${slug}|${ngay}`. Thiếu
 * phần nào thì thư bỏ qua phần đó — ảnh vẽ lỗi vẫn gửi được chữ.
 */
export type ChiTietNgay = {
  gioCao?: PhanTichGioCao;
  skewT?: PhanTichSkewT;
  cidGio?: string;
  cidSkewT?: string;
};

const F = "system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
const anh = (cid: string, alt: string) =>
  `<img src="cid:${cid}" alt="${alt}" width="600" style="display:block;width:100%;max-width:600px;height:auto;margin:10px 0 0;border:1px solid #e2e8f0;border-radius:10px">`;

/**
 * Dựng thư cho danh sách điểm và danh sách ngày (thường là mai + ngày kia).
 *
 * BỐ CỤC (chủ 29/09: "cấu trúc email chưa ổn"): NHÓM THEO NGÀY — người nhận
 * đọc để quyết "mai bay đâu", nên đầu thư là bảng tóm tắt ngày × điểm, rồi mỗi
 * ngày một phần, trong đó từng điểm: kết luận → số liệu → gió trên cao →
 * cảnh báo (đỏ) → biểu đồ gió → Skew-T 12h và cách đọc.
 */
export function thuDuBao(
  diem: DiemDuBaoMail[],
  ngayCanGui: string[],
  trang = "https://www.mebayluon.com/thoi-tiet-bay",
  chiTiet: Record<string, ChiTietNgay> = {},
): ThuThoiTiet {
  const khoi: string[] = [];
  const dong: string[] = [];
  const tim = (d: DiemDuBaoMail, k: string) => d.ngay.find((n) => n.ngay === k);

  /* ---- Bảng tóm tắt ---- */
  const oTomTat = (n: NgayThoiTiet | undefined) =>
    n
      ? `<td style="padding:8px 10px;border:1px solid #e2e8f0;background:${NEN_MUC[n.muc]};font:700 13px/1.35 ${F};color:${MAU_MUC[n.muc]}">${NHAN_MUC[n.muc]}` +
        `<div style="font:400 12px/1.4 ${F};color:#334155">${n.khungDep ? `Giờ đẹp ${n.khungDep}` : "Không có giờ đẹp"}</div></td>`
      : `<td style="padding:8px 10px;border:1px solid #e2e8f0;color:#94a3b8">—</td>`;
  khoi.push(
    `<table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%;margin:6px 0 4px">` +
      `<tr><th style="padding:6px 10px;border:1px solid #e2e8f0;background:#f1f5f9;font:700 12px ${F};color:#475569;text-align:left">Ngày</th>` +
      diem.map((d) => `<th style="padding:6px 10px;border:1px solid #e2e8f0;background:#f1f5f9;font:700 12px ${F};color:#475569;text-align:left">${d.ten}</th>`).join("") +
      `</tr>` +
      ngayCanGui
        .map((k) => `<tr><td style="padding:8px 10px;border:1px solid #e2e8f0;font:700 13px ${F};color:#0f172a;white-space:nowrap">${nhanNgayVN(k)}</td>${diem.map((d) => oTomTat(tim(d, k))).join("")}</tr>`)
        .join("") +
      `</table>`,
  );
  dong.push("TÓM TẮT");
  for (const k of ngayCanGui) {
    dong.push(`- ${nhanNgayVN(k)}: ${diem.map((d) => { const n = tim(d, k); return `${d.ten} ${n ? NHAN_MUC[n.muc] : "—"}`; }).join(" · ")}`);
  }

  /* ---- Từng ngày ---- */
  for (const k of ngayCanGui) {
    khoi.push(`<h2 style="margin:22px 0 4px;padding:8px 12px;border-radius:8px;background:#0f172a;font:700 16px/1.3 ${F};color:#ffffff">${nhanNgayVN(k)}</h2>`);
    dong.push("", `=== ${nhanNgayVN(k).toUpperCase()} ===`);
    for (const d of diem) {
      const n = tim(d, k);
      if (!n) continue;
      const ct = chiTiet[`${d.slug}|${k}`] ?? {};
      const { tomTat, khuyenCao } = loiKhuyen(n);
      const canhBao = [...(ct.gioCao?.canhBao ?? []), ...(ct.skewT?.canhBao ?? [])];

      khoi.push(
        `<div style="margin:12px 0 0;padding:12px;border:1px solid #e2e8f0;border-left:5px solid ${MAU_MUC[n.muc]};border-radius:10px;background:#ffffff">` +
          `<div style="font:700 15px/1.35 ${F};color:#0f172a">${d.ten}` +
          `<span style="font-weight:400;color:#64748b"> — ${d.tinh}` +
          (d.toaDo.alt ? ` · cất ${d.toaDo.alt}m${d.toaDo.altHa !== undefined ? ` → hạ ${d.toaDo.altHa}m` : ""}` : "") +
          `</span></div>` +
          `<div style="display:inline-block;margin-top:6px;padding:3px 10px;border-radius:999px;background:${NEN_MUC[n.muc]};font:700 13px ${F};color:${MAU_MUC[n.muc]}">${NHAN_MUC[n.muc]}</div>` +
          `<div style="margin-top:6px;font:400 13px/1.55 ${F};color:#0f172a">${dongSo(n).html}</div>` +
          (tomTat ? `<div style="margin-top:4px;font:600 13px/1.5 ${F};color:#334155">${tomTat}</div>` : "") +
          (khuyenCao.length
            ? `<ul style="margin:4px 0 0;padding-left:18px;font:400 12px/1.55 ${F};color:#475569">${khuyenCao.map((x) => `<li>${x}</li>`).join("")}</ul>`
            : "") +
          (ct.gioCao?.nhanXet.length
            ? `<div style="margin-top:10px;font:700 13px ${F};color:#0f172a">Gió trên cao (8h–16h)</div>` +
              `<ul style="margin:4px 0 0;padding-left:18px;font:400 13px/1.55 ${F};color:#1e293b">${ct.gioCao.nhanXet.map((x) => `<li>${x}</li>`).join("")}</ul>`
            : "") +
          (canhBao.length
            ? `<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:#fff1f2;border:1px solid #fecdd3">` +
              `<div style="font:700 13px ${F};color:#be123c">⚠ Cảnh báo</div>` +
              `<ul style="margin:4px 0 0;padding-left:18px;font:400 13px/1.55 ${F};color:#881337">${canhBao.map((x) => `<li>${x}</li>`).join("")}</ul></div>`
            : "") +
          (ct.cidGio ? anh(ct.cidGio, `Biểu đồ gió theo độ cao ${d.ten} ${nhanNgayVN(k)}`) : "") +
          (ct.cidSkewT ? anh(ct.cidSkewT, `Skew-T 12h ${d.ten} ${nhanNgayVN(k)}`) : "") +
          (ct.skewT?.nhanXet.length
            ? `<div style="margin-top:8px;font:700 13px ${F};color:#0f172a">Đọc Skew-T ${ct.skewT.gio}</div>` +
              `<ul style="margin:4px 0 0;padding-left:18px;font:400 13px/1.55 ${F};color:#1e293b">${ct.skewT.nhanXet.map((x) => `<li>${x}</li>`).join("")}</ul>`
            : "") +
          `</div>`,
      );

      dong.push("", `## ${d.ten} (${d.tinh}) — ${NHAN_MUC[n.muc]}`, dongSo(n).text);
      if (tomTat) dong.push(tomTat);
      for (const x of khuyenCao) dong.push(`  • ${x}`);
      if (ct.gioCao?.nhanXet.length) { dong.push("Gió trên cao:"); for (const x of ct.gioCao.nhanXet) dong.push(`  • ${x}`); }
      if (canhBao.length) { dong.push("⚠ CẢNH BÁO:"); for (const x of canhBao) dong.push(`  ! ${x}`); }
      if (ct.skewT?.nhanXet.length) { dong.push(`Skew-T ${ct.skewT.gio}:`); for (const x of ct.skewT.nhanXet) dong.push(`  • ${x}`); }
    }
  }

  const tieuDe = `Dự báo bay ${ngayCanGui.map((k) => nhanNgayVN(k)).join(" · ")} — ${diem.map((d) => d.ten).join(" & ")}`;
  const html =
    `<div style="max-width:640px;margin:0 auto;padding:12px;background:#f8fafc">` +
    `<h1 style="margin:0 0 2px;font:700 19px/1.3 ${F};color:#0f172a">Dự báo thời tiết bay</h1>` +
    `<p style="margin:0 0 8px;font:400 12px/1.5 ${F};color:#64748b">` +
    `Hai ngày tới, gửi tự động lúc 20h. Mô hình ECMWF cho đúng toạ độ bãi cất cánh.</p>` +
    khoi.join("") +
    `<p style="margin:16px 0 0;font:400 12px/1.6 ${F};color:#64748b">` +
    `Cách đọc biểu đồ gió: mỗi ô là một giờ ở một tầng, mũi tên chỉ hướng gió thổi tới, màu càng đỏ gió càng mạnh.<br>` +
    `Skew-T: đường đỏ là nhiệt độ, xanh là điểm sương, cam đứt nét là bọt khí bốc lên từ bãi cất; hai đường đỏ – xanh sát nhau là ẩm, dễ có mây.<br>` +
    `Xem đủ 10 ngày và giản đồ từng giờ: <a href="${trang}" style="color:#0369a1">${trang}</a><br>` +
    `Dự báo chỉ để tham khảo — quyết định bay là của phi công tại bãi.</p>` +
    `</div>`;

  return {
    subject: tieuDe,
    html,
    text: ["DỰ BÁO THỜI TIẾT BAY — hai ngày tới", "", ...dong, "", `Chi tiết: ${trang}`].join("\n"),
  };
}
