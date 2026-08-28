// app/baocao/thue/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { formatDateKeyVN, todayInVN } from "@/lib/baobay/date";
import type { TaxCandidateDTO, TaxRecordDTO } from "@/services/baobay-tax.service";

import { apiDelete, apiGet, apiPost } from "../components/client-api";
import { useBaobaySession } from "../components/session";
import { Banner, Button, Field, MoneyInput, PageLoading, TextInput } from "../components/ui";
import { Shell } from "../components/Shell";

/**
 * TRANG KẾ TOÁN THUẾ — chỉ vai "tax" (và chủ site) vào được.
 *
 * Quy trình một màn hình: chọn khoảng ngày → nhặt những booking CẦN xuất hoá
 * đơn (không phải khách nào cũng xuất) → soát/sửa hồ sơ từng khách → tải MỘT
 * file Excel đúng cột phần mềm thuế nhận.
 *
 * Máy điền sẵn được nhiều hơn người ta tưởng: họ tên đúng giấy tờ, số CCCD /
 * hộ chiếu và quốc tịch lấy từ HỒ SƠ BẢO HIỂM của chính booking đó — thứ quầy
 * đã nhập rồi, kế toán thuế không phải xin lại của khách.
 */

/** Chép công thức splitVat của máy chủ — xem trước ngay khi gõ, khỏi chờ lưu. */
function splitVat(gross: number, ratePercent: number): { net: number; vat: number } {
  const g = Math.max(0, Math.round(gross));
  const r = Math.max(0, ratePercent) / 100;
  const net = r > 0 ? Math.round(g / (1 + r)) : g;
  return { net, vat: g - net };
}

const vnd = (n: number) => n.toLocaleString("vi-VN");
/** Đầu tháng hiện tại — kỳ soát mặc định của kế toán thuế. */
function firstOfMonth(): string {
  return `${todayInVN().slice(0, 7)}-01`;
}

export default function TaxPage() {
  const { user, loading } = useBaobaySession(["tax", "admin"]);

  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayInVN());
  const [rows, setRows] = useState<TaxCandidateDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** bookingId đang mở bảng sửa hồ sơ. */
  const [editing, setEditing] = useState<string | null>(null);

  /**
   * KHÔNG xoá danh sách cũ trước khi tải (setRows(null) ngay trong effect vừa
   * bị eslint chặn vì gây vẽ lại dây chuyền, vừa làm màn hình nháy trắng mỗi
   * lần bấm Xem) — giữ bảng cũ cho tới khi số mới về.
   */
  const load = useCallback(() => {
    apiGet<{ rows: TaxCandidateDTO[] }>(`/api/baocao/thue?from=${from}&to=${to}`)
      .then((r) => setRows(r.rows))
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được danh sách"));
  }, [from, to]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const picked = useMemo(() => (rows ?? []).filter((r) => r.picked), [rows]);
  const tong = useMemo(() => {
    let gop = 0, net = 0, vat = 0;
    for (const r of picked) {
      const s = splitVat(r.record?.amount ?? 0, r.record?.vatRate ?? 8);
      gop += Math.round(r.record?.amount ?? 0); net += s.net; vat += s.vat;
    }
    return { gop, net, vat };
  }, [picked]);

  if (loading || !user) return <PageLoading />;

  return (
    <Shell
      user={user}
      title="Kế toán thuế"
      subtitle="Nhặt booking cần xuất hoá đơn VAT, soát hồ sơ từng khách, tải file Excel đưa vào phần mềm thuế."
    >
      {/* ---- Khoảng ngày + nút xuất ---- */}
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <Field label="Từ ngày (ngày bay)">
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-2 text-sm" />
        </Field>
        <Field label="Đến ngày">
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-2 text-sm" />
        </Field>
        <Button type="button" onClick={load} className="h-10 bg-slate-700 px-3 text-sm hover:bg-slate-800">
          Xem
        </Button>
        {/* Chọn kỳ nhanh — kế toán thuế làm việc theo tháng là chính */}
        <div className="flex gap-1">
          {([-1, 0] as const).map((lech) => {
            const d = new Date();
            const thang = new Date(d.getFullYear(), d.getMonth() + lech, 1);
            const y = thang.getFullYear();
            const m = String(thang.getMonth() + 1).padStart(2, "0");
            const cuoi = new Date(y, thang.getMonth() + 1, 0).getDate();
            return (
              <button
                key={lech}
                type="button"
                onClick={() => {
                  setFrom(`${y}-${m}-01`);
                  setTo(lech === 0 ? todayInVN() : `${y}-${m}-${String(cuoi).padStart(2, "0")}`);
                }}
                className="h-10 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {lech === 0 ? "Tháng này" : "Tháng trước"}
              </button>
            );
          })}
        </div>
        {/**
         * Tải file bằng thẻ <a> thường — cookie phiên đi kèm, và trình duyệt tự
         * lưu file thay vì nuốt vào fetch. Chỉ hiện khi ĐÃ nhặt ít nhất một hồ
         * sơ: file rỗng đưa vào phần mềm thuế chỉ gây bối rối.
         */}
        {picked.length > 0 && (
          <a
            href={`/api/baocao/thue?from=${from}&to=${to}&export=1`}
            className="ml-auto flex h-10 items-center rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700"
            onClick={() => setNotice(`Đã tải file ${picked.length} hồ sơ — các hồ sơ này sẽ mang dấu "đã xuất".`)}
          >
            ⬇ Xuất Excel ({picked.length} hồ sơ)
          </a>
        )}
      </div>

      {/* ---- Tổng của các hồ sơ đã nhặt ---- */}
      {picked.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 rounded-2xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white">
          <span>{picked.length} hồ sơ sẽ xuất</span>
          <span>Đã thu (gộp): <strong>{vnd(tong.gop)} đ</strong></span>
          <span>Chưa thuế: <strong className="text-emerald-300">{vnd(tong.net)} đ</strong></span>
          <span>Tiền thuế: <strong className="text-amber-300">{vnd(tong.vat)} đ</strong></span>
        </div>
      )}

      {/**
       * BẢNG THEO DÕI THEO NGÀY — các hồ sơ ĐÃ NHẶT trong kỳ, gộp theo ngày
       * bay: mỗi ngày một dòng (số hồ sơ · đã thu · chưa thuế · tiền thuế),
       * chân bảng là tổng cả kỳ. Muốn xem theo tháng thì bấm "Tháng này" /
       * "Tháng trước" ở trên — kỳ chính là khoảng ngày đang chọn.
       */}
      {picked.length > 0 && (
        <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="mb-1 text-sm font-bold text-slate-800">
            Theo dõi xuất thuế theo ngày ({from.split("-").reverse().join("/")} → {to.split("-").reverse().join("/")})
          </p>
          <table className="w-full border-collapse text-sm tabular-nums">
            <thead>
              <tr className="border-b border-slate-300 text-left text-xs text-slate-500">
                <th className="py-1 pr-2 font-semibold">Ngày bay</th>
                <th className="py-1 pr-2 text-right font-semibold">Hồ sơ</th>
                <th className="py-1 pr-2 text-right font-semibold">Đã thu (gộp)</th>
                <th className="py-1 pr-2 text-right font-semibold">Chưa thuế</th>
                <th className="py-1 pr-2 text-right font-semibold">Tiền thuế</th>
                <th className="py-1 text-right font-semibold">Đã vào file</th>
              </tr>
            </thead>
            <tbody>
              {[...picked
                .reduce((m, r) => {
                  const k = r.record?.flightDate || r.flightDate;
                  const cur = m.get(k) ?? { n: 0, gop: 0, net: 0, vat: 0, xuat: 0 };
                  const sv = splitVat(r.record?.amount ?? 0, r.record?.vatRate ?? 8);
                  cur.n += 1;
                  cur.gop += Math.round(r.record?.amount ?? 0);
                  cur.net += sv.net;
                  cur.vat += sv.vat;
                  if (r.record?.exportedAt) cur.xuat += 1;
                  m.set(k, cur);
                  return m;
                }, new Map<string, { n: number; gop: number; net: number; vat: number; xuat: number }>())
                .entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([ngay, t]) => (
                  <tr key={ngay} className="border-b border-slate-100">
                    <td className="py-1 pr-2 font-semibold">{formatDateKeyVN(ngay)}</td>
                    <td className="py-1 pr-2 text-right">{t.n}</td>
                    <td className="py-1 pr-2 text-right">{vnd(t.gop)}</td>
                    <td className="py-1 pr-2 text-right font-semibold text-emerald-700">{vnd(t.net)}</td>
                    <td className="py-1 pr-2 text-right font-semibold text-amber-700">{vnd(t.vat)}</td>
                    <td className="py-1 text-right">
                      {t.xuat === t.n ? (
                        <span className="font-bold text-emerald-700">✓ {t.xuat}/{t.n}</span>
                      ) : (
                        <span className="font-bold text-rose-600">{t.xuat}/{t.n}</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 font-bold">
                <td className="py-1.5 pr-2">TỔNG KỲ</td>
                <td className="py-1.5 pr-2 text-right">{picked.length}</td>
                <td className="py-1.5 pr-2 text-right">{vnd(tong.gop)}</td>
                <td className="py-1.5 pr-2 text-right text-emerald-700">{vnd(tong.net)}</td>
                <td className="py-1.5 pr-2 text-right text-amber-700">{vnd(tong.vat)}</td>
                <td className="py-1.5 text-right">
                  {picked.filter((r) => r.record?.exportedAt).length}/{picked.length}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {error && <div className="mt-2"><Banner tone="error" onClose={() => setError(null)}>{error}</Banner></div>}
      {notice && <div className="mt-2"><Banner tone="success" onClose={() => setNotice(null)}>{notice}</Banner></div>}

      {/* ---- Danh sách booking ---- */}
      {!rows ? (
        <PageLoading label="Đang tải danh sách booking…" />
      ) : rows.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">Không có booking nào trong khoảng ngày này.</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <TaxRow
              key={r.bookingId}
              row={r}
              open={editing === r.bookingId}
              onToggleEdit={() => setEditing((cur) => (cur === r.bookingId ? null : r.bookingId))}
              onChanged={(msg) => {
                setNotice(msg ?? null);
                setEditing(null);
                load();
              }}
            />
          ))}
        </div>
      )}
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Một dòng booking                                                    */
/* ------------------------------------------------------------------ */

function TaxRow({
  row,
  open,
  onToggleEdit,
  onChanged,
}: {
  row: TaxCandidateDTO;
  open: boolean;
  onToggleEdit: () => void;
  onChanged: (msg?: string) => void;
}) {
  const r = row.record;
  const [busy, setBusy] = useState(false);

  async function unpick() {
    if (!window.confirm(`Bỏ hồ sơ thuế của ${row.contactName || row.bookingCode}? Khách này sẽ không vào file xuất nữa.`)) return;
    setBusy(true);
    try {
      await apiDelete(`/api/baocao/thue`, { bookingId: row.bookingId });
      onChanged(`✓ Đã bỏ ${row.contactName || row.bookingCode} khỏi danh sách xuất.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={"rounded-xl border p-2 " + (row.picked ? "border-emerald-400 bg-emerald-50/60" : "border-slate-200 bg-white")}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-mono text-xs text-slate-500">
          {formatDateKeyVN(row.flightDate)} · {row.spotLabel} · #{row.daySeq || "?"}
        </span>
        <strong>{row.contactName || "—"}</strong>
        <span className="text-slate-500">{row.bookingCode}</span>
        <span className="text-slate-500">{row.guestCount} khách</span>
        {r ? (
          (() => {
            /* Đã nhặt: hiện đúng con số SẼ LÊN HOÁ ĐƠN (gộp + tách thuế),
               không phải số của sổ vận hành — hai số có thể khác khi kế toán
               sửa tay số tiền xuất. */
            const sv = splitVat(r.amount, r.vatRate);
            return (
              <span className="tabular-nums text-xs">
                <strong className="text-sm">{vnd(r.amount)} đ</strong>
                <span className="text-emerald-700"> · chưa thuế {vnd(sv.net)}</span>
                <span className="text-amber-700"> · thuế {r.vatRate}% = {vnd(sv.vat)}</span>
              </span>
            );
          })()
        ) : (
          <strong className="tabular-nums">{vnd(row.totalAmount)} đ</strong>
        )}
        {row.status === "cancelled" && <span className="rounded bg-rose-100 px-1.5 text-xs font-bold text-rose-700">ĐÃ HUỶ</span>}
        {r?.exportedAt && (
          <span
            className="rounded bg-amber-200 px-1.5 text-xs font-bold text-amber-900"
            title="Hồ sơ này đã nằm trong một file xuất trước đây — xuất lại là hai hoá đơn cho một khoản thu, kiểm kỹ trước khi giữ trong kỳ này"
          >
            ⚠ đã xuất {formatDateKeyVN(r.exportedAt.slice(0, 10))}
          </span>
        )}
        <span className="ml-auto flex gap-1">
          {row.picked ? (
            <>
              <Button type="button" variant="ghost" className="h-7 bg-white px-2 text-xs" onClick={onToggleEdit}>
                {open ? "Đóng" : "✎ Sửa hồ sơ"}
              </Button>
              <Button type="button" variant="ghost" disabled={busy} className="h-7 border-rose-300 bg-white px-2 text-xs text-rose-700" onClick={unpick}>
                Bỏ
              </Button>
            </>
          ) : (
            <Button type="button" className="h-7 bg-sky-600 px-2.5 text-xs font-bold hover:bg-sky-700" onClick={onToggleEdit}>
              {open ? "Đóng" : "＋ Nhặt xuất thuế"}
            </Button>
          )}
        </span>
      </div>

      {open && <TaxEditor row={row} onDone={onChanged} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bảng sửa hồ sơ                                                      */
/* ------------------------------------------------------------------ */

function TaxEditor({ row, onDone }: { row: TaxCandidateDTO; onDone: (msg?: string) => void }) {
  /** Hồ sơ đã có thì sửa tiếp; chưa có thì bắt đầu từ bản máy gợi ý. */
  const [f, setF] = useState<TaxRecordDTO>(() => ({ ...(row.record ?? row.suggest) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof TaxRecordDTO>(k: K, v: TaxRecordDTO[K]) => setF((p) => ({ ...p, [k]: v }));

  const { net, vat } = splitVat(f.amount, f.vatRate);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await apiPost(`/api/baocao/thue`, { bookingId: row.bookingId, ...f });
      onDone(`✓ Đã lưu hồ sơ thuế của ${f.customerName || row.bookingCode}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setBusy(false);
    }
  }

  const dateCls = "h-10 w-full rounded-lg border border-slate-300 px-2 text-sm";

  return (
    <div className="mt-2 rounded-lg border border-slate-300 bg-white p-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Field label="Ngày thu tiền" hint="Ngày khách trả — thời điểm phải lập hoá đơn">
          <input type="date" value={f.collectDate} onChange={(e) => set("collectDate", e.target.value)} className={dateCls} />
        </Field>
        <Field label="Ngày bay">
          <input type="date" value={f.flightDate} onChange={(e) => set("flightDate", e.target.value)} className={dateCls} />
        </Field>
        <Field label="Ngày huỷ (nếu có)">
          <input type="date" value={f.cancelDate} onChange={(e) => set("cancelDate", e.target.value)} className={dateCls} />
        </Field>
        <Field label="Hình thức thanh toán">
          <select value={f.payMethod} onChange={(e) => set("payMethod", e.target.value)} className={dateCls}>
            <option value="">— chọn —</option>
            <option value="TM">TM</option>
            <option value="CK">CK</option>
            <option value="TM/CK">TM/CK</option>
          </select>
        </Field>

        <Field label="Tên khách hàng" hint="Lấy sẵn từ hồ sơ bảo hiểm — đúng tên trên giấy tờ">
          <TextInput value={f.customerName} onChange={(e) => set("customerName", e.target.value)} className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label="CCCD (khách trong nước)">
          <TextInput value={f.idNumber} onChange={(e) => set("idNumber", e.target.value)} className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label="Số hộ chiếu (khách nước ngoài)">
          <TextInput value={f.passportNo} onChange={(e) => set("passportNo", e.target.value)} className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label="Địa chỉ khách" hint="Khách ngoại ghi tên nước">
          <TextInput value={f.address} onChange={(e) => set("address", e.target.value)} className="h-10 rounded-lg text-sm" />
        </Field>

        <Field label="Tên đơn vị (nếu là công ty)">
          <TextInput value={f.companyName} onChange={(e) => set("companyName", e.target.value)} className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label="Mã số thuế (nếu là công ty)">
          <TextInput value={f.taxCode} onChange={(e) => set("taxCode", e.target.value)} className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label="Số booking">
          <TextInput value={f.bookingCode} onChange={(e) => set("bookingCode", e.target.value)} className="h-10 rounded-lg text-sm" />
        </Field>
        <Field label="Đại lý">
          <TextInput value={f.agency} onChange={(e) => set("agency", e.target.value)} className="h-10 rounded-lg text-sm" />
        </Field>

        <Field label="Số khách xuất hoá đơn">
          <TextInput
            type="number"
            min={0}
            value={String(f.guests || "")}
            onChange={(e) => set("guests", Math.max(0, Math.round(Number(e.target.value) || 0)))}
            className="h-10 rounded-lg text-sm"
          />
        </Field>
        <Field label="Tiền ĐÃ THU (gộp, có thuế)">
          <MoneyInput value={f.amount} onChange={(v) => set("amount", v)} />
        </Field>
        <Field label="Thuế suất VAT" hint="8% tới hết 2026 (diện giảm), hết hạn thì chọn 10%">
          <select value={String(f.vatRate)} onChange={(e) => set("vatRate", Number(e.target.value))} className={dateCls}>
            <option value="8">8%</option>
            <option value="10">10%</option>
            <option value="0">0%</option>
          </select>
        </Field>
        {/* Máy tách sẵn — đúng phép "Thành tiền" trên bảng mẫu: gộp ÷ (1 + thuế) */}
        <Field group label="Máy tự tách">
          <div className="flex h-10 flex-col justify-center rounded-lg border-2 border-emerald-300 bg-emerald-50 px-2 leading-tight">
            <span className="text-xs font-bold text-emerald-800">Chưa thuế: {vnd(net)} đ</span>
            <span className="text-[11px] font-semibold text-amber-700">Tiền thuế: {vnd(vat)} đ</span>
          </div>
        </Field>
      </div>

      <Field label="Ghi chú nội bộ" className="mt-2">
        <TextInput value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="Chỉ kế toán thuế thấy — không vào file xuất" className="h-10 rounded-lg text-sm" />
      </Field>

      {error && <p className="mt-2 text-sm font-bold text-rose-700">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button type="button" disabled={busy} onClick={save} className="h-10 bg-emerald-600 px-4 text-sm font-bold hover:bg-emerald-700">
          {busy ? "Đang lưu…" : row.picked ? "✓ Lưu hồ sơ" : "✓ Nhặt vào danh sách xuất"}
        </Button>
      </div>
    </div>
  );
}
