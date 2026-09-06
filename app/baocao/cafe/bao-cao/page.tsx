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

import {
  CAFE_COUNTERS,
  CAFE_SPOT,
  formatStockUnits,
  type CafeCounterId,
  type CafeMenuItem,
} from "@/lib/baobay/cafe";
import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import type { CafeReportDTO, CafeStockRequestDTO } from "@/lib/baobay/types";
import { BACKDATE_LIMIT_DAYS } from "@/lib/baobay/validation";
import { formatVND } from "@/lib/pricing";

import { apiDelete, apiGet, apiPost } from "../../components/client-api";
import { DateBar } from "../../components/DateBar";
import { ExpenseRows, toExpenseRows, type ExpenseRow } from "../../components/rows";
import { HandoverBox } from "../../components/HandoverBox";
import { useBaobaySession } from "../../components/session";
import { Shell } from "../../components/Shell";
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
  counter: "bai-ha",
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
  /**
   * KHÔNG có ô chọn điểm bay: quầy cafe chỉ có ở Khau Phạ (luật chủ 06/09).
   * Bày ra ô chọn rồi ai đó bấm sang Sa Pa là báo cáo rơi vào điểm không có quầy.
   */
  const spot = CAFE_SPOT;

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
                counter: (res.report.counter as CafeCounterId) || "bai-ha",
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

      {/* KIỂM KÊ KHO — nhập bao nhiêu, dùng hết bao nhiêu, còn bao nhiêu */}
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <StockCard onError={setError} />
        <RecipeCard onError={setError} />
      </div>

      {/* Nộp tiền cho quản lý + xin ứng tiền — khung dùng chung với phi công, điều phối */}
      <HandoverBox spot={spot} boardDate={date} />
    </Shell>
  );
}

/* ================================================================== */
/* KHỐI KHO — nhập vào · dùng ra · còn lại                             */
/* ================================================================== */

type StockRowDTO = {
  key: string;
  name: string;
  kind: "packaged" | "ingredient";
  unit: string;
  packName: string;
  packSize: number;
  inUnits: number;
  usedUnits: number;
  usedDiscounted: number;
  remaining: number;
  inText: string;
  usedText: string;
  remainingText: string;
  usedBy: Array<{ name: string; qty: number; sold: number }>;
};

type StockEntryDTO = {
  id: string;
  date: string;
  stockKey: string;
  name: string;
  packs: number;
  packSize: number;
  looseUnits: number;
  units: number;
  unit: string;
  cost: number;
  note: string;
  byName: string;
};

type StockCatalogueItem = {
  key: string;
  name: string;
  kind: "packaged" | "ingredient";
  unit: string;
  packName: string;
  packSize: number;
};

type StockReport = {
  from: string;
  to: string;
  rows: StockRowDTO[];
  missingRecipe: Array<{ id: string; name: string; sold: number }>;
  entries: StockEntryDTO[];
  catalogue: StockCatalogueItem[];
};

/**
 * KIỂM KÊ KHO của một kỳ, mặc định là THÁNG ĐANG XEM.
 *
 * Trả lời đúng câu hỏi của chủ: "tháng 9 nhập 30 thùng bia = 720 lon thì phải
 * bán được tương ứng". Cột NHẬP lấy từ các lần khai nhập hàng, cột DÙNG tính
 * theo định mức của từng món trên phiếu đã bán, cột CÒN là hiệu hai bên.
 *
 * Hai loại hàng chung một bảng: lon bia đếm cái, cà phê bột đong gam. Quy hết
 * về đơn vị gốc rồi mới in ra chữ dễ đọc (1500 g → 1,5 kg).
 */
function StockCard({ onError }: { onError: (m: string) => void }) {
  const today = todayInVN();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<StockReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);

  /** Biểu mẫu khai nhập hàng. */
  const [inDate, setInDate] = useState(today);
  const [inKey, setInKey] = useState("");
  const [inPacks, setInPacks] = useState(0);
  const [inLoose, setInLoose] = useState(0);
  const [inCost, setInCost] = useState(0);
  const [inNote, setInNote] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await apiGet<StockReport>(`/api/baocao/cafe/kho?from=${from}&to=${to}`);
      setData(res);
      if (!inKey && res.catalogue.length) setInKey(res.catalogue[0].key);
    } catch (err: any) {
      onError(err?.message || "Không tải được bảng kho");
    } finally {
      setBusy(false);
    }
    // onError/inKey đổi mỗi lượt vẽ, đưa vào deps là gọi lại vô tận
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const picked = data?.catalogue.find((c) => c.key === inKey);

  async function saveEntry() {
    if (!inKey) return onError("Chưa chọn mặt hàng");
    if (inPacks <= 0 && inLoose <= 0) return onError("Chưa khai số lượng nhập");
    setBusy(true);
    try {
      const res = await apiPost<StockReport>("/api/baocao/cafe/kho", {
        date: inDate,
        stockKey: inKey,
        packs: inPacks,
        looseUnits: inLoose,
        cost: inCost,
        note: inNote,
        from,
        to,
      });
      setData((prev) => ({ ...res, catalogue: prev?.catalogue ?? [] }));
      setInPacks(0);
      setInLoose(0);
      setInCost(0);
      setInNote("");
      setOpenAdd(false);
    } catch (err: any) {
      onError(err?.message || "Không ghi được lần nhập");
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(id: string) {
    if (!window.confirm("Xoá dòng nhập này?")) return;
    try {
      const res = await apiDelete<StockReport>("/api/baocao/cafe/kho", { id, from, to });
      setData((prev) => ({ ...res, catalogue: prev?.catalogue ?? [] }));
    } catch (err: any) {
      onError(err?.message || "Không xoá được dòng nhập");
    }
  }

  return (
    <Card
      title="KHO — nhập vào · dùng ra · còn lại"
      hint="Nhập theo kiện, máy tự quy ra đơn vị lẻ. Cột “dùng” tính theo định mức từng món trên phiếu đã bán."
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-0.5 block text-[11px] font-medium text-slate-500">Từ ngày</span>
          <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9" />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[11px] font-medium text-slate-500">Đến ngày</span>
          <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
        </label>
        <Button type="button" variant="ghost" onClick={() => setOpenAdd((v) => !v)} className="ml-auto h-9">
          {openAdd ? "Đóng" : "＋ Nhập hàng"}
        </Button>
      </div>

      {openAdd && (
        <div className="mt-2 rounded-xl border border-slate-300 bg-slate-50 p-2">
          <div className="grid gap-2 @md:grid-cols-2">
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-medium text-slate-500">Ngày nhập</span>
              <TextInput type="date" value={inDate} onChange={(e) => setInDate(e.target.value)} className="h-9" />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-medium text-slate-500">Mặt hàng</span>
              <select
                value={inKey}
                onChange={(e) => setInKey(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
              >
                {(data?.catalogue ?? []).map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name} ({c.packName} {c.packSize} {c.unit})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-medium text-slate-500">
                Số {picked?.packName ?? "kiện"}
              </span>
              <TextInput
                inputMode="numeric"
                value={inPacks || ""}
                placeholder="30"
                onChange={(e) => setInPacks(Number(e.target.value.replace(/[^\d]/g, "").slice(0, 6)) || 0)}
                className="h-9"
              />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-medium text-slate-500">
                Lẻ thêm ({picked?.unit ?? "đơn vị"})
              </span>
              <TextInput
                inputMode="numeric"
                value={inLoose || ""}
                placeholder="0"
                onChange={(e) => setInLoose(Number(e.target.value.replace(/[^\d]/g, "").slice(0, 7)) || 0)}
                className="h-9"
              />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-medium text-slate-500">Tiền mua (để trống được)</span>
              <MoneyInput value={inCost} onChange={setInCost} />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-medium text-slate-500">Ghi chú</span>
              <TextInput value={inNote} onChange={(e) => setInNote(e.target.value)} placeholder="Mua ở…" className="h-9" />
            </label>
          </div>
          {picked && (inPacks > 0 || inLoose > 0) && (
            <p className="mt-1.5 rounded-lg bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800">
              = {(inPacks * picked.packSize + inLoose).toLocaleString("vi-VN")} {picked.unit}
              {inPacks > 0 ? ` (${inPacks} ${picked.packName} × ${picked.packSize})` : ""}
            </p>
          )}
          <Button type="button" onClick={saveEntry} disabled={busy} className="mt-2 w-full">
            {busy ? "Đang ghi…" : "Ghi lần nhập này"}
          </Button>
        </div>
      )}

      {data && data.missingRecipe.length > 0 && (
        <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <strong>Chưa khai định mức</strong> nên các món này không trừ kho:{" "}
          {data.missingRecipe.map((m) => `${m.name} (${m.sold})`).join(", ")}. Khai định mức ở phần dưới thì số liệu
          mới đủ.
        </div>
      )}

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] uppercase text-slate-500">
              <th className="py-1">Mặt hàng</th>
              <th className="py-1 text-right">Nhập</th>
              <th className="py-1 text-right">Dùng</th>
              <th className="py-1 text-right">Còn</th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? [])
              .filter((r) => r.inUnits > 0 || r.usedUnits > 0)
              .map((r) => (
                <tr key={r.key} className="border-b border-slate-100 align-top">
                  <td className="py-1.5">
                    <div className="font-semibold text-slate-900">{r.name}</div>
                    {r.usedBy.length > 0 && (
                      <div className="text-[11px] text-slate-500">
                        {r.usedBy
                          .slice(0, 3)
                          .map((u) => `${u.name} ${u.sold}×${u.qty}${r.unit}`)
                          .join(" · ")}
                      </div>
                    )}
                    {r.usedDiscounted > 0 && (
                      <div className="text-[11px] text-amber-700">
                        trong đó {formatStockUnits(r.usedDiscounted, r.unit)} theo phiếu giảm giá
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-slate-700">{r.inText}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-700">{r.usedText}</td>
                  <td
                    className={
                      "py-1.5 text-right font-bold tabular-nums " +
                      (r.remaining < 0 ? "text-rose-600" : "text-emerald-700")
                    }
                  >
                    {r.remainingText}
                  </td>
                </tr>
              ))}
            {(data?.rows ?? []).filter((r) => r.inUnits > 0 || r.usedUnits > 0).length === 0 && (
              <tr>
                <td colSpan={4} className="py-3 text-center text-sm text-slate-500">
                  Kỳ này chưa có hàng nhập vào cũng chưa bán món nào theo kho.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        Số “còn” ÂM nghĩa là bán nhiều hơn nhập — hoặc quên khai nhập, hoặc định mức đang đặt cao hơn thực tế.
      </p>

      {data && data.entries.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-slate-500">
            Các lần nhập trong kỳ ({data.entries.length})
          </summary>
          <ul className="mt-1 divide-y divide-slate-100">
            {data.entries.map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-1.5 text-xs">
                <span className="text-slate-400">{formatDateKeyVN(e.date)}</span>
                <span className="flex-1">
                  <strong>{e.name}</strong> {e.packs > 0 ? `${e.packs} kiện × ${e.packSize}` : ""}
                  {e.looseUnits > 0 ? ` + ${e.looseUnits} lẻ` : ""} = {e.units.toLocaleString("vi-VN")} {e.unit}
                  {e.note ? ` · ${e.note}` : ""}
                </span>
                {e.cost > 0 && <span className="tabular-nums text-slate-600">{formatVND(e.cost)}</span>}
                <button type="button" onClick={() => removeEntry(e.id)} className="text-rose-500 hover:underline">
                  xoá
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}

/* ================================================================== */
/* ĐỊNH MỨC NGUYÊN LIỆU — một phần món rút bao nhiêu khỏi kho          */
/* ================================================================== */

/**
 * Khai "một ly cà phê sữa rút 20g cà phê bột + 30ml sữa đặc".
 *
 * Đây là chỗ nối giữa MÓN (bán theo ly) và KHO (nhập theo kg, lít, thùng).
 * Không có nó thì kho chỉ đếm được hàng đóng gói; có nó thì bán 40 ly là máy
 * biết 800g bột đã rời kho, và ước lượng được 5kg bột pha được bao nhiêu ly.
 *
 * Con số định mức KHÔNG đoán hộ: quầy cân thử một ly rồi gõ vào. Máy đoán bừa
 * rồi in ra như số thật thì tệ hơn là để trống.
 */
function RecipeCard({ onError }: { onError: (m: string) => void }) {
  const [menu, setMenu] = useState<CafeMenuItem[]>([]);
  const [catalogue, setCatalogue] = useState<StockCatalogueItem[]>([]);
  const [pickId, setPickId] = useState("");
  const [lines, setLines] = useState<Array<{ key: string; qty: number }>>([]);
  const [busy, setBusy] = useState(false);
  const [openNewItem, setOpenNewItem] = useState(false);

  /** Biểu mẫu thêm mặt hàng kho (nguyên liệu mới). */
  const [niName, setNiName] = useState("");
  const [niKind, setNiKind] = useState<"packaged" | "ingredient">("ingredient");
  const [niUnit, setNiUnit] = useState("g");
  const [niPackName, setNiPackName] = useState("bao");
  const [niPackSize, setNiPackSize] = useState(1000);

  const load = useCallback(async () => {
    try {
      const [day, kho] = await Promise.all([
        apiGet<{ menu?: CafeMenuItem[] }>(`/api/baocao/cafe?date=${todayInVN()}`),
        apiGet<{ catalogue: StockCatalogueItem[] }>("/api/baocao/cafe/kho"),
      ]);
      setMenu(day.menu ?? []);
      setCatalogue(kho.catalogue ?? []);
    } catch (err: any) {
      onError(err?.message || "Không tải được danh mục món");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const picked = menu.find((m) => m.id === pickId);

  /** Chọn món nào thì nạp định mức đang có của món đó ra để sửa. */
  function pick(id: string) {
    setPickId(id);
    const m = menu.find((x) => x.id === id);
    setLines((m?.uses ?? []).map((u) => ({ key: u.key, qty: u.qty })));
  }

  async function saveRecipe() {
    if (!picked) return onError("Chưa chọn món");
    setBusy(true);
    try {
      const res = await apiPost<{ menu: CafeMenuItem[] }>("/api/baocao/cafe", {
        action: "product",
        product: {
          key: picked.id,
          name: picked.name,
          en: picked.en ?? "",
          price: picked.price,
          group: picked.group,
          uses: lines.filter((l) => l.key && l.qty > 0),
        },
      });
      setMenu(res.menu);
    } catch (err: any) {
      onError(err?.message || "Không lưu được định mức");
    } finally {
      setBusy(false);
    }
  }

  async function saveStockItem() {
    if (!niName.trim()) return onError("Chưa đặt tên mặt hàng");
    setBusy(true);
    try {
      const res = await apiPost<{ catalogue: StockCatalogueItem[] }>("/api/baocao/cafe/kho", {
        action: "mat-hang",
        item: { name: niName.trim(), kind: niKind, unit: niUnit, packName: niPackName, packSize: niPackSize },
      });
      setCatalogue(res.catalogue);
      setNiName("");
      setOpenNewItem(false);
    } catch (err: any) {
      onError(err?.message || "Không thêm được mặt hàng");
    } finally {
      setBusy(false);
    }
  }

  const unitOf = (key: string) => catalogue.find((c) => c.key === key)?.unit ?? "";

  return (
    <Card
      title="ĐỊNH MỨC NGUYÊN LIỆU"
      hint="Một phần món rút bao nhiêu khỏi kho. Cân thử một ly rồi gõ vào — đây là cái làm kho ước lượng được nguyên liệu."
    >
      <label className="block">
        <span className="mb-0.5 block text-[11px] font-medium text-slate-500">Chọn món</span>
        <select
          value={pickId}
          onChange={(e) => pick(e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
        >
          <option value="">— chọn món để khai định mức —</option>
          {menu
            .filter((m) => !m.freeTicket)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {(m.uses ?? []).length ? " ✓" : " (chưa khai)"}
              </option>
            ))}
        </select>
      </label>

      {picked && (
        <div className="mt-2 space-y-1.5">
          {lines.map((l, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <select
                value={l.key}
                onChange={(e) => setLines(lines.map((x, k) => (k === i ? { ...x, key: e.target.value } : x)))}
                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 px-2 text-sm"
              >
                <option value="">— mặt hàng —</option>
                {catalogue.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name} ({c.unit})
                  </option>
                ))}
              </select>
              <TextInput
                inputMode="decimal"
                value={l.qty || ""}
                placeholder="20"
                onChange={(e) =>
                  setLines(
                    lines.map((x, k) =>
                      k === i ? { ...x, qty: Number(e.target.value.replace(/[^\d.]/g, "").slice(0, 8)) || 0 } : x,
                    ),
                  )
                }
                className="h-9 w-20 text-right"
              />
              <span className="w-8 text-xs text-slate-500">{unitOf(l.key)}</span>
              <button
                type="button"
                onClick={() => setLines(lines.filter((_, k) => k !== i))}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold text-slate-500"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLines([...lines, { key: "", qty: 0 }])}
              className="flex-1"
            >
              ＋ Thêm nguyên liệu
            </Button>
            <Button type="button" onClick={saveRecipe} disabled={busy} className="flex-1">
              {busy ? "Đang lưu…" : "Lưu định mức"}
            </Button>
          </div>
          <p className="text-[11px] text-slate-500">
            VD: một ly cà phê sữa = 20 g cà phê bột + 30 ml sữa đặc. Để trống là món không theo kho.
          </p>
        </div>
      )}

      <div className="mt-3 border-t border-slate-200 pt-2">
        <button
          type="button"
          onClick={() => setOpenNewItem((v) => !v)}
          className="text-xs font-bold text-sky-700 hover:underline"
        >
          {openNewItem ? "Đóng" : "＋ Thêm mặt hàng kho (nguyên liệu mới)"}
        </button>
        {openNewItem && (
          <div className="mt-2 grid gap-2 rounded-xl border border-slate-300 bg-slate-50 p-2 @md:grid-cols-2">
            <label className="block @md:col-span-2">
              <span className="mb-0.5 block text-[11px] font-medium text-slate-500">Tên mặt hàng</span>
              <TextInput value={niName} onChange={(e) => setNiName(e.target.value)} placeholder="Siro đào" className="h-9" />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-medium text-slate-500">Loại</span>
              <select
                value={niKind}
                onChange={(e) => {
                  const k = e.target.value as "packaged" | "ingredient";
                  setNiKind(k);
                  setNiUnit(k === "ingredient" ? "g" : "cái");
                }}
                className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
              >
                <option value="ingredient">Nguyên liệu (đong g/ml)</option>
                <option value="packaged">Hàng đóng gói (đếm cái)</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-medium text-slate-500">Đơn vị gốc</span>
              <TextInput value={niUnit} onChange={(e) => setNiUnit(e.target.value)} placeholder="g" className="h-9" />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-medium text-slate-500">Tên kiện nhập</span>
              <TextInput value={niPackName} onChange={(e) => setNiPackName(e.target.value)} placeholder="bao" className="h-9" />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[11px] font-medium text-slate-500">Một kiện = mấy đơn vị</span>
              <TextInput
                inputMode="numeric"
                value={niPackSize || ""}
                onChange={(e) => setNiPackSize(Number(e.target.value.replace(/[^\d]/g, "").slice(0, 7)) || 1)}
                placeholder="1000"
                className="h-9 text-right"
              />
            </label>
            <Button type="button" onClick={saveStockItem} disabled={busy} className="@md:col-span-2">
              {busy ? "Đang lưu…" : "Lưu mặt hàng"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
