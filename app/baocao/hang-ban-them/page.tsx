// app/baocao/hang-ban-them/page.tsx
"use client";

/**
 * SỔ HÀNG BÁN THÊM — áo, khăn, cốm, móc khoá… bán tại bãi.
 *
 * VÌ SAO CÓ TRANG NÀY (chủ chốt 10/09): số hàng bán nằm rải trong báo cáo NGÀY
 * của từng người và từng vai. Muốn biết "tháng này bán mấy cái áo, thu về bao
 * nhiêu, ai bán, tiền mặt ai đang giữ" thì phải mở ba chục báo cáo cộng tay —
 * làm một lần rồi thôi, và tiền hàng lưu niệm không ai đối được với chủ.
 *
 * Ba bảng vì ba câu hỏi khác nhau lúc ngồi chốt:
 *  - THEO MẶT HÀNG: món nào bán chạy, phải nhập thêm gì.
 *  - THEO NGƯỜI BÁN: ai đang giữ bao nhiêu tiền mặt của hàng lưu niệm.
 *  - THEO NGÀY: khi số không khớp thì dò ngược về đúng ngày.
 *
 * TM và CK luôn tách: tiền mặt người bán đang cầm, còn CK đã vào thẳng tài
 * khoản quầy — gộp lại là đòi nhầm người.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { formatDateKeyVN, todayInVN } from "@/lib/baobay/date";
import { formatVND } from "@/lib/pricing";
import { spotName } from "@/lib/baobay/spots";

import { apiGet } from "../components/client-api";
import { useBaobaySession } from "../components/session";
import { Shell } from "../components/Shell";
import { useSpot } from "../components/spot";
import { Card, PageLoading } from "../components/ui";

type Dong = { qty: number; amount: number; cash: number; transfer: number };
type ThongKe = {
  spot: string;
  from: string;
  to: string;
  tong: Dong;
  theoHang: Array<Dong & { key: string; name: string }>;
  theoNguoi: Array<Dong & { username: string; name: string }>;
  theoNgay: Array<Dong & { date: string }>;
};

/** Ba mốc thời gian hay dùng khi chốt; "tự chọn" cho những lần đối chiếu lẻ. */
type Ky = "ngay" | "thang" | "thangTruoc" | "tuChon";

function dauThang(d: string): string {
  return `${d.slice(0, 7)}-01`;
}

function thangTruoc(d: string): { from: string; to: string } {
  const [y, m] = [Number(d.slice(0, 4)), Number(d.slice(5, 7))];
  const y0 = m === 1 ? y - 1 : y;
  const m0 = m === 1 ? 12 : m - 1;
  const cuoi = new Date(Date.UTC(y0, m0, 0)).getUTCDate();
  const mm = String(m0).padStart(2, "0");
  return { from: `${y0}-${mm}-01`, to: `${y0}-${mm}-${cuoi}` };
}

export default function TrangHangBanThem() {
  const { user, loading } = useBaobaySession();
  const { spot, setSpot, options } = useSpot(user?.spots);
  const homNay = todayInVN();

  const [ky, setKy] = useState<Ky>("thang");
  const [from, setFrom] = useState(dauThang(homNay));
  const [to, setTo] = useState(homNay);
  const [du, setDu] = useState<ThongKe | null>(null);
  const [dangTai, setDangTai] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  /** Bấm mốc thời gian thì đổi luôn hai ô ngày — người dùng vẫn thấy mình đang xem dải nào. */
  const chonKy = (k: Ky) => {
    setKy(k);
    if (k === "ngay") {
      setFrom(homNay);
      setTo(homNay);
    } else if (k === "thang") {
      setFrom(dauThang(homNay));
      setTo(homNay);
    } else if (k === "thangTruoc") {
      const t = thangTruoc(homNay);
      setFrom(t.from);
      setTo(t.to);
    }
  };

  const tai = useCallback(async () => {
    if (!spot) return;
    setDangTai(true);
    setLoi(null);
    try {
      setDu(await apiGet<ThongKe>(`/api/baocao/merch/thong-ke?spot=${spot}&from=${from}&to=${to}`));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không lấy được thống kê");
    } finally {
      setDangTai(false);
    }
  }, [spot, from, to]);

  useEffect(() => {
    void tai();
  }, [tai]);

  /** Số món bán được nhiều nhất — để vẽ thanh so sánh trong bảng mặt hàng. */
  const qtyMax = useMemo(() => Math.max(1, ...(du?.theoHang ?? []).map((h) => h.qty)), [du]);

  if (loading || !user) return <PageLoading />;

  const oTien = (nhan: string, v: number, mau: string, phu?: string) => (
    <div className={`rounded-xl border px-2.5 py-2 ${mau}`}>
      <div className="text-[11px] font-medium">{nhan}</div>
      <div className="text-base font-bold tabular-nums">{formatVND(v)}</div>
      {phu && <div className="text-[11px] opacity-80">{phu}</div>}
    </div>
  );

  return (
    <Shell
      user={user}
      title="Hàng bán thêm"
      subtitle="Áo, khăn, cốm… — số bán theo ngày và theo tháng để chốt với chủ"
    >
      {options.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {options.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpot(s)}
              className={
                "rounded-lg border px-2 py-1 text-xs font-bold " +
                (spot === s ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-slate-700")
              }
            >
              {spotName(s)}
            </button>
          ))}
        </div>
      )}

      <Card
        title="Khoảng thời gian"
        hint="Chốt ngày thì bấm Hôm nay; chốt với chủ cuối tháng thì bấm Tháng này hoặc Tháng trước."
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["ngay", "Hôm nay"],
              ["thang", "Tháng này"],
              ["thangTruoc", "Tháng trước"],
              ["tuChon", "Tự chọn"],
            ] as Array<[Ky, string]>
          ).map(([k, nhan]) => (
            <button
              key={k}
              type="button"
              onClick={() => chonKy(k)}
              className={
                "rounded-lg border px-2.5 py-1 text-xs font-bold " +
                (ky === k ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-slate-700")
              }
            >
              {nhan}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-1 text-xs text-slate-600">
            từ
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => {
                setKy("tuChon");
                setFrom(e.target.value);
              }}
              className="h-8 rounded-lg border border-slate-300 px-1.5 text-xs"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-600">
            đến
            <input
              type="date"
              value={to}
              min={from}
              max={homNay}
              onChange={(e) => {
                setKy("tuChon");
                setTo(e.target.value);
              }}
              className="h-8 rounded-lg border border-slate-300 px-1.5 text-xs"
            />
          </label>
        </div>
      </Card>

      {loi && <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{loi}</p>}
      {dangTai && !du && <p className="mt-2 text-sm text-slate-500">Đang cộng sổ…</p>}

      {du && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 @md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
              <div className="text-[11px] font-medium text-slate-600">Số món đã bán</div>
              <div className="text-base font-bold tabular-nums text-slate-900">{du.tong.qty}</div>
              <div className="text-[11px] text-slate-500">
                {formatDateKeyVN(du.from)} – {formatDateKeyVN(du.to)}
              </div>
            </div>
            {oTien("Doanh thu", du.tong.amount, "border-slate-300 bg-white text-slate-800")}
            {oTien("Tiền mặt — người bán giữ", du.tong.cash, "border-emerald-200 bg-emerald-50 text-emerald-800")}
            {oTien("Chuyển khoản — đã vào tài khoản quầy", du.tong.transfer, "border-indigo-200 bg-indigo-50 text-indigo-800")}
          </div>

          <div className="mt-3 space-y-3 @3xl:grid @3xl:grid-cols-2 @3xl:gap-3 @3xl:space-y-0">
            <Card title="Theo mặt hàng" hint="Món nào bán chạy, món nào phải nhập thêm.">
              {du.theoHang.length === 0 ? (
                <p className="text-sm text-slate-500">Khoảng này chưa bán món nào.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {du.theoHang.map((h) => (
                    <li key={h.key} className="py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{h.name}</span>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-slate-700">×{h.qty}</span>
                        <span className="w-24 shrink-0 text-right text-sm font-bold tabular-nums text-emerald-700">
                          {formatVND(h.amount)}
                        </span>
                      </div>
                      {/* Thanh so sánh: nhìn một cái là thấy món nào chiếm phần lớn, khỏi đọc số. */}
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-sky-400" style={{ width: `${(h.qty / qtyMax) * 100}%` }} />
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        TM {formatVND(h.cash)} · CK {formatVND(h.transfer)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Theo người bán" hint="Cột TM là tiền người đó đang giữ, phải nộp khi chốt.">
              {du.theoNguoi.length === 0 ? (
                <p className="text-sm text-slate-500">Chưa ai khai bán hàng trong khoảng này.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {du.theoNguoi.map((n) => (
                    <li key={n.username} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-1.5">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{n.name}</span>
                      <span className="shrink-0 text-sm tabular-nums text-slate-600">×{n.qty}</span>
                      <span className="w-24 shrink-0 text-right text-sm font-bold tabular-nums text-slate-900">
                        {formatVND(n.amount)}
                      </span>
                      <span className="w-full text-[11px] text-slate-500">
                        TM <strong className="tabular-nums text-emerald-700">{formatVND(n.cash)}</strong> · CK{" "}
                        <strong className="tabular-nums text-indigo-700">{formatVND(n.transfer)}</strong>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="mt-3">
            <Card title="Theo ngày" hint="Số không khớp thì dò ngược về đúng ngày trong sổ báo cáo.">
              {du.theoNgay.length === 0 ? (
                <p className="text-sm text-slate-500">Không có ngày nào bán hàng.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="text-left text-[11px] font-bold text-slate-500">
                        <th className="py-1">Ngày</th>
                        <th className="py-1 text-right">Số món</th>
                        <th className="py-1 text-right">Doanh thu</th>
                        <th className="py-1 text-right">TM</th>
                        <th className="py-1 text-right">CK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {du.theoNgay.map((d) => (
                        <tr key={d.date} className="border-t border-slate-100">
                          <td className="py-1 font-semibold text-slate-800">{formatDateKeyVN(d.date)}</td>
                          <td className="py-1 text-right tabular-nums text-slate-700">{d.qty}</td>
                          <td className="py-1 text-right font-bold tabular-nums text-slate-900">{formatVND(d.amount)}</td>
                          <td className="py-1 text-right tabular-nums text-emerald-700">{formatVND(d.cash)}</td>
                          <td className="py-1 text-right tabular-nums text-indigo-700">{formatVND(d.transfer)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </Shell>
  );
}
