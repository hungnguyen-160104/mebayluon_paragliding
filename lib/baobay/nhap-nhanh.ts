// lib/baobay/nhap-nhanh.ts
/**
 * NHẬP NHANH NGƯỜI BAY: dán chữ vào, máy tự bóc ra tên, ngày sinh, số giấy tờ,
 * giới tính, cân nặng, số điện thoại, quốc tịch (chủ 13/09).
 *
 * Khách gửi thông tin qua Zalo mỗi người một kiểu. Bắt quầy gõ lại từng ô cho
 * năm người là vừa lâu vừa sai số. Nhận cả hai lối viết hay gặp:
 *
 *  1. MỘT DÒNG MỘT NGƯỜI:
 *       John Nguyễn 8/8/2009 83774747774 Đức
 *  2. CHÙM CÓ NHÃN (mỗi người một khối, cách nhau dòng trống):
 *       Họ và tên: lê Thị Thanh Hiền
 *       Ngày tháng năm sinh: 27/10/1993
 *       Số CMND/CCCD: 074193000106
 *       Cân nặng: 53
 *       Số điện thoại liên lạc: 0393271093
 *       Giới tính: nữ
 *
 * Ngày luôn đọc theo lối Việt Nam: NGÀY/THÁNG/NĂM.
 *
 * Nguyên tắc: THÀ ĐỂ TRỐNG CÒN HƠN ĐOÁN BỪA. Ô nào không chắc thì bỏ trống và
 * ghi vào `canSoat` để người nhập tự điền — sai một số giấy tờ là hỏng cả hồ
 * sơ bảo hiểm.
 */

export type NguoiNhapNhanh = {
  fullName: string;
  /** "dd/mm/yyyy" — dạng người Việt đọc; nơi dùng tự đổi sang yyyy-mm-dd. */
  birthday: string;
  gender: "nam" | "nu" | "";
  idNumber: string;
  idType: "cccd" | "passport" | "dinhdanh" | "";
  nationality: string;
  /** kg — 0 khi không thấy. */
  weight: number;
  phone: string;
  /** Những chỗ máy không chắc, người nhập phải soát lại. */
  canSoat: string[];
};

/** Nhãn hay gặp, viết thế nào cũng nhận (không dấu, viết hoa, thừa dấu hai chấm). */
const NHAN: Array<{ khoa: keyof NguoiNhapNhanh | "bo"; tu: string[] }> = [
  { khoa: "fullName", tu: ["ho va ten", "ho ten", "hoten", "ten khach", "ten", "name", "full name"] },
  { khoa: "birthday", tu: ["ngay thang nam sinh", "ngay sinh", "nam sinh", "sinh ngay", "dob", "birthday", "date of birth"] },
  { khoa: "idNumber", tu: ["so cmnd/cccd", "so cccd/cmnd", "cmnd/cccd", "cccd/cmnd", "so cccd", "so cmnd", "cccd", "cmnd", "can cuoc", "ho chieu", "passport", "so ho chieu", "id"] },
  { khoa: "weight", tu: ["can nang", "cannang", "weight", "kg"] },
  { khoa: "phone", tu: ["so dien thoai lien lac", "so dien thoai", "dien thoai", "sdt", "phone", "tel", "zalo"] },
  { khoa: "gender", tu: ["gioi tinh", "gioitinh", "gender", "sex"] },
  { khoa: "nationality", tu: ["quoc tich", "nationality", "quoc gia"] },
  { khoa: "bo", tu: ["dia chi", "email", "ghi chu", "noi cap", "ngay cap"] },
];

/** Quốc tịch hay gặp ở bãi — dùng để tách chữ "Đức" khỏi tên người. */
const QUOC_TICH: Record<string, string> = {
  "viet nam": "Việt Nam", vietnam: "Việt Nam", vn: "Việt Nam", "việt nam": "Việt Nam",
  duc: "Đức", germany: "Đức", german: "Đức",
  my: "Mỹ", usa: "Mỹ", american: "Mỹ", "hoa ky": "Mỹ",
  anh: "Anh", uk: "Anh", england: "Anh", british: "Anh",
  phap: "Pháp", france: "Pháp", french: "Pháp",
  uc: "Úc", australia: "Úc",
  nga: "Nga", russia: "Nga",
  "han quoc": "Hàn Quốc", korea: "Hàn Quốc",
  "nhat ban": "Nhật Bản", nhat: "Nhật Bản", japan: "Nhật Bản",
  "trung quoc": "Trung Quốc", china: "Trung Quốc",
  "dai loan": "Đài Loan", taiwan: "Đài Loan",
  "thai lan": "Thái Lan", thailand: "Thái Lan",
  "an do": "Ấn Độ", india: "Ấn Độ",
  canada: "Canada", "ha lan": "Hà Lan", netherlands: "Hà Lan",
  "tay ban nha": "Tây Ban Nha", spain: "Tây Ban Nha",
  italia: "Ý", italy: "Ý", y: "Ý",
  "singapore": "Singapore", malaysia: "Malaysia", indonesia: "Indonesia", philippines: "Philippines",
};

function boDau(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

/** "8/8/2009", "27-10-1993", "27.10.1993", "2009/08/08" → "dd/mm/yyyy" (rỗng nếu vô lý). */
export function chuanNgaySinh(raw: string): string {
  const m = String(raw).match(/(\d{1,4})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{1,4})/);
  if (!m) return "";
  let d = Number(m[1]);
  let th = Number(m[2]);
  let n = Number(m[3]);
  /** Viết kiểu yyyy-mm-dd thì đảo lại — số đầu bốn chữ số chỉ có thể là năm. */
  if (m[1].length === 4) {
    const tmp = d;
    d = n;
    n = tmp;
  }
  if (n < 100) n += n > 30 ? 1900 : 2000;
  /** Ngày > 12 mà tháng ≤ 12 thì chắc chắn là ngày/tháng; ngược lại thì người ta viết kiểu Mỹ. */
  if (d <= 12 && th > 12) {
    const tmp = d;
    d = th;
    th = tmp;
  }
  const nay = new Date().getFullYear();
  if (d < 1 || d > 31 || th < 1 || th > 12 || n < 1900 || n > nay) return "";
  return `${String(d).padStart(2, "0")}/${String(th).padStart(2, "0")}/${n}`;
}

function docGioiTinh(raw: string): "nam" | "nu" | "" {
  const s = boDau(raw);
  if (/\b(nu|female|f|woman|girl|ba|chi)\b/.test(s)) return "nu";
  if (/\b(nam|male|m|man|boy|ong|anh)\b/.test(s)) return "nam";
  return "";
}

/** Số điện thoại Việt Nam: 10 số bắt đầu 0, hoặc +84… */
function laSoDienThoai(so: string): boolean {
  const d = so.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("84")) return true;
  return d.length === 10 && d.startsWith("0");
}

/** CCCD 12 số · CMND 9 số · hộ chiếu 1–2 chữ + 6–8 số. */
function doanLoaiGiayTo(so: string): "cccd" | "passport" | "dinhdanh" | "" {
  const s = so.trim().toUpperCase();
  if (/^\d{12}$/.test(s)) return "cccd";
  if (/^\d{9}$/.test(s)) return "cccd";
  if (/^[A-Z]{1,2}\d{6,8}$/.test(s)) return "passport";
  if (/^\d{8,13}$/.test(s)) return "dinhdanh";
  return "";
}

/** Cắt chữ dán vào thành từng KHỐI — mỗi khối một người. */
function tachKhoi(text: string): string[] {
  const dong = String(text || "")
    .split(/\r?\n/)
    .map((d) => d.trim())
    .filter(Boolean);
  if (!dong.length) return [];

  /** Có nhãn "họ và tên" thì mỗi lần gặp nhãn ấy là sang người mới. */
  const laNhanTen = (d: string) => /^(ho\s*(va)?\s*ten|hoten|ten\s*khach|full\s*name|name)\s*[:：]/.test(boDau(d));
  if (dong.some(laNhanTen)) {
    const khoi: string[] = [];
    let cur: string[] = [];
    for (const d of dong) {
      if (laNhanTen(d) && cur.length) {
        khoi.push(cur.join("\n"));
        cur = [];
      }
      cur.push(d);
    }
    if (cur.length) khoi.push(cur.join("\n"));
    return khoi;
  }

  /** Không nhãn: một dòng một người. */
  return dong;
}

/** Bóc một khối chữ thành một người. */
function docMotNguoi(khoi: string): NguoiNhapNhanh | null {
  const ra: NguoiNhapNhanh = {
    fullName: "", birthday: "", gender: "", idNumber: "", idType: "", nationality: "", weight: 0, phone: "", canSoat: [],
  };
  /** Phần chữ chưa bị nhãn nào "nhận" — cuối cùng dùng để đoán tên. */
  const conLai: string[] = [];

  for (const dong of khoi.split(/\r?\n/)) {
    const m = dong.match(/^([^:：]{2,40})[:：]\s*(.*)$/);
    if (m) {
      const nhan = boDau(m[1]);
      const gt = m[2].trim();
      const hit = NHAN.find((n) => n.tu.some((t) => nhan === t || nhan.startsWith(t) || nhan.endsWith(t)));
      if (hit) {
        if (hit.khoa === "bo") continue;
        if (hit.khoa === "fullName") ra.fullName = gt;
        else if (hit.khoa === "birthday") ra.birthday = chuanNgaySinh(gt);
        else if (hit.khoa === "idNumber") ra.idNumber = gt.replace(/\s+/g, "").toUpperCase();
        else if (hit.khoa === "weight") ra.weight = Math.round(Number(gt.replace(/[^\d.]/g, "")) || 0);
        else if (hit.khoa === "phone") ra.phone = gt.replace(/[^\d+]/g, "");
        else if (hit.khoa === "gender") ra.gender = docGioiTinh(gt);
        else if (hit.khoa === "nationality") ra.nationality = QUOC_TICH[boDau(gt)] ?? gt;
        continue;
      }
    }
    conLai.push(dong);
  }

  /** Dòng không nhãn: bóc theo DẠNG của từng mảnh. */
  let tho = conLai.join(" ");
  if (tho.trim()) {
    /** Ngày sinh trước — nó chứa dấu / dễ lẫn với thứ khác. */
    if (!ra.birthday) {
      const mNgay = tho.match(/\d{1,4}\s*[/\-.]\s*\d{1,2}\s*[/\-.]\s*\d{1,4}/);
      if (mNgay) {
        ra.birthday = chuanNgaySinh(mNgay[0]);
        tho = tho.replace(mNgay[0], " ");
      }
    }
    /** Cân nặng chỉ nhận khi có chữ "kg" — số trần 2–3 chữ số quá dễ lẫn. */
    if (!ra.weight) {
      const mKg = tho.match(/(\d{2,3})\s*kg\b/i);
      if (mKg) {
        ra.weight = Number(mKg[1]);
        tho = tho.replace(mKg[0], " ");
      }
    }
    /** Các dãy số / mã giấy tờ còn lại. */
    for (const m of [...tho.matchAll(/[A-Za-z]{0,2}\d{6,13}/g)]) {
      const so = m[0];
      if (!ra.phone && laSoDienThoai(so)) {
        ra.phone = so.replace(/\D/g, "");
        tho = tho.replace(so, " ");
        continue;
      }
      if (!ra.idNumber) {
        const loai = doanLoaiGiayTo(so);
        if (loai) {
          ra.idNumber = so.toUpperCase();
          ra.idType = loai;
          tho = tho.replace(so, " ");
        }
      }
    }
    /** Giới tính viết lẫn trong câu. */
    if (!ra.gender) {
      const g = docGioiTinh(tho);
      if (g) {
        ra.gender = g;
        tho = tho.replace(/\b(nam|nữ|nu|female|male)\b/i, " ");
      }
    }
    /** Quốc tịch: so từng cụm 1–2 chữ với danh sách. */
    if (!ra.nationality) {
      const tu = tho.split(/\s+/).filter(Boolean);
      for (let i = tu.length - 1; i >= 0; i--) {
        const doi = i > 0 ? boDau(`${tu[i - 1]} ${tu[i]}`) : "";
        const don = boDau(tu[i]);
        if (doi && QUOC_TICH[doi]) {
          ra.nationality = QUOC_TICH[doi];
          tu.splice(i - 1, 2);
          break;
        }
        if (QUOC_TICH[don]) {
          ra.nationality = QUOC_TICH[don];
          tu.splice(i, 1);
          break;
        }
      }
      tho = tu.join(" ");
    }
    /** Còn lại toàn chữ cái thì đó là TÊN. */
    if (!ra.fullName) {
      const ten = tho
        .replace(/[^\p{L}\s'.-]/gu, " ")
        .split(/\s+/)
        .filter((x) => x.length > 0)
        .join(" ")
        .trim();
      if (ten.length >= 2) ra.fullName = ten;
    }
  }

  if (!ra.fullName && !ra.idNumber && !ra.birthday) return null;

  /** Chuẩn hoá cuối + điểm danh chỗ còn thiếu. */
  ra.fullName = ra.fullName.replace(/\s+/g, " ").trim();
  if (ra.idNumber && !ra.idType) ra.idType = doanLoaiGiayTo(ra.idNumber) || "";
  if (!ra.fullName) ra.canSoat.push("chưa đọc được TÊN");
  if (!ra.birthday) ra.canSoat.push("chưa đọc được NGÀY SINH");
  if (!ra.idNumber) ra.canSoat.push("chưa đọc được SỐ GIẤY TỜ");
  if (!ra.gender) ra.canSoat.push("chưa rõ giới tính");
  if (ra.idNumber && ra.idType === "dinhdanh") ra.canSoat.push("số giấy tờ không đúng dạng CCCD (12 số) hay hộ chiếu — soát lại");
  return ra;
}

/** Bóc cả đoạn chữ thành danh sách người. */
export function docNhapNhanh(text: string): NguoiNhapNhanh[] {
  return tachKhoi(text)
    .map(docMotNguoi)
    .filter((x): x is NguoiNhapNhanh => x !== null);
}

/** "dd/mm/yyyy" → "yyyy-mm-dd" cho ô ngày của form. */
export function sangNgayIso(ddmmyyyy: string): string {
  const m = String(ddmmyyyy).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
}
