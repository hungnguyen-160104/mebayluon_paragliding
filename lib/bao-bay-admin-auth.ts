// lib/bao-bay-admin-auth.ts
import { NextResponse } from "next/server";

import { requireAuth, type AuthUser } from "@/middlewares/requireAuth";

/**
 * Cửa vào /api/admin/bao-bay/*: phải là tài khoản CHỦ của khu /admin.
 *
 * Danh sách hội viên HNAA và báo bay chứa CCCD, số điện thoại của phi công —
 * tài khoản "editor" (chỉ để đăng bài) không có việc gì phải xem, nên chặn
 * luôn ở máy chủ chứ không chỉ ẩn thẻ trên menu.
 */
export function requireBaoBayAdmin(req: Request): AuthUser | NextResponse {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (auth.level !== "owner") {
    return NextResponse.json({ message: "Chỉ tài khoản chủ được quản lý báo bay" }, { status: 403 });
  }
  return auth;
}
