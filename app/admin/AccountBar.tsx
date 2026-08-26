// app/admin/AccountBar.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { clearToken, getToken } from "@/lib/auth";

/**
 * GÓC TÀI KHOẢN trên thanh menu khu quản trị: đang đăng nhập bằng ai, đổi mật
 * khẩu, đăng xuất.
 *
 * Đổi mật khẩu đi qua HAI BƯỚC có xác nhận bằng thư (xem
 * app/api/auth/password/route.ts): nhập mật khẩu cũ + mới -> mã 6 số về hộp
 * thư chủ -> nhập mã thì mật khẩu mới mới có hiệu lực.
 */
export function AccountBar({ username, level }: { username: string; level: "owner" | "editor" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function logout() {
    clearToken();
    router.replace("/admin/login");
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-slate-500 sm:inline">
        {username}
        <span
          className={
            "ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold " +
            (level === "owner" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600")
          }
          title={
            level === "owner"
              ? "Tài khoản chủ — đầy đủ mọi thứ, gồm cả nhân sự báo bay"
              : "Tài khoản biên tập — đăng bài và xem thống kê"
          }
        >
          {level === "owner" ? "chủ" : "biên tập"}
        </span>
      </span>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Đổi mật khẩu
      </button>
      <button
        type="button"
        onClick={logout}
        className="rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        Đăng xuất
      </button>

      {open && <ChangePasswordDialog onClose={() => setOpen(false)} onDone={logout} />}
    </div>
  );
}

/**
 * Hộp đổi mật khẩu. Đổi xong thì ĐĂNG XUẤT luôn (onDone): phiên đang mở vẫn
 * chạy bằng token cũ, bắt đăng nhập lại bằng mật khẩu mới là cách chắc chắn
 * nhất để người dùng biết mình đã nhớ đúng mật khẩu vừa đặt.
 */
function ChangePasswordDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  /** "form" = đang nhập mật khẩu · "code" = đã gửi thư, chờ nhập mã. */
  const [step, setStep] = useState<"form" | "code">("form");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function call(body: Record<string, unknown>) {
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken() ?? ""}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Không xử lý được");
    return data;
  }

  async function request() {
    setError(null);
    if (next !== again) return setError("Hai ô mật khẩu mới không giống nhau");
    setBusy(true);
    try {
      const r = await call({ action: "request", currentPassword: current, newPassword: next });
      setSentTo(String(r?.sentTo ?? ""));
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được mã");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setError(null);
    setBusy(true);
    try {
      await call({ action: "confirm", code });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mã không đúng");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        {done ? (
          <>
            <h2 className="text-lg font-bold text-emerald-700">Đã đổi mật khẩu</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Mật khẩu mới có hiệu lực ngay. Bấm nút dưới để đăng nhập lại bằng mật khẩu vừa đặt.
            </p>
            <button
              type="button"
              onClick={onDone}
              className="mt-4 h-10 w-full rounded-lg bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
            >
              Đăng nhập lại
            </button>
          </>
        ) : step === "form" ? (
          <>
            <h2 className="text-lg font-bold text-slate-900">Đổi mật khẩu</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Xong bước này, một mã xác nhận sẽ được gửi về hộp thư của chủ. Nhập đúng mã thì mật khẩu mới
              mới có hiệu lực.
            </p>
            <div className="mt-3 space-y-2">
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Mật khẩu hiện tại"
                autoComplete="current-password"
                className={field}
              />
              <input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                placeholder="Mật khẩu mới (từ 8 ký tự)"
                autoComplete="new-password"
                className={field}
              />
              <input
                type="password"
                value={again}
                onChange={(e) => setAgain(e.target.value)}
                placeholder="Gõ lại mật khẩu mới"
                autoComplete="new-password"
                className={field}
              />
            </div>
            {error && <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 flex-1 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600"
              >
                Thôi
              </button>
              <button
                type="button"
                disabled={busy || !current || !next || !again}
                onClick={request}
                className="h-10 flex-1 rounded-lg bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? "Đang gửi…" : "Gửi mã"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-slate-900">Nhập mã xác nhận</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Mã 6 số vừa gửi tới <strong>{sentTo}</strong>. Mã sống 10 phút. Không thấy thư thì xem cả hộp
              Spam / Quảng cáo.
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              className="mt-3 h-12 w-full rounded-lg border border-slate-300 text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-emerald-500"
            />
            {error && <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 flex-1 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600"
              >
                Thôi
              </button>
              <button
                type="button"
                disabled={busy || code.length < 6}
                onClick={confirm}
                className="h-10 flex-1 rounded-lg bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? "Đang kiểm…" : "Xác nhận"}
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Bấm “Thôi” là huỷ — mật khẩu cũ giữ nguyên.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
