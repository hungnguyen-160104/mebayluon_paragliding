// lib/baobay/sheet.ts
/**
 * Đẩy báo cáo hằng ngày sang bảng Google Sheets của kế toán.
 *
 * Dùng lại cách của lib/pilot-sheet.ts: Apps Script webhook, không cần bật
 * Google API cũng không cần file khoá JSON. Xem docs/baocao-apps-script.md để
 * lấy script và cách deploy.
 *
 * Khác một điểm quan trọng: báo cáo báo bay được SỬA LẠI (phi công báo thiếu
 * rồi nhập bù trong ngày), nên script phải ghi đè theo cột "Khoá" chứ không
 * append thêm dòng — nếu không kế toán sẽ cộng trùng. Vì vậy payload luôn kèm
 * `row.key` và `sheet` (tên tab).
 *
 * Lỗi ở đây KHÔNG được làm hỏng việc nhập liệu: bản ghi đã nằm trong MongoDB,
 * bảng tính chỉ là bản sao cho kế toán. Bản ghi nào chưa đẩy được sẽ mang
 * `sheetSynced: false` kèm lý do trong `sheetError` để còn bù sau.
 */

export type BaobaySheetKind = "pilot" | "dispatcher" | "cameraman" | "close" | "handover" | "advance";

/**
 * Tab mặc định cho từng loại báo cáo.
 *
 * Riêng báo cáo phi công KHÔNG dùng tab mặc định: mỗi phi công một thẻ riêng
 * theo tháng ("Giàng A Sáu 2026-08"), nên nơi gọi truyền thẳng tên tab. Tên tab
 * là tham số, còn `kind` mới là thứ script dùng để biết bộ cột — nhờ vậy thêm
 * phi công mới không phải sửa script.
 */
const SHEET_NAME: Record<BaobaySheetKind, string> = {
  pilot: "Phi công",
  dispatcher: "Điều phối",
  cameraman: "Camera man",
  close: "Chốt ngày",
  handover: "Giao tiền",
  advance: "Ứng tiền",
};

export type SheetPushResult = { ok: boolean; error?: string };

export function isBaobaySheetConfigured(): boolean {
  return Boolean(process.env.BAOBAY_SHEET_WEBHOOK_URL);
}

/**
 * Nơi gửi của MỘT điểm bay: mỗi điểm một bảng Google Sheets riêng.
 *
 * Cấu hình lấy từ bản ghi BaobaySetting của điểm (admin dán vào ở trang quản
 * trị), thiếu thì rơi về biến môi trường — giữ cho cấu hình một điểm thời kỳ
 * đầu vẫn chạy nguyên.
 */
export type SheetTarget = { url: string; secret: string };

export function sheetTargetFromSetting(setting?: {
  sheetWebhookUrl?: string;
  sheetSecret?: string;
} | null): SheetTarget | null {
  const url = setting?.sheetWebhookUrl?.trim() || process.env.BAOBAY_SHEET_WEBHOOK_URL || "";
  if (!url) return null;
  const secret = setting?.sheetWebhookUrl?.trim()
    ? setting?.sheetSecret || ""
    : process.env.BAOBAY_SHEET_SECRET || "";
  return { url, secret };
}

export async function pushBaobayRow(
  kind: BaobaySheetKind,
  row: Record<string, string | number>,
  sheetName?: string,
  target?: SheetTarget | null,
): Promise<SheetPushResult> {
  const dest = target ?? sheetTargetFromSetting(null);
  if (!dest) {
    return { ok: false, error: "Điểm bay này chưa khai bảng Google Sheets" };
  }

  const payload = JSON.stringify({
    secret: dest.secret,
    kind,
    // Tab tuỳ ý (thẻ riêng của từng phi công theo tháng), script tự tạo nếu chưa có.
    sheet: sheetName || SHEET_NAME[kind],
    row,
  });

  /**
   * Gọi HAI lần nếu lần đầu hỏng.
   *
   * Apps Script lúc "nguội" (một hồi không ai gọi) thỉnh thoảng trả 404 kèm
   * trang HTML thay vì chạy script — đo trên bảng Hà Nội: 1/3 lần đầu hỏng,
   * gọi lại ngay sau đó thì được. Không phải lỗi cấu hình, chỉ là Google đánh
   * thức chậm. Chỉ thử lại với lỗi TẠM THỜI: mã bảo vệ sai hay script báo lỗi
   * nghiệp vụ thì gọi lại bao nhiêu lần cũng thế.
   */
  const attempt = await pushOnce(dest.url, payload);
  if (attempt.ok || !attempt.retryable) return { ok: attempt.ok, error: attempt.error };

  await new Promise((r) => setTimeout(r, 1_500));
  const again = await pushOnce(dest.url, payload);
  return { ok: again.ok, error: again.ok ? undefined : `${again.error} (đã thử lại 1 lần)` };
}

/** Một lần gọi. `retryable` = hỏng kiểu tạm thời, gọi lại có cơ may được. */
async function pushOnce(
  url: string,
  payload: string,
): Promise<{ ok: boolean; error?: string; retryable?: boolean }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      /**
       * 25 giây, không phải 15.
       *
       * Đo thực tế trên bảng thật: ghi một dòng mất 3,6s–13,6s tuỳ lúc, và lần
       * gọi đầu sau một hồi không ai dùng (Apps Script "nguội") còn lâu hơn —
       * đã có lần vượt 15s nên bản ghi bị đánh dấu "chưa sang bảng" dù bảng đã
       * nhận đủ số. Route handler tương ứng khai maxDuration = 30 để nền tảng
       * không cắt sớm hơn ngưỡng này.
       */
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, retryable: true };

    /**
     * PHẢI đọc nội dung trả về, không được chỉ nhìn mã HTTP: Apps Script luôn
     * đáp 200 kể cả khi script bên trong hỏng, nó gói lỗi vào phần thân dạng
     * {"ok":false,"error":...}. Bài học từ lib/pilot-sheet.ts — có lúc bảng
     * trống trơn mà bản ghi vẫn ghi đã đồng bộ.
     */
    const text = await res.text();
    let body: { ok?: boolean; error?: string; missingColumns?: string[] };
    try {
      body = JSON.parse(text);
    } catch {
      // Trả về HTML = Google chặn/đánh thức chậm, không phải script báo lỗi
      return { ok: false, error: `Trả về không phải JSON: ${text.slice(0, 120)}`, retryable: true };
    }

    if (body.ok !== true) {
      return { ok: false, error: body.error || "Apps Script báo thất bại" };
    }

    if (body.missingColumns?.length) {
      console.warn("[baobay] bảng tính thiếu cột:", body.missingColumns.join(", "));
    }

    return { ok: true };
  } catch (e: unknown) {
    // Hết giờ chờ hoặc đứt mạng — đáng thử lại
    return { ok: false, error: e instanceof Error ? e.message : String(e), retryable: true };
  }
}
