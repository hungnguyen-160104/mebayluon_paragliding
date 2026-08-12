# Nối trang báo bay với bảng Google Sheets của kế toán

Mỗi lần phi công hoặc quầy vé bấm **Lưu báo cáo**, số liệu được ghi vào cơ sở dữ
liệu rồi đẩy thêm một dòng sang bảng tính. Cách nối dùng Apps Script webhook —
không cần bật Google API, không cần file khoá JSON.

Làm một lần, khoảng 5 phút.

> Khác với `docs/pilot-sheet-apps-script.md`: script dưới đây **ghi đè theo cột
> Khoá** thay vì luôn thêm dòng, và tự tạo tab: **mỗi phi công một thẻ riêng theo
> tháng** ("Giàng A Sáu 2026-08"), điều phối vào tab "Điều phối", camera man vào
> tab "Camera man", tiền nhân sự đưa quản lý vào tab "Giao tiền". Bắt buộc phải thế: báo cáo báo bay được sửa lại trong ngày (phi công nhập
> tạm buổi trưa, tối bổ sung), nếu cứ thêm dòng thì kế toán cộng trùng số.

## 1. Tạo bảng tính

Tạo một Google Sheets mới, đặt tên ví dụ **Báo bay Khau Phạ 2026**.
Không cần tự gõ tiêu đề cột — script tự tạo hai tab và hàng tiêu đề ở lần ghi đầu.

## 2. Dán script

Trong bảng tính: **Tiện ích mở rộng → Apps Script**. Xoá hết nội dung có sẵn rồi
dán mã vào.

Toàn bộ mã nằm ở **[`docs/baobay-apps-script.gs`](./baobay-apps-script.gs)** — mở
tệp đó, chọn tất cả, sao chép, dán đè vào Apps Script. Để mã ở một tệp riêng cho
khỏi có hai bản lệch nhau; phần dưới chỉ tóm tắt những chỗ hay phải sửa.

Bộ cột theo từng loại báo cáo (`KINDS` trong tệp):

| `body.kind` | Tab | Ghi vào |
|---|---|---|
| `pilot` | "Giàng A Sáu 2026-08" (mỗi phi công một thẻ theo tháng) | số chuyến, mã vé, dịch vụ, chi tiêu, phạt nộp muộn, huỷ phạt |
| `dispatcher` | "Điều phối" | vé xuất/thu, dải mã, huỷ – dời lịch, tiền, chi hộ khách |
| `cameraman` | "Camera man" | flycam, quay dù lượn, thu chi |
| `close` | "Chốt ngày" | số chốt của kế toán, trạng thái chốt |
| `handover` | "Giao tiền" | nhân sự đưa tiền quản lý, trạng thái xác nhận |

Mã bảo vệ nằm ở dòng đầu tệp (`const SECRET = '...'`). **Kho mã này công khai
trên GitHub nên tuyệt đối không ghi chuỗi thật vào tệp** — dán chuỗi thật thẳng
vào Apps Script trên Google, rồi gõ đúng chuỗi đó vào ô "Mã bảo vệ" của điểm bay
tương ứng ở `/baobay/admin` (lưu trong cơ sở dữ liệu, không nằm trong mã nguồn).

## 3. Triển khai lấy đường dẫn

Bấm **Triển khai → Tuỳ chọn triển khai mới**:

- Loại: **Ứng dụng web**
- Thực thi với tư cách: **Tôi**
- Ai có quyền truy cập: **Bất kỳ ai** — bắt buộc, vì máy chủ website gọi vào mà
  không đăng nhập Google. Đường dẫn vẫn được bảo vệ bằng chuỗi mật khẩu ở bước 2.

Google sẽ hỏi cấp quyền lần đầu: chọn tài khoản rồi **Nâng cao → Đi tới (không an
toàn)** — script của chính mình nên cứ cho phép.

Xong sẽ có đường dẫn dạng `https://script.google.com/macros/s/AKfy.../exec`. Sao chép nó.

## 4. Kiểm tra nhanh

Mở đường dẫn `.../exec` bằng trình duyệt, phải thấy JSON có `"ok":true` và
`"version":"baobay-multispot-v7"`. Nếu thấy bản khác thì bản
đang chạy là bản cũ — xem ô cảnh báo ngay dưới đây về việc triển khai lại.

> Đừng dùng `curl` để thử POST: Apps Script trả 302 sang
> `script.googleusercontent.com`, `curl -L` đổi POST thành GET nên nhận về trang
> HTML "Rất tiếc, không thể mở tệp" — trông như hỏng quyền truy cập trong khi
> script vẫn tốt. `fetch` của Node (và của máy chủ website) đi đúng đường này.

- Thấy **"Rất tiếc, không thể mở tệp"** → quyền truy cập chưa phải "Bất kỳ ai".
- Thấy lỗi cú pháp → trong tệp còn sót nội dung cũ; Ctrl/Cmd + A xoá sạch rồi
  dán lại (chỉ phần JavaScript, KHÔNG lấy dòng ```).

> ⚠️ **Sửa script xong phải triển khai lại một PHIÊN BẢN MỚI**, đi đúng đường
> **Triển khai → Quản lý các bản triển khai → biểu tượng bút chì → Phiên bản:
> Phiên bản mới → Triển khai**. Nếu bấm **Tuỳ chọn triển khai mới** thì Google
> cấp một đường dẫn `/exec` KHÁC và đường cũ chết ngay — production vẫn cầm
> đường cũ nên không dòng nào vào bảng. Chuyện này đã xảy ra một lần với bảng
> đăng ký phi công. Lỡ tạo bản mới thì phải cập nhật `BAOBAY_SHEET_WEBHOOK_URL`
> trên Vercel rồi deploy lại.

## 5. Khai vào biến môi trường

Trên Vercel (**Settings → Environment Variables**) và trong `.env.local` khi chạy máy mình:

```
BAOBAY_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/AKfy.../exec
BAOBAY_SHEET_SECRET=MAT_KHAU_CUA_BAN
```

Hai biến này chỉ là **mặc định dự phòng**. Cách dùng chính bây giờ là khai riêng
cho TỪNG ĐIỂM BAY ở `/baobay/admin` (đường dẫn webhook + mã bảo vệ, lưu trong cơ
sở dữ liệu) — đổi là có hiệu lực ngay, không phải deploy lại.

## Tự cộng số trong bảng tính

Kế toán muốn có tab tổng theo ngày thì tạo thêm một tab **Tổng hợp** rồi dán vào
ô `A1` (không phải cột của script nên script không đụng vào):

```
=QUERY({'Quầy vé'!B2:R}, "select Col1, sum(Col5), sum(Col6), sum(Col15), sum(Col16) where Col1 is not null group by Col1 order by Col1 desc label sum(Col5) 'Khách', sum(Col6) 'Vé xuất', sum(Col15) 'Tiền mặt', sum(Col16) 'Chuyển khoản'", 0)
```

Hoặc đơn giản hơn: mở `mebayluon.com/baobay/tong-hop` bằng tài khoản kế toán và
bấm **Tải CSV** — bảng đã cộng sẵn theo ngày, có cả cột chênh lệch.

## Khi nào cần lo

Việc nhập liệu **không bao giờ hỏng vì bảng tính**: số liệu luôn vào cơ sở dữ liệu
trước, bảng tính chỉ là bản sao. Đẩy thất bại thì bản ghi mang `sheetSynced: false`
kèm lý do trong `sheetError`, người nhập thấy nhãn **"chưa sang bảng"** ở danh sách
"Đã báo gần đây" — lưu lại một lần nữa là thử lại.

Chưa khai `BAOBAY_SHEET_WEBHOOK_URL` thì trang vẫn chạy bình thường, chỉ là chưa
có dòng nào chảy sang bảng tính; kế toán vẫn xem và tải CSV được ở
`/baobay/tong-hop`.
