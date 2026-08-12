// app/api/admin/baocao/accounts/[id]/route.ts
import { NextResponse } from "next/server";

import { isBaobayRole } from "@/lib/baobay/roles";
import { requireBaobay } from "@/middlewares/requireBaobay";
import { deleteAccount, randomPassword, updateAccount } from "@/services/baobay.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Sửa tài khoản báo bay: đổi tên hiển thị, email, sđt, vai trò, khoá/mở
 * (active/deactive), đặt lại mật khẩu.
 *
 * KHOÁ và XOÁ là hai việc khác nhau:
 *  - PATCH isActive:false = khoá — hết đăng nhập được nhưng số liệu cũ nguyên vẹn.
 *  - DELETE = xoá vĩnh viễn tài khoản KÈM toàn bộ báo cáo của người đó trong
 *    cơ sở dữ liệu (không đụng Google Sheets — bên đó xoá tay nếu cần).
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const auth = requireBaobay(req, { roles: ["admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  if (body?.role !== undefined && !isBaobayRole(body.role)) {
    return NextResponse.json({ message: "Vai trò không hợp lệ" }, { status: 400 });
  }

  // resetPassword: true -> sinh mật khẩu mới và trả về một lần
  const newPassword =
    body?.resetPassword === true
      ? String(body?.newPassword ?? "").trim() || randomPassword()
      : undefined;

  const result = await updateAccount(id, {
    displayName: body?.displayName !== undefined ? String(body.displayName) : undefined,
    role: body?.role,
    email: body?.email !== undefined ? String(body.email) : undefined,
    phone: body?.phone !== undefined ? String(body.phone) : undefined,
    spots: Array.isArray(body?.spots) ? body.spots.map(String) : undefined,
    note: body?.note !== undefined ? String(body.note) : undefined,
    isActive: typeof body?.isActive === "boolean" ? body.isActive : undefined,
    newPassword,
  }, auth);

  if (!result.ok) return NextResponse.json({ message: result.error }, { status: 400 });

  return NextResponse.json({ account: result.account, password: newPassword });
}

/**
 * Xoá vĩnh viễn. Yêu cầu xác nhận hai lớp: ngoài token quản trị, phần thân phải
 * gửi kèm `confirm` đúng bằng username của tài khoản — trang quản trị bắt người
 * xoá gõ lại tên đăng nhập, nên một cú bấm nhầm không xoá được gì.
 */
export async function DELETE(req: Request, { params }: Ctx) {
  const auth = requireBaobay(req, { roles: ["admin"], allowAdmin: true });
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const confirm = String(body?.confirm ?? "").trim().toLowerCase();

  if (!confirm) {
    return NextResponse.json(
      { message: "Thiếu xác nhận: gửi kèm confirm = tên đăng nhập của tài khoản cần xoá" },
      { status: 400 },
    );
  }

  // Phép so tên nằm TRONG deleteAccount, trước khi xoá bất cứ bản ghi nào.
  const result = await deleteAccount(id, confirm, auth);
  if (!result.ok) return NextResponse.json({ message: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, deleted: result.deleted, username: result.username });
}
