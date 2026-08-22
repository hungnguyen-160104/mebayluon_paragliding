// lib/baobay/id-scan.ts

/**
 * Bóc thông tin nhân thân từ CCCD và HỘ CHIẾU để làm bảo hiểm bay.
 *
 * Hai nguồn dữ liệu hoàn toàn khác nhau:
 *
 *  - CCCD gắn chip: mã QR mặt trước chứa sẵn chữ, tách theo dấu "|" là xong —
 *    không đoán chữ nên gần như không sai.
 *  - Hộ chiếu: hai dòng MRZ ở đáy trang, phải OCR rồi tự sửa. MRZ có SỐ KIỂM TRA
 *    nên đọc sai là biết ngay, không âm thầm ghi sai số hộ chiếu của khách.
 *
 * Tệp này thuần logic (không đụng camera, không đụng OCR) để chạy thử được.
 */

export type ScannedPerson = {
  fullName: string;
  /** "dd/mm/yyyy" — dạng người Việt đọc, dán thẳng vào form bảo hiểm. */
  birthday: string;
  gender: string;
  /** Số CCCD hoặc số hộ chiếu. */
  idNumber: string;
  nationality: string;
  /** Nguồn đọc được, để biết còn phải soát lại kỹ tới đâu. */
  source: "cccd" | "passport";
  /** Cảnh báo cho người nhập (số kiểm tra sai, thiếu trường…). */
  warnings: string[];
};

/* ================================================================== */
/* CCCD gắn chip — mã QR mặt trước                                     */
/* ================================================================== */

/**
 * Chuỗi trong QR: số CCCD | số CMND cũ | họ tên | ddmmyyyy | giới tính |
 *                 địa chỉ | ngày cấp
 * Một số thẻ chỉ có 6 trường (thiếu CMND cũ) nên phải dò theo dạng dữ liệu chứ
 * không đếm cứng vị trí.
 */
export function parseCccdQr(raw: string): ScannedPerson | null {
  const text = String(raw ?? "").trim();
  if (!text.includes("|")) return null;

  const parts = text.split("|").map((p) => p.trim());
  if (parts.length < 4) return null;

  const idNumber = parts.find((p) => /^\d{9,12}$/.test(p)) ?? "";
  const dateIdx = parts.findIndex((p) => /^\d{8}$/.test(p));
  if (!idNumber || dateIdx < 0) return null;

  const warnings: string[] = [];
  const fullName = parts[dateIdx - 1] ?? "";
  const gender = normalizeGender(parts[dateIdx + 1] ?? "");
  if (!fullName) warnings.push("Không đọc được họ tên trong mã QR");

  return {
    fullName: fullName.toUpperCase(),
    birthday: ddmmyyyy(parts[dateIdx]),
    gender,
    idNumber,
    nationality: "Việt Nam",
    source: "cccd",
    warnings,
  };
}

function ddmmyyyy(raw: string): string {
  const m = /^(\d{2})(\d{2})(\d{4})$/.exec(raw);
  return m ? `${m[1]}/${m[2]}/${m[3]}` : "";
}

function normalizeGender(raw: string): string {
  const v = raw.toLowerCase();
  if (v.startsWith("na") || v === "m") return "Nam";
  if (v.startsWith("n") || v === "f") return "Nữ";
  return raw;
}

/* ================================================================== */
/* Hộ chiếu — hai dòng MRZ (chuẩn ICAO 9303, loại TD3 44 ký tự)        */
/* ================================================================== */

/** Chữ hay bị OCR đọc nhầm ở vùng CHỈ CÓ SỐ và ngược lại. */
const TO_DIGIT: Record<string, string> = { O: "0", Q: "0", D: "0", I: "1", L: "1", Z: "2", S: "5", B: "8", G: "6" };
const TO_ALPHA: Record<string, string> = { "0": "O", "1": "I", "2": "Z", "5": "S", "8": "B", "6": "G" };

const digitsOnly = (s: string) => s.replace(/./g, (c) => TO_DIGIT[c] ?? c);
const alphaOnly = (s: string) => s.replace(/./g, (c) => TO_ALPHA[c] ?? c);

/** Số kiểm tra của ICAO: trọng số 7-3-1, chữ tính từ A=10. */
function icaoCheck(value: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < value.length; i += 1) {
    const c = value[i];
    let v = 0;
    if (c >= "0" && c <= "9") v = Number(c);
    else if (c >= "A" && c <= "Z") v = c.charCodeAt(0) - 55;
    else v = 0; // "<" = 0
    sum += v * weights[i % 3];
  }
  return sum % 10;
}

/** Đổi mã quốc gia 3 chữ của ICAO sang tên nước quen dùng. */
const COUNTRY: Record<string, string> = {
  VNM: "Việt Nam",
  KOR: "Hàn Quốc",
  JPN: "Nhật Bản",
  CHN: "Trung Quốc",
  TWN: "Đài Loan",
  THA: "Thái Lan",
  MYS: "Malaysia",
  SGP: "Singapore",
  IDN: "Indonesia",
  PHL: "Philippines",
  IND: "Ấn Độ",
  USA: "Hoa Kỳ",
  CAN: "Canada",
  GBR: "Anh",
  FRA: "Pháp",
  DEU: "Đức",
  ESP: "Tây Ban Nha",
  ITA: "Ý",
  NLD: "Hà Lan",
  RUS: "Nga",
  AUS: "Úc",
  NZL: "New Zealand",
  ISR: "Israel",
  CHE: "Thuỵ Sĩ",
  SWE: "Thuỵ Điển",
  DNK: "Đan Mạch",
  NOR: "Na Uy",
  POL: "Ba Lan",
  CZE: "Séc",
  BEL: "Bỉ",
  AUT: "Áo",
  PRT: "Bồ Đào Nha",
  BRA: "Brazil",
  MEX: "Mexico",
  ZAF: "Nam Phi",
  UKR: "Ukraina",
  TUR: "Thổ Nhĩ Kỳ",
  KHM: "Campuchia",
  LAO: "Lào",
  MMR: "Myanmar",
};

export function countryName(code: string): string {
  return COUNTRY[code] ?? code;
}

/**
 * Năm hai chữ số của MRZ: "89" là 1989 hay 2089? Quy ước dùng cho NGÀY SINH —
 * mốc là năm nay: quá năm nay thì chắc chắn thuộc thế kỷ trước.
 */
function birthYear(yy: number, thisYear = new Date().getFullYear()): number {
  const short = thisYear % 100;
  return yy > short ? 1900 + yy : 2000 + yy;
}

/**
 * MẶT SAU CCCD GẮN CHIP — ba dòng chữ máy 30 ký tự (chuẩn ICAO 9303 loại TD1).
 *
 * Vì sao cần: mã QR mặt trước in nhỏ, mờ dần theo thời gian, gặp ánh sáng chéo
 * là trượt — đó là lý do quét mười thẻ ra được vài. Dãy MRZ mặt sau in bằng
 * phông riêng cho máy đọc và có SỐ KIỂM TRA, nên đọc chữ ở đó vừa nhạy hơn vừa
 * tự biết mình đọc sai.
 *
 *   dòng 1: I D V N M <9 số đầu><kt><3 số cuối của CCCD 12 số>…
 *   dòng 2: <ngày sinh 6><kt><giới tính><hạn 6><kt><quốc tịch 3>…
 *   dòng 3: HỌ<<TÊN ĐỆM<TÊN
 */
function parseMrzTd1(lines: string[]): ScannedPerson | null {
  const pad = (s: string) => s.padEnd(30, "<").slice(0, 30);
  const [l1, l2, l3] = [pad(lines[0]), pad(lines[1]), pad(lines[2])];

  const warnings: string[] = [];

  /**
   * Số CCCD Việt Nam có 12 chữ số, dài hơn ô "số giấy tờ" 9 ký tự của TD1 nên
   * ba số cuối tràn sang ô DỮ LIỆU TUỲ CHỌN ngay sau đó.
   *
   * Giữa hai phần còn chen một SỐ KIỂM TRA (vị trí 14). Gom hết chữ số của cả
   * dòng rồi lấy 12 số đầu là nuốt luôn số kiểm tra vào giữa, ra một số CCCD
   * sai một chữ — kiểu sai nguy hiểm nhất vì trông vẫn đủ 12 số.
   */
  const docNo = digitsOnly(l1.slice(5, 14)).replace(/\D/g, "");
  const docCheck = digitsOnly(l1.slice(14, 15));
  const tail = digitsOnly(l1.slice(15)).replace(/\D/g, "");
  const idNumber = (docNo + tail).slice(0, 12);
  if (docNo.length === 9 && String(icaoCheck(l1.slice(5, 14))) !== docCheck) {
    warnings.push("Số CCCD đọc chưa chắc đúng — soát lại giúp");
  }

  const dob = digitsOnly(l2.slice(0, 6));
  const dobCheck = digitsOnly(l2.slice(6, 7));
  const sex = l2.slice(7, 8);
  const nation = alphaOnly(l2.slice(15, 18));

  const clean = (x: string) => x.replace(/</g, " ").replace(/\s+/g, " ").trim();
  const [surname, given = ""] = l3.split("<<");
  const fullName = `${clean(surname)} ${clean(given)}`.replace(/\s+/g, " ").trim();

  if (String(icaoCheck(dob)) !== dobCheck) warnings.push("Ngày sinh đọc chưa chắc đúng — soát lại giúp");

  /** Rác thì THÀ KHÔNG ĐỌC ĐƯỢC còn hơn bóc ra dữ liệu sai. */
  if (!fullName || idNumber.length < 9 || !/^\d{6}$/.test(dob)) return null;

  const yy = Number(dob.slice(0, 2));
  return {
    fullName,
    birthday: `${dob.slice(4, 6)}/${dob.slice(2, 4)}/${birthYear(yy)}`,
    gender: sex === "M" ? "Nam" : sex === "F" ? "Nữ" : "",
    idNumber,
    nationality: countryName(nation) || "Việt Nam",
    source: "cccd",
    warnings,
  };
}

/**
 * Bóc dãy MRZ. Nhận cả chuỗi OCR nhiều dòng lẫn dính liền:
 *   - hộ chiếu TD3: hai dòng 44 ký tự, dòng đầu bắt đầu bằng "P";
 *   - mặt sau CCCD TD1: ba dòng 30 ký tự, dòng đầu bắt đầu bằng "I".
 */
export function parseMrz(rawText: string): ScannedPerson | null {
  const cleaned = String(rawText ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9<\n]/g, "");
  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 28);

  /** TD1 (mặt sau CCCD): ba dòng ~30 ký tự, dòng đầu bắt đầu bằng I/ID. */
  {
    const short = lines.filter((l) => l.length >= 28 && l.length <= 36);
    const start = short.findIndex((l) => l.startsWith("I"));
    if (start >= 0 && short.length >= start + 3) {
      const hit = parseMrzTd1(short.slice(start, start + 3));
      if (hit) return hit;
    }
  }

  let l1 = lines.find((l) => l.startsWith("P"));
  let l2 = l1 ? lines[lines.indexOf(l1) + 1] : undefined;

  // OCR đôi khi trả một khối liền: cắt theo 44 ký tự
  if ((!l1 || !l2) && cleaned.replace(/\n/g, "").length >= 88) {
    const flat = cleaned.replace(/\n/g, "");
    const start = flat.indexOf("P");
    if (start >= 0 && flat.length >= start + 88) {
      l1 = flat.slice(start, start + 44);
      l2 = flat.slice(start + 44, start + 88);
    }
  }
  if (!l1 || !l2) return null;

  const pad = (s: string) => s.padEnd(44, "<").slice(0, 44);
  l1 = pad(l1);
  l2 = pad(l2);

  const warnings: string[] = [];

  // Dòng 1: P<QUỐCTỊCH<HỌ<<TÊN ĐỆM TÊN
  const nation = alphaOnly(l1.slice(2, 5));
  const nameField = l1.slice(5);
  const [surnameRaw, givenRaw = ""] = nameField.split("<<");
  const clean = (s: string) => s.replace(/</g, " ").replace(/\s+/g, " ").trim();
  const fullName = `${clean(surnameRaw)} ${clean(givenRaw)}`.replace(/\s+/g, " ").trim();
  if (!fullName) warnings.push("Không đọc được họ tên trên dòng MRZ");

  // Dòng 2: sốHC(9) kt(1) quốctịch(3) ngàysinh(6) kt(1) giớitính(1) hạn(6) kt(1)…
  const passportNo = l2.slice(0, 9).replace(/</g, "");
  const passportCheck = digitsOnly(l2.slice(9, 10));
  const nationality2 = alphaOnly(l2.slice(10, 13));
  const dob = digitsOnly(l2.slice(13, 19));
  const dobCheck = digitsOnly(l2.slice(19, 20));
  const sex = l2.slice(20, 21);

  if (String(icaoCheck(l2.slice(0, 9))) !== passportCheck) {
    warnings.push("Số hộ chiếu đọc chưa chắc đúng — soát lại giúp");
  }
  if (String(icaoCheck(dob)) !== dobCheck) {
    warnings.push("Ngày sinh đọc chưa chắc đúng — soát lại giúp");
  }

  /**
   * Chốt cửa: OCR trả rác thì THÀ KHÔNG ĐỌC ĐƯỢC còn hơn bóc ra dữ liệu sai.
   * Hai số kiểm tra sai cả hai + tên trống là dấu hiệu rác — trả null để giao
   * diện nói "chụp lại" thay vì điền tên khách bằng chữ vô nghĩa.
   */
  const bothChecksFailed =
    String(icaoCheck(l2.slice(0, 9))) !== passportCheck && String(icaoCheck(dob)) !== dobCheck;
  if (bothChecksFailed || !fullName || passportNo.length < 6 || !/^\d{6}$/.test(dob)) return null;

  const yy = Number(dob.slice(0, 2));
  const mm = dob.slice(2, 4);
  const dd = dob.slice(4, 6);
  const birthday = /^\d{6}$/.test(dob) ? `${dd}/${mm}/${birthYear(yy)}` : "";
  if (!birthday) warnings.push("Không đọc được ngày sinh");

  return {
    fullName,
    birthday,
    gender: sex === "M" ? "Nam" : sex === "F" ? "Nữ" : "",
    idNumber: passportNo,
    nationality: countryName(nationality2 || nation),
    source: "passport",
    warnings,
  };
}

/** Thử CCCD trước (chắc chắn hơn), không được thì thử MRZ hộ chiếu. */
export function parseIdText(raw: string): ScannedPerson | null {
  return parseCccdQr(raw) ?? parseMrz(raw);
}
