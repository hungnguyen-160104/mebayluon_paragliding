// app/baocao/components/session.ts
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ROLE_HOME, type BaobayRole } from "@/lib/baobay/roles";
import type { BaobayUserDTO } from "@/lib/baobay/types";

import { ApiError, apiGet } from "./client-api";
import { nhoPhien, phienDaNho, quenPhien } from "./offline";

/**
 * Lấy phiên đang đăng nhập, và đẩy người dùng về đúng chỗ nếu vào sai trang.
 *
 * Cookie phiên là httpOnly nên trình duyệt KHÔNG đọc được — buộc phải hỏi
 * /api/baocao/me. Hỏi mỗi lần vào trang cũng có cái hay: quản trị khoá tài
 * khoản hoặc đổi vai trò là có tác dụng ngay, không đợi token hết hạn.
 */
export function useBaobaySession(expectedRole?: BaobayRole | readonly BaobayRole[]) {
  const router = useRouter();
  const [user, setUser] = useState<BaobayUserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    /**
     * MẤT MẠNG: /api/baocao/me không tới được máy chủ. Service worker thường
     * trả bản cất; không có thì dùng phiên đã nhớ trong máy — miễn là lần
     * trước đăng nhập thật. Chỉ 401/403 (hết hạn, bị khoá) mới đẩy về đăng nhập.
     */
    const dungPhien = (found: BaobayUserDTO) => {
      if (!alive) return;
        const allowed = expectedRole
          ? Array.isArray(expectedRole)
            ? (expectedRole as readonly BaobayRole[])
            : [expectedRole as BaobayRole]
          : null;
        /** Người kiêm nhiệm (phi công kiêm camera man) vào được trang của cả hai vai. */
        const wearing = [found.role, ...(found.extraRoles ?? [])];
        if (allowed && !allowed.some((r) => wearing.includes(r))) {
          // Không nhảy về chính trang này (vai trò lạ) — vòng lặp chuyển trang là treo máy
          const home = ROLE_HOME[found.role];
          if (home && home !== window.location.pathname) {
            router.replace(home);
            return;
          }
        }
        setUser(found);
        setLoading(false);
    };
    apiGet<{ user: BaobayUserDTO }>("/api/baocao/me", { timeoutMs: 8000 })
      .then(({ user: found }) => {
        nhoPhien(found);
        dungPhien(found);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const matMang = e instanceof ApiError && e.status === 0;
        const nho = matMang ? phienDaNho<BaobayUserDTO>() : null;
        if (nho) {
          dungPhien(nho.user);
          return;
        }
        if (!matMang) quenPhien();
        router.replace("/baocao");
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(expectedRole) ? expectedRole.join(",") : expectedRole, router]);

  return { user, loading, setUser };
}
