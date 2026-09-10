"use client";

/**
 * THỜI TIẾT ĐIỂM BAY — thẻ dùng chung cho trang riêng và cho trang điều phối.
 *
 * Ba tầng thông tin, đi từ xa tới gần đúng thứ tự người ta hỏi:
 *  1. Dải 5 NGÀY: hôm nay bay được không, mai kia thế nào — để trả lời khách
 *     đang hỏi đặt lịch.
 *  2. Bảng GIỜ trong ngày đang chọn: đẹp lúc mấy giờ — để xếp ca và hẹn khách.
 *  3. Bản đồ WINDY nhúng đúng toạ độ: nhìn hình mây và luồng gió, thứ mà con
 *     số không nói hết.
 *
 * Màu là ngôn ngữ chính: xanh bay được, vàng cân nhắc, đỏ nghỉ. Mỗi ô đều kèm
 * LÝ DO trong tooltip — cảnh báo không nói vì sao thì người trực sẽ bỏ qua.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import type { MucDo, NgayThoiTiet, NguongBay, ToaDoDiemBay } from "@/lib/baobay/thoi-tiet";
import {
  chiSoBay,
  huongChu,
  huongTheNao,
  muiTenGio,
  NHAN_SUC_GIAT,
  NHAN_SUC_GIO,
  NHAN_THERMAL,
  sucGiat,
  sucGio,
  tranMay,
  type LuatHuong,
  type SucGio,
} from "@/lib/baobay/thoi-tiet";
import { spotName } from "@/lib/baobay/spots";

import { apiGet, apiPost, apiPut } from "./client-api";

export type ChamNgay = {
  date: string;
  verdict?: "tot" | "han-che" | "nghi";
  note: string;
  /** Dự báo chủ ghi TRƯỚC ngày đó — cái máy học nghề. */
  forecast?: "tot" | "han-che" | "nghi";
  forecastWindow?: string;
  forecastNote?: string;
  forecastBy?: string;
  machineVerdict?: MucDo;
  windMax?: number;
  gustMax?: number;
  rainTotal?: number;
  markedBy: string;
};

export type NgayGiong = {
  ngay: string;
  ket: "tot" | "han-che" | "nghi";
  ghiChu?: string;
  gioMax: number;
  giatMax: number;
  muaTong: number;
  khoangCach: number;
};

export type DoChinhXac = {
  soNgay: number;
  mayDung: number;
  chuDung: number;
  soNgayChuDuBao: number;
  mayKhatKheHon: number;
  cau: string[];
};

const NHAN_KET: Record<"tot" | "han-che" | "nghi", string> = {
  tot: "bay tốt",
  "han-che": "hạn chế",
  nghi: "nghỉ bay",
};

export type DuLieuThoiTiet = {
  spot: string;
  toaDo: ToaDoDiemBay;
  nguong: NguongBay;
  ngay: NgayThoiTiet[];
  moHinh: string;
  layLuc: string;
  cham: ChamNgay[];
  hoc: { du: boolean; soLan: number; goiY: Partial<NguongBay>; giaiThich: string[] };
  chinhXac: DoChinhXac;
  /** Ngày cũ giống từng ngày đang hiện, khoá theo "YYYY-MM-DD". */
  giong: Record<string, NgayGiong[]>;
};

/* ------------------------------------------------------------------ */
/* Màu và nhãn                                                         */
/* ------------------------------------------------------------------ */

const MAU_NEN: Record<MucDo, string> = {
  xanh: "bg-emerald-100 text-emerald-900 border-emerald-300",
  vang: "bg-amber-100 text-amber-900 border-amber-300",
  do: "bg-rose-100 text-rose-900 border-rose-300",
};

/** Ô giờ dùng màu ĐẶC hơn: nhìn cả hàng ngang là thấy ngay dải nào bay được. */
const MAU_O: Record<MucDo, string> = {
  xanh: "bg-emerald-400 text-emerald-950",
  vang: "bg-amber-300 text-amber-950",
  do: "bg-rose-400 text-white",
};

/**
 * MÀU RIÊNG CHO Ô GIÓ — theo thang sức gió của chủ điểm bay, không theo màu
 * kết luận của cả giờ.
 *
 * Hai thang nói hai chuyện và đều cần: màu kết luận trả lời "giờ này bay được
 * không" (đã gộp mưa, mù, dông, hướng), còn màu gió trả lời "gió mạnh cỡ nào"
 * — nhìn dọc hàng gió là thấy cả ngày gió lên xuống ra sao, kể cả khi giờ đó
 * đỏ vì mưa chứ không phải vì gió.
 */
const MAU_GIO: Record<SucGio, string> = {
  nhe: "bg-emerald-200 text-emerald-900",
  vua: "bg-emerald-500 text-white",
  hoiManh: "bg-amber-300 text-amber-950",
  manh: "bg-orange-400 text-white",
  ratManh: "bg-rose-500 text-white",
};

/** Giật: ba mức, dùng màu CHỮ chứ không tô nền — nền đã dành cho hàng gió. */
/** Giật chỉ đáng chú ý từ 14 m/s: dưới đó để chữ mờ cho khỏi bắt mắt vô ích. */
const MAU_GIAT: Record<"nhe" | "vua" | "manh" | "ratManh", string> = {
  nhe: "text-slate-400",
  vua: "text-slate-500",
  manh: "font-bold text-orange-700",
  ratManh: "font-bold text-rose-700",
};

const NHAN: Record<MucDo, string> = { xanh: "BAY TỐT", vang: "CÂN NHẮC", do: "KHÔNG BAY" };

const THU = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function nhanNgay(d: string, homNay: string): string {
  if (d === homNay) return "Hôm nay";
  const t = new Date(`${d}T12:00:00+07:00`);
  return `${THU[t.getDay()]} ${d.slice(8, 10)}/${d.slice(5, 7)}`;
}

/* ------------------------------------------------------------------ */
/* Thẻ chính                                                           */
/* ------------------------------------------------------------------ */

export function ThoiTietCard({
  spot,
  homNay,
  laQuanTri,
  laDieuPhoi,
  /** `gon` = bản rút gọn cho trang điều phối: chỉ dải 5 ngày + dòng tóm tắt. */
  gon = false,
}: {
  spot: string;
  homNay: string;
  laQuanTri?: boolean;
  laDieuPhoi?: boolean;
  gon?: boolean;
}) {
  const [du, setDu] = useState<DuLieuThoiTiet | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [chon, setChon] = useState<string | null>(null);
  const [moBanDo, setMoBanDo] = useState(false);
  const [moCaiDat, setMoCaiDat] = useState(false);

  const tai = useCallback(
    async (moi = false) => {
      setDangTai(true);
      setLoi(null);
      try {
        const r = await apiGet<DuLieuThoiTiet>(`/api/baocao/thoi-tiet?spot=${spot}${moi ? "&moi=1" : ""}`);
        setDu(r);
        setChon((c) => (c && r.ngay.some((n) => n.ngay === c) ? c : (r.ngay[0]?.ngay ?? null)));
      } catch (e: any) {
        setLoi(e?.message || "Không lấy được dự báo");
      } finally {
        setDangTai(false);
      }
    },
    [spot],
  );

  useEffect(() => {
    void tai();
  }, [tai]);

  const ngayChon = useMemo(() => du?.ngay.find((n) => n.ngay === chon) ?? du?.ngay[0] ?? null, [du, chon]);

  if (dangTai && !du) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
        ⛅ Đang lấy dự báo cho {spotName(spot)}…
      </div>
    );
  }

  if (loi && !du) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        ⛅ {loi}
        <button type="button" onClick={() => void tai(true)} className="ml-2 font-bold underline">
          thử lại
        </button>
      </div>
    );
  }

  if (!du) return null;

  const homNayCard = du.ngay.find((n) => n.ngay === homNay) ?? du.ngay[0];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2 sm:p-3">
      {/* ---- đầu thẻ: kết luận hôm nay ---- */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className={"rounded-lg border px-2 py-1 text-sm font-black " + MAU_NEN[homNayCard.muc]}>
          {NHAN[homNayCard.muc]}
        </div>
        <div className="text-xs leading-tight text-slate-700">
          <div className="font-bold text-slate-900">
            {spotName(spot)} · {du.toaDo.ten}
          </div>
          <div>
            {homNayCard.khungDep ? (
              <>
                Giờ đẹp <strong className="text-emerald-700">{homNayCard.khungDep}</strong>
              </>
            ) : (
              <span className="text-rose-700">Hôm nay không có khung giờ đẹp</span>
            )}{" "}
            · gió tối đa {homNayCard.gioMax.toFixed(1)} m/s · giật {homNayCard.giatMax.toFixed(1)}
            {homNayCard.xacSuatMuaMax >= 0 ? ` · khả năng mưa ${homNayCard.xacSuatMuaMax}%` : ""}
            {homNayCard.muaTong > 0.1 ? ` (${homNayCard.muaTong.toFixed(1)}mm)` : ""}
            {homNayCard.xacSuatDongMax >= 20 ? ` · ⚡ dông ${homNayCard.xacSuatDongMax}%` : ""}
            {homNayCard.tranMax ? ` · trần thermal ${homNayCard.tranMax}m` : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void tai(true)}
          className="ml-auto rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-bold text-slate-700"
          title={`Nguồn: ${du.moHinh} · lấy lúc ${new Date(du.layLuc).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`}
        >
          ↻ Làm mới
        </button>
      </div>

      {/* ---- dải 5 ngày ---- */}
      <div className="grid grid-cols-5 gap-1">
        {du.ngay.map((n) => {
          const daCham = du.cham.find((c) => c.date === n.ngay);
          return (
            <button
              key={n.ngay}
              type="button"
              onClick={() => setChon(n.ngay)}
              className={
                "rounded-lg border px-1 py-1 text-center transition " +
                MAU_NEN[n.muc] +
                (n.ngay === ngayChon?.ngay ? " ring-2 ring-sky-500" : "")
              }
              title={n.khungDep ? `Giờ đẹp ${n.khungDep}` : "Không có khung giờ đẹp"}
            >
              <div className="text-[10px] font-bold uppercase">{nhanNgay(n.ngay, homNay)}</div>
              <div className="text-[11px] font-black leading-tight">{n.gioMax.toFixed(1)}</div>
              <div className="text-[9px] leading-tight opacity-80">m/s</div>
              <div className="text-[9px] leading-tight">
                {n.gioXanh > 0 ? `${n.gioXanh}h đẹp` : n.muc === "do" ? "nghỉ" : "hạn chế"}
              </div>
              {n.xacSuatMuaMax >= 50 && <div className="text-[9px] leading-tight">☔ {n.xacSuatMuaMax}%</div>}
              {n.xacSuatDongMax >= 20 && <div className="text-[9px] font-bold leading-tight">⚡ {n.xacSuatDongMax}%</div>}
              {daCham && (
                <div className="text-[9px] font-bold leading-tight" title={`Đã chấm: ${daCham.note || "—"}`}>
                  ✓ đã chấm
                </div>
              )}
            </button>
          );
        })}
      </div>

      {gon ? (
        <div className="mt-1 text-[10px] text-slate-500">
          Nguồn {du.moHinh} · ngưỡng đang dùng: đẹp ≤{du.nguong.gioXanh} · cấm &gt;{du.nguong.gioDo} km/h ·{" "}
          <a href="/baocao/thoi-tiet" className="font-bold text-sky-700 underline">
            xem chi tiết
          </a>
        </div>
      ) : (
        <>
          {/* ---- bảng giờ của ngày đang chọn ---- */}
          {ngayChon && <BangGio ngay={ngayChon} luat={du.toaDo.luatHuong} />}

          {/* ---- Windy nhúng ---- */}
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setMoBanDo((x) => !x)}
              className="rounded-lg border border-sky-300 bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-800"
            >
              {moBanDo ? "▾ Ẩn bản đồ Windy" : "▸ Bản đồ gió Windy"}
            </button>
            {moBanDo && <WindyNhung toaDo={du.toaDo} />}
          </div>

          {/* ---- ngày cũ giống ngày này ---- */}
          {ngayChon && <NgayGiongNhau ds={du.giong?.[ngayChon.ngay] ?? []} />}

          {/* ---- dự báo trước / chấm thực tế ---- */}
          {laDieuPhoi && ngayChon && (
            <ChamKinhNghiem
              spot={spot}
              ngay={ngayChon}
              homNay={homNay}
              daCham={du.cham.find((c) => c.date === ngayChon.ngay) ?? null}
              xong={(moi) => setDu((cu) => (cu ? { ...cu, cham: moi.cham, hoc: moi.hoc, chinhXac: moi.chinhXac } : cu))}
            />
          )}

          {/* ---- máy học được gì ---- */}
          <HocDuoc
            hoc={du.hoc}
            chinhXac={du.chinhXac}
            nguong={du.nguong}
            spot={spot}
            laQuanTri={laQuanTri}
            taiLai={() => void tai(true)}
          />

          {/* ---- cài đặt toạ độ + ngưỡng ---- */}
          {laQuanTri && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setMoCaiDat((x) => !x)}
                className="rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-bold text-slate-700"
              >
                {moCaiDat ? "▾ Đóng cài đặt" : "⚙ Toạ độ & ngưỡng gió"}
              </button>
              {moCaiDat && <CaiDatDiem spot={spot} toaDo={du.toaDo} nguong={du.nguong} xong={() => void tai(true)} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bảng giờ                                                            */
/* ------------------------------------------------------------------ */

/** Mũi tên tô theo hướng: xanh thuận sườn · đỏ ngược sườn hoặc luồn khe · xám chưa rõ. */
const MAU_MUI_TEN: Record<"tot" | "xau" | "thuong", string> = {
  tot: "text-emerald-600",
  xau: "text-rose-600",
  thuong: "text-slate-600",
};

function BangGio({ ngay, luat }: { ngay: NgayThoiTiet; luat?: LuatHuong }) {
  /** Chỉ bày khung giờ bay: 0h–6h và tối thì trời thế nào cũng không dùng tới. */
  const gio = ngay.gio.filter((g) => {
    const h = Number(g.gio.slice(11, 13));
    return h >= 6 && h <= 18;
  });
  if (!gio.length) return null;

  return (
    <div className="mt-2 overflow-x-auto overscroll-x-contain">
      <table className="w-full min-w-[560px] border-collapse text-center text-[10px]">
        <tbody>
          <tr>
            <th className="w-14 border-b border-slate-200 px-1 py-0.5 text-left font-bold text-slate-500">Giờ</th>
            {gio.map((g) => (
              <td key={g.gio} className="border-b border-slate-200 px-0.5 py-0.5 font-bold text-slate-700">
                {g.gio.slice(11, 13)}h
              </td>
            ))}
          </tr>
          <tr>
            <th className="border-b border-slate-200 px-1 py-0.5 text-left font-bold text-slate-500">Gió m/s</th>
            {gio.map((g) => (
              <td
                key={g.gio}
                title={[NHAN_SUC_GIO[sucGio(g.gio10m)], ...g.lyDo].join(" · ")}
                className={"border-b border-white px-0.5 py-1 font-black " + MAU_GIO[sucGio(g.gio10m)]}
              >
                {g.gio10m.toFixed(1)}
              </td>
            ))}
          </tr>
          <tr>
            <th
              className="border-b border-slate-200 px-1 py-0.5 text-left font-bold text-slate-500"
              title="Kết luận cả giờ: đã tính mưa, mù, dông, hướng gió"
            >
              Bay?
            </th>
            {gio.map((g) => (
              <td
                key={g.gio}
                title={g.lyDo.join(" · ")}
                className={"border-b border-white px-0.5 py-0.5 text-[10px] font-bold " + MAU_O[g.muc]}
              >
                {g.muc === "xanh" ? "✔" : g.muc === "vang" ? "⚠" : "✕"}
              </td>
            ))}
          </tr>
          <tr>
            <th className="border-b border-slate-200 px-1 py-0.5 text-left font-bold text-slate-500">Giật</th>
            {gio.map((g) => (
              <td
                key={g.gio}
                title={`giật ${NHAN_SUC_GIAT[sucGiat(g.giat)]}`}
                className={"border-b border-slate-200 px-0.5 py-0.5 " + MAU_GIAT[sucGiat(g.giat)]}
              >
                {g.giat.toFixed(1)}
              </td>
            ))}
          </tr>
          <tr>
            <th className="border-b border-slate-200 px-1 py-0.5 text-left font-bold text-slate-500">Hướng</th>
            {gio.map((g) => (
              <td
                key={g.gio}
                className="border-b border-slate-200 px-0.5 py-0.5"
                title={`gió ${huongChu(g.huong)} (${Math.round(g.huong)}°) — mũi tên chỉ chiều gió thổi tới`}
              >
                <span className={"text-lg font-black leading-none " + MAU_MUI_TEN[huongTheNao(g.huong, g.gio10m, luat)]}>
                  {muiTenGio(g.huong)}
                </span>
              </td>
            ))}
          </tr>
          <tr>
            <th className="border-b border-slate-200 px-1 py-0.5 text-left font-bold text-slate-500">Mưa mm</th>
            {gio.map((g) => (
              <td
                key={g.gio}
                className={"border-b border-slate-200 px-0.5 py-0.5 " + (g.mua > 0.5 ? "font-bold text-sky-700" : "text-slate-400")}
              >
                {g.mua > 0.05 ? g.mua.toFixed(1) : "–"}
              </td>
            ))}
          </tr>
          <tr>
            <th className="border-b border-slate-200 px-1 py-0.5 text-left font-bold text-slate-500" title="Xác suất mưa của mô hình">
              K.năng mưa
            </th>
            {gio.map((g) => {
              const p = g.xacSuatMua;
              return (
                <td
                  key={g.gio}
                  className={"border-b border-slate-200 px-0.5 py-0.5 " + (p !== undefined && p >= 60 ? "font-bold text-sky-800" : "text-slate-500")}
                >
                  {p === undefined ? "–" : `${Math.round(p)}%`}
                </td>
              );
            })}
          </tr>
          <tr>
            <th className="border-b border-slate-200 px-1 py-0.5 text-left font-bold text-slate-500" title="Nguy cơ dông — trên 40% là cấm bay">
              ⚡ Dông
            </th>
            {gio.map((g) => {
              const d = chiSoBay(g).xacSuatDong;
              return (
                <td
                  key={g.gio}
                  className={
                    "border-b border-slate-200 px-0.5 py-0.5 " +
                    (d >= 40 ? "bg-rose-200 font-bold text-rose-900" : d >= 20 ? "bg-amber-100 font-bold text-amber-900" : "text-slate-400")
                  }
                >
                  {d > 0 ? `${d}%` : "–"}
                </td>
              );
            })}
          </tr>
          <tr>
            <th
              className="border-b border-slate-200 px-1 py-0.5 text-left font-bold text-slate-500"
              title="Trần mây trên bãi cất cánh — thấp kèm mây thấp dày nghĩa là mù trùm bãi"
            >
              Trần mây
            </th>
            {gio.map((g) => {
              const cm = tranMay(g.nhietDo, g.diemSuong, g.mayThap, g.chenhDoCao ?? 0);
              const mu = cm !== null && cm < 400 && (g.mayThap ?? 0) >= 70;
              return (
                <td
                  key={g.gio}
                  className={"border-b border-slate-200 px-0.5 py-0.5 " + (mu ? "bg-slate-300 font-bold text-slate-900" : "text-slate-500")}
                  title={g.mayThap !== undefined ? `mây thấp ${Math.round(g.mayThap)}%` : undefined}
                >
                  {cm === null ? "–" : cm >= 1000 ? `${(cm / 1000).toFixed(1)}km` : `${cm}m`}
                </td>
              );
            })}
          </tr>
          <tr>
            <th
              className="border-b border-slate-200 px-1 py-0.5 text-left font-bold text-slate-500"
              title="Thermal: thermal gắt thì dù xóc, khách dễ say"
            >
              Thermal
            </th>
            {gio.map((g) => {
              const c = chiSoBay(g);
              return (
                <td
                  key={g.gio}
                  className={"border-b border-slate-200 px-0.5 py-0.5 " + (c.thermal === "gat" ? "font-bold text-orange-700" : "text-slate-500")}
                  title={[c.onDinh, c.tran ? `trần ~${c.tran}m` : ""].filter(Boolean).join(" · ")}
                >
                  {NHAN_THERMAL[c.thermal]}
                </td>
              );
            })}
          </tr>
          <tr>
            <th className="px-1 py-0.5 text-left font-bold text-slate-500">Mây</th>
            {gio.map((g) => (
              <td key={g.gio} className="px-0.5 py-0.5 text-slate-500">
                {Math.round(g.may)}%
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div className="mt-1 text-[10px] text-slate-500">
        Ô <strong>Gió</strong> tô theo sức gió: xanh nhạt &lt;2 nhẹ · xanh 2–4 vừa · vàng 4–6 hơi mạnh · cam 6–8
        mạnh · đỏ &gt;8 rất mạnh. Hàng <strong>Bay?</strong> là kết luận cả giờ, đã tính mưa, mù, dông và hướng gió:
        <strong> ✔</strong> bay tốt · <strong>⚠</strong> cân nhắc · <strong>✕</strong> không bay. Mũi tên chỉ chiều
        gió thổi tới, tô <span className="font-black text-emerald-600">xanh</span> khi thuận sườn và{" "}
        <span className="font-black text-rose-600">đỏ</span> khi ngược sườn hoặc luồn khe. Rê chuột vào ô bất kỳ để
        xem lý do.
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Windy nhúng                                                         */
/* ------------------------------------------------------------------ */

/**
 * BẢN ĐỒ WINDY đúng toạ độ điểm bay.
 *
 * Nhúng qua `embed2.html` — bản nhúng mở của Windy, không cần khoá API. Chỉ
 * dựng iframe KHI người dùng bấm mở: khung này kéo vài trăm KB và tự chạy hoạt
 * hình, để nó nạp sẵn trên trang điều phối là mỗi lần mở sổ lại tốn pin và
 * mạng của máy ngoài đèo.
 */
function WindyNhung({ toaDo }: { toaDo: ToaDoDiemBay }) {
  const q = new URLSearchParams({
    lat: String(toaDo.lat),
    lon: String(toaDo.lon),
    detailLat: String(toaDo.lat),
    detailLon: String(toaDo.lon),
    zoom: "10",
    level: "surface",
    overlay: "wind",
    product: "ecmwf",
    menu: "",
    message: "true",
    marker: "true",
    calendar: "now",
    pressure: "",
    type: "map",
    location: "coordinates",
    detail: "true",
    metricWind: "km/h",
    metricTemp: "°C",
    radarRange: "-1",
  });
  return (
    <div className="mt-1 overflow-hidden rounded-lg border border-slate-300">
      <iframe
        title={`Windy — ${toaDo.ten}`}
        src={`https://embed.windy.com/embed2.html?${q}`}
        className="h-[420px] w-full"
        loading="lazy"
        frameBorder="0"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chấm kinh nghiệm                                                    */
/* ------------------------------------------------------------------ */

/**
 * CHẤM MỘT NGÀY — đây là chỗ máy học nghề của chủ điểm bay.
 *
 * Chỉ chấm được ngày đã qua (kể cả hôm nay): chấm ngày mai là chấm dự báo, mà
 * cái cần học là QUYẾT ĐỊNH THẬT trước trời thật.
 */
function ChamKinhNghiem({
  spot,
  ngay,
  homNay,
  daCham,
  xong,
}: {
  spot: string;
  ngay: NgayThoiTiet;
  homNay: string;
  daCham: ChamNgay | null;
  xong: (moi: { cham: ChamNgay[]; hoc: DuLieuThoiTiet["hoc"]; chinhXac: DoChinhXac }) => void;
}) {
  /** Ngày chưa tới thì đang NÓI TRƯỚC; ngày đã qua thì đang CHẤM LẠI. */
  const noiTruoc = ngay.ngay > homNay;
  const [ghiChu, setGhiChu] = useState("");
  const [khung, setKhung] = useState("");
  const [dangLuu, setDangLuu] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    setGhiChu(noiTruoc ? (daCham?.forecastNote ?? "") : (daCham?.note ?? ""));
    setKhung(daCham?.forecastWindow ?? "");
  }, [daCham?.note, daCham?.forecastNote, daCham?.forecastWindow, ngay.ngay, noiTruoc]);

  async function gui(v: "tot" | "han-che" | "nghi") {
    setDangLuu(v);
    setLoi(null);
    try {
      const r = await apiPost<{ cham: ChamNgay[]; hoc: DuLieuThoiTiet["hoc"]; chinhXac: DoChinhXac }>(
        `/api/baocao/thoi-tiet?spot=${spot}`,
        noiTruoc
          ? { date: ngay.ngay, forecast: v, window: khung, note: ghiChu }
          : { date: ngay.ngay, verdict: v, note: ghiChu },
      );
      xong(r);
    } catch (e: any) {
      setLoi(e?.message || "Không lưu được");
    } finally {
      setDangLuu(null);
    }
  }

  const nut: Array<{ v: "tot" | "han-che" | "nghi"; nhan: string; mau: string }> = [
    { v: "tot", nhan: "✔ Bay tốt", mau: "border-emerald-500 bg-emerald-500 text-white" },
    { v: "han-che", nhan: "◐ Hạn chế", mau: "border-amber-500 bg-amber-500 text-white" },
    { v: "nghi", nhan: "✕ Nghỉ bay", mau: "border-rose-600 bg-rose-600 text-white" },
  ];

  const dangChon = noiTruoc ? daCham?.forecast : daCham?.verdict;

  return (
    <div className={"mt-2 rounded-lg border px-2 py-1.5 " + (noiTruoc ? "border-violet-200 bg-violet-50/60" : "border-sky-200 bg-sky-50/60")}>
      <div className={"text-[11px] font-bold " + (noiTruoc ? "text-violet-900" : "text-sky-900")}>
        {noiTruoc ? (
          <>
            Ngày {ngay.ngay.slice(8, 10)}/{ngay.ngay.slice(5, 7)} — theo kinh nghiệm anh đoán thế nào?
            {daCham?.forecast && (
              <span className="ml-1 font-normal text-slate-600">(đã ghi bởi {daCham.forecastBy || "—"})</span>
            )}
          </>
        ) : (
          <>
            Ngày {ngay.ngay.slice(8, 10)}/{ngay.ngay.slice(5, 7)} thực tế thế nào?
            {daCham?.verdict && <span className="ml-1 font-normal text-slate-600">(đã chấm bởi {daCham.markedBy || "—"})</span>}
          </>
        )}
      </div>

      {/**
       * Nhắc lại DỰ BÁO ĐÃ GHI ngay lúc chấm thực tế: người chấm nhìn thấy hôm
       * trước mình nghĩ gì, tự đối chiếu được. Đây cũng là chỗ máy lấy cặp
       * (đoán · thật) để đo mình sai lệch ra sao.
       */}
      {!noiTruoc && daCham?.forecast && (
        <div className="mt-0.5 text-[10px] text-slate-600">
          Hôm trước anh đoán: <strong>{NHAN_KET[daCham.forecast]}</strong>
          {daCham.forecastWindow ? ` (${daCham.forecastWindow})` : ""}
          {daCham.forecastNote ? ` — “${daCham.forecastNote}”` : ""}
        </div>
      )}

      <div className="mt-1 flex flex-wrap gap-1">
        {nut.map((n) => (
          <button
            key={n.v}
            type="button"
            disabled={Boolean(dangLuu)}
            onClick={() => void gui(n.v)}
            className={
              "rounded-lg border px-2 py-1 text-[11px] font-bold disabled:opacity-50 " +
              (dangChon === n.v ? n.mau : "border-slate-300 bg-white text-slate-700")
            }
          >
            {dangLuu === n.v ? "…" : n.nhan}
          </button>
        ))}
        {noiTruoc && (
          <input
            value={khung}
            onChange={(e) => setKhung(e.target.value)}
            placeholder="Khung giờ đẹp, vd 07:00-10:00"
            className="h-7 w-[150px] rounded-lg border border-slate-300 px-2 text-[11px] outline-none focus:border-violet-500"
          />
        )}
        <input
          value={ghiChu}
          onChange={(e) => setGhiChu(e.target.value)}
          placeholder={noiTruoc ? "Vì sao anh đoán vậy: gió đông nam, mây cao…" : "Thực tế: gió xuôi sườn cả chiều, mây thấp…"}
          className="h-7 min-w-[180px] flex-1 rounded-lg border border-slate-300 px-2 text-[11px] outline-none focus:border-sky-500"
        />
      </div>
      {loi && <div className="mt-1 text-[11px] font-bold text-rose-700">{loi}</div>}
      <div className="mt-1 text-[10px] text-slate-500">
        {noiTruoc
          ? "Anh đoán trước → qua ngày chấm lại thực tế. Máy giữ cả ba: máy đoán · anh đoán · thực tế, rồi tự đo mình lệch bao nhiêu và lệch về phía nào."
          : "Chấm thực tế là dữ liệu học chắc nhất — máy dò lại ngưỡng gió của riêng điểm này từ đây."}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ngày cũ giống ngày này                                              */
/* ------------------------------------------------------------------ */

/**
 * "NGÀY NHƯ THẾ NÀY, TRƯỚC ĐÂY BAY ĐƯỢC KHÔNG."
 *
 * Cách học hợp với dữ liệu ít và giải thích được: thay vì một con số máy tự
 * tin, nó chìa ra mấy ngày cũ có số gần giống cùng kết quả thật và ghi chú của
 * chính người chấm. Người đọc tự rút kết luận, và thấy rõ máy dựa vào đâu.
 */
function NgayGiongNhau({ ds }: { ds: NgayGiong[] }) {
  if (!ds.length) return null;
  const mau: Record<"tot" | "han-che" | "nghi", string> = {
    tot: "bg-emerald-100 text-emerald-800",
    "han-che": "bg-amber-100 text-amber-900",
    nghi: "bg-rose-100 text-rose-800",
  };
  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
      <div className="text-[11px] font-bold text-slate-700">📒 Ngày cũ giống ngày này</div>
      <div className="mt-1 space-y-0.5">
        {ds.map((n) => (
          <div key={n.ngay} className="flex flex-wrap items-center gap-1 text-[10px] text-slate-600">
            <span className="font-bold text-slate-800">
              {n.ngay.slice(8, 10)}/{n.ngay.slice(5, 7)}
            </span>
            <span className={"rounded px-1 py-0.5 font-bold " + mau[n.ket]}>{NHAN_KET[n.ket]}</span>
            <span>
              gió {n.gioMax.toFixed(1)} · giật {n.giatMax.toFixed(1)} m/s
              {n.muaTong > 0.1 ? ` · mưa ${n.muaTong.toFixed(1)}mm` : ""}
            </span>
            {n.ghiChu && <span className="italic">“{n.ghiChu}”</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Máy học được gì                                                     */
/* ------------------------------------------------------------------ */

function HocDuoc({
  hoc,
  chinhXac,
  nguong,
  spot,
  laQuanTri,
  taiLai,
}: {
  hoc: DuLieuThoiTiet["hoc"];
  chinhXac?: DoChinhXac;
  nguong: NguongBay;
  spot: string;
  laQuanTri?: boolean;
  taiLai: () => void;
}) {
  const [dangApDung, setDangApDung] = useState(false);

  async function apDung() {
    setDangApDung(true);
    try {
      await apiPut(`/api/baocao/thoi-tiet?spot=${spot}`, hoc.goiY);
      taiLai();
    } finally {
      setDangApDung(false);
    }
  }

  return (
    <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50/60 px-2 py-1.5 text-[11px] text-violet-950">
      <div className="font-bold">
        🎓 Ngưỡng đang dùng: đẹp ≤ {nguong.gioXanh} · cấm &gt; {nguong.gioDo} m/s · giật &gt; {nguong.giatDo} m/s · mưa
        &gt; {nguong.muaDo} mm · mù khi trần mây &lt; {nguong.tranMayDo}m
      </div>
      {hoc.giaiThich.map((g, i) => (
        <div key={i} className="mt-0.5 leading-tight">
          • {g}
        </div>
      ))}
      {chinhXac?.cau?.map((c, i) => (
        <div key={`cx${i}`} className="mt-0.5 leading-tight font-semibold">
          • {c}
        </div>
      ))}
      {hoc.du && laQuanTri && (
        <button
          type="button"
          disabled={dangApDung}
          onClick={() => void apDung()}
          className="mt-1 rounded-lg border border-violet-600 bg-violet-600 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50"
        >
          {dangApDung ? "Đang áp dụng…" : "Áp dụng ngưỡng máy học được"}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cài đặt điểm                                                        */
/* ------------------------------------------------------------------ */

function CaiDatDiem({
  spot,
  toaDo,
  nguong,
  xong,
}: {
  spot: string;
  toaDo: ToaDoDiemBay;
  nguong: NguongBay;
  xong: () => void;
}) {
  const [f, setF] = useState({
    lat: String(toaDo.lat),
    lon: String(toaDo.lon),
    alt: String(toaDo.alt ?? ""),
    ten: toaDo.ten,
    huongTu: toaDo.huongThuan ? String(toaDo.huongThuan[0]) : "",
    huongDen: toaDo.huongThuan ? String(toaDo.huongThuan[1]) : "",
    gioXanh: String(nguong.gioXanh),
    gioDo: String(nguong.gioDo),
    giatDo: String(nguong.giatDo),
    muaDo: String(nguong.muaDo),
    tranMayDo: String(nguong.tranMayDo),
  });
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  async function luu() {
    setDangLuu(true);
    setLoi(null);
    try {
      await apiPut(`/api/baocao/thoi-tiet?spot=${spot}`, {
        lat: Number(f.lat),
        lon: Number(f.lon),
        alt: f.alt === "" ? undefined : Number(f.alt),
        ten: f.ten,
        huongTu: f.huongTu === "" ? NaN : Number(f.huongTu),
        huongDen: f.huongDen === "" ? NaN : Number(f.huongDen),
        gioXanh: Number(f.gioXanh),
        gioDo: Number(f.gioDo),
        giatDo: Number(f.giatDo),
        muaDo: Number(f.muaDo),
        tranMayDo: Number(f.tranMayDo),
      });
      xong();
    } catch (e: any) {
      setLoi(e?.message || "Không lưu được");
    } finally {
      setDangLuu(false);
    }
  }

  const o = (k: keyof typeof f, nhan: string, goiY?: string) => (
    <label className="block">
      <span className="text-[10px] font-bold text-slate-500">{nhan}</span>
      <input
        value={f[k]}
        onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))}
        placeholder={goiY}
        className="h-7 w-full rounded-lg border border-slate-300 px-2 text-[11px] outline-none focus:border-sky-500"
      />
    </label>
  );

  return (
    <div className="mt-1 rounded-lg border border-slate-300 bg-slate-50 p-2">
      <div className="text-[11px] font-bold text-slate-800">Chỗ cất cánh</div>
      <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4">
        {o("lat", "Vĩ độ", "21.7546")}
        {o("lon", "Kinh độ", "104.1279")}
        {o("alt", "Độ cao (m)", "1200")}
        {o("ten", "Tên chỗ cất cánh")}
      </div>
      <div className="mt-1 text-[10px] text-slate-500">
        Lấy toạ độ: mở Google Maps, bấm giữ đúng chỗ cất cánh, chép hai số hiện ra. Toạ độ đang dùng là số tra theo bản
        đồ — sửa lại cho đúng bãi thật thì dự báo mới sát, ở núi lệch vài km là khác hẳn gió.
      </div>

      <div className="mt-2 text-[11px] font-bold text-slate-800">Hướng gió cất cánh được (để trống = không xét)</div>
      <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4">
        {o("huongTu", "Từ (độ)", "90")}
        {o("huongDen", "Đến (độ)", "180")}
      </div>
      <div className="mt-1 text-[10px] text-slate-500">
        0 = bắc, 90 = đông, 180 = nam, 270 = tây. Ví dụ sườn hướng đông nam thì để 90 → 180: gió ngoài cung này máy chấm
        đỏ vì thổi ngược sườn.
      </div>

      <div className="mt-2 text-[11px] font-bold text-slate-800">Ngưỡng gió (m/s) và mù</div>
      <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-5">
        {o("gioXanh", "Đẹp khi ≤ (m/s)")}
        {o("gioDo", "Cấm khi > (m/s)")}
        {o("giatDo", "Giật cấm > (m/s)")}
        {o("muaDo", "Mưa cấm (mm)")}
        {o("tranMayDo", "Mù khi trần mây < (m)")}
      </div>
      <div className="mt-1 text-[10px] text-slate-500">
        Gió tính bằng m/s như máy đo tại bãi (4 m/s ≈ 14 km/h · 7 m/s ≈ 25 km/h). Trần mây là độ cao mây trên bãi cất
        cánh — thấp hơn mức này mà mây thấp dày thì máy chấm mù, không bay.
      </div>

      {loi && <div className="mt-1 text-[11px] font-bold text-rose-700">{loi}</div>}
      <button
        type="button"
        disabled={dangLuu}
        onClick={() => void luu()}
        className="mt-2 rounded-lg bg-sky-600 px-3 py-1 text-[11px] font-bold text-white disabled:opacity-50"
      >
        {dangLuu ? "Đang lưu…" : "Lưu cài đặt"}
      </button>
    </div>
  );
}
