// lib/baobay/money-dest.ts
/**
 * QUỸ NHẬN TIỀN — tiền khách trả rơi vào TÚI NÀO.
 *
 * "Tiền mặt hay chuyển khoản" mới trả lời được nửa câu hỏi. Nửa còn lại, và là
 * nửa kế toán cần: tiền mặt ấy ai đang giữ, khoản chuyển khoản ấy về tài khoản
 * nào. Sổ tay Sa Pa vốn đã ghi đúng như vậy từ lâu — khối "NGƯỜI NHẬN TIỀN" có
 * bảy cột: TK Trường · TM c Yến · Ngoại tệ · TK Cty · POS · USD · TK CTY.
 *
 * Trước đây app chỉ lưu `method` (cash/transfer) nên không dựng lại được mấy
 * cột đó, và mỗi lần đối chiếu là phải mở bảng tính ra dò tay. Từ 09/09/2026
 * mỗi khoản thu mang thêm `dest` — mã quỹ ở dưới đây.
 *
 * ┌── ĐỔI NGƯỜI THÌ SỬA Ở ĐÂY ─────────────────────────────────────────────┐
 * │ "Trường", "c Yến" là TÊN NGƯỜI, mà người thì đổi. Đổi `label` thoải     │
 * │ mái — nó chỉ là chữ hiện trên màn hình và trên cột bảng tính. NHƯNG     │
 * │ ĐỪNG ĐỔI `id`: id đã nằm trong hàng nghìn bản ghi thu tiền cũ, đổi là   │
 * │ những khoản ấy mất quỹ và biến khỏi mọi cột. Người mới thay người cũ    │
 * │ giữ cùng một túi thì giữ nguyên id, chỉ sửa label.                      │
 * └────────────────────────────────────────────────────────────────────────┘
 */

import { normalizeSpot, type SpotId } from "@/lib/baobay/spots";

/**
 * Tiền đi đường nào — quyết định khoản này có phải dò sao kê ngân hàng không,
 * và có nằm trong "tiền mặt ai đó đang giữ" không.
 *
 *  cash     tiền mặt, có người đang cầm  → vào sổ tiền của người đó
 *  transfer chuyển khoản                 → phải dò ra trong sao kê
 *  pos      quẹt thẻ                     → tiền về theo kỳ của ngân hàng
 *  fx       ngoại tệ                     → tiền mặt nhưng chưa quy đổi
 */
export type MoneyDestKind = "cash" | "transfer" | "pos" | "fx";

export type MoneyDest = {
  id: string;
  label: string;
  kind: MoneyDestKind;
  /** Tên cột tương ứng trên sổ tay Google Sheets — để đẩy số sang đúng ô. */
  sheetColumn?: string;
};

/**
 * Danh sách quỹ của TỪNG ĐIỂM. Điểm nào chưa khai thì giao diện KHÔNG hỏi
 * "ai nhận" — không ép hai điểm kia đổi cách nhập tiền chỉ vì Sa Pa cần.
 */
const SPOT_MONEY_DESTS: Partial<Record<SpotId, MoneyDest[]>> = {
  sapa: [
    { id: "tk-truong", label: "TK Trường", kind: "transfer", sheetColumn: "TK Trường" },
    { id: "tm-yen", label: "TM c Yến", kind: "cash", sheetColumn: "TM c Yến" },
    { id: "ngoai-te", label: "Ngoại tệ", kind: "fx", sheetColumn: "NGOẠI TỆ" },
    { id: "tk-cty", label: "TK Cty", kind: "transfer", sheetColumn: "TK Cty" },
    { id: "pos", label: "POS (quẹt thẻ)", kind: "pos", sheetColumn: "POS" },
  ],
};

export function moneyDestsOf(spot: string): MoneyDest[] {
  return SPOT_MONEY_DESTS[normalizeSpot(spot)] ?? [];
}

/** Điểm này có quản quỹ nhận tiền không — giao diện dựa vào đây để hiện ô chọn. */
export function hasMoneyDests(spot: string): boolean {
  return moneyDestsOf(spot).length > 0;
}

export function moneyDest(spot: string, id: unknown): MoneyDest | null {
  const key = String(id ?? "").trim();
  return moneyDestsOf(spot).find((d) => d.id === key) ?? null;
}

export function moneyDestLabel(spot: string, id: unknown): string {
  return moneyDest(spot, id)?.label ?? "";
}

/**
 * QUỸ MẶC ĐỊNH suy từ hình thức trả — chỗ dựa cho ba trường hợp:
 * bản ghi cũ chưa có `dest`, lối nhập nhanh không hỏi, và cửa nhận tự động
 * (web/OTA/bảng tính) không biết ai cầm tiền.
 *
 * Lấy quỹ ĐẦU TIÊN cùng đường tiền. Đoán vậy vẫn hơn để trống: để trống thì
 * khoản đó rơi khỏi mọi cột và tổng các cột không bao giờ bằng tổng đã thu —
 * kế toán thấy lệch mà không biết lệch ở đâu. Đoán thì ít nhất còn thấy nó
 * nằm sai chỗ và sửa được.
 */
export function defaultMoneyDest(spot: string, method: "cash" | "transfer"): string {
  const list = moneyDestsOf(spot);
  if (!list.length) return "";
  const want: MoneyDestKind[] = method === "cash" ? ["cash", "fx"] : ["transfer", "pos"];
  return (list.find((d) => want.includes(d.kind)) ?? list[0]).id;
}

/**
 * Đưa một giá trị bất kỳ về mã quỹ hợp lệ của điểm.
 * Không hợp lệ (bản ghi cũ, gõ tay sai) thì rơi về quỹ mặc định theo `method`.
 */
export function normalizeMoneyDest(spot: string, id: unknown, method: "cash" | "transfer"): string {
  return moneyDest(spot, id)?.id ?? defaultMoneyDest(spot, method);
}

/** Đường tiền của một quỹ, quy về hai nhánh sổ sách vẫn dùng (mặt / khoản). */
export function moneyDestMethod(spot: string, id: unknown): "cash" | "transfer" {
  const kind = moneyDest(spot, id)?.kind;
  return kind === "cash" || kind === "fx" ? "cash" : "transfer";
}
