// app/baocao/camera/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { formatVND } from "@/lib/pricing";
import type { Issue } from "@/lib/baobay/reconcile";
import { parseTicketCodeList, TICKET_CODE_HINT } from "@/lib/baobay/ticket-code";
import type { CameramanReportDTO } from "@/lib/baobay/types";
import { BACKDATE_LIMIT_DAYS } from "@/lib/baobay/validation";

import { apiGet, apiPost } from "../components/client-api";
import { DateBar } from "../components/DateBar";
import { AddServicesCard } from "../components/AddServicesCard";
import { AssignedBookings } from "../components/BookingCard";
import { FlycamCancelCard } from "../components/FlycamCancelCard";
import { CollectInbox } from "../components/CollectBox";
import { ExpenseRows, toExpenseRows, type ExpenseRow } from "../components/rows";
import { HandoverBox } from "../components/HandoverBox";
import { MerchCard } from "../components/MerchCard";
import { PeriodSummary } from "../components/PeriodSummary";
import { ReviewNotices } from "../components/ReviewNotices";
import { useBaobaySession } from "../components/session";
import { useSpot } from "../components/spot";
import { Shell } from "../components/Shell";
import { Banner, Button, Card, CountInput, DoneTag, Field, PageLoading, Readout, TextArea, useDoneFlag } from "../components/ui";

/**
 * Camera man báo cáo một ngày.
 *
 * Chỉ một con số chính: số chuyến bay đã quay flycam. Con số này được đối chiếu
 * với số điều phối bay báo, nhưng lệch KHÔNG bị chặn cứng — khách hay đăng ký
 * thêm ngay tại bãi cất cánh, quầy chưa kịp ghi. Lệch thì kế toán xem rồi duyệt
 * khi chốt ngày.
 */

type FormState = {
  flycamFlights: number;
  flycamCodesText: string;
  paraglidingFlights: number;
  paraglidingCodesText: string;
  expenses: ExpenseRow[];
  /** Hàng bán thêm: mã hàng → số lượng bán hôm nay. */
  merch: Record<string, number>;
  /** Hàng bán thêm: mã hàng → trả tiền mặt hay chuyển khoản. */
  merchMethod: Record<string, "cash" | "transfer">;
  note: string;
};

const EMPTY_FORM: FormState = {
  flycamFlights: 0,
  flycamCodesText: "",
  paraglidingFlights: 0,
  paraglidingCodesText: "",
  expenses: [{ content: "", amount: 0, kind: "chi", note: "" }],
  merch: {},
  merchMethod: {},
  note: "",
};

type DayCheck = { dayBlocked: boolean; myIssues: Issue[]; otherIssueCount: number };

export default function CameramanReportPage() {
  const { user, loading } = useBaobaySession("cameraman");
  const { spot, setSpot, options: spotOptions } = useSpot(user?.spots);

  const today = todayInVN();
  const [date, setDate] = useState(today);

  /**
   * Camera man bán thêm flycam ngay tại bãi nên được tự cộng vào booking, nhưng
   * chỉ trong 3 ngày gần nhất (hôm kia, hôm qua, hôm nay) — sổ cũ hơn là việc
   * của kế toán. Máy chủ chặn y hệt, đây chỉ là để khỏi bày nút bấm vô ích.
   */
  const oldestServiceDate = shiftDateKey(today, -2);
  const canEditServices = date >= oldestServiceDate && date <= today;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [existing, setExisting] = useState<CameramanReportDTO | null>(null);
  const [locked, setLocked] = useState(false);
  /** Tên kế toán đã chốt ngày — hiện banner xanh cho mọi vai trò. */
  const [closedBy, setClosedBy] = useState("");
  const [check, setCheck] = useState<DayCheck | null>(null);
  const [loadingDay, setLoadingDay] = useState(false);
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ warnings: string[]; submitted: boolean } | null>(null);
  const [justSaved, flashSaved] = useDoneFlag();
  const [history, setHistory] = useState<CameramanReportDTO[]>([]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const codes = useMemo(() => parseTicketCodeList(form.flycamCodesText), [form.flycamCodesText]);

  const loadDay = useCallback(async (targetDate: string) => {
    if (!spot) return;
    setLoadingDay(true);
    setError(null);
    setSaved(null);
    try {
      const res = await apiGet<{ report: CameramanReportDTO | null; locked: boolean; closedBy?: string; check: DayCheck }>(
        `/api/baocao/reports/cameraman?date=${targetDate}&spot=${spot}`,
      );
      setExisting(res.report);
      setLocked(res.locked);
      setClosedBy(res.closedBy || "");
      setCheck(res.check);
      setForm(
        res.report
          ? {
              flycamFlights: res.report.flycamFlights,
              flycamCodesText: res.report.flycamCodes.join(", "),
              paraglidingFlights: res.report.paraglidingFlights,
              paraglidingCodesText: res.report.paraglidingCodes.join(", "),
              expenses: toExpenseRows(res.report.expenses),
              merch: Object.fromEntries((res.report.merchSales ?? []).map((m) => [m.key, m.qty])),
              merchMethod: Object.fromEntries((res.report.merchSales ?? []).map((m) => [m.key, m.method])),
              note: res.report.note,
            }
          : EMPTY_FORM,
      );
    } catch (err: any) {
      setError(err?.message || "Không tải được số liệu ngày này");
    } finally {
      setLoadingDay(false);
    }
  }, [spot]);

  const loadHistory = useCallback(async () => {
    if (!spot) return;
    try {
      const { reports } = await apiGet<{ reports: CameramanReportDTO[] }>(`/api/baocao/reports/cameraman?spot=${spot}`);
      setHistory(reports);
    } catch {
      /* danh sách gần đây chỉ để tham khảo */
    }
  }, [spot]);

  useEffect(() => {
    if (user && spot) loadDay(date);
  }, [user, spot, date, loadDay]);

  useEffect(() => {
    if (user && spot) loadHistory();
  }, [user, spot, loadHistory]);

  async function save(submit: boolean) {
    setError(null);
    setSaved(null);
    setSaving(submit ? "submit" : "draft");
    try {
      const res = await apiPost<{ report: CameramanReportDTO; warnings: string[]; check: DayCheck }>(
        `/api/baocao/reports/cameraman?spot=${spot}`,
        {
          date,
          flycamFlights: form.flycamFlights,
          flycamCodesText: form.flycamCodesText,
          paraglidingFlights: form.paraglidingFlights,
          paraglidingCodesText: "",
          expenses: form.expenses.filter((e) => e.content.trim() || e.amount),
          merchSales: Object.entries(form.merch)
            .filter(([, qty]) => (qty || 0) > 0)
            .map(([key, qty]) => ({
              key,
              qty,
              method: form.merchMethod[key] === "transfer" ? ("transfer" as const) : ("cash" as const),
            })),
          note: form.note,
          submit,
        },
      );
      setExisting(res.report);
      setCheck(res.check);
      setForm((prev) => ({
        ...prev,
        flycamCodesText: res.report.flycamCodes.join(", "),
        paraglidingCodesText: res.report.paraglidingCodes.join(", "),
        expenses: toExpenseRows(res.report.expenses),
        // Lấy lại theo bản máy chủ: mặt hàng đã bị gỡ khỏi danh mục thì biến mất luôn
        merch: Object.fromEntries((res.report.merchSales ?? []).map((m) => [m.key, m.qty])),
        merchMethod: Object.fromEntries((res.report.merchSales ?? []).map((m) => [m.key, m.method])),
      }));
      setSaved({ warnings: res.warnings || [], submitted: res.report.submitted });
      flashSaved();
      loadHistory();
    } catch (err: any) {
      setError(err?.message || "Không lưu được báo cáo");
    } finally {
      setSaving(null);
    }
  }

  if (loading || !user || !spot) {
    return <PageLoading />;
  }

  const myReds = (check?.myIssues || []).filter((i) => i.severity === "red");

  return (
    <Shell
      user={user}
      title="Báo cáo camera man"
      subtitle="Nhập số chuyến đã quay flycam trong ngày rồi bấm Chốt để kế toán soát."
    >
      {/* Lệnh soát lại của kế toán cho đúng ngày đang mở */}
      {/* Chọn NƠI LÀM VIỆC + NGÀY — một thanh duy nhất trên đầu trang */}
      <DateBar
        date={date}
        onChange={setDate}
        min={shiftDateKey(today, -BACKDATE_LIMIT_DAYS)}
        loading={loadingDay}
        spot={spot}
        spotOptions={spotOptions}
        onSpotChange={(v) => setSpot(v as never)}
      />

      <ReviewNotices spot={spot} date={date} />

      {/* Booking điều phối chuyển cho mình: đón khách, tiếp khách, có SĐT */}
      <AssignedBookings spot={spot} date={date} me={user.username} />

      {/* Khách đòi mua thêm flycam ngay tại bãi — người quay chốt luôn, khỏi
          chạy về quầy. Chỉ flycam và chỉ 3 ngày gần nhất. */}
      {canEditServices ? (
        <AddServicesCard spot={spot} date={date} onlyFlycam />
      ) : (
        <Card title="➕➖ DỊCH VỤ TUỲ CHỌN">
          <p className="text-sm leading-relaxed text-slate-600">
            Chỉ sửa được flycam của <strong>3 ngày gần nhất</strong> (từ{" "}
            {formatDateKeyVN(oldestServiceDate)} đến {formatDateKeyVN(today)}). Ngày{" "}
            {formatDateKeyVN(date)} đã quá hạn — nhờ quầy vé hoặc kế toán sửa giúp.
          </p>
        </Card>
      )}

      {/* Flycam hỏng giữa chuyến: ghi huỷ + lo đường hoàn tiền cho khách */}
      <FlycamCancelCard spot={spot} date={date} />

      {/* Lệnh thu tiền chờ mình — việc phải làm ngay */}
      <CollectInbox spot={spot} />

      {myReds.length > 0 && (
        <Banner tone="error">
          <strong>Cần kiểm lại {myReds.length} chỗ:</strong>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
            {myReds.map((i, k) => (
              <li key={k}>{i.message}</li>
            ))}
          </ul>
          <div className="mt-1 text-xs">
            Nếu số của anh/chị đúng mà điều phối ghi thiếu (khách đăng ký thêm tại bãi), kế toán sẽ duyệt lệch —
            không cần sửa cho bằng.
          </div>
        </Banner>
      )}

      {locked && (
        <Banner tone="success">
          ✅ <strong>{closedBy || "Kế toán"} đã chốt ngày {formatDateKeyVN(date)}</strong> — số liệu đã khoá, chỉ xem được.
        </Banner>
      )}

      {/* ============ MỘT lưới 2 cột độc lập ============ */}
      <div className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
      <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(false);
        }}
        className="space-y-4"
      >
        <div className="space-y-3">
          {!loadingDay && existing && (
            <div>
              <Banner tone={existing.submitted ? "success" : "info"}>
                {existing.submitted
                  ? `Đã chốt báo cáo ngày này (${existing.flycamFlights} chuyến flycam).`
                  : `Đang là bản nháp (${existing.flycamFlights} chuyến) — nhớ bấm Chốt báo cáo khi xong.`}
              </Banner>
            </div>
          )}
        </div>

        <Card title="QUAY DÙ LƯỢN" hint="Số lượng chuyến đã quay trong ngày + mã vé">
          <CountInput value={form.flycamFlights} onChange={(v) => set("flycamFlights", v)} max={1000} />

          <div className="mt-4">
            <Field
              label="Mã vé đã quay (nếu ghi được)"
              hint={`Không bắt buộc — camera man không giữ liên bay dù. Ghi được thì kế toán đối chiếu tới từng vé. ${TICKET_CODE_HINT}`}
            >
              <TextArea
                value={form.flycamCodesText}
                onChange={(e) => set("flycamCodesText", e.target.value)}
                placeholder="MBL0001, MBL0002"
                autoCapitalize="characters"
                spellCheck={false}
                className="min-h-16"
                disabled={locked}
              />
            </Field>
            {codes.codes.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Readout
                  label="Số mã đã nhập"
                  value={String(codes.codes.length)}
                  tone={codes.codes.length !== form.flycamFlights ? "warning" : "normal"}
                />
                <Readout label="Số chuyến đã khai" value={String(form.flycamFlights)} />
              </div>
            )}
          </div>
        </Card>

        <Card
          title="QUAY CHECKIN"
          hint="Chỉ SỐ LƯỢNG — không có mã vé. Kế toán xác nhận hàng ngày, không đối chiếu với ai khác."
        >
          <CountInput value={form.paraglidingFlights} onChange={(v) => set("paraglidingFlights", v)} max={1000} />
        </Card>

        {error && <Banner tone="error">{error}</Banner>}

        {saved && (
          <Banner tone="success" onClose={() => setSaved(null)}>
            <strong>
              {saved.submitted ? "Đã chốt báo cáo" : "Đã lưu nháp"} ngày {formatDateKeyVN(date)}.
            </strong>
            {saved.warnings.length > 0 && (
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs">
                {saved.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </Banner>
        )}

        {date > today && (
          <Banner tone="info">
            📅 Ngày {formatDateKeyVN(date)} ở tương lai — xem trước lịch được giao, đến ngày mới nhập báo cáo được.
          </Banner>
        )}
        {!locked && date <= today && (
          <div className="sticky bottom-3 z-10 flex items-center gap-2">
            <DoneTag show={justSaved}>{saved?.submitted ? "Đã chốt" : "Đã lưu"}</DoneTag>
            <Button
              type="submit"
              variant="ghost"
              disabled={saving !== null || loadingDay}
              className="flex-1 bg-white shadow-lg"
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
      </form>
      </div>

      <div className="space-y-3">

        <Card
          title="THU CHI"
          hint="Mỗi dòng: nội dung – số tiền – THU/CHI – ghi chú. VD: 3 khách trả tiền tại bãi — 1.200.000đ — Thu."
        >
          {/* Camera man chi từ tiền túi — không cần phân tiền mặt/CK */}
          <ExpenseRows
            rows={form.expenses}
            onChange={(rows) => set("expenses", rows)}
            disabled={locked}
            withKind
            hideTotals
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <div className="text-xs font-medium text-emerald-800">Tổng thu</div>
              <div className="text-lg font-bold tabular-nums text-emerald-700">
                +{formatVND(form.expenses.reduce((a, e) => a + (e.kind === "thu" ? e.amount || 0 : 0), 0))}
              </div>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
              <div className="text-xs font-medium text-rose-800">Tổng chi</div>
              <div className="text-lg font-bold tabular-nums text-rose-700">
                −{formatVND(form.expenses.reduce((a, e) => a + (e.kind !== "thu" ? e.amount || 0 : 0), 0))}
              </div>
            </div>
          </div>
        </Card>

        <Card title="Ghi chú">
          <TextArea
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Khách đăng ký thêm tại bãi, hỏng thiết bị…"
            disabled={locked}
          />
        </Card>

        <Card title="HÀNG BÁN THÊM" hint="Áo, khăn, cốm… Tự tạo mặt hàng rồi khai số bán trong ngày.">
          <MerchCard
            spot={spot}
            qty={form.merch}
            method={form.merchMethod}
            onChange={(next) => set("merch", next)}
            onMethodChange={(next) => set("merchMethod", next)}
            disabled={locked}
            onError={setError}
          />
        </Card>

      <HandoverBox spot={spot} boardDate={date} />

      <PeriodSummary spot={spot} title="Tổng theo chu kỳ" />

      <Card title="Đã báo gần đây" hint="Bấm vào một ngày để mở lại và sửa">
        {history.length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có báo cáo nào.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setDate(r.date)}
                  className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-slate-50"
                >
                  <div>
                    <div className="font-medium text-slate-900">{formatDateKeyVN(r.date)}</div>
                    <div className="text-xs text-slate-500">
                      {r.flycamFlights} flycam
                      {r.paraglidingFlights ? ` · ${r.paraglidingFlights} quay dù lượn` : ""}
                    </div>
                  </div>
                  <span
                    className={
                      r.submitted
                        ? "shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
                        : "shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                    }
                  >
                    {r.submitted ? "đã chốt" : "còn nháp"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      </div>
      </div>
    </Shell>
  );
}
