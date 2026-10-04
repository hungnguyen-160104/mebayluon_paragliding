// app/baocao/components/session.ts
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ROLE_HOME, type BaobayRole } from "@/lib/baobay/roles";
import type { BaobayUserDTO } from "@/lib/baobay/types";

import { ApiError, apiGet } from "./client-api";
import { nhoPhien, phienDaNho, quenPhien } from "./offline";

/**
 * Địa chỉ cổng đăng nhập KÈM đường quay về trang đang mở (?next=…), để đăng
 * nhập xong (hoặc cổng thấy phiên vẫn còn) là về ĐÚNG trang, đúng ngày, đúng
 * điểm — không phải trang mặc định của vai trò với ngày hôm nay.
 */
export function congDangNhap(): string {
  if (typeof window === "undefined") return "/baocao";
  const ve = window.location.pathname + window.location.search;
  return ve.startsWith("/baocao/") ? `/baocao?next=${encodeURIComponent(ve)}` : "/baocao";
}

/** Lỗi do MÁY CHỦ/ĐƯỜNG TRUYỀN (mất mạng, 5xx, 429 chống bot…) — không phải hết phiên. */
function laLoiTamThoi(e: unknown): boolean {
  return !(e instanceof ApiError) || (e.status !== 401 && e.status !== 403);
}

/**
 * Lấy phiên đang đăng nhập, và đẩy người dùng về đúng chỗ nếu vào sai trang.
 *
 * Cookie phiên là httpOnly nên trình duyệt KHÔNG đọc được — buộc phải hỏi
 * /api/baocao/me. Hỏi mỗi lần vào trang cũng có cái hay: quản trị khoá tài
 * khoản hoặc đổi vai trò là có tác dụng ngay, không đợi token hết hạn.
 *
 * DỰNG TRANG NGAY BẰNG PHIÊN ĐÃ NHỚ (chủ 04/10: "tải trang quản lý booking vẫn
 * hơi chậm"). Trước đây mọi thẻ trên trang phải đợi /me trả lời xong mới bắt
 * đầu hỏi số liệu — thêm trọn một lượt đi về (và một lần khởi động hàm của
 * Vercel) vào đầu mỗi lần mở trang. Nay có phiên đã nhớ trong máy thì dựng
 * trang luôn, /me chạy SONG SONG để xác nhận: khác thì cập nhật, hết phiên thì
 * về cổng đăng nhập. An toàn: máy chủ vẫn kiểm cookie ở MỌI lời gọi, phiên nhớ
 * chỉ quyết định vẽ khung trang nào.
 *
 * LỖI TẠM THỜI KHÔNG ĐÁ RA NGOÀI (chủ 04/10: "F5 hay bị nhảy ngày"). Trước đây
 * /me trả 500/502/504 (lambda nguội, Atlas chập) hay 429 (tường chống bot của
 * Vercel) là xoá phiên nhớ rồi đá về /baocao — cổng thấy phiên vẫn còn lại đẩy
 * sang trang MẶC ĐỊNH của vai trò, mất ?date=&spot= → ngày nhảy về hôm nay,
 * điểm nhảy về điểm mặc định. Nay chỉ 401/403 (hết hạn, bị khoá) mới về cổng,
 * và mang theo đường quay về; lỗi khác thì thử lại, trong lúc đó dùng phiên nhớ.
 */
export function useBaobaySession(expectedRole?: BaobayRole | readonly BaobayRole[]) {
  const router = useRouter();
  const [user, setUser] = useState<BaobayUserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const allowed = expectedRole
      ? Array.isArray(expectedRole)
        ? (expectedRole as readonly BaobayRole[])
        : [expectedRole as BaobayRole]
      : null;
    /** Người kiêm nhiệm (phi công kiêm camera man) vào được trang của cả hai vai. */
    const hopVai = (u: BaobayUserDTO) => !allowed || allowed.some((r) => [u.role, ...(u.extraRoles ?? [])].includes(r));

    const dungPhien = (found: BaobayUserDTO) => {
      if (!alive) return;
      if (!hopVai(found)) {
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

    /**
     * Phiên nhớ chỉ dùng để dựng trang khi nó HỢP VAI của trang này — phiên nhớ
     * cũ (vừa đổi vai) không được phép tự chuyển trang; để /me quyết.
     */
    const nho = phienDaNho<BaobayUserDTO>()?.user ?? null;
    const dungNho = Boolean(nho && nho.role && hopVai(nho));
    if (dungNho) dungPhien(nho!);

    const thu = (lan: number) => {
      apiGet<{ user: BaobayUserDTO }>("/api/baocao/me", { timeoutMs: 8000, moi: lan > 0 })
        .then(({ user: found }) => {
          if (!alive) return;
          nhoPhien(found);
          /**
           * Giống hệt phiên nhớ thì KHÔNG đặt lại: `user` đổi tham chiếu là mọi
           * effect phụ thuộc `user` trên trang chạy lại, hỏi số liệu thêm một lượt.
           */
          if (!dungNho || JSON.stringify(found) !== JSON.stringify(nho)) dungPhien(found);
        })
        .catch((e: unknown) => {
          if (!alive) return;
          if (laLoiTamThoi(e)) {
            // Thử lại hai lần (1,5s rồi 4s); đang có phiên nhớ thì trang cứ chạy tiếp
            if (lan < 2) {
              setTimeout(() => alive && thu(lan + 1), lan === 0 ? 1500 : 4000);
              return;
            }
            if (dungNho) return;
            // Không có phiên nhớ, máy chủ vẫn lỗi: về cổng (nó tự báo lỗi), giữ đường quay về
            router.replace(congDangNhap());
            return;
          }
          // 401/403: hết phiên hoặc bị khoá thật
          quenPhien();
          router.replace(congDangNhap());
        });
    };
    thu(0);

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(expectedRole) ? expectedRole.join(",") : expectedRole, router]);

  return { user, loading, setUser };
}
