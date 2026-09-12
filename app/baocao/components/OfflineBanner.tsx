// app/baocao/components/OfflineBanner.tsx
"use client";

import { useEffect, useState } from "react";

import { SU_KIEN_CO_MANG, SU_KIEN_DU_LIEU_CU } from "./offline";

/**
 * DẢI BÁO OFFLINE — treo trên đầu mọi trang /baocao khi mất mạng hoặc khi số
 * liệu đang xem là bản cất trong máy.
 *
 * Hai nguồn tín hiệu, vì `navigator.onLine` hay nói dối (có wifi nhưng không
 * ra được internet vẫn là "online"): (1) sự kiện online/offline của trình
 * duyệt; (2) API vừa trả bản cất (header X-Baobay-Offline) → chắc chắn đang
 * đứt. Có một lượt gọi mạng thành công là hạ dải.
 */
export function OfflineBanner() {
  const [mat, setMat] = useState(false);
  const [luc, setLuc] = useState<string>("");

  useEffect(() => {
    const onOff = () => setMat(true);
    const onOn = () => {
      setMat(false);
      setLuc("");
    };
    const onCu = (e: Event) => {
      setMat(true);
      const l = (e as CustomEvent<{ luc: string }>).detail?.luc;
      if (l) setLuc(l);
    };
    /** Trạng thái lúc mở trang — đẩy sang tick sau để không setState đồng bộ trong effect. */
    const t = window.setTimeout(() => {
      if (navigator.onLine === false) setMat(true);
    }, 0);
    window.addEventListener("offline", onOff);
    window.addEventListener("online", onOn);
    window.addEventListener(SU_KIEN_DU_LIEU_CU, onCu);
    window.addEventListener(SU_KIEN_CO_MANG, onOn);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("offline", onOff);
      window.removeEventListener("online", onOn);
      window.removeEventListener(SU_KIEN_DU_LIEU_CU, onCu);
      window.removeEventListener(SU_KIEN_CO_MANG, onOn);
    };
  }, []);

  if (!mat) return null;
  const gio = luc ? new Date(luc).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "";
  return (
    <div className="sticky top-0 z-[70] -mx-4 mb-3 border-b-2 border-amber-500 bg-amber-100 px-4 py-2 text-sm text-amber-950 print:hidden">
      <strong>⚠ Đang mất mạng.</strong>{" "}
      {gio ? `Số liệu đang xem là bản cất lúc ${gio}.` : "Chỉ xem được số liệu đã tải trước đó."}{" "}
      Bấm lưu / thu tiền / huỷ lúc này sẽ KHÔNG ghi được — đợi có mạng rồi làm lại.
    </div>
  );
}
