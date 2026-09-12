/**
 * MÃ CHỐNG SAO CHÉP TRÊN VÉ IN — chủ chốt 12/09.
 *
 * Mỗi KHÁCH một mã ngắn kiểu "A2D8", in trên cả bốn liên của người ấy và lưu
 * vào sổ. Booking #23 bốn khách → #23.1 A2D8, #23.2 K7HM, #23.3 … — bốn mã khác
 * nhau. Sau này cầm vé đối chiếu: mã có trong sổ, đúng ngày, đúng số → vé thật;
 * không có → vé chép.
 *
 * Bốn ký tự từ bảng 30 chữ số ĐÃ BỎ những ký tự dễ đọc nhầm trên giấy nhiệt
 * (0/O, 1/I/L, 5/S, 8/B, 2/Z) → 30⁴ ≈ 810.000 mã; một ngày vài chục vé thì
 * xác suất trùng trong ngày là không đáng kể, và máy chủ vẫn KIỂM TRÙNG trong
 * cùng điểm + cùng ngày trước khi cấp. Ngắn thế là đủ: mã chỉ để đối chiếu
 * với sổ, không phải chìa khoá mật mã.
 *
 * Sinh bằng crypto khi có (Node và trình duyệt đều có), không dùng Math.random.
 */

export const BANG_CHU = "ACDEFGHJKMNPQRTUVWXY34679";
export const DO_DAI_MA = 4;

function ngauNhien(n: number): number {
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } }).crypto;
  if (c?.getRandomValues) {
    const a = new Uint32Array(1);
    c.getRandomValues(a);
    return a[0] % n;
  }
  return Math.floor(Math.random() * n);
}

/** Một mã mới, chưa biết có trùng hay không — nơi gọi tự kiểm với danh sách đã cấp. */
export function taoMaVe(): string {
  let s = "";
  for (let i = 0; i < DO_DAI_MA; i++) s += BANG_CHU[ngauNhien(BANG_CHU.length)];
  return s;
}

/**
 * Cấp `soLuong` mã KHÔNG TRÙNG NHAU và không trùng với `daCo` (mã đã cấp trong
 * cùng điểm + ngày). Thử lại tối đa vài trăm lần — với 810.000 mã thì không
 * bao giờ chạm tới giới hạn ấy trong thực tế.
 */
export function capMaVe(soLuong: number, daCo: Iterable<string> = []): string[] {
  const dung = new Set([...daCo].map(chuanHoaMaVe));
  const ra: string[] = [];
  let thu = 0;
  while (ra.length < soLuong && thu < 500) {
    thu++;
    const m = taoMaVe();
    if (dung.has(m)) continue;
    dung.add(m);
    ra.push(m);
  }
  if (ra.length < soLuong) throw new Error("Không cấp đủ mã vé — quá nhiều mã trùng");
  return ra;
}

/** Người trực gõ "a2d8", "A2 D8", "a-2-d-8" → "A2D8". Ký tự dễ nhầm được quy về đúng bảng. */
export function chuanHoaMaVe(raw: string): string {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/0/g, "O")
    .replace(/O/g, "Q") // O không có trong bảng — người ta hay nhìn Q thành O
    .replace(/[1IL]/g, "J") // 1/I/L không có trong bảng — J là chữ gần nhất
    .replace(/5/g, "S")
    .replace(/S/g, "6")
    .replace(/8/g, "B")
    .replace(/B/g, "3")
    .replace(/[2Z]/g, "7")
    .slice(0, DO_DAI_MA);
}

/** Mã hợp lệ = đúng độ dài và chỉ gồm chữ trong bảng. */
export function maVeHopLe(m: string): boolean {
  return m.length === DO_DAI_MA && [...m].every((c) => BANG_CHU.includes(c));
}
