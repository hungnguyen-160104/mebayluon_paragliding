// app/baocao/components/ui.tsx
"use client";

/**
 * Mấy ô nhập dùng chung cho trang báo bay.
 *
 * Cố ý viết tay thay vì dùng components/ui (shadcn): người nhập là phi công
 * đứng ở bãi đáp, dùng điện thoại, nhiều khi đeo găng — nên ô nhập phải to
 * (h-10), số phải bật bàn phím số (inputMode="numeric") và có nút +/− bấm
 * được bằng ngón tay.
 */

import * as React from "react";

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
    <section className={cn("@container rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4", className)}>
      {title && <h2 className="mb-1 text-base font-semibold text-slate-900">{title}</h2>}
      {hint && <p className="mb-2 text-xs leading-snug text-slate-400">{hint}</p>}
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
  headerClassName,
  open,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Tô nền/chữ riêng cho DẢI TIÊU ĐỀ — dùng cho thẻ cần nổi bật hẳn. */
  headerClassName?: string;
  /** Bật để mở sẵn thẻ (vd. bấm "Sửa" ở danh sách khác thì thẻ nhập tự xổ ra). */
  open?: boolean;
}) {
  return (
    <details open={open} className={cn("group rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm", className)}>
      <summary
        className={cn(
          "flex cursor-pointer items-center justify-between gap-2 rounded-2xl px-3 py-2.5 sm:px-4",
          headerClassName,
        )}
      >
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {/* KHÔNG shrink-0: tiêu đề dài (VD "🎥 Huỷ dịch vụ (flycam · 360 · cờ
              đỏ…)") trên mobile phải xuống dòng trong ô, không được tràn ra ngoài */}
          <span className="min-w-0 text-base font-semibold leading-snug">{title}</span>
          {hint && <span className="min-w-0 truncate text-xs opacity-70">{hint}</span>}
        </span>
        <span aria-hidden className="transition-transform group-open:rotate-180 opacity-60">
          ▾
        </span>
      </summary>
      <div className="@container border-t border-slate-100 p-3 sm:p-4">{children}</div>
    </details>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
  group,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
  /**
   * Ô này chỉ gồm CÁC NÚT BẤM (650m|850m, tiền mặt|chuyển khoản…) chứ không có
   * ô nhập nào.
   *
   * Khi đó phải bọc bằng <div>, KHÔNG bọc <label>: <label> không có `for` thì
   * bấm vào chữ nhãn là kích hoạt phần tử nhập đầu tiên bên trong — mà nút bấm
   * cũng tính — nên đọc tên ô rồi bấm vào chữ là máy tự chọn hộ lựa chọn đầu
   * tiên, người bấm không hề hay biết.
   */
  group?: boolean;
}) {
  const inner = (
    <>
      <span className="mb-1 block text-[13px] font-medium text-slate-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span>}
    </>
  );
  if (group) {
    return (
      <div role="group" className={cn("block min-w-0", className)}>
        {inner}
      </div>
    );
  }
  return <label className={cn("block min-w-0", className)}>{inner}</label>;
}

const inputBase =
  "w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 outline-none " +
  "placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 " +
  "disabled:bg-slate-100 disabled:text-slate-500";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputBase, "h-10 text-sm", props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputBase, "min-h-20 py-2.5 text-sm leading-relaxed", props.className)} />;
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
  sunset: { box: "border-orange-200 bg-orange-50/70", label: "text-orange-800" },
  flagFlight: { box: "border-amber-200 bg-amber-50/70", label: "text-amber-800" },
  /* Năm ô đếm ở "Số tổng trong ngày" — trước đây trắng giống nhau nên rất dễ
     gõ nhầm ô. Mỗi ô một màu riêng, khác hẳn bộ màu dịch vụ phía dưới. */
  guests: { box: "border-emerald-300 bg-emerald-50", label: "text-emerald-900" },
  tickets: { box: "border-sky-300 bg-sky-50", label: "text-sky-900" },
  returned: { box: "border-slate-300 bg-slate-100", label: "text-slate-800" },
  cancelled: { box: "border-rose-300 bg-rose-50", label: "text-rose-900" },
  moved: { box: "border-indigo-300 bg-indigo-50", label: "text-indigo-900" },
  /** Xe chuyên dụng lên núi (Hà Nội) — màu riêng, không lẫn với dịch vụ bay. */
  car: { box: "border-teal-300 bg-teal-50", label: "text-teal-900" },
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
    <div className={cn("min-w-0 rounded-lg border p-2", t.box)}>
      <div className={cn("mb-1 text-xs font-semibold leading-tight", t.label)}>{label}</div>
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
  /**
   * `compact` chỉ hẹp BỀ NGANG chứ không thấp đi: mấy cụm đếm đứng cạnh nhau
   * (PG/PPG, dịch vụ) thì nút vuông 40px chen nhau tới mức nhìn như đè lên ô số.
   * Chiều cao giữ nguyên 40px vì người bấm là phi công đeo găng ngoài bãi.
   */
  const btn =
    (compact ? "h-10 w-8 " : "h-10 w-10 ") +
    "shrink-0 rounded-lg border border-slate-300 bg-white text-lg font-semibold text-slate-600 active:bg-slate-200";

  /**
   * Ô SỐ ĐỨNG TRƯỚC trong mã, nút − đẩy sang trái bằng `order`.
   *
   * Vì sao phải lộn ngược thế này: <Field> bọc cả cụm trong một <label>, mà
   * <label> không có `for` thì bấm vào CHỮ NHÃN sẽ kích hoạt phần tử nhập ĐẦU
   * TIÊN bên trong — nút bấm cũng tính là phần tử nhập. Nên bấm vào chữ
   * "PG (số khách)" là máy bấm hộ dấu −, số khách tự tụt xuống. Để ô số đứng
   * đầu thì bấm nhãn chỉ đưa con trỏ vào ô số, còn nhìn vẫn là − [số] +.
   */
  return (
    <div className={cn("flex items-stretch", compact ? "gap-1" : "gap-1.5")}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={String(value)}
        onChange={(e) => onChange(clamp(Number(e.target.value.replace(/[^\d]/g, ""))))}
        onFocus={(e) => e.currentTarget.select()}
        className={cn(
          inputBase,
          // co được trong flex nhưng không bóp mất ô số
          compact ? "min-w-9 flex-1" : "min-w-12 flex-1",
          "order-2 h-10 rounded-lg text-center text-sm font-semibold tabular-nums",
        )}
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        className={cn(btn, "order-1")}
        aria-label="Giảm 1"
      >
        −
      </button>
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        className={cn(btn, "order-3")}
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
        /**
         * Số tiền dài (7-9 chữ số) trong ô hẹp thì bị cắt cụt — nhìn "7.500.(" mà
         * tưởng đã nhập đủ. Từ 7 ký tự trở lên (1.000.000) tự rút cỡ chữ, và ô
         * chừa lề phải hẹp hơn cho chữ "đ".
         */
        className={cn(
          inputBase,
          "h-10 rounded-lg pr-6 text-right font-semibold tabular-nums",
          (value ? value.toLocaleString("vi-VN").length : 0) >= 9 ? "text-[11px]" : (value ? value.toLocaleString("vi-VN").length : 0) >= 7 ? "text-xs" : "text-sm",
        )}
      />
      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
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
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
        styles,
        className,
      )}
    />
  );
}

/**
 * Dấu "xong" đứng NGAY CẠNH nút vừa bấm: ✓ Đã lưu · ✓ Đã xác nhận · ✓ Đã cập nhật.
 *
 * Băng thông báo ở cuối thẻ thì hay bị trôi khỏi màn hoặc lẫn với thẻ khác, nên
 * người bấm không chắc lệnh đã ăn hay chưa và bấm thêm lần nữa. Dấu này nằm sát
 * ngón tay vừa bấm, và tự tắt sau vài giây để không đọng lại thành thông tin cũ.
 */
export function DoneTag({ show, children = "Đã lưu" }: { show: boolean; children?: React.ReactNode }) {
  if (!show) return null;
  return (
    <span
      role="status"
      className="inline-flex shrink-0 animate-pulse items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800"
    >
      ✓ {children}
    </span>
  );
}

/**
 * Cờ báo "vừa xong" — bật lên rồi tự tắt sau `ms`. Dùng chung cho mọi nút hành
 * động: `const [justDone, flashDone] = useDoneFlag()` rồi gọi `flashDone()` sau
 * khi máy chủ trả về không lỗi.
 */
export function useDoneFlag(ms = 4_000): [boolean, () => void] {
  const [on, setOn] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const flash = React.useCallback(() => {
    setOn(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOn(false), ms);
  }, [ms]);
  return [on, flash];
}

/**
 * Màn "Đang tải…" của cả khu báo bay — TO, ĐẬM, ĐỎ.
 *
 * Chữ xám nhỏ ở giữa màn trắng nhìn như trang hỏng: người trực đứng ngoài bãi,
 * nắng chói, sóng 3G chập chờn, đợi mấy giây mà không thấy gì rõ ràng là bấm
 * lại hoặc gọi điện báo lỗi. Đỏ và to thì biết ngay máy đang chạy chứ chưa treo.
 */
export function PageLoading({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <p className="animate-pulse text-center text-2xl font-extrabold text-rose-600 sm:text-3xl">{label}</p>
    </div>
  );
}

/** Dòng "đang tải" NHỎ, đứng trong một thẻ đang mở — cũng đỏ đậm cho dễ thấy. */
export function InlineLoading({ label = "Đang tải…" }: { label?: string }) {
  return <p className="animate-pulse text-sm font-bold text-rose-600">{label}</p>;
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
        "rounded-lg border px-3 py-2",
        tone === "warning" ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50",
      )}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-base font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}
