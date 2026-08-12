// app/baobay/components/session.ts
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ROLE_HOME, type BaobayRole } from "@/lib/baobay/roles";
import type { BaobayUserDTO } from "@/lib/baobay/types";

import { apiGet } from "./client-api";

/**
 * Lấy phiên đang đăng nhập, và đẩy người dùng về đúng chỗ nếu vào sai trang.
 *
 * Cookie phiên là httpOnly nên trình duyệt KHÔNG đọc được — buộc phải hỏi
 * /api/baobay/me. Hỏi mỗi lần vào trang cũng có cái hay: quản trị khoá tài
 * khoản hoặc đổi vai trò là có tác dụng ngay, không đợi token hết hạn.
 */
export function useBaobaySession(expectedRole?: BaobayRole) {
  const router = useRouter();
  const [user, setUser] = useState<BaobayUserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    apiGet<{ user: BaobayUserDTO }>("/api/baobay/me")
      .then(({ user: found }) => {
        if (!alive) return;
        if (expectedRole && found.role !== expectedRole) {
          router.replace(ROLE_HOME[found.role]);
          return;
        }
        setUser(found);
        setLoading(false);
      })
      .catch(() => {
        if (alive) router.replace("/baobay");
      });

    return () => {
      alive = false;
    };
  }, [expectedRole, router]);

  return { user, loading, setUser };
}
