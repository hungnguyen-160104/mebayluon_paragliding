// lib/baobay/thoi-tiet.ts

/**
 * THỜI TIẾT ĐIỂM BAY — phần tính thuần, không chạm mạng và không chạm cơ sở dữ liệu.
 *
 * Chia đôi như vậy để CHẤM MÀU kiểm được bằng phép thử: đưa vào một mảng giờ,
 * nhận ra xanh / vàng / đỏ. Phần gọi Open-Meteo và lưu Mongo nằm ở service.
 *
 * VÌ SAO KHÔNG ĐÓNG CỨNG NGƯỠNG: chủ điểm bay quyết định bay hay nghỉ bằng kinh
 * nghiệm tại chỗ, không bằng một con số trong sách. Nên máy chỉ giữ một bộ
 * ngưỡng KHỞI ĐIỂM, còn mỗi lần chủ chấm "hôm nay bay tốt / hạn chế / nghỉ"
 * thì `hocNguong()` dò lại ngưỡng nào chia đúng nhất những ngày đã chấm — càng
 * chấm nhiều, con số càng giống cách người thật nhìn trời.
 */

import { normalizeSpot, type SpotId } from "./spots";

/* ================================================================== */
/* Toạ độ điểm bay                                                     */
/* ================================================================== */

export type ToaDoDiemBay = {
  lat: number;
  lon: number;
  /** Độ cao chỗ cất cánh (m) — để đối chiếu với độ cao mô hình khí tượng. */
  alt?: number;
  /** Tên chỗ cất cánh, hiện trên thẻ để biết đang xem đúng chỗ hay không. */
  ten: string;
  /**
   * Cung hướng gió THUẬN cho cất cánh, tính theo độ (0 = bắc, 90 = đông).
   * `[từ, đến]` đi theo chiều kim đồng hồ, cho phép vắt qua mốc 0 ([315, 45]).
   * Chưa đặt thì máy không chấm hướng — chỉ nhìn tốc độ và mưa.
   */
  huongThuan?: [number, number];
};

/**
 * TOẠ ĐỘ TẠM, tra theo bản đồ — chủ điểm bay sửa lại trong trang cài đặt cho
 * đúng chỗ cất cánh thật.
 *
 * Sai vài trăm mét ở đồng bằng thì không đổi gì, nhưng ở núi thì đổi hẳn: mô
 * hình khí tượng chia ô ~9km và lấy độ cao trung bình của ô, nên đứng đỉnh đèo
 * hay đứng dưới thung lũng ra hai kiểu gió khác nhau.
 */
export const TOA_DO_MAC_DINH: Record<SpotId, ToaDoDiemBay> = {
  "khau-pha": { lat: 21.7546, lon: 104.1279, alt: 1200, ten: "Đèo Khau Phạ (Mù Cang Chải)" },
  sapa: { lat: 22.3364, lon: 103.8438, alt: 1500, ten: "Sa Pa (Lào Cai)" },
  "ha-noi": { lat: 20.8386, lon: 105.5561, alt: 833, ten: "Đồi Bù (Chương Mỹ)" },
};

export function toaDoDiemBay(spot: string, luu?: Partial<ToaDoDiemBay> | null): ToaDoDiemBay {
  const goc = TOA_DO_MAC_DINH[normalizeSpot(spot)];
  if (!luu) return goc;
  return {
    lat: Number.isFinite(luu.lat) ? Number(luu.lat) : goc.lat,
    lon: Number.isFinite(luu.lon) ? Number(luu.lon) : goc.lon,
    alt: Number.isFinite(luu.alt as number) ? Number(luu.alt) : goc.alt,
    ten: luu.ten?.trim() || goc.ten,
    huongThuan: luu.huongThuan ?? goc.huongThuan,
  };
}

/* ================================================================== */
/* Ngưỡng an toàn                                                      */
/* ================================================================== */

export type NguongBay = {
  /** Gió trung bình (km/h) còn được coi là ĐẸP. */
  gioXanh: number;
  /** Trên mức này là CẤM — giữa hai mức là vàng, cân nhắc. */
  gioDo: number;
  /** Gió giật (km/h) vượt mức này là cấm, dù gió trung bình còn thấp. */
  giatDo: number;
  /** Mưa trong giờ (mm) vượt mức này là cấm. */
  muaDo: number;
};

/**
 * NGƯỠNG KHỞI ĐIỂM cho dù lượn đôi (chở khách).
 *
 * Lấy mức phổ biến của tandem thương mại chứ không lấy mức bay solo: chở khách
 * thì cánh nặng hơn, cất cánh chậm hơn, và người ngồi trước không biết cách
 * xử lý khi dù bị gấp. Đây chỉ là chỗ BẮT ĐẦU — số thật do chủ chấm dần.
 */
export const NGUONG_MAC_DINH: NguongBay = { gioXanh: 15, gioDo: 25, giatDo: 35, muaDo: 0.5 };

export function nguongCuaDiem(luu?: Partial<NguongBay> | null): NguongBay {
  const n = { ...NGUONG_MAC_DINH };
  if (!luu) return n;
  for (const k of ["gioXanh", "gioDo", "giatDo", "muaDo"] as const) {
    const v = Number(luu[k]);
    if (Number.isFinite(v) && v > 0) n[k] = v;
  }
  /** Xanh không được cao hơn đỏ — gõ nhầm thì đảo lại còn hơn chấm bậy. */
  if (n.gioXanh > n.gioDo) [n.gioXanh, n.gioDo] = [n.gioDo, n.gioXanh];
  return n;
}

/* ================================================================== */
/* Chấm màu từng giờ                                                   */
/* ================================================================== */

export type GioThoiTiet = {
  /** "YYYY-MM-DDTHH:mm" giờ Việt Nam. */
  gio: string;
  /** Gió trung bình ở độ cao 10m, km/h. */
  gio10m: number;
  giat: number;
  /** Hướng gió THỔI TỚI TỪ đâu, độ (0 = từ bắc). */
  huong: number;
  mua: number;
  may: number;
  nhietDo: number;
};

export type MucDo = "xanh" | "vang" | "do";

export type ChamGio = {
  muc: MucDo;
  /** Vì sao ra màu đó — hiện thẳng trên ô để người trực khỏi phải đoán. */
  lyDo: string[];
};

/** Hướng gió có nằm trong cung thuận không (cung cho phép vắt qua mốc bắc). */
export function huongThuanLoi(huong: number, cung?: [number, number]): boolean {
  if (!cung) return true;
  const [tu, den] = cung;
  const h = ((huong % 360) + 360) % 360;
  return tu <= den ? h >= tu && h <= den : h >= tu || h <= den;
}

const HUONG_CHU = ["B", "BĐB", "ĐB", "ĐĐB", "Đ", "ĐĐN", "ĐN", "NĐN", "N", "NTN", "TN", "TTN", "T", "TTB", "TB", "BTB"];

/** 135° → "ĐN" — người trực đọc chữ nhanh hơn đọc số độ. */
export function huongChu(do_: number): string {
  const h = ((do_ % 360) + 360) % 360;
  return HUONG_CHU[Math.round(h / 22.5) % 16];
}

/**
 * CHẤM MÀU MỘT GIỜ.
 *
 * Thứ tự xét quan trọng: xét ĐỎ trước rồi mới tới vàng, và mỗi lý do đều ghi
 * lại. Một giờ có thể đỏ vì nhiều thứ cùng lúc (gió mạnh + mưa) — hiện đủ thì
 * người đọc biết trời hôm đó hỏng vì cái gì, chứ không chỉ thấy một ô đỏ.
 */
export function chamGio(g: GioThoiTiet, nguong: NguongBay, huongThuan?: [number, number]): ChamGio {
  const lyDo: string[] = [];
  let muc: MucDo = "xanh";
  const len = (m: MucDo) => {
    if (m === "do" || (m === "vang" && muc === "xanh")) muc = m;
  };

  if (g.gio10m > nguong.gioDo) {
    lyDo.push(`gió ${Math.round(g.gio10m)} km/h vượt ngưỡng ${nguong.gioDo}`);
    len("do");
  } else if (g.gio10m > nguong.gioXanh) {
    lyDo.push(`gió ${Math.round(g.gio10m)} km/h — cân nhắc`);
    len("vang");
  }

  if (g.giat > nguong.giatDo) {
    lyDo.push(`giật ${Math.round(g.giat)} km/h vượt ngưỡng ${nguong.giatDo}`);
    len("do");
  } else if (g.giat > nguong.giatDo * 0.8) {
    lyDo.push(`giật ${Math.round(g.giat)} km/h — gần ngưỡng`);
    len("vang");
  }

  /**
   * CHÊNH GIÓ GIẬT là dấu hiệu trời RỐI, không phải trời mạnh.
   *
   * Gió trung bình 12 km/h mà giật 30 km/h nghĩa là từng đợt ập tới rồi tắt —
   * đúng kiểu làm dù gấp cánh lúc cất cánh. Chỉ nhìn con số trung bình thì ô
   * này xanh mướt, nên phải xét riêng phần chênh.
   */
  const chenh = g.giat - g.gio10m;
  /**
   * Mốc nới rộng có chủ ý. Mô hình chia ô ~25km và lấy độ cao trung bình, nên
   * ở núi nó gần như luôn báo giật gấp ba gió trung bình — bắt chặt thì Khau
   * Phạ đỏ quanh năm, mà cảnh báo lúc nào cũng đỏ thì người trực bỏ qua hết,
   * hỏng đúng cái việc nó sinh ra để làm. Chỉ gọi là RỐI khi chênh vừa lớn
   * tuyệt đối vừa đủ mạnh để làm gấp cánh (giật qua 70% ngưỡng cấm).
   */
  if (chenh > 25 && g.giat > nguong.giatDo * 0.7) {
    lyDo.push(`gió rối: giật hơn trung bình ${Math.round(chenh)} km/h`);
    len("do");
  } else if (chenh > 15) {
    lyDo.push("gió không đều");
    len("vang");
  }

  if (g.mua > nguong.muaDo) {
    lyDo.push(`mưa ${g.mua.toFixed(1)} mm`);
    len("do");
  } else if (g.mua > 0.1) {
    lyDo.push("mưa lác đác");
    len("vang");
  }

  if (!huongThuanLoi(g.huong, huongThuan)) {
    lyDo.push(`gió hướng ${huongChu(g.huong)} — ngược sườn cất cánh`);
    len("do");
  }

  if (!lyDo.length) lyDo.push(`gió ${Math.round(g.gio10m)} km/h ${huongChu(g.huong)} — đẹp`);
  return { muc, lyDo };
}

/* ================================================================== */
/* Tổng hợp một ngày                                                   */
/* ================================================================== */

/** Khung giờ THẬT SỰ bay: ngoài khoảng này trời thế nào cũng không dùng tới. */
export const GIO_BAY_TU = 7;
export const GIO_BAY_DEN = 17;

export type NgayThoiTiet = {
  /** "YYYY-MM-DD". */
  ngay: string;
  muc: MucDo;
  /** Số giờ bay được (xanh) trong khung giờ bay. */
  gioXanh: number;
  gioVang: number;
  gioDo: number;
  /** Khoảng giờ đẹp nhất trong ngày, ví dụ "08:00–11:00". */
  khungDep: string | null;
  gioMax: number;
  giatMax: number;
  muaTong: number;
  nhietMin: number;
  nhietMax: number;
  gio: Array<GioThoiTiet & ChamGio>;
};

/**
 * GỘP CÁC GIỜ THÀNH MỘT NGÀY.
 *
 * Màu của ngày lấy theo CHỖ TỐT NHẤT chứ không theo trung bình: sáng đẹp chiều
 * gió thì vẫn là ngày bay được, chỉ bay buổi sáng. Lấy trung bình thì ngày ấy
 * ra vàng, người đọc tưởng cả ngày dở và huỷ khách oan.
 */
export function gopNgay(ngay: string, gio: Array<GioThoiTiet & ChamGio>): NgayThoiTiet {
  const trongKhung = gio.filter((g) => {
    const h = Number(g.gio.slice(11, 13));
    return h >= GIO_BAY_TU && h <= GIO_BAY_DEN;
  });
  const dem = (m: MucDo) => trongKhung.filter((g) => g.muc === m).length;

  /** Dải giờ xanh DÀI NHẤT — một giờ đẹp lẻ loi giữa ngày gió thì không đáng gọi khách. */
  let dai = { tu: -1, den: -1, len: 0 };
  let dau = -1;
  trongKhung.forEach((g, i) => {
    if (g.muc === "xanh") {
      if (dau < 0) dau = i;
      const len = i - dau + 1;
      if (len > dai.len) dai = { tu: dau, den: i, len };
    } else dau = -1;
  });

  const so = (f: (g: GioThoiTiet) => number, gop: (a: number[]) => number, mac = 0) =>
    trongKhung.length ? gop(trongKhung.map(f)) : mac;

  return {
    ngay,
    muc: dem("xanh") > 0 ? "xanh" : dem("vang") > 0 ? "vang" : "do",
    gioXanh: dem("xanh"),
    gioVang: dem("vang"),
    gioDo: dem("do"),
    khungDep: dai.len > 0 ? `${trongKhung[dai.tu].gio.slice(11, 16)}–${trongKhung[dai.den].gio.slice(11, 16)}` : null,
    gioMax: so((g) => g.gio10m, (a) => Math.max(...a)),
    giatMax: so((g) => g.giat, (a) => Math.max(...a)),
    muaTong: so((g) => g.mua, (a) => a.reduce((t, x) => t + x, 0)),
    nhietMin: so((g) => g.nhietDo, (a) => Math.min(...a)),
    nhietMax: so((g) => g.nhietDo, (a) => Math.max(...a)),
    gio,
  };
}

/* ================================================================== */
/* Học ngưỡng từ kinh nghiệm chủ điểm bay                              */
/* ================================================================== */

/** Một ngày đã chấm: trời thế nào (số của mô hình) và người quyết ra sao. */
export type LanCham = {
  ngay: string;
  /** Chủ chấm: bay tốt · bay hạn chế · nghỉ. */
  ket: "tot" | "han-che" | "nghi";
  /** Số của ngày hôm đó, đo trong khung giờ bay. */
  gioMax: number;
  giatMax: number;
  muaTong: number;
};

export type NguongHoc = {
  /** Đủ dữ liệu để nói gì chưa. */
  du: boolean;
  soLan: number;
  goiY: Partial<NguongBay>;
  /** Câu giải thích cho người đọc, kiểu "12 ngày nghỉ đều có gió trên 21 km/h". */
  giaiThich: string[];
};

/**
 * DÒ NGƯỠNG KHỚP NHẤT VỚI CÁCH CHỦ QUYẾT ĐỊNH.
 *
 * Cách làm cố ý ĐƠN GIẢN và giải thích được, không dùng mô hình hộp đen: quét
 * mọi ngưỡng khả dĩ (1 km/h một bước), với mỗi ngưỡng đếm xem chia đúng được
 * bao nhiêu ngày đã chấm, rồi lấy ngưỡng đúng nhiều nhất. Người dùng nhìn vào
 * là biết vì sao máy đề nghị con số ấy, và bác được nếu thấy vô lý.
 *
 * Cân bằng hai phía chứ không đếm tổng: nếu 30 ngày bay và 3 ngày nghỉ thì
 * ngưỡng "không bao giờ nghỉ" đã đúng 30/33 — đúng cao mà vô dụng. Tính tỉ lệ
 * đúng của mỗi phía rồi lấy trung bình thì phía ít ngày vẫn có tiếng nói.
 *
 * KHÔNG tự áp: chỉ đề nghị. Đổi ngưỡng an toàn phải do người bấm.
 */
export function hocNguong(cac: LanCham[], toiThieu = 8): NguongHoc {
  const sach = cac.filter((c) => Number.isFinite(c.gioMax) && Number.isFinite(c.giatMax));
  if (sach.length < toiThieu) {
    return {
      du: false,
      soLan: sach.length,
      goiY: {},
      giaiThich: [`Mới có ${sach.length} ngày được chấm — cần ít nhất ${toiThieu} ngày mới dám đề nghị ngưỡng.`],
    };
  }

  const bay = sach.filter((c) => c.ket !== "nghi");
  const nghi = sach.filter((c) => c.ket === "nghi");
  const giaiThich: string[] = [];
  const goiY: Partial<NguongBay> = {};

  /** Ngưỡng CẤM: dưới ngưỡng thì bay, trên thì nghỉ — dò chỗ chia gọn nhất. */
  const doNguongCam = (lay: (c: LanCham) => number, ten: string): number | null => {
    if (!bay.length || !nghi.length) return null;
    let tot = { nguong: 0, diem: -1 };
    for (let n = 5; n <= 80; n++) {
      const dungBay = bay.filter((c) => lay(c) <= n).length / bay.length;
      const dungNghi = nghi.filter((c) => lay(c) > n).length / nghi.length;
      const diem = (dungBay + dungNghi) / 2;
      if (diem > tot.diem) tot = { nguong: n, diem };
    }
    /** Dưới 65% thì con số ấy không thật sự chia được gì — im còn hơn nói bừa. */
    if (tot.diem < 0.65) {
      giaiThich.push(`Chưa thấy mốc ${ten} nào chia rõ ngày bay và ngày nghỉ.`);
      return null;
    }
    giaiThich.push(
      `${ten}: mốc ${tot.nguong} km/h khớp ${Math.round(tot.diem * 100)}% số ngày đã chấm ` +
        `(${bay.length} ngày bay · ${nghi.length} ngày nghỉ).`,
    );
    return tot.nguong;
  };

  const gioDo = doNguongCam((c) => c.gioMax, "Gió trung bình");
  if (gioDo) goiY.gioDo = gioDo;
  const giatDo = doNguongCam((c) => c.giatMax, "Gió giật");
  if (giatDo) goiY.giatDo = giatDo;

  /**
   * Ngưỡng XANH lấy từ chính những ngày chủ chấm "bay tốt": mức gió mà 80% số
   * ngày đẹp nằm dưới. Không dò như ngưỡng cấm vì "tốt" và "hạn chế" là hai
   * mức của cùng một chuyện bay được, ranh giới vốn mờ.
   */
  const tot = bay.filter((c) => c.ket === "tot").map((c) => c.gioMax).sort((a, b) => a - b);
  if (tot.length >= 4) {
    const v = Math.round(tot[Math.floor(tot.length * 0.8)]);
    if (v > 0 && (!goiY.gioDo || v < goiY.gioDo)) {
      goiY.gioXanh = v;
      giaiThich.push(`Ngày được chấm "bay tốt": 80% có gió dưới ${v} km/h.`);
    }
  }

  return { du: Object.keys(goiY).length > 0, soLan: sach.length, goiY, giaiThich };
}
