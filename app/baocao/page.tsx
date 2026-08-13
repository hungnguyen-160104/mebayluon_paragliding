// app/baocao/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ROLE_HOME } from "@/lib/baobay/roles";
import type { BaobayUserDTO } from "@/lib/baobay/types";

import { ApiError, apiGet, apiPost } from "./components/client-api";
import { Banner, Button, Field, TextInput } from "./components/ui";

/**
 * Đăng nhập trang báo bay.
 *
 * Mỗi phi công và mỗi nhân viên quầy vé một tài khoản riêng (quản trị cấp ở
 * /admin/baocao). Đăng nhập xong máy chủ tự đưa về trang đúng vai trò, người
 * dùng không cần biết đường dẫn nào.
 */
export default function BaobayLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Còn phiên cũ thì vào thẳng, khỏi bắt đăng nhập lại.
  useEffect(() => {
    let alive = true;
    apiGet<{ user: BaobayUserDTO }>("/api/baocao/me", { timeoutMs: 8000 })
      .then(({ user }) => {
        if (!alive) return;
        const home = ROLE_HOME[user.role];
        // Vai trò lạ (dữ liệu cũ) thì thà hiện form còn hơn đứng mãi ở màn chờ
        if (home) router.replace(home);
        else setChecking(false);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        // 401 = chưa đăng nhập, chuyện thường. Còn lại là mạng/máy chủ — nói cho biết.
        if (!(err instanceof ApiError) || err.status !== 401) {
          setError("Không kiểm tra được phiên đăng nhập (mạng chậm hoặc mất kết nối). Cứ đăng nhập lại bên dưới.");
        }
        setChecking(false);
      });
    return () => {
      alive = false;
    };
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiPost<{ user: BaobayUserDTO; redirectTo: string }>("/api/baocao/login", {
        username,
        password,
      });
      router.replace(res.redirectTo || ROLE_HOME[res.user.role]);
    } catch (err: any) {
      setError(err?.message || "Đăng nhập thất bại");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">
        Đang kiểm tra phiên đăng nhập…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">BÁO BAY HÀNG NGÀY</h1>
          <p className="mt-1 text-sm text-slate-600">
            Phi công và quầy vé đăng nhập để nhập số liệu trong ngày
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          autoComplete="off"
        >
          {error && <Banner tone="error">{error}</Banner>}

          <Field label="Tài khoản">
            <TextInput
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </Field>

          <Field label="Mật khẩu">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </Button>

          <p className="text-center text-xs text-slate-500">
            Quên mật khẩu thì nhắn quản lý điểm bay đặt lại giúp.
          </p>
        </form>
      </div>
    </div>
  );
}
