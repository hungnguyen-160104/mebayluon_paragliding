// app/baocao/tong-hop/page.tsx
"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { serviceSoldAt } from "@/lib/baobay/flight-price";
import Link from "next/link";

import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import type { BaobaySummaryDTO, IssuedRangeDTO, RescheduledDTO } from "@/lib/baobay/types";
import { formatVND } from "@/lib/pricing";

import { apiGet, apiPost } from "../components/client-api";
import { useBaobaySession } from "../components/session";
import { SpotSwitcher, useSpot } from "../components/spot";
import { MismatchList, RollupSections, SellerTable } from "../components/RollupView";
import { Shell } from "../components/Shell";
import { Banner, Button, Card, Field, InlineLoading, PageLoading, TextInput } from "../components/ui";

/**
 * Bảng tổng hợp theo kỳ cho kế toán.
 *
 * Từ 07/10/2026 (chủ: "số đã chốt sai hết", "cả kỳ phải tính tất tần tật"):
 *  - Khối CẢ KỲ là khối CHÍNH — đủ khách, vé, dịch vụ, huỷ/dời/hoàn, tiền của MỌI
 *    ngày trong kỳ, đếm thẳng từ sổ (booking, thêm/bớt dịch vụ, lệnh hoàn).
 *  - Khối ĐÃ CHỐT bày đúng bộ chỉ tiêu ấy nhưng chỉ của ngày kế toán đã chốt, kèm
 *    số kế toán gõ lúc chốt và tô vàng ô nào lệch với sổ.
 * Trước đó số khách / vé / dịch vụ chép từ ô kế toán gõ nên ngày chưa chốt bằng 0
 * và "tổng đã chốt" của kỳ 30 ngày thực ra chỉ là 12 ngày.
 */

type Tab = "days" | "seller" | "bypilot" | "pilot" | "dispatcher" | "cameraman";

export default function SummaryPage() {
  const { user, loading } = useBaobaySession("accountant");
  const { spot, setSpot, options: spotOptions } = useSpot(user?.spots);

  const today = todayInVN();
  const [from, setFrom] = useState(shiftDateKey(today, -29));
  const [to, setTo] = useState(today);
  const [tab, setTab] = useState<Tab>("days");
  const [data, setData] = useState<
    (BaobaySummaryDTO & {
      /** Ai bỏ bao nhiêu booking trong kỳ — lớp soi lạm dụng, xem chú thích ở voidStats. */
      voidedByPerson?: Array<{ name: string; mistake: number; duplicate: number; total: number; guests: number }>;
    }) | null
  >(null);
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
      /**
       * HAI NHỊP: bảng số về trước (issues=0, vài giây), cột "treo / n lỗi" của
       * ngày chưa chốt hỏi sau — phần ấy chạy bộ đối chiếu từng ngày, kỳ 30 ngày
       * mất 10–30 giây; gộp chung là kế toán ngồi nhìn màn hình trắng.
       */
      const res = await apiGet<NonNullable<typeof data>>(`/api/baocao/summary?from=${f}&to=${t}&spot=${spot}&issues=0`);
      setData(res);
      if (res.pendingDays.length) {
        apiGet<Record<string, { blocked: boolean; issueCount: number }>>(
          `/api/baocao/summary?issues=only&spot=${spot}&from=${f}&to=${t}&dates=${res.pendingDays.join(",")}`,
        )
          .then((issues) =>
            setData((cur) =>
              cur && cur.from === res.from && cur.to === res.to && cur.spot === res.spot
                ? { ...cur, issuesPending: false, days: cur.days.map((d) => (issues[d.date] ? { ...d, ...issues[d.date] } : d)) }
                : cur,
            ),
          )
          .catch(() => setData((cur) => (cur ? { ...cur, issuesPending: false } : cur)));
      }
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
    return <PageLoading />;
  }

  const preset = (days: number) => {
    setFrom(shiftDateKey(today, -(days - 1)));
    setTo(today);
  };

  const thisMonth = () => {
    setFrom(`${today.slice(0, 7)}-01`);
    setTo(today);
  };

  /** Tháng trước, trọn tháng dương lịch. */
  const lastMonth = () => {
    const end = shiftDateKey(`${today.slice(0, 7)}-01`, -1);
    setFrom(`${end.slice(0, 7)}-01`);
    setTo(end);
  };

  const r = data?.rollup;

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
      subtitle="Mọi con số đếm thẳng từ sổ booking. Khối CẢ KỲ gồm mọi ngày; khối ĐÃ CHỐT chỉ gồm ngày kế toán đã chốt."
    >
      <SpotSwitcher spot={spot} options={spotOptions} onChange={setSpot} />

      <Card title="Khoảng thời gian">
        <div className="grid gap-3 @md:grid-cols-2">
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
          <Button variant="ghost" className="h-9 px-3 text-xs" onClick={lastMonth}>
            Tháng trước
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
            className="inline-flex h-10 items-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Tải Excel cả kỳ (.xlsx)
          </a>
          <a
            href={`/api/baocao/export?month=${to.slice(0, 7)}&spot=${spot}`}
            className="inline-flex h-10 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Tải Excel tháng {to.slice(0, 7)}
          </a>
          <Button variant="ghost" onClick={pushAgain} disabled={resync.running}>
            {resync.running ? "Đang đẩy lại…" : "Đẩy lại Google Sheets"}
          </Button>
        </div>

        {/* AI BỎ BOOKING trong kỳ — không cấm ai bỏ, nhưng bỏ nhiều bất thường thì thấy ngay */}
        {(data?.voidedByPerson?.length ?? 0) > 0 && (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50/60 p-2.5">
            <div className="text-sm font-bold text-amber-900">
              🗑 Booking đã bỏ khỏi sổ trong kỳ ({data!.voidedByPerson!.reduce((t, p) => t + p.total, 0)})
            </div>
            <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
              {data!.voidedByPerson!.map((p) => (
                <li key={p.name} className="flex gap-2">
                  <span className="min-w-0 flex-1 truncate">
                    <strong>{p.name}</strong>
                    <span className="text-slate-500">
                      {" "}
                      · nhập nhầm {p.mistake} · trùng {p.duplicate} · {p.guests} khách
                    </span>
                  </span>
                  <strong className="shrink-0 tabular-nums">{p.total}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}

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

      {busy && !data && <InlineLoading />}

      {data && r && (
        <Card
          title={`CẢ KỲ · ${formatDateKeyVN(data.from)} – ${formatDateKeyVN(data.to)}`}
          hint="Đếm thẳng từ sổ: booking, lệnh thêm/bớt dịch vụ, lệnh hoàn. Ngày đã chốt hay chưa cũng một cách đếm."
        >
          <div
            className={
              "mb-3 rounded-xl border px-3 py-2 text-sm " +
              (r.openDates.length ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900")
            }
          >
            <strong>
              {r.dayCount} ngày có số liệu: đã chốt {r.closedCount} · chưa chốt {r.openDates.length}
            </strong>
            {r.openDates.length > 0 && (
              <>
                <div className="mt-0.5 text-xs leading-snug">
                  Chưa chốt: {r.openDates.slice(0, 10).map((d) => formatDateKeyVN(d).slice(0, 5)).join(", ")}
                  {r.openDates.length > 10 ? "…" : ""} — số của những ngày này còn có thể đổi.
                </div>
                <div className="mt-0.5 text-xs">
                  Vào <Link href="/baocao/chot-ngay" className="font-semibold underline">Chốt ngày</Link> để soát và chốt.
                </div>
              </>
            )}
          </div>
          <RollupSections rollup={r} so={r.all.so} bc={r.all.bc} />
        </Card>
      )}

      {data && r && (
        <Card
          title={`Tổng đã chốt · ${r.closedCount}/${r.dayCount} ngày`}
          hint={
            r.closedCount
              ? `Cùng bộ chỉ tiêu với khối CẢ KỲ nhưng CHỈ của ${r.closedCount} ngày kế toán đã chốt trong ${formatDateKeyVN(data.from)} – ${formatDateKeyVN(data.to)}. Ô vàng: số kế toán gõ lúc chốt khác số sổ.`
              : undefined
          }
        >
          {r.closedCount === 0 ? (
            <p className="text-sm text-slate-500">Chưa có ngày nào được chốt trong khoảng này — xem khối CẢ KỲ ở trên.</p>
          ) : (
            <>
              <MismatchList lech={r.closed.lech} />
              <RollupSections rollup={r} so={r.closed.so} bc={r.closed.bc} chot={r.closed.chot} lech={r.closed.lech} />
            </>
          )}
        </Card>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["days", "Theo ngày"],
                ["seller", "Theo người bán"],
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

          {/* Bảng người bán có nút "Chép bảng" riêng ngay trong bảng */}
          {tab !== "seller" && (
            <a
              href={`/api/baocao/summary?from=${from}&to=${to}&format=csv&type=${tab}&spot=${spot}`}
              className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Tải CSV bảng đang xem
            </a>
          )}
        </div>

        {busy && <InlineLoading />}

        {!busy && data && tab === "days" && <DaysTable data={data} />}
        {!busy && data && tab === "seller" && <SellerTable rollup={data.rollup} />}
        {!busy && data && tab === "bypilot" && <ByPilotTable data={data} />}
        {!busy && data && tab === "pilot" && <PilotTable data={data} />}
        {!busy && data && tab === "dispatcher" && <DispatcherTable data={data} />}
        {!busy && data && tab === "cameraman" && <CameramanTable data={data} />}
      </Card>
    </Shell>
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

/**
 * THEO NGÀY — số theo SỔ; ô nào kế toán đã chốt một số khác thì hiện kèm
 * "KT n ⚠". Bấm ▸ để mở đủ năm khối của riêng ngày đó.
 */
function DaysTable({ data }: { data: BaobaySummaryDTO & { issuesPending?: boolean } }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!data.days.length) return <Empty />;
  const r = data.rollup;
  const byDate = new Map(r.days.map((d) => [d.date, d]));
  const services = r.services;
  const colCount = 17 + services.length;

  return (
    <Scroll>
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="bg-slate-50">
            <th className={th} />
            <th className={th}>Ngày</th>
            <th className={th}>Trạng thái</th>
            <th className={th}>Khách bay</th>
            <th className={th}>PC báo</th>
            <th className={th}>Vé đã xuất (sổ / quầy)</th>
            <th className={th}>Vé thu hồi</th>
            <th className={th}>Khách huỷ</th>
            <th className={th}>Dời đi / tới</th>
            {services.map((s) => (
              <th key={s.key} className={th}>
                {s.short.split(" (")[0]}
              </th>
            ))}
            <th className={th}>Combo</th>
            <th className={th}>Tổng đã thu</th>
            <th className={th}>Tiền mặt</th>
            <th className={th}>Chuyển khoản</th>
            <th className={th}>Còn thu</th>
            <th className={th}>Hoàn đã chi</th>
            <th className={th}>Ngoại giao (vé · thu)</th>
            <th className={th}>Chi nhân viên</th>
            <th className={th}>PC đã chốt</th>
          </tr>
        </thead>
        <tbody>
          {data.days.map((d) => {
            const dim = d.status !== "closed";
            const x = byDate.get(d.date);
            if (!x) return null;
            const so = x.so;
            const lech = new Map(x.lech.map((l) => [l.key, l]));
            /** Số sổ + (nếu kế toán chốt số khác) "KT n ⚠". */
            const withKt = (key: string, value: number) => (
              <>
                {value || "—"}
                {lech.has(key) && <span className="ml-1 rounded bg-amber-100 px-1 text-[11px] font-semibold text-amber-800">KT {lech.get(key)!.chot} ⚠</span>}
              </>
            );
            const isOpen = open === d.date;
            return (
              <Fragment key={d.date}>
                <tr className={dim ? "border-b border-slate-100 bg-slate-50/40" : "border-b border-slate-100"}>
                  <td className="px-1 py-2">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : d.date)}
                      aria-expanded={isOpen}
                      aria-label={`Chi tiết ngày ${formatDateKeyVN(d.date)}`}
                      className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-sm text-slate-600 hover:bg-slate-50"
                    >
                      {isOpen ? "▾" : "▸"}
                    </button>
                  </td>
                  <td className={`${td} font-medium`}>
                    <Link href={`/baocao/chot-ngay?date=${d.date}`} className="hover:underline">
                      {formatDateKeyVN(d.date)}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <StatusPill status={d.status} blocked={d.blocked} />
                    {d.closedBy && <span className="ml-1 text-xs text-emerald-700">{d.closedBy} đã chốt</span>}
                    {d.issueCount > 0 && <span className="ml-1 text-xs text-rose-700">{d.issueCount} lỗi</span>}
                    {dim && data.issuesPending && <span className="ml-1 text-[11px] text-slate-400">đang soát…</span>}
                  </td>
                  <td className={`${td} font-semibold`}>
                    {withKt("guests", so.guestsFlown)}
                    {so.guestsOpen > 0 && <span className="ml-1 text-xs font-normal text-amber-700">+{so.guestsOpen} chờ</span>}
                  </td>
                  <td className={td}>{d.pilotFlights}</td>
                  <td className={td}>
                    {withKt("ticketsIssued", so.ticketsIssued)}
                    <span className="ml-1 text-xs text-slate-500">/ {x.bc.counterIssued}</span>
                  </td>
                  <td className={td}>{withKt("ticketsReturned", so.ticketsRecalled)}</td>
                  <td className={td}>{withKt("cancelledGuests", so.cancelledGuests + so.partialCancelledGuests)}</td>
                  <td className={td}>
                    {so.movedOutGuests || "—"} / {so.movedInGuests || "—"}
                  </td>
                  {services.map((s) => (
                    <td key={s.key} className={td}>
                      {withKt(`svc.${s.key}`, so.svcFlown[s.key])}
                    </td>
                  ))}
                  <td className={td}>{so.combos || "—"}</td>
                  <td className={`${td} font-semibold`}>{formatVND(d.revenueTotal)}</td>
                  <td className={td}>{formatVND(d.cashTotal)}</td>
                  <td className={td}>{formatVND(d.transferTotal)}</td>
                  <td className={`${td} ` + (d.bookingRemaining > 0 ? "font-semibold text-rose-700" : "text-slate-400")}>
                    {d.bookingRemaining > 0 ? formatVND(d.bookingRemaining) : "—"}
                  </td>
                  <td className={td}>{d.refundTotal ? formatVND(d.refundTotal) : "—"}</td>
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
                {isOpen && (
                  <tr>
                    <td colSpan={colCount} className="border-b border-slate-200 bg-white p-0">
                      {/* Dính mép trái + rộng bằng màn hình: bảng cuộn ngang nhưng khối chi tiết đọc được trên điện thoại */}
                      <div className="sticky left-0 w-[calc(100vw-3.5rem)] max-w-3xl p-3 @container">
                        <div className="mb-2 text-sm font-bold text-slate-800">
                          Chi tiết {formatDateKeyVN(d.date)} {d.status === "closed" ? "· đã chốt" : "· chưa chốt"}
                        </div>
                        {x.lech.length > 0 && <MismatchList lech={x.lech} />}
                        <RollupSections rollup={r} so={x.so} bc={x.bc} chot={d.status === "closed" ? x.chot : undefined} lech={x.lech} />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
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
            {/* Suất ăn & xe phi công khai — thanh toán với bếp và đội xe theo kỳ */}
            <th className={th}>Ăn S/T/T</th>
            <th className={th}>Xe ôm</th>
            <th className={th}>Ô tô</th>
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
              <td className={td}>
                {p.mealBreakfast || p.mealLunch || p.mealDinner
                  ? `${p.mealBreakfast}/${p.mealLunch}/${p.mealDinner}`
                  : "—"}
              </td>
              <td className={td}>{p.motorbikeRides || "—"}</td>
              <td className={td}>{p.carRides || "—"}</td>
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
  /** Bay lâu chỉ Khau Phạ (chủ 02/10) — điểm khác bỏ hẳn cột. */
  const coBayLau = serviceSoldAt(data.spot, "longFlight");

  return (
    <Scroll>
      <table className="min-w-full border-separate border-spacing-0">
        <thead>
          <tr className="bg-slate-50">
            <th className={th}>Ngày</th>
            <th className={th}>Điều phối</th>
            <th className={th}>Chốt</th>
            <th className={th}>Khách</th>
            <th className={th}>Vé xuất</th>
            <th className={th}>Thu về</th>
            <th className={th}>Dải mã vé</th>
            <th className={th}>Huỷ</th>
            <th className={th}>Dời lịch</th>
            <th className={th}>Flycam</th>
            <th className={th}>360</th>
            <th className={th}>Cờ đỏ</th>
            <th className={th}>H.hôn / S.mây / B.minh</th>
            {/* Bay lâu là dịch vụ riêng từ chủ 02/10 — cột riêng cạnh hoàng hôn */}
            {coBayLau && <th className={th}>Bay lâu</th>}
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
                <td className={td}>
                  {r.submitted ? <span className="text-emerald-600">✓</span> : <span className="text-amber-600">nháp</span>}
                </td>
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
                <td className={td}>{r.sunset}</td>
                {coBayLau && <td className={td}>{r.longFlight ?? 0}</td>}
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
