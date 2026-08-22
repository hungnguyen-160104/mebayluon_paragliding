# Bảng bảo hiểm — cách nối app vào bảng Google Sheets sẵn có

App đẩy hồ sơ từng người bay sang **đúng bảng lâu nay nhân viên nhập tay**, mỗi
người một dòng. Nhân viên vẫn sửa tay trên bảng như trước; app chỉ ghi vào các
cột nó biết và không đụng cột nào khác.

## 1. Dán script vào bảng

1. Mở bảng bảo hiểm → **Tiện ích mở rộng → Apps Script**.
2. Xoá hết nội dung cũ, dán toàn bộ `docs/baohiem-apps-script.gs`.
3. Sửa dòng `const SECRET = '...'` thành một chuỗi bí mật tự đặt (chữ + số, đừng
   dùng lại mật khẩu nào khác).
4. Nếu muốn ghi vào **một tab cụ thể**, điền tên tab vào `const SHEET_NAME = ''`.
   Để rỗng thì script ghi vào tab đầu tiên.
5. **Triển khai → Tuỳ chọn triển khai mới → Ứng dụng web**
   - Thực thi với tư cách: **Tôi**
   - Ai có quyền truy cập: **Bất kỳ ai**
6. Chép địa chỉ web nhận được.

> Lần sau sửa script thì bấm **Triển khai → Quản lý mục triển khai → biểu tượng
> bút chì → Phiên bản: Mới**, đừng tạo mục triển khai mới — địa chỉ sẽ đổi.

## 2. Khai hai biến môi trường trên Vercel

| Biến | Giá trị |
| --- | --- |
| `INSURANCE_SHEET_WEBHOOK_URL` | địa chỉ web ở bước 6 |
| `INSURANCE_SHEET_SECRET` | đúng chuỗi đã đặt ở bước 3 |

Chưa khai thì app vẫn chạy bình thường: hồ sơ lưu trong cơ sở dữ liệu, chỉ chưa
đẩy sang bảng, và ô trạng thái ghi rõ "chưa khai bảng bảo hiểm".

## 3. Cột trên bảng

Script **ghi theo TÊN CỘT ở hàng 1**, không theo thứ tự, và nhận nhiều cách viết
(có dấu / không dấu / tiếng Anh). Các cột nó tìm:

| Nội dung | Tên cột chấp nhận |
| --- | --- |
| Ngày bay | Ngày bay · Ngày · Date · Ngày sử dụng |
| Điểm bay | Điểm bay · Địa điểm · Location · Nơi bay |
| Họ và tên | Họ và tên · Họ tên · Tên khách · Full name · Name |
| Ngày sinh | Ngày sinh · Năm sinh · Date of birth · DOB |
| Giới tính | Giới tính · Sex · Gender |
| Loại giấy tờ | Loại giấy tờ · Loại GT |
| Số giấy tờ | Số CCCD/Hộ chiếu · Số CCCD · CCCD · CCCD/Passport · Số giấy tờ · CMND/CCCD · Passport · ID |
| Quốc tịch | Quốc tịch · Nationality |
| Trẻ em | Trẻ em · Trẻ nhỏ |
| Mã booking | Mã booking · Booking · Mã đặt chỗ |
| Điện thoại | SĐT · Số điện thoại · Điện thoại · Phone |
| Ghi chú | Ghi chú · Note |
| Trạng thái | Trạng thái · Status |
| Cập nhật lúc | Cập nhật lúc · Cập nhật · Updated |
| Khoá | Khoá · Khóa · Key |

Cột nào bảng chưa có mà script **bắt buộc phải có** (Khoá, Ngày bay, Họ và tên,
Ngày sinh, Giới tính, Số giấy tờ, Trạng thái) thì script tự thêm vào cuối bảng.
Cột "Khoá" là thứ giữ cho mỗi người chỉ có một dòng — đừng xoá và đừng sửa tay.

## 4. Những gì script tự làm

- **Ghi đè, không đẻ dòng trùng**: khoá là `mã booking : thứ tự người`, đẩy lại
  bao nhiêu lần cũng chỉ sửa đúng dòng đó.
- **Khách huỷ**: dòng vẫn còn, cột Trạng thái chuyển thành `HUỶ` để bên bảo hiểm
  rút tên. Xoá trắng thì bên đó vẫn tính phí cho người không bay.
- **Khách dời ngày**: vẫn dòng cũ, chỉ đổi ngày bay.
- **Trùng số giấy tờ trong cùng một ngày bay**: ô số giấy tờ bị **bôi đỏ**, kể cả
  khi trùng với dòng nhân viên gõ tay từ trước. Cùng một người bay hai ngày khác
  nhau thì không tính là trùng.
- **Ngày sinh, số giấy tờ, số điện thoại ghi dạng chữ**: nếu để Sheets tự hiểu
  thì "01/01/1990" thành ngày tháng theo múi giờ bảng và số CCCD bị cắt số 0 đầu.
