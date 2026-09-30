"use client";

/**
 * /admin/baobay — quản lý BÁO BAY của phi công bay đơn và danh sách hội viên HNAA.
 *
 * Chỉ tài khoản CHỦ dùng được (máy chủ chặn ở lib/bao-bay-admin-auth). Trang
 * chỉ tiếng Việt, cùng nền sáng với các trang /admin khác.
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { authHeader, clearToken } from "@/lib/auth";
import {
  BAO_BAY_SPOTS,
  BAO_BAY_SPOT_CONFIG,
  FEE_MODE_LABEL,
  parseMemberPaste,
  vnParts,
  type FeeMode,
  type MemberField,
} from "@/lib/bao-bay";
import { formatVnDate, formatVnd, wingClassLabel, type WingClass } from "@/lib/pilot-event";

type Notice = {
  _id: string;
  noticeCode: string;
  spot: keyof typeof BAO_BAY_SPOT_CONFIG;
  dates: string[];
  fullName: string;
  idNumber: string;
  phone: string;
  emergencyPhone: string;
  memberCode?: string;
  feeMode: FeeMode;
  amount: number;
  passFrom?: string;
  passValidUntil?: string;
  coveredByNotice?: string;
  wingClass?: string;
  licence?: string;
  note?: string;
  transferNote?: string;
  submittedAt: string;
  paid: boolean;
  paidAt?: string;
};

type Totals = {
  count: number;
  amount: number;
  paidAmount: number;
  unpaidAmount: number;
  byMode: Record<string, number>;
};

type Member = {
  _id: string;
  code: string;
  fullName: string;
  idNumber?: string;
  phone?: string;
  emergencyPhone?: string;
  extra?: Record<string, string>;
  active: boolean;
};

const FIELD_LABEL: Record<MemberField, string> = {
  code: "Mã hội viên",
  fullName: "Họ tên",
  idNumber: "CCCD/Hộ chiếu",
  phone: "SĐT",
  emergencyPhone: "SĐT khẩn cấp",
};

const MODE_STYLE: Record<FeeMode, string> = {
  hnaa_free: "bg-emerald-100 text-emerald-800",
  pass: "bg-sky-100 text-sky-800",
  day: "bg-slate-100 text-slate-800",
  month: "bg-amber-100 text-amber-800",
  year: "bg-violet-100 text-violet-800",
};

function vnTime(iso?: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Gọi API admin kèm token; 401 thì đá về trang đăng nhập. */
function useAdminFetch() {
  const router = useRouter();
  return useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<T> => {
      const res = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json", ...authHeader(), ...(init?.headers || {}) },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearToken();
        router.replace("/admin/login");
        throw new Error("Phiên đăng nhập đã hết hạn");
      }
      if (!res.ok) throw new Error(data?.message || `Lỗi ${res.status}`);
      return data as T;
    },
    [router],
  );
}

export default function AdminBaoBayPage() {
  const [tab, setTab] = useState<"notices" | "members">("notices");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Báo bay</h1>
          <p className="mt-1 text-sm text-slate-500">
            Phi công bay đơn báo bay tại{" "}
            <a href="/baobay" target="_blank" rel="noreferrer" className="text-emerald-700 underline">
              /baobay
            </a>{" "}
            — Viên Nam, Khau Phạ, Quản Bạ.
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          {(
            [
              ["notices", "Báo bay"],
              ["members", "Hội viên HNAA"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                tab === k ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "notices" ? <NoticesTab /> : <MembersTab />}
    </div>
  );
}

/* ================================================================== *
 * Thẻ BÁO BAY
 * ================================================================== */

function NoticesTab() {
  const call = useAdminFetch();
  const today = useMemo(() => vnParts(new Date()).date, []);

  const [date, setDate] = useState(today);
  const [allDates, setAllDates] = useState(false);
  const [spot, setSpot] = useState("all");
  const [paid, setPaid] = useState("all");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Notice[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams({ date: allDates ? "all" : date, spot, paid });
      if (q.trim()) p.set("q", q.trim());
      const data = await call<{ items: Notice[]; totals: Totals }>(`/api/admin/bao-bay/notices?${p}`);
      setItems(data.items);
      setTotals(data.totals);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách");
    } finally {
      setLoading(false);
    }
  }, [call, date, allDates, spot, paid, q]);

  useEffect(() => {
    load();
    // Chỉ tự tải lại khi đổi bộ lọc chọn; ô tìm kiếm bấm Enter/nút mới tải
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, allDates, spot, paid]);

  const togglePaid = async (n: Notice) => {
    setBusyId(n._id);
    try {
      const data = await call<{ item: Notice }>(`/api/admin/bao-bay/notices/${n._id}`, {
        method: "PATCH",
        body: JSON.stringify({ paid: !n.paid }),
      });
      setItems((list) => list.map((x) => (x._id === n._id ? data.item : x)));
      // Tổng tiền đã thu/chưa thu phải khớp ngay với dòng vừa bấm
      setTotals((t) =>
        t
          ? {
              ...t,
              paidAmount: t.paidAmount + (n.paid ? -n.amount : n.amount),
              unpaidAmount: t.unpaidAmount + (n.paid ? n.amount : -n.amount),
            }
          : t,
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "Không cập nhật được");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Ngày bay</span>
          <input
            type="date"
            value={date}
            disabled={allDates}
            onChange={(e) => setDate(e.target.value || today)}
            className="h-10 rounded-md border border-slate-300 px-3 disabled:opacity-40"
          />
        </label>
        <label className="flex h-10 items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={allDates} onChange={(e) => setAllDates(e.target.checked)} />
          Mọi ngày (500 báo bay mới nhất)
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Điểm bay</span>
          <select value={spot} onChange={(e) => setSpot(e.target.value)} className="h-10 rounded-md border border-slate-300 px-3">
            <option value="all">Tất cả</option>
            {BAO_BAY_SPOTS.map((s) => (
              <option key={s} value={s}>
                {BAO_BAY_SPOT_CONFIG[s].name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Thu tiền</span>
          <select value={paid} onChange={(e) => setPaid(e.target.value)} className="h-10 rounded-md border border-slate-300 px-3">
            <option value="all">Tất cả</option>
            <option value="unpaid">Chưa thu</option>
            <option value="paid">Đã thu</option>
          </select>
        </label>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Tìm</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tên, SĐT, mã báo bay, mã HV"
              className="h-10 w-56 rounded-md border border-slate-300 px-3"
            />
          </label>
          <button type="submit" className="h-10 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">
            Tải
          </button>
        </form>
        {!allDates && date !== today ? (
          <button type="button" onClick={() => setDate(today)} className="h-10 text-sm text-emerald-700 underline">
            Về hôm nay
          </button>
        ) : null}
      </div>

      {totals ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Số báo bay" value={String(totals.count)} />
          <Stat label="Tổng phải thu" value={formatVnd(totals.amount)} />
          <Stat label="Đã thu" value={formatVnd(totals.paidAmount)} tone="green" />
          <Stat label="Chưa thu" value={formatVnd(totals.unpaidAmount)} tone={totals.unpaidAmount ? "red" : undefined} />
        </div>
      ) : null}
      {totals && Object.keys(totals.byMode).length ? (
        <div className="flex flex-wrap gap-2 text-xs">
          {(Object.keys(FEE_MODE_LABEL) as FeeMode[])
            .filter((m) => totals.byMode[m])
            .map((m) => (
              <span key={m} className={`rounded-full px-3 py-1 font-semibold ${MODE_STYLE[m]}`}>
                {FEE_MODE_LABEL[m]}: {totals.byMode[m]}
              </span>
            ))}
        </div>
      ) : null}

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Mã</th>
              <th className="px-3 py-2">Điểm · ngày bay</th>
              <th className="px-3 py-2">Phi công</th>
              <th className="px-3 py-2">Mã HV</th>
              <th className="px-3 py-2">Loại phí</th>
              <th className="px-3 py-2 text-right">Số tiền</th>
              <th className="px-3 py-2">Thu tiền</th>
              <th className="px-3 py-2">Gửi lúc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                  Đang tải…
                </td>
              </tr>
            ) : !items.length ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                  Chưa có báo bay nào.
                </td>
              </tr>
            ) : (
              items.map((n) => (
                <tr key={n._id} className="align-top">
                  <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-800">{n.noticeCode}</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-800">{BAO_BAY_SPOT_CONFIG[n.spot]?.name ?? n.spot}</div>
                    <div className="text-xs text-slate-500">{n.dates.map(formatVnDate).join(", ")}</div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-semibold text-slate-800">{n.fullName}</div>
                    <div className="text-xs text-slate-500">
                      <a href={`tel:${n.phone}`} className="hover:underline">
                        {n.phone}
                      </a>
                      {n.emergencyPhone ? ` · KC ${n.emergencyPhone}` : ""}
                    </div>
                    <div className="text-xs text-slate-400">
                      {[n.idNumber, n.wingClass ? wingClassLabel(n.wingClass as WingClass) : "", n.licence].filter(Boolean).join(" · ")}
                    </div>
                    {n.note ? <div className="mt-0.5 text-xs italic text-slate-500">“{n.note}”</div> : null}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{n.memberCode || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${MODE_STYLE[n.feeMode]}`}>
                      {FEE_MODE_LABEL[n.feeMode]}
                    </span>
                    {n.passFrom && n.passValidUntil ? (
                      <div className="mt-1 text-xs text-slate-500">
                        {formatVnDate(n.passFrom)} – {formatVnDate(n.passValidUntil)}
                      </div>
                    ) : null}
                    {n.coveredByNotice ? <div className="mt-1 text-xs text-slate-400">theo {n.coveredByNotice}</div> : null}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800">{n.amount ? formatVnd(n.amount) : "0"}</td>
                  <td className="px-3 py-2">
                    {n.amount > 0 ? (
                      <button
                        type="button"
                        disabled={busyId === n._id}
                        onClick={() => togglePaid(n)}
                        title={n.transferNote ? `Nội dung CK: ${n.transferNote}` : undefined}
                        className={`rounded-md px-3 py-1 text-xs font-bold transition disabled:opacity-50 ${
                          n.paid ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {n.paid ? "Đã thu ✓" : "Chưa thu"}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">Miễn phí</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">{vnTime(n.submittedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={`mt-1 text-xl font-bold ${
          tone === "green" ? "text-emerald-700" : tone === "red" ? "text-red-600" : "text-slate-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/* ================================================================== *
 * Thẻ HỘI VIÊN HNAA
 * ================================================================== */

function MembersTab() {
  const call = useAdminFetch();

  const [items, setItems] = useState<Member[]>([]);
  const [counts, setCounts] = useState({ total: 0, activeCount: 0 });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const p = new URLSearchParams({ status });
      if (q.trim()) p.set("q", q.trim());
      const data = await call<{ items: Member[]; total: number; activeCount: number }>(`/api/admin/bao-bay/members?${p}`);
      setItems(data.items);
      setCounts({ total: data.total, activeCount: data.activeCount });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách");
    } finally {
      setLoading(false);
    }
  }, [call, q, status]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="space-y-6">
      <ImportBox onDone={load} />

      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <h2 className="mr-auto text-xl font-bold text-slate-900">
            Danh sách hội viên{" "}
            <span className="text-sm font-normal text-slate-500">
              ({counts.activeCount} còn hiệu lực / {counts.total})
            </span>
          </h2>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="all">Tất cả</option>
            <option value="active">Còn hiệu lực</option>
            <option value="inactive">Đã tắt</option>
          </select>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Mã, tên, CCCD, SĐT"
              className="h-10 w-56 rounded-md border border-slate-300 px-3 text-sm"
            />
            <button type="submit" className="h-10 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">
              Tìm
            </button>
          </form>
        </div>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Mã</th>
                <th className="px-3 py-2">Họ tên</th>
                <th className="px-3 py-2">CCCD/Hộ chiếu</th>
                <th className="px-3 py-2">SĐT</th>
                <th className="px-3 py-2">SĐT khẩn cấp</th>
                <th className="px-3 py-2">Thông tin thêm</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                    Đang tải…
                  </td>
                </tr>
              ) : !items.length ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                    Chưa có hội viên nào — dán bảng ở trên để nhập.
                  </td>
                </tr>
              ) : (
                items.map((m) => (
                  <MemberRow
                    key={m._id}
                    member={m}
                    onSaved={(next) => setItems((list) => list.map((x) => (x._id === next._id ? next : x)))}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MemberRow({ member, onSaved }: { member: Member; onSaved: (m: Member) => void }) {
  const call = useAdminFetch();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(member);
  const [busy, setBusy] = useState(false);

  const save = async (patch: Partial<Member>) => {
    setBusy(true);
    try {
      const data = await call<{ item: Member }>(`/api/admin/bao-bay/members/${member._id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      onSaved(data.item);
      setDraft(data.item);
      setEditing(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setBusy(false);
    }
  };

  const extra = Object.entries(member.extra || {});
  const cell = "h-8 w-full rounded border border-slate-300 px-2 text-sm";

  if (editing) {
    return (
      <tr className="bg-amber-50/60 align-top">
        <td className="px-3 py-2">
          <input className={`${cell} font-mono uppercase`} value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
        </td>
        <td className="px-3 py-2">
          <input className={cell} value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} />
        </td>
        <td className="px-3 py-2">
          <input className={cell} value={draft.idNumber || ""} onChange={(e) => setDraft({ ...draft, idNumber: e.target.value })} />
        </td>
        <td className="px-3 py-2">
          <input className={cell} value={draft.phone || ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
        </td>
        <td className="px-3 py-2">
          <input
            className={cell}
            value={draft.emergencyPhone || ""}
            onChange={(e) => setDraft({ ...draft, emergencyPhone: e.target.value })}
          />
        </td>
        <td className="px-3 py-2 text-xs text-slate-500">{extra.map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}</td>
        <td className="px-3 py-2" />
        <td className="whitespace-nowrap px-3 py-2">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              save({
                code: draft.code,
                fullName: draft.fullName,
                idNumber: draft.idNumber,
                phone: draft.phone,
                emergencyPhone: draft.emergencyPhone,
              })
            }
            className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
          >
            Lưu
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(member);
              setEditing(false);
            }}
            className="ml-2 text-xs text-slate-500 underline"
          >
            Huỷ
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`align-top ${member.active ? "" : "bg-slate-50 text-slate-400"}`}>
      <td className="px-3 py-2 font-mono text-xs font-semibold">{member.code}</td>
      <td className="px-3 py-2 font-semibold">{member.fullName}</td>
      <td className="px-3 py-2">{member.idNumber || "—"}</td>
      <td className="px-3 py-2">{member.phone || "—"}</td>
      <td className="px-3 py-2">{member.emergencyPhone || "—"}</td>
      <td className="max-w-[240px] px-3 py-2 text-xs text-slate-500">{extra.map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}</td>
      <td className="px-3 py-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => save({ active: !member.active })}
          className={`rounded-md px-3 py-1 text-xs font-bold disabled:opacity-50 ${
            member.active ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
          }`}
          title={member.active ? "Bấm để tắt (mã sẽ báo không đúng)" : "Bấm để bật lại"}
        >
          {member.active ? "Còn hiệu lực" : "Đã tắt"}
        </button>
      </td>
      <td className="px-3 py-2">
        <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-emerald-700 underline">
          Sửa
        </button>
      </td>
    </tr>
  );
}

/**
 * Dán bảng từ Excel/Google Sheets → xem trước → lưu.
 *
 * Bóc bảng ngay trên trình duyệt (lib/bao-bay parseMemberPaste) để admin thấy
 * cột nào được hiểu là trường nào TRƯỚC khi ghi, và sửa được nếu đoán sai.
 */
function ImportBox({ onDone }: { onDone: () => void }) {
  const call = useAdminFetch();
  const [text, setText] = useState("");
  const [override, setOverride] = useState<Array<MemberField | null> | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const parsed = useMemo(() => (text.trim() ? parseMemberPaste(text, override) : null), [text, override]);
  const noCode = parsed ? !parsed.mapping.includes("code") : false;

  const save = async () => {
    if (!parsed?.rows.length) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await call<{ inserted: number; updated: number; matched: number; skipped: string[] }>(
        "/api/admin/bao-bay/members",
        { method: "POST", body: JSON.stringify({ rows: parsed.rows }) },
      );
      setMessage(
        `Đã lưu: ${res.inserted} hội viên mới, ${res.updated} hội viên cập nhật` +
          (res.skipped.length ? `, bỏ qua ${res.skipped.length} dòng (${res.skipped.slice(0, 5).join("; ")})` : "") +
          ".",
      );
      setText("");
      setOverride(undefined);
      onDone();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-bold text-slate-900">Nhập hội viên HNAA</h2>
      <p className="mt-1 text-sm text-slate-500">
        Bôi đen cả bảng trong Excel/Google Sheets (gồm DÒNG TIÊU ĐỀ), Ctrl+C rồi dán vào ô dưới. Các cột mã hội viên, họ
        tên, CCCD/hộ chiếu, SĐT, SĐT khẩn cấp được tự nhận ra; cột khác giữ nguyên làm thông tin thêm. Trùng mã thì ghi đè,
        ô trống không xoá dữ liệu cũ.
      </p>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOverride(undefined);
          setMessage("");
        }}
        rows={5}
        placeholder={"Mã hội viên\tHọ tên\tCCCD\tSĐT\tSĐT khẩn cấp\nHN001\tNguyễn Văn A\t001099012345\t0912345678\t0988000111"}
        className="mt-3 w-full rounded-md border border-slate-300 p-3 font-mono text-xs"
      />

      {parsed ? (
        <div className="mt-3 space-y-3">
          {noCode ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Chưa nhận ra cột MÃ HỘI VIÊN — chọn lại ở hàng &quot;Hiểu là&quot; bên dưới.
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  {parsed.headers.map((h, i) => (
                    <th key={i} className="px-2 py-1 text-left font-semibold text-slate-700">
                      {h || `Cột ${i + 1}`}
                    </th>
                  ))}
                </tr>
                <tr>
                  {parsed.headers.map((_, i) => (
                    <th key={i} className="px-2 pb-2 text-left font-normal">
                      <select
                        value={parsed.mapping[i] ?? ""}
                        onChange={(e) => {
                          const next = [...parsed.mapping];
                          const v = (e.target.value || null) as MemberField | null;
                          // Một trường chỉ một cột: chọn cho cột này thì gỡ ở cột kia
                          if (v) next.forEach((f, j) => f === v && (next[j] = null));
                          next[i] = v;
                          setOverride(next);
                        }}
                        className="h-7 rounded border border-slate-300 bg-white px-1"
                      >
                        <option value="">Thông tin thêm</option>
                        {(Object.keys(FIELD_LABEL) as MemberField[]).map((f) => (
                          <option key={f} value={f}>
                            {FIELD_LABEL[f]}
                          </option>
                        ))}
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          </div>

          <div className="text-sm text-slate-600">
            Xem trước: <b>{parsed.rows.length}</b> dòng hợp lệ
            {parsed.skipped ? <span className="text-red-600">, {parsed.skipped} dòng thiếu mã sẽ bỏ qua</span> : null}.
          </div>
          <div className="max-h-72 overflow-auto rounded-md border border-slate-200">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-2 py-1">Mã</th>
                  <th className="px-2 py-1">Họ tên</th>
                  <th className="px-2 py-1">CCCD/HC</th>
                  <th className="px-2 py-1">SĐT</th>
                  <th className="px-2 py-1">SĐT khẩn cấp</th>
                  <th className="px-2 py-1">Thông tin thêm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsed.rows.slice(0, 300).map((r, i) => (
                  <tr key={`${r.code}-${i}`}>
                    <td className="px-2 py-1 font-mono">{r.code}</td>
                    <td className={`px-2 py-1 ${r.fullName ? "" : "text-red-500"}`}>{r.fullName || "(thiếu tên)"}</td>
                    <td className="px-2 py-1">{r.idNumber}</td>
                    <td className="px-2 py-1">{r.phone}</td>
                    <td className="px-2 py-1">{r.emergencyPhone}</td>
                    <td className="px-2 py-1 text-slate-500">
                      {Object.entries(r.extra)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.rows.length > 300 ? (
              <div className="px-2 py-1 text-xs text-slate-500">… và {parsed.rows.length - 300} dòng nữa</div>
            ) : null}
          </div>

          <button
            type="button"
            disabled={saving || noCode || !parsed.rows.length}
            onClick={save}
            className="h-10 rounded-md bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Đang lưu…" : `Lưu ${parsed.rows.length} hội viên`}
          </button>
        </div>
      ) : null}

      {message ? <div className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</div> : null}
    </div>
  );
}
