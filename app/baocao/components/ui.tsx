// app/baocao/components/ui.tsx
"use client";

/**
 * Mấy ô nhập dùng chung cho trang báo bay.
 *
 * Cố ý viết tay thay vì dùng components/ui (shadcn): người nhập là phi công
 * đứng ở bãi đáp, dùng điện thoại, nhiều khi đeo găng — nên ô nhập phải to
 * (h-12), số phải bật bàn phím số (inputMode="numeric") và có nút +/− bấm
 * được bằng ngón tay.
 */

import { cn } from "@/lib/utils";

export function Card({
  title,
  hint,
  children,
  className,
}: {
  title?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("@container rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>
      {title && <h2 className="mb-1 text-base font-semibold text-slate-900">{title}</h2>}
      {hint && <p className="mb-3 text-xs leading-snug text-slate-400">{hint}</p>}
      {!hint && title && <div className="mb-3" />}
      {children}
    </section>
  );
}

/**
 * Thẻ THU GỌN cho mục ít dùng (khách huỷ/dời, ngoại giao, nộp tiền…) — mặc định
 * đóng, bấm tiêu đề mới xổ ra. Cùng khung với Card để không lệch nhịp trang.
 */
export function CollapseCard({
  title,
  hint,
  children,
  className,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("group rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      <summary className="flex cursor-pointer items-center justify-between gap-2 rounded-2xl px-4 py-3 sm:px-5">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 text-base font-semibold text-slate-900">{title}</span>
          {hint && <span className="truncate text-xs text-slate-400">{hint}</span>}
        </span>
        <span aria-hidden className="text-slate-400 transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      <div className="@container border-t border-slate-100 p-4 sm:p-5">{children}</div>
    </details>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 text-slate-900 outline-none " +
  "placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 " +
  "disabled:bg-slate-100 disabled:text-slate-500";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputBase, "h-12", props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputBase, "min-h-24 py-3 leading-relaxed", props.className)} />;
}

/**
 * Ô đếm: có nút − và + hai bên.
 *
 * Giá trị giữ dạng số, ô rỗng coi như 0. Không cho âm — báo cáo không có khái
 * niệm "âm hai chuyến".
 */
/**
 * Khung màu riêng cho từng DỊCH VỤ GIA TĂNG khi các cụm đếm nằm sát nhau —
 * flycam xanh dương, Camera 360 tím, dù cờ đỏ hồng, kéo cờ vàng. Mắt bám theo
 * màu là hết bấm nhầm cột bên cạnh.
 */
export const SERVICE_TONE = {
  flycam: { box: "border-sky-200 bg-sky-50/70", label: "text-sky-800" },
  video360: { box: "border-violet-200 bg-violet-50/70", label: "text-violet-800" },
  redFlag: { box: "border-rose-200 bg-rose-50/70", label: "text-rose-800" },
  flagFlight: { box: "border-amber-200 bg-amber-50/70", label: "text-amber-800" },
} as const;

export function ServiceBox({
  tone,
  label,
  children,
}: {
  tone: keyof typeof SERVICE_TONE;
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = SERVICE_TONE[tone];
  return (
    <div className={cn("min-w-0 rounded-xl border p-2.5", t.box)}>
      <div className={cn("mb-1.5 text-xs font-semibold leading-tight", t.label)}>{label}</div>
      {children}
    </div>
  );
}

export function CountInput({
  value,
  onChange,
  max = 999,
  id,
  compact,
}: {
  value: number;
  onChange: (next: number) => void;
  max?: number;
  id?: string;
  /** Bản nhỏ cho các cụm đếm nằm sát nhau (dịch vụ gia tăng) — đỡ bấm nhầm. */
  compact?: boolean;
}) {
  const clamp = (n: number) => Math.max(0, Math.min(max, Math.trunc(n) || 0));
  const btn = compact
    ? "h-10 w-10 shrink-0 rounded-lg border border-slate-300 bg-white text-lg font-semibold text-slate-600 active:bg-slate-200"
    : "h-12 w-12 shrink-0 rounded-xl border border-slate-300 bg-slate-50 text-xl font-semibold text-slate-600 active:bg-slate-200";

  return (
    <div className={compact ? "flex items-stretch gap-1.5" : "flex items-stretch gap-2"}>
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        className={btn}
        aria-label="Giảm 1"
      >
        −
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={String(value)}
        onChange={(e) => onChange(clamp(Number(e.target.value.replace(/[^\d]/g, ""))))}
        onFocus={(e) => e.currentTarget.select()}
        className={cn(
          inputBase,
          // co được trong flex nhưng không bóp mất ô số (tối thiểu 3rem)
          "min-w-12 flex-1",
          compact ? "h-10 text-center text-base font-semibold tabular-nums" : "h-12 text-center text-lg font-semibold tabular-nums",
        )}
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        className={btn}
        aria-label="Tăng 1"
      >
        +
      </button>
    </div>
  );
}

/**
 * Ô tiền: hiện có dấu chấm phân nhóm (1.250.000) nhưng gửi lên máy chủ là số
 * nguyên. Quầy vé nhập tiền triệu, thiếu dấu phân nhóm rất dễ gõ lệch một số 0.
 */
export function MoneyInput({
  value,
  onChange,
  id,
}: {
  value: number;
  onChange: (next: number) => void;
  id?: string;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={value ? value.toLocaleString("vi-VN") : ""}
        placeholder="0"
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "").slice(0, 13);
          onChange(digits ? Number(digits) : 0);
        }}
        className={cn(inputBase, "h-12 pr-12 text-right text-lg font-semibold tabular-nums")}
      />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
        đ
      </span>
    </div>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-sky-600 text-white hover:bg-sky-700 active:bg-sky-800 disabled:bg-sky-300",
    ghost: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400",
    danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
  }[variant];

  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
        styles,
        className,
      )}
    />
  );
}

export function Banner({
  tone,
  children,
  onClose,
}: {
  tone: "success" | "error" | "warning" | "info";
  children: React.ReactNode;
  onClose?: () => void;
}) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    info: "border-sky-200 bg-sky-50 text-sky-900",
  }[tone];

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", styles)}>
      <div className="flex-1 space-y-1">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} className="text-lg leading-none opacity-50 hover:opacity-100" aria-label="Đóng">
          ×
        </button>
      )}
    </div>
  );
}

/** Ô hiển thị một con số đã tính sẵn (số lượng vé suy ra từ khoảng mã...). */
export function Readout({
  label,
  value,
  tone = "normal",
}: {
  label: React.ReactNode;
  value: string;
  tone?: "normal" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-2.5",
        tone === "warning" ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50",
      )}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}
