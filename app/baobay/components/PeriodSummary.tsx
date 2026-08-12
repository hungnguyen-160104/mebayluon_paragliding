// app/baobay/components/PeriodSummary.tsx
"use client";

import { useCallback, useEffect, useState } from "react";

import { formatDateKeyVN, shiftDateKey, todayInVN } from "@/lib/baobay/date";

import { apiGet } from "./client-api";
import { Banner, Button, Card, Field, TextInput } from "./ui";

/**
 * Khung "Tổng theo chu kỳ" gắn vào trang phi công / điều phối / camera man.
 *
 * Chọn khoảng ngày (có nút nhanh 7 ngày / tháng này / 30 ngày) là hiện tổng
 * từng chỉ tiêu của CHÍNH người đang đăng nhập — nhãn do máy chủ dựng theo vai
 * trò nên ba trang dùng chung một khung này.
 *
 * Số cộng CẢ ngày kế toán chưa chốt (người lao động cần biết mình đã nhập tới
 * đâu), nhưng có dòng nhắc rõ bao nhiêu ngày còn chưa chốt.
 */

type PeriodLine = { label: string; value: number; money?: boolean };

type MySummary = {
  from: string;
  to: string;
  days: number;
  unclosedDays: number;
  lines: PeriodLine[];
};

export function PeriodSummary({ spot, title, hint }: { spot: string; title: string; hint?: string }) {
  const today = todayInVN();
  const [from, setFrom] = useState(shiftDateKey(today, -29));
  const [to, setTo] = useState(today);
  const [data, setData] = useState<MySummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: string, t: string) => {
    setBusy(true);
    setError(null);
    try {
      setData(await apiGet<MySummary>(`/api/baobay/my-summary?from=${f}&to=${t}&spot=${spot}`));
    } catch (err: any) {
      setError(err?.message || "Không tải được số tổng");
    } finally {
      setBusy(false);
    }
  }, [spot]);

  useEffect(() => {
    load(from, to);
  }, [from, to, load]);

  const preset = (days: number) => {
    setFrom(shiftDateKey(today, -(days - 1)));
    setTo(today);
  };

  const thisMonth = () => {
    setFrom(`${today.slice(0, 7)}-01`);
    setTo(today);
  };

  return (
    <Card title={title} hint={hint}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Từ ngày">
          <TextInput type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </Field>
        <Field label="Đến ngày">
          <TextInput
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => e.target.value && setTo(e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="ghost" className="h-9 px-3 text-xs" onClick={() => preset(7)}>
          7 ngày
        </Button>
        <Button variant="ghost" className="h-9 px-3 text-xs" onClick={thisMonth}>
          Tháng này
        </Button>
        <Button variant="ghost" className="h-9 px-3 text-xs" onClick={() => preset(30)}>
          30 ngày
        </Button>
      </div>

      {error && (
        <div className="mt-3">
          <Banner tone="error">{error}</Banner>
        </div>
      )}

      {busy && <p className="mt-3 text-sm text-slate-500">Đang cộng…</p>}

      {!busy && data && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.lines.map((line) => (
              <div key={line.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="text-xs text-slate-500">{line.label}</div>
                <div className="text-base font-semibold tabular-nums text-slate-900">
                  {line.money ? `${line.value.toLocaleString("vi-VN")}đ` : line.value}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {formatDateKeyVN(data.from)} – {formatDateKeyVN(data.to)} · {data.days} ngày có báo cáo
            {data.unclosedDays > 0 && (
              <span className="font-medium text-amber-700">
                {" "}
                · trong đó {data.unclosedDays} ngày kế toán chưa chốt, số có thể còn đổi
              </span>
            )}
          </p>
        </>
      )}
    </Card>
  );
}
