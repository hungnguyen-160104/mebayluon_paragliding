// app/baocao/cafe/bao-cao/page.tsx
"use client";

/**
 * BÁO CÁO NGÀY CỦA NGƯỜI TRỰC QUẦY CAFE — cùng lối với điều phối bay.
 *
 * Cố ý TÁCH KHỎI trang máy bán (/baocao/cafe): trang bán hàng phải chạy được
 * lúc mất mạng và nhẹ hết mức, còn trang này gọi máy chủ liên tục (số đang
 * giữ, lệnh nộp tiền, yêu cầu nhập hàng). Nhét chung một trang là kéo cả phần
 * offline xuống theo.
 *
 * Bốn khối, đúng thứ tự việc cuối ca:
 *  1. TIỀN BÁN HÀNG — tiền mặt / CK, tự điền theo phiếu máy bán, gõ đè được.
 *  2. THU CHI TẠI QUẦY — mua đá, mua sữa, tiền ship… (khung dùng chung với điều phối).
 *  3. YÊU CẦU NHẬP HÀNG — tên hàng · số lượng · ghi chú, bấm [+ Thêm hàng].
 *  4. NỘP TIỀN / ỨNG TIỀN — khung HandoverBox dùng chung với phi công, điều phối.
 */

import { useCallback, useEffect, useState } from "react";

import { CAFE_COUNTERS, type CafeCounterId } from "@/lib/baobay/cafe";
import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import type { CafeReportDTO, CafeStockRequestDTO } from "@/lib/baobay/types";
import { BACKDATE_LIMIT_DAYS } from "@/lib/baobay/validation";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPost } from "../../components/client-api";
import { DateBar } from "../../components/DateBar";
import { ExpenseRows, toExpenseRows, type ExpenseRow } from "../../components/rows";
import { HandoverBox } from "../../components/HandoverBox";
import { useBaobaySession } from "../../components/session";
import { Shell } from "../../components/Shell";
import { useSpot } from "../../components/spot";
import {
  Banner,
  Button,
  Card,
  DoneTag,
  Field,
  MoneyInput,
  PageLoading,
  TextArea,
  TextInput,
  useDoneFlag,
} from "../../components/ui";

/** Một dòng nhập hàng đang gõ trên trang — `id` rỗng là dòng mới chưa lưu. */
type StockRow = { id: string; name: string; qty: string; note: string; done: boolean; doneBy?: string };

type FormState = {
  counter: CafeCounterId;
  cashReceived: number;
  transferReceived: number;
  expenses: ExpenseRow[];
  stock: StockRow[];
  note: string;
};

const EMPTY_STOCK: StockRow = { id: "", name: "", qty: "", note: "", done: false };

const EMPTY_FORM: FormState = {
  counter: "cafe-1",
  cashReceived: 0,
  transferReceived: 0,
  expenses: [{ content: "", amount: 0, kind: "chi", note: "" }],
  stock: [{ ...EMPTY_STOCK }],
  note: "",
};

function toStockRows(list: CafeStockRequestDTO[]): StockRow[] {
  const rows = list.map((r) => ({ id: r.id, name: r.name, qty: r.qty, note: r.note || "", done: r.done, doneBy: r.doneBy }));
  return rows.length ? rows : [{ ...EMPTY_STOCK }];
}

/** Một dòng nhập hàng còn chờ, kèm chỗ tìm lại nó (báo cáo nào, ngày nào). */
type PendingStock = CafeStockRequestDTO & { reportId: string; date: string; counter: string; staffName: string };

/** Số máy bán của một quầy trong ngày — nguồn để tự điền hai ô tiền. */
type DaySale = { counter: string; counterName: string; cashTotal: number; transferTotal: number; saleCount: number };

export default function CafeReportPage() {
  const { user, loading } = useBaobaySession(["cafe", "accountant", "admin"]);
  const { spot, setSpot, options: spotOptions } = useSpot(user?.spots);

  const today = todayInVN();
  const [date, setDate] = useState(today);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [existing, setExisting] = useState<CafeReportDTO | null>(null);
  const [sales, setSales] = useState<DaySale[]>([]);
  const [locked, setLocked] = useState(false);
  const [closedBy, setClosedBy] = useState("");
  const [loadingDay, setLoadingDay] = useState(false);
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ warnings: string[]; submitted: boolean } | null>(null);
  const [justSaved, flashSaved] = useDoneFlag();
  /** Yêu cầu nhập hàng CÒN CHỜ của mọi ngày, mọi quầy — người đi mua nhìn bảng này. */
  const [pending, setPending] = useState<PendingStock[]>([]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const loadDay = useCallback(
    async (targetDate: string) => {
      if (!spot) return;
      setLoadingDay(true);
      setError(null);
      setSaved(null);
      try {
        const res = await apiGet<{
          report: CafeReportDTO | null;
          sales: DaySale[];
          locked: boolean;
          closedBy?: string;
        }>(`/api/baocao/reports/cafe?date=${targetDate}&spot=${spot}`);
        setExisting(res.report);
        setSales(res.sales || []);
        setLocked(res.locked);
        setClosedBy(res.closedBy || "");
        setForm(
          res.report
            ? {
                counter: (res.report.counter as CafeCounterId) || "cafe-1",
                cashReceived: res.report.cashReceived,
                transferReceived: res.report.transferReceived,
                expenses: toExpenseRows(res.report.expenses),
                stock: toStockRows(res.report.stockRequests),
                note: res.report.note,
              }
            : EMPTY_FORM,
        );
      } catch (err: any) {
        setError(err?.message || "Không tải được số liệu ngày này");
      } finally {
        setLoadingDay(false);
      }
    },
    [spot],
  );

  const loadPending = useCallback(async () => {
    if (!spot) return;
    try {
      const res = await apiGet<{ pending: PendingStock[] }>(`/api/baocao/reports/cafe?stock=1&spot=${spot}`);
      setPending(res.pending || []);
    } catch {
      /* bảng chờ chỉ để tham khảo — hỏng thì trang vẫn nhập báo cáo được */
    }
  }, [spot]);

  useEffect(() => {
    if (user && spot) loadDay(date);
  }, [user, spot, date, loadDay]);

  useEffect(() => {
    if (user && spot) loadPending();
  }, [user, spot, loadPending]);

  /** Bấm "đã nhập" cho một dòng: máy chủ trả lại bảng chờ mới, và mở lại ngày đang xem. */
  async function markDone(row: PendingStock) {
    try {
      const res = await apiPost<{ pending: PendingStock[] }>(`/api/baocao/reports/cafe?spot=${spot}`, {
        action: "stock-done",
        reportId: row.reportId,
        rowId: row.id,
        done: true,
      });
      setPending(res.pending || []);
      if (row.date === date) loadDay(date);
    } catch (err: any) {
      setError(err?.message || "Không đánh dấu được");
    }
  }

  /** Số máy bán của ĐÚNG quầy đang chọn — chỗ lấy số để bấm "lấy số này". */
  const mySale = sales.find((s) => s.counter === form.counter);

  async function save(submit: boolean) {
    setError(null);
    setSaved(null);
    setSaving(submit ? "submit" : "draft");
    try {
      const res = await apiPost<{ report: CafeReportDTO; warnings: string[] }>(
        `/api/baocao/reports/cafe?spot=${spot}`,
        {
          date,
          counter: form.counter,
          cashReceived: form.cashReceived,
          transferReceived: form.transferReceived,
          expenses: form.expenses.filter((e) => e.content.trim() || e.amount),
          stockRequests: form.stock
            .filter((r) => r.name.trim() || r.qty.trim() || r.note.trim())
            .map((r) => ({ id: r.id, name: r.name, qty: r.qty, note: r.note, done: r.done })),
          note: form.note,
          submit,
        },
      );
      setExisting(res.report);
      setForm((prev) => ({
        ...prev,
        expenses: toExpenseRows(res.report.expenses),
        stock: toStockRows(res.report.stockRequests),
      }));
      setSaved({ warnings: res.warnings || [], submitted: res.report.submitted });
      flashSaved();
    } catch (err: any) {
      setError(err?.message || "Không lưu được báo cáo");
    } finally {
      setSaving(null);
    }
  }

  if (loading || !user || !spot) return <PageLoading />;

  const thuTotal = form.expenses.reduce((a, e) => a + (e.kind === "thu" ? e.amount || 0 : 0), 0);
  const chiTotal = form.expenses.reduce((a, e) => a + (e.kind !== "thu" ? e.amount || 0 : 0), 0);

  const setStock = (i: number, patch: Partial<StockRow>) =>
    set("stock", form.stock.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  return (
    <Shell
      user={user}
      title="Báo cáo quầy cafe"
      subtitle="Cuối ca: chốt tiền bán hàng, ghi thu chi tại quầy và yêu cầu nhập hàng."
    >
      <DateBar
        date={date}
        onChange={setDate}
        min={shiftDateKey(today, -BACKDATE_LIMIT_DAYS)}
        loading={loadingDay}
        spot={spot}
        spotOptions={spotOptions}
        onSpotChange={(v) => setSpot(v as never)}
      />

      {locked && (
        <Banner tone="info">
          Ngày {formatDateKeyVN(date)} đã được kế toán{closedBy ? ` (${closedBy})` : ""} chốt — chỉ xem, không sửa được.
        </Banner>
      )}
      {error && <Banner tone="error">{error}</Banner>}
      {saved && (
        <Banner tone={saved.warnings.length ? "warning" : "success"}>
          {saved.submitted ? "Đã chốt báo cáo." : "Đã lưu nháp."}
          {saved.warnings.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {saved.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </Banner>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-3">
          <Card
            title="TIỀN BÁN HÀNG TRONG CA"
            hint="Máy bán đã cộng sẵn — đếm tiền thật ra số khác thì gõ đè, kế toán sẽ thấy chênh và hỏi lại."
          >
            <Field label="Quầy trực" group>
              <div className="flex gap-1.5">
                {CAFE_COUNTERS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={locked}
                    onClick={() => set("counter", c.id)}
                    className={
                      "flex-1 rounded-xl border px-3 py-2 text-sm font-bold " +
                      (form.counter === c.id
                        ? "border-sky-500 bg-sky-600 text-white"
                        : "border-slate-300 bg-white text-slate-600")
                    }
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </Field>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Tiền mặt">
                <MoneyInput value={form.cashReceived} onChange={(v) => set("cashReceived", v)} />
              </Field>
              <Field label="Chuyển khoản">
                <MoneyInput value={form.transferReceived} onChange={(v) => set("transferReceived", v)} />
              </Field>
            </div>

            {mySale && (mySale.cashTotal > 0 || mySale.transferTotal > 0) && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                <span>
                  Máy bán {mySale.counterName}: {mySale.saleCount} phiếu · tiền mặt{" "}
                  <strong className="tabular-nums">{formatVND(mySale.cashTotal)}</strong> · CK{" "}
                  <strong className="tabular-nums">{formatVND(mySale.transferTotal)}</strong>
                </span>
                {!locked &&
                  (form.cashReceived !== mySale.cashTotal || form.transferReceived !== mySale.transferTotal) && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          cashReceived: mySale.cashTotal,
                          transferReceived: mySale.transferTotal,
                        }))
                      }
                      className="ml-auto rounded-lg border border-sky-400 bg-white px-2 py-1 font-bold text-sky-700"
                    >
                      Lấy số máy bán
                    </button>
                  )}
              </div>
            )}

            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="text-xs font-medium text-slate-600">Tổng bán trong ca</div>
              <div className="text-lg font-bold tabular-nums text-slate-900">
                {formatVND(form.cashReceived + form.transferReceived)}
              </div>
            </div>
          </Card>

          <Card
            title="THU CHI TẠI QUẦY"
            hint="Mỗi dòng: nội dung – số tiền – THU/CHI – tiền mặt/CK. VD: mua đá — 50.000đ — Chi — tiền mặt."
          >
            <ExpenseRows
              rows={form.expenses}
              onChange={(rows) => set("expenses", rows)}
              disabled={locked}
              withKind
              withMethod
              hideTotals
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <div className="text-xs font-medium text-emerald-800">Tổng thu</div>
                <div className="text-lg font-bold tabular-nums text-emerald-700">+{formatVND(thuTotal)}</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                <div className="text-xs font-medium text-rose-800">Tổng chi</div>
                <div className="text-lg font-bold tabular-nums text-rose-700">−{formatVND(chiTotal)}</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-3">
          <Card
            title="YÊU CẦU NHẬP HÀNG"
            hint="Hết hàng thì ghi vào đây. Người đi mua mở bảng là thấy, nhập xong bấm “đã nhập” — dòng chưa nhập KHÔNG mất theo ngày."
          >
            <div className="space-y-2">
              {form.stock.map((r, i) => (
                <div
                  key={r.id || `new-${i}`}
                  className={
                    "rounded-xl border p-2 " +
                    (r.done ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white")
                  }
                >
                  <div className="grid grid-cols-1 gap-2 @md:grid-cols-[1fr_7rem]">
                    <Field label="Tên hàng">
                      <TextInput
                        value={r.name}
                        disabled={locked || r.done}
                        placeholder="Sữa đặc, đá cây, cốc giấy…"
                        onChange={(e) => setStock(i, { name: e.target.value })}
                      />
                    </Field>
                    <Field label="Số lượng">
                      {/* Chữ chứ không phải số: quầy ghi "2 thùng", "5kg" — bắt gõ số trần là mất đơn vị */}
                      <TextInput
                        value={r.qty}
                        disabled={locked || r.done}
                        placeholder="2 thùng"
                        onChange={(e) => setStock(i, { qty: e.target.value })}
                      />
                    </Field>
                  </div>
                  <Field label="Ghi chú" className="mt-2">
                    <TextInput
                      value={r.note}
                      disabled={locked || r.done}
                      placeholder="Loại nào, mua ở đâu, cần gấp…"
                      onChange={(e) => setStock(i, { note: e.target.value })}
                    />
                  </Field>
                  <div className="mt-2 flex items-center gap-2">
                    {r.done ? (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                        ĐÃ NHẬP{r.doneBy ? ` · ${r.doneBy}` : ""}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                        chờ nhập
                      </span>
                    )}
                    {!locked && !r.done && (
                      <button
                        type="button"
                        onClick={() => set("stock", form.stock.filter((_, k) => k !== i))}
                        className="ml-auto rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-100"
                      >
                        ✕ Bỏ dòng
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {!locked && (
              <Button
                type="button"
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => set("stock", [...form.stock, { ...EMPTY_STOCK }])}
              >
                ＋ Thêm hàng
              </Button>
            )}
          </Card>

          {pending.length > 0 && (
            <Card
              title={`Đang chờ nhập — ${pending.length} món`}
              hint="Gom từ mọi ngày, mọi quầy trong 45 ngày gần nhất. Mua xong bấm “đã nhập” là dòng rời khỏi bảng."
            >
              <ul className="divide-y divide-slate-100">
                {pending.map((r) => (
                  <li key={`${r.reportId}-${r.id}`} className="flex items-start gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900">
                        {r.name}
                        {r.qty ? <span className="ml-1.5 font-bold text-sky-700">{r.qty}</span> : null}
                      </div>
                      {r.note && <div className="text-xs text-slate-500">{r.note}</div>}
                      <div className="text-[11px] text-slate-400">
                        {formatDateKeyVN(r.date)} · {r.staffName}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => markDone(r)}
                      className="shrink-0 rounded-lg border border-emerald-500 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      ✓ Đã nhập
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Ghi chú">
            <TextArea
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Máy pha hỏng, khách đông bất thường, bàn giao ca…"
              disabled={locked}
            />
          </Card>
        </div>
      </div>

      {!locked && (
        <div className="sticky bottom-3 z-10 mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur">
          <DoneTag show={justSaved} />
          <Button
            type="button"
            variant="ghost"
            onClick={() => save(false)}
            disabled={saving !== null || loadingDay}
            className="flex-1"
          >
            {saving === "draft" ? "Đang lưu…" : "Lưu nháp"}
          </Button>
          <Button
            type="button"
            onClick={() => save(true)}
            disabled={saving !== null || loadingDay}
            className="flex-1 shadow-lg"
          >
            {saving === "submit" ? "Đang chốt…" : existing?.submitted ? "Chốt lại" : "Chốt báo cáo"}
          </Button>
        </div>
      )}

      {/* Nộp tiền cho quản lý + xin ứng tiền — khung dùng chung với phi công, điều phối */}
      <HandoverBox spot={spot} boardDate={date} />
    </Shell>
  );
}
