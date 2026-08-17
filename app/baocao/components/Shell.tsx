// app/baocao/components/Shell.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ROLE_LABEL, roleTabs, uniqueTabs } from "@/lib/baobay/roles";
import { spotName } from "@/lib/baobay/spots";
import type { BaobayUserDTO } from "@/lib/baobay/types";

import { apiPost } from "./client-api";
import { Banner, Button, Card, Field, TextInput } from "./ui";

/**
 * Khung chung của mọi trang báo bay: tên người đang đăng nhập, vai trò, nút
 * đăng xuất và chỗ đổi mật khẩu.
 *
 * Luôn hiện rõ tên người đang đăng nhập ở đầu trang: máy ở quầy vé dùng chung,
 * đã có lần người sau nhập vào tài khoản người trước.
 */
export function Shell({
  user,
  title,
  subtitle,
  children,
}: {
  user: BaobayUserDTO;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [showPassword, setShowPassword] = useState(user.mustChangePassword);
  const [loggingOut, setLoggingOut] = useState(false);

  /**
   * Kế toán có ba trang nên cần thanh chuyển; phi công và quầy vé chỉ có một
   * trang duy nhất, thêm thanh vào chỉ làm rối.
   */
  /**
   * Người KIÊM NHIỆM (vd. phi công kiêm camera man) có lối vào mọi trang của các
   * vai mình mang — mỗi ngày làm việc nào thì mở trang việc ấy, khỏi đăng nhập
   * hai tài khoản.
   */
  const wearing = [user.role, ...(user.extraRoles ?? [])];
  /** Vai đơn: chỉ kế toán mới cần thanh thẻ (4 trang). Kiêm nhiệm: đủ lối vào mọi vai. */
  const tabs = uniqueTabs(
    (user.extraRoles ?? []).length > 0
      ? wearing.flatMap(roleTabs)
      : user.role === "accountant"
        ? roleTabs("accountant")
        : [],
  );

  async function logout() {
    setLoggingOut(true);
    try {
      await apiPost("/api/baocao/logout");
    } finally {
      router.replace("/baocao");
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:py-8 lg:max-w-6xl">
      {/* KHÔNG cho gãy dòng: hai nút luôn đứng cùng hàng với tên, sát lề phải.
          Khối tên co lại và cắt bớt nếu hẹp, thay vì đẩy nút xuống dòng dưới. */}
      <header className="mb-5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-medium uppercase tracking-wide text-sky-700">
            {ROLE_LABEL[user.role]}
            {user.spots?.length ? ` · ${user.spots.map(spotName).join(" + ")}` : ""}
          </div>
          {/* Nói thẳng người này đang mang những vai nào — khỏi đoán qua thanh thẻ */}
          {(user.extraRoles ?? []).length > 0 && (
            <div className="truncate text-[11px] font-medium text-emerald-700">
              kiêm {(user.extraRoles ?? []).map((r) => ROLE_LABEL[r]).join(" · ")}
            </div>
          )}
          <div className="truncate text-lg font-bold text-slate-900">{user.name}</div>
          <div className="truncate text-xs text-slate-500">@{user.username}</div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            onClick={() => setShowPassword((v) => !v)}
            className="h-9 whitespace-nowrap px-2.5 text-xs"
          >
            Đổi mật khẩu
          </Button>
          <Button
            variant="ghost"
            onClick={logout}
            disabled={loggingOut}
            className="h-9 whitespace-nowrap px-2.5 text-xs"
          >
            {loggingOut ? "Đang thoát…" : "Đăng xuất"}
          </Button>
        </div>
      </header>

      {user.mustChangePassword && (
        <div className="mb-4">
          <Banner tone="warning">
            <strong>Mật khẩu này do quản trị đặt.</strong> Đổi sang mật khẩu riêng của anh/chị để không
            ai khác nhập thay được.
          </Banner>
        </div>
      )}

      {showPassword && (
        <div className="mb-5">
          <ChangePasswordCard onDone={() => setShowPassword(false)} />
        </div>
      )}

      {tabs.length > 0 && (
        <nav className="mb-5 flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={
                  active
                    ? "shrink-0 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white"
                    : "shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>

      <div className="space-y-3">{children}</div>

      <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-400">
        Trang nội bộ Mê Bay Lượn · số liệu đã lưu sẽ tự chảy sang bảng tổng hợp của kế toán
      </footer>
    </div>
  );
}

/** Khung tự đổi mật khẩu — export để trang /baocao/admin (không dùng Shell) dùng lại. */
export function ChangePasswordCard({ onDone }: { onDone: () => void }) {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirm) {
      setError("Hai lần nhập mật khẩu mới không giống nhau");
      return;
    }

    setSaving(true);
    try {
      await apiPost("/api/baocao/password", { currentPassword, newPassword });
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
      // Đợi một nhịp cho người dùng đọc dòng thông báo rồi mới đóng.
      setTimeout(onDone, 1500);
    } catch (err: any) {
      setError(err?.message || "Không đổi được mật khẩu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Đổi mật khẩu">
      {done ? (
        <Banner tone="success">Đã đổi mật khẩu. Lần sau đăng nhập bằng mật khẩu mới.</Banner>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {error && <Banner tone="error">{error}</Banner>}
          <Field label="Mật khẩu hiện tại">
            <TextInput
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </Field>
          <Field label="Mật khẩu mới" hint="Từ 8 ký tự">
            <TextInput
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNext(e.target.value)}
              required
              minLength={8}
            />
          </Field>
          <Field label="Nhập lại mật khẩu mới">
            <TextInput
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </Field>
          <Button type="submit" disabled={saving}>
            {saving ? "Đang lưu…" : "Lưu mật khẩu mới"}
          </Button>
        </form>
      )}
    </Card>
  );
}
