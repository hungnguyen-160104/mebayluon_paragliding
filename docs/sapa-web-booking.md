# Lấy booking tự động từ web Sa Pa (paraglidingsapa.com)

Sổ Sa Pa trong app **chưa quản tiền** — chỉ theo dõi: khách từ đâu tới, đón ở
đâu, mấy người, đã bay hay huỷ/dời. Vì vậy cửa nhận tự động cũng chỉ lấy đúng 9
thông tin đó, không lấy tiền.

## Cửa nhận đã mở sẵn

```
POST https://www.mebayluon.com/api/baocao/booking/inbound-sapa
header: x-sapa-secret: <chuỗi bí mật>
body (JSON):
{
  "ref":         "SPW-2026-0001",        // MÃ BOOKING bên web Sa Pa — bắt buộc
  "flightDate":  "2026-08-22",           // YYYY-MM-DD — bắt buộc
  "pickupTime":  "08:00",                // giờ đón, HH:MM
  "pickupPoint": "Sapa Center Hotel",    // điểm đón, chữ tự do
  "name":        "Nguyễn Văn A",
  "phone":       "0912345678",
  "guests":      2,                       // > 0 — bắt buộc
  "source":      "Website Sa Pa",        // Klook / FB / khách sạn…
  "note":        "khách Hàn, cân 60/72kg"
}
```

Trả về `{ action: "created" | "updated", id, ref }` — `ref` là **mã hiện trên sổ**.

## Mã booking nói rõ đơn của web nào

Điểm Sa Pa được bán trên **cả hai** web nên mã phải phân biệt được nguồn:

| Đơn từ | Mã trên sổ | Ghi chú |
|---|---|---|
| **mebayluon.com** | `WebMBL` + 6 ký tự | dựng lúc kéo booking web về sổ |
| **paraglidingsapa.com** | `WebSapa` + 6 số cuối của mã gốc | mã GỐC (`DDMM` + số điện thoại) lưu ở `otaRef` để tra ngược |

Chống trùng khoá theo **mã gốc**, không theo mã ngắn: hai khách khác nhau vẫn có
thể trùng 6 số cuối. Trùng thì mã trên sổ tự nới ra (8 số, rồi cả mã) — thà mã
dài hơn chứ không để hai khách mang chung một mã.

**Gửi lại cùng một `ref` thì app SỬA bản đã có, không tạo bản thứ hai.** Nhờ vậy
bên web cứ gửi lại thoải mái khi khách đổi giờ hay đổi số người, và lần gửi bị
lỗi mạng thử lại cũng không sinh booking trùng. Booking nào người trực đã bấm
**huỷ** hoặc **nhập nhầm** thì app để yên, không lật lại theo một cú POST.

## Hai việc cần làm để bật

1. **Khai mã bí mật trên Vercel** — Settings → Environment Variables →
   `SAPA_INBOUND_SECRET` = một chuỗi dài tự đặt. Chưa khai thì cửa này trả 503,
   không nhận gì (thà đóng còn hơn để ngỏ cho người lạ ghi booking vào sổ).
2. **Bên web Sa Pa gọi vào cửa này mỗi khi có đơn mới.** Chọn một trong ba đường:

   | Đường | Làm gì | Ưu / nhược |
   |---|---|---|
   | **Gọi thẳng từ server web Sa Pa** (khuyên dùng) | Trong `server/utils/` của bản Nuxt, sau khi lưu đơn thì `fetch` sang cửa trên kèm header bí mật | Chắc chắn nhất, có cả cập nhật khi khách đổi giờ. Cần sửa ~20 dòng ở kho mã bên đó |
   | **Đọc thư báo đơn mới** | Thư nội bộ "đơn mới" của web Sa Pa chuyển vào hộp mebayluon@gmail.com, thêm tên miền người gửi vào `docs/klook-email-apps-script.gs`, app bóc thư ra booking | Không phải sửa kho mã bên đó. Nhưng đổi mẫu email là hỏng, và thư trễ vài phút |
   | **Đọc trực tiếp cơ sở dữ liệu web Sa Pa** | Cấp một user CHỈ ĐỌC của cụm Mongo bên đó, app chạy đồng bộ theo giờ | Không phụ thuộc email. Cần chuỗi kết nối và biết cấu trúc bảng đơn bên đó |

Cửa nhận (đường 1) đã sẵn sàng, không cần chờ gì thêm. Hai đường còn lại cần
thông tin từ phía web Sa Pa: **địa chỉ gửi thư báo đơn** (đường 2) hoặc **chuỗi
kết nối chỉ đọc + cấu trúc bảng đơn** (đường 3).

## Thử cửa nhận

```bash
curl -X POST https://www.mebayluon.com/api/baocao/booking/inbound-sapa \
  -H "content-type: application/json" \
  -H "x-sapa-secret: CHUOI_BI_MAT" \
  -d '{"ref":"SPW-TEST-01","flightDate":"2026-08-22","pickupTime":"08:00",
       "pickupPoint":"Sapa Center Hotel","name":"Khách thử","phone":"0912345678",
       "guests":2,"source":"Website Sa Pa","note":"thử cửa nhận"}'
```

Booking hiện ngay trong "🛫 Booking bay ngày 22/08" của điểm **Sa Pa**, người nhập
ghi là *Web Sa Pa (tự động)*. Xoá bản thử bằng nút **🗑 Nhập nhầm** trên dòng đó.

## Booking OTA của điểm Sa Pa — hộp thư sapa.paragliding@gmail.com

Đơn từ Klook · GetYourGuide · KKday · Seek Sophie · Viator · Trip.com cho điểm
Sa Pa về hộp **sapa.paragliding@gmail.com**. Dùng CHUNG một tệp script với hộp
mebayluon, chỉ khác đúng một dòng cấu hình.

**Cách bật** (làm một lần):

1. Đăng nhập Google bằng **chính hộp sapa.paragliding@gmail.com**.
2. Mở [script.google.com](https://script.google.com) → **New project**.
3. Dán toàn bộ `docs/klook-email-apps-script.gs` (bản `ota-mail-v4`).
4. Sửa ba dòng cấu hình ở đầu tệp:
   - `SECRET` = đúng chuỗi `OTA_INBOUND_SECRET` đã khai trên Vercel (giống hộp mebayluon).
   - `MAILBOX_SPOT = 'sapa'` ← **dòng quan trọng nhất**, nói cho app biết mọi thư
     của hộp này là booking Sa Pa.
   - `APP_URL` giữ nguyên.
5. Bấm **Run** hàm `chayThuMotThu` một lần → Google hỏi quyền đọc Gmail, cho phép.
6. Đồng hồ (Triggers) → **Add trigger** → hàm `quetThuOta` → Time-driven →
   Minutes timer → **Every 10 minutes**.

### Thư Sa Pa nằm trong hộp chung mebayluon@gmail.com thì sao?

Vẫn về đúng sổ Sa Pa. Khay thư chia theo điểm bay như sau:

| Khay của | Lấy thư từ |
|---|---|
| **Khau Phạ**, **Hà Nội** | CHỈ hộp `mebayluon@gmail.com` — kể cả thư máy chưa đoán được điểm (để hai điểm này soát tay). Thư của hộp Sa Pa không bao giờ lọt sang đây. |
| **Sa Pa** | hộp `sapa.paragliding@gmail.com` **cộng** thư hộp mebayluon mà nội dung nói tới Sa Pa: *Sapa Paragliding*, *dù lượn Sa Pa*, *bay dù lượn sapa*, Lào Cai, Fansipan, Mường Hoa… |

Đoán điểm theo thứ tự tin cậy: **tên sản phẩm → tiêu đề thư → toàn bộ thân thư**.
Thân thư xếp cuối vì dễ nhắc nhiều điểm cùng lúc, nhưng không thể bỏ: đơn Sa Pa
bán qua hộp chung thường chỉ lộ tên điểm trong thân thư, còn tên sản phẩm chỉ ghi
chung *"Paragliding Tour in Vietnam"*.

Thư nhắc **từ hai điểm trở lên** (chân thư quảng cáo, thư gộp nhiều sản phẩm) thì
để **chưa rõ điểm** cho người duyệt chọn tay — đoán bừa là booking rơi sai sổ.
Thư chưa rõ điểm hiện ở khay Khau Phạ / Hà Nội, KHÔNG hiện ở khay Sa Pa.

**Vì sao cần dòng `MAILBOX_SPOT`:** tên sản phẩm của OTA thường không có chữ
"Sapa" (vd *Standard Paragliding Tour*), nên nếu để app đoán theo tên sản phẩm
thì mọi thư rơi vào khay **🚩 chờ duyệt tay** với ghi chú *"không rõ điểm bay"* —
người trực phải chọn điểm cho từng thư. Khai sẵn thì app biết ngay.

Hộp **mebayluon@gmail.com** giữ `MAILBOX_SPOT = ''` vì hộp đó nhận cả ba điểm và
app vẫn đoán theo tên sản phẩm như trước.
