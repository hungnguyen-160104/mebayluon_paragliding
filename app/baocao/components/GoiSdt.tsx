"use client";

import type { MouseEvent, ReactNode } from "react";
import { phoneToTel } from "@/lib/phone-link";

/**
 * SỐ ĐIỆN THOẠI TRONG SỔ BOOKING BẤM LÀ GỌI (chủ 12/09).
 *
 * Người trực cầm điện thoại xem sổ, thấy khách chưa tới là muốn gọi ngay —
 * không bắt nhớ số rồi mở ứng dụng gọi gõ lại. `tel:` trên điện thoại mở
 * màn quay số; trên máy tính hệ điều hành tự hỏi mở bằng FaceTime/Zalo/Teams.
 *
 * `stopPropagation` là bắt buộc ở ô sổ: cả ô đang bắt sự kiện bấm để vào
 * chế độ SỬA, không chặn thì bấm gọi lại hoá ra đang gõ đè lên số. Muốn sửa số
 * thì bấm vào phần trống của ô (hoặc chọn ô rồi gõ) như trước.
 */
export function GoiSdt({
  sdt,
  className,
  children,
  title = "Bấm để gọi",
}: {
  sdt?: string | null;
  className?: string;
  children?: ReactNode;
  title?: string;
}) {
  const so = String(sdt ?? "").trim();
  if (!so) return null;
  /** Số không đủ chữ số (ghi chú kiểu "hỏi lễ tân") thì in chữ thường, không giả làm link. */
  const goiDuoc = so.replace(/\D/g, "").length >= 8;
  if (!goiDuoc) return <span className={className}>{children ?? so}</span>;
  const chan = (e: MouseEvent) => e.stopPropagation();
  return (
    <a
      href={`tel:${phoneToTel(so)}`}
      onClick={chan}
      onDoubleClick={chan}
      title={title}
      className={(className ? className + " " : "") + "underline decoration-dotted underline-offset-2 hover:decoration-solid"}
    >
      {children ?? so}
    </a>
  );
}
