// app/baocao/components/MerchCard.tsx
"use client";

/**
 * HÀNG BÁN THÊM — thẻ dùng CHUNG cho mọi vai nhập báo cáo ngày: điều phối,
 * quầy vé, phi công, camera man (luật chủ 06/09). Kế toán và quản trị không có
 * thẻ này vì họ không đứng bán, chỉ soát số.
 *
 * Danh mục là CỦA ĐIỂM BAY, không phải của từng người: cả bãi bán chung một
 * lô áo, ai bán được cái nào thì khai vào báo cáo của mình. Nhờ vậy đơn giá
 * chỉ khai một lần, và kế toán cộng doanh thu hàng lưu niệm theo điểm.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import { formatVND } from "@/lib/pricing";
import { buildVietQrPayload, PAY_ACCOUNT_CAFE_HOMESTAY, toAsciiNote } from "@/lib/vietqr";

import { apiGet, apiPost } from "./client-api";
import { Button, Field, MoneyInput, TextInput } from "./ui";


type MerchItem = { key: string; name: string; price: number; unit: string; active: boolean };

/**
 * Danh mục hàng + ô khai số bán trong ngày.
 *
 * Hai việc trong một thẻ vì chúng đi liền nhau: hôm có lô áo mới thì người
 * trực tạo mặt hàng rồi khai luôn số đã bán, không phải nhờ ai.
 *
 * Trang chỉ gửi MÃ HÀNG + SỐ LƯỢNG; đơn giá do máy chủ tra từ danh mục rồi
 * nhân ra thành tiền — số tiền không đi qua trình duyệt nên không sửa được.
 */
export function MerchCard({
  spot,
  qty,
  method,
  onChange,
  onMethodChange,
  disabled,
  onError,
}: {
  spot: string;
  qty: Record<string, number>;
  /** Mã hàng → trả tiền mặt hay chuyển khoản. Thiếu thì coi như tiền mặt. */
  method: Record<string, "cash" | "transfer">;
  onChange: (next: Record<string, number>) => void;
  onMethodChange: (next: Record<string, "cash" | "transfer">) => void;
  disabled?: boolean;
  onError: (m: string) => void;
}) {
  const [items, setItems] = useState<MerchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [unit, setUnit] = useState("chiếc");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!spot) return;
    try {
      const res = await apiGet<{ items: MerchItem[] }>(`/api/baocao/merch?spot=${spot}`);
      setItems(res.items ?? []);
    } catch {
      /* danh mục hỏng thì thẻ trống — không chặn phần còn lại của báo cáo */
    }
  }, [spot]);

  useEffect(() => {
    load();
  }, [load]);

  const setQty = (key: string, v: number) => onChange({ ...qty, [key]: Math.max(0, v) });
  const setMethod = (key: string, v: "cash" | "transfer") => onMethodChange({ ...method, [key]: v });
  /** Mã QR đang mở cho mặt hàng nào. */
  const [qrFor, setQrFor] = useState<MerchItem | null>(null);

  const total = items.reduce((t, it) => t + it.price * (qty[it.key] || 0), 0);
  const sold = items.filter((it) => (qty[it.key] || 0) > 0);

  async function addItem() {
    if (!name.trim()) return onError("Chưa đặt tên mặt hàng");
    if (price <= 0) return onError("Chưa nhập đơn giá");
    setBusy(true);
    try {
      const res = await apiPost<{ items: MerchItem[] }>(`/api/baocao/merch?spot=${spot}`, {
        name: name.trim(),
        price,
        unit: unit.trim() || "chiếc",
      });
      setItems(res.items ?? []);
      setName("");
      setPrice(0);
      setOpen(false);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Không lưu được mặt hàng");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">
          Chưa có mặt hàng nào. Bấm “＋ Thêm mặt hàng” để tạo (áo cờ đỏ, khăn, cốm…).
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((it) => {
            const n = qty[it.key] || 0;
            return (
              <li key={it.key} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{it.name}</span>
                  <span className="block text-xs text-slate-500">
                    {formatVND(it.price)} / {it.unit}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setQty(it.key, n - 1)}
                  className="h-9 w-9 shrink-0 rounded-lg border border-slate-300 font-bold disabled:opacity-40"
                >
                  −
                </button>
                <input
                  inputMode="numeric"
                  disabled={disabled}
                  value={n || ""}
                  placeholder="0"
                  onChange={(e) => setQty(it.key, Number(e.target.value.replace(/[^\d]/g, "").slice(0, 4)) || 0)}
                  className="h-9 w-12 shrink-0 rounded-lg border border-slate-300 text-center text-sm font-bold tabular-nums"
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setQty(it.key, n + 1)}
                  className="h-9 w-9 shrink-0 rounded-lg border border-slate-300 font-bold disabled:opacity-40"
                >
                  ＋
                </button>
                {/* Thành tiền từng dòng — thấy ngay chứ không đợi cộng cuối thẻ */}
                <span className="w-24 shrink-0 whitespace-nowrap text-right text-sm font-bold tabular-nums text-slate-900">
                  {n > 0 ? formatVND(it.price * n) : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {/* HÌNH THỨC TRẢ theo từng mặt hàng — chỉ hiện dòng ĐÃ khai số bán */}
      {sold.length > 0 && (
        <ul className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">
          {sold.map((it) => {
            const m = method[it.key] === "transfer" ? "transfer" : "cash";
            const n = qty[it.key] || 0;
            return (
              <li key={it.key} className="flex flex-wrap items-center gap-1.5">
                <span className="min-w-0 flex-1 text-xs font-semibold text-slate-700">
                  {it.name} ×{n}
                </span>
                <span className="flex shrink-0 overflow-hidden rounded-lg border border-slate-300">
                  {(["cash", "transfer"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      disabled={disabled}
                      onClick={() => setMethod(it.key, v)}
                      className={
                        "px-2.5 py-1 text-xs font-bold " +
                        (m === v
                          ? v === "cash"
                            ? "bg-emerald-600 text-white"
                            : "bg-indigo-600 text-white"
                          : "bg-white text-slate-500")
                      }
                    >
                      {v === "cash" ? "TM" : "CK"}
                    </button>
                  ))}
                </span>
                {/* CK thì bày mã cho khách quét ngay — tiền mặt không cần mã */}
                {m === "transfer" && (
                  <button
                    type="button"
                    onClick={() => setQrFor(it)}
                    className="shrink-0 rounded-lg border border-indigo-400 bg-white px-2 py-1 text-xs font-bold text-indigo-700"
                  >
                    Mã QR
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {qrFor && (
        <MerchQr
          item={qrFor}
          qty={qty[qrFor.key] || 0}
          onClose={() => setQrFor(null)}
        />
      )}

      {sold.length > 0 && (
        <div className="mt-2 flex items-center gap-2 border-t border-slate-300 pt-2">
          <span className="min-w-0 flex-1 text-sm font-black text-slate-900">TỔNG HÀNG BÁN THÊM</span>
          <span className="whitespace-nowrap text-lg font-black tabular-nums text-emerald-700">{formatVND(total)}</span>
        </div>
      )}

      {!disabled &&
        (open ? (
          <div className="mt-2 rounded-xl border border-slate-300 bg-slate-50 p-2">
            <div className="grid gap-2 @md:grid-cols-3">
              <Field label="Tên mặt hàng" className="@md:col-span-2">
                <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Áo cờ đỏ" />
              </Field>
              <Field label="Đơn vị">
                <TextInput value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="chiếc" />
              </Field>
              <Field label="Đơn giá" className="@md:col-span-3">
                <MoneyInput value={price} onChange={setPrice} />
              </Field>
            </div>
            <div className="mt-2 flex gap-2">
              <Button type="button" onClick={addItem} disabled={busy} className="flex-1">
                {busy ? "Đang lưu…" : "Lưu mặt hàng"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="flex-1 bg-white">
                Đóng
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setOpen(true)} className="mt-2 w-full bg-white">
            ＋ Thêm mặt hàng
          </Button>
        ))}
    </div>
  );
}

/**
 * MÃ QR CHO MỘT MẶT HÀNG — khách trả bằng chuyển khoản thì quét ngay tại quầy.
 *
 * Tiền về TÀI KHOẢN QUẦY (Vietcombank — Nguyễn Thị Thuỷ), không phải tài khoản
 * tiền bay: hàng lưu niệm và tiền vé là hai bộ sổ đối soát khác nhau, gộp một
 * tài khoản thì sao kê trộn lẫn.
 *
 * NỘI DUNG chuyển khoản ghi "tên hàng - ngày - số thứ tự bán" để kế toán dò
 * sao kê ra đúng dòng nào của ngày nào. Số thứ tự là SỐ ĐANG KHAI trong ngày,
 * nên hai lần bán cùng một mặt hàng không ra cùng một nội dung.
 */
function MerchQr({ item, qty, onClose }: { item: MerchItem; qty: number; onClose: () => void }) {
  const [qr, setQr] = useState("");
  const [failed, setFailed] = useState(false);
  const amount = item.price * Math.max(1, qty);

  const note = useMemo(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    return toAsciiNote(`${item.name} ${p(d.getDate())}${p(d.getMonth() + 1)} #${Math.max(1, qty)}`);
  }, [item.name, qty]);

  useEffect(() => {
    let alive = true;
    const payload = buildVietQrPayload({
      bankBin: PAY_ACCOUNT_CAFE_HOMESTAY.bankBin,
      accountNumber: PAY_ACCOUNT_CAFE_HOMESTAY.accountNumber,
      amount,
      note,
    });
    import("qrcode")
      .then((m) =>
        m.default.toDataURL(payload, {
          width: 640,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#0f172a", light: "#ffffff" },
        }),
      )
      .then((url) => alive && setQr(url))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [amount, note]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      <div className="mx-auto max-w-md px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-slate-900">{item.name}</p>
            <p className="text-xs text-slate-500">
              {Math.max(1, qty)} {item.unit} × {formatVND(item.price)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto shrink-0 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600"
          >
            ✕ Đóng
          </button>
        </div>

        <div className="mt-3 flex items-baseline gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-white">
          <span className="min-w-0 flex-1 text-lg font-bold">TỔNG</span>
          <span className="shrink-0 whitespace-nowrap text-2xl font-black tabular-nums">{formatVND(amount)}</span>
        </div>

        <div className="mt-3 rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-3 text-center">
          <p className="text-sm font-bold text-indigo-900">Quét mã để chuyển khoản</p>
          {qr ? (
            <img src={qr} alt="Mã QR chuyển khoản" className="mx-auto mt-2 w-full max-w-[17rem] rounded-xl bg-white p-2" />
          ) : failed ? (
            <p className="mt-2 text-sm font-semibold text-rose-600">
              Chưa vẽ được mã — khách chuyển tay theo số tài khoản dưới đây.
            </p>
          ) : (
            <p className="mt-2 text-sm text-indigo-700">Đang tạo mã…</p>
          )}
          <div className="mt-2 text-left text-sm">
            <p>
              <span className="text-slate-500">Ngân hàng:</span>{" "}
              <strong className="text-slate-900">{PAY_ACCOUNT_CAFE_HOMESTAY.bankName}</strong>
            </p>
            <p>
              <span className="text-slate-500">Số tài khoản:</span>{" "}
              <strong className="text-lg tabular-nums text-slate-900">{PAY_ACCOUNT_CAFE_HOMESTAY.accountNumber}</strong>
            </p>
            <p>
              <span className="text-slate-500">Chủ tài khoản:</span>{" "}
              <strong className="text-slate-900">{PAY_ACCOUNT_CAFE_HOMESTAY.accountName}</strong>
            </p>
            <p>
              <span className="text-slate-500">Nội dung:</span>{" "}
              <strong className="text-slate-900">{note}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
