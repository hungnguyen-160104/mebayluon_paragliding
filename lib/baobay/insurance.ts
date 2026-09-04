// lib/baobay/insurance.ts
/**
 * HỒ SƠ BẢO HIỂM CHUYẾN BAY — phần dùng chung cho cả máy chủ và trình duyệt.
 *
 * Mọi khách bay dù lượn đều phải có đủ: ngày bay, họ tên, ngày sinh, số giấy
 * tờ, giới tính, điểm bay. Ba nguồn lấy dữ liệu:
 *   1. Khách đặt qua OTA — thư OTA thường kèm sẵn, app trích ra.
 *   2. Khách đặt trên mebayluon.com — trang đặt bắt buộc điền nên luôn đủ.
 *   3. Khách vãng lai đăng ký tại chỗ — nhân viên quầy/phi công thu thập.
 *
 * File này chỉ tính TRẠNG THÁI (đủ/thiếu/trùng), không đụng cơ sở dữ liệu, để
 * giao diện hiện cùng một kết luận với máy chủ, khỏi cãi nhau.
 */

export type InsuredGuest = {
  fullName: string;
  /** "yyyy-mm-dd". */
  birthday: string;
  gender: "nam" | "nu" | "";
  idNumber: string;
  /** "dinhdanh" = số định danh của trẻ chưa có CCCD, do người nhà cung cấp. */
  idType: "cccd" | "passport" | "dinhdanh" | "";
  nationality: string;
  isChild: boolean;
  note: string;
  source: "web" | "ota" | "scan" | "manual" | "";
  cancelled?: boolean;
  /** Đăng ký tên A nhưng người bay thật là B — giữ tên cũ để đối chiếu. */
  replacedName?: string;
};

export function emptyInsured(): InsuredGuest {
  return {
    fullName: "",
    birthday: "",
    gender: "",
    idNumber: "",
    idType: "",
    nationality: "Việt Nam",
    isChild: false,
    note: "",
    source: "manual",
  };
}

/** Bỏ dấu cách thừa, chuẩn hoá ngày và số giấy tờ về dạng so khớp được. */
export function normalizeInsured(raw: Partial<InsuredGuest> | null | undefined): InsuredGuest {
  const g = raw || {};
  const gender = g.gender === "nam" || g.gender === "nu" ? g.gender : "";
  const idType =
    g.idType === "cccd" || g.idType === "passport" || g.idType === "dinhdanh" ? g.idType : "";
  const source =
    g.source === "web" || g.source === "ota" || g.source === "scan" || g.source === "manual" ? g.source : "";
  return {
    fullName: String(g.fullName || "").replace(/\s+/g, " ").trim(),
    birthday: normalizeBirthday(String(g.birthday || "")),
    gender,
    /** Số giấy tờ bỏ hết dấu cách; hộ chiếu có chữ nên viết hoa, không lọc chữ. */
    idNumber: String(g.idNumber || "").replace(/\s+/g, "").toUpperCase(),
    idType,
    nationality: String(g.nationality || "").replace(/\s+/g, " ").trim(),
    isChild: Boolean(g.isChild),
    note: String(g.note || "").trim(),
    source,
    cancelled: Boolean(g.cancelled),
    replacedName: String(g.replacedName || "").trim() || undefined,
  };
}

/**
 * Nhận "dd/mm/yyyy", "dd-mm-yyyy" và "yyyy-mm-dd"; trả về "yyyy-mm-dd".
 * Nhân viên gõ tay quen kiểu ngày trước, bảng bảo hiểm lại cần kiểu năm trước.
 */
export function normalizeBirthday(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "";
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const vn = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(s);
  if (vn) return okDate(vn[3], vn[2], vn[1]);
  /** dd/mm/yy gõ tay: "1/4/88" — năm 2 số đoán như khối liền bên dưới. */
  const vn2 = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/.exec(s);
  if (vn2) return okDate(guessYear(vn2[3]), vn2[2], vn2[1]);
  /**
   * GÕ LIỀN KHÔNG DẤU PHÂN CÁCH (luật chủ 05/09) — quầy nhập bảo hiểm cho cả
   * đoàn, gõ "01041988" hay "010488" phải tự nhận:
   *  - 8 số: ddmmyyyy
   *  - 6 số: ddmmyy — năm 2 số: lớn hơn 2 số cuối của năm nay thì 19yy
   *    (88 → 1988), không thì 20yy (15 → 2015; khách sơ sinh hiếm hơn cụ 100 tuổi)
   */
  const solid8 = /^(\d{2})(\d{2})(\d{4})$/.exec(s);
  if (solid8) return okDate(solid8[3], solid8[2], solid8[1]);
  const solid6 = /^(\d{2})(\d{2})(\d{2})$/.exec(s);
  if (solid6) return okDate(guessYear(solid6[3]), solid6[2], solid6[1]);
  return "";
}

/** Năm 2 số → 4 số: 88 → 1988, 15 → 2015 (mốc = 2 số cuối năm hiện tại). */
function guessYear(yy: string): string {
  const now = new Date().getFullYear();
  const n = Number(yy);
  return String(n > now % 100 ? 1900 + n : 2000 + n);
}

/** Ráp yyyy-mm-dd và LOẠI ngày vô lý (32/13, năm 1899…) — trả "" để ô báo thiếu. */
function okDate(y: string, m: string, d: string): string {
  const yy = Number(y);
  const mm = Number(m);
  const dd = Number(d);
  if (yy < 1900 || yy > new Date().getFullYear()) return "";
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return "";
  return `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/** "1990-01-01" → "01/01/1990" để hiện cho người Việt đọc. */
export function birthdayVN(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || "");
}

export const ID_TYPE_LABEL: Record<NonNullable<InsuredGuest["idType"]>, string> = {
  cccd: "CCCD",
  passport: "Hộ chiếu",
  dinhdanh: "Số định danh",
  "": "—",
};

/**
 * Những trường CÒN THIẾU của một người. Trẻ em được phép không có CCCD nhưng
 * VẪN phải có số định danh — bảo hiểm cần một mã để định danh người được bảo
 * hiểm, không thì lúc bồi thường không biết trả cho ai.
 */
export function missingFields(g: InsuredGuest): string[] {
  const miss: string[] = [];
  if (!g.fullName || g.fullName.split(" ").length < 2) miss.push("họ và tên đầy đủ");
  if (!g.birthday) miss.push("ngày sinh");
  if (!g.gender) miss.push("giới tính");
  if (!g.idNumber) miss.push(g.isChild ? "số định danh" : "số CCCD/hộ chiếu");
  else if (!g.idType) miss.push("loại giấy tờ");
  if (!g.nationality) miss.push("quốc tịch");
  return miss;
}

export type InsuranceState = {
  /** Số người PHẢI có hồ sơ = số khách đang còn bay của booking. */
  need: number;
  /** Số dòng đã điền ĐỦ. */
  ready: number;
  /** Số dòng đang có (kể cả điền dở), không tính dòng đã huỷ. */
  filled: number;
  /** Chỉ số các dòng còn thiếu, kèm tên trường thiếu. */
  missing: Array<{ index: number; fields: string[] }>;
  /** Số giấy tờ bị lặp trong chính booking này. */
  duplicateIds: string[];
  ok: boolean;
};

export function insuranceState(guests: InsuredGuest[] | undefined, guestCount: number): InsuranceState {
  const active = (guests || []).map(normalizeInsured).filter((g) => !g.cancelled);
  const missing: InsuranceState["missing"] = [];
  let ready = 0;
  active.forEach((g, index) => {
    const fields = missingFields(g);
    if (fields.length) missing.push({ index, fields });
    else ready += 1;
  });

  const seen = new Map<string, number>();
  for (const g of active) {
    if (!g.idNumber) continue;
    seen.set(g.idNumber, (seen.get(g.idNumber) || 0) + 1);
  }
  const duplicateIds = [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id);

  return {
    need: Math.max(0, guestCount),
    ready,
    filled: active.length,
    missing,
    duplicateIds,
    ok: guestCount > 0 && ready === guestCount && active.length === guestCount && !duplicateIds.length,
  };
}

/** Câu ngắn hiện trên dòng booking cho nhân viên liếc là biết. */
export function insuranceLabel(st: InsuranceState): string {
  if (st.need === 0) return "Không có khách bay";
  if (st.ok) return `Bảo hiểm ĐỦ ${st.ready}/${st.need} ✓`;
  if (st.duplicateIds.length) return `⚠ Bảo hiểm TRÙNG giấy tờ (${st.duplicateIds.join(", ")})`;
  return `⚠ Thiếu bảo hiểm — mới có ${st.ready}/${st.need} người`;
}

/**
 * Kết quả QUÉT GIẤY TỜ (lib/baobay/id-scan) → một dòng hồ sơ bảo hiểm.
 *
 * Bộ quét trả ngày kiểu "dd/mm/yyyy" và giới tính kiểu "Nam"/"Nữ" vì đó là thứ
 * người đọc; ở đây quy về dạng máy so khớp được.
 */
export function fromScanned(p: {
  fullName: string;
  birthday: string;
  gender: string;
  idNumber: string;
  nationality: string;
  source: "cccd" | "passport";
}): Partial<InsuredGuest> {
  const g = String(p.gender || "").toLowerCase();
  return {
    fullName: p.fullName,
    birthday: normalizeBirthday(p.birthday),
    gender: g.startsWith("na") || g === "m" ? "nam" : g.startsWith("n") || g === "f" ? "nu" : "",
    idNumber: p.idNumber,
    idType: p.source === "passport" ? "passport" : "cccd",
    nationality: p.nationality || "Việt Nam",
    source: "scan",
  };
}

/**
 * Giới tính từ nguồn ngoài về hai giá trị của app.
 *
 * Mỗi nơi ghi một kiểu: web ghi "Nam"/"Nữ", Klook ghi "Female", thư OTA có nơi
 * ghi "Nu" không dấu. Đoán sai giới tính là hồ sơ bảo hiểm sai người.
 */
export function normalizeGenderText(raw: string): "nam" | "nu" | "" {
  const s = String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  if (!s) return "";
  if (s === "m" || s.startsWith("male") || s.startsWith("nam")) return "nam";
  if (s === "f" || s.startsWith("female") || s.startsWith("nu")) return "nu";
  return "";
}
