// app/baocao/ke-toan/page.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { formatDateKeyVN, todayInVN } from "@/lib/baobay/date";
import type { DailyCloseDTO, HandoverDTO } from "@/lib/baobay/types";
import { formatVND } from "@/lib/pricing";
import type { MoneyBoard, FlycamCancelDTO, RefundDTO } from "@/services/baobay.service";

import { apiGet } from "../components/client-api";
import { BankCheckCard } from "../components/BankCheckCard";
import { DateBar } from "../components/DateBar";
import { useBaobaySession } from "../components/session";
import { Shell } from "../components/Shell";
import { useSpot } from "../components/spot";
import { Banner, Card, PageLoading } from "../components/ui";

/**
 * TRANG NHÀ CỦA KẾ TOÁN.
 *
 * Kế toán là một VAI TRÒ, còn "chốt ngày" chỉ là một bản số liệu của một ngày —
 * lấy tên bản số liệu làm tên vai trò thì người mang vai đó mở app lên không
 * biết chỗ của mình đâu. Trang này là chỗ của vai: mở ra thấy ngay hôm nay tiền
 * ra tiền vào thế nào, còn việc gì phải làm, rồi bấm sang đúng bản số liệu cần.
 *
 * Cố ý CHỈ ĐỌC và dẫn đường: mọi chức năng vẫn nằm đúng chỗ cũ (chốt ngày, tổng
 * hợp, báo cáo tháng, phạt nộp muộn) — không bóc ra để khỏi có hai lối làm cùng
 * một việc, thứ luôn dẫn tới nhập hai lần.
 */

type Todo = { label: string; count: number; money: number; href: string; tone: "rose" | "amber" | "sky" };

export default function KeToanPage() {
  const { user, loading } = useBaobaySession("accountant");
  const { spot, setSpot, options: spotOptions } = useSpot(user?.spots);
  const today = todayInVN();
  const [date, setDate] = useState(today);
  const [loadingDay, setLoadingDay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [board, setBoard] = useState<MoneyBoard | null>(null);
  const [close, setClose] = useState<DailyCloseDTO | null>(null);
  const [issues, setIssues] = useState<{ red: number; warn: number }>({ red: 0, warn: 0 });
  const [refunds, setRefunds] = useState<RefundDTO[]>([]);
  const [flycam, setFlycam] = useState<FlycamCancelDTO[]>([]);
  const [incoming, setIncoming] = useState<HandoverDTO[]>([]);

  const load = useCallback(async () => {
    if (!spot) return;
    setLoadingDay(true);
    setError(null);
    try {
      const [b, c, r, f, h] = await Promise.all([
        apiGet<MoneyBoard>(`/api/baocao/money-board?spot=${spot}&date=${date}`),
        apiGet<{ close: DailyCloseDTO | null; reconcile: { issues: Array<{ severity: string }> } }>(
          `/api/baocao/close?spot=${spot}&date=${date}`,
        ),
        apiGet<{ refunds: RefundDTO[] }>(`/api/baocao/refund?spot=${spot}&date=${date}`),
        apiGet<{ items: FlycamCancelDTO[] }>(`/api/baocao/flycam-cancel?spot=${spot}&date=${date}`),
        apiGet<{ incoming: HandoverDTO[] }>(`/api/baocao/handover?spot=${spot}`),
      ]);
      setBoard(b);
      setClose(c.close);
      const list = c.reconcile?.issues ?? [];
      setIssues({
        red: list.filter((i) => i.severity === "red").length,
        warn: list.filter((i) => i.severity === "warn").length,
      });
      setRefunds(r.refunds ?? []);
      setFlycam(f.items ?? []);
      setIncoming(h.incoming ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không tải được số của ngày");
    } finally {
      setLoadingDay(false);
    }
  }, [spot, date]);

  useEffect(() => {
    if (user && spot) load();
  }, [user, spot, load]);

  if (loading || !user || !spot) {
    return <PageLoading />;
  }

  const cashHeld = board?.cashByPerson ?? [];
  const pendingRefunds = refunds.filter((x) => x.status === "pending");
  const pendingFlycam = flycam.filter((x) => x.status === "pending");
  const pendingHandover = incoming.filter((x) => !x.confirmed && !x.rejected);

  /** Việc phải làm — chỉ hiện mục nào đang có, khỏi rối bằng những dòng số 0. */
  const todos: Todo[] = ([
    {
      label: "Lệnh hoàn tiền chờ chuyển cho khách",
      count: pendingRefunds.length,
      money: pendingRefunds.reduce((t, x) => t + x.amount, 0),
      href: "/baocao/chot-ngay",
      tone: "rose",
    },
    {
      label: "Huỷ flycam chờ hoàn tiền",
      count: pendingFlycam.length,
      money: pendingFlycam.reduce((t, x) => t + x.amount, 0),
      href: "/baocao/chot-ngay",
      tone: "rose",
    },
    {
      label: "Tiền nhân sự giao / xin ứng chờ mình xác nhận",
      count: pendingHandover.length,
      money: pendingHandover.reduce((t, x) => t + x.amount, 0),
      href: "/baocao/chot-ngay",
      tone: "amber",
    },
    {
      label: `Lỗi đỏ phải xử trước khi chốt ngày ${formatDateKeyVN(date)}`,
      count: issues.red,
      money: 0,
      href: "/baocao/chot-ngay",
      tone: "rose",
    },
  ] as Todo[]).filter((t) => t.count > 0);

  const revenue = (board?.cashTotal ?? 0) + (board?.transfer.total ?? 0);
  const spend = (board?.spendTotal ?? 0) + (board?.companySpend.total ?? 0);

  return (
    <Shell user={user} title="Kế toán">
      <DateBar
        date={date}
        onChange={setDate}
        loading={loadingDay}
        spot={spot}
        spotOptions={spotOptions}
        onSpotChange={(v) => setSpot(v as never)}
      />

      {error && <Banner tone="error">{error}</Banner>}

      {/* Trạng thái NGÀY — chốt hay chưa, đây là thứ kế toán hỏi đầu tiên */}
      <div
        className={
          "rounded-2xl border-2 px-4 py-3 " +
          (close?.status === "closed" ? "border-emerald-400 bg-emerald-50" : "border-amber-400 bg-amber-50")
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-slate-900">
              Ngày {formatDateKeyVN(date)} —{" "}
              {close?.status === "closed" ? (
                <span className="text-emerald-700">đã chốt ✓</span>
              ) : (
                <span className="text-amber-800">chưa chốt</span>
              )}
            </div>
            <div className="text-[11px] text-slate-600">
              {close?.status === "closed"
                ? `${close.closedBy || "Kế toán"} chốt lúc ${close.closedAt ? new Date(close.closedAt).toLocaleString("vi-VN") : "—"}`
                : issues.red > 0
                  ? `Còn ${issues.red} lỗi đỏ${issues.warn ? ` và ${issues.warn} cảnh báo` : ""} — mở Chốt ngày để xử`
                  : "Sạch lỗi đỏ — mở Chốt ngày để soát rồi khoá số"}
            </div>
          </div>
          <Link
            href="/baocao/chot-ngay"
            className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Mở bản số liệu Chốt ngày →
          </Link>
        </div>
      </div>

      {/* TIỀN HÔM NAY — ba con số đứng đầu, chi tiết ai giữ nằm ngay dưới */}
      <Card title={`Tiền ngày ${formatDateKeyVN(date)}`}>
        <div className="grid grid-cols-2 gap-2 @md:grid-cols-4">
          <Stat label="Khách chuyển vào TK công ty" value={board?.transfer.total ?? 0} tone="indigo" />
          <Stat label="Tiền mặt đã thu" value={board?.cashTotal ?? 0} tone="emerald" />
          <Stat label="Tổng thu" value={revenue} tone="sky" />
          <Stat label="Tổng chi" value={spend} tone="rose" />
        </div>

        {/* ĐẠI LÝ GIỮ TIỀN BAY — khuôn câu thống nhất với bảng của quầy/điều phối */}
        {(board?.agencyDebts ?? []).length > 0 && (
          <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50/60 p-2.5">
            <div className="text-xs font-bold text-orange-900">
              🤝 Đại lý giữ tiền bay — {formatVND((board?.agencyDebts ?? []).reduce((t, a) => t + a.amount, 0))} phải đòi về
            </div>
            <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
              {(board?.agencyDebts ?? []).map((a) => (
                <li key={a.name}>
                  <strong className="uppercase text-emerald-700">{a.name}</strong> giữ tiền bay của khách{" "}
                  {a.bookings.join(" · ")} ngày {formatDateKeyVN(date)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-3">
          <div className="text-xs font-bold text-slate-700">Ai đang giữ tiền mặt</div>
          {cashHeld.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">Chưa ai thu tiền mặt trong ngày.</p>
          ) : (
            <ul className="mt-1 divide-y divide-slate-100">
              {cashHeld.map((p) => (
                <li key={p.username} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate text-slate-700">
                    {p.name} <span className="text-xs text-slate-400">· {p.items.length} khoản</span>
                  </span>
                  <strong className="shrink-0 tabular-nums text-emerald-700">{formatVND(p.total)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>

        {(board?.spendByPerson ?? []).length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-bold text-slate-700">Ai đã chi trong ngày</div>
            <ul className="mt-1 divide-y divide-slate-100">
              {(board?.spendByPerson ?? []).map((p) => (
                <li key={p.username} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate text-slate-700">{p.name}</span>
                  <strong className="shrink-0 tabular-nums text-rose-700">{formatVND(p.total)}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* SOÁT CHUYỂN KHOẢN — dán sao kê / SMS banking, máy dò về đúng booking */}
      <BankCheckCard date={date} />

      {/* VIỆC CẦN LÀM — mỗi dòng bấm được, dẫn tới đúng chỗ xử lý */}
      <Card title="Việc cần làm">
        {todos.length === 0 ? (
          <p className="text-sm text-emerald-700">✓ Không còn việc nào chờ — tiền và số của ngày đã gọn.</p>
        ) : (
          <ul className="space-y-1.5">
            {todos.map((t) => (
              <li key={t.label}>
                <Link
                  href={t.href}
                  className={
                    "flex items-center justify-between gap-3 rounded-xl border-2 px-3 py-2 " +
                    (t.tone === "rose"
                      ? "border-rose-300 bg-rose-50 hover:bg-rose-100"
                      : t.tone === "amber"
                        ? "border-amber-300 bg-amber-50 hover:bg-amber-100"
                        : "border-sky-300 bg-sky-50 hover:bg-sky-100")
                  }
                >
                  <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">
                    {t.count} · {t.label}
                  </span>
                  {t.money > 0 && (
                    <strong className="shrink-0 tabular-nums text-slate-900">{formatVND(t.money)}</strong>
                  )}
                  <span aria-hidden className="shrink-0 text-slate-400">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* CÁC BẢN SỐ LIỆU — chốt ngày chỉ là một trong số đó */}
      <Card title="Bản số liệu & sổ sách">
        <div className="grid grid-cols-2 gap-2 @md:grid-cols-4">
          {[
            { href: "/baocao/chot-ngay", label: "Chốt ngày", hint: "soát số một ngày rồi khoá" },
            { href: "/baocao/homestay", label: "Homestay", hint: "lịch phòng & booking Agoda, web" },
            { href: "/baocao/tong-hop", label: "Tổng hợp", hint: "số theo chu kỳ, đẩy bảng tính" },
            { href: "/baocao/bao-cao-thang", label: "Báo cáo tháng", hint: "doanh thu & lương tháng" },
            { href: "/baocao/phat-nop-muon", label: "Phạt nộp muộn", hint: "phi công chốt trễ giờ" },
          ].map((x) => (
            <Link
              key={x.href}
              href={x.href}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 hover:bg-slate-50"
            >
              <div className="text-sm font-semibold text-slate-900">{x.label}</div>
              <div className="text-[11px] leading-tight text-slate-500">{x.hint}</div>
            </Link>
          ))}
        </div>
      </Card>
    </Shell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "indigo" | "emerald" | "sky" | "rose" }) {
  const box = {
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    sky: "border-sky-200 bg-sky-50 text-sky-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  }[tone];
  return (
    <div className={"rounded-xl border px-3 py-2 " + box}>
      <div className="text-[11px] font-medium leading-tight opacity-80">{label}</div>
      <div className="text-lg font-bold tabular-nums">{formatVND(value)}</div>
    </div>
  );
}
