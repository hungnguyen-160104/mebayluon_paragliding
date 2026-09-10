"use client";

/**
 * CHỌN MÔ HÌNH & SO SÁNH 2–3 MÔ HÌNH cạnh nhau — dùng chung cho sổ nội bộ và
 * trang khách (khác nhau ở cách gọi API, nên nhận `fetcher` từ ngoài).
 *
 * Vì sao so sánh chứ không chỉ chọn: một mô hình nói "chiều gió 3 m/s" thì
 * người đọc tin ngay; ba mô hình mà một cái nói 3, một cái nói 8 thì người đọc
 * biết buổi chiều CHƯA CHẮC — đó mới là thông tin quyết định gọi khách sớm hay
 * đợi. Hàng "Đồng thuận" ở cuối bảng nói đúng điều đó cho từng giờ.
 */

import { useEffect, useMemo, useState } from "react";

import { MO_HINH, MO_HINH_MAC_DINH } from "@/lib/baobay/mo-hinh";
import type { MucDo } from "@/lib/baobay/thoi-tiet";

type GioMin = { gio: string; gio10m: number; giat: number; mua: number; muc: MucDo; lyDo?: string[] };
type NgayMin = { ngay: string; muc: MucDo; gioMax: number; giatMax: number; muaTong: number; khungDep: string | null; gio: GioMin[] };

export type KetQuaMoHinh = { ma: string; ten: string; nhan: string; ngay: NgayMin[] };

const MAU_O: Record<MucDo, string> = {
  xanh: "bg-emerald-400 text-emerald-950",
  vang: "bg-amber-300 text-amber-950",
  do: "bg-rose-400 text-white",
};

const MAU_NGAY: Record<MucDo, string> = {
  xanh: "bg-emerald-100 text-emerald-900",
  vang: "bg-amber-100 text-amber-900",
  do: "bg-rose-100 text-rose-900",
};

/* ------------------------------------------------------------------ */
/* Nút chọn mô hình (một mô hình) + bật so sánh                       */
/* ------------------------------------------------------------------ */

export function ChonMoHinh({
  dangChon,
  onChon,
  soSanh,
  onSoSanh,
  nho = false,
}: {
  dangChon: string;
  onChon: (ma: string) => void;
  soSanh: boolean;
  onSoSanh: (bat: boolean) => void;
  nho?: boolean;
}) {
  const cls = nho ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]";
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className={"font-bold text-slate-500 " + (nho ? "text-[10px]" : "text-[11px]")}>Mô hình:</span>
      {MO_HINH.map((m) => (
        <button
          key={m.ma}
          type="button"
          title={m.mo}
          onClick={() => onChon(m.ma)}
          className={
            "rounded-lg border font-bold " +
            cls +
            " " +
            (dangChon === m.ma && !soSanh ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-slate-700")
          }
        >
          {m.ten}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onSoSanh(!soSanh)}
        title="Đặt 2–3 mô hình cạnh nhau, xem chúng đồng ý ở giờ nào"
        className={
          "ml-1 rounded-lg border font-bold " +
          cls +
          " " +
          (soSanh ? "border-violet-600 bg-violet-600 text-white" : "border-violet-300 bg-violet-50 text-violet-800")
        }
      >
        ⇄ So sánh
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bảng so sánh                                                        */
/* ------------------------------------------------------------------ */

export function SoSanhMoHinh({
  ngayChon,
  onChonNgay,
  fetcher,
  homNay,
}: {
  /** "YYYY-MM-DD" đang xem — bảng giờ so sánh theo ngày này. */
  ngayChon: string | null;
  onChonNgay?: (d: string) => void;
  /** Gọi API cho một mô hình — nội bộ và trang khách đưa hàm khác nhau. */
  fetcher: (ma: string) => Promise<{ ngay: NgayMin[]; moHinh: string }>;
  homNay: string;
}) {
  /** Mặc định ba mô hình đầu — ECMWF · GFS · ICON là bộ ba hay được đối chiếu nhất. */
  const [chon, setChon] = useState<string[]>([MO_HINH_MAC_DINH, "gfs", "icon"]);
  const [ket, setKet] = useState<Record<string, KetQuaMoHinh | "loi" | undefined>>({});
  const [dangTai, setDangTai] = useState(false);

  useEffect(() => {
    let huy = false;
    (async () => {
      setDangTai(true);
      /** Gọi SONG SONG những mô hình chưa có — bấm thêm mô hình thứ ba không phải chờ hai cái cũ. */
      const thieu = chon.filter((ma) => !ket[ma]);
      await Promise.all(
        thieu.map(async (ma) => {
          try {
            const r = await fetcher(ma);
            const mh = MO_HINH.find((x) => x.ma === ma);
            if (!huy) setKet((k) => ({ ...k, [ma]: { ma, ten: mh?.ten ?? ma, nhan: r.moHinh, ngay: r.ngay } }));
          } catch {
            if (!huy) setKet((k) => ({ ...k, [ma]: "loi" }));
          }
        }),
      );
      if (!huy) setDangTai(false);
    })();
    return () => {
      huy = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chon.join(",")]);

  const ds = useMemo(() => chon.map((ma) => ket[ma]).filter((x): x is KetQuaMoHinh => Boolean(x) && x !== "loi"), [chon, ket]);
  const gioBang = useMemo(() => {
    if (!ngayChon || !ds.length) return [];
    /** Trục giờ lấy từ mô hình đầu; các mô hình khác tra theo mốc giờ. */
    return ds[0].ngay.find((n) => n.ngay === ngayChon)?.gio.filter((g) => {
      const h = Number(g.gio.slice(11, 13));
      return h >= 6 && h <= 18;
    }) ?? [];
  }, [ds, ngayChon]);

  const oCua = (m: KetQuaMoHinh, gio: string) => m.ngay.find((n) => n.ngay === gio.slice(0, 10))?.gio.find((g) => g.gio === gio);

  /** Đồng thuận từng giờ: cùng màu → màu đó; khác nhau → "?" */
  const dongThuan = (gio: string): MucDo | "lech" => {
    const muc = ds.map((m) => oCua(m, gio)?.muc).filter(Boolean) as MucDo[];
    if (!muc.length) return "lech";
    return muc.every((x) => x === muc[0]) ? muc[0] : "lech";
  };
  const soLech = gioBang.filter((g) => dongThuan(g.gio) === "lech").length;
  const gioLech = gioBang.filter((g) => dongThuan(g.gio) === "lech").map((g) => g.gio.slice(11, 13) + "h");

  const doiChon = (ma: string) =>
    setChon((c) => (c.includes(ma) ? (c.length > 1 ? c.filter((x) => x !== ma) : c) : c.length >= 3 ? [...c.slice(1), ma] : [...c, ma]));

  return (
    <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50/50 p-2">
      <div className="flex flex-wrap items-center gap-1 text-[11px]">
        <span className="font-bold text-violet-900">So sánh (chọn 2–3):</span>
        {MO_HINH.map((m) => (
          <button
            key={m.ma}
            type="button"
            title={m.mo}
            onClick={() => doiChon(m.ma)}
            className={
              "rounded-lg border px-2 py-0.5 font-bold " +
              (chon.includes(m.ma) ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white text-slate-600")
            }
          >
            {m.ten}
          </button>
        ))}
        {dangTai && <span className="text-slate-500">đang lấy…</span>}
      </div>

      {/* ---- 7 ngày × mô hình: nhìn ngày nào các mô hình cãi nhau ---- */}
      {ds.length > 0 && (
        <div className="mt-2 overflow-x-auto overscroll-x-contain">
          <table className="border-separate border-spacing-0.5 text-center text-[10px]">
            <thead>
              <tr>
                <th className="pr-1 text-left font-bold text-slate-500">Ngày</th>
                {ds[0].ngay.map((n) => (
                  <th key={n.ngay} className="font-bold text-slate-700">
                    <button
                      type="button"
                      onClick={() => onChonNgay?.(n.ngay)}
                      className={"rounded px-1 " + (n.ngay === ngayChon ? "bg-sky-600 text-white" : "hover:bg-slate-200")}
                    >
                      {n.ngay === homNay ? "Nay" : n.ngay.slice(8, 10) + "/" + n.ngay.slice(5, 7)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ds.map((m) => (
                <tr key={m.ma}>
                  <th className="pr-1 text-left font-bold text-slate-700" title={m.nhan}>
                    {m.ten}
                  </th>
                  {ds[0].ngay.map((n0) => {
                    const n = m.ngay.find((x) => x.ngay === n0.ngay);
                    return (
                      <td key={n0.ngay} className={"rounded px-1 py-0.5 font-bold " + (n ? MAU_NGAY[n.muc] : "bg-slate-100 text-slate-400")}
                        title={n ? `gió ${n.gioMax.toFixed(1)} · giật ${n.giatMax.toFixed(1)} m/s · mưa ${n.muaTong.toFixed(1)}mm${n.khungDep ? ` · đẹp ${n.khungDep}` : ""}` : "không có"}>
                        {n ? n.gioMax.toFixed(1) : "–"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- Bảng giờ của ngày đang chọn ---- */}
      {ngayChon && gioBang.length > 0 && (
        <div className="mt-2 overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[520px] border-separate border-spacing-0.5 text-center text-[10px]">
            <thead>
              <tr>
                <th className="pr-1 text-left font-bold text-slate-500">
                  {ngayChon.slice(8, 10)}/{ngayChon.slice(5, 7)}
                </th>
                {gioBang.map((g) => (
                  <th key={g.gio} className="font-bold text-slate-700">
                    {g.gio.slice(11, 13)}h
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ds.map((m) => (
                <tr key={m.ma}>
                  <th className="pr-1 text-left font-bold text-slate-700">{m.ten}</th>
                  {gioBang.map((g0) => {
                    const g = oCua(m, g0.gio);
                    return (
                      <td
                        key={g0.gio}
                        title={g ? [`gió ${g.gio10m.toFixed(1)} · giật ${g.giat.toFixed(1)} m/s`, g.mua > 0.1 ? `mưa ${g.mua.toFixed(1)}mm` : "", ...(g.lyDo ?? [])].filter(Boolean).join(" · ") : "không có"}
                        className={"rounded px-0.5 py-1 font-black " + (g ? MAU_O[g.muc] : "bg-slate-100 text-slate-400")}
                      >
                        {g ? g.gio10m.toFixed(1) : "–"}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <th className="pr-1 text-left font-bold text-violet-900" title="Các mô hình có cùng kết luận cho giờ này không">
                  Đồng thuận
                </th>
                {gioBang.map((g) => {
                  const dt = dongThuan(g.gio);
                  return (
                    <td
                      key={g.gio}
                      className={
                        "rounded px-0.5 py-0.5 font-black " +
                        (dt === "lech" ? "bg-violet-200 text-violet-900" : MAU_O[dt])
                      }
                      title={dt === "lech" ? "Các mô hình KHÔNG đồng ý — giờ này chưa chắc" : "Mọi mô hình cùng kết luận"}
                    >
                      {dt === "lech" ? "?" : dt === "xanh" ? "✔" : dt === "vang" ? "⚠" : "✕"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
          {/**
           * Câu kết cho người không đọc bảng: bao nhiêu giờ đồng thuận, lệch ở
           * đâu, và việc nên làm. Đây là lý do có tính năng so sánh.
           */}
          <div className="mt-1 text-[11px] font-semibold text-violet-950">
            {ds.length < 2
              ? "Chọn thêm mô hình để so."
              : soLech === 0
                ? `✔ ${ds.length} mô hình đồng thuận cả ${gioBang.length} giờ — dự báo chắc, chốt lịch được.`
                : soLech <= 3
                  ? `${ds.length} mô hình lệch nhau ${soLech} giờ (${gioLech.join(", ")}) — phần còn lại chắc; riêng mấy giờ đó gọi lại khách sát ngày.`
                  : `⚠ ${ds.length} mô hình lệch nhau tới ${soLech}/${gioBang.length} giờ (${gioLech.slice(0, 5).join(", ")}${gioLech.length > 5 ? "…" : ""}) — dự báo ngày này CHƯA CHẮC, đừng chốt sớm.`}
          </div>
        </div>
      )}
    </div>
  );
}
