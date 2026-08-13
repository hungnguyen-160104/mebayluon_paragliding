// app/baocao/phat-nop-muon/page.tsx
"use client";

import { useState } from "react";

import { shiftDateKey, todayInVN } from "@/lib/baobay/date";
import { BACKDATE_LIMIT_DAYS } from "@/lib/baobay/validation";

import { DateBar } from "../components/DateBar";
import { PenaltyCard } from "../components/PenaltyCard";
import { useBaobaySession } from "../components/session";
import { useSpot } from "../components/spot";
import { Shell } from "../components/Shell";

/**
 * Trang PHẠT NỘP MUỘN riêng của kế toán — tách khỏi trang Chốt ngày cho gọn:
 * lệnh phạt đã ghi, khoản tạm tính, nút huỷ phạt và ô đặt GIỜ PHẠT theo điểm.
 * Vào bằng thanh chuyển trang ngang cạnh "Chốt ngày" / "Tổng hợp".
 */
export default function LatePenaltyPage() {
  const { user, loading } = useBaobaySession("accountant");
  const { spot, setSpot, options: spotOptions } = useSpot(user?.spots);

  const today = todayInVN();
  const [date, setDate] = useState(today);

  if (loading || !user || !spot) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">Đang tải…</div>;
  }

  return (
    <Shell user={user} title="Phạt nộp muộn" subtitle="Xem lệnh phạt trong ngày, huỷ phạt có lý do, đặt giờ chốt phạt cho từng điểm bay.">
      <DateBar
        date={date}
        onChange={setDate}
        max={today}
        min={shiftDateKey(today, -BACKDATE_LIMIT_DAYS)}
        spot={spot}
        spotOptions={spotOptions}
        onSpotChange={(v) => setSpot(v as never)}
      />

      <PenaltyCard spot={spot} date={date} />
    </Shell>
  );
}
