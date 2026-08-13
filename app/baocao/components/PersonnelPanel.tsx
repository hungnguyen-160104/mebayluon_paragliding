// app/baocao/components/PersonnelPanel.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import api from "@/lib/api";
import { authHeader } from "@/lib/auth";
import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { BAOBAY_ROLES, ROLE_LABEL, type BaobayRole } from "@/lib/baobay/roles";

import { MoneyOrderCard } from "./MoneyOrderCard";
import { ShiftBoard } from "./ShiftBoard";
import { SPOTS, spotName, type SpotId } from "@/lib/baobay/spots";
import type { BaobayAccountDTO, BaobaySummaryDTO } from "@/lib/baobay/types";
import { formatVND } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Quản lý nhân sự báo bay: danh sách người đang làm việc, cấp/khoá/xoá tài
 * khoản, và tổng số liệu theo chu kỳ cho chủ điểm bay.
 *
 * Hai mức "cho nghỉ" khác nhau, cố ý tách làm hai nút:
 *  - KHOÁ (deactive): hết đăng nhập được nhưng số liệu cũ nguyên vẹn — dùng cho
 *    người thôi việc bình thường. Mở lại được.
 *  - XOÁ: xoá vĩnh viễn tài khoản KÈM toàn bộ báo cáo của người đó trong cơ sở
 *    dữ liệu (Google Sheets không bị đụng — xoá tay bên đó nếu cần). Phải gõ
 *    lại đúng tên đăng nhập mới xoá được, vì không có đường hoàn tác.
 *
 * Mật khẩu xem lại được ở cột "Mật khẩu" (kể cả sau khi nhân viên tự đổi) —
 * yêu cầu rõ của chủ hệ thống, xem chú thích rủi ro ở models/BaobayAccount.model.ts.
 */

type NewCredential = { username: string; displayName: string; password: string; role: BaobayRole };

type Filter = "active" | "inactive" | "all";

const selectClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-500";

/**
 * Toàn bộ giao diện quản lý nhân sự — dùng ở HAI nơi:
 *  - /baocao/admin   : tài khoản vai trò "Quản trị" đăng nhập cổng /baocao (cookie)
 *  - /admin/baocao   : chủ website vào bằng token quản trị (Bearer)
 * Cùng gọi một bộ API; authHeader() rỗng thì cookie báo bay tự đi kèm.
 */
export function PersonnelPanel() {
  const [accounts, setAccounts] = useState<BaobayAccountDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<NewCredential[]>([]);
  const [filter, setFilter] = useState<Filter>("active");
  /** Cấp của CHÍNH tài khoản đang xem: 2 = quản trị hạn chế. */
  const [myLevel, setMyLevel] = useState<1 | 2>(2);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ accounts: BaobayAccountDTO[]; adminLevel?: 1 | 2 }>(
        "/api/admin/baocao/accounts",
        { headers: authHeader() },
      );
      setAccounts(res.accounts);
      setMyLevel(res.adminLevel === 1 ? 1 : 2);
    } catch (err: any) {
      setError(err?.message || "Không tải được danh sách tài khoản");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addCredentials = (items: NewCredential[]) => {
    setCredentials((prev) => [...items, ...prev]);
    load();
  };

  const shown = accounts.filter((a) =>
    filter === "all" ? true : filter === "active" ? a.isActive : !a.isActive,
  );
  const activeCount = accounts.filter((a) => a.isActive).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Nhân sự báo bay</h1>
        <p className="mt-1 text-sm text-slate-600">
          {activeCount} người làm việc · cấp tài khoản cho phi công, điều phối bay, camera man và kế
          toán. Người được cấp đăng nhập tại{" "}
          <a href="/baocao" className="font-medium text-sky-700 underline" target="_blank" rel="noreferrer">
            mebayluon.com/baocao
          </a>
          .
        </p>
      </header>

      {credentials.length > 0 && <CredentialBox items={credentials} onClear={() => setCredentials([])} />}

      {/* Lệnh tiền nhân sự gửi lên để trên cùng — việc cần duyệt ngay mỗi khi mở trang */}
      <HandoverCard />

      <StatementCard accounts={accounts} />

      <ShiftBoard api={api} authHeader={authHeader} />

      <SpotSettingsCard />

      <AdminMoneyOrder />

      <PeriodTotalsCard />

      <div className="grid gap-4 lg:grid-cols-2">
        <SingleCreateCard onCreated={addCredentials} canCreateAdmin={myLevel === 1} />
        <BulkCreateCard onCreated={addCredentials} canCreateAdmin={myLevel === 1} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-900">Danh sách nhân sự ({shown.length})</h2>
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["active", `Làm việc (${activeCount})`],
                ["inactive", `Đã khoá (${accounts.length - activeCount})`],
                ["all", "Tất cả"],
              ] as Array<[Filter, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={
                  filter === key
                    ? "rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white"
                    : "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                }
              >
                {label}
              </button>
            ))}
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              {loading ? "Đang tải…" : "Tải lại"}
            </Button>
          </div>
        </div>

        {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

        {shown.length === 0 && !loading ? (
          <p className="text-sm text-slate-500">
            {filter === "active" ? "Chưa có ai đang làm việc — tạo tài khoản bằng khung phía trên." : "Trống."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-600">
                  <th className="whitespace-nowrap py-2 pr-3">Tên</th>
                  <th className="whitespace-nowrap py-2 pr-3">Tài khoản</th>
                  <th className="whitespace-nowrap py-2 pr-3">Chức danh</th>
                  <th className="whitespace-nowrap py-2 pr-3">Điểm bay</th>
                  <th className="whitespace-nowrap py-2 pr-3">Email / SĐT</th>
                  <th className="whitespace-nowrap py-2 pr-3">Mật khẩu</th>
                  <th className="whitespace-nowrap py-2 pr-3">Trạng thái</th>
                  <th className="whitespace-nowrap py-2 pr-3">Đăng nhập lần cuối</th>
                  <th className="py-2">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((acc) => (
                  <AccountRow
                    key={acc.id}
                    account={acc}
                    onChanged={load}
                    onPassword={(password) =>
                      addCredentials([
                        { username: acc.username, displayName: acc.displayName, password, role: acc.role },
                      ])
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

type SpotSettingDTO = {
  spot: SpotId;
  submitDeadline: string;
  sheetWebhookUrl: string;
  hasSheetSecret: boolean;
};

/**
 * Cấu hình RIÊNG từng điểm bay: giờ chốt báo cáo + bảng Google Sheets của điểm.
 *
 * Mỗi điểm là một hệ thống riêng nên mỗi điểm một bảng tính riêng — dán đường
 * dẫn webhook Apps Script của bảng đó vào đây. Đổi giờ chốt có hiệu lực ngay.
 */
function SpotSettingsCard() {
  /** Thu gọn mặc định — tránh vô tình chạm vào ô webhook/giờ chốt. */
  const [open, setOpen] = useState(false);
  /** Quản trị cấp 2 chỉ được xem. */
  const [canEdit, setCanEdit] = useState(true);
  const [rows, setRows] = useState<SpotSettingDTO[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, { submitDeadline: string; sheetWebhookUrl: string; sheetSecret: string }>>({});

  const load = useCallback(async () => {
    try {
      const r = await api<{ settings: SpotSettingDTO[]; canEdit: boolean }>("/api/admin/baocao/settings", {
        headers: authHeader(),
      });
      setRows(r.settings);
      setCanEdit(r.canEdit !== false);
      setDraft(
        Object.fromEntries(
          r.settings.map((x) => [x.spot, { submitDeadline: x.submitDeadline, sheetWebhookUrl: x.sheetWebhookUrl, sheetSecret: "" }]),
        ),
      );
    } catch (e: any) {
      setError(e?.message || "Không tải được cấu hình điểm bay");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(spot: SpotId) {
    const d = draft[spot];
    if (!d) return;
    setBusy(spot);
    setError(null);
    setMessage(null);
    try {
      await api("/api/admin/baocao/settings?spot=" + spot, {
        method: "PUT",
        headers: authHeader(),
        body: JSON.stringify({
          submitDeadline: d.submitDeadline,
          sheetWebhookUrl: d.sheetWebhookUrl,
          // Ô mã bảo vệ để trống = giữ nguyên mã cũ, không ghi đè bằng chuỗi rỗng
          ...(d.sheetSecret ? { sheetSecret: d.sheetSecret } : {}),
        }),
      });
      setMessage(`Đã lưu cấu hình ${spotName(spot)}.`);
      load();
    } catch (e: any) {
      setError(e?.message || "Không lưu được");
    } finally {
      setBusy(null);
    }
  }

  /**
   * Thu gọn mặc định. Đây là chỗ nguy hiểm nhất trang: gõ nhầm một ký tự trong
   * webhook là dữ liệu ngừng chảy sang bảng tính, đổi giờ chốt là ảnh hưởng
   * tiền phạt cả đội. Phải chủ động bấm mở mới thấy ô nhập.
   */
  if (!open) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <span>
            <span className="font-semibold text-slate-900">Cấu hình từng điểm bay</span>
            <span className="ml-2 text-sm text-slate-500">
              giờ chốt báo cáo · bảng Google Sheets của từng điểm
            </span>
          </span>
          <span className="ml-3 shrink-0 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600">
            Mở ▾
          </span>
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold text-slate-900">Cấu hình từng điểm bay</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600"
        >
          Thu gọn ▴
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Mỗi điểm bay là một hệ thống riêng: số liệu riêng, và <strong>một bảng Google Sheets riêng</strong>.
        Chốt báo cáo sau giờ quy định thì phi công bị phạt 200.000đ/lần (chỉ tính lần chốt đầu).
      </p>

      {!canEdit && (
        <p className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          Tài khoản quản trị cấp 2 chỉ xem được phần này — đổi cấu hình điểm bay là việc của quản trị cấp 1.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {rows.map((row) => (
          <div key={row.spot} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-3 font-semibold text-slate-900">{spotName(row.spot)}</div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Giờ chốt báo cáo</span>
              <Input
                type="time"
                disabled={!canEdit}
                value={draft[row.spot]?.submitDeadline ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, [row.spot]: { ...p[row.spot], submitDeadline: e.target.value } }))
                }
                className="h-9"
              />
            </label>

            <label className="mt-2 block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Webhook Google Sheets</span>
              <Input
                disabled={!canEdit}
                value={draft[row.spot]?.sheetWebhookUrl ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, [row.spot]: { ...p[row.spot], sheetWebhookUrl: e.target.value } }))
                }
                placeholder="https://script.google.com/macros/s/…/exec"
                className="h-9"
              />
            </label>

            <label className="mt-2 block">
              <span className="mb-1 block text-xs font-medium text-slate-700">
                Mã bảo vệ {row.hasSheetSecret ? "(đã đặt — để trống nếu giữ nguyên)" : ""}
              </span>
              <Input
                disabled={!canEdit}
                value={draft[row.spot]?.sheetSecret ?? ""}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, [row.spot]: { ...p[row.spot], sheetSecret: e.target.value } }))
                }
                placeholder={row.hasSheetSecret ? "••••••" : "chuỗi trong SECRET của Apps Script"}
                className="h-9"
              />
            </label>

            <Button
              size="sm"
              className="mt-3"
              disabled={!canEdit || busy === row.spot}
              onClick={() => save(row.spot)}
            >
              {busy === row.spot ? "Đang lưu…" : "Lưu"}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

type HandoverRowDTO = {
  id: string;
  kind: "handover" | "advance";
  createdBy?: string;
  date: string;
  staffName: string;
  username: string;
  role: string;
  recipientName: string;
  recipientRole: string;
  amount: number;
  method: "cash" | "transfer";
  content: string;
  confirmed: boolean;
  confirmedAt?: string;
  confirmedBy?: string;
  rejected: boolean;
  rejectedReason?: string;
};

const ROLE_TEXT: Record<string, string> = {
  pilot: "phi công",
  dispatcher: "điều phối",
  cameraman: "camera man",
  accountant: "kế toán",
  admin: "quản trị",
};

/**
 * Tiền nhân sự khai ĐÃ ĐƯA cho quản lý/giám đốc — giám đốc bấm "Xác nhận" khi
 * đã cầm tiền, dòng đó chuyển xanh và ghi ai xác nhận lúc nào; bấm "Từ chối"
 * kèm lý do thì tiền được cộng trả lại vào số nhân sự đang giữ.
 *
 * Tự tải lại mỗi 20 giây để khoản mới hiện gần như tức thì mà không phải F5 —
 * người đưa tiền đang đứng đợi giám đốc bấm xác nhận.
 */
function HandoverCard() {
  const [spot, setSpot] = useState<SpotId>("khau-pha");
  const [rows, setRows] = useState<HandoverRowDTO[]>([]);
  /** Số khoản chờ xác nhận của TỪNG điểm bay — chấm số đỏ lên nút. */
  const [pendingBySpot, setPendingBySpot] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ handovers: HandoverRowDTO[]; pendingBySpot: Record<string, number> }>(
        `/api/admin/baocao/handovers?spot=${spot}`,
        { headers: authHeader() },
      );
      setRows(r.handovers);
      setPendingBySpot(r.pendingBySpot ?? {});
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Không tải được danh sách giao tiền");
    }
  }, [spot]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 20_000);
    return () => clearInterval(timer);
  }, [load]);

  async function act(row: HandoverRowDTO, reject?: string) {
    if (
      !reject &&
      !window.confirm(
        `Xác nhận ĐÃ NHẬN ${row.amount.toLocaleString("vi-VN")}đ (${row.method === "cash" ? "tiền mặt" : "CK"}) từ ${row.staffName} — ngày ${formatDateKeyVN(row.date)}?`,
      )
    ) {
      return;
    }
    setBusy(row.id);
    setError(null);
    try {
      await api(`/api/admin/baocao/handovers?spot=${spot}`, {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ id: row.id, reject }),
      });
      load();
    } catch (e: any) {
      setError(e?.message || "Không xử lý được");
    } finally {
      setBusy(null);
    }
  }

  function reject(row: HandoverRowDTO) {
    const reason = window.prompt(`Từ chối khoản ${row.amount.toLocaleString("vi-VN")}đ của ${row.staffName} — lý do?`);
    if (reason && reason.trim()) act(row, reason.trim());
  }

  const pending = rows.filter((r) => !r.confirmed && !r.rejected);
  const done = rows.filter((r) => r.confirmed || r.rejected);
  // Tổng chờ xác nhận của MỌI điểm, không chỉ điểm đang xem
  const totalPending = Object.values(pendingBySpot).reduce((a, b) => a + b, 0);
  const pendingAmount = pending.reduce((sum, r) => sum + r.amount, 0);

  return (
    <section className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-5">
      <h2 className="font-semibold text-slate-900">
        💰 Lệnh tiền của nhân sự
        {totalPending > 0 && (
          <span className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">
            {totalPending} khoản chưa xác nhận
          </span>
        )}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Giao tiền và ứng tiền của mọi điểm bay. Người nhận tự xác nhận ở trang của họ; quản trị xác
        nhận thay khi cần. Tự làm mới mỗi 20 giây.
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {SPOTS.map((sp) => {
          const count = pendingBySpot[sp.id] ?? 0;
          return (
            <button
              key={sp.id}
              type="button"
              onClick={() => setSpot(sp.id)}
              className={
                "relative rounded-lg px-3 py-1 text-xs font-medium " +
                (sp.id === spot
                  ? "bg-sky-600 font-semibold text-white"
                  : "border border-slate-300 bg-white text-slate-700")
              }
              title={count ? `${count} khoản chưa xác nhận ở ${sp.name}` : `${sp.name}: đã xác nhận hết`}
            >
              {sp.name}
              {/* Số đỏ: điểm nào còn tiền chưa nhận thì thấy ngay, khỏi bấm qua từng điểm */}
              {count > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-bold text-white">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}

      {pending.length === 0 && done.length === 0 && (
        <p className="mt-3 text-sm text-slate-500">30 ngày gần đây chưa có khoản giao nào.</p>
      )}

      {pending.length > 0 && (
        <>
          <p className="mt-3 text-sm font-medium text-amber-800">
            Chờ xác nhận: {pending.length} khoản · {formatVND(pendingAmount)}
          </p>
          <ul className="mt-1 divide-y divide-amber-100 rounded-lg border border-amber-200">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 bg-amber-50/50 px-3 py-2 text-sm">
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                    (r.kind === "advance" ? "bg-violet-100 text-violet-800" : "bg-sky-100 text-sky-800")
                  }
                >
                  {r.kind === "advance"
                    ? r.createdBy
                      ? "lệnh ứng (QL lập)"
                      : "xin ứng"
                    : r.createdBy
                      ? "lệnh chuyển (QL lập)"
                      : "giao tiền"}
                </span>
                <span className="text-slate-500">{formatDateKeyVN(r.date)}</span>
                <span className="font-medium text-slate-900">{r.staffName}</span>
                <span className="text-xs text-slate-500">({ROLE_TEXT[r.role] ?? r.role})</span>
                <span className="text-xs text-slate-500">
                  {r.kind === "advance" ? "duyệt bởi" : "→"} {r.recipientName}
                </span>
                <span className="flex-1 truncate text-xs text-slate-600">{r.content}</span>
                <span className="text-xs text-slate-500">{r.method === "cash" ? "tiền mặt" : "chuyển khoản"}</span>
                <span className="font-semibold tabular-nums text-slate-900">{formatVND(r.amount)}</span>
                <Button size="sm" disabled={busy === r.id} onClick={() => act(r)}>
                  {busy === r.id ? "Đang xác nhận…" : "Xác nhận"}
                </Button>
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => reject(r)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:text-rose-700"
                >
                  Từ chối
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {done.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {done.slice(0, 8).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <span className="text-slate-500">{formatDateKeyVN(r.date)}</span>
              <span className="text-slate-700">{r.staffName}</span>
              <span className="flex-1 truncate text-xs text-slate-500">{r.content}</span>
              <span className="text-xs text-slate-500">{r.method === "cash" ? "tiền mặt" : "CK"}</span>
              <span className="font-semibold tabular-nums text-slate-700">{formatVND(r.amount)}</span>
              {r.rejected ? (
                <span
                  className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800"
                  title={r.rejectedReason}
                >
                  đã từ chối
                </span>
              ) : (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                  đã nhận{r.confirmedAt ? ` ${new Date(r.confirmedAt).toLocaleDateString("vi-VN")}` : ""}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Giờ chốt báo cáo của phi công. Đổi là CÓ HIỆU LỰC NGAY: máy chủ đọc giá trị
 * mới nhất mỗi lần phi công bấm chốt. Chốt lần đầu sau giờ này (và có chuyến)
 * bị ghi phạt 200.000đ/lần; sửa báo cáo không tính lại.
 */
function PeriodTotalsCard() {
  const today = todayInVN();
  const [spot, setSpot] = useState<SpotId>("khau-pha");
  const [from, setFrom] = useState(shiftDateKey(today, -29));
  const [to, setTo] = useState(today);
  const [data, setData] = useState<BaobaySummaryDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: string, t: string) => {
    setBusy(true);
    setError(null);
    try {
      setData(
        await api<BaobaySummaryDTO>(`/api/baocao/summary?from=${f}&to=${t}&spot=${spot}`, {
          headers: authHeader(),
        }),
      );
    } catch (err: any) {
      setError(err?.message || "Không tải được số tổng");
    } finally {
      setBusy(false);
    }
  }, [spot]);

  useEffect(() => {
    load(from, to);
  }, [from, to, load]);

  const preset = (days: number) => {
    setFrom(shiftDateKey(today, -(days - 1)));
    setTo(today);
  };

  const t = data?.totals;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Tổng theo chu kỳ (chỉ ngày đã chốt)</h2>
          <div className="mt-2 flex flex-wrap gap-1">
            {SPOTS.map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => setSpot(sp.id)}
                className={
                  sp.id === spot
                    ? "rounded-lg bg-sky-600 px-3 py-1 text-xs font-semibold text-white"
                    : "rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700"
                }
              >
                {sp.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="h-9 w-auto" />
          <span className="text-xs text-slate-400">→</span>
          <Input type="date" value={to} min={from} max={today} onChange={(e) => e.target.value && setTo(e.target.value)} className="h-9 w-auto" />
          <Button variant="outline" size="sm" onClick={() => preset(7)}>7 ngày</Button>
          <Button variant="outline" size="sm" onClick={() => { setFrom(`${today.slice(0, 7)}-01`); setTo(today); }}>Tháng này</Button>
          <Button variant="outline" size="sm" onClick={() => preset(30)}>30 ngày</Button>
        </div>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {busy && <p className="text-sm text-slate-500">Đang cộng…</p>}

      {!busy && t && (
        <>
          <div className="grid grid-cols-2 gap-3 @md:grid-cols-4 lg:grid-cols-6">
            <Tile label="Khách bay" value={String(t.guestCount)} />
            <Tile label="Vé xuất ra" value={String(t.ticketsIssued)} />
            <Tile label="Vé thu hồi" value={String(t.ticketsReturned)} />
            <Tile label="Chuyến bay" value={String(t.pilotFlights)} />
            <Tile label="Flycam" value={String(t.flycam)} />
            <Tile label="Camera 360" value={String(t.video360)} />
            <Tile label="Bay kéo cờ/bánh" value={String(t.flagFlight)} />
            <Tile label="Khách ngoại giao" value={String(t.diplomaticGuests)} />
            <Tile label="Tiền mặt" value={formatVND(t.cashTotal)} />
            <Tile label="Chuyển khoản" value={formatVND(t.transferTotal)} />
            <Tile label="Tổng thu" value={formatVND(t.revenueTotal)} strong />
            <Tile label="Chi nhân viên" value={formatVND(t.expenseTotal)} />
          </div>
          {data && data.pendingDays.length > 0 && (
            <p className="mt-3 text-xs text-amber-700">
              {data.pendingDays.length} ngày chưa chốt, không nằm trong tổng:{" "}
              {data.pendingDays.slice(0, 8).map(formatDateKeyVN).join(", ")}
              {data.pendingDays.length > 8 ? "…" : ""}
            </p>
          )}
        </>
      )}
    </section>
  );
}

function Tile({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={strong ? "text-sm font-bold tabular-nums text-emerald-700" : "text-sm font-semibold tabular-nums text-slate-900"}>
        {value}
      </div>
    </div>
  );
}

/** Khung hiện mật khẩu vừa cấp — mất khi tải lại trang, nên phải chép ngay. */
function CredentialBox({ items, onClear }: { items: NewCredential[]; onClear: () => void }) {
  const text = items
    .map((c) => `${c.displayName} (${ROLE_LABEL[c.role]}) — tài khoản: ${c.username} — mật khẩu: ${c.password}`)
    .join("\n");

  return (
    <section className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-amber-900">
          Mật khẩu vừa cấp ({items.length}) — chép ngay, tải lại trang là mất
        </h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(text)}>
            Chép tất cả
          </Button>
          <Button size="sm" variant="ghost" onClick={onClear}>
            Ẩn
          </Button>
        </div>
      </div>

      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs leading-relaxed text-slate-800">
        {text}
      </pre>

      <p className="mt-2 text-xs text-amber-800">
        Mật khẩu cũng xem lại được ở cột “Mật khẩu” trong danh sách bên dưới (kể cả sau khi người dùng tự đổi).
      </p>
    </section>
  );
}

/** "+ Thêm nhân sự": tên — tên đăng nhập — email — sđt — mật khẩu — chức danh. */
function SingleCreateCard({
  onCreated,
  canCreateAdmin,
}: {
  onCreated: (items: NewCredential[]) => void;
  /** Chỉ quản trị cấp 1 mới được lập tài khoản quản trị khác. */
  canCreateAdmin: boolean;
}) {
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    role: "pilot" as BaobayRole,
    email: "",
    phone: "",
    password: "",
  });
  const [spots, setSpots] = useState<SpotId[]>(["khau-pha"]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) => setForm((p) => ({ ...p, [key]: value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await api<{ account: BaobayAccountDTO; password: string }>("/api/admin/baocao/accounts", {
        method: "POST",
        headers: authHeader(),
        body: JSON.stringify({ ...form, spots }),
      });
      onCreated([
        {
          username: res.account.username,
          displayName: res.account.displayName,
          password: res.password,
          role: res.account.role,
        },
      ]);
      setMessage(`Đã tạo tài khoản ${res.account.username}.`);
      setForm({ displayName: "", username: "", role: form.role, email: "", phone: "", password: "" });
    } catch (err: any) {
      setMessage(err?.message || "Không tạo được tài khoản");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 font-semibold text-slate-900">+ Thêm nhân sự</h2>
      <p className="mb-3 text-sm text-slate-600">Để trống mật khẩu thì hệ thống tự sinh mật khẩu ngẫu nhiên.</p>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Họ tên</span>
            <Input value={form.displayName} onChange={(e) => set("displayName", e.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Chức danh</span>
            <select value={form.role} onChange={(e) => set("role", e.target.value as BaobayRole)} className={selectClass}>
              {BAOBAY_ROLES.filter((r) => canCreateAdmin || r !== "admin").map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Tên đăng nhập</span>
          <Input
            value={form.username}
            onChange={(e) => set("username", e.target.value)}
            placeholder="chỉ chữ không dấu, số và . _ -"
            autoCapitalize="none"
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="không bắt buộc" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Số điện thoại</span>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="không bắt buộc" />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Mật khẩu</span>
          <Input value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="để trống = tự sinh" />
        </label>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Điểm bay được chỉ định</span>
          <div className="flex flex-wrap gap-2">
            {SPOTS.map((sp) => {
              const on = spots.includes(sp.id);
              return (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => setSpots((p) => (on ? p.filter((x) => x !== sp.id) : [...p, sp.id]))}
                  className={
                    on
                      ? "rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white"
                      : "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  }
                >
                  {sp.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {message && <p className="mt-2 text-sm text-slate-700">{message}</p>}

      <Button type="submit" className="mt-3" disabled={busy}>
        {busy ? "Đang tạo…" : "Tạo tài khoản"}
      </Button>
    </form>
  );
}

function BulkCreateCard({
  onCreated,
  canCreateAdmin,
}: {
  onCreated: (items: NewCredential[]) => void;
  canCreateAdmin: boolean;
}) {
  const [names, setNames] = useState("");
  const [role, setRole] = useState<BaobayRole>("pilot");
  const [spots, setSpots] = useState<SpotId[]>(["khau-pha"]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState<Array<{ name: string; error: string }>>([]);

  const count = names.split(/[\n\r]+/).filter((s) => s.trim()).length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setFailed([]);
    try {
      const res = await api<{ created: NewCredential[]; failed: Array<{ name: string; error: string }> }>(
        "/api/admin/baocao/accounts",
        {
          method: "POST",
          headers: authHeader(),
          body: JSON.stringify({ mode: "bulk", role, names, spots }),
        },
      );
      onCreated(res.created);
      setFailed(res.failed || []);
      setMessage(`Đã tạo ${res.created.length} tài khoản.`);
      setNames("");
    } catch (err: any) {
      setMessage(err?.message || "Không tạo được tài khoản");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 font-semibold text-slate-900">Tạo cả loạt theo danh sách tên</h2>
      <p className="mb-3 text-sm text-slate-600">
        Mỗi dòng một người. Tên đăng nhập tự sinh từ tên (Nguyễn Văn A → nguyenvana), mật khẩu ngẫu nhiên.
        Email/SĐT bổ sung sau bằng nút Sửa.
      </p>

      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Chức danh</span>
        <select value={role} onChange={(e) => setRole(e.target.value as BaobayRole)} className={selectClass}>
          {BAOBAY_ROLES.filter((r) => canCreateAdmin || r !== "admin").map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </label>

      <div className="mb-3">
        <span className="mb-1 block text-sm font-medium text-slate-700">Điểm bay được chỉ định</span>
        <div className="flex flex-wrap gap-2">
          {SPOTS.map((sp) => {
            const on = spots.includes(sp.id);
            return (
              <button
                key={sp.id}
                type="button"
                onClick={() => setSpots((p) => (on ? p.filter((x) => x !== sp.id) : [...p, sp.id]))}
                className={
                  on
                    ? "rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white"
                    : "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                }
              >
                {sp.name}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Danh sách tên ({count} dòng)</span>
        <textarea
          value={names}
          onChange={(e) => setNames(e.target.value)}
          rows={7}
          placeholder={"Nguyễn Văn A\nTrần Thị B\nLê Văn C"}
          className="w-full rounded-md border border-slate-300 p-3 text-sm outline-none focus:border-sky-500"
        />
      </label>

      {message && <p className="mt-2 text-sm text-slate-700">{message}</p>}

      {failed.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-xs text-rose-600">
          {failed.map((f) => (
            <li key={f.name}>
              {f.name}: {f.error}
            </li>
          ))}
        </ul>
      )}

      <Button type="submit" className="mt-3" disabled={busy || count === 0}>
        {busy ? "Đang tạo…" : `Tạo ${count || ""} tài khoản ${ROLE_LABEL[role].toLowerCase()}`}
      </Button>
    </form>
  );
}

function AccountRow({
  account,
  onChanged,
  onPassword,
}: {
  account: BaobayAccountDTO;
  onChanged: () => void;
  onPassword: (password: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [draft, setDraft] = useState({ displayName: account.displayName, email: account.email, phone: account.phone });

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await api<{ account: BaobayAccountDTO; password?: string }>(
        `/api/admin/baocao/accounts/${account.id}`,
        { method: "PATCH", headers: authHeader(), body: JSON.stringify(body) },
      );
      if (res.password) onPassword(res.password);
      onChanged();
    } catch (err: any) {
      alert(err?.message || "Không cập nhật được");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Xoá vĩnh viễn: bắt gõ lại đúng tên đăng nhập. Máy chủ so tên TRƯỚC khi xoá
   * nên gõ sai không mất gì.
   */
  async function remove() {
    const typed = window.prompt(
      `XOÁ VĨNH VIỄN ${account.displayName} kèm TOÀN BỘ báo cáo của người này trong cơ sở dữ liệu ` +
        `(kể cả ngày đã chốt — tổng các kỳ cũ sẽ hụt phần của họ; Google Sheets không bị đụng).\n\n` +
        `Không hoàn tác được. Gõ lại tên đăng nhập "${account.username}" để xác nhận:`,
    );
    if (typed === null) return;

    setBusy(true);
    try {
      const res = await api<{ ok: boolean; deleted: { pilot: number; dispatcher: number; cameraman: number } }>(
        `/api/admin/baocao/accounts/${account.id}`,
        { method: "DELETE", headers: authHeader(), body: JSON.stringify({ confirm: typed }) },
      );
      alert(
        `Đã xoá ${account.username} cùng ${res.deleted.pilot + res.deleted.dispatcher + res.deleted.cameraman} báo cáo.`,
      );
      onChanged();
    } catch (err: any) {
      alert(err?.message || "Không xoá được");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    await patch({ displayName: draft.displayName, email: draft.email, phone: draft.phone });
    setEditing(false);
  }

  return (
    <tr className={account.isActive ? "border-b border-slate-100" : "border-b border-slate-100 bg-slate-50 opacity-70"}>
      <td className="py-2 pr-3 font-medium text-slate-900">
        {editing ? (
          <Input value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} className="h-8" />
        ) : (
          account.displayName
        )}
      </td>
      <td className="py-2 pr-3 font-mono text-xs text-slate-600">{account.username}</td>
      <td className="py-2 pr-3">
        <select
          value={account.role}
          disabled={busy}
          onChange={(e) => patch({ role: e.target.value })}
          className="h-8 rounded border border-slate-300 bg-white px-2 text-xs"
        >
          {BAOBAY_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        {/* Phi công chia PG / PPG / cả hai — trang phi công chỉ hiện khối PPG cho người có PPG */}
        {account.role === "pilot" && (
          <select
            value={account.pilotKind}
            disabled={busy}
            onChange={(e) => patch({ pilotKind: e.target.value })}
            className="mt-1 block h-8 rounded border border-violet-300 bg-violet-50 px-2 text-xs text-violet-900"
          >
            <option value="pg">PG</option>
            <option value="ppg">PPG</option>
            <option value="both">PG & PPG</option>
          </select>
        )}
      </td>
      <td className="py-2 pr-3">
        {/* Điểm bay do admin chỉ định — tick nhiều điểm nếu người này làm nhiều nơi */}
        <div className="flex flex-wrap gap-1">
          {SPOTS.map((sp) => {
            const on = account.spots.includes(sp.id);
            return (
              <button
                key={sp.id}
                type="button"
                disabled={busy}
                onClick={() => {
                  const next = on ? account.spots.filter((x) => x !== sp.id) : [...account.spots, sp.id];
                  if (!next.length) {
                    alert("Phải giữ ít nhất một điểm bay");
                    return;
                  }
                  patch({ spots: next });
                }}
                className={
                  on
                    ? "rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white"
                    : "rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-500"
                }
              >
                {sp.name}
              </button>
            );
          })}
        </div>
      </td>
      <td className="py-2 pr-3 text-xs text-slate-600">
        {editing ? (
          <div className="space-y-1">
            <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="email" className="h-8" />
            <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="sđt" className="h-8" />
          </div>
        ) : (
          <>
            <div>{account.email || "—"}</div>
            <div>{account.phone || "—"}</div>
          </>
        )}
      </td>
      <td className="py-2 pr-3">
        {/* Mật khẩu đọc được — yêu cầu rõ của chủ hệ thống; mặc định che, bấm mới hiện */}
        {account.password ? (
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="font-mono text-xs text-slate-600 hover:text-slate-900"
            title={showPw ? "Bấm để che" : "Bấm để hiện"}
          >
            {showPw ? account.password : "••••••••"}
          </button>
        ) : (
          <span className="text-xs text-slate-400" title="Tài khoản tạo trước bản cập nhật này — đặt lại mật khẩu là có">
            —
          </span>
        )}
      </td>
      <td className="py-2 pr-3">
        {account.isActive ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            làm việc
          </span>
        ) : (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">đã khoá</span>
        )}
        {account.mustChangePassword && account.isActive && (
          <div className="mt-0.5 text-xs text-amber-700">chưa đổi mật khẩu</div>
        )}
      </td>
      <td className="py-2 pr-3 text-xs text-slate-500">
        {account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString("vi-VN") : "chưa đăng nhập"}
      </td>
      <td className="py-2">
        <div className="flex flex-wrap gap-1.5">
          {editing ? (
            <>
              <Button size="sm" disabled={busy} onClick={saveEdit}>
                Lưu
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Huỷ
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(true)}>
                Sửa
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  if (confirm(`Đặt lại mật khẩu cho ${account.displayName}?`)) patch({ resetPassword: true });
                }}
              >
                Đặt lại MK
              </Button>
              <Button
                size="sm"
                variant={account.isActive ? "secondary" : "outline"}
                disabled={busy}
                onClick={() => patch({ isActive: !account.isActive })}
                title={account.isActive ? "Khoá: hết đăng nhập được, số liệu giữ nguyên" : "Mở lại tài khoản"}
              >
                {account.isActive ? "Khoá" : "Mở lại"}
              </Button>
              <Button size="sm" variant="destructive" disabled={busy} onClick={remove} title="Xoá vĩnh viễn kèm dữ liệu">
                Xoá
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}


/**
 * Quản trị tải bảng kê Excel của MỘT nhân sự theo chu kỳ tuỳ ý — tuần, tháng
 * hay từ ngày X đến ngày Y. Bộ cột theo vai trò người được chọn; kèm sheet ứng
 * tiền & giao tiền. Kế toán có bản tương tự ở trang Tổng hợp.
 */
function StatementCard({ accounts }: { accounts: BaobayAccountDTO[] }) {
  const today = todayInVN();
  const [spot, setSpot] = useState<SpotId>("khau-pha");
  const [from, setFrom] = useState(shiftDateKey(today, -29));
  const [to, setTo] = useState(today);
  const [who, setWho] = useState("");

  const staff = accounts
    .filter((a) => a.isActive && ["pilot", "dispatcher", "cameraman"].includes(a.role))
    .filter((a) => a.spots.includes(spot))
    .sort((a, b) => a.role.localeCompare(b.role) || a.displayName.localeCompare(b.displayName, "vi"));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-slate-900">⬇ Bảng kê nhân sự theo chu kỳ</h2>
      <p className="mt-1 text-sm text-slate-600">
        Excel của một người trong khoảng ngày tuỳ ý — tuần, tháng, hay từ ngày X đến ngày Y. Bộ cột theo
        vai trò, kèm sheet ứng tiền &amp; giao tiền.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="flex flex-wrap gap-1">
          {SPOTS.map((sp) => (
            <button
              key={sp.id}
              type="button"
              onClick={() => { setSpot(sp.id); setWho(""); }}
              className={
                "rounded-lg px-3 py-1.5 text-xs font-medium " +
                (sp.id === spot ? "bg-sky-600 font-semibold text-white" : "border border-slate-300 bg-white text-slate-700")
              }
            >
              {sp.name}
            </button>
          ))}
        </div>

        <select value={who} onChange={(e) => setWho(e.target.value)} className="h-10 min-w-52 rounded-lg border border-slate-300 bg-white px-2 text-sm">
          <option value="">— chọn nhân sự —</option>
          {staff.map((a) => (
            <option key={a.username} value={a.username}>
              {a.displayName} — {ROLE_LABEL[a.role]}
            </option>
          ))}
        </select>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Từ ngày</span>
          <Input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="h-10" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Đến ngày</span>
          <Input type="date" value={to} min={from} max={today} onChange={(e) => e.target.value && setTo(e.target.value)} className="h-10" />
        </label>

        <a
          href={who ? `/api/baocao/statement?from=${from}&to=${to}&spot=${spot}&username=${who}` : undefined}
          aria-disabled={!who}
          className={
            "inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold " +
            (who ? "bg-emerald-600 text-white hover:bg-emerald-700" : "pointer-events-none bg-slate-200 text-slate-400")
          }
          download
        >
          Tải bảng kê
        </a>
      </div>
    </section>
  );
}


/** Lệnh chuyển tiền phía quản trị — thêm nút chọn điểm bay rồi dùng chung thẻ với kế toán. */
function AdminMoneyOrder() {
  const [spot, setSpot] = useState<SpotId>("khau-pha");
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {SPOTS.map((sp) => (
          <button
            key={sp.id}
            type="button"
            onClick={() => setSpot(sp.id)}
            className={
              "rounded-lg px-3 py-1.5 text-xs font-medium " +
              (sp.id === spot ? "bg-cyan-600 font-semibold text-white" : "border border-slate-300 bg-white text-slate-700")
            }
          >
            {sp.name}
          </button>
        ))}
      </div>
      <MoneyOrderCard spot={spot} />
    </div>
  );
}
