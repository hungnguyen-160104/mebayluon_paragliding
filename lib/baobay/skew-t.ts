/**
 * SKEW-T LOG-P — DỮ LIỆU VÀ PHÉP TÍNH CHO GIẢN ĐỒ THÁM KHÔNG.
 *
 * Vì sao cần: bảng giờ và meteogram nói "trần thermal 1.500m, LI +2" — hai con
 * số đã qua chế biến. Skew-T bày ra CẢ CỘT KHÔNG KHÍ: nhiệt độ và điểm sương
 * theo độ cao, để phi công tự đọc ra nắp nghịch nhiệt nằm ở đâu, mây sẽ hình
 * thành ở độ cao nào, không khí ẩm hay khô, và bọt khí bốc lên tới đâu thì
 * dừng. Đây là thứ phi công đường dài và người dạy bay vẫn đọc; máy chấm hộ
 * không thay thế được.
 *
 * Đọc thế nào (ghi ở đây để người sửa mã sau hiểu mình đang vẽ gì):
 *  - TRỤC ĐỨNG là áp suất theo thang log — càng lên cao các mực càng sát nhau,
 *    đúng như khí quyển thật loãng dần.
 *  - TRỤC NGANG là nhiệt độ, nhưng BỊ XIÊN (skew): cùng một nhiệt độ thì càng
 *    lên cao càng dịch sang phải. Xiên để đường đoạn nhiệt khô (không khí khô
 *    bốc lên nguội 9,8°C/km) trở thành đường gần thẳng đứng, mắt so được ngay
 *    lớp nào bốc được lớp nào bị chặn.
 *  - HAI ĐƯỜNG CHÍNH: nhiệt độ (đỏ) và điểm sương (xanh). Hai đường sát nhau
 *    là không khí ẩm (dễ có mây); tách xa là khô.
 *  - ĐƯỜNG BỌT KHÍ (parcel, cam đứt nét): lấy một bọt khí ở mặt đất, cho bốc
 *    lên theo đoạn nhiệt khô tới khi ngưng tụ (LCL = đáy mây), rồi theo đoạn
 *    nhiệt ẩm. Bọt còn NÓNG HƠN môi trường thì còn tự bốc — chỗ nó cắt lại
 *    đường nhiệt độ là trần của thermal.
 *
 * Thuần tính, không mạng, không React — để kiểm bằng phép thử.
 */

/** Mực áp suất lấy từ mô hình, từ sát đất lên 300 hPa (~9km) — đủ cho bay dù lượn. */
export const MUC_AP = [1000, 975, 950, 925, 900, 850, 800, 700, 600, 500, 400, 300] as const;

export type MucSkewT = {
  /** Áp suất (hPa). */
  ap: number;
  /** Độ cao địa thế vị (m trên mực biển) — mô hình cấp, thiếu thì ước theo áp suất. */
  cao: number;
  /** Nhiệt độ không khí (°C). */
  nhiet: number;
  /** Điểm sương (°C). */
  suong: number;
  /** Tốc độ gió (m/s) và hướng gió (độ) — vẽ thành cờ gió bên phải. */
  gio: number | null;
  huong: number | null;
};

export type ThamKhong = {
  /** "2026-09-12T13:00" — giờ Việt Nam. */
  gio: string;
  muc: MucSkewT[];
};

const KHO = 9.8 / 1000; // °C mỗi mét, đoạn nhiệt khô

/** Độ cao xấp xỉ theo áp suất (m) — chỉ dùng khi mô hình không cấp geopotential. */
export function caoTheoAp(ap: number): number {
  return Math.round(44330 * (1 - Math.pow(ap / 1013.25, 0.1903)));
}

/**
 * ÁP SUẤT HƠI BÃO HOÀ (hPa) theo công thức Magnus — nền của mọi phép tính ẩm.
 */
function eBaoHoa(t: number): number {
  return 6.112 * Math.exp((17.67 * t) / (t + 243.5));
}

/** Tỉ số hỗn hợp (g/kg) từ điểm sương và áp suất. */
export function tiSoHonHop(suong: number, ap: number): number {
  const e = eBaoHoa(suong);
  return (622 * e) / Math.max(1, ap - e);
}

/**
 * ĐÁY MÂY (LCL) tính theo công thức Espy: mỗi 1°C chênh giữa nhiệt độ và điểm
 * sương ở mặt đất thì bọt khí phải lên chừng 125m mới ngưng tụ.
 *
 * Trả về mét TRÊN MẶT ĐẤT của mực xuất phát.
 */
export function dayMay(nhiet: number, suong: number): number {
  return Math.max(0, Math.round((nhiet - suong) * 125));
}

/**
 * ĐƯỜNG BỌT KHÍ bốc lên từ một mực: khô cho tới đáy mây, ẩm ở trên.
 *
 * Đoạn nhiệt ẩm không có công thức đóng gọn; dùng xấp xỉ tuyến tính theo nhiệt
 * độ (ẩm càng nóng càng nguội chậm: ~4°C/km ở 20°C, ~7°C/km ở -20°C) — sai số
 * cỡ vài phần mười độ trong tầng mình bay, đủ để đọc hình.
 */
export function duongBotKhi(
  batDau: { ap: number; cao: number; nhiet: number; suong: number },
  mucCao: Array<{ ap: number; cao: number }>,
): Array<{ ap: number; cao: number; nhiet: number }> {
  const caoLCL = batDau.cao + dayMay(batDau.nhiet, batDau.suong);
  const ra: Array<{ ap: number; cao: number; nhiet: number }> = [];
  let t = batDau.nhiet;
  let caoTruoc = batDau.cao;
  for (const m of [{ ap: batDau.ap, cao: batDau.cao }, ...mucCao.filter((x) => x.cao > batDau.cao)]) {
    const dz = m.cao - caoTruoc;
    if (dz > 0) {
      if (m.cao <= caoLCL) {
        t -= KHO * dz;
      } else {
        /** Phần còn khô (nếu mực này vắt qua đáy mây) rồi phần ẩm. */
        const dzKho = Math.max(0, caoLCL - caoTruoc);
        const dzAm = dz - dzKho;
        t -= KHO * dzKho;
        const amRate = (0.004 + 0.003 * Math.max(0, Math.min(1, (0 - t) / 40))) ;
        t -= amRate * dzAm;
      }
    }
    ra.push({ ap: m.ap, cao: m.cao, nhiet: t });
    caoTruoc = m.cao;
  }
  return ra;
}

/**
 * TRẦN BỌT KHÍ: độ cao mà bọt khí nguội bằng môi trường — trên đó nó nặng hơn
 * xung quanh nên không tự lên nữa. Đây là "trần thermal" đọc thẳng từ giản đồ.
 */
export function tranBotKhi(
  bot: Array<{ cao: number; nhiet: number }>,
  moiTruong: Array<{ cao: number; nhiet: number }>,
): number | null {
  const nhietTai = (cao: number): number | null => {
    for (let i = 1; i < moiTruong.length; i++) {
      const a = moiTruong[i - 1];
      const b = moiTruong[i];
      if (cao >= a.cao && cao <= b.cao) {
        const f = (cao - a.cao) / Math.max(1, b.cao - a.cao);
        return a.nhiet + (b.nhiet - a.nhiet) * f;
      }
    }
    return null;
  };
  let duoi: { cao: number; chenh: number } | null = null;
  for (const p of bot) {
    const mt = nhietTai(p.cao);
    if (mt === null) continue;
    const chenh = p.nhiet - mt;
    if (duoi && duoi.chenh > 0 && chenh <= 0) {
      /** Nội suy đúng chỗ cắt để không nhảy cả một mực (có khi 1.500m). */
      const f = duoi.chenh / (duoi.chenh - chenh);
      return Math.round(duoi.cao + (p.cao - duoi.cao) * f);
    }
    duoi = { cao: p.cao, chenh };
  }
  return null;
}

/**
 * LỚP NGHỊCH NHIỆT: đoạn nào nhiệt độ TĂNG theo độ cao (hoặc giảm quá chậm) là
 * cái nắp chặn thermal. Trả về các đoạn, để tô lên giản đồ.
 */
export function lopNghichNhiet(muc: MucSkewT[]): Array<{ tu: number; den: number; manh: number }> {
  const ra: Array<{ tu: number; den: number; manh: number }> = [];
  for (let i = 1; i < muc.length; i++) {
    const a = muc[i - 1];
    const b = muc[i];
    if (b.cao <= a.cao) continue;
    /** °C mỗi 100m; số DƯƠNG nghĩa là càng lên càng nóng — nghịch nhiệt thật. */
    const doc = ((b.nhiet - a.nhiet) / (b.cao - a.cao)) * 100;
    if (doc > -0.2) ra.push({ tu: a.cao, den: b.cao, manh: Math.round(doc * 100) / 100 });
  }
  return ra;
}
