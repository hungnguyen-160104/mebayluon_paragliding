# Bảng bảo hiểm — cách nối app vào Google Sheets

App đẩy hồ sơ **từng người bay** sang bảng bảo hiểm: **mỗi điểm bay một tab**,
trong tab thì **ngày mới nằm trên**, mỗi người một dòng. Nhân viên vẫn gõ tay và
sửa trên bảng như thường — app chỉ ghi vào các cột nó biết, và chỉ đụng vào
những dòng do chính nó tạo.

## 1. Dán script vào bảng

1. Mở bảng bảo hiểm → **Tiện ích mở rộng → Apps Script**.
2. Xoá hết nội dung cũ, dán toàn bộ `docs/baohiem-apps-script.gs`.
3. Sửa `const SECRET = '...'` thành một chuỗi bí mật tự đặt (chữ + số, đừng dùng
   lại mật khẩu nào khác).
4. `const SPREADSHEET_ID = '...'`:
   - Script mở từ **trong chính bảng** (Tiện ích mở rộng → Apps Script) → để
     **rỗng** `''`. Đây là cách thường gặp nhất.
   - Script là một dự án riêng → dán id của bảng vào (đoạn dài trong địa chỉ
     bảng, giữa `/d/` và `/edit`).
5. **Triển khai → Tuỳ chọn triển khai mới → Ứng dụng web**
   - Thực thi với tư cách: **Tôi**
   - Ai có quyền truy cập: **Bất kỳ ai**
6. Chép địa chỉ web nhận được.

> Bảng **mới tinh cũng không cần kẻ tay**: lần đầu app đẩy sang, script tự tạo
> tab của điểm bay đó và dựng sẵn hàng tiêu đề, in đậm, ghim hàng 1.

> Lần sau sửa script thì bấm **Triển khai → Quản lý mục triển khai → biểu tượng
> bút chì → Phiên bản: Mới**, đừng tạo mục triển khai mới — địa chỉ sẽ đổi.

## 2. Khai hai biến môi trường trên Vercel

| Biến | Giá trị |
| --- | --- |
| `INSURANCE_SHEET_WEBHOOK_URL` | địa chỉ web ở bước 6 |
| `INSURANCE_SHEET_SECRET` | đúng chuỗi đã đặt ở bước 3 |

Chưa khai thì app vẫn chạy: hồ sơ nằm trong cơ sở dữ liệu, chỉ chưa sang bảng,
và ô trạng thái ghi rõ "chưa khai bảng bảo hiểm".

## 3. Tab và thứ tự dòng

- **Mỗi điểm bay một tab**, tên tab là tên điểm bay (`Khau Phạ`, `Hà Nội`,
  `Sa Pa`…). Tab chưa có thì script tự tạo — mở điểm bay mới không phải sửa gì.
- **Ngày mới lên đầu**: sau mỗi lần ghi, script sắp lại cả tab theo Ngày bay
  giảm dần; cùng ngày thì xếp theo **Số TT** tăng dần — đúng thứ tự quầy gọi
  khách lên bãi (khách số 2 đứng trên khách số 10).
- **Mỗi ngày một khối**: dòng đầu của mỗi ngày được **in đậm ô ngày** và kẻ một
  **vạch đậm ngang** phía trên, nên lướt mắt là thấy ngay ranh giới giữa các
  ngày. (Không chèn dòng trống làm vách ngăn: dòng trống không có ngày nên lần
  sắp xếp sau sẽ dồn hết xuống đáy, vách ngăn biến mất còn bảng thì thủng lỗ.)
- Vì phải sắp được thứ tự nên **cột Ngày bay ghi dạng `2026-08-25`**
  (năm-tháng-ngày). Ngày sinh thì vẫn ghi kiểu Việt `25/08/1990`.

## 4. Cột trên bảng

Script **ghi theo TÊN CỘT ở hàng 1**, không theo thứ tự, và nhận nhiều cách viết
(có dấu / không dấu / tiếng Anh):

| Nội dung | Tên cột chấp nhận |
| --- | --- |
| Ngày bay | Ngày bay · Ngày · Date · Ngày sử dụng |
| Số TT | Số TT · STT · Số thứ tự · Số thứ tự bay |
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
| Nguồn nhập | Nguồn nhập · Nhập bởi · Nguồn |
| Cập nhật lúc | Cập nhật lúc · Cập nhật · Updated |
| Khoá | Khoá · Khóa · Key |

Thứ tự khi script tự dựng tab mới:

`Ngày bay · Số TT · Điểm bay · Họ và tên · Ngày sinh · Giới tính · Loại giấy tờ
· Số CCCD/Hộ chiếu · Quốc tịch · Trẻ em · Mã booking · SĐT · Ghi chú · Trạng
thái · Nguồn nhập · Cập nhật lúc · Khoá`

Cột bắt buộc mà bảng chưa có (Khoá, Ngày bay, Số TT, Họ và tên, Ngày sinh, Giới
tính, Số giấy tờ, Trạng thái, Mã booking, Nguồn nhập) thì script tự thêm vào cuối.

**Số TT** là số thứ tự khách trong ngày của sổ điều hành — con số cả bãi dùng để
gọi nhau ("khách số 18"). Ở Khau Phạ mùa cao điểm đây là thứ đối chiếu nhanh
nhất giữa bảng bảo hiểm và sổ điều hành. Ghi dạng **số** để bảng xếp đúng.
**Cột "Khoá" là thứ giữ cho mỗi người chỉ có một dòng — đừng xoá, đừng sửa tay.**

## 5. Dòng của app và dòng gõ tay

Dòng do app đẩy sang luôn mang **`APP tự động`** ở cột **Nguồn nhập**, kèm **Mã
booking** để lần ngược về sổ điều hành (booking chưa có mã của đại lý thì ghi
`2026-08-25 #18` — ngày bay và khách số mấy). Dòng nhân viên tự gõ thì cột đó để
trống và app **không bao giờ đụng vào**.

## 6. Những gì script tự làm

- **Khi nào dòng xuất hiện**: chỉ lúc quầy tích **"Đã xuất vé"** (hoặc đánh dấu
  **"bay không vé"** với chuyến không xé vé). Hồ sơ nhập xong, duyệt xong mà
  chưa xuất vé thì **chưa có gì trên bảng** — gửi sớm mà trời xấu không bay được
  là mất phí bảo hiểm; gửi muộn thì sự cố trước lúc gửi coi như không có bảo hiểm.
- **Ghi đè, không đẻ dòng trùng**: khoá là `mã booking : thứ tự người`.
- **Khách huỷ**: dòng vẫn còn, Trạng thái chuyển `HUỶ` để bên bảo hiểm rút tên.
  Xoá trắng thì bên đó vẫn tính phí cho người không bay.
- **Thu hồi** (bấm nhầm vé, huỷ cả booking): Trạng thái chuyển `THU HỒI`.
- **Khách dời ngày**: vẫn một dòng, đổi ngày bay và ghi thêm "dời từ …"; dòng tự
  nhảy lên đúng vị trí theo ngày mới.
- **Trùng số giấy tờ trong cùng một ngày bay**: ô số giấy tờ bị **bôi đỏ**, kể cả
  khi trùng với dòng nhân viên gõ tay. Dòng `HUỶ` và `THU HỒI` không tính là
  trùng. Cùng một người bay hai ngày khác nhau cũng không tính là trùng.
- **Ngày sinh, số giấy tờ, số điện thoại ghi dạng chữ**: để Sheets tự hiểu thì
  `01/01/1990` biến thành ngày tháng theo múi giờ bảng và số CCCD bị cắt số 0 đầu.

Việc dò trùng chạy **trong từng tab**, tức trong từng điểm bay — một người bay ở
hai điểm khác nhau trong cùng ngày thì bảng không bắt được (app vẫn cảnh báo khi
trùng trong cùng điểm bay và cùng ngày).
