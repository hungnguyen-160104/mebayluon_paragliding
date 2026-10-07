// app/baocao/components/RollupView.tsx
"use client";

/**
 * BẢNG CỘNG ĐẦY ĐỦ THEO SỔ (chủ 07/10/2026) — phần hiển thị dùng chung cho Bảng
 * tổng hợp (khối CẢ KỲ, khối đã chốt, dòng mở rộng của từng ngày) và Báo cáo
 * tháng. Số liệu do máy chủ đếm sẵn (lib/baobay/rollup.ts); ở đây chỉ bày.
 *
 * Điện thoại 390px: lưới 2 cột, không bảng rộng. Mỗi ô một con số theo SỔ; dòng
 * nhỏ bên dưới là số đứng cạnh để so — nhân viên báo, quầy khai, kế toán chốt.
 */

import { useMemo, useState } from "react";

import { FLIGHT_KIND_SHORT, serviceSoldAt, type FlightKind, type ServiceKey } from "@/lib/baobay/flight-price";
import {
  FLIGHT_KINDS,
  SERVICE_KEYS,
  SERVICE_SHORT,
  type CloseNumbers,
  type LedgerRollup,
  type PeriodRollupDTO,
  type RollupMismatch,
  type SellerRollup,
  type StaffRollup,
} from "@/lib/baobay/rollup";
import { formatVND } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const n = (v: number) => v.toLocaleString("vi-VN");

function Cell({
  label,
  value,
  sub,
  strong,
  warn,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  strong?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={cn("min-w-0 rounded-xl border px-3 py-2", warn ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50")}>
      <div className="text-xs leading-snug text-slate-500">{label}</div>
      <div className={cn("break-words text-base tabular-nums", strong ? "font-bold text-emerald-700" : "font-semibold text-slate-900")}>{value}</div>
      {sub ? <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{sub}</div> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <h3 className="mb-1.5 text-sm font-bold text-slate-800">{title}</h3>
      <div className="grid grid-cols-2 gap-2 @2xl:grid-cols-4">{children}</div>
    </div>
  );
}

/** Dịch vụ cần bày: thứ điểm này bán, cộng thêm thứ nào lỡ có số (bản ghi cũ). */
function serviceList(rollup: PeriodRollupDTO, so: LedgerRollup): Array<{ key: ServiceKey; short: string }> {
  const sold = rollup.services.map((s) => ({ key: s.key, short: s.short }));
  const have = new Set(sold.map((s) => s.key));
  for (const k of SERVICE_KEYS) {
    if (have.has(k)) continue;
    if (so.svcFlown[k] || so.svcOpen[k] || so.svcAdded[k] || so.svcRemoved[k]) sold.push({ key: k, short: SERVICE_SHORT[k] });
  }
  return sold;
}

function kindList(rollup: PeriodRollupDTO, so: LedgerRollup): Array<{ key: FlightKind; label: string }> {
  const out = rollup.kinds.map((k) => ({ key: k.key, label: k.label }));
  const have = new Set(out.map((k) => k.key));
  for (const k of FLIGHT_KINDS) if (!have.has(k) && (so.flownByKind[k] || so.openByKind[k])) out.push({ key: k, label: FLIGHT_KIND_SHORT[k] });
  return out;
}

/**
 * Năm khối: Khách & chuyến bay · Vé · Dịch vụ · Huỷ / dời / hoàn · Tiền.
 * Có `chot` (số kế toán gõ) thì mỗi ô kèm số ấy và tô vàng ô nào lệch.
 */
export function RollupSections({
  rollup,
  so,
  bc,
  chot,
  lech = [],
}: {
  rollup: PeriodRollupDTO;
  so: LedgerRollup;
  bc: StaffRollup;
  chot?: CloseNumbers;
  lech?: RollupMismatch[];
}) {
  const bad = new Set(lech.map((l) => l.key));
  const kt = (key: string, v: number | undefined) =>
    chot && v !== undefined ? (
      <span className={bad.has(key) ? "font-semibold text-amber-800" : undefined}>
        kế toán chốt: {n(v)}
        {bad.has(key) ? " ⚠" : ""}
      </span>
    ) : null;
  const join = (...parts: React.ReactNode[]) => {
    const list = parts.filter(Boolean);
    return list.length ? list.map((p, i) => <span key={i}>{i ? " · " : ""}{p}</span>) : null;
  };
  const services = serviceList(rollup, so);
  const kinds = kindList(rollup, so);
  const coBayLau = serviceSoldAt(rollup.spot, "longFlight") || so.longFlightFree + so.longFlightCharged > 0;
  const hoanDaChi = so.refundPaid + so.opCancelPaid;
  const hoanCho = so.refundPending + so.opCancelPending;
  const chietKhau = so.commissionCash + so.commissionTransfer + so.commissionAgency;

  return (
    <div>
      <Section title="Khách & chuyến bay">
        <Cell label="Khách đã bay" value={n(so.guestsFlown)} strong warn={bad.has("guests")} sub={join(`${n(so.bookingsFlown)} booking`, kt("guests", chot?.guestCount))} />
        {kinds.map((k) => (
          <Cell key={k.key} label={`Bay ${k.label}`} value={n(so.flownByKind[k.key])} sub={so.openByKind[k.key] ? `chờ bay ${n(so.openByKind[k.key])}` : undefined} />
        ))}
        <Cell label="Chuyến phi công báo" value={n(bc.pilotPg + bc.pilotPpg)} sub={`PG ${n(bc.pilotPg)} · PPG ${n(bc.pilotPpg)}`} />
        <Cell label="Bay không vé" value={n(so.noTicketGuests)} sub={chot ? `kế toán chốt: ${n(chot.noTicketGuests)}` : "theo cờ không vé trên booking"} />
        {so.guestsOpen > 0 && <Cell label="Còn chờ bay (chưa tích đã bay)" value={n(so.guestsOpen)} sub={`${n(so.bookingsOpen)} booking`} warn />}
        {(bc.diplomaticTickets > 0 || bc.diplomaticGuests > 0 || bc.diplomaticAmount > 0) && (
          <Cell label="Ngoại giao (quầy khai vé)" value={n(bc.diplomaticTickets)} sub={join(`phi công khai ${n(bc.diplomaticGuests)}`, bc.diplomaticAmount ? `thu ${formatVND(bc.diplomaticAmount)}` : null)} />
        )}
      </Section>

      <Section title="Vé">
        <Cell label="Vé đã xuất" value={n(so.ticketsIssued)} warn={bad.has("ticketsIssued")} sub={join(`quầy khai ${n(bc.counterIssued)}`, kt("ticketsIssued", chot?.ticketsIssued))} />
        <Cell label="Vé đã bay" value={n(so.ticketsFlown)} sub={so.ticketsOpen ? `còn chờ bay ${n(so.ticketsOpen)}` : undefined} />
        <Cell label="Vé thu hồi (huỷ sau khi xuất)" value={n(so.ticketsRecalled)} warn={bad.has("ticketsReturned")} sub={join(bc.counterReturned ? `quầy khai ${n(bc.counterReturned)}` : null, kt("ticketsReturned", chot?.ticketsReturned))} />
        <Cell label="Vé dời (khách mang đi)" value={n(so.ticketsMovedOut)} sub={`mang tới từ ngày khác ${n(so.ticketsCarriedIn)}`} />
        {so.qrIssued + so.qrRecalled > 0 && <Cell label="Vé QR đang hiệu lực" value={n(so.qrIssued)} sub={`đã quét bay ${n(so.qrFlown)} · thu hồi ${n(so.qrRecalled)}`} />}
      </Section>

      <Section title="Dịch vụ">
        {services.map((s) => (
          <Cell
            key={s.key}
            label={s.short}
            value={n(so.svcFlown[s.key])}
            warn={bad.has(`svc.${s.key}`)}
            sub={join(so.svcOpen[s.key] ? `chờ bay ${n(so.svcOpen[s.key])}` : null, `nhân viên báo ${n(bc.svc[s.key])}`, kt(`svc.${s.key}`, chot?.svc[s.key]))}
          />
        ))}
        {coBayLau && <Cell label="Bay lâu: tính tiền / miễn phí kèm gói" value={`${n(so.longFlightCharged)} / ${n(so.longFlightFree)}`} />}
        <Cell label="Combo flycam + 360" value={n(so.combos)} sub={so.comboDiscount ? `giảm ${formatVND(so.comboDiscount)}` : undefined} />
        {so.mountainCar > 0 && <Cell label="Xe lên núi (suất)" value={n(so.mountainCar)} />}
        {so.pickupFee > 0 && <Cell label="Phí đưa đón" value={formatVND(so.pickupFee)} />}
        <Cell
          label="Thêm dịch vụ tại bãi"
          value={`${n(so.svcAddOrders)} lệnh`}
          sub={join(
            so.svcAddedCharge ? `thu thêm ${formatVND(so.svcAddedCharge)}` : null,
            services.filter((s) => so.svcAdded[s.key]).map((s) => `${s.short.split(" (")[0]} ${n(so.svcAdded[s.key])}`).join(" · ") || null,
          )}
        />
      </Section>

      <Section title="Huỷ / dời / hoàn">
        <Cell
          label="Khách huỷ (vé huỷ)"
          value={n(so.cancelledGuests + so.partialCancelledGuests)}
          warn={bad.has("cancelledGuests")}
          sub={join(
            `${n(so.cancelledBookings)} booking huỷ`,
            so.partialCancelledGuests ? `huỷ bớt ${n(so.partialCancelledGuests)} khách` : null,
            `có hoàn ${n(so.cancelledGuestsRefund)} · không hoàn ${n(so.cancelledGuestsNoRefund)}`,
            kt("cancelledGuests", chot?.cancelledGuests),
          )}
        />
        <Cell label="Dời đi (khách)" value={n(so.movedOutGuests)} sub={`${n(so.movedOutBookings)} booking`} />
        <Cell label="Dời tới (khách)" value={n(so.movedInGuests)} sub={`${n(so.movedInBookings)} booking`} />
        {so.voidedBookings > 0 && <Cell label="Booking bỏ khỏi sổ" value={n(so.voidedBookings)} sub="nhập nhầm / trùng" />}
        <Cell
          label="Huỷ dịch vụ"
          value={`${n(so.svcRemoveOrders + so.opCancelCount)} lệnh`}
          sub={join(
            services
              .filter((s) => so.svcRemoved[s.key] || so.opCancel[s.key])
              .map((s) => `${s.short.split(" (")[0]} ${n(so.svcRemoved[s.key] + so.opCancel[s.key])}${so.svcRemovedAmount[s.key] ? ` = ${formatVND(so.svcRemovedAmount[s.key])}` : ""}`)
              .join(" · ") || null,
            so.opCancelCount ? `trong đó phi công báo ${n(so.opCancelCount)}` : null,
          )}
        />
        <Cell
          label="Hoàn dịch vụ"
          value={formatVND(so.refundSvcAmount + so.opCancelPaid)}
          sub={join(
            `${n(so.refundSvcCount)} lệnh hoàn tiền`,
            so.svcRemovedCredit ? `trừ vào còn thu ${formatVND(so.svcRemovedCredit)}` : null,
            so.opCancelPending ? `phi công báo, chờ chi ${formatVND(so.opCancelPending)}` : null,
          )}
        />
        <Cell label="Hoàn huỷ bay (cả đoàn)" value={formatVND(so.refundFullAmount)} sub={`${n(so.refundFullCount)} lệnh`} />
        <Cell label="Hoàn huỷ bớt khách" value={formatVND(so.refundPartialAmount)} sub={`${n(so.refundPartialCount)} lệnh`} />
        <Cell label="Tổng hoàn khách ĐÃ CHI" value={formatVND(hoanDaChi)} strong sub={`${n(so.refundCount)} lệnh hoàn`} />
        <Cell
          label="Hoàn bằng tiền mặt / chuyển khoản"
          value={`${formatVND(so.refundCash)} / ${formatVND(so.refundTransfer)}`}
          sub={
            so.refundTransfer
              ? join(
                  so.refundFromCompany ? `MB công ty ${formatVND(so.refundFromCompany)}` : null,
                  so.refundFromPersonal ? `BIDV ${formatVND(so.refundFromPersonal)}` : null,
                  so.refundFromUnknown ? `lệnh cũ chưa ghi TK ${formatVND(so.refundFromUnknown)}` : null,
                )
              : undefined
          }
        />
        {hoanCho > 0 && <Cell label="Hoàn CHỜ CHI" value={formatVND(hoanCho)} warn sub={`${n(so.refundPendingCount + so.opCancelPendingCount)} lệnh chờ kế toán chuyển`} />}
      </Section>

      <Section title="Tiền">
        <Cell label="Giá trị sổ booking" value={formatVND(so.bookingValue)} />
        <Cell label="Tổng đã thu" value={formatVND(so.collected)} strong />
        <Cell label="Tiền mặt đã thu" value={formatVND(so.cash)} sub={`lệnh thu TM lập trong kỳ ${formatVND(bc.collectCash)}`} />
        <Cell
          label="Chuyển khoản đã thu"
          value={formatVND(so.transfer)}
          sub={join(so.transferCompany ? `MB công ty ${formatVND(so.transferCompany)} · BIDV ${formatVND(so.transferPersonal)}` : null, `lệnh thu CK lập trong kỳ ${formatVND(bc.collectTransfer)}`)}
        />
        {so.other > 0 && <Cell label="Đã thu chưa rõ hình thức (cọc gõ tay)" value={formatVND(so.other)} />}
        <Cell label="CÒN THU (khách còn nợ)" value={formatVND(so.remaining)} warn={so.remaining > 0} />
        <Cell label="Giảm trừ trên booking" value={formatVND(so.discount)} sub={so.comboDiscount ? `chưa gồm giảm combo ${formatVND(so.comboDiscount)}` : undefined} />
        <Cell
          label="Chiết khấu đại lý"
          value={formatVND(chietKhau)}
          sub={chietKhau ? join(so.commissionCash ? `TM ${formatVND(so.commissionCash)}` : null, so.commissionTransfer ? `CK ${formatVND(so.commissionTransfer)}` : null, so.commissionAgency ? `đại lý giữ lại ${formatVND(so.commissionAgency)}` : null) : undefined}
        />
        {so.agencyPaid > 0 && <Cell label="Đại lý / OTA thu hộ" value={formatVND(so.agencyPaid)} sub="tiền đang nằm ở đại lý" />}
        {so.cancelledPaid > 0 && (
          <Cell label="Booking huỷ: còn giữ của khách" value={formatVND(so.cancelledKept)} sub={`đã trả ${formatVND(so.cancelledPaid)} · đã hoàn ${formatVND(so.cancelledRefunded)} — không nằm trong “đã thu”`} />
        )}
        <Cell label="Chi nhân viên" value={formatVND(bc.expenseTotal)} />
        {bc.diplomaticAmount > 0 && <Cell label="Thu từ khách ngoại giao" value={formatVND(bc.diplomaticAmount)} />}
      </Section>
    </div>
  );
}

/** Danh sách ô lệch giữa số kế toán gõ và số sổ — đặt đầu khối "đã chốt". */
export function MismatchList({ lech }: { lech: RollupMismatch[] }) {
  if (!lech.length) return null;
  return (
    <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <div className="font-bold">⚠ Số kế toán chốt khác số sổ ({lech.length} mục)</div>
      <ul className="mt-1 space-y-0.5 text-xs">
        {lech.map((l) => (
          <li key={l.key}>
            <strong>{l.label}</strong>: kế toán chốt {n(l.chot)} · sổ {n(l.so)}
            {l.days ? <span className="text-amber-700"> — lệch ở {l.days} ngày</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Theo người bán                                                       */
/* ------------------------------------------------------------------ */

type SortKey = "value" | "collected" | "guests" | "services" | "name";

const svcTotal = (s: LedgerRollup) => SERVICE_KEYS.reduce((t, k) => t + s.svcFlown[k] + s.svcOpen[k], 0);

/** Cột của bảng chép (TSV) — cũng là danh sách số bày trong phần mở rộng của từng người. */
function sellerColumns(rollup: PeriodRollupDTO): Array<{ label: string; money?: boolean; get: (s: LedgerRollup) => number }> {
  const all = rollup.all.so;
  const services = serviceList(rollup, all);
  const kinds = kindList(rollup, all);
  return [
    { label: "Booking đã bay", get: (s) => s.bookingsFlown },
    { label: "Khách đã bay", get: (s) => s.guestsFlown },
    ...kinds.map((k) => ({ label: `Bay ${k.label}`, get: (s: LedgerRollup) => s.flownByKind[k.key] })),
    { label: "Khách chờ bay", get: (s) => s.guestsOpen },
    { label: "Giá trị sổ", money: true, get: (s) => s.bookingValue },
    { label: "Đã thu", money: true, get: (s) => s.collected },
    { label: "Thu tiền mặt", money: true, get: (s) => s.cash },
    { label: "Thu chuyển khoản", money: true, get: (s) => s.transfer },
    { label: "Thu chưa rõ hình thức", money: true, get: (s) => s.other },
    { label: "Còn thu", money: true, get: (s) => s.remaining },
    ...services.map((x) => ({ label: x.short.split(" (")[0], get: (s: LedgerRollup) => s.svcFlown[x.key] + s.svcOpen[x.key] })),
    { label: "Bay lâu tính tiền", get: (s) => s.longFlightCharged },
    { label: "Combo flycam+360", get: (s) => s.combos },
    { label: "Lệnh thêm dịch vụ", get: (s) => s.svcAddOrders },
    { label: "Thu thêm dịch vụ", money: true, get: (s) => s.svcAddedCharge },
    { label: "Lệnh huỷ dịch vụ (tự bấm)", get: (s) => s.svcRemoveOrders },
    { label: "Booking huỷ", get: (s) => s.cancelledBookings },
    { label: "Khách huỷ", get: (s) => s.cancelledGuests + s.partialCancelledGuests },
    { label: "Booking dời đi", get: (s) => s.movedOutBookings },
    { label: "Khách dời đi", get: (s) => s.movedOutGuests },
    { label: "Số lệnh hoàn đã chi", get: (s) => s.refundCount },
    { label: "Tiền hoàn đã chi", money: true, get: (s) => s.refundPaid + s.opCancelPaid },
    { label: "Số lệnh hoàn dịch vụ", get: (s) => s.refundSvcCount },
    { label: "Tiền hoàn dịch vụ", money: true, get: (s) => s.refundSvcAmount + s.opCancelPaid },
    { label: "Hoàn chờ chi", money: true, get: (s) => s.refundPending + s.opCancelPending },
    { label: "Chiết khấu đại lý", money: true, get: (s) => s.commissionCash + s.commissionTransfer + s.commissionAgency },
    { label: "Giảm trừ", money: true, get: (s) => s.discount },
    { label: "Giảm combo", money: true, get: (s) => s.comboDiscount },
  ];
}

/**
 * THEO NGƯỜI BÁN — cả kỳ đang xem (mọi ngày tới hôm nay, kể cả chưa chốt).
 * Người bán = người LẬP booking; dịch vụ thêm tại bãi tính cho người lập lệnh thêm.
 */
export function SellerTable({ rollup }: { rollup: PeriodRollupDTO }) {
  const [sort, setSort] = useState<SortKey>("value");
  const [copied, setCopied] = useState(false);
  const cols = useMemo(() => sellerColumns(rollup), [rollup]);
  const services = useMemo(() => serviceList(rollup, rollup.all.so), [rollup]);
  const list = useMemo(() => {
    const by: Record<SortKey, (a: SellerRollup, b: SellerRollup) => number> = {
      value: (a, b) => b.so.bookingValue - a.so.bookingValue,
      collected: (a, b) => b.so.collected - a.so.collected,
      guests: (a, b) => b.so.guestsFlown - a.so.guestsFlown,
      services: (a, b) => svcTotal(b.so) - svcTotal(a.so),
      name: (a, b) => a.name.localeCompare(b.name, "vi"),
    };
    return [...rollup.bySeller].sort(by[sort]);
  }, [rollup, sort]);

  if (!rollup.bySeller.length) return <p className="text-sm text-slate-500">Chưa có booking nào trong khoảng ngày đã chọn.</p>;

  async function copy() {
    const rows = [
      ["Người bán", "Tài khoản", ...cols.map((c) => c.label)],
      ...list.map((p) => [p.name, p.key || "—", ...cols.map((c) => String(c.get(p.so)))]),
      ["TỔNG", "", ...cols.map((c) => String(c.get(rollup.all.so)))],
    ];
    const text = rows.map((r) => r.join("\t")).join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Trình duyệt cũ / không có quyền clipboard: dùng ô nhập tạm
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label className="text-xs text-slate-500" htmlFor="seller-sort">
          Xếp theo
        </label>
        <select id="seller-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm">
          <option value="value">Giá trị sổ</option>
          <option value="collected">Đã thu</option>
          <option value="guests">Khách đã bay</option>
          <option value="services">Số dịch vụ</option>
          <option value="name">Tên</option>
        </select>
        <button type="button" onClick={copy} className="ml-auto inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          {copied ? "✓ Đã chép" : "⧉ Chép bảng (dán vào Excel / Sheets)"}
        </button>
      </div>
      <p className="mb-2 text-xs leading-snug text-slate-500">
        Người bán = người <strong>lập booking</strong>. Dịch vụ thêm tại bãi tính cho người lập lệnh thêm; dịch vụ bị huỷ trừ vào người đã bán suất đó. Tiền là
        giá trị và số đã thu của các booking người đó bán (không phải tiền người đó cầm). Bấm vào tên để xem đủ.
      </p>
      <ul className="space-y-2">
        {list.map((p) => (
          <li key={p.key || "none"}>
            <details className="group rounded-xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer items-start gap-2 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">
                    {p.name}
                    {p.kind !== "staff" && <span className="ml-1 rounded bg-slate-200 px-1 text-[10px] font-medium text-slate-600">{p.kind === "web" ? "web" : p.kind === "ota" ? "OTA" : "?"}</span>}
                  </span>
                  <span className="block text-xs leading-snug text-slate-500">
                    {n(p.so.guestsFlown)} khách bay · {n(p.so.bookingsFlown)} booking
                    {p.so.guestsOpen ? ` · chờ ${n(p.so.guestsOpen)}` : ""}
                  </span>
                  <span className="block text-xs leading-snug text-slate-600">
                    {services
                      .filter((s) => p.so.svcFlown[s.key] + p.so.svcOpen[s.key] !== 0)
                      .map((s) => `${s.short.split(" (")[0]} ${n(p.so.svcFlown[s.key] + p.so.svcOpen[s.key])}`)
                      .join(" · ") || "không dịch vụ"}
                    {p.so.combos ? ` · combo ${n(p.so.combos)}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-bold tabular-nums text-emerald-700">{formatVND(p.so.collected)}</span>
                  <span className="block text-[11px] tabular-nums text-slate-500">sổ {formatVND(p.so.bookingValue)}</span>
                </span>
                <span aria-hidden className="mt-1 text-slate-400 transition-transform group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-slate-100 px-3 py-2 text-xs @2xl:grid-cols-3">
                {cols
                  .filter((c) => c.get(p.so) !== 0)
                  .map((c) => (
                    <div key={c.label} className="flex min-w-0 items-baseline justify-between gap-2 border-b border-slate-50 py-0.5">
                      <dt className="min-w-0 text-slate-500">{c.label}</dt>
                      <dd className="shrink-0 font-semibold tabular-nums text-slate-900">{c.money ? formatVND(c.get(p.so)) : n(c.get(p.so))}</dd>
                    </div>
                  ))}
              </dl>
            </details>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-500">
        Cộng {rollup.bySeller.length} dòng: {n(rollup.all.so.guestsFlown)} khách bay · giá trị sổ {formatVND(rollup.all.so.bookingValue)} · đã thu {formatVND(rollup.all.so.collected)} — đúng bằng khối CẢ KỲ.
      </p>
    </div>
  );
}
