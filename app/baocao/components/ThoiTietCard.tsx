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
  bieuTuongTroi,
  BIEU_TUONG_MUC,
  chiSoBay,
  huongChu,
  huongTheNao,
  NHAN_SUC_GIAT,
  NHAN_SUC_GIO,
  NHAN_THERMAL,
  sucGiat,
  sucGio,
  suNangMua,
  tranMay,
  type LuatHuong,
  MUA_BAY,
  MUA_DANG_KE,
} from "@/lib/baobay/thoi-tiet";
import { spotName } from "@/lib/baobay/spots";

import { Airgram, Meteogram } from "@/components/weather/Meteogram";
import { styleGiat, styleGio } from "@/components/weather/mau-gio";
import { NhanDinhNgayBay } from "@/components/weather/NhanDinhNgayBay";
import { ChonMoHinh, SoSanhMoHinh } from "@/components/weather/SoSanhMoHinh";
import { MO_HINH_MAC_DINH } from "@/lib/baobay/mo-hinh";
import type { DanhGiaNgay } from "@/lib/baobay/chuyen-gia";
import { WindArrow } from "@/components/weather/WindArrow";
import { LOP_MAC_DINH, LOP_WINDY, WINDY_MODELS, windyEmbedUrl, windyPageUrl } from "@/components/weather/WindyModels";

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
  tot: "😊 bay tốt",
  "han-che": "😐 hạn chế",
  nghi: "😞 nghỉ bay",
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

/** Giật: ba mức, dùng màu CHỮ chứ không tô nền — nền đã dành cho hàng gió. */
/** Giật chỉ đáng chú ý TRÊN 16 m/s (gust mạnh): dưới đó để chữ mờ cho khỏi bắt mắt vô ích. */

/**
 * Mức ĐỎ chỉ có mặt buồn, không có chữ (luật chủ 10/09): "KHÔNG BAY" là câu
 * quá tuyệt đối — mưa có lúc ngớt, phi công vẫn có thể lên. Mặt buồn nói "hôm
 * nay khó", chừa chỗ cho người ở bãi quyết.
 */
const NHAN: Record<MucDo, string> = { xanh: "😊 BAY TỐT", vang: "😐 CÂN NHẮC", do: "😞" };

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
  /** `gon` = bản rút gọn cho trang điều phối: chỉ dải 7 ngày + dòng tóm tắt. */
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
  /** Mô hình đang xem ở bảng chính, và có đang bật bảng so sánh không. */
  const [moHinh, setMoHinh] = useState(MO_HINH_MAC_DINH);
  const [soSanh, setSoSanh] = useState(false);
  /**
   * KIỂU XEM giờ trong ngày: bảng số (Basic) hay biểu đồ (Meteogram) — như hai
   * tab của Windy. Mặc định BASIC: bảng số đọc chính xác từng ô, và phần lớn
   * người trực chỉ cần tra một giờ cụ thể. Ai muốn thấy hình dáng cả ngày thì
   * bấm sang Meteogram.
   */
  const [kieuXem, setKieuXem] = useState<"basic" | "meteogram" | "airgram">("basic");

  const tai = useCallback(
    async (moi = false) => {
      setDangTai(true);
      setLoi(null);
      try {
        const r = await apiGet<DuLieuThoiTiet>(
          `/api/baocao/thoi-tiet?spot=${spot}&model=${moHinh}${moi ? "&moi=1" : ""}`,
        );
        setDu(r);
        setChon((c) => (c && r.ngay.some((n) => n.ngay === c) ? c : (r.ngay[0]?.ngay ?? null)));
      } catch (e: any) {
        setLoi(e?.message || "Không lấy được dự báo");
      } finally {
        setDangTai(false);
      }
    },
    [spot, moHinh],
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
              /* Không khung đẹp thì im, không tuyên bố "không có" — mưa có lúc ngớt, người ở bãi quyết. */
              null
            )}{" "}
            · gió tối đa {homNayCard.gioMax.toFixed(1)} m/s · giật {homNayCard.giatMax.toFixed(1)}
            {/**
             * SỐ TIẾNG MƯA, không phải phần trăm. "Khả năng mưa 93%" bị đọc
             * thành "mưa gần cả ngày"; "mưa ~2 tiếng (13:00–15:00)" thì không
             * ai hiểu nhầm. Mưa từ 0,3 mm/giờ trở xuống không tính (vài hạt, không ướt).
             */}
            {homNayCard.gioMua > 0
              ? ` · mưa ${suNangMua(homNayCard.muaTongThat)} ~${homNayCard.gioMua} tiếng${homNayCard.khungMua ? ` (${homNayCard.khungMua})` : ""}, tổng ${homNayCard.muaTongThat.toFixed(1)}mm`
              : homNayCard.gioMuaBay > 0
                ? ` · mưa bay${homNayCard.khungMuaBay ? ` ${homNayCard.khungMuaBay}` : ""} — bay vẫn bay`
                : " · không mưa"}
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

      {/**
       * NHẬN ĐỊNH NGÀY BAY — nằm TRÊN dải ngày, cho ngày đang chọn.
       *
       * Đây là câu trả lời cho "hôm nay là ngày kiểu gì": oi ổn định ít thermal,
       * bất ổn dễ dông chiều, gió trên cao xé thermal, hay nghịch nhiệt giữ mù
       * tới trưa. Bảng giờ phía dưới là bằng chứng; khối này là kết luận.
       * Bấm ngày khác trên dải thì khối đổi theo.
       */}
      {/* Chọn mô hình + bật so sánh — chỉ ở bản đầy đủ; trang điều phối dùng mặc định cho gọn. */}
      {!gon && (
        <div className="mb-2">
          <ChonMoHinh dangChon={moHinh} onChon={setMoHinh} soSanh={soSanh} onSoSanh={setSoSanh} nho />
        </div>
      )}

      {ngayChon && !gon && <NhanDinhNgayBay ngay={ngayChon} />}
      {gon && ngayChon && <NhanDinhNgayBay ngay={ngayChon} gon />}

      {/* ---- dải 7 ngày ---- */}
      {/* Bảy cột: ô hẹp hơn nhưng vẫn đủ số — hơn hẳn phải cuộn ngang tìm ngày. */}
      <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
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
              title={n.khungDep ? `Giờ đẹp ${n.khungDep}` : undefined}
            >
              <div className="text-[10px] font-bold uppercase">{nhanNgay(n.ngay, homNay)}</div>
              <div className="text-[11px] font-black leading-tight">{n.gioMax.toFixed(1)}</div>
              <div className="text-[9px] leading-tight opacity-80">m/s</div>
              <div className="text-[9px] leading-tight">
                {n.gioXanh > 0 ? `${n.gioXanh}h đẹp` : n.muc === "do" ? "😞" : "hạn chế"}
              </div>
              {n.gioMua > 0 && <div className="text-[9px] leading-tight" title={n.khungMua ?? ""}>☔ {n.gioMua}h</div>}
              {n.xacSuatDongMax >= 20 && <div className="text-[9px] font-bold leading-tight">⚡ {n.xacSuatDongMax}%</div>}
              {/* Điểm chuyên gia 0–100 — con số để so ngày với ngày, mô hình với mô hình. */}
              {(() => {
                const cg = n.chuyenGia as DanhGiaNgay | undefined;
                return cg ? (
                  <div className="text-[10px] font-black leading-tight" title={`Điểm điều kiện bay ${cg.diem}/100 · tin cậy ${cg.doTinCay}%`}>
                    {cg.diem}
                    <span className="font-normal opacity-60">/100</span>
                  </div>
                ) : null;
              })()}
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
          {/**
           * KHỐI VỊ TRÍ — toạ độ bãi, độ cao, mặt trời mọc/lặn của NGÀY ĐANG
           * CHỌN. Mọc/lặn đổi theo mùa (Khau Phạ tháng 6 lặn 18:40, tháng 12
           * mới 17:30 — hơn một tiếng, đúng bằng khoảng còn kịp chuyến cuối hay
           * không), nên lấy thẳng từ mô hình chứ không khai tay.
           */}
          {ngayChon && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
              <span className="font-bold text-slate-800">📍 {du.toaDo.ten}</span>
              <span className="tabular-nums">
                {du.toaDo.lat.toFixed(4)}, {du.toaDo.lon.toFixed(4)}
                {du.toaDo.alt ? ` · cao ${du.toaDo.alt}m` : ""}
              </span>
              <span className="tabular-nums">
                khung bay {String(du.toaDo.gioBay?.[0] ?? 7).padStart(2, "0")}:00–{String(du.toaDo.gioBay?.[1] ?? 17).padStart(2, "0")}:00
              </span>
              {ngayChon.matTroi && (
                <span className="font-semibold text-amber-700">
                  ☀ mọc {ngayChon.matTroi.moc} · lặn {ngayChon.matTroi.lan}
                  {(() => {
                    const p = (x: string) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3, 5));
                    const m = p(ngayChon.matTroi.lan) - p(ngayChon.matTroi.moc);
                    return m > 0 ? ` (ngày dài ${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")})` : "";
                  })()}
                </span>
              )}
            </div>
          )}

          {/* ---- chọn kiểu xem giờ: Basic · Meteogram · Airgram ---- */}
          {ngayChon && (
            <div className="mt-2 flex gap-1">
              {(
                [
                  ["basic", "▦ Basic"],
                  ["meteogram", "📊 Meteogram"],
                  ["airgram", "🪂 Airgram"],
                ] as Array<["basic" | "meteogram" | "airgram", string]>
              ).map(([v, nhan]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setKieuXem(v)}
                  className={
                    "rounded-lg border px-2 py-0.5 text-[11px] font-bold " +
                    (kieuXem === v ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-slate-700")
                  }
                >
                  {nhan}
                </button>
              ))}
            </div>
          )}

          {/**
           * Meteogram và Airgram nhận CẢ DÃY NGÀY và vẽ nối liền: gạt ngang là
           * chạy tiếp sang ngày sau, không phải bấm ngày ở dải trên (luật chủ
           * 10/09). Hai chiều đồng bộ: bấm dải trên thì biểu đồ trượt tới, gạt
           * biểu đồ thì dải trên sáng theo.
           */}
          {ngayChon &&
            (kieuXem === "meteogram" ? (
              <Meteogram ngay={du.ngay} altBai={du.toaDo.alt ?? 0} ngayChon={chon} onNgayHien={setChon} />
            ) : kieuXem === "airgram" ? (
              <Airgram ngay={du.ngay} altBai={du.toaDo.alt ?? 0} ngayChon={chon} onNgayHien={setChon} />
            ) : (
              <BangGio ngay={ngayChon} luat={du.toaDo.luatHuong} />
            ))}

          {/* ---- so sánh 2–3 mô hình cho ngày đang chọn ---- */}
          {soSanh && (
            <SoSanhMoHinh
              ngayChon={ngayChon?.ngay ?? null}
              onChonNgay={setChon}
              homNay={homNay}
              fetcher={async (ma) => {
                const r = await apiGet<DuLieuThoiTiet>(`/api/baocao/thoi-tiet?spot=${spot}&model=${ma}`);
                return { ngay: r.ngay, moHinh: r.moHinh };
              }}
            />
          )}

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

/**
 * MŨI TÊN CHỈ HAI MÀU: xanh là bay được, đỏ là không.
 *
 * Điểm ĐÃ khai luật hướng (Khau Phạ) thì màu nói về SƯỜN: xanh khi gió thổi
 * vào sườn, đỏ khi ngược sườn hoặc luồn khe. Điểm CHƯA khai luật (Sa Pa, Đồi
 * Bù) thì không có gì để nói về sườn, nên mượn kết luận của chính giờ đó — vẫn
 * đúng nghĩa "xanh bay được, đỏ thì không", chỉ là căn cứ khác.
 */
function mauMuiTen(the: "tot" | "xau" | "thuong", muc: MucDo): string {
  if (the === "tot") return "text-emerald-600";
  if (the === "xau") return "text-rose-600";
  return muc === "do" ? "text-rose-600" : muc === "vang" ? "text-amber-500" : "text-emerald-600";
}

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
            <th className="border-b border-slate-200 px-1 py-0.5 text-left font-bold text-slate-500" title="Nắng · nắng một phần · âm u · mưa">
              Trời
            </th>
            {gio.map((g) => (
              <td key={g.gio} className="border-b border-slate-200 px-0.5 py-0.5" title={`mây ${Math.round(g.may)}%`}>
                <span className="text-base leading-none">{bieuTuongTroi(g.may, g.mua, g.buXa)}</span>
              </td>
            ))}
          </tr>
          <tr>
            <th className="border-b border-slate-200 px-1 py-0.5 text-left font-bold text-slate-500">Gió m/s</th>
            {gio.map((g) => (
              <td
                key={g.gio}
                title={[NHAN_SUC_GIO[sucGio(g.gio10m)], ...g.lyDo].join(" · ")}
                style={styleGio(g.gio10m)}
                className="border-b border-white px-0.5 py-1 font-black"
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
                {BIEU_TUONG_MUC[g.muc]}
              </td>
            ))}
          </tr>
          {/**
           * ĐIỂM 0–100 từng giờ của chuyên gia. Hàng "Bay?" là luật cấm (được
           * phép hay không); hàng này là chất lượng (bay có ĐẸP không). Hai giờ
           * cùng ✔ có thể là 95 và 58 — khách nên hẹn giờ nào, hàng này trả lời.
           */}
          {(() => {
            const cg = ngay.chuyenGia as DanhGiaNgay | undefined;
            if (!cg) return null;
            const diemCua = (t: string) => cg.gio.find((x) => x.gio === t);
            return (
              <tr>
                <th className="border-b border-slate-200 px-1 py-0.5 text-left font-bold text-slate-500" title="Điểm điều kiện bay 0–100: ≥75 tốt · 55–74 khá · 35–54 hạn chế · <35 không bay">
                  Điểm
                </th>
                {gio.map((g) => {
                  const d = diemCua(g.gio);
                  const v = d?.diem;
                  const mau =
                    v === undefined ? "text-slate-300" : v >= 75 ? "text-emerald-700 font-bold" : v >= 55 ? "text-sky-700 font-bold" : v >= 35 ? "text-amber-700" : "text-rose-700 font-bold";
                  return (
                    <td
                      key={g.gio}
                      className={"border-b border-slate-200 px-0.5 py-0.5 " + mau}
                      title={d ? [...d.nguyHiem, ...d.thanhPhan.map((t) => `${t.ten}: ${t.diem} (${t.ghiChu})`)].join(" · ") : undefined}
                    >
                      {v ?? "–"}
                    </td>
                  );
                })}
              </tr>
            );
          })()}
          <tr>
            <th className="border-b border-slate-200 px-1 py-0.5 text-left font-bold text-slate-500">Giật</th>
            {gio.map((g) => (
              <td
                key={g.gio}
                title={`giật ${NHAN_SUC_GIAT[sucGiat(g.giat)]}`}
                style={styleGiat(g.giat)}
                className="border-b border-slate-200 px-0.5 py-0.5 font-bold"
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
                <WindArrow deg={g.huong} className={mauMuiTen(huongTheNao(g.huong, g.gio10m, luat), g.muc)} />
              </td>
            ))}
          </tr>
          <tr>
            <th className="border-b border-slate-200 px-1 py-0.5 text-left font-bold text-slate-500">Mưa mm</th>
            {gio.map((g) => (
              <td
                key={g.gio}
                className={"border-b border-slate-200 px-0.5 py-0.5 " + (g.mua >= MUA_DANG_KE ? "font-bold text-sky-700" : "text-slate-400")}
                title={g.mua >= MUA_DANG_KE ? "mưa" : g.mua >= MUA_BAY ? "mưa bay — bay vẫn bay" : "từ 0,3 mm trở xuống: coi như không mưa"}
              >
                {g.mua >= MUA_BAY ? g.mua.toFixed(1) : "–"}
              </td>
            ))}
          </tr>
          {/**
           * BỎ HÀNG "% MƯA" (luật chủ 10/09): phần trăm của mô hình là "có mưa ở
           * đâu đó trong ô 25 km", ai đọc cũng hiểu thành "mưa cả ngày". Hàng
           * Mưa mm ở trên nói thẳng: giờ nào, bao nhiêu milimét.
           */}
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
        </tbody>
      </table>
      <div className="mt-1 text-[10px] text-slate-500">
        Ô <strong>Gió</strong> tô theo sức gió: xanh &lt;4 bình thường, tốt (nhạt là dưới 2) · vàng 4–6 hơi mạnh ·
        cam 6–8 mạnh · đỏ &gt;8 rất mạnh. Giật không quyết định bay — chỉ đỏ chữ khi trên 16 (gust mạnh). Mưa: từ 0,3 mm trở xuống
        coi như không mưa, 0,4–0,8 là mưa bay (ghi cho biết), từ 0,8 mới là mưa. Hàng <strong>Bay?</strong> là kết luận cả giờ, đã tính mưa, mù, dông và hướng gió:
        <strong> 😊</strong> bay tốt · <strong>😐</strong> cân nhắc · <strong>😞</strong> không bay. Mũi tên chỉ chiều
        gió thổi tới, tô <span className="font-black text-emerald-600">xanh</span> khi hướng gió tốt cho bãi và{" "}
        <span className="font-black text-rose-600">đỏ</span> khi hướng xấu hoặc gió xiết. Rê chuột vào ô bất kỳ để
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
  /**
   * CHỌN MÔ HÌNH ngay trên bản đồ.
   *
   * Mỗi mô hình đoán khác nhau ở địa hình núi, và chỗ chúng KHÔNG đồng ý với
   * nhau chính là chỗ dự báo còn mong manh. Bấm qua lại hai ba mô hình cho cùng
   * một ngày là cách nhanh nhất biết nên tin đến đâu.
   */
  const [moHinh, setMoHinh] = useState("ecmwf");
  const [lop, setLop] = useState(LOP_MAC_DINH);
  return (
    <div className="mt-1">
      {/**
       * CHỌN LỚP — "soi mây, soi mù" là thứ dân bay dùng nhiều thứ hai sau gió.
       * Con số "mây thấp 80%" không nói được mây ấy ở độ cao nào so với bãi;
       * lớp Trần mây và Tầm nhìn thì nhìn hình là biết sáng mai núi có bị trùm.
       */}
      <div className="mb-1 flex flex-wrap items-center gap-1">
        <span className="text-[10px] font-bold text-slate-500">Lớp:</span>
        {LOP_WINDY.map((l) => (
          <button
            key={l.ma}
            type="button"
            title={l.mo}
            onClick={() => setLop(l.ma)}
            className={
              "rounded-lg border px-1.5 py-0.5 text-[10px] font-bold " +
              (lop === l.ma ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700")
            }
          >
            {l.ten}
          </button>
        ))}
      </div>
      <div className="mb-1 flex flex-wrap gap-1">
        {WINDY_MODELS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMoHinh(m.id)}
            title={m.mo}
            className={
              "rounded-lg border px-2 py-0.5 text-[11px] font-bold " +
              (moHinh === m.id ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-slate-700")
            }
          >
            {m.ten}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-300">
        <iframe
          /** Đổi `key` theo mô hình để iframe nạp lại — Windy không đọc lại src khi chỉ đổi query. */
          key={`${moHinh}:${lop}`}
          title={`Windy — ${toaDo.ten} (${moHinh}, ${lop})`}
          src={windyEmbedUrl(toaDo.lat, toaDo.lon, moHinh, lop)}
          className="h-[420px] w-full"
          loading="lazy"
        />
      </div>
      {/**
       * MỞ WINDY GỐC: khung nhúng chỉ có bảng Basic (đã dò thật — mọi tham số
       * meteogram/airgram đều bị bỏ qua). Ai muốn xem đúng bản Windy thì bấm
       * ra tab mới; còn biểu đồ trong app nằm ở tab Meteogram / Airgram phía
       * trên, vẽ từ cùng số liệu và có thêm mặt bãi, trần mây theo bãi.
       */}
      <div className="mt-1 flex flex-wrap gap-1">
        {(
          [
            ["meteogram", "📊 Meteogram trên Windy ↗"],
            ["airgram", "🪂 Airgram trên Windy ↗"],
          ] as Array<["meteogram" | "airgram", string]>
        ).map(([k, nhan]) => (
          <a
            key={k}
            href={windyPageUrl(toaDo.lat, toaDo.lon, k)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-violet-300 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-800 hover:bg-violet-100"
          >
            {nhan}
          </a>
        ))}
      </div>
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
    { v: "tot", nhan: "😊 Bay tốt", mau: "border-emerald-500 bg-emerald-500 text-white" },
    { v: "han-che", nhan: "😐 Hạn chế", mau: "border-amber-500 bg-amber-500 text-white" },
    { v: "nghi", nhan: "😞 Nghỉ bay", mau: "border-rose-600 bg-rose-600 text-white" },
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
    gioBayTu: String(toaDo.gioBay?.[0] ?? 7),
    gioBayDen: String(toaDo.gioBay?.[1] ?? 17),
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
        gioBayTu: Number(f.gioBayTu),
        gioBayDen: Number(f.gioBayDen),
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

      <div className="mt-2 text-[11px] font-bold text-slate-800">Khung giờ bay của điểm</div>
      <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4">
        {o("gioBayTu", "Bay từ (giờ)", "9")}
        {o("gioBayDen", "Bay đến (giờ)", "16")}
      </div>
      <div className="mt-1 text-[10px] text-slate-500">
        Mọi phép tính theo ngày (khung đẹp, số tiếng mưa, nhận định, điểm) chỉ nhìn trong khung này. Khau Phạ bay 9–16:
        sáng sớm đèo còn mù, 7h đẹp trên giấy nhưng chẳng ai lên bãi.
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
