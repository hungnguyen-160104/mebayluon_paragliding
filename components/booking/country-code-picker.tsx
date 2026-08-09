"use client";

/**
 * Ô chọn mã vùng điện thoại: vừa xổ danh sách vừa gõ để lọc.
 *
 * Danh sách có hơn 200 nước nên xổ ra rồi cuộn tay là cực hình, nhất là trên
 * điện thoại. Ở đây khách gõ gì cũng ra: tên nước ("israel", "i sra el"),
 * mã vùng ("972" hay "+972"), hay mã nước ("IL"). Bỏ dấu khi so nên gõ
 * "viet nam" vẫn tìm được "Việt Nam".
 */

import { useEffect, useMemo, useRef, useState } from "react";

import { COUNTRY_CODES, type CountryCode } from "@/lib/booking/country-codes";

/** Bỏ dấu và hạ chữ thường để so cho dễ. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export default function CountryCodePicker({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (dial: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => COUNTRY_CODES.find((c) => c.dial === value),
    [value],
  );

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return COUNTRY_CODES;

    // Gõ "+972" hay "972" đều tìm theo mã vùng; còn lại tìm theo tên và mã nước.
    const digits = q.replace(/[^0-9]/g, "");

    return COUNTRY_CODES.filter((c) => {
      if (digits && c.dial.replace("+", "").startsWith(digits)) return true;
      if (normalize(c.name).includes(q)) return true;
      return c.iso.toLowerCase() === q;
    });
  }, [query]);

  // Bấm ra ngoài thì đóng và trả ô về trạng thái đang chọn.
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (c: CountryCode) => {
    onChange(c.dial);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        value={open ? query : selected ? `${selected.flag} ${selected.dial}` : value}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
          if (e.key === "Enter" && open && results.length) {
            e.preventDefault();
            pick(results[0]);
          }
        }}
        placeholder={placeholder}
        aria-label="Mã vùng điện thoại"
        className="h-12 w-full rounded-lg border border-[#DCE7F3] bg-white px-3 pr-8 text-[#1C2930] outline-none transition focus:border-[#0194F3] focus:ring-1 focus:ring-[#0194F3]"
      />

      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#5B6B7A]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {open ? (
        <ul className="absolute left-0 top-[calc(100%+4px)] z-30 max-h-72 w-[280px] overflow-y-auto rounded-xl border border-[#DCE7F3] bg-white py-1 shadow-xl">
          {results.length ? (
            results.map((c) => (
              <li key={c.iso}>
                <button
                  type="button"
                  onClick={() => pick(c)}
                  className={[
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition",
                    c.dial === value
                      ? "bg-[#EAF4FE] font-semibold text-[#0B6FC4]"
                      : "text-[#1C2930] hover:bg-[#F5F7FA]",
                  ].join(" ")}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="shrink-0 font-mono text-[13px] text-[#5B6B7A]">
                    {c.dial}
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-3 text-sm text-[#5B6B7A]">
              Không tìm thấy quốc gia
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
