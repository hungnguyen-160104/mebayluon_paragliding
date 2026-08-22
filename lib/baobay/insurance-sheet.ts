// lib/baobay/insurance-sheet.ts
/**
 * Đẩy hồ sơ bảo hiểm sang BẢNG GOOGLE SHEETS SẴN CÓ của công ty bảo hiểm —
 * đúng cái bảng lâu nay nhân viên nhập tay, không lập bảng mới.
 *
 * Đi qua Apps Script (như lib/pilot-sheet.ts và lib/baobay/sheet.ts) thay vì
 * Google Sheets API: không phải bật API, không phải giữ file khoá JSON trên
 * Vercel, và script chạy bằng chính tài khoản Google của công ty nên quyền có
 * sẵn. Xem docs/baohiem-apps-script.md để lấy script và cách dán vào bảng.
 *
 * MỘT NGƯỜI BAY = MỘT DÒNG, khoá là `bookingId:thứ tự` nên đẩy lại bao nhiêu
 * lần cũng chỉ ghi đè đúng dòng đó, không đẻ thêm dòng trùng. Khách huỷ thì
 * đẩy dòng mang trạng thái "HUỶ" chứ không xoá — bên bảo hiểm phải thấy mà rút
 * tên, xoá trắng là bên đó vẫn tính phí.
 */

export type InsuranceSheetRow = {
  /** Khoá ghi đè: "<id booking>:<thứ tự người>" */
  key: string;
  flightDate: string;
  spotName: string;
  fullName: string;
  birthday: string;
  gender: string;
  idType: string;
  idNumber: string;
  nationality: string;
  isChild: string;
  bookingCode: string;
  phone: string;
  note: string;
  /** "BAY" hoặc "HUỶ". */
  status: string;
  updatedAt: string;
};

export type InsuranceSheetResult = { ok: boolean; error?: string; duplicates?: string[] };

export function isInsuranceSheetConfigured(): boolean {
  return Boolean(process.env.INSURANCE_SHEET_WEBHOOK_URL);
}

/**
 * Đẩy CẢ NHÓM của một booking trong một lần gọi: Apps Script chậm (3–14 giây
 * mỗi lượt), gọi từng người thì một đoàn 8 khách là hết giờ chờ của route.
 */
export async function pushInsuranceRows(rows: InsuranceSheetRow[]): Promise<InsuranceSheetResult> {
  const url = process.env.INSURANCE_SHEET_WEBHOOK_URL;
  if (!url) return { ok: false, error: "Chưa cấu hình INSURANCE_SHEET_WEBHOOK_URL" };
  if (!rows.length) return { ok: true };

  const payload = JSON.stringify({
    secret: process.env.INSURANCE_SHEET_SECRET || "",
    kind: "insurance",
    rows,
  });

  const first = await pushOnce(url, payload);
  if (first.ok || !first.retryable) return { ok: first.ok, error: first.error, duplicates: first.duplicates };

  /** Apps Script lúc "nguội" hay trả HTML thay vì chạy — gọi lại một lần. */
  await new Promise((r) => setTimeout(r, 1_500));
  const again = await pushOnce(url, payload);
  return {
    ok: again.ok,
    error: again.ok ? undefined : `${again.error} (đã thử lại 1 lần)`,
    duplicates: again.duplicates,
  };
}

async function pushOnce(
  url: string,
  payload: string,
): Promise<{ ok: boolean; error?: string; retryable?: boolean; duplicates?: string[] }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, retryable: true };

    /**
     * PHẢI đọc phần thân: Apps Script luôn đáp 200 kể cả khi script bên trong
     * hỏng, nó gói lỗi vào {"ok":false,...}. Bài học từ hai bảng trước — có lúc
     * bảng trống trơn mà bản ghi vẫn ghi "đã đồng bộ".
     */
    const text = await res.text();
    let body: { ok?: boolean; error?: string; written?: number; duplicates?: string[] };
    try {
      body = JSON.parse(text);
    } catch {
      return { ok: false, error: `Trả về không phải JSON: ${text.slice(0, 120)}`, retryable: true };
    }
    if (body.ok !== true) return { ok: false, error: body.error || "Apps Script báo thất bại" };
    /** Ghi xong thì script luôn trả số dòng — thiếu nghĩa là chưa hề ghi. */
    if (body.written === undefined) {
      return { ok: false, error: "Trả về không phải kết quả ghi (thiếu số dòng)", retryable: true };
    }
    return { ok: true, duplicates: body.duplicates || [] };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), retryable: true };
  }
}
