# Klook Merchant → mebayluon.com: đặc tả API lấy booking

> Reverse-engineer từ Klook Merchant Center (merchant.klook.com), tài khoản `meb******@gmail.com`, ngày 14/08/2026.
> Đây là **internal API của trang admin**, không phải API công khai. Đọc mục "Cảnh báo & phương án chính thức" ở cuối trước khi đưa lên production.

---

## 1. Endpoint chính

```
GET https://merchant.klook.com/v1/merchantapisrv/booking/booking_service/get_booking_list
```

**Auth:** chỉ cần cookie session của merchant.klook.com (`credentials: "include"`). Không có header `Authorization`, không có CSRF token, không có chữ ký. Cookie quan trọng: `admin_login` (đọc được từ JS, **không** httpOnly) + `datadome` (chống bot — xem mục 7).

### Query params

| Param | Giá trị dùng được | Ghi chú |
|---|---|---|
| `start_time` | `YYYY-MM-DD 00:00:00` | **Bắt buộc.** Khoảng tối đa ~92 ngày, vượt quá → `total: 0` (không báo lỗi!) |
| `end_time` | `YYYY-MM-DD 23:59:59` | |
| `time_type` | `1` | 1 = lọc theo *booking time* (thời điểm khách đặt) |
| `ticket_status` | `-1` all · `0` pending · `1` **canceled** · `4` **confirmed** | ⚠️ Xem bảng bên dưới — mapping không trực quan |
| `no_mask` | `true` | **Quan trọng.** `false` → tên/email/SĐT bị che thành `***` |
| `page` / `limit` | `1` / `50` | Phân trang; `result.total` cho tổng số |
| `order_time_type` | `2` | |
| `order_by_sequence` | `desc` | |
| `sortDate` | `4` | |
| `booking_reference_number` | vd `VSU926562` | Lọc 1 đơn cụ thể |
| `activity_id`, `package_id` | `0` | 0 = tất cả |
| `merchant_category_id`, `tag_id`, `alter_status` | `0`, `-1`, `-1` | |
| `selected_category_id` | `1` | Experience |
| `sub_tab` | `all` | **Bị server bỏ qua** — chỉ `ticket_status` mới thực sự lọc |
| `participation_start` / `participation_end` | `YYYY-MM-DD` | Lọc theo ngày bay thay vì ngày đặt (dùng với `time_type` khác) |

### Bảng `ticket_status` (đã kiểm chứng bằng số liệu thật)

| Giá trị | Tab trên UI | Số đơn (15/05–14/08/2026) |
|---|---|---|
| `-1` | All | 88 |
| `0` | Pending | 0 |
| `1` | **Canceled** | 12 |
| `4` | **Confirmed** | 76 |

Trường `booking_info.ticket_status` trong response trả về đúng giá trị này.

### Ví dụ gọi (chạy trong console của tab merchant.klook.com)

```js
const qs = new URLSearchParams({
  merchant_category_id: 0, activity_id: 0, package_id: 0,
  tag_id: -1, time_type: 1, ticket_status: -1, alter_status: -1,
  start_time: "2026-08-01 00:00:00",
  end_time:   "2026-08-31 23:59:59",
  selected_category_id: 1, sub_tab: "all",
  order_time_type: 2, order_by_sequence: "desc", sortDate: 4, tags: 0,
  page: 1, limit: 50, no_mask: true,
});
const j = await (await fetch(
  "https://merchant.klook.com/v1/merchantapisrv/booking/booking_service/get_booking_list?" + qs,
  { credentials: "include" }
)).json();
// j.result.booking_list, j.result.total
```

### Endpoint phụ

```
GET .../booking/booking_service/get_pending_booking_count_v2?<cùng params>   → đếm đơn chờ
GET .../booking/booking_service/get_alter_count                             → đếm yêu cầu đổi lịch
```

Chi tiết 1 đơn (trang HTML, không phải API): `/merchant_experience/booking_details?booking_reference_number=VSU926562`
(giá trị này có sẵn ở `booking_info.detail_url`)

---

## 2. Cấu trúc response

```jsonc
{
  "success": true,
  "error": { "code": "", "message": "" },
  "result": {
    "total": 88,
    "booking_list": [ /* … */ ],
    "group_list": [ { "name": "participation_info", "visible_type": 1 }, … ]
  }
}
```

### Một phần tử `booking_list[]` (dữ liệu thật, PII đã thay bằng placeholder)

```jsonc
{
  "booking_info": {
    "ticket_id": 2263138761,
    "ticket_status": 4,                          // 4 = Confirmed
    "booking_reference_number": "VSU926562",     // ⭐ khoá idempotent
    "booking_time": "2026-08-03T15:37:13+08:00", // GMT+8!
    "merchant_confirm_status": 0,
    "note": "",
    "detail_url": "/merchant_experience/booking_details?booking_reference_number=VSU926562",
    "order_channel_txt": "Klook",
    "order_id": 0, "order_no": "", "sub_category_id": 15, "tag_id": 0,
    "template_id": 3, "remind_set": 0, "is_new_platform_order": 1,
    "region": "", "time_format": "YYYY-MM-DD HH:mm:ss",
    "confirm_without_params": false
  },

  "activity_info": {
    "activity_id": 65949,
    "activity_name": "Hanoi Paragliding Tour – With Round-Trip Transfer to the Flying Site"
  },

  "participation_info": {
    "participate_time": "2026-10-23T00:00:00+07:00",   // ⭐ NGÀY BAY (GMT+7)
    "participate_time_original": "2026-10-23T00:00:00+07:00",
    "units": [{
      "unit_name": "Person",
      "unit_ids": [2263074329],
      "count": 1,                                       // ⭐ SỐ KHÁCH
      "unit_cost": 1870000,
      "sku_id": 828952178258,
      "day_num": 0,
      "currency": "VND"
    }],
    "unit_details": null,
    "total_price": 1870000,                             // ⭐ giá NET merchant nhận
    "currency": "",
    "booking_days": 1
  },

  "confirmation_info": {
    "voucher_number": "1860621206",
    "voucher_code": "KLK1860621206",                    // ⭐ mã voucher khách cầm
    "voucher_level": "UniqueVoucher",
    "instant_confirm": 1,
    "confirmable": 1,
    "confirm_source": "KLOOK",
    "confirm_type": "KLOOKCODE",
    "confirm_time": "2026-08-03T15:38:23+08:00",
    "confirmation_details": { "note": "", "note_en": "", "note_other": "", "pick_up_time": "" },
    "file_url": "/upload_voucher/merchant/global/c4016eda-….pdf",
    "confirmation": 1, "operate_type": 0, "voucher_get_method": 0,
    "merchant_response": "",
    "confirm_tips": { "overdue": { "code": 0, "tips_text": "" } }
  },

  "contact_info": {
    "user_select_language": "en_BS",
    "first_name": "Jane",
    "last_name": "Doe",
    "user_name": "Jane Doe",                            // ⭐
    "user_email": "jane.doe@example.com",               // ⭐
    "user_phone": "63-9000000000"                       // ⭐ format "<mã nước>-<số>"
  },

  "common_info": [ /* xem mục 3 */ ],

  "custom_info": {
    "biz_data": { "is_support_new_pick_up": "1" },
    "order_meta_data":       [{ "key": "po_generator", "type": 1, "value": "order_fulfillment" }],
    "fulfillment_meta_data": [{ "key": "po_generator", "data_type": 1, "value": "order_fulfillment" }],
    "custom_infos": null,
    "vertical_data": { "support_initiate_refund": "…" }
  },

  "meta_data":         [{ "id": 0, "key": "is_support_new_pick_up", "value": "1" }],
  "merchant_category": { "category_id": 1, "category_name": "Experience", "category_i18n_name": "", "note": "" },

  "booking_tags": null,
  "alter_info": null, "merchant_alter_info": null, "alter_info_v2": null,
  "alter_info_latest_time": "",
  "notify_info": { "refund_notify_info": { "show_notify": false, "refund_notify_words": null } }
}
```

---

## 3. `common_info[]` — nơi chứa thông tin khách & điểm đón

Mảng nhóm; mỗi nhóm có `group_name`, `visible_type`, `field_list[]`.
Mỗi field: `{ field_name, field_value, field_type, field_parse_zone, field_price, field_business_type? }`.

**Lưu ý: nhóm `other_info` dùng `field_business_type` (số) làm khoá ổn định, `field_type` rỗng.**
`field_name` là chuỗi tiếng Anh có thể đổi theo ngôn ngữ giao diện → **đừng match theo `field_name`, match theo `field_business_type`**.

| group_name | field_name | field_type | field_business_type | Ví dụ giá trị |
|---|---|---|---|---|
| `product_info` | Activity ID | `activity_id` | — | `65949` |
| `product_info` | Activity name | `activity_name` | — | `Hanoi Paragliding Tour – …` |
| `product_info` | Package name | `package_name` | — | `Standard Paragliding Tour - Round Transfer (from meeting point)` |
| `product_info` | Internal title | `activity_reference_name` | — | `-` |
| `product_info` | Cost price amount | `total_price` | — | `1870000.00 VND` |
| `participation_info` | Unit | `unit_desc` | — | `Person x 1` |
| `participation_info` | Participation time | `participation_time` | — | `2026-10-23T00:00:00+07:00` |
| `confirmation_info` | Voucher type | `voucher_type` | — | `KLOOKCODE` |
| `confirmation_info` | Confirmation type | `confirm_type` | — | `Instant confirmation` |
| `confirmation_info` | Confirmation time | `confirm_time` | — | `2026-08-03T15:38:23+08:00` |
| `confirmation_info` | Order channel | `order_channel` | — | `Klook` |
| `contact_info` | Full name | `full_name` | — | `Jane Doe` |
| `contact_info` | Email | `email` | — | `jane.doe@example.com` |
| `contact_info` | Phone number | `phone` | — | `+63 9000000000` |
| `other_info` | Special requirements | *(rỗng)* | **10010078** | `None.` |
| `other_info` | Departure location | *(rỗng)* | **10409936** | JSON string — xem dưới |
| `other_info` | Full name | *(rỗng)* | **10010001** | `Jane Doe` |
| `other_info` | Title | *(rỗng)* | **10010004** | `Ms` |
| `other_info` | Country/region | *(rỗng)* | **10010005** | `Philippines` |
| `other_info` | Date of birth | *(rỗng)* | **10010006** | `1997-01-01` |
| `other_info` | ID number (Passport) | *(rỗng)* | **10010011** | `P4600435B` |
| `custom_info` | *(rỗng)* | | | `field_list: []` |

> Đơn nhiều khách: các field `10010001/10010004/10010005/10010006/10010011` **lặp lại theo thứ tự** trong cùng `field_list` → parse tuần tự, mỗi khi gặp lại `10010001` (Full name) thì bắt đầu một khách mới.

### `Departure location` (field_business_type `10409936`) — parse JSON

```jsonc
{
  "id": 117721871,
  "itinerary_attr_value_id": 117721866,
  "pick_up_type": 1,
  "location": "21.007419,105.793188",          // ⭐ "lat,lng"
  "location_original": "21.007419,105.793188",
  "address_desc": "222 Đ. Trần Duy Hưng, Trung Hoà, Cầu Giấy, Hà Nội 100000, Vietnam",
  "location_name": "GO! Thang Long Supermarket - Hanoi center",   // ⭐ tên điểm đón
  "google_place_id": "ChIJ8QvRzVWrNTERiEoVS5SOhTA",
  "time": [{ "from": 25200, "to": 32400 }],    // ⭐ giây từ 00:00 → 07:00–09:00
  "area_id": 0, "parent_name": "", "administrative_level": 0,
  "map_type": 1, "amap_code": "", "supply_api_mapping_key": "",
  "path": null, "is_customized_area": 0,
  "customized_config": null, "area_center_points": null
}
```

Đổi `time[0].from` → giờ đón: `25200 / 3600 = 7` → **07:00**, `to = 32400 / 3600 = 9` → **09:00**.

---

## 4. Ánh xạ sang payload `/api/booking/create` của mebayluon.com

Đối chiếu với `Payload` trong `app/api/booking/create/route.ts`:

| Field web mebayluon | Lấy từ Klook |
|---|---|
| `location` (key trong `data/spots.json`) | Suy từ `activity_info.activity_name` / `activity_id` → cần **bảng map thủ công** `activity_id → spot key`. VD `65949` → Hà Nội (Đồi Bù). |
| `locationName` | Tự resolve từ `location` như route hiện tại |
| `packageLabel` | `common_info.product_info` → `field_type: "package_name"` |
| `packageKey` | Map thủ công từ `sku_id` hoặc `package_name` |
| `dateISO` | `participation_info.participate_time` → cắt `YYYY-MM-DD` (đã là +07:00, **không** convert timezone) |
| `timeSlot` | `Departure location.time[0].from/to` → `"07:00–09:00"` |
| `guestsCount` | `participation_info.units[].count` (cộng dồn nếu nhiều unit) |
| `contact.fullName` | `contact_info.user_name` |
| `contact.email` | `contact_info.user_email` |
| `contact.phone` | `contact_info.user_phone` → đổi `"63-9270485698"` thành `"+639270485698"` |
| `contact.pickupLocation` | `Departure location.location_name` + `address_desc` |
| `contact.specialRequest` | `other_info` bt=`10010078` + `booking_info.note` |
| `guests[].fullName` | `other_info` bt=`10010001` |
| `guests[].gender` | `other_info` bt=`10010004` (`Mr`/`Ms`) |
| `guests[].nationality` | `other_info` bt=`10010005` |
| `guests[].dob` | `other_info` bt=`10010006` |
| `guests[].idNumber` | `other_info` bt=`10010011` |
| `guests[].weightKg` | ❌ **Klook không thu thập** — để trống, nhân viên hỏi sau |
| `price.total` | `participation_info.total_price` (giá NET, **không** phải giá khách trả) |
| `price.currency` | `participation_info.units[0].currency` (`VND`) |
| `price.perPerson` | `units[0].unit_cost` |
| `addons` / `addonsQty` | ❌ Klook gộp vào package → suy từ `package_name` (`Round Transfer` = có đón trả) |
| — | `booking_info.booking_reference_number` → **lưu làm `externalRef` để chống trùng** |
| — | `confirmation_info.voucher_code` → lưu để nhân viên đối chiếu voucher khách |
| — | `order_channel_txt` = `"Klook"` → set `source: "klook"` |

### Đề xuất thay đổi ở phía web

1. **Thêm vào `models/Booking.model.ts`:**
   ```ts
   source: { type: String, default: "web" },        // "web" | "klook"
   externalRef: { type: String, index: true, unique: true, sparse: true },
   externalStatus: String,                           // confirmed | canceled
   voucherCode: String,
   ```
2. **Route mới `app/api/booking/klook-sync/route.ts`** (POST, bảo vệ bằng header `x-sync-secret`):
   - nhận mảng booking đã normalize
   - `Booking.findOneAndUpdate({ externalRef }, {...}, { upsert: true })` → idempotent, chạy lại bao nhiêu lần cũng không nhân bản
   - đơn `ticket_status === 1` (canceled) → set `status: "cancelled"` thay vì tạo mới
   - gọi `syncOneWebBooking(bookingObjectId)` để đẩy vào sổ `/baocao` như luồng web hiện tại
   - **bỏ qua Turnstile** (đây là server-to-server, không phải form khách)
3. **Không tái dùng `/api/booking/create`** vì nó bắt buộc `turnstileToken` và gửi Telegram/Gmail cho từng đơn — sync 88 đơn sẽ spam.

---

## 5. Idempotency & lịch chạy

- Khoá duy nhất: `booking_info.booking_reference_number` (vd `VSU926562`). Ổn định, không đổi.
- Đơn huỷ vẫn giữ nguyên reference → update status, đừng xoá.
- Đề xuất: chạy mỗi 10–15 phút, cửa sổ `start_time = now - 7 ngày`, `end_time = now` (lọc theo **booking time**), `ticket_status=-1`, `limit=50`, lặp `page` cho tới khi hết `total`.
- Chạy thêm 1 job/ngày với cửa sổ 90 ngày để bắt các đơn bị đổi/huỷ muộn.

---

## 6. Đoạn code fetch + normalize (Node/TS, dán thẳng vào Claude Code)

```ts
// lib/klook.ts
const BASE = "https://merchant.klook.com/v1/merchantapisrv/booking/booking_service/get_booking_list";

export type KlookBooking = any; // shape ở mục 2

export async function fetchKlookBookings(opts: {
  cookie: string;            // toàn bộ chuỗi Cookie của merchant.klook.com
  startTime: string;         // "2026-08-01 00:00:00"
  endTime: string;           // "2026-08-31 23:59:59"
  ticketStatus?: number;     // -1 all
}): Promise<KlookBooking[]> {
  const out: KlookBooking[] = [];
  let page = 1;
  const limit = 50;

  while (true) {
    const qs = new URLSearchParams({
      merchant_category_id: "0", activity_id: "0", package_id: "0",
      tag_id: "-1", time_type: "1",
      ticket_status: String(opts.ticketStatus ?? -1),
      alter_status: "-1",
      start_time: opts.startTime, end_time: opts.endTime,
      selected_category_id: "1", sub_tab: "all",
      order_time_type: "2", order_by_sequence: "desc", sortDate: "4", tags: "0",
      page: String(page), limit: String(limit), no_mask: "true",
    });

    const res = await fetch(`${BASE}?${qs}`, {
      headers: {
        cookie: opts.cookie,
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        accept: "application/json, text/plain, */*",
        referer: "https://merchant.klook.com/booking",
      },
    });
    if (!res.ok) throw new Error(`Klook HTTP ${res.status}`);
    const j = await res.json();
    if (!j.success) throw new Error(`Klook API: ${j.error?.code} ${j.error?.message}`);

    const list = j.result?.booking_list ?? [];
    out.push(...list);
    if (out.length >= (j.result?.total ?? 0) || list.length === 0) break;
    page++;
  }
  return out;
}

// ---- normalize ----
const BT = {
  SPECIAL_REQ: 10010078,
  DEPARTURE:   10409936,
  FULL_NAME:   10010001,
  TITLE:       10010004,
  COUNTRY:     10010005,
  DOB:         10010006,
  ID_NUMBER:   10010011,
} as const;

function flatFields(b: any) {
  return (b.common_info ?? []).flatMap((g: any) =>
    (g.field_list ?? []).map((f: any) => ({ ...f, group: g.group_name }))
  );
}

export function normalizeKlook(b: any) {
  const fields = flatFields(b);
  const byType = (t: string) => fields.find((f: any) => f.field_type === t)?.field_value;
  const byBt   = (bt: number) => fields.find((f: any) => f.field_business_type === bt)?.field_value;

  // gom khách: mỗi lần gặp FULL_NAME là 1 khách mới
  const guests: any[] = [];
  for (const f of fields) {
    switch (f.field_business_type) {
      case BT.FULL_NAME: guests.push({ fullName: f.field_value }); break;
      case BT.TITLE:     if (guests.length) guests.at(-1).gender      = f.field_value; break;
      case BT.COUNTRY:   if (guests.length) guests.at(-1).nationality = f.field_value; break;
      case BT.DOB:       if (guests.length) guests.at(-1).dob         = f.field_value; break;
      case BT.ID_NUMBER: if (guests.length) guests.at(-1).idNumber    = f.field_value; break;
    }
  }

  let pickup: any = null;
  try { pickup = JSON.parse(byBt(BT.DEPARTURE) ?? "null"); } catch {}

  const hhmm = (sec?: number) =>
    sec == null ? undefined
      : `${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}`;

  const units = b.participation_info?.units ?? [];
  const phoneRaw = b.contact_info?.user_phone ?? "";      // "63-9270485698"
  const phone = phoneRaw ? "+" + phoneRaw.replace("-", "") : "";

  return {
    externalRef:    b.booking_info.booking_reference_number,
    externalStatus: b.booking_info.ticket_status === 4 ? "confirmed"
                  : b.booking_info.ticket_status === 1 ? "canceled" : "pending",
    source: "klook",
    voucherCode: b.confirmation_info?.voucher_code,
    bookedAt:    b.booking_info.booking_time,             // GMT+8

    activityId:   b.activity_info?.activity_id,
    activityName: b.activity_info?.activity_name,
    packageLabel: byType("package_name"),

    dateISO:  String(b.participation_info?.participate_time ?? "").slice(0, 10),
    timeSlot: pickup?.time?.[0]
      ? `${hhmm(pickup.time[0].from)}–${hhmm(pickup.time[0].to)}` : undefined,

    guestsCount: units.reduce((s: number, u: any) => s + (u.count ?? 0), 0) || 1,

    contact: {
      fullName:       b.contact_info?.user_name,
      email:          b.contact_info?.user_email,
      phone,
      pickupLocation: pickup
        ? [pickup.location_name, pickup.address_desc].filter(Boolean).join(" — ")
        : undefined,
      specialRequest: [byBt(BT.SPECIAL_REQ), b.booking_info?.note]
        .filter((s) => s && s !== "None.").join(" / ") || undefined,
    },

    pickupGeo: pickup?.location,        // "21.007419,105.793188"
    googlePlaceId: pickup?.google_place_id,

    guests,

    price: {
      currency:  units[0]?.currency ?? "VND",
      perPerson: units[0]?.unit_cost,
      total:     b.participation_info?.total_price,
      note: "giá NET merchant nhận, không phải giá khách trả Klook",
    },

    detailUrl: "https://merchant.klook.com" + (b.booking_info?.detail_url ?? ""),
  };
}
```

---

## 7. Cảnh báo & phương án chính thức

**Rủi ro của cách dùng internal API:**

1. **DataDome** — merchant.klook.com có cookie `datadome`, tức là đang chạy bot-protection. Gọi từ IP datacenter (Vercel/AWS) rất dễ bị chặn 403 dù cookie hợp lệ. Gọi từ IP nhà/văn phòng (script trên MacBook) an toàn hơn nhiều.
2. **Cookie hết hạn** — session admin sẽ hết hạn (vài ngày–vài tuần). Cần cơ chế cảnh báo khi sync fail 401/403, và quy trình dán lại cookie. Klook cũng đã đăng thông báo "Enhanced Security Measures for Merchant Accounts" → có thể siết thêm.
3. **API không có hợp đồng** — Klook đổi param/field bất kỳ lúc nào, không thông báo. Cần test tự động cho `normalizeKlook`.
4. **Điều khoản** — dùng automation trên tài khoản merchant có thể vi phạm ToS của Klook. Nên hỏi Account Manager một câu trước khi chạy production.

**Vì vậy khuyến nghị:**

- **Ngắn hạn:** script Node chạy trên MacBook (hoặc 1 con VPS ở VN) → gọi Klook bằng cookie → POST vào `POST https://mebayluon.com/api/booking/klook-sync` với header `x-sync-secret`. Cookie lưu trong `.env.local`, không commit.
- **Dài hạn (đúng chuẩn):** liên hệ Klook Account Manager xin **Supplier / Direct Connect API** — Klook có chương trình tích hợp 2 chiều cho merchant (đẩy availability, nhận booking qua webhook `booking_create` / `booking_cancel`). Đây mới là thứ chạy được trên Vercel, có SLA, không sợ DataDome. Lưu ý [Klook OpenAPI công khai](https://klook.gitbook.io/openapi) là API cho **distributor bán lại sản phẩm Klook**, không phải cho merchant lấy booking của mình — đừng nhầm.

---

## 8. Việc còn thiếu (cần bạn cung cấp)

1. **Bảng map `activity_id` → spot key** trong `data/spots.json`. Hiện mới thấy `65949` = Hanoi Paragliding Tour. Chạy đoạn này trong console Klook để liệt kê hết:
   ```js
   const s=new Set(); (await fetchAll()).forEach(b=>s.add(b.activity_info.activity_id+" | "+b.activity_info.activity_name)); [...s]
   ```
2. **Cân nặng khách** — Klook không thu thập. Quyết định: để trống và nhân viên gọi hỏi, hay thêm bước xác nhận trên app.
3. **Giá bán vs giá NET** — `total_price` là tiền merchant nhận. Nếu báo cáo doanh thu cần giá khách trả thì phải lấy từ Booking Reports (endpoint khác, chưa khảo sát).

---

## 9. Email xác nhận của Klook — đối chiếu thực tế (bổ sung 14/08/2026)

### Mẫu email thật

```
Hey there Ms. YuPi,
Klook has confirmed an order for <activity> - <package> and issued a voucher to the participant.

Hanoi Paragliding Tour – With Round-Trip Transfer to the Flying Site
Package:   Standard Paragliding Tour - Round Transfer (from meeting point)
Booking reference ID: ENB058227
Date Request: 2026-08-14
Time Request: NA
Lead participant: (MISS)harti harti
Country/region of passport: Indonesia
Lead person email: noniharti11@gmail.com
Lead person mobile: 62-82225130415
Participant: 1 x Person
Activity URL: https://www.klook.com/en-US/activity/65949
Extra Details
Special requirements: +6282225130415
Departure location: GO! Thang Long Supermarket - Hanoi center
Participant1 Full name: harti
Participant1 Title: Ms
Participant1 Country/region: Indonesia
Participant1 Date of birth: 2003-04-29
Participant1 ID number (Passport): X9796888
```

Format rất đều: các dòng `Nhãn: giá trị`, khách lẻ đánh số `ParticipantN <Field>:`. Parse bằng regex đơn giản, không cần DOM parser.

### Email CÓ gì

| Field | Email | Ghi chú |
|---|---|---|
| `booking_reference_number` | ✅ `ENB058227` | Khoá idempotent — khớp API |
| Activity name / Package name | ✅ | |
| `activity_id` | ✅ | Trích từ `Activity URL` → `/activity/65949` |
| Ngày bay | ✅ `Date Request` | |
| Khung giờ | ⚠️ `Time Request: NA` | Sản phẩm này không có timeslot |
| Số khách | ✅ `Participant: 1 x Person` | |
| Tên / email / SĐT người đặt | ✅ | SĐT cùng format `62-82225130415` như API |
| Special requirements | ✅ | |
| Điểm đón (tên) | ✅ `GO! Thang Long Supermarket - Hanoi center` | **chỉ có tên** |
| Họ tên / Title / Quốc tịch / DOB / Số hộ chiếu **từng khách** | ✅ | Đầy đủ, đánh số `Participant1..N` |

### Email THIẾU gì (so với API)

| Field | Vì sao cần |
|---|---|
| Toạ độ `21.007419,105.793188` + `address_desc` + `google_place_id` | Tài xế cần định vị chính xác; email chỉ có tên địa điểm |
| Khung giờ đón (`time[0].from/to` → 07:00–09:00) | Điều phối xe |
| `voucher_code` (`KLK1860621206`) | Đối chiếu voucher khách xuất trình |
| `total_price` / `unit_cost` | **Email không có bất kỳ con số tiền nào** → không làm được báo cáo doanh thu |
| `booking_time` (lúc khách đặt) | Phân biệt đơn mới vs đơn cũ |
| `ticket_status` hiện tại | ⚠️ Xem dưới |

### Đã kiểm chứng: mail HUỶ có về, cùng template

Mail huỷ của chính `ENB058227`:

```
Hey there Ms. YuPi,
As per our discussion, the following Klook order has now been cancelled.
Hanoi Paragliding Tour – With Round-Trip Transfer to the Flying Site
Package:   Standard Paragliding Tour - Round Transfer (from meeting point)
Booking reference ID: ENB058227
… (phần còn lại y hệt mail xác nhận)
If you have any questions, please contact us at merchant@klook.com.
```

Thân mail **giống hệt** mail xác nhận, cùng `Booking reference ID`. Chỉ khác đúng câu mở đầu:

| Loại | Câu nhận diện |
|---|---|
| Xác nhận | `Klook has confirmed an order for … and issued a voucher to the participant.` |
| Huỷ | `As per our discussion, the following Klook order has now been cancelled.` |

→ **Email-only là phương án chính đáng.** Không cần API để biết đơn còn hay huỷ.

### Hai cái bẫy phải xử lý (vì hai mail giống hệt nhau)

**1. Đừng dùng `/cancel/i` để dò trạng thái.** Mail xác nhận hoàn toàn có thể chứa chữ "cancellation" ở phần chính sách/footer, và Klook thêm footer lúc nào không báo. Phải neo vào đúng câu:

```ts
const isCancel  = /has now been cancelled/i.test(text);
const isConfirm = /has confirmed an order for/i.test(text);
// không khớp cái nào → externalStatus = "unknown", KHÔNG đoán, bắn cảnh báo
```

**2. Chống "hồi sinh" đơn đã huỷ.** Vì thân mail giống nhau, nếu mail xác nhận bị xử lý sau mail huỷ (retry của webhook, mail về dồn sau khi mail server nghẽn, nhân viên forward lại mail cũ) thì đơn đã huỷ sẽ bị ghi đè thành confirmed. Đây là bug **sẽ** xảy ra nếu không chặn:

```ts
// trong route klook-sync
if (existing?.externalStatus === "canceled" && incoming.externalStatus === "confirmed") {
  return { skipped: "refuse confirmed-after-canceled" };
}
// và luôn so mốc thời gian của email (header Date), lấy mail mới nhất thắng
```

Lưu `emailDate` (header `Date` của mail) vào DB, chỉ ghi đè khi `incoming.emailDate > existing.emailDate`.

### Còn một khoảng trống chưa biết: mail ĐỔI LỊCH

Klook có luồng amendment riêng — thấy rõ qua endpoint `get_alter_count`, các field `alter_info` / `alter_info_v2` / `alter_info_latest_time`, và ô "Pending amendment requests" trên trang chủ Merchant Center.

Chưa có mẫu mail cho luồng này. Đây là rủi ro **lớn hơn huỷ**: đơn huỷ mà sót thì thừa một chuyến xe; đơn đổi lịch mà sót thì khách đứng chờ ở điểm đón vào ngày mới còn phi công thì đi vào ngày cũ — đơn không biến mất, nó đứng nhầm chỗ.

→ **Việc cần làm:** khi có khách đổi lịch, lưu lại mail đó và bổ sung template thứ ba vào parser. Trước khi có mẫu, mọi mail Klook không khớp 2 câu nhận diện ở trên phải rơi vào `unknown` + bắn Telegram cho người xử lý tay.

### Kết luận

**Email làm luồng chính.** Đủ dữ liệu vận hành (PII từng khách đầy đủ), nhận diện huỷ chính xác, chạy được trên Vercel, không đụng cookie, không sợ DataDome.

**API xuống vai phụ — bổ dữ liệu, không phải canh trạng thái:**

- `total_price` / `unit_cost` — email không có con số tiền nào, báo cáo doanh thu bắt buộc lấy từ đây
- toạ độ `21.007419,105.793188` + `address_desc` + `google_place_id` — email chỉ có tên điểm đón
- khung giờ đón (`time[0].from/to`)
- `voucher_code` để đối chiếu voucher khách xuất trình

Chạy 1 lần/ngày là đủ, gom hết đơn mới trong ngày. Tần suất thấp nên gần như không có rủi ro DataDome, và cookie hết hạn cũng chỉ làm thiếu mấy field phụ chứ không chặn vận hành.

Tiện thể cho nó so luôn danh sách `booking_reference_number` giữa API và DB — gần như free, và bắt được trường hợp mail rơi vào Spam. Nhưng đây là bonus, không phải trụ cột như tôi nhận định ban đầu.


### Regex parse email (dán cho Claude Code)

```ts
export function parseKlookEmail(text: string) {
  const g = (re: RegExp) => text.match(re)?.[1]?.trim();

  const guests: any[] = [];
  const re = /Participant(\d+)\s+(Full name|Title|Country\/region|Date of birth|ID number \(Passport\)):\s*(.+)/g;
  const KEY: Record<string, string> = {
    "Full name": "fullName", "Title": "gender",
    "Country/region": "nationality", "Date of birth": "dob",
    "ID number (Passport)": "idNumber",
  };
  for (const m of text.matchAll(re)) {
    const i = Number(m[1]) - 1;
    (guests[i] ??= {})[KEY[m[2]]] = m[3].trim();
  }

  const phoneRaw = g(/Lead person mobile:\s*(.+)/) ?? "";

  return {
    externalRef:  g(/Booking reference ID:\s*(\S+)/),
    externalStatus: /has confirmed an order/i.test(text) ? "confirmed"
                  : /cancel/i.test(text) ? "canceled" : "unknown",
    source: "klook",
    activityId:   Number(g(/Activity URL:.*\/activity\/(\d+)/)),
    activityName: g(/Klook has confirmed an order for\s*(.+?)\s+-\s+/s),
    packageLabel: g(/Package:\s*(.+)/),
    dateISO:      g(/Date Request:\s*(\d{4}-\d{2}-\d{2})/),
    timeSlot:     (g(/Time Request:\s*(.+)/) === "NA" ? undefined : g(/Time Request:\s*(.+)/)),
    guestsCount:  Number(g(/Participant:\s*(\d+)\s*x/)) || guests.length || 1,
    contact: {
      fullName:       g(/Lead participant:\s*(?:\(\w+\)\s*)?(.+)/),
      email:          g(/Lead person email:\s*(\S+)/),
      phone:          phoneRaw ? "+" + phoneRaw.replace("-", "") : undefined,
      pickupLocation: g(/Departure location:\s*(.+)/),   // chỉ có tên, API bù toạ độ sau
      specialRequest: g(/Special requirements:\s*(.+)/),
    },
    guests,
    needsApiEnrichment: true,   // thiếu: voucher_code, giá, toạ độ, khung giờ đón
  };
}
```

> Lưu ý: `Lead participant` có tiền tố xưng hô trong ngoặc — `(MISS)harti harti` → regex trên bỏ `(MISS)`, còn `harti harti`. Tên trong `Participant1 Full name` (`harti`) mới là tên chuẩn, ưu tiên dùng cái đó.
