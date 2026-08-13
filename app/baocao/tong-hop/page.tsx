// app/baocao/tong-hop/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import type { BaobaySummaryDTO, IssuedRangeDTO, RescheduledDTO } from "@/lib/baobay/types";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPost } from "../components/client-api";
import { useBaobaySession } from "../components/session";
import { SpotSwitcher, useSpot } from "../components/spot";
import { Shell } from "../components/Shell";
import { Banner, Button, Card, Field, TextInput } from "../components/ui";

/**
 * Bảng tổng hợp theo kỳ cho kế toán.
 *
 * Điểm quan trọng nhất của trang này: TỔNG CHỈ CỘNG NGÀY ĐÃ CHỐT. Ngày còn treo
 * hoặc chưa chốt được liệt kê riêng để kế toán biết tổng đang thiếu những ngày
 * nào, thay vì lặng lẽ cộng số chưa soát vào rồi dùng để trả tiền.
 */

type Tab = "days" | "bypilot" | "pilot" | "dispatcher" | "cameraman";

export default function SummaryPage() {
  const { user, loading } = useBaobaySession("accountant");
  const { spot, setSpot, options: spotOptions } = useSpot(user?.spots);

  const today = todayInVN();
  const [from, setFrom] = useState(shiftDateKey(today, -29));
  const [to, setTo] = useState(today);
  const [tab, setTab] = useState<Tab>("days");
  const [data, setData] = useState<BaobaySummaryDTO | null>(null);
  /** Người được chọn để tải bảng kê riêng. */
  const [statementUser, setStatementUser] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resync, setResync] = useState<{ running: boolean; message: string | null }>({
    running: false,
    message: null,
  });

  const load = useCallback(async (f: string, t: string) => {
    if (!spot) return;
    setBusy(true);
    setError(null);
    try {
      setData(await apiGet<BaobaySummaryDTO>(`/api/baocao/summary?from=${f}&to=${t}&spot=${spot}`));
    } catch (err: any) {
      setError(err?.message || "Không tải được bảng tổng hợp");
    } finally {
      setBusy(false);
    }
  }, [spot]);

  useEffect(() => {
    if (user && spot) load(from, to);
  }, [user, spot, from, to, load]);

  if (loading || !user || !spot) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">Đang tải…</div>;
  }

  const preset = (days: number) => {
    setFrom(shiftDateKey(today, -(days - 1)));
    setTo(today);
  };

  const thisMonth = () => {
    setFrom(`${today.slice(0, 7)}-01`);
    setTo(today);
  };

  const t = data?.totals;

  /** Đẩy lại những bản ghi chưa sang được bảng tính (mạng lỗi, Apps Script chậm…). */
  async function pushAgain() {
    setResync({ running: true, message: null });
    try {
      const r = await apiPost<{ scanned: number; pushed: number; failed: Array<{ kind: string; date: string; who: string; error: string }> }>(
        `/api/baocao/resync?spot=${spot}`,
        { from, to },
      );
      setResync({
        running: false,
        message: r.scanned
          ? `Quét ${r.scanned} bản ghi chưa sang bảng · đẩy được ${r.pushed}` +
            (r.failed.length ? ` · còn ${r.failed.length} lỗi: ${r.failed[0].kind} ${r.failed[0].date} — ${r.failed[0].error}` : "")
          : "Mọi bản ghi trong kỳ đều đã có trên bảng tính.",
      });
      load(from, to);
    } catch (err: any) {
      setResync({ running: false, message: err?.message || "Không đẩy lại được" });
    }
  }

  /** Mọi nhân sự XUẤT HIỆN trong kỳ — phi công, điều phối, camera man — mỗi người một dòng. */
  const staffOptions = (() => {
    if (!data) return [] as Array<{ username: string; name: string; roleLabel: string }>;
    const seen = new Map<string, { username: string; name: string; roleLabel: string }>();
    for (const r of data.pilotReports) seen.set(r.username, { username: r.username, name: r.pilotName, roleLabel: "Phi công" });
    for (const r of data.dispatcherReports) seen.set(r.username, { username: r.username, name: r.staffName, roleLabel: "Điều phối" });
    for (const r of data.cameramanReports) seen.set(r.username, { username: r.username, name: r.cameramanName, roleLabel: "Camera man" });
    return [...seen.values()].sort((a, b) => a.roleLabel.localeCompare(b.roleLabel) || a.name.localeCompare(b.name, "vi"));
  })();

  return (
    <Shell
      user={user}
      title="Bảng tổng hợp"
      subtitle="Số liệu đã chốt của kỳ. Ngày chưa chốt không được cộng vào tổng."
    >
      <SpotSwitcher spot={spot} options={spotOptions} onChange={setSpot} />

      <Card title="Khoảng thời gian">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Từ ngày">
            <TextInput type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          </Field>
          <Field label="Đến ngày">
            <TextInput
              type="date"
              value={to}
              min={from}
              max={today}
              onChange={(e) => e.target.value && setTo(e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="ghost" className="h-9 px-3 text-xs" onClick={() => preset(1)}>
            Hôm nay
          </Button>
          <Button variant="ghost" className="h-9 px-3 text-xs" onClick={() => preset(7)}>
            7 ngày
          </Button>
          <Button variant="ghost" className="h-9 px-3 text-xs" onClick={thisMonth}>
            Tháng này
          </Button>
          <Button variant="ghost" className="h-9 px-3 text-xs" onClick={() => preset(30)}>
            30 ngày
          </Button>
        </div>
      </Card>

      {error && <Banner tone="error">{error}</Banner>}

      <Card
        title="Xuất báo cáo & sao lưu"
        hint="File Excel gồm nhiều sheet: bảng lương từng phi công, số theo ngày, thu chi, tiền giao giám đốc. Tải lên Google Sheets được (Tệp → Nhập)."
      >
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/baocao/export?from=${from}&to=${to}&spot=${spot}`}
            className="inline-flex h-12 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Tải Excel cả kỳ (.xlsx)
          </a>
          <a
            href={`/api/baocao/export?month=${to.slice(0, 7)}&spot=${spot}`}
            className="inline-flex h-12 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Tải Excel tháng {to.slice(0, 7)}
          </a>
          <Button variant="ghost" onClick={pushAgain} disabled={resync.running}>
            {resync.running ? "Đang đẩy lại…" : "Đẩy lại Google Sheets"}
          </Button>
        </div>

        {/* Bảng kê MỘT nhân sự bất kỳ theo đúng khoảng ngày đang chọn ở bộ lọc trên */}
        {data && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-sm font-medium text-slate-700">Bảng kê một nhân sự:</span>
            <select
              value={statementUser}
              onChange={(e) => setStatementUser(e.target.value)}
              className="h-11 min-w-56 rounded-xl border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="">— chọn người —</option>
              {staffOptions.map((o) => (
                <option key={o.username} value={o.username}>
                  {o.name} — {o.roleLabel}
                </option>
              ))}
            </select>
            <a
              href={statementUser ? `/api/baocao/statement?from=${from}&to=${to}&spot=${spot}&username=${statementUser}` : undefined}
              aria-disabled={!statementUser}
              className={
                "inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold " +
                (statementUser
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "pointer-events-none bg-slate-200 text-slate-400")
              }
              download
            >
              ⬇ Tải bảng kê {from} → {to}
            </a>
            <span className="text-xs text-slate-500">Đổi khoảng ngày ở bộ lọc phía trên — tuần, tháng hay tuỳ ý đều được.</span>
          </div>
        )}

        {resync.message && (
          <div className="mt-3">
            <Banner tone="info" onClose={() => setResync({ running: false, message: null })}>
              {resync.message}
            </Banner>
          </div>
        )}

        <p className="mt-3 text-xs text-slate-500">
          Số liệu hằng ngày tự chảy sang Google Sheets ngay khi nhân viên bấm lưu. Nút “Đẩy lại” dành cho
          những dòng lỡ hỏng đường truyền — quét cả kỳ và gửi lại, tránh mất dữ liệu.
        </p>
      </Card>

      {data && data.pendingDays.length > 0 && (
        <Banner tone="warning">
          <strong>{data.pendingDays.length} ngày chưa chốt, KHÔNG nằm trong tổng bên dưới:</strong>{" "}
          {data.pendingDays.slice(0, 12).map(formatDateKeyVN).join(", ")}
          {data.pendingDays.length > 12 ? "…" : ""}
          <div className="mt-1 text-xs">
            Vào <Link href="/baocao/chot-ngay" className="font-semibold underline">Chốt ngày</Link> để soát và chốt.
          </div>
        </Banner>
      )}

      {t && (
        <Card title={`Tổng đã chốt · ${formatDateKeyVN(from)} – ${formatDateKeyVN(to)}`}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Khách bay" value={String(t.guestCount)} />
            <Stat label="Vé xuất ra" value={String(t.ticketsIssued)} />
            <Stat label="Vé thu hồi" value={String(t.ticketsReturned)} />
            <Stat label="Chuyến bay (PC báo)" value={String(t.pilotFlights)} />
            <Stat label="Tiền mặt" value={formatVND(t.cashTotal)} />
            <Stat label="Chuyển khoản" value={formatVND(t.transferTotal)} />
            <Stat label="Tổng thu" value={formatVND(t.revenueTotal)} strong />
            <Stat label="Tổng chi nhân viên" value={formatVND(t.expenseTotal)} />
            <Stat label="Flycam" value={String(t.flycam)} />
            <Stat label="Camera 360" value={String(t.video360)} />
            <Stat label="Bay kéo cờ/bánh" value={String(t.flagFlight)} />
            <Stat label="Vé ngoại giao" value={String(t.diplomaticTickets)} />
            <Stat label="Thu từ khách ngoại giao" value={formatVND(t.diplomaticAmount)} />
          </div>
        </Card>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["days", "Theo ngày"],
                ["bypilot", "Theo phi công"],
                ["pilot", "Phi công (từng ngày)"],
                ["dispatcher", "Điều phối"],
                ["cameraman", "Camera man"],
              ] as Array<[Tab, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={
                  tab === key
                    ? "rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white"
                    : "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                }
              >
                {label}
              </button>
            ))}
          </div>

          <a
            href={`/api/baocao/summary?from=${from}&to=${to}&format=csv&type=${tab}&spot=${spot}`}
            className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Tải CSV bảng đang xem
          </a>
        </div>

        {busy && <p className="text-sm text-slate-500">Đang tải…</p>}

        {!busy && data && tab === "days" && <DaysTable data={data} />}
        {!busy && data && tab === "bypilot" && <ByPilotTable data={data} />}
        {!busy && data && tab === "pilot" && <PilotTable data={data} />}
        {!busy && data && tab === "dispatcher" && <DispatcherTable data={data} />}
        {!busy && data && tab === "cameraman" && <CameramanTable data={data} />}
      </Card>
    </Shell>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="text-xs text-slate-500">{label}</div>
      <div
        className={
          strong
            ? "text-base font-bold tabular-nums text-emerald-700"
            : "text-base font-semibold tabular-nums text-slate-900"
        }
      >
        {value}
      </div>
    </div>
  );
}

/** Bảng nào cũng phải cuộn ngang được: kế toán mở trên máy tính, chủ điểm bay xem bằng điện thoại. */
function Scroll({ children }: { children: React.ReactNode }) {
  return <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">{children}</div>;
}

const th = "whitespace-nowrap px-3 py-2 text-left text-xs font-semibold text-slate-600";
const td = "whitespace-nowrap px-3 py-2 text-sm text-slate-800 tabular-nums";

function StatusPill({ status, blocked }: { status: "none" | "draft" | "closed"; blocked: boolean }) {
  if (status === "closed") {
    return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">đã chốt</span>;
  }
  if (blocked) {
    return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800">treo</span>;
  }
  if (status === "draft") {
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">chưa chốt</span>;
  }
  return <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600">chưa nhập</span>;
}

function DaysTable({ data }: { data: BaobaySummaryDTO }) {
  if (!data.days.length) return <Empty />;

  return (
    <Scroll>
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="bg-slate-50">
            <th className={th}>Ngày</th>
            <th className={th}>Trạng thái</th>
            <th className={th}>Khách</th>
            <th className={th}>Vé xuất</th>
            <th className={th}>Thu hồi</th>
            <th className={th}>PC khai chuyến</th>
            <th className={th}>Tiền mặt</th>
            <th className={th}>Chuyển khoản</th>
            <th className={th}>Tổng thu</th>
            <th className={th}>Flycam (KT/CM)</th>
            <th className={th}>360 (KT/PC)</th>
            <th className={th}>Kéo cờ</th>
            <th className={th}>Ngoại giao (vé · thu)</th>
            <th className={th}>Chi nhân viên</th>
            <th className={th}>PC đã chốt</th>
          </tr>
        </thead>
        <tbody>
          {data.days.map((d) => {
            const dim = d.status !== "closed";
            return (
              <tr key={d.date} className={dim ? "border-b border-slate-100 bg-slate-50/40" : "border-b border-slate-100"}>
                <td className={`${td} font-medium`}>
                  <Link href={`/baocao/chot-ngay?date=${d.date}`} className="hover:underline">
                    {formatDateKeyVN(d.date)}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <StatusPill status={d.status} blocked={d.blocked} />
                  {d.closedBy && <span className="ml-1 text-xs text-emerald-700">{d.closedBy} đã chốt</span>}
                  {d.issueCount > 0 && <span className="ml-1 text-xs text-rose-700">{d.issueCount} lỗi</span>}
                </td>
                <td className={td}>{d.guestCount || "—"}</td>
                <td className={td}>{d.ticketsIssued || "—"}</td>
                <td className={td}>{d.ticketsReturned}</td>
                <td className={td}>{d.pilotFlights}</td>
                <td className={td}>{formatVND(d.cashTotal)}</td>
                <td className={td}>{formatVND(d.transferTotal)}</td>
                <td className={`${td} font-semibold`}>{formatVND(d.revenueTotal)}</td>
                <td className={td}>
                  {d.flycam}/{d.cameramanFlycam}
                </td>
                <td className={td}>
                  {d.video360}/{d.pilot360}
                </td>
                <td className={td}>{d.flagFlight}</td>
                <td className={td}>
                  {d.diplomaticTickets}
                  {d.diplomaticAmount ? (
                    <span className="ml-1 text-xs text-slate-500">({formatVND(d.diplomaticAmount)})</span>
                  ) : null}
                </td>
                <td className={td}>{d.expenseTotal ? formatVND(d.expenseTotal) : "—"}</td>
                <td className={`${td} text-xs`}>
                  {d.pilotSubmitted}/{d.pilotCount}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Scroll>
  );
}

function ByPilotTable({ data }: { data: BaobaySummaryDTO }) {
  if (!data.byPilot.length) {
    return (
      <p className="text-sm text-slate-500">
        Chưa có ngày nào đã chốt trong kỳ này — bảng theo phi công chỉ cộng ngày đã chốt.
      </p>
    );
  }

  return (
    <Scroll>
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="bg-slate-50">
            <th className={th}>Phi công</th>
            <th className={th}>Số ngày bay</th>
            <th className={th}>Tổng chuyến</th>
            <th className={th}>Camera 360</th>
            <th className={th}>Khách ngoại giao</th>
            <th className={th}>Tổng chi</th>
            <th className={th}>Phạt nộp muộn</th>
            <th className={th}>Tiền ứng</th>
            <th className={th}>Bảng kê</th>
          </tr>
        </thead>
        <tbody>
          {data.byPilot.map((p) => (
            <tr key={p.username} className="border-b border-slate-100 hover:bg-slate-50">
              <td className={`${td} font-medium`}>{p.pilotName}</td>
              <td className={td}>{p.days}</td>
              <td className={`${td} font-semibold`}>{p.flights}</td>
              <td className={td}>{p.video360}</td>
              <td className={td}>{p.diplomaticGuests}</td>
              <td className={td}>{p.expenseTotal ? formatVND(p.expenseTotal) : "—"}</td>
              <td className={td}>
                {p.latePenalty ? <span className="font-semibold text-rose-700">{formatVND(p.latePenalty)}</span> : "—"}
              </td>
              <td className={td}>
                {p.advanceTotal ? (
                  <span className="font-semibold text-violet-700">{formatVND(p.advanceTotal)}</span>
                ) : (
                  "—"
                )}
              </td>
              <td className={td}>
                {/* Bảng kê Excel của riêng phi công này, đúng khoảng ngày đang xem */}
                <a
                  href={`/api/baocao/statement?from=${data.from}&to=${data.to}&spot=${data.spot}&username=${p.username}`}
                  className="font-medium text-emerald-700 hover:underline"
                  download
                >
                  ⬇ Tải
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Scroll>
  );
}

function PilotTable({ data }: { data: BaobaySummaryDTO }) {
  if (!data.pilotReports.length) return <Empty />;

  return (
    <Scroll>
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="bg-slate-50">
            <th className={th}>Ngày</th>
            <th className={th}>Phi công</th>
            <th className={th}>Chốt</th>
            <th className={th}>Chuyến</th>
            <th className={th}>Số mã vé</th>
            <th className={th}>360</th>
            <th className={th}>Ngoại giao (vé · thu)</th>
            <th className={th}>Chi (bãi/nước/xe/khác)</th>
            <th className={th}>Mã vé đã bay</th>
          </tr>
        </thead>
        <tbody>
          {data.pilotReports.map((r) => {
            const mismatch = r.ticketCodes.length !== r.flightCount;
            const expense =
              r.waterCost + r.guestCarCost + r.expenses.reduce((s, e) => s + e.amount, 0);
            return (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className={`${td} font-medium`}>{formatDateKeyVN(r.date)}</td>
                <td className={td}>{r.pilotName}</td>
                <td className={td}>
                  {r.submitted ? <span className="text-emerald-600">✓</span> : <span className="text-amber-600">nháp</span>}
                  {r.latePenalty > 0 && <span className="ml-1 text-xs font-semibold text-rose-700">phạt</span>}
                </td>
                <td className={td}>{r.flightCount}</td>
                <td className={td}>
                  <span className={mismatch ? "font-semibold text-rose-700" : ""}>{r.ticketCodes.length}</span>
                </td>
                <td className={td}>{r.video360}</td>
                <td className={td}>{r.diplomaticGuests}</td>
                <td className={td}>{expense ? formatVND(expense) : "—"}</td>
                <td className="max-w-[20rem] px-3 py-2 text-xs text-slate-600">{r.ticketCodes.join(", ")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Scroll>
  );
}

function rangesText(ranges: IssuedRangeDTO[]): string {
  return ranges.map((r) => `${r.from}–${r.to} (${r.count})`).join(", ") || "—";
}

function rescheduledText(list: RescheduledDTO[]): string {
  return list.map((r) => `${r.code}→${formatDateKeyVN(r.toDate)}`).join(", ");
}

function DispatcherTable({ data }: { data: BaobaySummaryDTO }) {
  if (!data.dispatcherReports.length) return <Empty />;

  return (
    <Scroll>
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="bg-slate-50">
            <th className={th}>Ngày</th>
            <th className={th}>Điều phối</th>
            <th className={th}>Khách</th>
            <th className={th}>Vé xuất</th>
            <th className={th}>Thu về</th>
            <th className={th}>Dải mã vé</th>
            <th className={th}>Huỷ</th>
            <th className={th}>Dời lịch</th>
            <th className={th}>Flycam</th>
            <th className={th}>360</th>
            <th className={th}>Cờ đỏ</th>
            <th className={th}>Kéo cờ</th>
            <th className={th}>Ngoại giao (vé · thu)</th>
            <th className={th}>Tiền mặt</th>
            <th className={th}>CK</th>
            <th className={th}>Chi</th>
            <th className={th}>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {data.dispatcherReports.map((r) => {
            const expense =
              r.guestWaterCost + r.mountainCarCost + r.shuttleCarCost + r.expenses.reduce((s, e) => s + e.amount, 0);
            return (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className={`${td} font-medium`}>{formatDateKeyVN(r.date)}</td>
                <td className={td}>{r.staffName}</td>
                <td className={td}>{r.guestCount}</td>
                <td className={td}>{r.ticketsIssued}</td>
                <td className={td}>{r.ticketsReturned}</td>
                <td className="max-w-[14rem] px-3 py-2 text-xs text-slate-600">{rangesText(r.issuedRanges)}</td>
                <td className={td}>{r.cancelledCount}</td>
                <td className={td}>
                  {r.rescheduledCount}
                  {r.rescheduled.length > 0 && (
                    <span className="ml-1 text-xs text-slate-500">({rescheduledText(r.rescheduled)})</span>
                  )}
                </td>
                <td className={td}>{r.flycam}</td>
                <td className={td}>{r.video360}</td>
                <td className={td}>{r.redFlag}</td>
                <td className={td}>{r.flagFlight}</td>
                <td className={td}>{r.diplomaticGuests}</td>
                <td className={td}>{formatVND(r.cashReceived)}</td>
                <td className={td}>{formatVND(r.transferReceived)}</td>
                <td className={td}>{expense ? formatVND(expense) : "—"}</td>
                <td className="max-w-[14rem] px-3 py-2 text-xs text-slate-600">{r.note}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Scroll>
  );
}

function CameramanTable({ data }: { data: BaobaySummaryDTO }) {
  if (!data.cameramanReports.length) return <Empty />;

  return (
    <Scroll>
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="bg-slate-50">
            <th className={th}>Ngày</th>
            <th className={th}>Camera man</th>
            <th className={th}>Chốt</th>
            <th className={th}>Chuyến flycam</th>
            <th className={th}>Mã vé</th>
            <th className={th}>Chi</th>
            <th className={th}>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {data.cameramanReports.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
              <td className={`${td} font-medium`}>{formatDateKeyVN(r.date)}</td>
              <td className={td}>{r.cameramanName}</td>
              <td className={td}>
                {r.submitted ? <span className="text-emerald-600">✓</span> : <span className="text-amber-600">nháp</span>}
              </td>
              <td className={`${td} font-semibold`}>{r.flycamFlights}</td>
              <td className="max-w-[16rem] px-3 py-2 text-xs text-slate-600">{r.flycamCodes.join(", ")}</td>
              <td className={td}>
                {r.expenses.length ? formatVND(r.expenses.reduce((s, e) => s + e.amount, 0)) : "—"}
              </td>
              <td className="max-w-[14rem] px-3 py-2 text-xs text-slate-600">{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Scroll>
  );
}

function Empty() {
  return <p className="text-sm text-slate-500">Chưa có số liệu nào trong khoảng ngày đã chọn.</p>;
}
