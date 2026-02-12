// Hàm tiện ích về ngày giờ cho trang booking
export const VN_TZ = "Asia/Ho_Chi_Minh";

export function toISODate(d: Date) {
  // trả chuỗi yyyy-mm-dd theo múi giờ local
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isWeekend(iso?: string): boolean {
  if (!iso) return false;
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay(); // 0:CN, 6:Th7
  return day === 0 || day === 6;
}

export function formatDateVN(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const weekday = ["CN","Th 2","Th 3","Th 4","Th 5","Th 6","Th 7"][d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${weekday}, ${dd}/${mm}/${yyyy}`;
}

export function isPastDate(iso: string): boolean {
  const today = toISODate(new Date());
  return iso < today;
}

export function minBookingDate(minLeadDays = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + minLeadDays);
  return toISODate(d);
}

// Tạo danh sách khung giờ "HH:MM"
export function generateTimeSlots(startHour = 7, endHour = 18, stepMinutes = 60): string[] {
  const res: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += stepMinutes) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      res.push(`${hh}:${mm}`);
    }
  }
  return res;
}
